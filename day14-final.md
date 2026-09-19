## 今天的主題:用 JS 改樣式——先回收昨天的伏筆

昨天為了讓「鞭屍!!」按鈕變紅,我用 `innerHTML` 生了一顆新按鈕塞進舊按鈕裡。當時就知道那是「能動但不對」,今天第一件事就是修掉它。

## 正確的做法:直接改元素的樣式

```js
// 昨天(結構違法)
attackBtn.innerHTML = `<button style="background-color:#ff0000; ...">鞭屍!!</button>`;

// 今天
attackBtn.textContent = "鞭屍!!";
attackBtn.style.backgroundColor = "#ff0000";
```

每個元素都帶著一個 `style` 物件,改它的屬性就改到畫面。這個形狀我已經很熟了——**又是 Day 6 的「物件.屬性 = 值」**,只是這次改的是外觀。

[插入 day14.png:用正確方式做出來的紅色鞭屍按鈕,不再有嵌套結構]

## 第一個坑:CSS 屬性名要改成駝峰式

| CSS 寫法 | JS 寫法 |
|---|---|
| `background-color` | `backgroundColor` |
| `font-size` | `fontSize` |
| `border-radius` | `borderRadius` |
| `color` | `color`(沒有連字號就一樣) |

我故意用 CSS 原本的寫法試了一次:

```js
document.body.style.background-color = "#000";
```

編輯器立刻畫紅色波浪號,執行結果:

```
Uncaught SyntaxError: Invalid left-hand side in assignment
```

「賦值的左邊不合法」——這個訊息一開始有點難懂,追查之後才明白:JS 讀到的不是一個屬性名,而是「`document.body.style.background` **減去** `color`」。減號在 JS 裡永遠是運算子。

然後它想把 `"#000"` 賦值給這整個減法的結果——但**減法的結果不是一個可以被賦值的東西**(你不能對「3 - 5」說「你等於 10」),所以錯誤訊息才是「左邊不合法」。

這也讓我明白駝峰命名不是慣例問題,是**必須**:`backgroundColor` 是一個合法的名字,`background-color` 在 JS 眼裡永遠是一個算式。

## 今天的新發現:SyntaxError 擋掉的範圍,比我以為的小

Day 2 我學到「SyntaxError 在讀的階段就被擋下,整支程式一行都不執行」。但今天這次的輸出讓我發現這句話不夠精確:

```
day14.html:27 Uncaught SyntaxError: Invalid left-hand side in assignment
day14.html:129 Live reload enabled.
```

**SyntaxError 之後還有一行 `Live reload enabled.` 跑掉了。**

那行是 Live Server 自己注入的**另一個獨立的 `<script>` 區塊**。也就是說,SyntaxError 擋掉的是**它所在的那一個 script 區塊**,不是整個網頁的所有 JavaScript。

同一頁上不同的 script 區塊是各自獨立被讀取的,一個壞掉不會拖累另一個。這個修正很實用:以後如果一頁上有多段 script,某段壞了,不代表其他段沒跑。

## 更好的工具:classList

`style` 一次只能改一個屬性,想改五個就要寫五行。更好的方式是**先在 CSS 定義好一整組樣式,再用 JS 切換 class**:

```html
<style>
  .danger { color: red; font-weight: bold; }
  .dead   { color: gray; text-decoration: line-through; }
  .revenge-btn { background-color: #ff0000; color: #fff; padding: 10px 20px; font-size: 16px; }
</style>
```

```js
enemyHpText.classList.add("danger");      // 加上
enemyHpText.classList.remove("danger");   // 移除
enemyHpText.classList.toggle("danger");   // 有就移除、沒有就加上
enemyHpText.classList.contains("danger"); // 檢查有沒有
```

這樣分工變得很清楚:**外觀歸 CSS,邏輯歸 JS**。JS 只負責決定「現在該是什麼狀態」,不管那個狀態長什麼樣;想調顏色的時候改 CSS 一個地方就好,不用翻遍 JS。

## 我做的事:讓顏色講出戰鬥的四個階段

學會這兩個工具之後,我想做的不只是「血少變紅」,而是讓整個畫面隨著戰鬥進展改變氣氛:

| 階段 | 背景 | 小怪血量文字 |
|---|---|---|
| 開場 | 白 | 正常 |
| 危險(血量 ≤ 30%) | 灰紫 `#a89798` | 紅色粗體 |
| 死亡 | 黑底白字 | 灰色加刪除線 |
| 鞭屍 | 全紅 | 灰色加刪除線 |

[插入 day14-2.png:危險狀態,灰紫背景 + 紅色粗體血量]

[插入 day14-3.png:死亡狀態,黑底白字 + 刪除線]

刪除線用在血量上是我自己想到最滿意的一個細節:「小怪 HP: 0」被劃掉,一眼就知道這個目標已經失效了,不需要多一句說明。

