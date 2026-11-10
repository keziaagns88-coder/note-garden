#!/usr/bin/env python3
"""檢查 notes/ 裡所有筆記是否符合 AGENTS.md 的規則，並產生 data/notes.json。

用法：
    python3 scripts/build_notes.py           檢查並寫入 data/notes.json
    python3 scripts/build_notes.py --check   只檢查，並確認 data/notes.json 已是最新

只使用 Python 標準函式庫（AGENTS.md 第 2 節）。
"""

from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NOTES_DIR = ROOT / "notes"
DATA_DIR = ROOT / "data"
OUTPUT = DATA_DIR / "notes.json"

# front matter 欄位，順序固定（AGENTS.md 5.1）
FIELDS = ["title", "category", "status", "tags", "summary", "created", "updated"]

# 正文二級標題，順序固定；True 代表必填（AGENTS.md 5.2）
SECTIONS = [
    ("一句話重點", True),
    ("核心概念", True),
    ("例子", True),
    ("容易搞錯的地方", False),
    ("我的想法", False),
    ("相關筆記", True),
    ("參考資料", True),
]
SECTION_NAMES = [name for name, _ in SECTIONS]

MAX_TITLE = 30
MAX_SUMMARY = 60
MIN_TAGS, MAX_TAGS = 2, 5
MAX_TAG_LEN = 12
BODY_MIN, BODY_MAX = 300, 1500  # 建議字數，超出只會警告
CHARS_PER_MINUTE = 400  # 估算閱讀時間用

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
WIKILINK_RE = re.compile(r"\[\[([^\[\]|]+?)(?:\|([^\[\]]+))?\]\]")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")
HTML_TAG_RE = re.compile(r"</?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?/?>")


def load_json(path: Path):
    with path.open(encoding="utf-8-sig") as f:
        return json.load(f)


def strip_code(lines: list[str]) -> list[str]:
    """把程式碼區塊和行內程式碼換成空白，避免誤判連結、標題和 HTML。"""
    out, in_fence, fence = [], False, ""
    for line in lines:
        m = FENCE_RE.match(line)
        if m:
            if not in_fence:
                in_fence, fence = True, m.group(1)
            elif line.strip().startswith(fence):
                in_fence = False
            out.append("")
            continue
        out.append("" if in_fence else INLINE_CODE_RE.sub(" ", line))
    return out


def parse_tags(raw: str, errors: list[str]) -> list[str]:
    raw = raw.strip()
    if not (raw.startswith("[") and raw.endswith("]")):
        errors.append("tags 必須寫成 [標籤一, 標籤二] 的格式")
        return []
    inner = raw[1:-1].strip()
    if not inner:
        return []
    return [t.strip().strip("\"'") for t in re.split(r"[,，、]", inner)]


def parse_front_matter(text: str, errors: list[str]):
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        errors.append("第一行必須是 ---（front matter 開頭）")
        return {}, [], lines
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        errors.append("找不到 front matter 的結尾 ---")
        return {}, [], lines

    meta, order = {}, []
    for n, line in enumerate(lines[1:end], start=2):
        if not line.strip():
            continue
        m = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if not m:
            errors.append(f"第 {n} 行無法解讀：{line.strip()}")
            continue
        key, value = m.group(1), m.group(2).strip()
        if key in meta:
            errors.append(f"欄位 {key} 重複出現")
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        meta[key] = parse_tags(value, errors) if key == "tags" else value
        order.append(key)
    return meta, order, lines[end + 1 :]


def parse_date(value: str, field: str, errors: list[str]):
    if not DATE_RE.match(value or ""):
        errors.append(f"{field} 必須是 YYYY-MM-DD 格式，目前是「{value}」")
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        errors.append(f"{field} 不是有效的日期：{value}")
        return None


