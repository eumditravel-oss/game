const el = {
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

  // 템포(원하면 숫자만 조절)
  minWinTurn: 12,     // 최소 몇 턴 후에만 당첨 가능
  baseDelay: 980,     // 기본 템포
  dangerDelay: 1500,  // hp=2 위험일 때 멈춤

  // 펭귄 위치 tween
  raf: null,
  px: -9999, py: -9999,
  tx: -9999, ty: -9999,
};

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

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

  // 시작 위치(좌하단쯤)
  setPenguinXY(12, window.innerHeight - 110, true);
}

function startRound(){
  buildCubes();
  resetVisual();

  state.turn = 0;
  state.running = true;

  el.result.hidden = true;
  el.status.textContent = "펭귄이 얼음을 살펴보는 중… 🐧";

  setTimeout(loop, 800);
}

function stopGame(){
  state.running = false;
  if(state.raf) cancelAnimationFrame(state.raf);
  state.raf = null;
}

/* Penguin tween */
function setPenguinXY(x,y, snap=false){
  state.tx = x; state.ty = y;
  if(snap){
    state.px = x; state.py = y;
    el.penguin.style.transform = `translate(${x}px, ${y}px)`;
  }
  if(!state.raf) tweenPenguin();
}

function tweenPenguin(){
  const ease = 0.16;
  const step = () => {
    const dx = state.tx - state.px;
    const dy = state.ty - state.py;
    state.px += dx * ease;
    state.py += dy * ease;
    el.penguin.style.transform = `translate(${state.px}px, ${state.py}px)`;

    if(Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6){
      state.px = state.tx; state.py = state.ty;
      el.penguin.style.transform = `translate(${state.px}px, ${state.py}px)`;
      state.raf = null;
      return;
    }
    state.raf = requestAnimationFrame(step);
  };
  state.raf = requestAnimationFrame(step);
}

function smashPenguin(){
  el.penguin.classList.remove("smash");
  // reflow
  void el.penguin.offsetWidth;
  el.penguin.classList.add("smash");
  setTimeout(()=> el.penguin.classList.remove("smash"), 520);
}

function movePenguinToCube(idx){
  const cube = state.cubes[idx];
  if(!cube) return;
  const r = cube.getBoundingClientRect();
  const x = r.left + r.width/2 - 18;
  const y = r.top - 58;
  setPenguinXY(x,y);
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

function loop(){
  if(!state.running) return;

  state.turn++;

  const idx = Math.floor(Math.random() * state.cubes.length);

  // ✅ 복불복 템포: 초반은 안정, 중반부터 2연속(=2) 확률 증가
  let hit = 1;
  if (state.turn <= 4) hit = 1;
  else if (state.turn <= 10) hit = (Math.random() < 0.12 ? 2 : 1);
  else hit = (Math.random() < 0.35 ? 2 : 1);

  state.hp[idx] += hit;

  // ✅ 너무 빨리 끝나는 걸 방지: 최소 턴 전엔 3 도달 금지
  if (state.turn < state.minWinTurn) {
    state.hp[idx] = Math.min(state.hp[idx], 2);
  }

  // 펭귄 이동 + 망치 모션
  movePenguinToCube(idx);
  smashPenguin();

  // 게이지/크랙 업데이트
  updateGauge(idx);
  updateCrackClass(idx);

  // 메시지/딜레이
  const h = state.hp[idx];
  let nextDelay = state.baseDelay;

  if(h === 2){
    el.status.textContent = "위험! 한 번만 더 깨지면 당첨… 😨";
    nextDelay = state.dangerDelay;
  } else {
    el.status.textContent = "펭귄이 얼음을 콕콕… ❄️";
  }

  // 당첨
  if(h >= 3){
    state.running = false;
    el.status.textContent = "쨍—! 💥 당첨!";

    setTimeout(() => {
      el.winner.textContent = state.names[idx];
      el.result.hidden = false;
    }, 650);
    return;
  }

  setTimeout(loop, nextDelay);
}

window.addEventListener("resize", () => {
  if(el.game.hidden) return;
  // 화면이 바뀌면 펭귄이 화면 밖으로 나가지 않게만 보정
  setPenguinXY(state.px, state.py, true);
});