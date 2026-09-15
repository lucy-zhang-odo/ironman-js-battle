// =====================================================================
// 勇者 vs 小怪 —— 遊戲邏輯
// Day 23:專案骨架。小怪還不會反擊,那是 Day 24-25 的事。
// =====================================================================

const RECORD_KEY = "bestTurn";

// ===== 單一事實來源 =====
const state = {
  hero:  { name: "勇者", hp: 100, maxHp: 100, atk: 20, def: 5 },
  enemy: { name: "小怪", hp: 60,  maxHp: -60,  atk: 15, def: 3 },
  turn: 1,
  whipCount: 0,
  battleStarted: false,
  isOver: false,
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

// 一個角色的血條與數字。兩邊共用同一段邏輯,不用寫兩次
function renderFighter(fighter, nameEl, textEl, fillEl) {
  // Math.max(0, ...) 防止血量變負數後血條寬度變成負的(Day 8 學的保底工具)
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

  if (state.isOver) {
    state.whipCount = state.whipCount + 1;
    logText.textContent =
      `${state.hero.name}請不要對${state.enemy.name}屍體動手!(第 ${state.whipCount} 下)`;
    return;
  }

  const damage = calcDamage(state.hero.atk, state.enemy.def);
  state.enemy.hp = state.enemy.hp - damage;

  if (state.enemy.hp <= 0) {
    state.enemy.hp = 0;
    state.isOver = true;
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
    logText.innerHTML =
      `<b>${escapeHtml(state.hero.name)}</b> 造成 <span style="color:#c0392b">${damage}</span> 點傷害!`;
    state.turn = state.turn + 1;
  }

  updateScreen();
  console.log("目前狀態:", state);
}

function reset() {
  state.hero.hp   = state.hero.maxHp;
  state.enemy.hp  = state.enemy.maxHp;
  state.turn      = 1;
  state.whipCount = 0;
  state.isOver    = false;

  // 重置時狀態和畫面要一起還原,否則「再戰一次」和「重開瀏覽器」
  // 這兩條路徑會有不同的行為(Day 20 抓到的不一致)
  state.battleStarted = false;
  nameInput.disabled  = false;
  startBtn.disabled   = false;

  attackBtn.textContent = "攻擊!";
  attackBtn.classList.remove("revenge-btn");
  logText.textContent = "再戰開始!";
  logText.classList.remove("warning");
  updateScreen();
  console.log("重置後狀態:", state);
}

// ===== 啟動 =====
showRecord();
updateScreen();
startBtn.addEventListener("click", startGame);
attackBtn.addEventListener("click", attack);
resetBtn.addEventListener("click", reset);
