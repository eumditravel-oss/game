:root{
  --bg1:#06121f;
  --bg2:#04080f;
  --panel: rgba(255,255,255,.06);
  --line: rgba(255,255,255,.12);
  --text:#eaf4ff;
  --muted:#9fb4cc;
}

*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  color:var(--text);
  font-family: system-ui,-apple-system,"Noto Sans KR",sans-serif;
  background:
    radial-gradient(900px 540px at 15% 10%, rgba(90,190,255,.16), transparent 60%),
    radial-gradient(800px 600px at 85% 25%, rgba(160,255,220,.10), transparent 60%),
    linear-gradient(180deg, var(--bg1), var(--bg2));
}

.wrap{
  min-height:100%;
  padding: 16px;
}

/* SETUP card */
.card{
  max-width: 860px;
  margin: 0 auto;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0,0,0,.35);
}

.h1{
  margin: 4px 0 8px;
  font-size: clamp(20px, 4.6vw, 30px);
}
.sub{
  margin: 0 0 14px;
  color: var(--muted);
  line-height:1.45;
}

.row{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: end;
}

.label{
  display:flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
  color: var(--muted);
  font-size: 13px;
}

.input{
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(0,0,0,.18);
  color: var(--text);
  outline: none;
}
.input:focus{
  border-color: rgba(170,235,255,.45);
  box-shadow: 0 0 0 4px rgba(120,220,255,.12);
}

.btn{
  height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.06);
  color: var(--text);
  cursor:pointer;
}
.btn.primary{
  border-color: rgba(150,235,255,.40);
  background: linear-gradient(180deg, rgba(120,220,255,.35), rgba(120,220,255,.14));
  font-weight: 800;
}
.btn.small{
  height: 36px;
  border-radius: 999px;
  font-size: 13px;
  padding: 0 12px;
}

/* names */
.namesBox{
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.namesHeader{
  display:flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: baseline;
}
.namesTitle{ font-weight:800; }
.namesHint{ color: var(--muted); font-size: 12.5px; }

.namesGrid{
  margin-top: 10px;
  display:grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.namesGrid input{
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(0,0,0,.18);
  color: var(--text);
  outline:none;
}

/* GAME layout */
.game{
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
.topBar{
  position: fixed;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 40;
  max-width: 980px;
  margin: 0 auto;
  display:flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 0 6px;
}
.status{
  flex: 1;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage{
  position: relative;
  height: 100vh;
  width: 100vw;
  padding-top: 62px;
  overflow: hidden;
}

/* ✅ 자동 반응형: 어떤 화면에서도 겹침 방지 */
.grid{
  max-width: 980px;
  margin: 0 auto;
  height: calc(100vh - 62px);
  display: grid;
  gap: 12px;
  padding: 16px 14px 140px; /* result/버튼 안전영역 */
  align-content: start;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
}

/* cubes */
.cube{
  position: relative;
  border-radius: 16px;
  aspect-ratio: 1 / 1;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 10px;
  text-align:center;
  font-weight: 900;
  user-select:none;
  border: 1px solid rgba(210, 245, 255, .22);

  background:
    radial-gradient(120px 90px at 30% 20%, rgba(255,255,255,.20), transparent 55%),
    linear-gradient(135deg, rgba(175,232,255,.30), rgba(210,248,255,.10));
  box-shadow:
    0 12px 26px rgba(0,0,0,.30),
    inset 0 1px 0 rgba(255,255,255,.14);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, filter .18s ease;
}

.cube.target{
  transform: translateY(-3px) scale(1.03);
  border-color: rgba(255,255,255,.50);
  box-shadow:
    0 20px 40px rgba(0,0,0,.48),
    0 0 0 8px rgba(120,220,255,.12),
    0 0 50px rgba(120,220,255,.20),
    inset 0 1px 0 rgba(255,255,255,.16);
}

/* 단계별 효과를 “극명하게” */
.cube::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius:16px;
  pointer-events:none;
  opacity:0;
}

.cube.crack1{
  filter: saturate(1.05);
}
.cube.crack1::after{
  opacity:.55;
  background:
    linear-gradient(120deg, transparent 46%, rgba(255,255,255,.28) 47%, transparent 48%),
    radial-gradient(140px 120px at 60% 60%, rgba(255,255,255,.10), transparent 60%);
  mix-blend-mode: screen;
}

.cube.crack2{
  border-color: rgba(255, 220, 170, .55);
  box-shadow:
    0 18px 36px rgba(0,0,0,.44),
    0 0 0 7px rgba(255,170,80,.10),
    inset 0 1px 0 rgba(255,255,255,.18);
  animation: shake .16s infinite;
}
.cube.crack2::after{
  opacity:.85;
  background:
    linear-gradient(115deg, transparent 42%, rgba(255,255,255,.34) 43%, transparent 44%),
    linear-gradient(35deg, transparent 54%, rgba(255,255,255,.24) 55%, transparent 56%),
    radial-gradient(140px 120px at 58% 58%, rgba(255,255,255,.14), transparent 60%);
  mix-blend-mode: screen;
}

.cube.crack3{
  border-color: rgba(255, 170, 170, .70);
  box-shadow:
    0 22px 50px rgba(0,0,0,.55),
    0 0 70px rgba(255,70,70,.22),
    inset 0 1px 0 rgba(255,255,255,.18);
  filter: saturate(1.25);
}
.cube.crack3::after{
  opacity: 1;
  background:
    radial-gradient(120px 120px at 50% 45%, rgba(255,90,90,.22), transparent 62%),
    linear-gradient(112deg, transparent 40%, rgba(255,255,255,.42) 41%, transparent 42%),
    linear-gradient(28deg, transparent 50%, rgba(255,255,255,.28) 51%, transparent 52%),
    linear-gradient(150deg, transparent 58%, rgba(255,255,255,.26) 59%, transparent 60%);
  mix-blend-mode: screen;
}

@keyframes shake{
  0%,100%{ transform: translate(0,0) }
  25%{ transform: translate(1px,-1px) }
  75%{ transform: translate(-1px,1px) }
}

/* Penguin */
.penguin{
  position: fixed;
  z-index: 60;
  font-size: 38px;
  transform: translate(-9999px, -9999px);
  pointer-events: none;
  filter: drop-shadow(0 10px 14px rgba(0,0,0,.38));
}

/* Result overlay */
.result{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.78);
  z-index: 80;
  display:flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.resultLabel{
  letter-spacing: .9px;
  color: var(--muted);
  font-size: 12px;
}
.winner{
  margin-top: 10px;
  font-size: clamp(22px, 6vw, 40px);
  font-weight: 900;
}
.result .btn{ margin-top: 14px; }

/* 모바일 입력칸 안정화 */
@media (max-width: 720px){
  .namesGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 420px){
  .namesGrid{ grid-template-columns: 1fr; }
  .row{ gap: 8px; }
  .label{ min-width: 100%; }
  .btn{ flex: 1; }
}
