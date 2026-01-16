const items = [
  "짬뽕지존",
  "나루터식당",
  "황귀엄나무 닭곰탕",
  "두루애",
  "육회바른연어",
  "청년감자탕",
  "장수본가해장국",
  "학만칼국수",
  "미정한식",
  "원산만두",
  "명동닭칼국수",
  "좋은생각 수제돈까스",
  "평상집"
];

const wheel = document.getElementById("wheel");
const spinBtn = document.getElementById("spinBtn");
const resetBtn = document.getElementById("resetBtn");
const resultText = document.getElementById("resultText");
const menuList = document.getElementById("menuList");

let isSpinning = false;
let currentRotation = 0;

/* 리스트 표시 */
items.forEach((t) => {
  const li = document.createElement("li");
  li.textContent = t;
  menuList.appendChild(li);
});

function buildWheelBackground(n){
  const stops = [];
  for(let i=0;i<n;i++){
    const a0 = (i * 360) / n;
    const a1 = ((i+1) * 360) / n;
    const hue = (i * (360 / n)) % 360;
    stops.push(`hsl(${hue} 75% 45%) ${a0}deg ${a1}deg`);
  }
  return `conic-gradient(${stops.join(",")})`;
}

function injectLabelStyles(){
  const style = document.createElement("style");
  style.textContent = `
    .slice-label{
      position:absolute;
      left:50%;
      top:50%;
      transform-origin: 0 0;
      pointer-events:none;
      user-select:none;

      /* ✅ 아우터 링 형태로 선명하게 */
      width: 62%;
      font-weight: 900;
      font-size: 16px;
      letter-spacing: -0.25px;
      color: rgba(255,255,255,0.98);

      -webkit-text-stroke: 1px rgba(0,0,0,0.62);
      text-shadow:
        0 2px 12px rgba(0,0,0,0.78),
        0 1px 0 rgba(0,0,0,0.35);

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 520px){
      .slice-label{
        font-size: 14px;
        width: 66%;
        -webkit-text-stroke: 0.9px rgba(0,0,0,0.62);
      }
    }
  `;
  document.head.appendChild(style);
}

/* ✅ 라벨을 중앙이 아니라 "바깥쪽 링"에 배치 */
function buildLabels(n){
  wheel.innerHTML = "";
  const frag = document.createDocumentFragment();

  // translateY(-R%) : 값이 클수록 바깥으로 감
  // ✅ 82% 정도면 거의 바깥쪽에 붙어서 확실히 보임
  const outward = -82;

  for(let i=0;i<n;i++){
    const label = document.createElement("div");
    label.className = "slice-label";
    label.textContent = items[i];

    const angle = (360 / n) * i + (360 / n) / 2;

    // ✅ 방향: 바깥으로 이동 → 텍스트는 살짝 안쪽을 바라보게
    // rotate(angle)로 위치 잡고, 바깥으로 보내고, 다시 -angle을 일부 보정하면 더 자연스러움
    label.style.transform = `rotate(${angle}deg) translateY(${outward}%) rotate(${90}deg)`;

    frag.appendChild(label);
  }
  wheel.appendChild(frag);
}

function init(){
  injectLabelStyles();
  wheel.style.background = buildWheelBackground(items.length);
  wheel.style.position = "relative";
  buildLabels(items.length);
}
init();

function pickWinnerIndex(){
  return Math.floor(Math.random() * items.length);
}

function calcIndexFromRotation(rotationDeg){
  const n = items.length;
  const slice = 360 / n;

  const normalized = ((rotationDeg % 360) + 360) % 360;
  const pointerAngle = (360 - normalized) % 360;
  return Math.floor(pointerAngle / slice) % n;
}

function spin(){
  if(isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  resultText.textContent = "돌리는 중...";

  const n = items.length;
  const slice = 360 / n;

  const winnerIndex = pickWinnerIndex();

  // 섹터 중앙을 포인터에 맞추는 각도
  const targetToPointer = -(winnerIndex * slice + slice / 2);

  // ✅ 고속 여러 바퀴
  const fastSpins = 7 + Math.floor(Math.random() * 2);
  const baseTarget = fastSpins * 360 + targetToPointer;

  // ✅ 핀에 걸려 살짝 되돌아오는 느낌
  const overshoot = slice * (0.20 + Math.random() * 0.10); // 20~30%
  const back = overshoot * (0.60 + Math.random() * 0.15);  // 60~75%

  const toOvershoot = currentRotation + baseTarget + overshoot;
  const toFinal = toOvershoot - back;

  // 1) 빠르게 회전
  wheel.style.transition = "transform 3.35s cubic-bezier(.10,.85,.20,1)";
  wheel.style.transform = `rotate(${toOvershoot}deg)`;

  // 2) 마지막 느리게 + 되돌림
  setTimeout(() => {
    wheel.style.transition = "transform 1.20s cubic-bezier(.18,.95,.25,1)";
    wheel.style.transform = `rotate(${toFinal}deg)`;
    currentRotation = toFinal;

    // 3) 결과 표시
    setTimeout(() => {
      const idx = calcIndexFromRotation(currentRotation);
      resultText.textContent = items[idx];

      isSpinning = false;
      spinBtn.disabled = false;
    }, 1250);
  }, 3360);
}

function reset(){
  if(isSpinning) return;
  resultText.textContent = "-";
}

spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", reset);

window.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !isSpinning) {
    e.preventDefault();
    spin();
  }
});
