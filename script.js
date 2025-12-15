const countEl = document.getElementById("count");
const namesEl = document.getElementById("names");
const startBtn = document.getElementById("start");
const setup = document.getElementById("setup");
const game = document.getElementById("game");
const grid = document.getElementById("grid");
const penguin = document.getElementById("penguin");
const result = document.getElementById("result");
const winnerText = document.getElementById("winner");

let cubes = [];
let damage = [];

function buildInputs(){
  namesEl.innerHTML="";
  for(let i=0;i<countEl.value;i++){
    const input=document.createElement("input");
    input.placeholder=`선택지 ${i+1}`;
    namesEl.appendChild(input);
  }
}
buildInputs();
countEl.onchange = buildInputs;

startBtn.onclick = ()=>{
  setup.hidden = true;
  game.hidden = false;
  startGame();
};

function startGame(){
  const names = [...namesEl.children].map((i,idx)=>i.value||`선택지 ${idx+1}`);
  grid.innerHTML="";
  cubes=[];
  damage = Array(names.length).fill(0);

  names.forEach(name=>{
    const c=document.createElement("div");
    c.className="cube";
    c.textContent=name;
    grid.appendChild(c);
    cubes.push(c);
  });

  gameLoop();
}

function gameLoop(){
  const idx = Math.floor(Math.random()*cubes.length);

  // 🔥 복불복 핵심: 35% 확률로 2단계 파괴
  const hit = Math.random() < 0.35 ? 2 : 1;
  damage[idx] += hit;

  // 펭귄 이동
  const r = cubes[idx].getBoundingClientRect();
  penguin.style.transform =
    `translate(${r.left + r.width/2 - 18}px, ${r.top - 40}px)`;

  // 상태 업데이트
  cubes[idx].classList.remove("crack1","crack2","crack3");

  if(damage[idx] >= 3){
    cubes[idx].classList.add("crack3");
    setTimeout(()=>{
      winnerText.textContent = cubes[idx].textContent;
      result.hidden = false;
    },600);
    return;
  }

  cubes[idx].classList.add(`crack${damage[idx]}`);

  setTimeout(gameLoop, 800);
}
