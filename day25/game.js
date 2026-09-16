// =====================================================================
// 勇者 vs 小怪 —— 遊戲邏輯
// Day 24:小怪會反擊了。戰鬥終於是雙向的。
// =====================================================================

const RECORD_KEY = "bestTurn";

// ===== 單一事實來源 =====
const state = {
  hero:  { name: "勇者", hp: 100, maxHp: 100, atk: 9, def: 5 },
  enemy: { name: "小怪", hp: 60,  maxHp: 60,  atk: 15, def: 3 },
  turn: 1,
  whipCount: 0,
  battleStarted: false,
  isOver: false,
  result: null,        // null = 進行中 / "win" = 勝利 / "lose" = 失敗
};

// ===== 抓元素 =====
const nameInput   = document.getElementById("nameInput");
const startBtn    = document.getElementById("startBtn");
const turnText    = document.getElementById("turnText");
const heroName    = document.getElementById("heroName");
const heroHpText  = document.getElementById("heroHpText");
const heroHpFill  = document.getElementById("heroHpFill");
const enemyName   = document.getElementById("enemyName");
const enemyHpText = document.getElementById("enemyHpText");
const enemyHpFill = document.getElementById("enemyHpFill");
const logText     = document.getElementById("log");
const attackBtn   = document.getElementById("attackBtn");
const resetBtn    = document.getElementById("resetBtn");
const recordText  = document.getElementById("record");
const heroBox     = document.getElementById("heroBox");
const enemyBox    = document.getElementById("enemyBox");

// 排隊中的反擊演出。一個回合的演出沒播完,不該開始下一個回合 ——
// 否則排隊中的那次反擊會在「小怪已經死掉之後」才執行,變成屍體打人。
// 這個編號是用來剪線的(Day 17 學的 clearTimeout)
let pendingTimer = null;

// 演出進行中的旗標。
// 為什麼不用 attackBtn.disabled?因為 disabled 的按鈕「連點擊事件都不會觸發」,
// 那就沒機會告訴玩家「現在不能打」。改用旗標擋,按鈕照樣收得到點擊,
// 才能回一句「請不要偷襲!」—— 擋下操作的同時也解釋原因,比按鈕變灰友善
let isAnimating = false;

