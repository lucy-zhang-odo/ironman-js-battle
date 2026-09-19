// =====================================================================
// 勇者 vs 小怪 —— 遊戲邏輯
// Day 27:骰子系統。奇數幫勇者、偶數幫小怪,一半一半的賭注。
// =====================================================================

const DICE_COOLDOWN = 3;    // 用完之後要等幾回合

// ---------------------------------------------------------------------
// 🥚 彩蛋:魔王視角
// 輸入這些名字之一,就會從魔王的角度打這場仗 —— 角色對調,數值也對調。
// 紀錄分開存,不要污染正常模式的最少回合紀錄。
// ---------------------------------------------------------------------
const BOSS_NAMES = ["魔王", "大魔王", "BOSS", "boss", "Boss", "魔王大人"];

const NORMAL_SETUP = {
  hero:  { name: "勇者", hp: 100, maxHp: 100, atk: 9,  def: 5 },
  enemy: { name: "小怪", hp: 60,  maxHp: 60,  atk: 15, def: 3 },
};

// 玩家變成血少但攻高的那一方,對手是血厚的討伐者 —— 難度比正常模式高
const BOSS_SETUP = {
  hero:  { name: "魔王", hp: 60,  maxHp: 60,  atk: 15, def: 3 },
  enemy: { name: "勇者", hp: 100, maxHp: 100, atk: 9,  def: 5 },
};

function recordKey() {
  return state.bossMode ? "bestTurn_boss" : "bestTurn";
}

function applySetup(setup) {
  state.hero  = { ...setup.hero };
  state.enemy = { ...setup.enemy };
  document.getElementById("gameTitle").textContent =
    `${setup.hero.name} vs ${setup.enemy.name}`;
}

// ===== 單一事實來源 =====
const state = {
  // 基礎值:從頭到尾都不會被 buff 改動。
  // 這是 Day 27 最重要的設計決定 —— 見下面 sumBuff() 的說明
  hero:  { name: "勇者", hp: 100, maxHp: 100, atk: 9,  def: 5 },
  enemy: { name: "小怪", hp: 60,  maxHp: 60,  atk: 15, def: 3 },

  turn: 1,
  whipCount: 0,
  battleStarted: false,
  ready: false,
  isOver: false,
  result: null,

  buffs: [],            // 目前生效中的增益/減益清單
  charged: false,       // 蓄力:下一次攻擊傷害翻倍(一次性,不佔 buffs)
  diceCooldown: 0,      // 還要等幾回合才能再擲骰
  bossMode: false,      // 🥚
};

// ===== 抓元素 =====
const nameInput    = document.getElementById("nameInput");
const startBtn     = document.getElementById("startBtn");
const turnText     = document.getElementById("turnText");
const heroName     = document.getElementById("heroName");
const heroHpText   = document.getElementById("heroHpText");
const heroHpFill   = document.getElementById("heroHpFill");
const heroBuffs    = document.getElementById("heroBuffs");
const enemyName    = document.getElementById("enemyName");
const enemyHpText  = document.getElementById("enemyHpText");
const enemyHpFill  = document.getElementById("enemyHpFill");
const enemyBuffs   = document.getElementById("enemyBuffs");
const logText      = document.getElementById("log");
const attackBtn    = document.getElementById("attackBtn");
const diceBtn      = document.getElementById("diceBtn");
const resetBtn     = document.getElementById("resetBtn");
const recordText   = document.getElementById("record");
const heroBox      = document.getElementById("heroBox");
const enemyBox     = document.getElementById("enemyBox");
const resultBox    = document.getElementById("result");
const resultTitle  = document.getElementById("resultTitle");
const resultDetail = document.getElementById("resultDetail");

let pendingTimer = null;
let isAnimating  = false;

// ===== 受擊效果 =====
function playEffect(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;          // 強制重排,動畫才會重新開始
  el.classList.add(className);
}

function showHit(box, hpTextEl) {
  playEffect(box, "shake");
  playEffect(hpTextEl, "flash");
}

// ===== 戰鬥紀錄 =====
function addLog(html, className = "", showTurn = false) {
  const line = document.createElement("div");
  line.className = "log-line" + (className ? " " + className : "");
  line.innerHTML =
    (showTurn ? `<span class="log-turn">[${state.turn}]</span>` : "") + html;
  logText.appendChild(line);

  while (logText.children.length > 200) {
    logText.removeChild(logText.firstChild);
  }
  logText.scrollTop = logText.scrollHeight;
}

function clearLog() {
  logText.innerHTML = "";
}

