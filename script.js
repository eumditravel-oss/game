"use strict";

/**
 * 포함된 기능
 * (1) 펭귄이 여러 큐브를 랜덤 순회하다가 마지막에 우승 큐브를 깸
 * (2) 균열 단계 연출(레벨 1~3): crack1 -> crack2 -> crack3 -> breaking
 * (3) 빙판 "미끄러짐" 이동 모션(transition/easing + sliding class)
 */

const els = {
  setupView: document.getElementById("setupView"),
  gameView: document.getElementById("gameView"),

  countInput: document.getElementById("countInput"),
  applyBtn: document.getElementById("applyBtn"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  nameInputs: document.getElementById("nameInputs"),

  backBtn: document.getElementById("backBtn"),
  floatingStart: document.getElementById("floatingStart"),
  againBtn: document.getElementById("againBtn"),
  editBtn: document.getElementById("editBtn"),

  grid: document.getElementById("grid"),
  statusText: document.getElementById("statusText"),
  resultBox: document.getElementById("resultBox"),
  resultText: document.getElementById("resultText"),
  resultSub: document.getElementById("resultSub"),

  soundBtn: document.getElementById("soundBtn"),
  penguin: document.getElementById("penguin"),
};

let state = {
  count: clampInt(parseInt(els.countInput.value, 10) || 6, 2, 12),
  names: [],
  isRunning: false,
  soundOn: true,
  winnerIndex: null,
  timers: [],
};

// ---------- Utils ----------
function clampInt(n, min, max) {
  n = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, n));
}
function clearTimers() {
  state.timers.forEach((t) => clearTimeout(t));
  state.timers = [];
}
function setStatus(msg) {
  els.statusText.textContent = msg;
}
function normalizeNames(rawNames) {
  return rawNames.map((v, i) => {
    const s = (v || "").trim();
    return s.length ? s : `선택지 ${i + 1}`;
  });
}
function lockBodyScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
  document.documentElement.style.overflow = lock ? "hidden" : "";
}
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// ---------- Audio (WebAudio) ----------
let audioCtx = null;
function ensureAudio() {
  if (!state.soundOn) return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}
function beep({ freq = 440, dur = 0.08, type = "sine", gain = 0.05, when = 0 }) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function sfxCrack(level = 1) {
  // 레벨이 올라갈수록 살짝 더 날카롭게
  const base = 520 + level * 60;
  beep({ freq: base, dur: 0.05, type: "triangle", gain: 0.040, when: 0.00 });
  beep({ freq: base + 120, dur: 0.05, type: "triangle", gain: 0.040, when: 0.06 });
  beep({ freq: base - 80, dur: 0.06, type: "triangle", gain: 0.036, when: 0.12 });
}
function sfxHammer() {
  beep({ freq: 220, dur: 0.05, type: "square", gain: 0.024, when: 0.00 });
}
function sfxBreakBoom() {
  beep({ freq: 140, dur: 0.12, type: "sine", gain: 0.08, when: 0.00 });
  beep({ freq: 920, dur: 0.06, type: "square", gain: 0.03, when: 0.02 });
  beep({ freq: 660, dur: 0.08, type: "triangle", gain: 0.035, when: 0.06 });
}

// ---------- UI Builders ----------
function buildInputs(count) {
  els.nameInputs.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 20;
    input.placeholder = `선택지 ${i + 1}`;
    input.value = state.names[i] ?? "";
    input.setAttribute("aria-label", `선택지 ${i + 1} 이름`);
    frag.appendChild(input);
  }
  els.nameInputs.appendChild(frag);
}
function readInputs() {
  return Array.from(els.nameInputs.querySelectorAll("input")).map((i) => i.value);
}
function buildCubes(names) {
  els.grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  names.forEach((name, idx) => {
    const cube = document.createElement("div");
    cube.className = "cube";
    cube.dataset.index = String(idx);

    const cracks = document.createElement("div");
    cracks.className = "cracks";

    const frost = document.createElement("div");
    frost.className = "frost";

    const label = document.createElement("div");
    label.className = "cubeName";
    label.textContent = name;

    const shards = document.createElement("div");
    shards.className = "shards";
    for (let s = 1; s <= 4; s++) {
      const sh = document.createElement("div");
      sh.className = `shard s${s}`;
      shards.appendChild(sh);
    }

    cube.appendChild(cracks);
    cube.appendChild(frost);
    cube.appendChild(label);
    cube.appendChild(shards);

    frag.appendChild(cube);
  });
  els.grid.appendChild(frag);
}