## 然後我遇到一個自己做出來的視覺 bug

鞭屍狀態我把背景設成紅色 `#ff0000`,但 `.revenge-btn` 按鈕**也是** `#ff0000`——結果紅按鈕在紅背景上完全消失了,畫面上只剩一圈細細的邊框和白色文字。

[插入 day14-4.png:紅按鈕融進紅背景,幾乎看不見]

對照死亡狀態那張黑底的截圖,同一顆按鈕在黑底上非常醒目。

這是很典型的「單獨看每個元件都對,組合起來才壞掉」問題:我挑「危險的按鈕」和「失控的背景」時分別都選了紅,卻沒想到它們會同時出現。這在測試工作裡也常見——單一功能都通過,組合情境才爆。

## 解法:陰影,而且順便做成鞭屍計數器

我想到一個一石二鳥的做法:給按鈕加陰影。陰影能在紅背景上勾出輪廓,而且**如果讓陰影隨著鞭屍次數變長,它就變成一個進度條**。

```js
let whipCount = 0;

function updateWhipShadow() {
  const parts = ["0 0 0 2px rgba(0, 0, 0, 0.6)"];   // 基礎:一圈黑邊
  for (let i = 1; i <= whipCount; i++) {
    parts.push(`${i * 8}px 0 0 rgba(0, 0, 0, 0.45)`);
  }
  attackBtn.style.boxShadow = parts.join(", ");
}
```

[插入 day14-5.png:陰影從按鈕往右延伸,而且呈現漸層]

這幾行用到了前面十三天學的四樣東西:`for` 迴圈(Day 7)、陣列 `push`(Day 5)、模板字串(Day 3)、`el.style` 駝峰命名(今天)。唯一的新東西是 **`陣列.join(", ")`**——把陣列每一項用指定符號連成一個字串,而 CSS 的 `box-shadow` 剛好支援用逗號分隔多個陰影。

**為什麼要疊很多層,不用一個陰影往右推?** 我一開始想寫成單一個 `${whipCount * 8}px 0 0 黑`,但陰影是按鈕的一份「複製品」被推到右邊——當偏移量超過按鈕寬度,它會**整塊脫離按鈕,中間出現空隙**。改成疊很多層、每層只差 8px(遠小於按鈕寬度),它們就互相重疊成一條連續的長條。

## 一個沒設計到的收穫

跑起來之後我發現陰影不是均勻的黑色,而是**從按鈕右邊的深黑,往右逐漸變淡、融進紅色背景**。

這不是我設計的,是半透明疊加的數學結果:靠近按鈕的位置被十幾層 `rgba(0,0,0,0.45)` 重疊覆蓋,越疊越黑;最右端只有一層,所以最淡。

一個為了解決「連續性」而做的技術選擇,附贈了一個漸層效果。這是這十四天第一次,我因為程式的副作用得到比原計畫更好的結果。

## 還沒解決的問題:一個寫死的數字

危險狀態的判斷我目前寫成:

```js
if (enemy.hp <= 18) {   // 60 的 30%
```

這個 `18` 是我手算的,只對「滿血 60 的小怪」成立。如果之後小怪滿血改成 100、或加入滿血 500 的魔王,這行就完全失效(500 血的魔王要打到剩 18 才變紅,等於永遠不會亮)。

正確做法是把滿血也存進物件,讓程式自己算比例:

```js
const enemy = { name: "小怪", hp: 60, maxHp: 60, atk: 15, def: 3 };

if (enemy.hp <= enemy.maxHp * 0.3) {   // 不管滿血多少都對
```

這個 `maxHp` 明天做血條的時候一定會用到(血條長度就是 `hp / maxHp`),所以我把它留到明天一起處理。先誠實記在這裡,免得自己忘記。

## 小結

今天搞懂的事:
- `el.style.xxx` 直接改單一樣式;CSS 的連字號一律改成駝峰(`backgroundColor`)
- 寫成 `style.background-color` 會噴 `Invalid left-hand side in assignment`,因為 JS 把它讀成減法運算式
- SyntaxError 只擋掉**它所在的那個 script 區塊**,不是整頁的 JS(Day 2 的說法要修正)
- `classList` 的 add / remove / toggle / contains 比 `style` 更適合管理狀態:外觀歸 CSS,邏輯歸 JS
- 顏色可以承擔敘事:同一個遊戲用四種配色講出四個階段
- 元件單獨看都對,組合起來可能壞掉(紅按鈕遇上紅背景)
- `box-shadow` 疊多層可以做出連續長條,半透明疊加會自然形成漸層
- 寫死的數字(`18`)是隱形的技術債,存 `maxHp` 讓程式自己算才是對的

明天做血條:把 `maxHp` 加進去,讓血量從文字變成看得見的長度。
