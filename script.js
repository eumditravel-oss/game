"use strict";

/**
 * 업데이트 내용
 * 1) 설정 끝나면 게임 화면만 보이게 전환 (setupView 숨김, gameView 표시)
 * 2) 게임 화면은 100vh 고정 + body 스크롤 잠금
 * 3) 펭귄이 우승 큐브로 이동해서 해머질 → 큐브 깨짐 → 결과 공개
 */

const els = {
  // views
  setupView: document.getElementById("setupView"),
  gameView: document.getElementById("gameView"),
  stage: document.getElementById("stage"),

  // setup controls
  countInput: document.getElementById("countInput"),
  applyBtn: document.getElementById("applyBtn"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  nameInputs: document.getElementById("nameInputs"),

  // game controls
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
function crackSequence() {
  beep({ freq: 520, dur: 0.05, type: "triangle", gain: 0.045, when: 0.00 });
  beep({ freq: 640, dur: 0.05, type: "triangle", gain: 0.045, when: 0.06 });
  beep({ freq: 480, dur: 0.06, type: "triangle", gain: 0.040, when: 0.12 });
}
function breakBoom() {
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

// ---------- View switching ----------
function showGameView() {
  els.setupView.hidden = true;
  els.gameView.hidden = false;
  lockBodyScroll(true);
  // 게임 시작할 때 결과 박스 숨김
  els.resultBox.hidden = true;
}
function showSetupView() {
  els.gameView.hidden = true;
  els.setupView.hidden = false;
  lockBodyScroll(false);
}

// ---------- Penguin positioning ----------
function movePenguinToCube(index, { immediate = false } = {}) {
  const cubes = Array.from(els.grid.querySelectorAll(".cube"));
  const target = cubes[index];
  if (!target) return;

  const r = target.getBoundingClientRect();
  // 큐브 상단 중앙에 펭귄 위치
  const x = r.left + r.width * 0.5 - 36; // penguin width/2
  const y = r.top + r.height * 0.15 - 36;

  // waddle 애니메이션 transform과 충돌 방지용: CSS 변수 사용
  els.penguin.style.setProperty("--px", `${x}px`);
  els.penguin.style.setProperty("--py", `${y}px`);

  if (immediate) {
    els.penguin.style.transition = "none";
    els.penguin.style.transform = `translate(${x}px, ${y}px)`;
    // 강제로 reflow 후 복구
    void els.penguin.offsetHeight;
    els.penguin.style.transition = "";
  } else {
    els.penguin.style.transform = `translate(${x}px, ${y}px)`;
  }
}

function penguinWalkStart() {
  els.penguin.classList.add("walking");
}
function penguinWalkStop() {
  els.penguin.classList.remove("walking");
}
function penguinHammerStart() {
  els.penguin.classList.add("hammering");
}
function penguinHammerStop() {
  els.penguin.classList.remove("hammering");
}

// ---------- Flow helpers ----------
function lockUISetup(locked) {
  els.applyBtn.disabled = locked;
  els.resetBtn.disabled = locked;
  els.countInput.disabled = locked;
  Array.from(els.nameInputs.querySelectorAll("input")).forEach((i) => (i.disabled = locked));
}

function resetStageVisual() {
  clearTimers();
  Array.from(els.grid.querySelectorAll(".cube")).forEach((cube) => {
    cube.classList.remove("cracking", "breaking", "frozen");
  });

  els.resultBox.hidden = true;
  els.resultText.textContent = "-";
  els.resultSub.textContent = "다시 뽑으려면 START";
  setStatus("대기 중…");

  // 펭귄 초기 위치(화면 바깥)
  penguinWalkStop();
  penguinHammerStop();
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

// ---------- Main draw ----------
function startDraw(names) {
  if (state.isRunning) return;
  state.isRunning = true;

  ensureAudio(); // 모바일 오디오 unlock
  resetStageVisual();

  const cubes = Array.from(els.grid.querySelectorAll(".cube"));

  // winner 확정(공정성)
  state.winnerIndex = Math.floor(Math.random() * names.length);

  setStatus("얼음이 갈라지고 있어요… ❄️");
  crackSequence();

  // 1) 큐브들 cracking 시작
  cubes.forEach((c, i) => {
    state.timers.push(setTimeout(() => c.classList.add("cracking"), 60 + i * 35));
  });

  // 2) 펭귄 등장 → 우승 큐브로 이동
  //   - 먼저 화면 왼쪽 아래쯤에서 시작해 걸어가는 느낌
  state.timers.push(setTimeout(() => {
    // 시작 위치(대충 화면 왼쪽 아래)
    const startX = 12;
    const startY = window.innerHeight - 120;
    els.penguin.style.setProperty("--px", `${startX}px`);
    els.penguin.style.setProperty("--py", `${startY}px`);
    els.penguin.style.transform = `translate(${startX}px, ${startY}px)`;
    penguinWalkStart();

    // 우승 큐브 위치로 이동
    state.timers.push(setTimeout(() => {
      movePenguinToCube(state.winnerIndex);
    }, 150));
  }, 500));

  // 3) 도착 후 해머질
  const HAMMER_AT = 2300;
  state.timers.push(setTimeout(() => {
    setStatus("펭귄이 얼음을 깨는 중… 🐧🔨");
    penguinWalkStop();
    penguinHammerStart();
    // 해머 사운드 느낌
    beep({ freq: 220, dur: 0.06, type: "square", gain: 0.025, when: 0.00 });
    beep({ freq: 240, dur: 0.06, type: "square", gain: 0.025, when: 0.18 });
    beep({ freq: 260, dur: 0.06, type: "square", gain: 0.025, when: 0.36 });
  }, HAMMER_AT));

  // 4) 깨짐(우승 큐브만 breaking)
  const BREAK_AT = 3500;
  state.timers.push(setTimeout(() => {
    setStatus("쨍—! 💥 결과 공개!");
    breakBoom();
    penguinHammerStop();

    cubes.forEach((c, i) => {
      c.classList.remove("cracking");
      if (i === state.winnerIndex) c.classList.add("breaking");
      else c.classList.add("frozen");
    });
  }, BREAK_AT));

  // 5) 결과 표시
  const SHOW_AT = 4200;
  state.timers.push(setTimeout(() => {
    const winName = names[state.winnerIndex];
    els.resultText.textContent = winName;
    els.resultBox.hidden = false;
    setStatus("완료 ✅");
    state.isRunning = false;
  }, SHOW_AT));
}

// ---------- Setup actions ----------
function applyCount() {
  if (state.isRunning) return;

  const n = clampInt(parseInt(els.countInput.value, 10) || state.count, 2, 12);
  state.count = n;

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

  // setup 버튼
  els.applyBtn.addEventListener("click", applyCount);
  els.resetBtn.addEventListener("click", resetAll);
  els.soundBtn.addEventListener("click", toggleSound);

  // setup START → 게임 화면으로 전환 + 보드 생성 + START 실행
  els.startBtn.addEventListener("click", () => {
    if (state.isRunning) return;

    // 먼저 보드 만들고 게임뷰로 전환
    const names = ensureGameBoardFromSetup();
    showGameView();

    // 펭귄 위치 계산을 위해 한 프레임 뒤 실행
    requestAnimationFrame(() => {
      startDraw(names);
    });
  });

  // 게임뷰 상단/하단 START
  els.floatingStart.addEventListener("click", () => {
    if (state.isRunning) return;
    // 현재 입력값으로 names 재생성 (설정 화면 값 유지 기준)
    const names = normalizeNames(state.names.length ? state.names : readInputs());
    buildCubes(names);
    requestAnimationFrame(() => startDraw(names));
  });

  // 결과 박스 버튼
  els.againBtn.addEventListener("click", () => {
    if (state.isRunning) return;
    const names = normalizeNames(state.names.length ? state.names : readInputs());
    buildCubes(names);
    requestAnimationFrame(() => startDraw(names));
  });

  els.editBtn.addEventListener("click", () => {
    // 설정 화면으로 돌아가 이름 수정
    showSetupView();
    state.isRunning = false;
    resetStageVisual();
    lockUISetup(false);
  });

  // 상단바: 설정으로
  els.backBtn.addEventListener("click", () => {
    showSetupView();
    state.isRunning = false;
    resetStageVisual();
    lockUISetup(false);
  });

  // 창 크기 바뀌면 펭귄 위치 재계산 (진행 중이면 winner 큐브로 따라가게)
  window.addEventListener("resize", () => {
    if (state.winnerIndex !== null && !els.gameView.hidden) {
      movePenguinToCube(state.winnerIndex, { immediate: true });
    }
  });
}

init();
