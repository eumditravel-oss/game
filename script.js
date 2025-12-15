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
let states = [];

function buildNames(){
  namesEl.innerHTML="";
  for(let i=0;i<countEl.value;i++){
    const input=document.createElement("input");
    input.placeholder=`선택지 ${i+1}`;
    namesEl.appendChild(input);
  }
}
buildNames();
countEl.onchange=buildNames;

startBtn.onclick=()=>{
  setup.hidden=true;
  game.hidden=false;
  startGame();
};

function startGame(){
  const names=[...namesEl.children].map((i,idx)=>i.value||`선택지 ${idx+1}`);
  grid.innerHTML="";
  cubes=[];
  states=Array(names.length).fill(0);

  names.forEach((n,i)=>{
    const c=document.createElement("div");
    c.className="cube";
    c.textContent=n;
    grid.appendChild(c);
    cubes.push(c);
  });

  loop();
}

function loop(){
  const idx=Math.floor(Math.random()*cubes.length);
  const dmg=Math.random()<0.35?2:1; // 🔥 복불복 핵심
  states[idx]+=dmg;

  penguin.style.transform=`translate(${cubes[idx].offsetLeft}px,${cubes[idx].offsetTop}px)`;

  cubes[idx].classList.remove("crack1","crack2","crack3");

  if(states[idx]>=3){
    cubes[idx].classList.add("crack3");
    setTimeout(()=>{
      winnerText.textContent=cubes[idx].textContent;
      result.hidden=false;
    },500);
    return;
  }else{
    cubes[idx].classList.add(`crack${states[idx]}`);
  }

  setTimeout(loop,700);
}
