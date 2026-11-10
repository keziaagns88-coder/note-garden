---
title: 串列推導式（List Comprehension）
category: python
status: evergreen
tags: [語法, 迴圈, 串列]
summary: 用一行程式從舊的串列做出新的串列，比 for 迴圈加 append 更短、更好讀。
created: 2026-11-10
updated: 2026-11-10
---

## 一句話重點

`[運算式 for 變數 in 可迭代物件 if 條件]` 可以用一行做出一個新的串列，取代「先開一個空串列，再用 for 迴圈一個一個 append」的寫法。

## 核心概念

串列推導式就是把一個 for 迴圈「壓扁」成一行。下面兩段程式做的事情完全一樣：

```python
# 一般寫法
squares = []
for n in range(5):
    squares.append(n * n)

# 串列推導式
squares = [n * n for n in range(5)]
print(squares)  # 輸出：[0, 1, 4, 9, 16]
```

### 閱讀順序

第一次看到時容易卡住，因為閱讀的順序和寫的順序不一樣。我的讀法是：

1. 先看中間的 `for n in range(5)`：要跑過哪些東西。
2. 再看後面的 `if`（如果有）：哪些要留下來。
3. 最後看最前面的 `n * n`：留下來的東西要變成什麼。

### 加上條件

`if` 放在最後面，用來「篩選」：條件不成立的元素，不會出現在結果裡。

## 例子

```python
nums = [3, -1, 4, -1, 5, -9]

# 1. 只留下正數
positives = [x for x in nums if x > 0]
print(positives)   # 輸出：[3, 4, 5]

# 2. 每個數字都變成絕對值
absolutes = [abs(x) for x in nums]
print(absolutes)   # 輸出：[3, 1, 4, 1, 5, 9]

# 3. 負數換成 0，正數保留（注意 if-else 放在 for 前面）
clipped = [x if x > 0 else 0 for x in nums]
print(clipped)     # 輸出：[3, 0, 4, 0, 5, 0]

# 4. 同樣的寫法也能做字典和集合
words = ["apple", "kiwi", "banana"]
lengths = {w: len(w) for w in words}
print(lengths)     # 輸出：{'apple': 5, 'kiwi': 4, 'banana': 6}
first_letters = {w[0] for w in words}
print(sorted(first_letters))  # 輸出：['a', 'b', 'k']
```

## 容易搞錯的地方

- **`if` 和 `if-else` 的位置不同。** 只有 `if` 是篩選，放在最後面；`if-else` 是「二選一」的運算式，要放在 `for` 前面。把 `if-else` 放到最後面會出現 `SyntaxError`。
- **不要硬塞成一行。** 需要兩層以上的 `for`，或條件很長時，寫成一般的 for 迴圈比較好讀。
- **只是要跑迴圈時不要用。** 例如 `[print(x) for x in nums]` 會做出一個沒有用的串列（裡面全是 `None`），直接寫 for 迴圈就好。
- **資料很多時改用小括號。** `sum(x * x for x in range(1_000_000))` 是產生器運算式，不會先把一百萬個數字全部存進記憶體。

## 我的想法

一開始我覺得這種寫法很難讀，後來發現只要照「for → if → 最前面」的順序看就很清楚。現在看到「空串列 + for + append」這三行，我都會先想想能不能改成一行。

## 相關筆記

- [[python-is-vs-equal]]：推導式每次都會做出「新的」串列，所以結果和原本的串列可能 `==` 相等，但 `is` 一定不同。
- [[python-f-string]]：常和推導式一起用，一行就能做出一整串格式化好的文字。

## 參考資料

- [Python 官方教學：串列綜合運算（List Comprehensions）](https://docs.python.org/zh-tw/3/tutorial/datastructures.html#list-comprehensions)
- [Python 官方教學：產生器運算式](https://docs.python.org/zh-tw/3/tutorial/classes.html#generator-expressions)
