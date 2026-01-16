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

      font-weight: 900;
      letter-spacing: -0.25px;
      color: rgba(255,255,255,0.98);
      text-align: center;
      line-height: 1.05;

      -webkit-text-stroke: 1px rgba(0,0,0,0.62);
      text-shadow:
        0 2px 12px rgba(0,0,0,0.78),
        0 1px 0 rgba(0,0,0,0.35);

      /* 배경 살짝(가독성) */
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(0,0,0,0.10);

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 520px){
      .slice-label{
        -webkit-text-stroke: 0.9px rgba(0,0,0,0.62);
      }
    }
  `;
  document.head.appendChild(style);
}

/* ---- 텍스트 폭에 맞춰 폰트 크기 자동 계산 ---- */
const _canvas = document.createElement("canvas");
const _ctx = _canvas.getContext("2d");

function fitFontSize(text, maxWidthPx, fontFamily, minPx = 11, maxPx = 22){
  // maxWidthPx 안에 들어가도록 최대 폰트 크기 찾기 (이분 탐색)
  let lo = minPx;
  let hi = maxPx;
  let best = minPx;

  while(lo <= hi){
    const mid = (lo + hi) >> 1;
    _ctx.font = `900 ${mid}px ${fontFamily}`;
    const w = _ctx.measureText(text).width;

    if(w <= maxWidthPx){
      best = mid;
      lo = mid + 1;
    }else{
      hi = mid - 1;
    }
  }
  return best;
}

/**
 * ✅ 핵심: 삼각형(섹터) 안 중앙에 배치
 * - 반경 r에서 섹터 폭(호 길이) 계산 → 그 폭에 맞게 폰트 자동 확대
 * - 왼쪽(180도 넘어가는) 섹터는 글자 뒤집히지 않게 180도 보정
 */
function buildLabels(){
  const n = items.length;
  const sliceDeg = 360 / n;

  wheel.innerHTML = "";

  const rect = wheel.getBoundingClientRect();
  const radius = Math.min(rect.width, rect.height) / 2;

  // ✅ 삼각형 내부 중앙 느낌: 바깥쪽으로 너무 붙지 않게 0.64~0.72가 예쁨
  const textRadius = radius * 0.68;

  // 폰트 패밀리(스타일시트 body와 동일 계열)
  const fontFamily =
    `"Noto Sans KR", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Apple SD Gothic Neo", "Malgun Gothic"`;

  const frag = document.createDocumentFragment();

  for(let i=0;i<n;i++){
    const text = items[i];

    // 섹터 중앙 각도
    const angle = i * sliceDeg + sliceDeg / 2;

    // 반경 textRadius에서의 섹터 폭(호 길이)
    const arcLen = 2 * Math.PI * textRadius * (sliceDeg / 360);
    const maxTextWidth = arcLen * 0.92; // 여유(양쪽 패딩 고려)

    // 폰트 자동 확대(너무 크면 겹치니 상한선 둠)
    const fontSize = fitFontSize(text, maxTextWidth, fontFamily, 11, 22);

    const label = document.createElement("div");
    label.className = "slice-label";
    label.textContent = text;
    label.style.width = `${Math.max(90, Math.floor(maxTextWidth))}px`;
    label.style.fontSize = `${fontSize}px`;

    // 90~270도 구간(왼쪽 반)은 글자가 뒤집혀 보이므로 180도 보정
    const flip = angle > 90 && angle < 270 ? 180 : 0;

    // ✅ 변환 순서(오른쪽부터 적용):
    // 1) translate(-50%,-50%)로 라벨 중심을 기준점으로
    // 2) 왼쪽 반이면 180도 회전(글자 뒤집힘 방지)
    // 3) 반경만큼 밖으로 이동(삼각형 내부 중앙)
    // 4) 섹터 중앙 각도로 회전 배치
    label.style.transform =
      `rotate(${angle}deg) translate(${textRadius}px, 0) rotate(${flip}deg) translate(-50%, -50%)`;

    frag.appendChild(label);
  }

  wheel.appendChild(frag);
}

function init(){
  injectLabelStyles();
  wheel.style.background = buildWheelBackground(items.length);
  wheel.style.position = "relative";

  // 1차
  buildLabels();

  // 렌더 후 2차(크기 확정)
  requestAnimationFrame(() => buildLabels());

  // 리사이즈 대응
  window.addEventListener("resize", () => buildLabels());
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

/* 긴박감: 빠르게 돌고 → 마지막 느리게 → 살짝 지나쳤다가 되돌아오기 */
function spin(){
  if(isSpinning) return;
  isSpinning = true;
  spinBtn.disabled = true;
  resultText.textContent = "돌리는 중...";

  const n = items.length;
  const slice = 360 / n;

  const winnerIndex = pickWinnerIndex();
  const targetToPointer = -(winnerIndex * slice + slice / 2);

  const fastSpins = 7 + Math.floor(Math.random() * 2);
  const baseTarget = fastSpins * 360 + targetToPointer;

  const overshoot = slice * (0.20 + Math.random() * 0.10);
  const back = overshoot * (0.60 + Math.random() * 0.15);

  const toOvershoot = currentRotation + baseTarget + overshoot;
  const toFinal = toOvershoot - back;

  wheel.style.transition = "transform 3.35s cubic-bezier(.10,.85,.20,1)";
  wheel.style.transform = `rotate(${toOvershoot}deg)`;

  setTimeout(() => {
    wheel.style.transition = "transform 1.20s cubic-bezier(.18,.95,.25,1)";
    wheel.style.transform = `rotate(${toFinal}deg)`;
    currentRotation = toFinal;

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
