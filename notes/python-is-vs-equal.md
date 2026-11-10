---
title: is 和 == 的差別
category: python
status: growing
tags: [語法, 物件, 同一性]
summary: == 問「內容一不一樣」，is 問「是不是同一個物件」。判斷 None 要用 is。
created: 2026-11-10
updated: 2026-11-10
---

## 一句話重點

`==` 比較兩個東西的**值**是否相等；`is` 比較兩個名字是不是指向**同一個物件**。

## 核心概念

在 Python 裡，變數比較像「貼在物件上的名牌」，不是裝東西的盒子。兩個名牌可以貼在同一個物件上，也可以分別貼在兩個內容一樣、但各自獨立的物件上。

| 運算子 | 問的問題 | 背後做的事 |
|---|---|---|
| `==` | 內容一樣嗎？ | 呼叫物件的 `__eq__` 方法 |
| `is` | 是同一個物件嗎？ | 比較兩者的 `id()` 是否相同 |

所以 `a is b` 成立時，`a == b` 通常也成立；反過來就不一定了。

## 例子

```python
a = [1, 2, 3]
b = [1, 2, 3]   # 內容一樣，但是另一個新的串列
c = a           # c 和 a 是同一個串列的兩個名牌

print(a == b)   # 輸出：True
print(a is b)   # 輸出：False
print(a is c)   # 輸出：True

c.append(4)     # 改 c，其實就是改 a
print(a)        # 輸出：[1, 2, 3, 4]
print(b)        # 輸出：[1, 2, 3]

value = None
print(value is None)  # 輸出：True（判斷 None 的標準寫法）
```

### 用程式模擬忒修斯之船

```python
ship = ["舊船板A", "舊船板B", "舊船板C"]
same_ship = ship                 # 記住原本那艘船
old_planks = []

for i in range(len(ship)):
    old_planks.append(ship[i])   # 把拆下來的舊船板收好
    ship[i] = f"新船板{i + 1}"    # 原地換上新船板

rebuilt = list(old_planks)       # 用舊船板重新組一艘

print(ship is same_ship)         # 輸出：True（一直在原地修改，還是同一個物件）
print(rebuilt == ["舊船板A", "舊船板B", "舊船板C"])  # 輸出：True
print(rebuilt is same_ship)      # 輸出：False（材料是舊的，但它是另一個物件）
```

## 容易搞錯的地方

- **判斷 `None` 一律用 `is`。** PEP 8 建議，和 `None` 這種整個程式只有一個的物件比較時，要用 `is` 或 `is not`，不要用 `==`。
- **不要用 `is` 比較數字或字串。** `x is y` 對兩個值都是 `1000` 的整數，結果可能是 `True` 也可能是 `False`，要看 Python 的實作細節（例如小整數快取）。Python 3.8 之後，寫 `x is 1000` 這種和字面值比較的程式，還會跳出 `SyntaxWarning`。
- **`c = a` 不是複製。** 它只是多貼一個名牌。真的要複製串列，用 `a.copy()` 或 `a[:]`。

## 我的想法

讀到這裡讓我想到 [[philosophy-ship-of-theseus]]。Python 用物件的身分判斷「是不是同一個」：就算把串列裡的元素全部換掉，只要是在原地修改，它還是同一個物件；反過來，用一樣的材料重新做一個串列，內容相同（`==`），卻不是同一個（`is`）。Python 對忒修斯之船的答案很明確：看身分，不看零件。

## 相關筆記

- [[philosophy-ship-of-theseus]]：同一個問題的哲學版本：零件全部換掉之後，還是同一艘船嗎？
- [[python-list-comprehension]]：推導式會做出新的串列，剛好可以用 `is` 驗證它不是原本那一個。

## 參考資料

- [Python 語言參考手冊：身分比較（is 和 is not）](https://docs.python.org/zh-tw/3/reference/expressions.html#is-not)
- [PEP 8：Programming Recommendations](https://peps.python.org/pep-0008/#programming-recommendations)
