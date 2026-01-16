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

// (보기용) 메뉴 리스트 표시
items.forEach((t) => {
  const li = document.createElement("li");
  li.textContent = t;
  menuList.appendChild(li);
});

function buildWheelBackground(n){
  // 색을 직접 지정하지 않고(요청 없었음), 기본 HSL로 자동 생성
  const stops = [];
  for(let i=0;i<n;i++){
    const a0 = (i * 360) / n;
    const a1 = ((i+1) * 360) / n;
    const hue = (i * (360 / n)) % 360;
    stops.push(`hsl(${hue} 75% 45%) ${a0}deg ${a1}deg`);
  }
  return `conic-gradient(${stops.join(",")})`;
}

function buildLabels(n){
  // 라벨을 wheel 위에 올리기 (각 섹터 중앙에 배치)
  wheel.innerHTML = ""; // clear
  const frag = document.createDocumentFragment();

  for(let i=0;i<n;i++){
    const label = document.createElement("div");
    label.className = "slice-label";
    label.textContent = items[i];

    const angle = (360 / n) * i + (360 / n) / 2; // 섹터 중앙
    label.style.transform = `rotate(${angle}deg) translateY(-44%) rotate(90deg)`;
    frag.appendChild(label);
  }
  wheel.appendChild(frag);
}

function injectLabelStyles(){
  // 라벨 스타일을 JS에서 주입 (파일 늘리기 싫으면 여기서 처리)
  const style = document.createElement("style");
  style.textContent = `
    .slice-label{
      position:absolute;
      left:50%;
      top:50%;
      transform-origin: 0 0;
      width: 44%;
      text-align: left;
      font-weight: 800;
      font-size: 13px;
      color: rgba(255,255,255,0.92);
      text-shadow: 0 2px 8px rgba(0,0,0,0.55);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events:none;
    }
  `;
  document.head.appendChild(style);
}

function init(){
  injectLabelStyles();
  wheel.style.background = buildWheelBackground(items.length);
  wheel.style.position = "relative";
  buildLabels(items.length);
}
init();

function pickWinnerIndex(){
  // 균등 랜덤
  return Math.floor(Math.random() * items.length);
}

function spin(){
  if(isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  resultText.textContent = "돌리는 중...";

  const n = items.length;
  const slice = 360 / n;

  const winnerIndex = pickWinnerIndex();

  // 포인터는 "위(12시)"에 있고, wheel은 시계방향(+) 회전.
  // 당첨 섹터의 중앙이 포인터에 오도록 목표 각도 계산:
  // 섹터 i 중앙 각도는 (i*slice + slice/2). 이를 0deg(포인터)로 맞추려면 wheel을 -(중앙각)만큼 회전.
  const targetToPointer = -(winnerIndex * slice + slice / 2);

  // 보기 좋게 여러 바퀴 추가 + 약간 랜덤 오프셋(중앙 유지 범위 내)
  const extraSpins = 6 + Math.floor(Math.random() * 3); // 6~8바퀴
  const jitter = (Math.random() * (slice * 0.20)) - (slice * 0.10); // ±10% slice
  const target = extraSpins * 360 + targetToPointer + jitter;

  currentRotation += target;

  wheel.style.transform = `rotate(${currentRotation}deg)`;

  const onDone = () => {
    wheel.removeEventListener("transitionend", onDone);

    // 최종 각도로 실제 당첨 인덱스 다시 계산(정확도 보정)
    const normalized = ((currentRotation % 360) + 360) % 360; // 0~359
    // 포인터 기준에서 wheel이 rotated 된 만큼, 포인터가 가리키는 실제 섹터:
    // 포인터는 0deg, wheel은 normalized 만큼 회전 -> wheel의 -normalized 지점이 포인터에 온다.
    const pointerAngle = (360 - normalized) % 360;
    const idx = Math.floor(pointerAngle / slice) % n;

    const winner = items[idx];
    resultText.textContent = winner;

    isSpinning = false;
    spinBtn.disabled = false;
  };

  wheel.addEventListener("transitionend", onDone);
}

function reset(){
  if(isSpinning) return;
  resultText.textContent = "-";
}

spinBtn.addEventListener("click", spin);
resetBtn.addEventListener("click", reset);

// 스페이스/엔터로도 돌리기
window.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && !isSpinning) {
    e.preventDefault();
    spin();
  }
});