// ===== 受擊效果 =====
// 問題:如果元素已經有這個 class,再 add 一次「什麼都不會發生」——
//      CSS 認為狀態沒變,動畫不會重播。連續攻擊時第二下就看不到效果。
// 解法:先移除 → 強迫瀏覽器立刻結算 → 再加回去。
//      中間那行 void el.offsetWidth 是讀取寬度然後把結果丟掉,
//      看起來莫名其妙,但「讀取版面資訊」會逼瀏覽器把前面的移除動作真的算完,
//      否則它會把 remove 和 add 合併成「什麼都沒變」。
function playEffect(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

// 誰被打了就震誰,血量數字同時閃一下。
// delay:延後幾毫秒才播。用來做出「你打我、我打你」的先後感 ——
// 傷害和勝負在點下去的瞬間就全部算完了,計時器只負責演出的節奏。
// 這正是 Day 17 的結論:計時器用在表現層可以,用在規則層會破壞回合制。
function showHit(box, hpTextEl, delay = 0) {
  if (delay === 0) {
    playEffect(box, "shake");
    playEffect(hpTextEl, "flash");
    return;
  }
  setTimeout(() => {
    playEffect(box, "shake");
    playEffect(hpTextEl, "flash");
  }, delay);
}

// ===== 戰鬥紀錄 =====
// 一筆一筆往下累積,不覆蓋。showTurn 決定要不要在前面標回合數
function addLog(html, className = "", showTurn = false) {
  const line = document.createElement("div");
  line.className = "log-line" + (className ? " " + className : "");

  const turnTag = showTurn
    ? `<span class="log-turn">[${state.turn}]</span>`
    : "";
  line.innerHTML = turnTag + html;

  logText.appendChild(line);

  // 紀錄太長會吃記憶體(鞭屍可以按很多下),只留最近 200 行
  while (logText.children.length > 200) {
    logText.removeChild(logText.firstChild);
  }

  // 自動捲到最底,不然新的訊息會看不到
  logText.scrollTop = logText.scrollHeight;
}

function clearLog() {
  logText.innerHTML = "";
}

// ===== 小工具 =====
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcDamage(atk, def) {
  const base = Math.max(1, atk - def);
  return Math.max(1, base + randomInt(-3, 3));
}

function escapeHtml(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// ===== 紀錄 =====
function getBestTurn() {
  const raw = localStorage.getItem(RECORD_KEY);
  if (raw === null) { return null; }
  return Number(raw);
}

function showRecord() {
  const best = getBestTurn();
  if (best === null) {
    recordText.textContent = "最少回合紀錄:尚無";
  } else {
    recordText.textContent = `最少回合紀錄:${best} 回合`;
  }
}

function saveRecordIfBetter(turns) {
  const best = getBestTurn();
  if (best === null || turns < best) {
    localStorage.setItem(RECORD_KEY, turns);
    showRecord();
    return true;
  }
  return false;
}

// ===== 畫面更新 =====
function renderFighter(fighter, nameEl, textEl, fillEl) {
  const hp = Math.max(0, fighter.hp);
  const percent = (hp / fighter.maxHp) * 100;

  nameEl.textContent = fighter.name;
  textEl.textContent = `${hp} / ${fighter.maxHp}`;
  fillEl.style.width = percent + "%";

  fillEl.classList.remove("warn", "danger");
  if (percent <= 30) {
    fillEl.classList.add("danger");
  } else if (percent <= 60) {
    fillEl.classList.add("warn");
  }

  if (hp <= 0) {
    textEl.classList.add("dead");
  } else {
    textEl.classList.remove("dead");
  }
}

// 拆成兩個:因為一來一往的演出需要「分開更新」。
// 小怪被打時只更新小怪,勇者被打時只更新勇者
function renderHero() {
  renderFighter(state.hero, heroName, heroHpText, heroHpFill);
}

function renderEnemy() {
  renderFighter(state.enemy, enemyName, enemyHpText, enemyHpFill);
}

function updateScreen() {
  turnText.textContent = `回合 ${state.turn}`;
  renderHero();
  renderEnemy();
}

// ===== 結束處理 =====
function endGame(result) {
  state.isOver = true;
  state.result = result;

  if (result === "win") {
    state.enemy.hp = 0;
    attackBtn.textContent = "鞭屍!!";
    attackBtn.classList.add("revenge-btn");

    const isNewRecord = saveRecordIfBetter(state.turn);
    if (isNewRecord) {
      addLog(`<b>${escapeHtml(state.enemy.name)}</b> 被擊敗了!${state.turn} 回合 —— 新紀錄!`, "result-win");
    } else {
      addLog(`<b>${escapeHtml(state.enemy.name)}</b> 被擊敗了!(共 ${state.turn} 回合)`, "result-win");
    }
  } else {
    state.hero.hp = 0;
    attackBtn.disabled = true;            // 死了就不能再攻擊,沒有鞭屍可言
    addLog(`<b>${escapeHtml(state.hero.name)}</b> 倒下了…… 撐了 ${state.turn} 回合`, "result-lose");
  }
}

// ===== 遊戲流程 =====
function startGame() {
  const name = nameInput.value.trim();

  if (name === "") {
    addLog("請先輸入名字!", "log-warning");
    return;
  }
  if (name.length > 10) {
    addLog(`名字太長了(${name.length} 字),請縮短到 10 字以內`, "log-warning");
    return;
  }

  state.hero.name = name;
  addLog(`勇者 <b>${escapeHtml(state.hero.name)}</b> 出征!`);
  updateScreen();
}

function attack() {
  // 上一回合的演出還沒播完:擋下來,順便吐槽一句
  if (isAnimating) {
    addLog(`${escapeHtml(state.hero.name)}請不要偷襲!`, "log-warning");
    return;
  }

  if (!state.battleStarted) {
    state.battleStarted = true;
    nameInput.disabled = true;
    startBtn.disabled = true;
  }

  // 已經結束:只有勝利後才有鞭屍;失敗時按鈕已停用,進不來
  if (state.isOver) {
    state.whipCount = state.whipCount + 1;
    addLog(`${escapeHtml(state.hero.name)}請不要對${escapeHtml(state.enemy.name)}屍體動手!(第 ${state.whipCount} 下)`);
    return;
  }

  // 所有計算在這裡一次做完。下面的延遲只影響「什麼時候看到」,不影響結果。
  const heroName_  = escapeHtml(state.hero.name);
  const enemyName_ = escapeHtml(state.enemy.name);

  // --- 第一步:玩家攻擊(立刻呈現) ---
  const heroDmg = calcDamage(state.hero.atk, state.enemy.def);
  state.enemy.hp = state.enemy.hp - heroDmg;

  renderEnemy();                    // 只更新小怪的血條與數字
  showHit(enemyBox, enemyHpText);   // 小怪被打了,震牠
  addLog(`<b>${heroName_}</b> 造成 <span style="color:#c0392b">${heroDmg}</span> 點傷害!`, "", true);

  // --- 第二步:先確認敵人死了沒。死了就不該反擊 ---
  if (state.enemy.hp <= 0) {
    endGame("win");
    renderEnemy();
    console.log("目前狀態:", state);
    return;
  }

  // --- 第三步:敵人還活著,換牠打。結果現在就算完 ---
  const enemyDmg = calcDamage(state.enemy.atk, state.hero.def);
  state.hero.hp = state.hero.hp - enemyDmg;
  const heroDied = state.hero.hp <= 0;

  if (!heroDied) {
    state.turn = state.turn + 1;
  }

  // --- 第四步:反擊的「演出」延後 380 毫秒 ---
  // 血條、數字、震動、訊息要一起晚,不然血瞬間掉、震動才來,看起來像兩件無關的事。
  //
  // 演出期間擋住下一次攻擊:否則玩家在 0.38 秒內再點一次,
  // 就會出現「小怪已經被擊敗,排隊中的反擊才姍姍來遲」—— 屍體打人。
  isAnimating = true;
  attackBtn.classList.add("busy");     // 只是視覺上變淡,不是 disabled,點擊照樣收得到

  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    isAnimating = false;
    attackBtn.classList.remove("busy");

    renderHero();
    showHit(heroBox, heroHpText);

    // 反擊自成一行,和上面那行合起來就是完整的一來一往
    addLog(`<b>${enemyName_}</b> 反擊 <span style="color:#c0392b">${enemyDmg}</span> 點!`);

    if (heroDied) {
      endGame("lose");
      renderHero();
      // endGame 會把按鈕真的 disabled —— 死掉是永久狀態,不是暫時擋一下
    } else {
      turnText.textContent = `回合 ${state.turn}`;
    }
    console.log("目前狀態:", state);
  }, 380);
}

