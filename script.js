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

  // ✅ 버그 방지용 턴 카운터(보너스 로직에 필요)
  turn: 0,

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

  // ✅ 시작 즉시 결과창 방지 & 보너스 로직 기반
  state.turn = 0;
  state.running = true;

  el.result.hidden = true;
  el.status.textContent = "펭귄이 후보를 살펴보는 중… 🐧";

  // ✅ 바로 loop 실행하지 말고 짧게 텀(시각적으로도 안정)
  setTimeout(loop, 600);
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

// ---------- Game loop (복불복 누적 3단계 + 보너스) ----------
function loop(){
  if(!state.running) return;

  state.turn++;

  const idx = Math.floor(Math.random() * state.cubes.length);

  // ✅ 보너스: 초반(1~2턴)은 무조건 1만 깸 → 연출 안정 + 긴장감 빌드업
  // 이후부터 35% 확률로 2연속(=2 데미지) 가능
  const hit = state.turn < 3 ? 1 : (Math.random() < 0.35 ? 2 : 1);

  state.hp[idx] += hit;

  // ✅ 초반 보호: turn<3에서는 절대 3에 도달하지 못하게 (혹시 모를 예외 방지)
  if (state.turn < 3) state.hp[idx] = Math.min(state.hp[idx], 2);

  // 타겟 표시
  state.cubes.forEach(c => c.classList.remove("target"));
  const cube = state.cubes[idx];
  cube.classList.add("target");

  // 펭귄 이동
  movePenguinToCube(idx);

  // 시각 갱신
  updateCubeVisual(idx);

  // 상태 메시지(긴장감)
  if (state.hp[idx] === 2) el.status.textContent = "위험! 한 번만 더 깨지면 당첨… 😨";
  else el.status.textContent = "펭귄이 얼음을 시험 중… ❄️";

  // 당첨 처리
  if(state.hp[idx] >= 3){
    state.running = false;
    el.status.textContent = "쨍—! 💥 당첨!";
    cube.classList.add("crack3");
    setTimeout(() => {
      el.winner.textContent = cube.textContent;
      el.result.hidden = false;
    }, 550);
    return;
  }

  setTimeout(loop, 780);
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