function getCubes() {
  return Array.from(els.grid.querySelectorAll(".cube"));
}

// ---------- View switching ----------
function showGameView() {
  els.setupView.hidden = true;
  els.gameView.hidden = false;
  lockBodyScroll(true);
  els.resultBox.hidden = true;
}
function showSetupView() {
  els.gameView.hidden = true;
  els.setupView.hidden = false;
  lockBodyScroll(false);
}

// ---------- Penguin positioning & motion ----------
function setPenguinXY(x, y) {
  els.penguin.style.setProperty("--px", `${x}px`);
  els.penguin.style.setProperty("--py", `${y}px`);
  els.penguin.style.transform = `translate(${x}px, ${y}px)`;
}
function movePenguinToCube(index) {
  const cubes = getCubes();
  const target = cubes[index];
  if (!target) return;

  const r = target.getBoundingClientRect();
  const x = r.left + r.width * 0.5 - 36;
  const y = r.top + r.height * 0.15 - 36;

  // sliding 느낌
  els.penguin.classList.add("sliding");
  setPenguinXY(x, y);
}
function penguinWalkStart() {
  els.penguin.classList.add("walking");
}
function penguinWalkStop() {
  els.penguin.classList.remove("walking");
}
function penguinSlideStop() {
  els.penguin.classList.remove("sliding");
}
function penguinHammerStart() {
  els.penguin.classList.add("hammering");
}
function penguinHammerStop() {
  els.penguin.classList.remove("hammering");
}

// ---------- Stage helpers ----------
function resetStageVisual() {
  clearTimers();
  getCubes().forEach((cube) => {
    cube.classList.remove("crack1","crack2","crack3","breaking","frozen","shake","target");
  });

  els.resultBox.hidden = true;
  els.resultText.textContent = "-";
  els.resultSub.textContent = "다시 뽑으려면 START";
  setStatus("대기 중…");

  penguinWalkStop();
  penguinHammerStop();
  penguinSlideStop();
  els.penguin.style.transform = "translate(-9999px, -9999px)";
}

function ensureGameBoardFromSetup() {
  const raw = readInputs();
  const names = normalizeNames(raw);
  state.names = raw; // 입력값 유지
  buildCubes(names);
  resetStageVisual();
  return names;
}

function pickTourIndices(count, winnerIndex) {
  // (1) 랜덤 순회: winner를 제외한 후보에서 몇 개를 랜덤 방문 후 마지막에 winner
  const all = Array.from({ length: count }, (_, i) => i).filter(i => i !== winnerIndex);

  // 방문 개수: 2~min(5, count-1)
  const k = clampInt(2 + Math.floor(Math.random() * 4), 2, Math.max(2, Math.min(5, all.length)));

  // 셔플
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  const tour = all.slice(0, k);
  tour.push(winnerIndex); // 마지막은 winner
  return tour;
}

