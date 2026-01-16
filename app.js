const items = [
  "짬뽕지존",
  "나루터식당",
  "닭곰탕",
  "두루애",
  "육회바른연어",
  "청년감자탕",
  "해장국",
  "학만칼국수",
  "미정한식",
  "원산만두",
  "한솥",
  "수제돈까스",
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

const SVG_NS = "http://www.w3.org/2000/svg";

/* 텍스트 폭 측정용 */
const _canvas = document.createElement("canvas");
const _ctx = _canvas.getContext("2d");

function measureTextWidth(text, fontPx, fontFamily){
  _ctx.font = `800 ${fontPx}px ${fontFamily}`;
  return _ctx.measureText(text).width;
}

function fitFontSize(text, maxWidthPx, fontFamily, minPx = 14, maxPx = 32){
  let lo = minPx, hi = maxPx, best = minPx;
  while (lo <= hi){
    const mid = (lo + hi) >> 1;
    const w = measureTextWidth(text, mid, fontFamily);
    if (w <= maxWidthPx){
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function deg2rad(d){ return (d * Math.PI) / 180; }

function sectorPath(cx, cy, r, startDeg, endDeg){
  const start = deg2rad(startDeg);
  const end = deg2rad(endDeg);

  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);

  const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function sliceColor(i, n){
  const hue = (i * (360 / n)) % 360;
  return `hsl(${hue} 75% 45%)`;
}

/**
 * ✅ SVG 룰렛 생성
 * ✅ 텍스트 방향: 중심 -> 바깥(반지름 방향)
 * ✅ 글씨 크기 키움(폭/최대폰트/외곽선 강화)
 */
function buildWheelSVG(){
  const n = items.length;
  const sliceDeg = 360 / n;

  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const r = 240;

  // 텍스트 위치 반경(조금 더 바깥쪽)
  const textR = r * 0.66;

  const fontFamily =
    `"Noto Sans KR", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Apple SD Gothic Neo", "Malgun Gothic"`;

  wheel.innerHTML = "";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("aria-label", "룰렛");

  // 유리 오버레이
  const defs = document.createElementNS(SVG_NS, "defs");
  const radial = document.createElementNS(SVG_NS, "radialGradient");
  radial.setAttribute("id", "glass");
  radial.innerHTML = `
    <stop offset="0%" stop-color="rgba(255,255,255,0.55)"/>
    <stop offset="35%" stop-color="rgba(255,255,255,0.18)"/>
    <stop offset="70%" stop-color="rgba(0,0,0,0.08)"/>
    <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
  `;
  defs.appendChild(radial);
  svg.appendChild(defs);

  for(let i=0;i<n;i++){
    const startDeg = i * sliceDeg - 90;   // 12시 기준
    const endDeg = (i+1) * sliceDeg - 90;
    const midDeg = (startDeg + endDeg) / 2;

    // 섹터
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", sectorPath(cx, cy, r, startDeg, endDeg));
    p.setAttribute("fill", sliceColor(i, n));
    p.setAttribute("opacity", "0.96");
    svg.appendChild(p);

    // 텍스트 위치(반지름 방향)
    const mid = deg2rad(midDeg);
    const tx = cx + textR * Math.cos(mid);
    const ty = cy + textR * Math.sin(mid);

    // 해당 반경에서 섹터 폭(호 길이)
    const arcLen = 2 * Math.PI * textR * (sliceDeg / 360);
    const maxTextWidth = arcLen * 0.90; // ✅ 기존 0.78 -> 0.90

    // ✅ 최소 14, 최대 32로 키움
    const fs = fitFontSize(items[i], maxTextWidth, fontFamily, 14, 32);

    // 반지름 방향 회전 = midDeg
    // 뒤집히는 구간은 180도 보정(읽기 좋게)
    let rot = midDeg;
    const norm = ((rot % 360) + 360) % 360;
    if (norm > 90 && norm < 270) rot -= 180;

    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", tx);
    t.setAttribute("y", ty);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.setAttribute("font-family", fontFamily);
    t.setAttribute("font-size", String(fs));
    t.setAttribute("font-weight", "800");
    t.setAttribute("fill", "rgba(255,255,255,0.96)");
    t.setAttribute("stroke", "rgba(0,0,0,0.70)");
    t.setAttribute("stroke-width", "3"); // ✅ 외곽선 강화(2.2 -> 3)
    t.setAttribute("transform", `rotate(${rot} ${tx} ${ty})`);
    t.textContent = items[i];

    svg.appendChild(t);
  }

  // 유리 오버레이(전체 원)
  const glass = document.createElementNS(SVG_NS, "circle");
  glass.setAttribute("cx", cx);
  glass.setAttribute("cy", cy);
  glass.setAttribute("r", r);
  glass.setAttribute("fill", "url(#glass)");
  glass.setAttribute("opacity", "0.75");
  svg.appendChild(glass);

  // 림
  const rim = document.createElementNS(SVG_NS, "circle");
  rim.setAttribute("cx", cx);
  rim.setAttribute("cy", cy);
  rim.setAttribute("r", r);
  rim.setAttribute("fill", "none");
  rim.setAttribute("stroke", "rgba(255,255,255,0.16)");
  rim.setAttribute("stroke-width", "10");
  svg.appendChild(rim);

  wheel.appendChild(svg);
}

function init(){
  buildWheelSVG();
  window.addEventListener("resize", () => buildWheelSVG());
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
