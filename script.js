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
};

let state = {
  names: [],
  cubes: [],
  hp: [],
  running: false,
  turn: 0,

  // ✅ 너무 빨리 끝나는 걸 방지하는 최소 턴 (원하면 숫자만 조절)
  minWinTurn: 10,

  // penguin tween
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

el.apply.addEventListener("click", buildNameInputs);
el.count.addEventListener("change", buildNameInputs);

el.start.addEventListener("click", () => startFromSetup());

el.back.addEventListener("click", () => {
  stopGame();
  el.game.hidden = true;
  el.setup.hidden = false;
  document.body.style.overflow = "";
});

el.restart.addEventListener("click", () => {
  if(state.running) return;
  startRound();
});

el.again.addEventListener("click", () => {
  el.result.hidden = true;
  if(state.running) return;
  startRound();
});

// ✅ 모바일 캐시/렌더 타이밍에서도 결과창이 먼저 안 뜨게 안전장치
document.addEventListener("DOMContentLoaded", () => {
  el.result.hidden = true;
});

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
    c.textContent = name;
    c.dataset.index = String(idx);
    el.grid.appendChild(c);
    state.cubes.push(c);
  });
}

function resetVisual(){
  state.cubes.forEach(c => c.classList.remove("target","crack1","crack2","crack3"));
  el.result.hidden = true;
  el.winner.textContent = "-";
  el.status.textContent = "대기 중…";
  setPenguinXY(12, window.innerHeight - 90, true);
}

function startRound(){
  buildCubes();
  resetVisual();

  state.turn = 0;
  state.running = true;

  el.result.hidden = true;
  el.status.textContent = "펭귄이 후보를 살펴보는 중… 🐧";

  setTimeout(loop, 700); // ✅ 첫 템포 조금 더 여유
}

function stopGame(){
  state.running = false;
  if(state.raf) cancelAnimationFrame(state.raf);
  state.raf = null;
}

// ---------- Penguin smooth move ----------
function setPenguinXY(x,y, snap=false){
  state.tx = x; state.ty = y;
  if(snap){
    state.px = x; state.py = y;
    el.penguin.style.transform = `translate(${x}px, ${y}px)`;
  }
  if(!state.raf) tweenPenguin();
}

function tweenPenguin(){
  const ease = 0.14;
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

function movePenguinToCube(idx){
  const cube = state.cubes[idx];
  if(!cube) return;
  const r = cube.getBoundingClientRect();
  const x = r.left + r.width/2 - 18;
  const y = r.top - 46;
  setPenguinXY(x,y);
}

// ---------- Game loop ----------
function loop(){
  if(!state.running) return;

  state.turn++;

  const idx = Math.floor(Math.random() * state.cubes.length);

  // ✅ 보너스 + 템포 조절:
  // - 1~3턴: 무조건 1
  // - 4~8턴: 거의 1 (10%만 2)
  // - 9턴 이후: 35%로 2 (복불복 본격)
  let hit = 1;
  if (state.turn <= 3) hit = 1;
  else if (state.turn <= 8) hit = (Math.random() < 0.10 ? 2 : 1);
  else hit = (Math.random() < 0.35 ? 2 : 1);

  state.hp[idx] += hit;

  // ✅ 너무 빨리 끝나는 걸 확실히 막기: 최소 턴 전엔 3 도달 금지
  if (state.turn < state.minWinTurn) {
    state.hp[idx] = Math.min(state.hp[idx], 2);
  }

  // 타겟 표시
  state.cubes.forEach(c => c.classList.remove("target"));
  const cube = state.cubes[idx];
  cube.classList.add("target");

  // 펭귄 이동
  movePenguinToCube(idx);

  // 시각 갱신
  updateCubeVisual(idx);

  // 긴장감 메시지 + hp=2면 잠깐 더 멈춤
  let nextDelay = 900; // ✅ 기본 템포(느리게)
  if (state.hp[idx] === 2) {
    el.status.textContent = "위험! 한 번만 더 깨지면 당첨… 😨";
    nextDelay = 1400; // ✅ 위험 상태일 때 더 길게 멈춤
  } else {
    el.status.textContent = "펭귄이 얼음을 시험 중… ❄️";
  }

  // 당첨 처리 (minWinTurn 이후부터만 가능)
  if(state.hp[idx] >= 3){
    state.running = false;
    el.status.textContent = "쨍—! 💥 당첨!";
    cube.classList.add("crack3");

    setTimeout(() => {
      el.winner.textContent = cube.textContent;
      el.result.hidden = false;
    }, 650);
    return;
  }

  setTimeout(loop, nextDelay);
}

function updateCubeVisual(idx){
  const cube = state.cubes[idx];
  cube.classList.remove("crack1","crack2","crack3");
  const h = clamp(state.hp[idx], 0, 3);
  if(h === 1) cube.classList.add("crack1");
  if(h === 2) cube.classList.add("crack2");
  if(h >= 3) cube.classList.add("crack3");
}

window.addEventListener("resize", () => {
  if(el.game.hidden) return;
  const target = state.cubes.find(c => c.classList.contains("target"));
  if(target){
    const idx = parseInt(target.dataset.index, 10);
    movePenguinToCube(idx);
  }
});