// ---------- Main draw (async) ----------
async function startDraw(names) {
  if (state.isRunning) return;
  state.isRunning = true;
  ensureAudio();

  resetStageVisual();

  // winner 확정
  state.winnerIndex = Math.floor(Math.random() * names.length);

  const cubes = getCubes();
  const tour = pickTourIndices(names.length, state.winnerIndex);

  setStatus("펭귄이 후보를 살펴보는 중… 🐧");
  // 펭귄 시작 위치(왼쪽 아래)
  setPenguinXY(12, window.innerHeight - 120);
  penguinWalkStart();
  await sleep(180);

  // (1) 랜덤 순회: 각 큐브에 잠깐 들러서 crack1만 주고 지나감
  for (let t = 0; t < tour.length - 1; t++) {
    const idx = tour[t];

    cubes.forEach(c => c.classList.remove("target"));
    cubes[idx]?.classList.add("target");

    movePenguinToCube(idx);
    sfxCrack(1);

    // 후보 큐브 균열 1단계
    cubes[idx]?.classList.add("crack1");

    // 살짝 기다림(이동+확인)
    await sleep(720);
  }

  // 마지막: winner
  const win = state.winnerIndex;
  cubes.forEach(c => c.classList.remove("target"));
  cubes[win]?.classList.add("target");

  setStatus("여기가 맞다… 얼음을 깨자! ❄️🔨");
  movePenguinToCube(win);
  await sleep(850);

  // (2) 균열 단계 1→2→3 (펭귄 해머질과 연동)
  penguinWalkStop();
  penguinHammerStart();
  cubes[win]?.classList.add("shake");

  // crack1
  cubes[win]?.classList.add("crack1");
  sfxHammer(); sfxCrack(1);
  await sleep(420);

  // crack2
  cubes[win]?.classList.remove("crack1");
  cubes[win]?.classList.add("crack2");
  sfxHammer(); sfxCrack(2);
  await sleep(420);

  // crack3
  cubes[win]?.classList.remove("crack2");
  cubes[win]?.classList.add("crack3");
  sfxHammer(); sfxCrack(3);
  await sleep(520);

  // (3) 최종 깨짐
  setStatus("쨍—! 💥 결과 공개!");
  penguinHammerStop();
  cubes[win]?.classList.remove("shake","crack3");
  cubes[win]?.classList.add("breaking");
  sfxBreakBoom();

  // 나머지 frozen
  cubes.forEach((c, i) => {
    if (i !== win) c.classList.add("frozen");
  });

  await sleep(520);

  // 결과 표시
  els.resultText.textContent = names[win];
  els.resultBox.hidden = false;
  setStatus("완료 ✅");
  state.isRunning = false;

  // 슬라이딩 상태 정리(약간의 여운 후)
  await sleep(400);
  penguinSlideStop();
}

// ---------- Setup actions ----------
function applyCount() {
  if (state.isRunning) return;
  state.count = clampInt(parseInt(els.countInput.value, 10) || state.count, 2, 12);

  const current = readInputs();
  state.names = current;

  buildInputs(state.count);
}
function resetAll() {
  if (state.isRunning) return;
  clearTimers();
  state.count = clampInt(parseInt(els.countInput.value, 10) || 6, 2, 12);
  state.names = Array(state.count).fill("");
  buildInputs(state.count);
}

// ---------- Sound toggle ----------
function toggleSound() {
  state.soundOn = !state.soundOn;
  els.soundBtn.classList.toggle("off", !state.soundOn);
  els.soundBtn.setAttribute("aria-pressed", state.soundOn ? "true" : "false");
  els.soundBtn.textContent = state.soundOn ? "🔊 Sound" : "🔇 Sound";
  if (audioCtx && !state.soundOn) {
    try { audioCtx.suspend(); } catch (_) {}
  } else if (audioCtx && state.soundOn) {
    try { audioCtx.resume(); } catch (_) {}
  }
}

// ---------- Init ----------
function init() {
  buildInputs(state.count);

  els.applyBtn.addEventListener("click", applyCount);
  els.resetBtn.addEventListener("click", resetAll);
  els.soundBtn.addEventListener("click", toggleSound);

  // setup START
  els.startBtn.addEventListener("click", () => {
    if (state.isRunning) return;
    const names = ensureGameBoardFromSetup();
    showGameView();
    requestAnimationFrame(() => startDraw(names));
  });

  // 게임뷰 START/Again
  els.floatingStart.addEventListener("click", () => {
    if (state.isRunning) return;
    const names = normalizeNames(state.names.length ? state.names : readInputs());
    buildCubes(names);
    requestAnimationFrame(() => startDraw(names));
  });
  els.againBtn.addEventListener("click", () => {
    if (state.isRunning) return;
    const names = normalizeNames(state.names.length ? state.names : readInputs());
    buildCubes(names);
    requestAnimationFrame(() => startDraw(names));
  });

  // 이름 수정
  els.editBtn.addEventListener("click", () => {
    showSetupView();
    state.isRunning = false;
    resetStageVisual();
  });

  // 설정으로
  els.backBtn.addEventListener("click", () => {
    showSetupView();
    state.isRunning = false;
    resetStageVisual();
  });

  // 리사이즈 시 현재 위치 보정
  window.addEventListener("resize", () => {
    if (!els.gameView.hidden && state.winnerIndex !== null) {
      movePenguinToCube(state.winnerIndex);
    }
  });
}

init();
