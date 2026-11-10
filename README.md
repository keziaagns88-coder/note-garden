# Kezia 的筆記花園

我的個人知識庫：學 Python、歷史、設計和哲學時整理的筆記。每篇筆記都是一個 Markdown 檔案，網站會自動把它們變成可以搜尋、篩選、互相連結的網頁。

- 網站：https://YOUR-USERNAME.github.io/note-garden/
- 給 AI 的專案規則：[AGENTS.md](AGENTS.md)

## 新增一篇筆記

1. 複製 `templates/note-template.md` 到 `notes/<分類>-<英文主題>.md`
2. 填好開頭的資料區和每個段落
3. 執行 `python3 scripts/build_notes.py`，看到「✅ 檢查通過」
4. commit 並 push，GitHub Pages 會自動更新

或是直接對 AI 說：「依照 AGENTS.md，幫我新增一篇關於 ○○ 的筆記。」

## 本機預覽

```bash
python3 -m http.server 8000
```

打開 http://localhost:8000 。不能直接雙擊 `index.html`，瀏覽器會擋住讀取筆記檔案。

## 使用的工具

- [marked](https://github.com/markedjs/marked)（MIT 授權）：把 Markdown 轉成 HTML，放在 `assets/vendor/`
- 字型：Google Fonts 的 Noto Serif TC、Noto Sans TC