def check_note(path: Path, categories: dict, statuses: set):
    errors: list[str] = []
    warnings: list[str] = []
    note_id = path.stem
    text = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")

    # --- 檔名 / ID（AGENTS.md 第 6 節）---
    if not ID_RE.match(note_id):
        errors.append("檔名只能用小寫英文、數字和連字號，例如 python-list-comprehension.md")

    meta, order, body_lines = parse_front_matter(text, errors)

    # --- front matter 欄位（AGENTS.md 5.1）---
    missing = [f for f in FIELDS if f not in meta]
    unknown = [k for k in order if k not in FIELDS]
    if missing:
        errors.append("缺少欄位：" + "、".join(missing))
    if unknown:
        errors.append("不允許的欄位：" + "、".join(unknown))
    if not missing and not unknown and order != FIELDS:
        errors.append("欄位順序必須是：" + "、".join(FIELDS))

    title = meta.get("title", "")
    if "title" in meta:
        if not title:
            errors.append("title 不可以是空的")
        elif len(title) > MAX_TITLE:
            errors.append(f"title 最多 {MAX_TITLE} 字，目前 {len(title)} 字")

    category = meta.get("category", "")
    if "category" in meta:
        if category not in categories:
            errors.append(f"category「{category}」不在 data/categories.json 裡")
        elif not note_id.startswith(category + "-") or note_id == category + "-":
            errors.append(f"檔名必須以「{category}-」開頭，後面接主題英文關鍵字")

    if "status" in meta and meta["status"] not in statuses:
        errors.append(f"status 只能是 {'、'.join(sorted(statuses))}，目前是「{meta['status']}」")

    tags = meta.get("tags", [])
    if "tags" in meta:
        if not (MIN_TAGS <= len(tags) <= MAX_TAGS):
            errors.append(f"tags 要有 {MIN_TAGS} 到 {MAX_TAGS} 個，目前 {len(tags)} 個")
        if len(set(tags)) != len(tags):
            errors.append("tags 裡有重複的標籤")
        for t in tags:
            if not t:
                errors.append("tags 裡有空白的標籤")
            elif t.startswith("#"):
                errors.append(f"標籤不要加 #：{t}")
            elif len(t) > MAX_TAG_LEN:
                errors.append(f"標籤太長（最多 {MAX_TAG_LEN} 字）：{t}")
        cat_name = categories.get(category, {}).get("name", "")
        if cat_name and (cat_name in tags or category in [t.lower() for t in tags]):
            warnings.append("標籤不要重複分類名稱（AGENTS.md 7.3）")

    summary = meta.get("summary", "")
    if "summary" in meta:
        if not summary:
            errors.append("summary 不可以是空的")
        elif len(summary) > MAX_SUMMARY:
            errors.append(f"summary 最多 {MAX_SUMMARY} 字，目前 {len(summary)} 字")
        if summary.startswith(("本篇", "這篇將", "本文")):
            warnings.append("summary 直接寫重點，不要用「本篇將介紹⋯」開頭")

    created = parse_date(meta.get("created", ""), "created", errors) if "created" in meta else None
    updated = parse_date(meta.get("updated", ""), "updated", errors) if "updated" in meta else None
    if created and updated and updated < created:
        errors.append("updated 不可以早於 created")
    tomorrow = dt.date.today() + dt.timedelta(days=1)  # 允許一天時差（台灣比 UTC 快 8 小時）
    for d, name in ((created, "created"), (updated, "updated")):
        if d and d > tomorrow:
            errors.append(f"{name} 是未來的日期：{d}")

    # --- 正文（AGENTS.md 5.2、第 9 節）---
    plain = strip_code(body_lines)
    headings = []
    section_text: dict[str, list[str]] = {}  # 去掉程式碼後的文字（找連結用）
    section_raw: dict[str, list[str]] = {}   # 原始文字（判斷段落是不是空的）
    current = None
    for n, line in enumerate(plain):
        if re.match(r"^#\s", line):
            errors.append(f"正文不可以有一級標題（#）：{line.strip()}")
        m = re.match(r"^##\s+(.+?)\s*#*\s*$", line)
        if m and not line.startswith("###"):
            name = m.group(1).strip()
            headings.append(name)
            current = name
            section_text.setdefault(name, [])
            section_raw.setdefault(name, [])
            continue
        if current:
            section_text[current].append(line)
            section_raw[current].append(body_lines[n])

    for name in headings:
        if name not in SECTION_NAMES:
            errors.append(f"不允許的段落標題「## {name}」，只能使用：{'、'.join(SECTION_NAMES)}")
    if len(set(headings)) != len(headings):
        errors.append("有重複的段落標題")
    known = [h for h in headings if h in SECTION_NAMES]
    if known != sorted(known, key=SECTION_NAMES.index):
        errors.append("段落順序錯誤，必須是：" + " → ".join(SECTION_NAMES))
    for name, required in SECTIONS:
        if required and name not in headings:
            errors.append(f"缺少必填段落「## {name}」")
        if name in section_raw and not "".join(section_raw[name]).strip():
            errors.append(f"段落「## {name}」是空的")

    refs = section_text.get("參考資料", [])
    if "參考資料" in headings and not any(re.match(r"^\s*[-*]\s+\S", l) for l in refs):
        errors.append("「參考資料」至少要有一筆清單項目（- 開頭）")

    if any(HTML_TAG_RE.search(l) for l in plain):
        errors.append("正文不可以使用 HTML 標籤，請改用 Markdown")

    links = []
    for line in plain:
        for m in WIKILINK_RE.finditer(line):
            target = m.group(1).strip()
            if target not in links:
                links.append(target)
    related_links = [
        m.group(1).strip()
        for line in section_text.get("相關筆記", [])
        for m in WIKILINK_RE.finditer(line)
    ]

    # 字數只算文字，不算程式碼區塊和 Markdown 符號
    body_chars = len(re.sub(r"[\s#*_>|\-\[\]()`]", "", "\n".join(plain)))
    if body_chars < BODY_MIN:
        warnings.append(f"正文只有約 {body_chars} 字，建議至少 {BODY_MIN} 字")
    elif body_chars > BODY_MAX:
        warnings.append(f"正文約 {body_chars} 字，超過 {BODY_MAX} 字時建議拆成兩篇")

    if meta.get("status") == "evergreen" and "待查證" in text:
        errors.append("有「待查證」的筆記不可以是 evergreen（AGENTS.md 5.3）")

    note = {
        "id": note_id,
        "title": title,
        "category": category,
        "status": meta.get("status", ""),
        "tags": tags,
        "summary": summary,
        "created": meta.get("created", ""),
        "updated": meta.get("updated", ""),
        "links": links,
        "backlinks": [],
        "chars": body_chars,
        "minutes": max(1, round(body_chars / CHARS_PER_MINUTE)),
    }
    return note, errors, warnings, related_links