function reset() {
  // 剪線:如果上一場還有排隊中的反擊演出,現在取消它。
  // 不然重置之後那個舊的演出會跑出來,對著新的一場亂噴訊息
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    isAnimating = false;
    attackBtn.classList.remove("busy");
  }

  state.hero.hp   = state.hero.maxHp;
  state.enemy.hp  = state.enemy.maxHp;
  state.turn      = 1;
  state.whipCount = 0;
  state.isOver    = false;
  state.result    = null;

  state.battleStarted = false;
  nameInput.disabled  = false;
  startBtn.disabled   = false;

  attackBtn.textContent = "攻擊!";
  attackBtn.classList.remove("revenge-btn");
  attackBtn.disabled = false;        // 失敗時停用過,要記得放開
  clearLog();                        // 新的一場,紀錄從頭開始
  addLog("再戰開始!");
  updateScreen();
  console.log("重置後狀態:", state);
}

// =====================================================================
// 數值平衡模擬器
// 手動打 20 場要按兩百多下,不如寫程式讓它自己打。
// 在主控台輸入 simulate(9) 就會跑 1000 場,回報勝率與平均回合數。
// 它只跑「計算」,完全不碰畫面 —— 所以一瞬間就跑完。
// =====================================================================
function simulate(heroAtk, times = 1000) {
  let wins = 0;
  let totalTurns = 0;
  let minTurns = Infinity;

  for (let i = 0; i < times; i++) {
    let heroHp  = state.hero.maxHp;
    let enemyHp = state.enemy.maxHp;
    let turn = 1;

    while (true) {
      enemyHp = enemyHp - calcDamage(heroAtk, state.enemy.def);
      if (enemyHp <= 0) {
        wins = wins + 1;
        totalTurns = totalTurns + turn;
        if (turn < minTurns) { minTurns = turn; }
        break;
      }

      heroHp = heroHp - calcDamage(state.enemy.atk, state.hero.def);
      if (heroHp <= 0) {
        totalTurns = totalTurns + turn;
        break;
      }

      turn = turn + 1;
    }
  }

  const rate = (wins / times * 100).toFixed(1);
  console.log(
    `勇者 atk=${heroAtk}:勝率 ${rate}%(${wins}/${times})` +
    `,平均 ${(totalTurns / times).toFixed(1)} 回合,最快 ${minTurns} 回合`
  );
}

// ===== 啟動 =====
showRecord();
updateScreen();
startBtn.addEventListener("click", startGame);
attackBtn.addEventListener("click", attack);
resetBtn.addEventListener("click", reset);
