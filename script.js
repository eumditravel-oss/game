"use strict";

/**
 * Ice Cube Crash
 * - 선택지 입력 -> START -> 모든 큐브 균열(연출) -> 하나만 깨짐(당첨) -> 결과 표시
 * - 공정성: winnerIndex는 START 누르는 순간 확정. 이후는 연출 타이밍만 진행.
 * - 효과음: Web Audio (모바일 자동재생 제한 대응: 사용자 제스처(START) 후 재생 가능)
 */

const els = {
  countInput: document.getElementById("countInput"),
  applyBtn: document.getElementById("applyBtn"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  nameInputs: document.getElementById("nameInputs"),
  grid: document.getElementById("grid"),
  statusText: document.getElementById("statusText"),
  resultBox: document.getElementById("resultBox"),
  resultText: document.getElementById("resultText"),
  resultSub: document.getElementById("resultSub"),
  soundBtn: document.getElementById("soundBtn"),
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
  const out = rawNames.map((v, i) => {
    const s = (v || "").trim();
    return s.length ? s : `선택지 ${i + 1}`;
  });
  return out;
}

// ---------- Audio (WebAudio) ----------
let audioCtx = null;
function ensureAudio() {
  if (!state.soundOn) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
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
  // 균열 느낌: 짧은 톤 여러 번
  beep({ freq: 520, dur: 0.05, type: "triangle", gain: 0.045, when: 0.00 });
  beep({ freq: 640, dur: 0.05, type: "triangle", gain: 0.045, when: 0.06 });
  beep({ freq: 480, dur: 0.06, type: "triangle", gain: 0.040, when: 0.12 });
}

function breakBoom() {
  // 깨짐: 저음 + 고음 스냅
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
  const inputs = Array.from(els.nameInputs.querySelectorAll("input"));
  return inputs.map((i) => i.value);
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
    // 4개 파편
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

// ---------- Flow ----------
function lockUI(locked) {
  els.applyBtn.disabled = locked;
  els.resetBtn.disabled = locked;
  els.countInput.disabled = locked;
  Array.from(els.nameInputs.querySelectorAll("input")).forEach((i) => (i.disabled = locked));
  state.isRunning = locked;
}

function resetStageVisual() {
  Array.from(els.grid.querySelectorAll(".cube")).forEach((cube) => {
    cube.classList.remove("cracking", "breaking", "frozen");
  });
  els.resultBox.hidden = true;
  els.resultText.textContent = "-";
  els.resultSub.textContent = "다시 뽑으려면 START";
  setStatus("대기 중…");
}

function startDraw() {
  if (state.isRunning) return;

  // 오디오 컨텍스트 준비(모바일: 사용자 제스처에서 생성/Resume)
  ensureAudio();

  clearTimers();
  resetStageVisual();

  // 이름 확정
  const raw = readInputs();
  const names = normalizeNames(raw);
  state.names = raw; // 입력값은 유지
  buildCubes(names);

  // winnerIndex 확정 (공정성: 여기서 결정)
  state.winnerIndex = Math.floor(Math.random() * names.length);

  lockUI(true);
  setStatus("균열 생성 중… ❄️");

  const cubes = Array.from(els.grid.querySelectorAll(".cube"));

  // 1) 모두 cracking 시작
  cubes.forEach((c, i) => {
    const t = setTimeout(() => c.classList.add("cracking"), 60 + i * 35);
    state.timers.push(t);
  });
  crackSequence();

  // 2) 약 3.8초 후: winner만 breaking, 나머지는 frozen
  const BREAK_AT = 3900; // ms
  state.timers.push(
    setTimeout(() => {
      setStatus("하나가 깨집니다… 💥");
      breakBoom();

      cubes.forEach((c, i) => {
        c.classList.remove("cracking");
        if (i === state.winnerIndex) c.classList.add("breaking");
        else c.classList.add("frozen");
      });
    }, BREAK_AT)
  );

  // 3) 결과 표시 (약 4.6초)
  const SHOW_AT = 4600;
  state.timers.push(
    setTimeout(() => {
      const winName = names[state.winnerIndex];
      els.resultText.textContent = winName;
      els.resultBox.hidden = false;
      setStatus("결과 공개 완료 ✅");
      lockUI(false);
    }, SHOW_AT)
  );
}

function applyCount() {
  if (state.isRunning) return;

  const n = clampInt(parseInt(els.countInput.value, 10) || state.count, 2, 12);
  state.count = n;

  // 기존 입력값을 보존
  const current = readInputs();
  state.names = current;

  buildInputs(state.count);

  // stage도 미리 반영
  const names = normalizeNames(readInputs());
  buildCubes(names);
  resetStageVisual();
}

function resetAll() {
  if (state.isRunning) return;

  clearTimers();
  state.count = clampInt(parseInt(els.countInput.value, 10) || 6, 2, 12);
  state.names = Array(state.count).fill("");
  buildInputs(state.count);

  const names = normalizeNames(readInputs());
  buildCubes(names);
  resetStageVisual();
}

// ---------- Sound Toggle ----------
function toggleSound() {
  state.soundOn = !state.soundOn;
  els.soundBtn.classList.toggle("off", !state.soundOn);
  els.soundBtn.setAttribute("aria-pressed", state.soundOn ? "true" : "false");
  els.soundBtn.textContent = state.soundOn ? "🔊 Sound" : "🔇 Sound";
  // 끄면 컨텍스트는 유지해도 됨 (필요시 suspend)
  if (audioCtx && !state.soundOn) {
    try { audioCtx.suspend(); } catch (_) {}
  }
}

// ---------- Init ----------
function init() {
  // 초기 입력 생성
  buildInputs(state.count);

  // 초기 큐브 표시
  const names = normalizeNames(readInputs());
  buildCubes(names);
  resetStageVisual();

  els.applyBtn.addEventListener("click", applyCount);
  els.startBtn.addEventListener("click", startDraw);
  els.resetBtn.addEventListener("click", resetAll);
  els.soundBtn.addEventListener("click", toggleSound);

  // Enter 키로 START
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !state.isRunning) startDraw();
  });
}

init();
