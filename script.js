.const el = {
  setup: document.getElementById("setup"),
  game: document.getElementById("game"),
  count: document.getElementById("count"),
  names: document.getElementById("names"),
  apply: document.getElementById("apply"),
  start: document.getElementById("start"),
  back: document.getElementById("back"),
  restart: document.getElementById("restart"),
  grid: document.getElementById("grid"),
  penguin: document.getElementById("penguin"),
  status: document.getElementById("status"),
  result: document.getElementById("result"),
  winner: document.getElementById("winner"),
  again: document.getElementById("again"),
  toSetup: document.getElementById("toSetup"),
};

let state = {
  names: [],
  cubes: [],
  hp: [],
  running: false,
  turn: 0,

  // 템포
  minWinTurn: 12,
  baseDelay: 980,
  dangerDelay: 1500,

  // penguin tween
  raf: null,
  px: -9999, py: -9999,
  tx: -9999, ty: -9999,

  // 도착 동기화
  arriveResolve: null,
  arriveThreshold: 1.2,
};

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function buildNameInputs(){
  const n = clamp(parseInt(el.count.value || "6", 10), 2, 12);
  el.count.value = String(n);
  el.names.innerHTML = "";
  for(let i=0;i<n;i++){
    const input = document.createElement("input");
    input.placeholder = `선택지 ${i+1}`;
    el.names.appendChild(input);
  }
}
buildNameInputs();

document.addEventListener("DOMContentLoaded", () => {
  el.result.hidden = true;
});

el.apply.addEventListener("click", buildNameInputs);
el.count.addEventListener("change", buildNameInputs);

el.start.addEventListener("click", () => startFromSetup());
el.back.addEventListener("click", () => goSetup());
el.toSetup.addEventListener("click", () => goSetup());

el.restart.addEventListener("click", () => { if(!state.running) startRound(); });
el.again.addEventListener("click", () => { el.result.hidden = true; if(!state.running) startRound(); });

function goSetup(){
  stopGame();
  el.result.hidden = true;
  el.game.hidden = true;
  el.setup.hidden = false;
  document.body.style.overflow = "";
}

function startFromSetup(){
  const raw = [...el.names.querySelectorAll("input")].map(i => i.value.trim());
  state.names = raw.map((v, idx) => v.length ? v : `선택지 ${idx+1}`);

  el.setup.hidden = true;
  el.game.hidden = false;
  document.body.style.overflow = "hidden";

  startRound();
}

function buildCubes(){
  el.grid.innerHTML = "";
  state.cubes = [];
  state.hp = new Array(state.names.length).fill(0);

  state.names.forEach((name, idx) => {
    const c = document.createElement("div");
    c.className = "cube";
    c.dataset.index = String(idx);

    const cracks = document.createElement("div");
    cracks.className = "cracks";

    const label = document.createElement("div");
    label.className = "labelText";
    label.textContent = name;

    const gauge = document.createElement("div");
    gauge.className = "gauge";

    const fill = document.createElement("div");
    fill.className = "gaugeFill";
    fill.style.width = "0%";
    gauge.appendChild(fill);

    const gtext = document.createElement("div");
    gtext.className = "gaugeText";
    gtext.textContent = "위험도 0/3";

    c.appendChild(cracks);
    c.appendChild(label);
    c.appendChild(gauge);
    c.appendChild(gtext);

    el.grid.appendChild(c);
    state.cubes.push(c);
  });
}

function resetVisual(){
  state.cubes.forEach(c => c.classList.remove("crack1","crack2","crack3"));
  el.result.hidden = true;
  el.winner.textContent = "-";
  el.status.textContent = "대기 중…";

  // iOS 안정: 시작 시 무조건 한 번 스냅
  setPenguinXY(14, window.innerHeight - 150, true);
}

function startRound(){
  buildCubes();
  resetVisual();

  state.turn = 0;
  state.running = true;

  el.result.hidden = true;
  el.status.textContent = "펭귄이 얼음을 살펴보는 중… 🐧";

  runLoop();
}

function stopGame(){
  state.running = false;
  if(state.raf) cancelAnimationFrame(state.raf);
  state.raf = null;

  if(state.arriveResolve){
    state.arriveResolve();
    state.arriveResolve = null;
  }
}

