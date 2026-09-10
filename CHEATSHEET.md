# JavaScript 速查表(Day 1–15)

依「我想做什麼」分類,不是依語法分類——卡住時從這裡找比翻文章快。

---

## 變數宣告

| 我想做 | 寫法 | 注意 |
|---|---|---|
| 宣告一個之後會變的值 | `let hp = 100;` | |
| 宣告一個不會被整個換掉的值 | `const hero = {...};` | 內容仍可改 |
| 先宣告、之後再給值 | `let j;` | `const` 不行(SyntaxError) |
| 改變已存在的變數 | `hp = 90;`(不寫 `let`) | 寫了 `let` 就變成重複宣告 → SyntaxError |

**別用 `var`**:它不認大括號邊界(會活過迴圈)、允許重複宣告不報錯。

`const` 的紅線:只能不「整個重新指向」。以下都合法:
```js
const hero = { hp: 100 };
hero.hp = 70;          // 改內容 ✓
hero.skill = "火球";    // 新增 ✓
delete hero.hp;        // 刪除 ✓
hero = { hp: 50 };     // ✗ TypeError: Assignment to constant variable.
```

---

## 印出東西 / 除錯

| 我想做 | 寫法 |
|---|---|
| 印一個值 | `console.log(hp);` |
| 印多個值 | `console.log("HP:", hp, "ATK:", atk);` |
| 看一個東西是什麼型別 | `console.log(typeof hp);` |
| **凍結陣列當下的內容** | `console.log([...arr]);` 或 `console.log(JSON.stringify(arr));` |
| **凍結元素當下的文字** | `console.log(el.textContent);`(不要 log 元素本身) |

⚠️ `console.log(物件/陣列/元素)` 存的是**活參照**,顯示的內容會跟著之後的修改變動。

---

## 字串

| 我想做 | 寫法 |
|---|---|
| 拼接 | `"勇者" + "的 HP:" + hp` |
| **模板字串(推薦)** | `` `${hero.name} 的 HP: ${hero.hp}` `` |
| 去掉前後空白 | `s.trim()` |
| 算字數 | `s.length` |
| 檢查有沒有包含某片段 | `s.includes("<")` → true / false |
| 換掉所有出現的片段 | `s.replaceAll("<", "&lt;")` |
| 字串轉數字 | `Number(s)`(轉不出來會得到 `NaN`) |

