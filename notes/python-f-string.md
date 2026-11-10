---
title: f-string 字串格式化
category: python
status: seed
tags: [語法, 字串]
summary: 在字串前面加 f，就能把變數和運算結果直接放進字串裡。
created: 2026-11-10
updated: 2026-11-10
---

## 一句話重點

在字串前面加上 `f`，就可以用 `{}` 把變數或運算式直接放進字串，不用再用 `+` 一段一段接起來。

## 核心概念

f-string（formatted string literal）是 Python 3.6 加入的寫法。`{}` 裡面可以放任何運算式，Python 會先算出結果，再轉成字串放進去。

### 指定格式

在 `{}` 裡加上冒號，冒號後面可以指定格式，例如小數位數、對齊方式和千分位逗號。

## 例子

```python
name = "Kezia"
score = 92.456
items = 3

print(f"{name} 的分數是 {score}")          # 輸出：Kezia 的分數是 92.456
print(f"四捨五入到小數第一位：{score:.1f}")  # 輸出：四捨五入到小數第一位：92.5
print(f"總共 {items * 2} 個")              # 輸出：總共 6 個
print(f"{1234567:,}")                      # 輸出：1,234,567
print(f"[{name:>8}]")                      # 輸出：[   Kezia]
print(f"{items = }")                       # 輸出：items = 3
```

## 容易搞錯的地方

- **忘記加 `f`。** `"{name}"` 會原封不動印出 `{name}`，不會報錯，所以很難發現。
- **要印出大括號本身，要寫兩個。** `f"{{name}}"` 會印出 `{name}`。
- **引號衝突。** Python 3.12 之前，`{}` 裡面不能用和外面相同的引號；改成 `f"{d['key']}"` 這種一內一外不同的引號最保險。
- **不要用 f-string 組 SQL 指令。** 直接把使用者輸入放進 SQL 會有 SQL 注入（SQL injection）的風險，要改用資料庫套件提供的參數化查詢。

## 相關筆記

- [[python-list-comprehension]]：兩者常常一起用，例如 `[f"第 {i} 題" for i in range(1, 4)]`。

## 參考資料

- [Python 官方教學：格式化的字串文本（f-string）](https://docs.python.org/zh-tw/3/tutorial/inputoutput.html#formatted-string-literals)
- [PEP 498：Literal String Interpolation](https://peps.python.org/pep-0498/)
- [PEP 701：Syntactic formalization of f-strings](https://peps.python.org/pep-0701/)
