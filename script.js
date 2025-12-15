const setupView = document.getElementById("setupView");
const gameView = document.getElementById("gameView");
const grid = document.getElementById("grid");
const penguin = document.getElementById("penguin");
const resultBox = document.getElementById("resultBox");
const resultText = document.getElementById("resultText");
const statusText = document.getElementById("status");

const countInput = document.getElementById("countInput");
const applyBtn = document.getElementById("applyBtn");
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");
const againBtn = document.getElementById("againBtn");
const nameInputs = document.getElementById("nameInputs");

let names = [];
let cubes = [];
let penguinPos = {x:-9999,y:-9999,tx:-9999,ty:-9999};

function buildInputs(){
  nameInputs.innerHTML="";
  for(let i=0;i<countInput.value;i++){
    const input=document.createElement("input");
    input.placeholder=`선택지 ${i+1}`;
    nameInputs.appendChild(input);
  }
}

applyBtn.onclick = buildInputs;
buildInputs();

startBtn.onclick = ()=>{
  names=[...nameInputs.querySelectorAll("input")].map((i,idx)=>i.value||`선택지 ${idx+1}`);
  setupView.hidden=true;
  gameView.hidden=false;
  startGame();
};

backBtn.onclick=()=>{
  gameView.hidden=true;
  setupView.hidden=false;
};

againBtn.onclick=startGame;

function buildCubes(){
  grid.innerHTML="";
  cubes=[];
  names.forEach((n,i)=>{
    const c=document.createElement("div");
    c.className="cube";
    c.textContent=n;
    grid.appendChild(c);
    cubes.push(c);
  });
}

function startGame(){
  resultBox.hidden=true;
  statusText.textContent="펭귄이 살펴보는 중…";
  buildCubes();

  const winner=Math.floor(Math.random()*cubes.length);
  let order=[...cubes.keys()].filter(i=>i!==winner);
  order.sort(()=>Math.random()-.5);
  order=order.slice(0,3).concat(winner);

  let step=0;
  function next(){
    if(step>=order.length){
      finish(winner);
      return;
    }
    const idx=order[step];
    highlight(idx);
    movePenguin(idx);
    snow(idx);
    step++;
    setTimeout(next,700);
  }
  next();
}

function highlight(i){
  cubes.forEach(c=>c.className="cube");
  cubes[i].classList.add("target","crack1");
}

function finish(i){
  statusText.textContent="쨍! 얼음이 깨졌어요!";
  cubes[i].classList.add("crack2");
  setTimeout(()=>{
    cubes[i].classList.add("crack3","break");
    resultText.textContent=names[i];
    resultBox.hidden=false;
  },500);
}

function movePenguin(i){
  const r=cubes[i].getBoundingClientRect();
  penguinPos.tx=r.left+r.width/2-35;
  penguinPos.ty=r.top-50;
  tween();
}

function tween(){
  penguinPos.x+= (penguinPos.tx-penguinPos.x)*0.15;
  penguinPos.y+= (penguinPos.ty-penguinPos.y)*0.15;
  penguin.style.transform=`translate(${penguinPos.x}px,${penguinPos.y}px)`;
  if(Math.abs(penguinPos.tx-penguinPos.x)>1){
    requestAnimationFrame(tween);
  }
}

function snow(i){
  const r=cubes[i].getBoundingClientRect();
  for(let k=0;k<8;k++){
    const s=document.createElement("div");
    s.className="snow";
    s.textContent="❄️";
    s.style.left=r.left+r.width/2+(Math.random()*40-20)+"px";
    s.style.top=r.top+"px";
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),1000);
  }
}