模板字串用**反引號**(鍵盤左上角 `` ` ``),變數包在 `${}` 裡。少了 `$` 就不會被解析,會原樣印出 `{hero.hp}`。

字串是**原始值**,不可變:`s[0] = "明"` 不報錯也不生效。

⚠️ `+` 遇到字串就變成拼接,不是加法:`"1" + 1` 是 `"11"`,但 `"50" - 3` 卻是 `47`(減號沒有拼接功能,會偷偷轉數字)。**加號和減號的行為不一致**。

⚠️ 字串 `"1"` 和數字 `1` 在主控台印出來一樣。**數字是藍色、字串是白色**,或用 `typeof` 確認。

---

## 判斷

| 我想做 | 寫法 |
|---|---|
| 基本判斷 | `if (hp <= 0) { ... } else if (hp < 30) { ... } else { ... }` |
| 比較是否相等 | `===`(嚴格)/ `!==` |

**一定用 `===`,不要用 `==`**:`0 == false` 是 `true`(型別會被偷偷轉換),`0 === false` 是 `false`。

`<` 的規則:**剛好等於界線的值不算通過**。`hp < 30` 時 hp=30 走 else;`i < 5` 時 i=5 停止迴圈。

---

## 陣列

| 我想做 | 寫法 |
|---|---|
| 宣告 | `const enemies = ["雜魚", "小怪", "魔王"];` |
| 取第 n 個(從 0 算) | `enemies[0]` |
| 看總數 | `enemies.length` |
| 加到最後面 | `enemies.push("終極魔王");` |
| 最後一個有效索引 | `enemies.length - 1` |

索引從 0 開始 =「距離起點幾步」的位移量。`enemies[enemies.length]` 一定是 `undefined`。

---

## 物件

| 我想做 | 寫法 |
|---|---|
| 宣告 | `const hero = { name: "勇者", hp: 100 };` |
| 讀屬性(推薦) | `hero.name` |
| 讀屬性(屬性名在變數裡時只能這樣) | `hero[key]` |
| 新增屬性 | `hero.skill = "火球術";` |
| 刪除屬性 | `delete hero.atk;` |
| 拿到所有鍵名 | `Object.keys(hero)` |
| 清空 | 用迴圈逐一 `delete`,沒有一鍵完成 |

---

## 迴圈

```js
// 跑固定次數 / 跑遍陣列
for (let i = 0; i < enemies.length; i++) {
  console.log(i, enemies[i]);
}

// 條件成立就一直跑(起點和前進都要自己管)
let i = 0;
while (i < 5) {
  console.log(i);
  i++;              // 忘了這行 = 無窮迴圈 = 瀏覽器當機
}
```

三段式順序:`起點(只跑一次)` → `每輪開始前檢查` → `每輪結束後 i++`。
迴圈結束後 `i` 停在界線值(5),但那一輪從未執行。
**寫在 `for` 括號裡的 `let i` 只活在迴圈裡**,外面要用就把宣告搬到外面。

---

## 函式

```js
// 交出結果
function calcDamage(atk, def) {
  return Math.max(1, atk - def);   // Math.max(a, b) = 取較大的,常用來設下限
}

// 只做事,不交結果
function updateScreen() {
  heroHpText.textContent = `HP: ${hero.hp}`;
}

// 提前結束(不交任何值)
function attack() {
  if (enemy.hp <= 0) {
    return;          // 直接結束,後面都不跑
  }
  // ...
}
```

| 觀念 | 說明 |
|---|---|
| 參數是影本 | 改參數(`hp = hp - 5`)動不到外面的本尊 |
| 非參數的名字往外找 | `heroHp = heroHp + 30` 改的是外面那個本人 |
| `return` vs `console.log` | `return` 把值交出去;`console.log` 只印,回傳 `undefined` |
| 一個函式只做一件事 | 算傷害歸 `calcDamage`,報狀態歸 `checkStatus` |
| 同名函式會安靜覆蓋 | 後面宣告的整個蓋掉前面的,不報錯 |

---

## 作用域

1. 內層讀得到外層
2. 外層問不到內層(ReferenceError)
3. 同名時內層贏(遮蔽 shadowing)

要把函式裡的值傳出來,三種方法:
```js
return value;                              // ✓ 最正統
let x; function f() { x = "值"; }           // 可行,但變成全域
const box = {}; function f() { box.x = "值"; }  // const 容器,往裡面填
```

---

## DOM:動到畫面

| 我想做 | 寫法 |
|---|---|
| 用 id 抓元素 | `document.getElementById("heroHp")` |
| 用 CSS 選擇器抓 | `document.querySelector("#heroHp")` |
| 改文字 | `el.textContent = "HP: 100";` |
| 改按鈕文字 | `btn.textContent = "鞭屍!!";` |
| 停用按鈕/輸入框 | `btn.disabled = true;` |
| **讀輸入框的值** | `input.value`(永遠是字串!) |
| 改單一樣式 | `el.style.backgroundColor = "#ff0000";` |
| 加/移除/切換 class | `el.classList.add("danger")` / `.remove()` / `.toggle()` |
| 檢查有沒有某 class | `el.classList.contains("danger")` |
| 放 HTML 標籤進去 | `el.innerHTML = "<b>粗體</b>";`(**有使用者資料一定要先轉義**) |

**`style` 的 CSS 屬性名一律改駝峰**:`background-color` → `backgroundColor`、`font-size` → `fontSize`。寫成 `style.background-color` 會噴 `SyntaxError: Invalid left-hand side in assignment`(JS 把它讀成減法)。

**`style` vs `classList`**:改一兩個屬性用 `style`;管理「狀態」用 `classList`(樣式集中在 CSS,JS 只決定現在是什麼狀態)。

抓到的元素 `typeof` 是 `object`——**改網頁 = 改物件屬性**。

⚠️ `<script>` 必須放在要抓的元素**後面**(通常是 `</body>` 之前),否則 `getElementById` 回傳 `null`,下一行動它就 TypeError。

⚠️ **資料和畫面是兩份獨立的東西**。改了 `enemy.hp` 之後,一定要呼叫更新畫面的函式,不然玩家看到的是凍結的畫面。

---

## 事件:接收玩家操作

```js
attackBtn.addEventListener("click", attack);
//                                      ↑ 不能加括號!
```

| 事件名 | 觸發時機 |
|---|---|
| `"click"` | 點擊 |
| `"dblclick"` | 雙擊 |
| `"mouseover"` / `"mouseout"` | 滑鼠移入 / 移出 |
| `"keydown"` / `"keyup"` | 按鍵按下 / 放開 |
| `"change"` | 輸入欄位的值改變 |

⚠️ 寫成 `attack()` 會:①頁面載入時立刻執行一次 ②把 `undefined` 掛上去,之後點擊永遠沒反應,而且**不報錯**。

---

## 使用者輸入:安全與驗證

**核心原則:同一份使用者資料可能有多個出口,每一個都要檢查。**

```js
// 出口 A:純文字 → textContent 天生安全,不需轉義
heroHpText.textContent = `${hero.name} HP: ${hero.hp}`;

// 出口 B:innerHTML → 使用者資料一定要先轉義
function escapeHtml(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
logText.innerHTML = `<b>${escapeHtml(hero.name)}</b> 造成 ${damage} 點傷害!`;
```

驗證的標準流程:

```js
const name = nameInput.value.trim();      // 1. 去空白
if (name === "") { /* 拒絕 */ return; }    // 2. 空值
if (name.length > 10) { /* 拒絕 */ return; }  // 3. 長度
```

| 觀念 | 說明 |
|---|---|
| HTML 的 `maxlength` | 只負責體驗,DevTools 就能繞過——JS 檢查才是把關 |
| 前端驗證 | 一律可被繞過,有伺服器的話**後端必須再驗一次** |
| 白名單 vs 黑名單 | 「只允許我列出的」比「禁止我想到的壞東西」可靠 |
| **註解會過期** | 「這裡沒有使用者輸入所以安全」可能明天就不成立 |

## 錯誤訊息對照表

| 錯誤訊息 | 意思 | 常見原因 |
|---|---|---|
| `SyntaxError: Unexpected token` | 語法寫錯 | 括號/引號沒配對 |
| `SyntaxError: Identifier 'x' has already been declared` | 重複宣告 | 同一個名字寫了兩次 `let`/`const` |
| `SyntaxError: Missing initializer in const declaration` | const 沒給值 | `const x;` |
| `ReferenceError: x is not defined` | 找不到這個變數 | 打錯字、或它在別的作用域裡 |
| `TypeError: Assignment to constant variable.` | 想整個換掉 const | `const x = 1; x = 2;` |
| `TypeError: Cannot set properties of null` | 對 `null` 設屬性 | `getElementById` 沒抓到(script 位置太前面) |
| `TypeError: x is not a function` | 把不是函式的東西當函式呼叫 | 名字打錯、或它其實是別的型別 |
| `SyntaxError: Invalid left-hand side in assignment` | 賦值的左邊不是可被賦值的東西 | `style.background-color = ...`(被讀成減法) |

**SyntaxError vs 其他錯誤**:
- **SyntaxError** 在「讀的階段」被擋下 → **它所在的那個 `<script>` 區塊一行都不執行**(同一頁其他 script 區塊不受影響)
- **ReferenceError / TypeError** 是執行期發生 → **從出錯那行開始,後面全部不跑**(前面的有跑)

## 幾個 JS 的怪癖(記住比理解重要)

| 寫法 | 結果 | 說明 |
|---|---|---|
| `typeof null` | `"object"` | 1995 年的歷史包袱 |
| `typeof NaN` | `"number"` | 「不是數字」的型別是數字 |
| `NaN === NaN` | `false` | NaN 跟任何東西比較都是 false |
| `0 == false` | `true` | 型別被偷偷轉換,所以永遠用 `===` |
| `"1" + 1` | `"11"` | 加號遇字串變拼接 |
| `"50" - 3` | `47` | 減號沒有拼接功能,偷偷轉數字 |
| 程式碼寫在 script 最外層 | 只在載入時跑一次 | 要即時的值就寫在事件函式裡 |

---

## 「安靜失敗」清單(不報錯但沒生效,最難查)

| 現象 | 為什麼 |
|---|---|
| `s[0] = "明"` 沒效果 | 字串是不可變的原始值 |
| 兩個同名函式,前一個消失 | 後面的宣告安靜覆蓋前面的 |
| `let j;` + 迴圈裡 `let j` → 印出 `undefined` | 遮蔽:兩個不同的變數 |
| `addEventListener("click", attack())` 點了沒反應 | 掛上去的是 `undefined` |
| 資料改了但畫面不動 | 忘記呼叫更新畫面的函式 |
| `console.log(元素)` 顯示的文字跟當時不符 | 活參照 |
| 使用者輸入的標籤被解析了 | 某個出口用了 `innerHTML` 而沒轉義(而且不會報錯) |
| 一顆按鈕塞進另一顆按鈕還能點 | 事件冒泡救了它,但 HTML 結構是違法的 |
