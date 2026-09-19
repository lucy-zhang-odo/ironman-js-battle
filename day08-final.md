## 今天的主題:函式——自己造工具,以及我把 Day 4 和 Day 6 接起來的後果

Day 4 的時候我用過一個 `checkStatus` 函式判斷血量狀態,但那是現成的。今天要自己造工具:宣告一個函式,把一段程式打包起來,之後喊名字就能重複使用。

## 函式的三個零件

```js
function calcDamage(atk, def) {
  return atk - def;
}
```

- `function calcDamage(atk, def)` — 宣告。`atk`、`def` 是**參數**,像投料口:呼叫時傳什麼進去,它們就是什麼
- `return atk - def` — 把計算結果**交還給呼叫的人**,像出汁口
- `calcDamage(20, 3)` — 呼叫。整個函式像一台果汁機:投料、攪拌、出汁

我對照學過的 Python,`function` 幾乎就是 `def`,連 `return` 的行為都一樣。

## 今天的核心實驗:return 和 console.log 是兩回事

我寫了兩個幾乎一樣的函式,一個有 `return`,一個只印:

```js
function calcDamage(atk, def) {
  return atk - def;
}
function logDamage(atk, def) {
  console.log(atk - def);   // 只印,沒有 return
}

const result1 = calcDamage(20, 3);
const result2 = logDamage(20, 3);
console.log("result1:", result1, "/ result2:", result2);
```

輸出:

```
17
result1: 17 / result2: undefined
```

`logDamage` 明明有印出 17,但 `result2` 是 `undefined`——因為 **`console.log` 的回傳值就是 `undefined`**:它只負責印給你看,不負責把值交出來。
想要「呼叫完還能拿到結果繼續用」,必須 `return`。這是我今天最重要的一個觀念。

## 我急著把 Day 4 和 Day 6 接起來,結果連踩四個坑

學完語法我忍不住手癢,想把 Day 4 的 `checkStatus` 改造成「小怪攻擊勇者之後報狀態」,直接寫了這樣的呼叫:

```js
checkStatus(checkStatus(hero[hp], enemy[atk]));
```

主控台立刻賞我一個:

```
Uncaught ReferenceError: hp is not defined
```

[插入 day8.png:ReferenceError: hp is not defined 的畫面]

逐層追查,這一行居然藏了四個坑:

1. **`hero[hp]` 的 `hp` 沒有引號**。中括號裡要放字串(`hero["hp"]`),不放引號的話,JS 把它當成一個叫 `hp` 的「變數」去找——世界上沒這個變數,直接 ReferenceError
2. **就算修好上面,`return console.log(...)` 交回的還是 `undefined`**(剛剛才學的,馬上又撞到)
3. **巢狀呼叫會把 undefined 餵給外層**:`checkStatus(checkStatus(...))` 是「先跑內層,把內層的回傳值交給外層」。內層回傳 undefined,外層等於收到 `checkStatus(undefined, undefined)`,接著 `undefined - undefined` 會算出 **NaN**(Not a Number)——而且 `NaN` 跟任何數字比較都是 false,判斷會全部落空掉進 else
4. **這個函式做了兩份工作**:「扣血」寫在 `checkStatus` 裡面,但 `hp = hp - atk` 改的只是參數這個影本,`hero.hp` 本尊完全沒動——函式結束,影本消失

結論是**一個函式只做一件事**:算傷害的歸 `calcDamage`,報狀態的歸 `checkStatus`,攻擊流程寫在外面把它們串起來:

```js
const damage = calcDamage(enemy.atk, hero.def);   // 小怪打勇者
hero.hp = hero.hp - damage;                        // 更新本尊
checkStatus(hero.hp);                              // 報狀態
```

[插入 day8-2.png:攻擊流程的程式碼與輸出]

這樣跑出來:`小怪的攻擊力 15 - 勇者的防禦力 5 = 10 傷害`,`勇者 100 → 90 → 狀態正常`。整段流程第一次真的像一場戰鬥。

(這段過程中我還順手踩了一個 Day 3 的老坑:模板字串最後一段打成 `{hero.def}`,少了 `$`,結果它原樣印出來而不是變成 5——`$` 和 `{}` 是一組的,少一個就不解析。)

## 邊界值來了:攻擊力比防禦力低,傷害是負的?

測試的時候我故意餵了一組攻低於防的參數:

```js
console.log(calcDamage(15, 20));   // -5
```

`-5`。這數字在數學上沒錯,但放進遊戲就荒謬了:`敵人 HP 60 - (-5) = 65`——**攻擊反而幫對方補血**。這種問題不能留給數學巧合,必須明確決定「攻低於防時要回傳什麼」。常見三種設計:

| 設計 | 回傳 | 遊戲效果 |
|---|---|---|
| 攻擊無效 | 0 | 揮空,對方血不變 |
| 傷害下限 0 | 0 | 數學上等價於上面 |
| 最少 1 點 | 1 | 經典 RPG 慣例:再弱也至少擦傷 |

我最後選了「最少 1 點」,而且發現一個一行解決的工具——`Math.max(a, b)` 會回傳兩數中較大的那個:

```js
function calcDamage(atk, def) {
  return Math.max(1, atk - def);   // 算出負數也至少回 1
}
```

為什麼選「最少 1 點」而不是「攻擊無效」?因為之後想做「流血」類的武器效果,讓攻擊力不足的玩家也能靠一點一點的擦傷,磨贏終極魔王——如果攻擊直接無效,這條策略就不存在了。一個小小的邊界值決策,其實決定了遊戲後期的戰術空間。

## 意外發現:兩個同名函式,不會報錯,而是後面蓋掉前面

測試的時候我把兩個版本的 `calcDamage` 都貼在同一個檔案裡想分別跑跑看:

```js
function calcDamage(atk, def) {
  if (atk - def <= 0) {
    return 0;
  }
  return atk - def;
}
console.log(calcDamage(15, 20));   // 我預期:0

function calcDamage(atk, def) {
  return Math.max(1, atk - def);
}
console.log(calcDamage(15, 20));   // 我預期:1
```

結果**兩次都印 1**。追查才知道:JS 執行前會先把整份程式讀完,函式宣告在這個階段就被處理掉了——第二個同名宣告會**直接覆蓋第一個**,而且**不報任何錯**。所以第一次呼叫執行時,if 版本早已不存在。

對照之前的經驗:兩個 `let` 變數重複宣告會直接 SyntaxError 擋下來(下一天的實驗),兩個函式同名卻安靜地覆蓋——**不報錯的錯,永遠比報錯的更難查**。這個「JS 先讀完程式才開始跑」的行為叫**提升(hoisting)**,值得記下來。

## 小結

今天搞懂的事:
- 函式 = 打包程式:參數是投料口,`return` 是出汁口
- `console.log` 只印不交(回傳 `undefined`);要把結果交出去必須 `return`
- 一個函式只做一件事;參數是影本,改參數改不到外面的本尊
- 邊界值要主動設計:攻低於防不能靠數學巧合,要決定回傳什麼(`Math.max` 一行設下限)
- 同名函式宣告會安靜覆蓋(提升機制),不像 `let` 重複宣告會報錯

攻擊的算式有了,下一步是讓變數的「活動範圍」規則更清楚——明天處理作用域,順便正式會一會那個被勸退的老前輩 `var`。