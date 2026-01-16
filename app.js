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

/* 메뉴 리스트 표시 */
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

      /* ✅ 가독성 */
      width: 200px;               /* 길이 제한(긴 글자 줄임표) */
      font-weight: 900;
      font-size: 15px;
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
        font-size: 13px;
        width: 180px;
        -webkit-text-stroke: 0.9px rgba(0,0,0,0.62);
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * ✅ 핵심: %가 아니라 "px 반경"으로 정확히 원형 배치
 * - wheel 크기가 바뀌어도(모바일/리사이즈) 자동으로 정상 위치
 */
function buildLabels(n){
  wheel.innerHTML = "";
  const frag = document.createDocumentFragment();

  const rect = wheel.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) / 2;

  // 테두리(10px) + 내부 글로우/링 + 안전여백 고려
  // 숫자만 조절하면 글씨 위치를 쉽게 튜닝 가능
  const rimPadding = 52;             // ✅ 글씨가 너무 바깥이면 ↑, 너무 안쪽이면 ↓
  const textRadius = Math.max(10, radius - rimPadding);

  for(let i=0;i<n;i++){
    const label = document.createElement("div");
    label.className = "slice-label";
    label.textContent = items[i];

    const angle = (360 / n) * i + (360 / n) / 2;

    // 중심에서 angle 방향으로 textRadius(px) 이동
    // 마지막 rotate(90deg)는 글자가 섹터 방향으로 자연스럽게 보이도록 보정
    label.style.transform = `rotate(${angle}deg) translateX(${textRadius}px) rotate(90deg)`;

    frag.appendChild(label);
  }

  wheel.appendChild(frag);
}

function init(){
  injectLabelStyles();
  wheel.style.background = buildWheelBackground(items.length);
  wheel.style.position = "relative";

  // 1차 배치(초기)
  buildLabels(items.length);

  // ✅ 렌더 완료 후 2차 배치(정확한 rect 확보)
  requestAnimationFrame(() => buildLabels(items.length));

  // ✅ 창 크기 바뀌면 다시 정렬
  window.addEventListener("resize", () => buildLabels(items.length));
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

  // 섹터 중앙이 포인터에 오도록 목표각
  const targetToPointer = -(winnerIndex * slice + slice / 2);

  // 긴박감: 고속 회전(7~8바퀴)
  const fastSpins = 7 + Math.floor(Math.random() * 2);
  const baseTarget = fastSpins * 360 + targetToPointer;

  // 핀에 걸리는 느낌: 살짝 지나쳤다가 되돌아오기
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