def build():
    categories = {c["id"]: c for c in load_json(DATA_DIR / "categories.json")}
    statuses = {s["id"] for s in load_json(DATA_DIR / "site.json")["statuses"]}

    all_errors: dict[str, list[str]] = {}
    all_warnings: dict[str, list[str]] = {}

    stray = [p for p in NOTES_DIR.iterdir() if p.is_dir() or p.suffix != ".md"]
    for p in stray:
        all_errors.setdefault(p.name, []).append("notes/ 裡只能放 .md 檔案，不可以有子資料夾或其他檔案")

    notes, related = [], {}
    for path in sorted(NOTES_DIR.glob("*.md")):
        note, errors, warnings, related_links = check_note(path, categories, statuses)
        notes.append(note)
        related[note["id"]] = related_links
        if errors:
            all_errors[path.name] = errors
        if warnings:
            all_warnings[path.name] = warnings

    ids = {n["id"] for n in notes}
    for n in notes:
        fname = n["id"] + ".md"
        for target in n["links"]:
            if target not in ids:
                all_errors.setdefault(fname, []).append(f"連結 [[{target}]] 找不到對應的筆記")
            elif target == n["id"]:
                all_errors.setdefault(fname, []).append("筆記不可以連到自己")
        if len(notes) > 1 and not related[n["id"]]:
            all_errors.setdefault(fname, []).append("「相關筆記」至少要有一個 [[筆記ID]] 連結")

    by_id = {n["id"]: n for n in notes}
    for n in notes:
        for target in n["links"]:
            if target in by_id and target != n["id"] and n["id"] not in by_id[target]["backlinks"]:
                by_id[target]["backlinks"].append(n["id"])
    for n in notes:
        n["backlinks"].sort()
        if len(notes) > 1 and not n["backlinks"]:
            all_warnings.setdefault(n["id"] + ".md", []).append("還沒有其他筆記連到這篇")

    notes.sort(key=lambda n: (n["updated"], n["id"]), reverse=True)
    tag_counts: dict[str, int] = {}
    for n in notes:
        for t in n["tags"]:
            tag_counts[t] = tag_counts.get(t, 0) + 1
    tags = dict(sorted(tag_counts.items(), key=lambda kv: (-kv[1], kv[0])))

    payload = {"count": len(notes), "notes": notes, "tags": tags}
    output = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    return output, all_errors, all_warnings, notes, categories, tags


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # 讓 Windows 終端機也能顯示中文
    except AttributeError:
        pass

    check_only = "--check" in sys.argv[1:]
    output, errors, warnings, notes, categories, tags = build()

    for fname, items in sorted(warnings.items()):
        for w in items:
            print(f"⚠️  {fname}：{w}")
    for fname, items in sorted(errors.items()):
        for e in items:
            print(f"❌ {fname}：{e}")

    if errors:
        total = sum(len(v) for v in errors.values())
        print(f"\n檢查失敗：{total} 個錯誤。修正後再執行一次。")
        return 1

    if check_only:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        if current != output:
            print("❌ data/notes.json 不是最新的，請執行 python3 scripts/build_notes.py 後再 commit。")
            return 1
    else:
        OUTPUT.write_text(output, encoding="utf-8")

    print(
        f"✅ 檢查通過：{len(notes)} 篇筆記、{len(categories)} 個分類、{len(tags)} 個標籤"
        + ("" if check_only else "，已更新 data/notes.json")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
