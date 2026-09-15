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

function updateScreen() {
  turnText.textContent = `回合 ${state.turn}`;
  renderFighter(state.hero,  heroName,  heroHpText,  heroHpFill);
  renderFighter(state.enemy, enemyName, enemyHpText, enemyHpFill);
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
      logText.innerHTML =
        `<b>${escapeHtml(state.enemy.name)}</b> 被擊敗了!${state.turn} 回合 —— 新紀錄!`;
    } else {
      logText.innerHTML =
        `<b>${escapeHtml(state.enemy.name)}</b> 被擊敗了!(共 ${state.turn} 回合)`;
    }
  } else {
    state.hero.hp = 0;
    attackBtn.disabled = true;            // 死了就不能再攻擊,沒有鞭屍可言
    logText.innerHTML =
      `<b>${escapeHtml(state.hero.name)}</b> 倒下了…… 撐了 ${state.turn} 回合`;
  }
}

// ===== 遊戲流程 =====
function startGame() {
  const name = nameInput.value.trim();

  if (name === "") {
    logText.textContent = "請先輸入名字!";
    logText.classList.add("warning");
    return;
  }
  if (name.length > 10) {
    logText.textContent = `名字太長了(${name.length} 字),請縮短到 10 字以內`;
    logText.classList.add("warning");
    return;
  }

  logText.classList.remove("warning");
  state.hero.name = name;
  logText.textContent = `勇者 ${state.hero.name} 出征!`;
  updateScreen();
}

function attack() {
  if (!state.battleStarted) {
    state.battleStarted = true;
    nameInput.disabled = true;
    startBtn.disabled = true;
  }

  // 已經結束:只有勝利後才有鞭屍;失敗時按鈕已停用,進不來
  if (state.isOver) {
    state.whipCount = state.whipCount + 1;
    logText.textContent =
      `${state.hero.name}請不要對${state.enemy.name}屍體動手!(第 ${state.whipCount} 下)`;
    return;
  }

  // --- 第一步:玩家攻擊 ---
  const heroDmg = calcDamage(state.hero.atk, state.enemy.def);
  state.enemy.hp = state.enemy.hp - heroDmg;

  // --- 第二步:先確認敵人死了沒。死了就不該反擊 ---
  if (state.enemy.hp <= 0) {
    endGame("win");
    updateScreen();
    console.log("目前狀態:", state);
    return;
  }

  // --- 第三步:敵人還活著,換牠打 ---
  const enemyDmg = calcDamage(state.enemy.atk, state.hero.def);
  state.hero.hp = state.hero.hp - enemyDmg;

  // --- 第四步:勇者死了沒 ---
  if (state.hero.hp <= 0) {
    logText.innerHTML =
      `<b>${escapeHtml(state.hero.name)}</b> 造成 ${heroDmg} 點傷害,` +
      `但 <b>${escapeHtml(state.enemy.name)}</b> 反擊 ${enemyDmg} 點……`;
    endGame("lose");
    updateScreen();
    console.log("目前狀態:", state);
    return;
  }

  // --- 第五步:都還活著,進入下一回合 ---
  logText.innerHTML =
    `<b>${escapeHtml(state.hero.name)}</b> 造成 <span style="color:#c0392b">${heroDmg}</span> 點傷害!` +
    ` <b>${escapeHtml(state.enemy.name)}</b> 反擊 <span style="color:#c0392b">${enemyDmg}</span> 點!`;
  state.turn = state.turn + 1;

  updateScreen();
  console.log("目前狀態:", state);
}

function reset() {
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
  logText.textContent = "再戰開始!";
  logText.classList.remove("warning");
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