// ===== 小工具 =====
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeHtml(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// =====================================================================
// 增益系統
//
// 關鍵決定:基礎值永遠不動,buff 存在另一份清單裡,要用的時候才加總。
//
// 一開始我想直接寫 state.enemy.atk += 5,但馬上遇到問題:
//   三回合後要怎麼還原?減回去嗎?
//   如果期間又骰到一次狂暴呢?
//   如果破甲和硬化同時存在呢?
// 只要基礎值被改過,就再也分不清「原本是多少」。
// 分開之後:重置只要清空清單,重複、疊加、抵銷通通自然成立。
// =====================================================================

// pending:這個 buff 是這回合才掛上、還沒開始計算的。
// 因為擲骰消耗的是「勇者的」回合,勇者這回合不會攻擊 ——
// 如果他的 buff 從當回合起算,第一回合等於白白浪費掉。
// 小怪沒有損失回合(牠照樣反擊),所以牠的 buff 立即生效。
function sumBuff(target, type) {
  let total = 0;
  for (const b of state.buffs) {
    if (b.pending) { continue; }
    if (b.target === target && b.type === type) {
      total = total + b.value;
    }
  }
  return total;
}

function effectiveAtk(who) {
  return Math.max(0, state[who].atk + sumBuff(who, "atk"));
}

function effectiveDef(who) {
  return Math.max(0, state[who].def + sumBuff(who, "def"));
}

// 每回合結束時呼叫:剛掛上的解除 pending,其他的倒數一回合,歸零的移除
function tickBuffs() {
  for (const b of state.buffs) {
    if (b.pending) {
      b.pending = false;
      continue;
    }
    b.turnsLeft = b.turnsLeft - 1;
  }
  state.buffs = state.buffs.filter((b) => b.turnsLeft > 0);
}

function renderBuffs() {
  heroBuffs.innerHTML = "";
  enemyBuffs.innerHTML = "";

  if (state.charged) {
    const chip = document.createElement("span");
    chip.className = "buff-chip good";
    chip.textContent = `蓄力 ×${DICE_FACES[1].multiplier}`;
    heroBuffs.appendChild(chip);
  }

  for (const b of state.buffs) {
    const chip = document.createElement("span");
    chip.className = "buff-chip " + (b.good ? "good" : "bad");
    chip.textContent = b.pending
      ? `${b.label}(下回合起 ${b.turnsLeft})`
      : `${b.label} ${b.turnsLeft}`;
    (b.target === "hero" ? heroBuffs : enemyBuffs).appendChild(chip);
  }
}

// ===== 紀錄 =====
function getBestTurn() {
  const raw = localStorage.getItem(recordKey());
  if (raw === null) { return null; }
  return Number(raw);
}

function showRecord() {
  const best = getBestTurn();
  recordText.textContent =
    best === null ? "最少回合紀錄:尚無" : `最少回合紀錄:${best} 回合`;
}

function saveRecordIfBetter(turns) {
  const best = getBestTurn();
  if (best === null || turns < best) {
    localStorage.setItem(recordKey(), turns);
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

function renderHero() {
  renderFighter(state.hero, heroName, heroHpText, heroHpFill);
  renderBuffs();
}

function renderEnemy() {
  renderFighter(state.enemy, enemyName, enemyHpText, enemyHpFill);
  renderBuffs();
}

function renderDiceBtn() {
  if (state.diceCooldown > 0) {
    diceBtn.textContent = `骰子冷卻 (${state.diceCooldown})`;
    diceBtn.classList.add("busy");
  } else {
    diceBtn.textContent = "擲骰子 🎲";
    diceBtn.classList.remove("busy");
  }
}

function updateScreen() {
  turnText.textContent = `回合 ${state.turn}`;
  renderHero();
  renderEnemy();
  renderDiceBtn();
}

// ===== 結果 =====
function showResult(result) {
  resultBox.classList.remove("win", "lose");
  resultBox.classList.add(result);

  if (result === "win") {
    const best = getBestTurn();
    resultTitle.textContent = "勝利!";
    resultDetail.textContent =
      best === state.turn
        ? `用 ${state.turn} 回合擊敗小怪 —— 這是目前最佳紀錄!`
        : `用 ${state.turn} 回合擊敗小怪(最佳紀錄:${best} 回合)`;
  } else {
    resultTitle.textContent = "敗北……";
    resultDetail.textContent = `${state.hero.name} 撐了 ${state.turn} 回合`;
  }
  resultBox.hidden = false;
}

function hideResult() {
  resultBox.hidden = true;
}

function endGame(result) {
  state.isOver = true;
  state.result = result;

  if (result === "win") {
    state.enemy.hp = 0;
    attackBtn.textContent = "鞭屍!!";
    attackBtn.classList.add("revenge-btn");
    diceBtn.disabled = true;

    const isNewRecord = saveRecordIfBetter(state.turn);
    addLog(
      isNewRecord
        ? `<b>${escapeHtml(state.enemy.name)}</b> 被擊敗了!${state.turn} 回合 —— 新紀錄!`
        : `<b>${escapeHtml(state.enemy.name)}</b> 被擊敗了!(共 ${state.turn} 回合)`,
      "result-win"
    );
  } else {
    state.hero.hp = 0;
    attackBtn.disabled = true;
    diceBtn.disabled = true;
    addLog(`<b>${escapeHtml(state.hero.name)}</b> 倒下了…… 撐了 ${state.turn} 回合`, "result-lose");
  }

  showResult(result);
}

// ===== 傷害 =====
function calcDamage(atk, def) {
  const base = Math.max(1, atk - def);
  return Math.max(1, base + randomInt(-3, 3));
}

// =====================================================================
// 骰子:六個面,奇數幫勇者、偶數幫小怪
// =====================================================================
// 六個面的設定集中在這裡。遊戲和模擬器都讀這一份 ——
// 調平衡時只改這裡,兩邊自動同步,不會出現「測試工具和遊戲規則不一致」。
const DICE_FACES = {
  // 平衡調整:只加強勇者面(1/3/5),小怪面(2/4/6)維持原樣。
  // 理由是不想削弱風險 —— 骰輸的代價保持原本的痛,賭注才有緊張感
  1: { label: "蓄力", good: true,  kind: "charge", multiplier: 3 },
  2: { label: "狂暴", good: false, kind: "buff", target: "enemy", type: "atk", value:  5, turns: 3 },
  3: { label: "治療", good: true,  kind: "heal", target: "hero",  value: 40 },
  4: { label: "再生", good: false, kind: "heal", target: "enemy", value: 15 },
  5: { label: "破甲", good: true,  kind: "buff", target: "enemy", type: "def", value: -5, turns: 3 },
  6: { label: "硬化", good: false, kind: "buff", target: "enemy", type: "def", value:  3, turns: 3 },
};

// 名字要從 state 讀,不能寫死 ——
// 魔王模式下 target "enemy" 是勇者,寫死「小怪」就會說出錯誤的訊息
function faceDesc(f) {
  if (f.kind === "charge") { return `下一次攻擊傷害 ×${f.multiplier}`; }
  if (f.kind === "heal") {
    return `${escapeHtml(state[f.target].name)}回復 ${f.value} 點血`;
  }
  const who = escapeHtml(state[f.target].name);
  const what = f.type === "atk" ? "攻擊" : "防禦";
  const sign = f.value > 0 ? "+" : "−";
  return `${who}${what} ${sign}${Math.abs(f.value)},持續 ${f.turns} 回合`;
}

function applyDice(face) {
  const f = DICE_FACES[face];
  const cls = f.good ? "dice-good" : "dice-bad";

  // 立即型:沒有「浪費回合」的問題,馬上結算
  if (f.kind === "heal") {
    const who = state[f.target];
    const before = who.hp;
    who.hp = Math.min(who.maxHp, who.hp + f.value);
    addLog(`🎲 <b>${face}</b> ${f.label}:${who.name}回復 ${who.hp - before} 點`, cls);
    return;
  }

  // 蓄力:一次性,等下次攻擊才用掉
  if (f.kind === "charge") {
    state.charged = true;
    addLog(`🎲 <b>${face}</b> ${f.label}:${faceDesc(f)}`, cls);
    return;
  }

  // 持續型。勇者受益的從下回合起算(這回合他沒攻擊,不該白白虧掉一輪),
  // 小怪受益的立即生效(牠照樣反擊,沒有損失回合)
  state.buffs.push({
    target: f.target,
    type: f.type,
    value: f.value,
    good: f.good,
    label: f.label,
    turnsLeft: f.turns,
    pending: f.good,
  });

  addLog(`🎲 <b>${face}</b> ${f.label}:${faceDesc(f)}` + (f.good ? "(下回合起)" : ""), cls);
}

// ===== 共用:小怪的反擊 =====
// 攻擊和擲骰都會消耗勇者的回合,而小怪照樣行動 —— 所以這段抽出來共用
function enemyCounterAttack(heroDisplayName) {
  const enemyDmg = calcDamage(effectiveAtk("enemy"), effectiveDef("hero"));
  state.hero.hp = state.hero.hp - enemyDmg;
  const heroDied = state.hero.hp <= 0;

  if (!heroDied) {
    state.turn = state.turn + 1;
  }

  isAnimating = true;
  attackBtn.classList.add("busy");

  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    isAnimating = false;
    attackBtn.classList.remove("busy");

    renderHero();
    showHit(heroBox, heroHpText);
    addLog(`<b>${escapeHtml(state.enemy.name)}</b> 反擊 <span style="color:#c0392b">${enemyDmg}</span> 點!`);

    if (heroDied) {
      endGame("lose");
      renderHero();
    } else {
      tickBuffs();                 // 一個回合真正結束,增益倒數
      if (state.diceCooldown > 0) {
        state.diceCooldown = state.diceCooldown - 1;
      }
      updateScreen();
    }
    console.log("目前狀態:", state);
  }, 380);
}

// ===== 共用的攔截條件 =====
// 攻擊和擲骰的前置檢查一模一樣,抽出來才不會改了一邊忘了另一邊
function blockedByGuards() {
  if (isAnimating) {
    addLog(`${escapeHtml(state.hero.name)}請不要偷襲!`, "log-warning");
    return true;
  }
  if (!state.ready) {
    addLog("請先輸入勇者名字,並按下「出征!」", "log-warning");
    nameInput.focus();
    return true;
  }
  return false;
}

function markBattleStarted() {
  if (!state.battleStarted) {
    state.battleStarted = true;
    nameInput.disabled = true;
    startBtn.disabled = true;
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

  // 🥚 名字對上了就切到魔王視角,否則維持正常模式
  const isBoss = BOSS_NAMES.includes(name);
  state.bossMode = isBoss;
  applySetup(isBoss ? BOSS_SETUP : NORMAL_SETUP);
  document.body.classList.toggle("boss-mode", isBoss);

  if (isBoss) {
    addLog("……有人在呼喚黑暗。", "log-ghost");
    addLog(`<b>魔王</b>睜開了眼睛 —— 勇者來討伐你了`, "result-lose");
  } else {
    state.hero.name = name;
    addLog(`勇者 <b>${escapeHtml(state.hero.name)}</b> 出征!`);
  }

  state.ready = true;
  showRecord();          // 兩種模式的紀錄分開存,切換時要重讀
  updateScreen();
}

function attack() {
  if (blockedByGuards()) { return; }
  markBattleStarted();

  if (state.isOver) {
    state.whipCount = state.whipCount + 1;
    addLog(`${escapeHtml(state.hero.name)}請不要對${escapeHtml(state.enemy.name)}屍體動手!(第 ${state.whipCount} 下)`);
    return;
  }

  // 勇者攻擊(蓄力會在這裡用掉)
  let heroDmg = calcDamage(effectiveAtk("hero"), effectiveDef("enemy"));
  if (state.charged) {
    heroDmg = heroDmg * DICE_FACES[1].multiplier;
    state.charged = false;
  }
  state.enemy.hp = state.enemy.hp - heroDmg;

  renderEnemy();
  showHit(enemyBox, enemyHpText);
  addLog(`<b>${escapeHtml(state.hero.name)}</b> 造成 <span style="color:#c0392b">${heroDmg}</span> 點傷害!`, "", true);

  if (state.enemy.hp <= 0) {
    endGame("win");
    renderEnemy();
    return;
  }

  enemyCounterAttack();
}

function rollDice() {
  if (blockedByGuards()) { return; }

  if (state.isOver) {
    addLog("戰鬥已經結束了,骰子收起來吧", "log-warning");
    return;
  }
  if (state.diceCooldown > 0) {
    addLog(`骰子還在冷卻,還要 ${state.diceCooldown} 回合`, "log-warning");
    return;
  }

  markBattleStarted();

  const face = randomInt(1, 6);
  addLog(`<b>${escapeHtml(state.hero.name)}</b> 擲出了骰子……`, "", true);
  applyDice(face);

  state.diceCooldown = DICE_COOLDOWN + 1;   // +1 是因為這回合結束時會先扣一次
  renderEnemy();
  renderHero();

  // 擲骰消耗了勇者的回合,但小怪照樣反擊
  enemyCounterAttack();
}

function reset() {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    isAnimating = false;
    attackBtn.classList.remove("busy");
  }

  // 🥚 回到正常模式:名字要重新輸入,所以設定也跟著還原
  state.bossMode = false;
  document.body.classList.remove("boss-mode");
  applySetup(NORMAL_SETUP);

  state.turn      = 1;
  state.whipCount = 0;
  state.isOver    = false;
  state.result    = null;

  // 增益系統的重置:因為基礎值從來沒被動過,清空清單就還原了
  state.buffs = [];
  state.charged = false;
  state.diceCooldown = 0;

  state.battleStarted = false;
  state.ready = false;
  nameInput.disabled = false;
  startBtn.disabled  = false;
  hideResult();

  attackBtn.textContent = "攻擊!";
  attackBtn.classList.remove("revenge-btn");
  attackBtn.disabled = false;
  diceBtn.disabled = false;

  clearLog();
  addLog("再戰一次:確認名字後按下「出征!」");
  updateScreen();
  console.log("重置後狀態:", state);
}

// =====================================================================
// 模擬器:骰子到底值不值得?
// Day 24 的模擬器只跑攻防,這次要把骰子和增益也模擬進去。
// 在主控台輸入 compareDice() 就會跑兩種策略各 1000 場。
//
// 注意:模擬完全不碰畫面,所以它得自己重做一份戰鬥邏輯。
// 這是「把規則寫在兩個地方」的代價 —— 改了遊戲就要記得改模擬器,
// 不然兩邊會悄悄分岔。真正的專案會把規則抽成共用函式來避免這件事。
// =====================================================================
function simulateBattle(useDice) {
  const h = { hp: 100, atk: 9,  def: 5 };
  const e = { hp: 60,  atk: 15, def: 3 };
  let buffs = [];
  let charged = false;
  let cooldown = 0;
  let turn = 1;

  const sum = (target, type) => {
    let t = 0;
    for (const b of buffs) {
      if (!b.pending && b.target === target && b.type === type) { t = t + b.value; }
    }
    return t;
  };
  const dmg = (atk, def) => Math.max(1, Math.max(1, atk - def) + randomInt(-3, 3));

  const tick = () => {
    for (const b of buffs) {
      if (b.pending) { b.pending = false; } else { b.turnsLeft = b.turnsLeft - 1; }
    }
    buffs = buffs.filter((b) => b.turnsLeft > 0);
    if (cooldown > 0) { cooldown = cooldown - 1; }
  };

  while (turn < 100) {
    const rolling = useDice && cooldown === 0;

    if (rolling) {
      // 讀的是同一份 DICE_FACES,所以調數值時模擬器會自動跟上
      const f = DICE_FACES[randomInt(1, 6)];
      if (f.kind === "charge") { charged = f.multiplier; }
      if (f.kind === "heal") {
        if (f.target === "hero")  { h.hp = Math.min(100, h.hp + f.value); }
        else                      { e.hp = Math.min(60,  e.hp + f.value); }
      }
      if (f.kind === "buff") {
        buffs.push({
          target: f.target, type: f.type, value: f.value,
          turnsLeft: f.turns, pending: f.good,
        });
      }
      cooldown = DICE_COOLDOWN + 1;
    } else {
      // 勇者攻擊
      let d = dmg(h.atk + sum("hero", "atk"), Math.max(0, e.def + sum("enemy", "def")));
      if (charged) { d = d * charged; charged = false; }
      e.hp = e.hp - d;
      if (e.hp <= 0) { return { win: true, turn: turn }; }
    }

    // 不管攻擊還是擲骰,小怪都會反擊
    h.hp = h.hp - dmg(e.atk + sum("enemy", "atk"), Math.max(0, h.def + sum("hero", "def")));
    if (h.hp <= 0) { return { win: false, turn: turn }; }

    turn = turn + 1;
    tick();
  }
  return { win: false, turn: turn };
}

function runStrategy(label, useDice, times = 1000) {
  let wins = 0;
  let winTurns = 0;
  let minTurn = Infinity;

  for (let i = 0; i < times; i++) {
    const r = simulateBattle(useDice);
    if (r.win) {
      wins = wins + 1;
      winTurns = winTurns + r.turn;
      if (r.turn < minTurn) { minTurn = r.turn; }
    }
  }

  const rate = (wins / times * 100).toFixed(1);
  const avg = wins > 0 ? (winTurns / wins).toFixed(1) : "—";
  console.log(
    `${label}:勝率 ${rate}%(${wins}/${times})` +
    `,獲勝平均 ${avg} 回合,最快 ${minTurn === Infinity ? "—" : minTurn} 回合`
  );
}

function compareDice(times = 1000) {
  runStrategy("從不擲骰  ", false, times);
  runStrategy("一有機會就擲", true, times);
}

// ===== 啟動 =====
showRecord();
updateScreen();
startBtn.addEventListener("click", startGame);
attackBtn.addEventListener("click", attack);
diceBtn.addEventListener("click", rollDice);
resetBtn.addEventListener("click", reset);
