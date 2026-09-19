## 今天的主題:作用域——變數到底活在哪

這幾天我已經不小心撞了好幾次:Day 7 迴圈裡宣告的 `j`,迴圈外問不到;Day 8 函式裡改參數,外面的本尊沒反應。今天把這張地圖補完整——變數的「有效活動範圍」,正式名稱叫**作用域(scope)**。

規則只有三條:

1. **內層讀得到外層**
2. **外層問不到內層**
3. **同名時,內層贏**(這叫遮蔽,Day 7 那兩個 `j` 就是)

## 規則一:函式裡竟然改到了外面的本尊

```js
let heroHp = 100;

function heal(amount) {
  heroHp = heroHp + amount;
  let healed = heroHp;
  console.log("治療後:", healed);
}

heal(30);
console.log("本尊:", heroHp);
```

輸出:

```
治療後: 130
本尊: 130
```

[插入 day9.png:治療後 130、本尊 130]

這裡我卡了一下:**Day 8 明明說「參數只是影本,改不到本尊」,為什麼今天改到了?**

追查後發現關鍵在**「這個名字是不是參數」**:

```js
// Day 8:改不到
function checkStatus(hp) {   // hp 是參數
  hp = hp - atk;             // 改的是函式自己的影本
}

// 今天:改到了
function heal(amount) {      // 參數只有 amount
  heroHp = heroHp + amount;  // heroHp 不是參數
}
```

`hp` 是參數,函式一開始就拿到一份自己的影本,改它跟外面無關。`heroHp` 不是參數,函式裡沒有這個名字,JS 就**往外層去找**,找到全域那個本人——改的就是本尊。

同一個「在函式裡賦值」的動作,結果完全相反,差別只在名字的來源。這是今天最重要的一個分辨。

## 規則二:外層問不到內層,而且錯誤訊息很直白

```js
function secret() {
  const hidden = "暗號";
  console.log(hidden);     // 函式裡面
}
secret();
console.log(hidden);       // 函式外面
```

輸出:

```
暗號
Uncaught ReferenceError: hidden is not defined
```

[插入 day9-2.png:裡面印出暗號,外面 ReferenceError]

一次跑就同時看到兩件事:**函式裡面讀得到、外面完全問不到**。`hidden` 隨著函式結束就消失了。

這裡我一開始猜錯了原因,以為是「`hidden` 沒加引號」——結果那是把 Day 8 的坑記錯棚了。Day 8 的 `hero[hp]` 是中括號裡要放**字串**所以需要引號;今天的 `console.log(hidden)` 要放的就是**變數**,不加引號才是對的(加了引號會變成印出「hidden」這五個字)。同樣的 ReferenceError,原因可以完全不同。

而且要注意:這個錯誤是執行期發生的,**從出錯那行開始,後面的程式全部不會跑**。我原本檔案裡練習 2、練習 3 都寫好了,卻一行都沒印出來,就是這個原因。

## `var`:被勸退的老前輩

`let` 和 `const` 是 2015 年才進 JS 的,在那之前宣告變數只有 `var`。它為什麼被勸退?兩個實驗就看得出來。

**實驗一:`var` 會活過迴圈**

```js
for (var i = 0; i < 3; i++) {
  console.log(i);
}
console.log("var i 迴圈後:", i);   // 3

let k;
for (k = 0; k < 3; k++) {
  console.log(k);
}
console.log("let k 迴圈後:", k);   // 3
```

`var i` 寫在 for 括號裡,迴圈結束後**外面居然還問得到**,印出 3。這跟 Day 7 那個 `let j` 完全相反——`let j` 寫在括號裡就只活在迴圈內,我當時得把宣告搬到外面才問得到值。今天的 `let k` 也是這樣寫的。

換句話說:`let` 認「大括號」這個邊界,`var` 不認。變數活過了它該死的地方,就有機會在後面被誤用。

**實驗二:`var` 允許重複宣告**

```js
var a = 1;
var a = 2;      // 不報錯
console.log("var a:", a);   // 2
```

同一個名字宣告兩次,`var` 一聲不吭。這代表你不小心重複宣告了(或不知道這個名字已經有人用了),不會有任何人提醒你。

[插入 day9-3.png:var i 迴圈後 3、let k 迴圈後 3、var a: 2、let b 重新賦值: 2]

## 一個我搞混的地方:重複宣告 ≠ 重新賦值

