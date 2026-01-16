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
let currentRotation = 0; // 누적 회전각(deg)

/* 메뉴 리스트 표시 */
items.forEach((t) => {
  const li = document.createElement("li");
  li.textContent = t;
  menuList.appendChild(li);
});

function buildWheelBackground(n){
  // 색상은 자동 생성(HSL)
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

      /* ✅ 가독성 */
      width: 58%;
      font-weight: 900;
      font-size: 14px;
      letter-spacing: -0.2px;
      color: rgba(255,255,255,0.96);

      /* ✅ 선명도(외곽선+그림자) */
      -webkit-text-stroke: 0.8px rgba(0,0,0,0.55);
      text-shadow:
        0 2px 10px rgba(0,0,0,0.75),
        0 1px 0 rgba(0,0,0,0.35);

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      pointer-events:none;
      user-select:none;
    }

    @media (max-width: 520px){
      .slice-label{
        font-size: 13px;
        width: 62%;
      }
    }
  `;
  document.head.appendChild(style);
}

function buildLabels(n){
  wheel.innerHTML = "";
  const frag = document.createDocumentFragment();

  for(let i=0;i<n;i++){
    const label = document.createElement("div");
    label.className = "slice-label";
    label.textContent = items[i];

    const angle = (360 / n) * i + (360 / n) / 2;

    // ✅ 바깥쪽으로 배치해서 중앙 겹침 제거
    label.style.transform = `rotate(${angle}deg) translateY(-72%) rotate(90deg)`;

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

/* 최종 회전각에서 실제 포인터가 가리키는 인덱스 계산 */
function calcIndexFromRotation(rotationDeg){
  const n = items.length;
  const slice = 360 / n;

  const normalized = ((rotationDeg % 360) + 360) % 360; // 0~359
  const pointerAngle = (360 - normalized) % 360;        // 포인터(12시)가 가리키는 wheel 각
  const idx = Math.floor(pointerAngle / slice) % n;
  return idx;
}

function spin(){
  if(isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  resultText.textContent = "돌리는 중...";

  const n = items.length;
  const slice = 360 / n;

  const winnerIndex = pickWinnerIndex();

  // 섹터 중앙을 포인터에 맞추는 기본 각도
  const targetToPointer = -(winnerIndex * slice + slice / 2);

  // ✅ 긴박감: 7~8바퀴 고속 회전
  const fastSpins = 7 + Math.floor(Math.random() * 2);
  const baseTarget = fastSpins * 360 + targetToPointer;

  // ✅ "핀에 걸림" 연출: 살짝 지나침 → 되돌아오기
  const overshoot = slice * (0.18 + Math.random() * 0.08);  // 18~26% slice 지나침
  const back = overshoot * (0.55 + Math.random() * 0.15);   // 55~70% 되돌림

  const toOvershoot = currentRotation + baseTarget + overshoot; // 지나친 지점
  const toFinal = toOvershoot - back;                           // 되돌아온 최종 지점

  // 1) 빠르게 회전
  wheel.style.transition = "transform 3.35s cubic-bezier(.10,.85,.20,1)";
  wheel.style.transform = `rotate(${toOvershoot}deg)`;

  // 2) 마지막을 느리게 + 되돌아오기(스냅 느낌)
  setTimeout(() => {
    wheel.style.transition = "transform 1.15s cubic-bezier(.18,.95,.25,1)";
    wheel.style.transform = `rotate(${toFinal}deg)`;
    currentRotation = toFinal;

    // 3) 결과 표시
    setTimeout(() => {
      const idx = calcIndexFromRotation(currentRotation);
      resultText.textContent = items[idx];

      isSpinning = false;
      spinBtn.disabled = false;
    }, 1200);
  }, 3360);
}

function reset(){
  if(isSpinning) return;
  resultText.textContent = "-";
}

spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", reset);

// Enter/Space로도 실행
window.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !isSpinning) {
    e.preventDefault();
    spin();
  }
});
