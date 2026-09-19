## 今天的主題:DOM——第一次讓 JavaScript 真的動到畫面

前九天我做的所有事,成果都只出現在主控台裡。網頁本身一直是一片空白,我甚至問過「一直在宣告 HTML 卻在寫 JS,版面空空的到底是怎樣」。今天那片空白終於要有東西了。

## DOM 是什麼

瀏覽器讀完 HTML 之後,會把它變成**一棵由物件組成的樹**,叫 **DOM(Document Object Model,文件物件模型)**:

```
document              ← 整份文件
 └── html
      └── body
           ├── h1
           └── p (id="heroHp")
```

關鍵在最後三個字:**物件**。這棵樹上每一個節點都是物件,而物件我 Day 6 已經很熟了——有屬性、能讀、能改。所以「改網頁」的本質就是「改物件的屬性」,我早就會了,只差怎麼**抓到**那個物件。

## 抓元素:兩種寫法

```js
const heroHpText = document.getElementById("heroHp");   // 用 id 抓
const logText = document.querySelector("#log");         // 用 CSS 選擇器抓(# 代表 id)
```

`document` 是那棵樹的入口,瀏覽器準備好的全域物件。兩種寫法我都試了,結果一致:`getElementById` 比較直白,`querySelector` 比較萬用(還能用 `.class`、標籤名)。

## 改內容:一個賦值動作就改到畫面

```js
heroHpText.textContent = `${hero.name} HP: ${hero.hp}`;
```

就這樣。這行的形狀跟 Day 6 的 `hero.hp = 70` 一模一樣——都是「物件.屬性 = 值」,只是這次的物件住在畫面上,所以**畫面立刻跟著變**。

[插入 day10.png:畫面顯示 勇者 HP: 100 / 小怪 HP: 60 / 戰鬥紀錄]

上圖是把物件資料搬上畫面之後的樣子。HTML 原本寫的是 `勇者 HP: ?`,問號被 JS 換成了 100。

## 打一回合,畫面跟著更新

接著把 Day 8 的傷害計算接上來:

```js
const damage = calcDamage(hero.atk, enemy.def);
enemy.hp = enemy.hp - damage;

enemyHpText.textContent = `${enemy.name} HP: ${enemy.hp}`;
logText.textContent = `${hero.name} 造成 ${damage} 點傷害!`;
```

[插入 day10-2.png:小怪 HP: 43、勇者 造成 17 點傷害!]

`20 - 3 = 17` 傷害,`60 - 17 = 43`——這些數字前幾天都算過了,差別是今天它們出現在**網頁上**,不是主控台裡。第一次不用按 F12 就看得到成果,這個回饋比想像中有感。

## 印出來看看,我到底抓到了什麼

```js
console.log(heroHpText);
console.log(typeof heroHpText);
```

輸出:

```
<p id="heroHp">勇者 HP: 100</p>
object
```

[插入 day10-3.png:主控台印出 p 元素本身,typeof 是 object]

`typeof` 印出 **`object`**——證實了今天的核心觀念:**抓到的網頁元素,就是一個物件**,跟 Day 6 的 `hero` 是同一種東西。這也解釋了為什麼 `.textContent` 用起來這麼熟悉:它就是屬性存取。

另外注意主控台印出的是 `勇者 HP: 100`,已經是改過的內容——這是 Day 6 那個「活參照」陷阱的老朋友,DevTools 顯示的是元素現在的狀態,不是 log 當下的快照。

## 今天的坑:順序錯了,一行都跑不了

前面的程式碼我是把 `<script>` 放在 `<body>` 最後面。那如果搬到 `<head>` 裡、或放在那些 `<p>` 之前呢?

我先猜:**應該不行**。因為瀏覽器是從上到下讀的,跑 JS 的時候下面的 HTML 還沒被建立出來,那時候根本不知道那些 id 存在。

實測結果:

```
Uncaught TypeError: Cannot set properties of null (setting 'textContent')
```

猜對了,而且細節比我想的更精準:**`getElementById` 本身不報錯**,它很平靜地回傳了 `null`(意思是「查無此元素」)。真正炸掉的是下一行——我對 `null` 設 `.textContent`,而 `null` 什麼屬性都沒有,這才噴出 TypeError。

這個錯誤裡出現了兩個 Day 2 的老朋友:`null` 和 `TypeError`。當時學 `typeof null` 是「object」的歷史包袱,今天終於看到 `null` 在實務上真正的用途——它是「這裡什麼都沒有」的正式回答。

所以 `<script>` 該放哪?最簡單的解法就是**放在 `<body>` 最後面**,等 HTML 都建立好了再跑。(後來我查到還有其他寫法可以讓 script 放在前面也能運作,但那需要「等網頁載入完成才執行」的機制,先記著這件事存在就好。)

## 小結

今天搞懂的事:
- DOM 是瀏覽器把 HTML 變成的物件樹,`document` 是入口
- 抓元素用 `getElementById("id")` 或 `querySelector("#id")`,兩種都可以
- 改畫面文字用 `.textContent = ...`,形狀就是 Day 6 的「物件.屬性 = 值」
- 抓到的元素 `typeof` 是 `object`——網頁元素就是物件,所以改網頁 = 改物件屬性
- `<script>` 要放在 `<body>` 最後:放前面的話 `getElementById` 回傳 `null`,下一行動它就 TypeError
- `null` 的實務意義:「查無此物」的正式回答,它不會報錯,是你拿它去用才報錯

畫面會顯示數字了,但目前是「重新整理一次、自動打一拳」。明天要讓玩家自己按按鈕決定什麼時候攻擊——遊戲的互動正式開始。
