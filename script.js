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

el.start.addEventListener("click", () => {
  startFromSetup();
});

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
  // 입력값 수집
  const raw = [...el.names.querySelectorAll("input")].map(i => i.value.trim());
  state.names = raw.map((v, idx) => v.length ? v : `선택지 ${idx+1}`);

  el.setup.hidden = true;
  el.game.hidden = false;
  document.body.style.overflow = "hidden"; // 게임 중 스크롤 방지

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
  state.cubes.forEach(c => {
    c.classList.remove("target","crack1","crack2","crack3");
  });
  el.result.hidden = true;
  el.winner.textContent = "-";
  el.status.textContent = "대기 중…";
  // 펭귄 시작 위치(왼쪽 아래)
  setPenguinXY(12, window.innerHeight - 90, true);
}

function startRound(){
  buildCubes();
  resetVisual();
  el.status.textContent = "펭귄이 후보를 살펴보는 중… 🐧";
  state.running = true;
  loop();
}

function stopGame(){
  state.running = false;
  if(state.raf) cancelAnimationFrame(state.raf);
  state.raf = null;
}

// ---------- Penguin smooth move (lerp) ----------
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

// ---------- Game loop (복불복 누적 3단계) ----------
function loop(){
  if(!state.running) return;

  // 랜덤 타일 선택
  const idx = Math.floor(Math.random() * state.cubes.length);

  // 복불복 핵심: 35% 확률로 2단계 파손(=연속처럼 보임)
  const hit = Math.random() < 0.35 ? 2 : 1;
  state.hp[idx] += hit;

  // 타겟 표시 갱신
  state.cubes.forEach(c => c.classList.remove("target"));
  const cube = state.cubes[idx];
  cube.classList.add("target");

  // 펭귄 이동
  movePenguinToCube(idx);

  // 단계별 시각 갱신 (누적 표시 유지)
  updateCubeVisual(idx);

  // “한 번 더 깨지면 끝” 긴장감 문구
  const h = state.hp[idx];
  if(h === 2) el.status.textContent = "위험! 한 번만 더 깨지면 당첨… 😨";
  else el.status.textContent = "펭귄이 얼음을 시험 중… ❄️";

  // 당첨(3 이상) 처리
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

  // 다음 턴
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

// 리사이즈 시 펭귄 위치 안정화
window.addEventListener("resize", () => {
  if(el.game.hidden) return;
  // 현재 타겟이 있으면 그쪽으로 재정렬
  const target = state.cubes.find(c => c.classList.contains("target"));
  if(target){
    const idx = parseInt(target.dataset.index, 10);
    movePenguinToCube(idx);
  }
});