/* Penguin tween */
function setPenguinXY(x, y, snap=false){
  state.tx = x; state.ty = y;

  el.penguin.style.visibility = "visible";
  el.penguin.style.opacity = "1";
  el.penguin.style.display = "block";

  if(snap){
    state.px = x; state.py = y;
    el.penguin.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  if(!state.raf) tweenPenguin();
}

function tweenPenguin(){
  const ease = 0.18;
  const step = () => {
    const dx = state.tx - state.px;
    const dy = state.ty - state.py;

    state.px += dx * ease;
    state.py += dy * ease;

    el.penguin.style.transform = `translate3d(${state.px}px, ${state.py}px, 0)`;

    if(Math.abs(dx) < state.arriveThreshold && Math.abs(dy) < state.arriveThreshold){
      state.px = state.tx; state.py = state.ty;
      el.penguin.style.transform = `translate3d(${state.px}px, ${state.py}px, 0)`;

      if(state.arriveResolve){
        const r = state.arriveResolve;
        state.arriveResolve = null;
        r();
      }
      state.raf = null;
      return;
    }

    state.raf = requestAnimationFrame(step);
  };

  state.raf = requestAnimationFrame(step);
}

function smashPenguin(){
  el.penguin.classList.remove("smash");
  void el.penguin.offsetWidth;
  el.penguin.classList.add("smash");
  setTimeout(()=> el.penguin.classList.remove("smash"), 520);
}

/* ✅ 타일 중앙 정렬 버전 */
function movePenguinToCube(idx){
  const cube = state.cubes[idx];
  if(!cube) return Promise.resolve();

  const r = cube.getBoundingClientRect();

  // 펭귄(몸+망치) 크기 대략치로 중앙 보정
  const penguinW = 48;
  const penguinH = 52;

  const x = r.left + (r.width - penguinW) / 2;
  const y = r.top + (r.height - penguinH) / 2;

  setPenguinXY(x, y);

  return new Promise((resolve) => {
    if(state.arriveResolve){
      state.arriveResolve();
      state.arriveResolve = null;
    }
    state.arriveResolve = resolve;
  });
}

function updateGauge(idx){
  const cube = state.cubes[idx];
  const h = clamp(state.hp[idx], 0, 3);
  const pct = (h/3)*100;
  cube.querySelector(".gaugeFill").style.width = `${pct}%`;
  cube.querySelector(".gaugeText").textContent = `위험도 ${h}/3`;
}

function updateCrackClass(idx){
  const cube = state.cubes[idx];
  cube.classList.remove("crack1","crack2","crack3");
  const h = clamp(state.hp[idx], 0, 3);
  if(h === 1) cube.classList.add("crack1");
  if(h === 2) cube.classList.add("crack2");
  if(h >= 3) cube.classList.add("crack3");
}

async function runLoop(){
  await sleep(850);

  while(state.running){
    state.turn++;

    const idx = Math.floor(Math.random() * state.cubes.length);

    let hit = 1;
    if (state.turn <= 4) hit = 1;
    else if (state.turn <= 10) hit = (Math.random() < 0.12 ? 2 : 1);
    else hit = (Math.random() < 0.35 ? 2 : 1);

    state.hp[idx] += hit;

    if (state.turn < state.minWinTurn) {
      state.hp[idx] = Math.min(state.hp[idx], 2);
    }

    const previewH = clamp(state.hp[idx], 0, 3);
    el.status.textContent = (previewH === 2)
      ? "위험! 한 번만 더 깨지면 당첨… 😨"
      : "펭귄이 얼음을 고르고 있어요… ❄️";

    await movePenguinToCube(idx);
    if(!state.running) break;

    smashPenguin();
    updateGauge(idx);
    updateCrackClass(idx);

    const h = clamp(state.hp[idx], 0, 3);

    if(h >= 3){
      state.running = false;
      el.status.textContent = "쨍—! 💥 당첨!";
      await sleep(650);
      el.winner.textContent = state.names[idx];
      el.result.hidden = false;
      break;
    }

    const nextDelay = (h === 2) ? state.dangerDelay : state.baseDelay;
    await sleep(nextDelay);
  }
}

window.addEventListener("resize", () => {
  if(el.game.hidden) return;
  setPenguinXY(state.px, state.py, true);
});