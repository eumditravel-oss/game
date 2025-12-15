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
  minWinTurn: 10,
};

function buildInputs(){
  const n = Math.max(2, Math.min(12, +el.count.value || 6));
  el.names.innerHTML = "";
  for(let i=0;i<n;i++){
    const input = document.createElement("input");
    input.placeholder = `선택지 ${i+1}`;
    el.names.appendChild(input);
  }
}
buildInputs();

el.apply.onclick = buildInputs;

el.start.onclick = () => {
  const inputs = [...el.names.querySelectorAll("input")];
  state.names = inputs.map((i,idx)=>i.value.trim()||`선택지 ${idx+1}`);
  el.setup.hidden = true;
  el.game.hidden = false;
  startRound();
};

el.back.onclick = el.toSetup.onclick = () => {
  state.running = false;
  el.result.hidden = true;
  el.game.hidden = true;
  el.setup.hidden = false;
};

el.restart.onclick = el.again.onclick = () => {
  el.result.hidden = true;
  startRound();
};

function startRound(){
  el.grid.innerHTML = "";
  state.hp = state.names.map(()=>0);
  state.turn = 0;
  state.running = true;
  el.status.textContent = "펭귄이 얼음을 살펴보는 중… 🐧";

  state.names.forEach((name,idx)=>{
    const d = document.createElement("div");
    d.className = "cube";
    d.textContent = name;
    d.dataset.idx = idx;
    el.grid.appendChild(d);
  });
  state.cubes = [...el.grid.children];

  setTimeout(loop, 800);
}

function loop(){
  if(!state.running) return;

  state.turn++;
  const idx = Math.floor(Math.random()*state.cubes.length);
  const cube = state.cubes[idx];

  let hit = 1;
  if(state.turn > 8 && Math.random()<0.35) hit = 2;
  state.hp[idx] += hit;

  if(state.turn < state.minWinTurn){
    state.hp[idx] = Math.min(state.hp[idx],2);
  }

  cube.classList.remove("crack1","crack2","crack3");
  if(state.hp[idx]===1) cube.classList.add("crack1");
  if(state.hp[idx]===2) cube.classList.add("crack2");

  if(state.hp[idx]>=3){
    cube.classList.add("crack3");
    state.running = false;
    el.status.textContent = "쨍! 당첨 💥";
    setTimeout(()=>{
      el.winner.textContent = cube.textContent;
      el.result.hidden = false;
    },600);
    return;
  }

  el.status.textContent = state.hp[idx]===2
    ? "위험… 한 번만 더 깨지면 끝 😨"
    : "펭귄이 얼음을 살짝 두드립니다…";

  setTimeout(loop, state.hp[idx]===2 ? 1400 : 1000);
}