看到 `var a = 2` 合法,我一度困惑:「不是說 `let` 才是可以更改的那個嗎?」把兩件事分開之後就清楚了:

| 動作 | 寫法 | 結果 |
|---|---|---|
| 重新**賦值** | `let b = 1;` 之後 `b = 2;` | 合法——這才是「let 可以更改」的意思 |
| 重複**宣告** | `let b = 1;` 之後 `let b = 2;` | SyntaxError: Identifier 'b' has already been declared |

關鍵在**那個 `let` 字**:寫 `let` 是「我要新造一個變數」,同一個名字造兩次就違規;不寫 `let` 是「我要改現有那個」,完全合法。Day 2 我在 `const` 上驗證過同一組對照,今天輪到 `let`,規則一樣。

而且 `let` 的重複宣告是 **SyntaxError**——Day 2 學過,這種錯誤在「讀的階段」就被擋下,**整支程式一行都不會執行**。我實際放開那行跑了一次,主控台只剩一行紅字:

```
Uncaught SyntaxError: Identifier 'b' has already been declared
```

連練習 1 的「治療後」、練習 2 的 `0 1 2` 全都消失了——整份檔案真的一行都沒跑。

[插入 day9-4.png:只剩一行 SyntaxError,前面所有輸出都不見了]

## 順著推下去:那 `const` 要怎麼把值傳出來?

`let k` 可以「搬到外面宣告、在裡面賦值」,那 `const` 呢?我照 Day 2、Day 6 的結論推了一遍,發現兩條路都堵死:

```js
const hidden;          // SyntaxError: Missing initializer in const declaration
hidden = "暗號";
```

`const` 連「先宣告、之後再給值」都不允許——因為它的意義就是「從誕生那刻就固定指向誰」,沒有值的岩石語言直接拒收。

```js
const hidden = "";
function secret() {
  hidden = "暗號";     // Uncaught TypeError: Assignment to constant variable.
}
```

先給空字串再改也不行,這就是 Day 2 和 Day 6 驗證過的那條紅線:改「變數指向誰」就是違規。

但 Day 6 的結論也給了破解方法——`const` 鎖的是指向誰,不是內容,所以放一個**空容器**就行:

```js
const box = {};

function secret() {
  box.hidden = "暗號";     // 往箱子裡放東西,合法
}
secret();
console.log(box.hidden);   // 暗號 — 外面拿到了
```

差別在**有沒有那個點**:`box.hidden = ...` 是伸手進容器裡改內容;`hidden = ...` 是把整個變數重新指向另一個值。

## 為什麼字串不能用同樣的招?

因為字串**根本沒有「裡面」可以改**。JS 的值分兩大類:

| 類型 | 有哪些 | 內容可改? |
|---|---|---|
| 原始值(primitive) | 字串、數字、布林、null、undefined | 沒有內容可改 |
| 物件(object) | `{}`、`[]`、函式 | 可改 |

字串是原始值,而且是不可變的:

```js
let s = "暗號";
s[0] = "明";        // 不報錯,但完全沒效果
console.log(s);      // 還是「暗號」
```

**不報錯也不生效**——又一個安靜失敗的例子。想改字串只能整個換一個新的,而那對 `const` 就是違規。

所以「`const` 容器」這招只在 `{}` 和 `[]` 上成立。不過話說回來,把值傳出函式最正統的方法還是 Day 8 學的 `return`——函式本來就有正門,不需要靠這些變通法偷渡。

## 小結

今天搞懂的事:
- 作用域三規則:內層讀得到外層、外層問不到內層、同名時內層贏
- 在函式裡賦值,結果取決於「這個名字是不是參數」:是參數就改影本,不是就往外找本尊
- `var` 不認大括號邊界(活過迴圈)、允許重複宣告 → 兩個理由都指向同一件事:它讓變數在不該存在的地方存在
- 重複宣告(要寫 `let`)和重新賦值(不寫 `let`)是兩回事:前者 SyntaxError,後者合法
- `const` 無法先宣告後賦值(SyntaxError),也無法重新賦值(TypeError),但可以用 `{}`/`[]` 當容器往裡面填
- 原始值(字串、數字…)沒有內容可改,改字串的某一個字不報錯也不生效

變數的地圖到這裡總算完整了。接下來要把這些值搬上畫面——明天開始碰 DOM,讓 JavaScript 真的動到網頁,而不是只印在主控台裡。
