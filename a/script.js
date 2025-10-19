// === Yardımcılar ===
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const uuid = ()=> (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
              : 'id-' + Math.random().toString(36).slice(2) + Date.now();

const fmtPct = v => `${Number(v).toFixed(2)}%`;            // %0.00
const fmtInt = v => Number(Math.round(v)).toLocaleString("tr-TR");

// === Uygulama Durumu ===
const state = {
  candidates: [],               // {id,name,color}
  voters: 60000000,
  turnoutFinal: 85.0,           // %
  validRateFinal: 98.0,         // %
  totalSandik: 200000,
  openedPct: 0,                 // %0..100

  targetMode: false,
  targetShares: {},             // id -> % (1. tur)

  // 2. Tur
  round2: {
    enabled: false,
    mode: "auto",               // auto | manual
    pair: [],                   // [id1,id2]
    targetShares: {},           // id -> % (sadece pair için)
    viewRound: 1                // 1 | 2 (şu an gösterilen tur)
  },

  // Ajanslar
  agencies: {
    AA:   { favId: null, bias: 0.30, leader: null, lastLeader: null },
    ANKA: { favId: null, bias: 0.25, leader: null, lastLeader: null }
  },

  // Eğriler
  curves: { turnout: "balanced", valid: "balanced" },

  // Otomatik
  auto: { running:false, step:1.0, speed:600, timer:null },

  // Alarm
  alarm: { diffThreshold: 1.5 },

  // Geçmiş (grafik için)
  history: {
    AA: [],    // {opened, diff}
    ANKA: []   // {opened, diff}
  },

  logs: []
};

// === Başlangıç Adayları ===
function addDefaultCandidates(){
  addCandidate("Aday 1", "#2563eb");
  addCandidate("Aday 2", "#f97316");
}
function addCandidate(name, color){
  if(state.candidates.length >= 6) return;
  const id = uuid();
  state.candidates.push({id, name: name || `Aday ${state.candidates.length+1}`, color: color || "#2563eb"});
  if(!state.agencies.AA.favId) state.agencies.AA.favId = id;
  if(!state.agencies.ANKA.favId && state.candidates.length>1) state.agencies.ANKA.favId = state.candidates[1].id;
  renderCandidates(); renderTargetTable(); renderAgencyFavSelectors(); refreshPanels(); renderR2UI();
}

// === Render: Aday Listesi ===
function renderCandidates(){
  const ul = $("#candidateList");
  ul.innerHTML = "";
  state.candidates.forEach(c=>{
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <span class="swatch" style="background:${c.color}"></span>
      <input class="input" data-id="${c.id}" data-f="name" value="${c.name}" title="Aday adı" />
      <input class="input color" data-id="${c.id}" data-f="color" type="color" value="${c.color}" title="Renk" />
      <span class="spacer"></span>
      <button class="btn small danger" data-id="${c.id}">Sil</button>
    `;
    ul.appendChild(li);
  });

  // Events
  ul.querySelectorAll('input[data-f="name"]').forEach(inp=>{
    inp.addEventListener("input", e=>{
      const c = state.candidates.find(x=>x.id===e.target.dataset.id);
      if(c){ c.name = e.target.value || "Aday"; renderTargetTable(); renderAgencyFavSelectors(); renderR2UI(); refreshPanels(); }
    });
  });
  ul.querySelectorAll('input[data-f="color"]').forEach(inp=>{
    inp.addEventListener("input", e=>{
      const c = state.candidates.find(x=>x.id===e.target.dataset.id);
      if(c){ c.color = e.target.value || "#2563eb"; refreshPanels(); }
    });
  });
  ul.querySelectorAll('button.btn.danger').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(state.candidates.length<=2){ alert("En az 2 aday olmalı."); return; }
      const id = btn.dataset.id;
      state.candidates = state.candidates.filter(x=>x.id!==id);
      delete state.targetShares[id];
      delete state.round2.targetShares[id];
      // 2. tur çiftinden silinen varsa temizle
      state.round2.pair = state.round2.pair.filter(x=> x!==id);
      if(state.agencies.AA.favId===id) state.agencies.AA.favId = state.candidates[0]?.id || null;
      if(state.agencies.ANKA.favId===id) state.agencies.ANKA.favId = state.candidates[1]?.id || state.candidates[0]?.id || null;
      renderCandidates(); renderTargetTable(); renderAgencyFavSelectors(); renderR2UI(); refreshPanels();
    });
  });
}

// === Hedef Modu Tablosu (1. Tur) ===
function renderTargetTable(){
  const wrap = $("#targetTableWrap");
  wrap.classList.toggle("hidden", !state.targetMode);

  const tbody = $("#targetTableBody");
  tbody.innerHTML = "";
  state.candidates.forEach(c=>{
    const val = Number(state.targetShares[c.id] ?? 0).toFixed(2);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.name}</td>
      <td><input class="input" type="number" step="0.01" min="0" max="100" data-id="${c.id}" value="${val}"/></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input").forEach(inp=>{
    inp.addEventListener("input", e=>{
      const id = e.target.dataset.id;
      state.targetShares[id] = parseFloat(e.target.value || "0");
      updateTargetSum();
    });
  });

  updateTargetSum();
}
function updateTargetSum(){
  const sum = state.candidates.reduce((a,c)=> a + (Number(state.targetShares[c.id]||0)), 0);
  $("#targetSum").textContent = fmtPct(sum);
  $("#targetWarn").classList.toggle("hidden", Math.abs(sum-100) < 0.001);
}

// === Ajans Favori Seçicileri ===
function renderAgencyFavSelectors(){
  const aa = $("#selFavAA"), anka = $("#selFavANKA");
  aa.innerHTML = ""; anka.innerHTML = "";
  state.candidates.forEach(c=>{
    const o1 = document.createElement("option"); o1.value=c.id; o1.textContent=c.name; aa.appendChild(o1);
    const o2 = document.createElement("option"); o2.value=c.id; o2.textContent=c.name; anka.appendChild(o2);
  });
  if(state.agencies.AA.favId) aa.value = state.agencies.AA.favId;
  if(state.agencies.ANKA.favId) anka.value = state.agencies.ANKA.favId;
}

// === 2. Tur UI ===
function renderR2UI(){
  const manualWrap = $("#r2ManualPair");
  manualWrap.classList.toggle("hidden", state.round2.mode!=="manual");
  // doldur
  const sel1 = $("#r2c1"), sel2 = $("#r2c2");
  [sel1, sel2].forEach(sel=>{
    sel.innerHTML = "";
    state.candidates.forEach(c=>{
      const o = document.createElement("option");
      o.value = c.id; o.textContent = c.name;
      sel.appendChild(o);
    });
  });
  if(state.round2.pair[0]) sel1.value = state.round2.pair[0];
  if(state.round2.pair[1]) sel2.value = state.round2.pair[1];

  // hedef tablo (2. tur)
  const wrap = $("#r2TargetWrap");
  wrap.classList.toggle("hidden", !state.round2.enabled);
  const body = $("#r2TargetBody");
  body.innerHTML = "";
  const pair = getRound2Pair();
  pair.forEach(id=>{
    const c = state.candidates.find(x=>x.id===id);
    if(!c) return;
    const val = Number(state.round2.targetShares[id] ?? 0).toFixed(2);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.name}</td>
      <td><input class="input" type="number" step="0.01" min="0" max="100" data-id="${id}" value="${val}"/></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("input").forEach(inp=>{
    inp.addEventListener("input", e=>{
      const id = e.target.dataset.id;
      state.round2.targetShares[id] = parseFloat(e.target.value || "0");
      updateR2Sum();
    });
  });
  updateR2Sum();
}
function updateR2Sum(){
  const pair = getRound2Pair();
  const sum = pair.reduce((a,id)=> a + (Number(state.round2.targetShares[id]||0)), 0);
  $("#r2TargetSum").textContent = fmtPct(sum);
}

// === Final Vektörü (1. Tur / 2. Tur) ===
function getFinalVector(round=1){
  const n = state.candidates.length;
  if(n<2) return [];

  if(round===1){
    if(state.targetMode){
      let vec = state.candidates.map(c=> Math.max(0, Number(state.targetShares[c.id]||0)));
      let sum = vec.reduce((a,b)=>a+b,0);
      if(sum<=0) vec = Array.from({length:n}, ()=> 100/n);
      else vec = vec.map(v=> v*100/sum);
      return vec;
    }else{
      // hedef yoksa bir kez üret
      if(Object.keys(state.targetShares).length !== state.candidates.length) randomFinal();
      return getFinalVector(1);
    }
  }else{
    const pair = getRound2Pair();
    if(pair.length<2){
      // otomatik türet
      deriveRound2FromRound1();
      return getFinalVector(2);
    }
    // round2 target varsa kullan; yoksa round1 top2 normalize
    let vec = pair.map(id => Math.max(0, Number(state.round2.targetShares[id]||0)));
    let sum = vec.reduce((a,b)=>a+b,0);
    if(sum<=0){
      const base = getFinalVector(1);
      const map = Object.fromEntries(state.candidates.map((c,i)=>[c.id, base[i]]));
      vec = pair.map(id=> map[id]||0);
      const s = vec.reduce((a,b)=>a+b,0)||1;
      vec = vec.map(v=> v*100/s);
    }else{
      vec = vec.map(v=> v*100/sum);
    }
    return vec; // sadece 2 uzunluklu
  }
}

// === 2. Tur Çifti & Türetim ===
function getRound2Pair(){
  if(!state.round2.enabled) return [];
  if(state.round2.mode==="manual" && state.round2.pair.length===2) return state.round2.pair.slice(0,2);
  // otomatik: 1. tur hedef / otomatik finale göre en yüksek iki
  const base = getFinalVector(1);
  const arr = state.candidates.map((c,i)=> ({id:c.id, pct: base[i]})).sort((a,b)=> b.pct - a.pct);
  return arr.slice(0,2).map(x=> x.id);
}
function deriveRound2FromRound1(){
  const pair = getRound2Pair();
  const base = getFinalVector(1);
  const map = Object.fromEntries(state.candidates.map((c,i)=>[c.id, base[i]]));
  const a = map[pair[0]]||50, b = map[pair[1]]||50, s = a+b || 1;
  state.round2.targetShares[pair[0]] = (a*100/s);
  state.round2.targetShares[pair[1]] = (b*100/s);
}

// === Rastgele Gerçekçi Final (1. Tur) ===
function randomFinal(){
  const n = state.candidates.length;
  if(n<2) return;
  const raw = Array.from({length:n}, ()=> Math.pow(Math.random(), 1.6));
  const s = raw.reduce((a,b)=>a+b,0);
  let shares = raw.map(v=> 100*v/s);

  const top = Math.max(...shares), idx = shares.indexOf(top);
  const targetTop = 45 + Math.random()*15; // 45..60
  const k = targetTop / top;
  shares = shares.map((v,i)=> i===idx ? v*k : v);
  const tot = shares.reduce((a,b)=>a+b,0);
  shares = shares.map(v=> v*100/tot);

  state.candidates.forEach((c,i)=> state.targetShares[c.id] = shares[i]);
  if(!state.targetMode){ state.targetMode = true; $("#chkTargetMode").checked = true; }
  renderTargetTable(); addLog("Rastgele gerçekçi final yüzdeleri oluşturuldu.");
}

// === Eğri Fonksiyonları ===
function curveFactor(mode, t){
  if(mode==="fast")   return 0.25 + 0.75*Math.pow(t,0.65);
  if(mode==="slow")   return 0.08 + 0.92*Math.pow(t,1.25);
  return 0.12 + 0.88*Math.pow(t,0.9); // balanced
}
function currentTurnout(pct){
  const t = pct/100;
  const target = state.turnoutFinal;
  const curve = curveFactor(state.curves.turnout, t); // 0..1
  return clamp(target * curve, 0, 100);
}
function currentValidRate(pct){
  const t = pct/100;
  const target = state.validRateFinal;
  const base = 94 + 6 * Math.pow(t, state.curves.valid==="fast" ? 0.6 : state.curves.valid==="slow" ? 1.2 : 0.7);
  return clamp((base/100)*target + (1-(base/100))*96, 80, 100);
}

// === Ajans Payları ===
function agencyShares(key, openedPct){
  const A = state.agencies[key];
  // aktif tur & aday listesi
  const { list, targetVec } = getActiveContext();
  const favId = normalizeFavForRound(A.favId, list) || list[0].id;
  const favIdx = list.findIndex(c=>c.id===favId);
  const n = list.length;

  const t = openedPct/100;
  const decay = Math.exp(-3 * t);             // erken güçlü, sonra hızlı söner
  const bias = (A.bias);                      // 0..0.4

  let vec = targetVec.map((p,i)=>{
    const fav = (i===favIdx);
    const baseBias = fav ? +bias : -bias/(n-1);
    const noise = (Math.random()-0.5) * 0.25 * (1-t); // erken ±0.125 puan
    const v = p * (1 + baseBias * decay) + noise;
    return Math.max(0.0001, v);
  });
  // normalize
  const s = vec.reduce((a,b)=>a+b,0);
  vec = vec.map(v=> v*100/s);
  // açılış ilerledikçe hedefe çek
  vec = vec.map((v,i)=> v*(1-0.35*t) + targetVec[i]*(0.35*t));
  return { vec, list };
}
function normalizeFavForRound(favId, list){
  if(!favId) return null;
  if(list.some(c=>c.id===favId)) return favId;
  // listedeki ilk adaya kaydır
  return list[0]?.id || null;
}

// === KPI hesapları ===
function computeKpis(openedPct){
  const voters = state.voters;
  const turnout = currentTurnout(openedPct);         // %
  const usedVotes = voters * (turnout/100) * (openedPct/100);
  const validRate = currentValidRate(openedPct);     // %
  const validVotes = usedVotes * (validRate/100);
  const invalidVotes = usedVotes - validVotes;
  const openedCount = Math.round(state.totalSandik * (openedPct/100));
  return { voters, turnout, usedVotes, validRate, validVotes, invalidVotes, openedCount };
}

// === Aktif Tur Bağlamı ===
function getActiveContext(){
  if(state.round2.enabled && state.round2.viewRound===2){
    const pair = getRound2Pair();
    const list = pair.map(id => state.candidates.find(c=>c.id===id)).filter(Boolean);
    const vec = getFinalVector(2); // length 2
    return { list, targetVec: vec };
  }
  // 1. tur
  return { list: state.candidates.slice(), targetVec: getFinalVector(1) };
}

// === Ajans Snapshots ===
function agencySnapshot(key, openedPct){
  const { list, targetVec } = getActiveContext();
  const as = agencyShares(key, openedPct);
  const shares = as.vec;
  const k = computeKpis(openedPct);

  const rows = list.map((c,i)=>{
    const pct = shares[i];
    const votes = k.validVotes * (pct/100);
    return { id:c.id, name:c.name, color:c.color, pct, votes };
  }).sort((a,b)=> b.pct - a.pct);

  const leader = rows[0]?.name || "–";
  const diff = rows.length>=2 ? (rows[0].pct - rows[1].pct) : rows[0]?.pct || 0;
  return { rows, leader, diff, k };
}

// === Panelleri Yenile ===
function renderAgencyPanel(key, snap){
  const kpisEl = (key==="AA") ? $("#aaKpis") : $("#ankaKpis");
  const barsEl = (key==="AA") ? $("#aaBars") : $("#ankaBars");
  const leaderEl = (key==="AA") ? $("#aaLeader") : $("#ankaLeader");

  // Lider değişimi bildirimi
  const ag = state.agencies[key];
  ag.lastLeader = ag.leader;
  ag.leader = snap.leader;
  if(ag.lastLeader && ag.lastLeader !== ag.leader){
    addLog(`${key}: Lider değişti → ${ag.leader}`, "hot");
  }

  // Alarm
  if(snap.diff <= state.alarm.diffThreshold){
    addLog(`${key}: Lider farkı ${fmtPct(snap.diff)} (≤ ${fmtPct(state.alarm.diffThreshold)})`, "hot");
  }

  leaderEl.textContent = `Lider: ${snap.leader} (Fark ${fmtPct(snap.diff)})`;

  kpisEl.innerHTML = `
    <div class="kpi"><div class="lab">Açılan Sandık</div><div class="val">${fmtInt(snap.k.openedCount)}</div></div>
    <div class="kpi"><div class="lab">Sandık Açılışı</div><div class="val">${fmtPct(state.openedPct)}</div></div>
    <div class="kpi"><div class="lab">Katılım</div><div class="val">${fmtPct(snap.k.turnout)}</div></div>
    <div class="kpi"><div class="lab">Geçerli Oy</div><div class="val">${fmtPct(snap.k.validRate)}</div></div>
  `;

  barsEl.innerHTML = "";
  snap.rows.forEach(r=>{
    const wrap = document.createElement("div");
    wrap.className = "bar";
    wrap.innerHTML = `
      <div class="top">
        <div class="name"><span class="swatch" style="background:${r.color}"></span>${r.name}</div>
        <div><strong>${fmtPct(r.pct)}</strong> • ${fmtInt(r.votes)} oy</div>
      </div>
      <div class="track"><div class="fill" style="width:${clamp(r.pct,0,100)}%; background:${r.color}"></div></div>
    `;
    barsEl.appendChild(wrap);
  });
}

// === Geçmiş Kaydı & Grafik ===
function recordHistory(key, snap){
  const arr = state.history[key];
  const opened = Number(state.openedPct.toFixed(2));
  const last = arr[arr.length-1];
  if(!last || last.opened !== opened){
    arr.push({ opened, diff: Number(snap.diff.toFixed(4)) });
    drawGapChart();
  }else{
    last.diff = Number(snap.diff.toFixed(4));
  }
}
function resizeCanvasToDisplaySize(canvas){
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if(canvas.width !== Math.round(width*ratio) || canvas.height !== Math.round(height*ratio)){
    canvas.width = Math.round(width*ratio);
    canvas.height = Math.round(height*ratio);
    return true;
  }
  return false;
}
function drawGapChart(){
  const cvs = $("#chartGap");
  if(!cvs) return;
  resizeCanvasToDisplaySize(cvs);
  const ctx = cvs.getContext("2d");
  const w = cvs.width, h = cvs.height;

  // background
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,w,h);

  // axes
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for(let i=0;i<=10;i++){
    const x = (w-40) * (i/10) + 30;
    ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h-30); ctx.stroke();
  }
  for(let i=0;i<=5;i++){
    const y = (h-50) * (i/5) + 20;
    ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(w-10, y); ctx.stroke();
  }

  // scale
  const maxX = 100; // opened
  const maxY = Math.max(
    2,
    ...state.history.AA.map(p=>p.diff),
    ...state.history.ANKA.map(p=>p.diff)
  ) + 2;

  function mapX(x){ return 30 + (w-40) * (x/maxX); }
  function mapY(y){ return (h-30) - (h-50) * (y/maxY); }

  // draw line
  function drawSeries(points, stroke){
    if(points.length<2) return;
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    points.forEach((p,i)=>{
      const X = mapX(p.opened), Y = mapY(p.diff);
      if(i===0) ctx.moveTo(X,Y); else ctx.lineTo(X,Y);
    });
    ctx.stroke();
  }

  // AA (brand), ANKA (brand2)
  drawSeries(state.history.AA, "#2563eb");
  drawSeries(state.history.ANKA, "#0ea5e9");

  // legend
  ctx.fillStyle = "#0f172a";
  ctx.font = `${14*(window.devicePixelRatio||1)}px ui-sans-serif`;
  ctx.fillText("Lider Farkı (puan) — AA", 40, 18);
  ctx.fillText("— ANKA", 200, 18);
}

// === Panelleri Tazele ===
function refreshPanels(){
  $("#lblOpened").textContent = fmtPct(state.openedPct);
  $("#lblTotalSandik").textContent = fmtInt(state.totalSandik);
  $("#lblOpenedCount").textContent = fmtInt(Math.round(state.totalSandik*(state.openedPct/100)));
  $("#meterFill").style.width = `${state.openedPct}%`;

  const aa = agencySnapshot("AA", state.openedPct);
  const anka = agencySnapshot("ANKA", state.openedPct);
  renderAgencyPanel("AA", aa);
  renderAgencyPanel("ANKA", anka);
  recordHistory("AA", aa);
  recordHistory("ANKA", anka);
}

// === Log ===
function addLog(text, type="info"){
  const time = new Date().toLocaleTimeString("tr-TR",{hour12:false});
  state.logs.push(`[${time}] ${text}`);
  const el = $("#log");
  const div = document.createElement("div");
  div.className = "entry" + (type==="hot" ? " hot" : "");
  div.textContent = `[${time}] ${text}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

// === Açılış Kontrol ===
function setOpenedPct(p){
  const prev = state.openedPct;
  state.openedPct = clamp(Number(p)||0, 0, 100);
  if(Math.floor(prev) !== Math.floor(state.openedPct)){
    addLog(`Sandık açılışı ${fmtPct(state.openedPct)}.`);
  }
  refreshPanels();
  if(state.openedPct>=100 && state.auto.running) toggleAuto(false);
}
function stepBy(delta){ setOpenedPct(state.openedPct + Number(delta||0)); }

// === Otomatik ===
function toggleAuto(run){
  if(run){
    if(state.openedPct>=100) setOpenedPct(0);
    state.auto.running = true;
    loopAuto();
    addLog(`Otomatik: adım ${fmtPct(state.auto.step)}, hız ${state.auto.speed} ms.`);
  }else{
    state.auto.running = false; clearTimeout(state.auto.timer);
    addLog("Otomatik durdu.");
  }
}
function loopAuto(){
  if(!state.auto.running) return;
  stepBy(state.auto.step);
  state.auto.timer = setTimeout(loopAuto, state.auto.speed);
}

// === Export / Import ===
function exportConfig(){
  const data = {
    candidates: state.candidates,
    voters: state.voters,
    turnoutFinal: state.turnoutFinal,
    validRateFinal: state.validRateFinal,
    totalSandik: state.totalSandik,
    targetMode: state.targetMode,
    targetShares: state.targetShares,
    round2: state.round2,
    agencies: { AA:{favId:state.agencies.AA.favId,bias:state.agencies.AA.bias},
                ANKA:{favId:state.agencies.ANKA.favId,bias:state.agencies.ANKA.bias} },
    curves: state.curves,
    alarm: state.alarm
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="secim-sim-konfig.json";
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
}
function importConfig(file){
  const fr = new FileReader();
  fr.onload = ()=>{
    try{
      const obj = JSON.parse(fr.result);
      if(!Array.isArray(obj.candidates) || obj.candidates.length<2) throw new Error("Aday listesi eksik.");
      state.candidates = obj.candidates.slice(0,6);
      state.voters = Number(obj.voters ?? state.voters);
      state.turnoutFinal = Number(obj.turnoutFinal ?? state.turnoutFinal);
      state.validRateFinal = Number(obj.validRateFinal ?? state.validRateFinal);
      state.totalSandik = Number(obj.totalSandik ?? state.totalSandik);
      state.targetMode = !!obj.targetMode;
      state.targetShares = obj.targetShares ?? {};
      state.round2 = Object.assign({enabled:false,mode:"auto",pair:[],targetShares:{},viewRound:1}, obj.round2 || {});
      state.agencies.AA.favId = obj.agencies?.AA?.favId ?? state.candidates[0]?.id ?? null;
      state.agencies.AA.bias  = Number(obj.agencies?.AA?.bias ?? 0.30);
      state.agencies.ANKA.favId = obj.agencies?.ANKA?.favId ?? state.candidates[1]?.id ?? state.candidates[0]?.id ?? null;
      state.agencies.ANKA.bias  = Number(obj.agencies?.ANKA?.bias ?? 0.25);
      state.curves = Object.assign(state.curves, obj.curves||{});
      state.alarm  = Object.assign(state.alarm,  obj.alarm ||{});
      state.openedPct = 0; state.logs=[]; state.history = {AA:[],ANKA:[]};
      renderCandidates(); renderTargetTable(); renderAgencyFavSelectors(); renderR2UI(); syncInputsFromState(); refreshPanels();
      $("#log").innerHTML = ""; addLog("Yapılandırma yüklendi.");
    }catch(e){ alert("JSON yüklenemedi: " + e.message); }
  };
  fr.readAsText(file);
}

// === CSV Dışa Aktarım (Anlık Sonuçlar) ===
function exportCsv(){
  const aa = agencySnapshot("AA", state.openedPct);
  const anka = agencySnapshot("ANKA", state.openedPct);
  const header = "Ajans,Aday,% Oy,Oy Sayısı\n";
  const r = [];
  aa.rows.forEach(row=> r.push(`AA,${row.name},${row.pct.toFixed(2)}%,${Math.round(row.votes)}`));
  anka.rows.forEach(row=> r.push(`ANKA,${row.name},${row.pct.toFixed(2)}%,${Math.round(row.votes)}`));
  const blob = new Blob([header + r.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="sonuclar.csv";
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
}

// === PNG İndir (Grafik) ===
function exportChartPng(){
  const cvs = $("#chartGap");
  const url = cvs.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = "lider-farki-grafik.png";
  document.body.appendChild(a); a.click(); a.remove();
}

// === Input Sync ===
function syncInputsFromState(){
  $("#inpVoters").value = state.voters;
  $("#inpTurnout").value = state.turnoutFinal.toFixed(2);
  $("#inpValidRate").value = state.validRateFinal.toFixed(2);
  $("#inpSandik").value = state.totalSandik;
  $("#chkTargetMode").checked = state.targetMode;
  $("#biasAA").value = Math.round(state.agencies.AA.bias*100);
  $("#biasAAVal").textContent = fmtPct(state.agencies.AA.bias*100);
  $("#biasANKA").value = Math.round(state.agencies.ANKA.bias*100);
  $("#biasANKAVal").textContent = fmtPct(state.agencies.ANKA.bias*100);
  $("#selFavAA").value = state.agencies.AA.favId || "";
  $("#selFavANKA").value = state.agencies.ANKA.favId || "";
  $("#autoStepVal").textContent = fmtPct(state.auto.step);
  $("#autoSpeedVal").textContent = `${state.auto.speed} ms`;
  $("#diffAlarm").value = state.alarm.diffThreshold.toFixed(2);
  $("#curveTurnout").value = state.curves.turnout;
  $("#curveValid").value = state.curves.valid;

  $("#r2Enabled").checked = state.round2.enabled;
  $$('input[name="r2mode"]').forEach(r=> r.checked = (r.value===state.round2.mode));
  document.querySelector("#btnViewR1").classList.toggle("active", state.round2.viewRound===1);
  document.querySelector("#btnViewR2").classList.toggle("active", state.round2.viewRound===2);
}

// === Sıfırla ===
function hardReset(){
  Object.assign(state, {
    candidates: [], voters: 60000000, turnoutFinal: 85.0, validRateFinal: 98.0, totalSandik: 200000,
    openedPct: 0, targetMode:false, targetShares:{},
    round2: {enabled:false,mode:"auto",pair:[],targetShares:{},viewRound:1},
    agencies: { AA:{favId:null,bias:0.30,leader:null,lastLeader:null}, ANKA:{favId:null,bias:0.25,leader:null,lastLeader:null} },
    curves: { turnout:"balanced", valid:"balanced" },
    auto: { running:false, step:1.0, speed:600, timer:null },
    alarm: { diffThreshold: 1.5 },
    history: {AA:[],ANKA:[]},
    logs:[]
  });
  $("#log").innerHTML = "";
  addDefaultCandidates(); renderCandidates(); renderTargetTable(); renderAgencyFavSelectors(); renderR2UI(); syncInputsFromState(); refreshPanels();
  addLog("Simülasyon sıfırlandı.");
}

// === Klavye Kısayolları ===
//function onKey(e){
  //if(e.key==="a" || e.key==="A"){ toggleAuto(!state.auto.running); }
 // if(e.key==="+"){ stepBy(1); }
  //if(e.key==="r" || e.key==="R"){ hardReset(); }
//}

// === Olaylar ===
document.addEventListener("DOMContentLoaded", ()=>{
  // Başlangıç
  addDefaultCandidates(); renderCandidates(); renderTargetTable(); renderAgencyFavSelectors(); renderR2UI(); syncInputsFromState(); refreshPanels();
  addLog("Hoş geldin! Adayları/parametreleri ayarla, sonra sandık açılışını başlat. (Kısayollar: A=Otomatik, +=%1, R=Sıfırla)");

  // Aday ekle
  $("#btnAddCandidate").addEventListener("click", ()=>{
    const name = ($("#candidateName").value || "").trim() || `Aday ${state.candidates.length+1}`;
    const color = $("#candidateColor").value || "#2563eb";
    addCandidate(name, color); $("#candidateName").value="";
  });

  // Genel parametreler
  $("#inpVoters").addEventListener("input", e=>{ state.voters = Number(e.target.value||0); refreshPanels(); });
  $("#inpTurnout").addEventListener("input", e=>{ state.turnoutFinal = clamp(Number(e.target.value||0),0,100); refreshPanels(); });
  $("#inpValidRate").addEventListener("input", e=>{ state.validRateFinal = clamp(Number(e.target.value||0),0,100); refreshPanels(); });
  $("#inpSandik").addEventListener("input", e=>{ state.totalSandik = Number(e.target.value||0); refreshPanels(); });

  // Hedef modu (1. Tur)
  $("#chkTargetMode").addEventListener("change", e=>{ state.targetMode = e.target.checked; renderTargetTable(); refreshPanels(); });
  $("#btnRandomize").addEventListener("click", ()=> randomFinal());
  $("#btnNormalize").addEventListener("click", ()=>{
    const sum = state.candidates.reduce((a,c)=> a + (Number(state.targetShares[c.id]||0)), 0);
    if(sum<=0){
      const even = 100 / state.candidates.length;
      state.candidates.forEach(c=> state.targetShares[c.id] = even);
    }else{
      state.candidates.forEach(c=> state.targetShares[c.id] = (Number(state.targetShares[c.id]||0))*100/sum);
    }
    renderTargetTable(); addLog("Hedef yüzdeler normalize edildi (%100)."); refreshPanels();
  });

  // Ajans ayarları
  $("#selFavAA").addEventListener("change", e=>{ state.agencies.AA.favId = e.target.value; refreshPanels(); });
  $("#selFavANKA").addEventListener("change", e=>{ state.agencies.ANKA.favId = e.target.value; refreshPanels(); });
  $("#biasAA").addEventListener("input", e=>{ const v=Number(e.target.value); state.agencies.AA.bias=v/100; $("#biasAAVal").textContent=fmtPct(v); refreshPanels(); });
  $("#biasANKA").addEventListener("input", e=>{ const v=Number(e.target.value); state.agencies.ANKA.bias=v/100; $("#biasANKAVal").textContent=fmtPct(v); refreshPanels(); });

  // 2. Tur
  $("#r2Enabled").addEventListener("change", e=>{ state.round2.enabled = e.target.checked; if(state.round2.enabled) deriveRound2FromRound1(); renderR2UI(); refreshPanels(); });
  $$('input[name="r2mode"]').forEach(r=> r.addEventListener("change", e=>{
    state.round2.mode = e.target.value; renderR2UI(); refreshPanels();
  }));
  $("#r2c1").addEventListener("change", e=>{ state.round2.pair[0] = e.target.value; renderR2UI(); refreshPanels(); });
  $("#r2c2").addEventListener("change", e=>{ state.round2.pair[1] = e.target.value; renderR2UI(); refreshPanels(); });
  $("#btnR2Normalize").addEventListener("click", ()=>{
    const pair = getRound2Pair();
    const sum = pair.reduce((a,id)=> a + (Number(state.round2.targetShares[id]||0)), 0);
    if(sum<=0){ pair.forEach(id=> state.round2.targetShares[id] = 50); }
    else { pair.forEach(id=> state.round2.targetShares[id] = (Number(state.round2.targetShares[id]||0))*100/sum); }
    renderR2UI(); addLog("2. Tur hedef yüzdeler normalize edildi (%100)."); refreshPanels();
  });
  $("#btnViewR1").addEventListener("click", ()=>{ state.round2.viewRound=1; syncInputsFromState(); refreshPanels(); });
  $("#btnViewR2").addEventListener("click", ()=>{ if(state.round2.enabled){ state.round2.viewRound=2; syncInputsFromState(); refreshPanels(); } });

  // Alarm & Eğriler
  $("#diffAlarm").addEventListener("input", e=>{ state.alarm.diffThreshold = clamp(Number(e.target.value||0),0,20); });
  $("#curveTurnout").addEventListener("change", e=>{ state.curves.turnout = e.target.value; refreshPanels(); });
  $("#curveValid").addEventListener("change", e=>{ state.curves.valid = e.target.value; refreshPanels(); });

  // Manuel adımlar
  $$(".btn.step").forEach(b=> b.addEventListener("click", ()=> stepBy(Number(b.dataset.step))));
  $("#btnCustomStep").addEventListener("click", ()=>{
    const v = parseFloat($("#customStep").value||"0"); if(!isFinite(v)||v<=0) return; stepBy(v);
  });

  // Otomatik
  $("#autoStep").addEventListener("input", e=>{ state.auto.step = Number(e.target.value); $("#autoStepVal").textContent = fmtPct(state.auto.step); });
  $("#autoSpeed").addEventListener("input", e=>{ state.auto.speed = Number(e.target.value); $("#autoSpeedVal").textContent = `${state.auto.speed} ms`; });
  $("#btnAutoStart").addEventListener("click", ()=> toggleAuto(true));
  $("#btnAutoPause").addEventListener("click", ()=> toggleAuto(false));

  // Export / Import / Reset
  $("#btnExport").addEventListener("click", exportConfig);
  $("#fileImport").addEventListener("change", e=>{ const f=e.target.files?.[0]; if(f) importConfig(f); e.target.value=""; });
  $("#btnReset").addEventListener("click", hardReset);

  // Grafikler & CSV
  $("#btnChartPng").addEventListener("click", exportChartPng);
  $("#btnExportCsv").addEventListener("click", exportCsv);

  // Kısayollar
  document.addEventListener("keydown", onKey);
  // İlk çizim için canvas boyutu
  window.addEventListener("resize", drawGapChart);
});

// === İlk çizim gecikmesiz ===
window.addEventListener("load", drawGapChart);
