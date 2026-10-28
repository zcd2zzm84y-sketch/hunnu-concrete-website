import {DEPTS,FAMILY,KMAP,COMP,ANCHOR,PULSE,MIN_GROUP} from "./data.mjs";
import {$,esc,avg,fmtDate,mmss,lvl,initials,setBand,gauge,radarMulti} from "./ui.mjs";

const KEY="hunnu-admin-key";
let key=(()=>{try{return sessionStorage.getItem(KEY)||""}catch(e){return""}})();
let staff=[],pulse=null,selS=null,deptFilter="",msg="",view="staff";

async function api(method,body){
  const res=await fetch("/api/admin",{method,headers:{"x-admin-key":key,"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await res.json().catch(()=>({}));
  if(res.status===401){key="";try{sessionStorage.removeItem(KEY)}catch(e){}throw Object.assign(new Error(j.error||"Нууц үг буруу"),{auth:true})}
  if(!res.ok)throw new Error(j.error||("HTTP "+res.status));
  return j;
}
async function load(){
  try{const j=await api("GET");staff=j.staff;pulse=j.pulse;msg="";if(!selS&&staff.length)selS=staff[0].id;render()}
  catch(e){if(e.auth)return login(e.message);msg="Ачаалж чадсангүй: "+e.message;render()}
}
function login(err){
  setBand("HR","самбар.","Хүннү Конкрет ХХК-ийн ажилтны үнэлгээний нэгдсэн үр дүн.");
  $("#view").innerHTML=`<div class="gate">
    <aside class="gate-side concrete">
      <div class="gate-kicker">Building Smarter.</div>
      <h2>Ажилтан бүрийн<br><span>чадварыг нэг дороос.</span></h2>
      <ol class="gate-list">
        <li><b>01</b><div><strong>Ажилтны паспорт</strong><small>Мэдлэгийн оноо, ур чадварын радар, удирдлагын үнэлгээ</small></div></li>
        <li><b>02</b><div><strong>Сэтгэл ханамж</strong><small>Нэргүй нэгдсэн дүн, eNPS, албаар харьцуулалт</small></div></li>
        <li><b>03</b><div><strong>Хөгжлийн төлөвлөгөө</strong><small>Сургалтын хэрэгцээ, 6 сарын төлөвлөгөө, тэмдэглэл</small></div></li>
      </ol>
    </aside>
    <form class="gate-form" id="fLogin" novalidate>
      <div class="gate-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
      <h2>Нэвтрэх</h2>
      <p class="muted">Зөвхөн Хүний нөөцийн алба болон удирдлагад зориулсан хэсэг.</p>
      <label class="f">Нууц үг
        <span class="pw"><input type="password" id="pw" autocomplete="current-password" required aria-invalid="${err?"true":"false"}"${err?' aria-describedby="pwErr"':""}><button type="button" id="pwShow" aria-label="Нууц үгийг харуулах" aria-pressed="false">Харах</button></span></label>
      ${err?`<div class="err" id="pwErr" role="alert">${esc(err)}</div>`:""}
      <button class="primary gate-go" type="submit">Нэвтрэх <span aria-hidden="true">→</span></button>
      <p class="gate-note">Нууц үг зөвхөн энэ таб нээлттэй байх хугацаанд хадгалагдана. Дундын компьютер дээр ажлаа дуусгаад табаа хаана уу.</p>
    </form>
  </div>`;
  $("#pwShow").onclick=e=>{const i=$("#pw"),on=i.type==="password";i.type=on?"text":"password";e.target.textContent=on?"Нуух":"Харах";e.target.setAttribute("aria-pressed",String(on));i.focus()};
  $("#fLogin").onsubmit=e=>{e.preventDefault();const v=$("#pw").value.trim();if(!v){$("#pw").focus();return}key=v;try{sessionStorage.setItem(KEY,key)}catch(e){}const b=e.target.querySelector(".gate-go");b.disabled=true;b.textContent="Шалгаж байна…";load()};
  $("#pw").focus();
}
function tabs(cur){
  return `<div class="row spread"><nav class="tabs" aria-label="Үр дүнгийн хэсэг">${[["staff","Ажилтны паспорт"],["pulse","Сэтгэл ханамж"]].map(([v,t])=>`<button type="button" data-view="${v}" ${v===cur?'aria-current="page"':""}>${t}</button>`).join("")}</nav><button type="button" id="reload">Шинэчлэх</button></div>`;
}
function render(){
  if(view==="pulse")renderPulse();else renderStaffHr();
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
  const r=$("#reload");if(r)r.onclick=()=>{r.disabled=true;load()};
}
const renderAll=render;

const kPct=s=>s.max?Math.round(s.score/s.max*100):0;
const selfAvg=s=>avg(COMP.map(c=>s.self?.[c.id]).filter(Boolean));
const mgrAvg=s=>avg(COMP.map(c=>s.mgr?.[c.id]).filter(Boolean));
function renderStaffHr(keepEdits){
  setBand("Ажилтны","паспорт.","Мэдлэгийн оноо, ур чадварын өөрийн ба удирдлагын үнэлгээ, сургалтын хэрэгцээ.");
  
  const list=staff.filter(s=>!deptFilter||s.dept===deptFilter);
  const cur=staff.find(s=>s.id===selS);
  const trainCount={};list.forEach(s=>(s.train||[]).forEach(t=>trainCount[t]=(trainCount[t]||0)+1));
  const topTrain=Object.entries(trainCount).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const depts=Object.keys(DEPTS).map(d=>{const g=staff.filter(s=>s.dept===d);return{d,n:g.length,k:g.length?Math.round(avg(g.map(kPct))):null,sa:g.length?avg(g.map(selfAvg)):null}}).filter(x=>x.n);
  $("#view").innerHTML=`<div class="stack" style="gap:24px">
    ${tabs("staff")}
    <div class="stats">
      <div><b>${list.length}</b><strong>Бөглөсөн</strong><span>${esc(deptFilter)||"бүх алба"}</span></div>
      <div><b>${list.length?Math.round(avg(list.map(kPct)))+"%":"—"}</b><strong>Мэдлэгийн дундаж</strong><span>нийтлэг + ажлын</span></div>
      <div><b>${list.length?avg(list.map(selfAvg)).toFixed(1):"—"}</b><strong>Өөрийн үнэлгээ</strong><span>ур чадвар, 5-аас</span></div>
      <div><b>${list.filter(s=>COMP.every(c=>s.mgr?.[c.id])).length}</b><strong>Удирдлага үнэлсэн</strong><span>${list.length} ажилтнаас</span></div>
    </div>
    ${depts.length?`<div class="sheet stack"><div class="tag"><b>01</b>Албаар</div><div class="deptbars">${depts.map(x=>`<button type="button" class="db ${deptFilter===x.d?"on":""}" data-dept="${esc(x.d)}"><span>${esc(x.d)} <small>${x.n} хүн</small></span><span class="t"><i style="width:${x.k}%"></i></span><span class="v">${x.k}%</span></button>`).join("")}</div>
      ${topTrain.length?`<div class="muted" style="font-size:15px">Хамгийн их хүссэн сургалт: ${topTrain.map(([t,n])=>`<b style="color:var(--fg)">${esc(t)}</b> (${n})`).join(", ")}</div>`:""}</div>`:""}
    ${msg?`<div class="err">${esc(msg)}</div>`:""}
    <div class="hr">
      <aside class="stack" style="gap:12px">
        <div class="tag"><b>02</b>Ажилтнууд</div>
        <label class="f">Албаар шүүх<select id="df"><option value="">Бүгд</option>${Object.keys(DEPTS).map(d=>`<option ${d===deptFilter?"selected":""}>${d}</option>`).join("")}</select></label>
        <div class="plist">${list.length?list.map(s=>{const k=kPct(s),L=lvl(k);return `<button type="button" class="pcard ${s.id===selS?"on":""}" data-id="${esc(s.id)}">
          <span class="pc-main"><b>${esc(s.name)}</b><small>${esc(s.position)}</small><small class="lvl">${esc(s.dept)}</small></span>
          <span class="pc-score"><b>${k}%</b></span><span class="pc-pill">${COMP.every(c=>s.mgr?.[c.id])?'<span class="pill good">Удирдлага үнэлсэн</span>':'<span class="pill idle">Удирдлагын үнэлгээ дутуу</span>'}</span>
          <span class="pc-bar"><i style="width:${k}%"></i></span></button>`}).join(""):`<div class="sheet empty">Одоогоор бөглөсөн ажилтан алга. Ажилчдад үнэлгээний холбоос эсвэл QR кодыг илгээнэ үү.</div>`}</div>
      </aside>
      <div id="detail">${cur?staffPassport(cur):`<div class="sheet empty">Паспортыг харах ажилтнаа сонгоно уу.</div>`}</div>
    </div></div>`;
  $("#df").onchange=e=>{deptFilter=e.target.value;renderAll()};
  document.querySelectorAll("[data-dept]").forEach(b=>b.onclick=()=>{deptFilter=deptFilter===b.dataset.dept?"":b.dataset.dept;renderAll()});
  document.querySelectorAll(".pcard").forEach(b=>b.onclick=()=>{selS=b.dataset.id;renderAll();if(window.innerWidth<920)$("#detail").scrollIntoView({behavior:"smooth"})});
  if(cur)bindStaff(cur);
}
function staffPassport(s){
  const k=kPct(s);const sv=COMP.map(c=>(s.self?.[c.id]||0)/5),mv=COMP.map(c=>(s.mgr?.[c.id]||0)/5);
  const gaps=COMP.filter(c=>s.self?.[c.id]&&s.mgr?.[c.id]&&Math.abs(s.self[c.id]-s.mgr[c.id])>=2);
  const bp=s.byPart||{};const pp=x=>x&&x.t?Math.round(x.c/x.t*100):0;
  const qids=s.questions||[];const wrong=qids.map(id=>KMAP[id]).filter(q=>q&&s.answers?.[q.id]!==q.a);
  const devNeeds=COMP.filter(c=>(s.mgr?.[c.id]||s.self?.[c.id]||5)<=2).map(c=>c.t);
  return `<article class="passport">
    <header class="pp-head"><div class="pp-id"><span class="avatar">${esc(initials(s.name))}</span><div style="min-width:0"><div class="pp-kicker">Ажилтны паспорт · ${"HS-"+String(s.id).slice(-8).toUpperCase()}</div><h2>${esc(s.name)}</h2><div class="pp-meta">${esc(s.position)} · ${esc(s.dept)}</div></div></div>
      <div class="pp-total"><div class="big">${k}%</div><span class="pill ${lvl(k).k}">Мэдлэг: ${lvl(k).t}</span></div></header>
    <dl class="pp-facts"><div><dt>Ажилласан</dt><dd>${esc(s.tenure)}</dd></div><div><dt>Ажлын бүлэг</dt><dd>${esc(FAMILY[s.family]||"—")}</dd></div><div><dt>Огноо</dt><dd>${fmtDate(s.submittedAt)}</dd></div><div><dt>Зарцуулсан</dt><dd>${mmss(s.durationSec||0)}</dd></div></dl>
    ${(s.durationSec||0)<240?`<div class="flags"><div class="flag bad">Хэт богино хугацаанд (${mmss(s.durationSec||0)}) бөглөсөн. Хариулт бодит бус байж болзошгүй.</div></div>`:""}
    <section class="pp-sec"><div class="tag"><b>A</b>Мэдлэг</div>
      <div class="gauges">${gauge(pp(bp.common),(bp.common?.c||0)+"/"+(bp.common?.t||0),"Нийтлэг мэдлэг")}${gauge(pp(bp.job),(bp.job?.c||0)+"/"+(bp.job?.t||0),"Ажлын мэдлэг")}${gauge(k,s.score+"/"+s.max,"Нийт")}</div></section>
    <section class="pp-sec"><div class="tag"><b>B</b>Ур чадвар: өөрийн ба удирдлагын үнэлгээ</div>
      <div class="pp-grid"><div class="radarbox">${radarMulti(COMP.map(c=>c.t.split(/[ ,]/)[0]),[{vals:sv,fill:"var(--accent)",op:.3,stroke:"var(--fg)"},{vals:mv,fill:"none",op:0,stroke:"var(--good)",dash:1}])}
        <div class="legend2"><span><i style="background:var(--accent)"></i>Өөрийн үнэлгээ</span><span><i style="border:2px dashed var(--good)"></i>Удирдлагын үнэлгээ</span></div></div>
      <div class="mgr-list">${COMP.map(c=>`<div class="mg"><div><b>${c.t}</b><small>Өөрөө: ${s.self?.[c.id]||"—"} · ${ANCHOR[s.self?.[c.id]||0]||""}</small></div><div class="score5">${[1,2,3,4,5].map(n=>`<button type="button" data-c="${c.id}" data-n="${n}" class="${s.mgr?.[c.id]===n?"on":""}" title="${ANCHOR[n]}">${n}</button>`).join("")}</div></div>`).join("")}</div></div>
      <p class="muted" style="font-size:14px;margin:0">Баруун талын товчоор шууд удирдлагын үнэлгээг (1–5) оруулна.</p>
      ${gaps.length?`<div class="flag warn">Өөрийн ба удирдлагын үнэлгээ 2-оос дээш зөрсөн: ${esc(gaps.map(c=>c.t).join(", "))}. Ярилцлагаар тодруулна уу.</div>`:""}
    </section>
    <section class="pp-sec"><div class="tag"><b>C</b>Хөгжлийн хэрэгцээ</div>
      <div class="sw"><div><h3>Хүссэн сургалт</h3><p>${(s.train||[]).length||s.trainOther?esc([...(s.train||[]),s.trainOther].filter(Boolean).join(", ")):"Сонгоогүй"}</p></div>
      <div><h3>Сул ур чадвар (≤2)</h3><p>${devNeeds.length?esc(devNeeds.join(", ")):"Алга"}</p></div></div>
      <label class="f">Хөгжлийн төлөвлөгөө (дараагийн 6 сар)<textarea id="sPlan" style="min-height:70px">${esc(s.plan||"")}</textarea></label>
      <label class="f">Тэмдэглэл<textarea id="sNote" style="min-height:60px">${esc(s.hrNote||"")}</textarea></label>
      <div class="row"><button type="button" class="primary" id="sSave">Хадгалах</button><span id="sMsg" class="muted" style="font-size:15px" aria-live="polite"></span></div></section>
    <details class="pp-sec"><summary>Буруу хариулсан асуултууд (${wrong.length})</summary><div class="ansl">${wrong.map(q=>{const a=s.answers?.[q.id];return `<div>${esc(q.q)}<small>Хариулт: ${a===undefined?"хариулаагүй":esc(q.o[a])}</small><small>Зөв: ${esc(q.o[q.a])}</small></div>`}).join("")||'<div class="ok">Бүгд зөв.</div>'}</div></details>
    <div class="row pp-sec" id="sDelRow" style="flex-direction:row"><button type="button" class="danger" id="sDel">Устгах</button></div>
  </article>`;
}

function bindStaff(s){
  const save=async patch=>{try{const j=await api("POST",{action:"update",id:s.id,patch});Object.assign(s,j.row);return true}catch(e){if(e.auth)return login(e.message);$("#sMsg").textContent="Хадгалж чадсангүй: "+e.message;return false}};
  document.querySelectorAll(".mgr-list [data-c]").forEach(b=>b.onclick=async()=>{if(await save({mgr:{...(s.mgr||{}),[b.dataset.c]:+b.dataset.n}})){const y=window.scrollY;renderAll();window.scrollTo(0,y)}});
  $("#sSave").onclick=async()=>{if(await save({plan:$("#sPlan").value,hrNote:$("#sNote").value}))$("#sMsg").textContent="Хадгалагдлаа."};
  $("#sDel").onclick=()=>{$("#sDelRow").innerHTML=`<span style="font-size:14px">${esc(s.name)}-ийн үнэлгээг устгах уу?</span><button type="button" class="danger" id="sYes">Тийм, устгах</button><button type="button" id="sNo">Болих</button>`;
    $("#sNo").onclick=()=>renderAll();
    $("#sYes").onclick=async()=>{try{await api("POST",{action:"delete",id:s.id});staff=staff.filter(x=>x.id!==s.id);selS=null;renderAll()}catch(e){$("#sMsg").textContent="Устгаж чадсангүй: "+e.message}}};
}
function renderPulse(){
  setBand("Сэтгэл","ханамж.","Нэргүй хариултын нэгдсэн дүн. "+MIN_GROUP+"-аас цөөн хүнтэй бүлгийг нууцлалын үүднээс харуулахгүй.");
  const P=pulse||{n:0,hidden:true};const heat=v=>v===null||v===undefined?"":v>=70?"good":v>=50?"warn":"bad";
  $("#view").innerHTML=`<div class="stack" style="gap:24px">${tabs("pulse")}
  ${P.hidden?`<div class="sheet empty">Одоогоор ${P.n} хариулт ирсэн. ${MIN_GROUP}-аас дээш хариулт ирмэгц нэгдсэн дүн гарна.</div>`:`
  <div class="stats">
    <div><b>${P.n}</b><strong>Хариулт</strong><span>нэргүй</span></div>
    <div><b>${P.enps>0?"+":""}${P.enps}</b><strong>eNPS</strong><span>санал болгох индекс (−100…+100)</span></div>
    <div><b>${P.overall}%</b><strong>Ерөнхий ханамж</strong><span>4–5 гэж хариулсан хувь</span></div>
    <div><b>${P.stay}%</b><strong>Үлдэх хүсэл</strong><span>1 жилийн дараа ч энд</span></div>
  </div>
  <div class="sheet stack"><div class="tag"><b>01</b>Чиглэлээр</div>
    <div class="deptbars">${[...P.byGroup].sort((a,b)=>a.v-b.v).map(x=>`<div class="db"><span>${esc(x.g)}</span><span class="t"><i style="width:${x.v}%;background:var(--${heat(x.v)})"></i></span><span class="v">${x.v}%</span></div>`).join("")}</div>
    <p class="muted" style="font-size:14px;margin:0">4–5 гэж хариулсан хувь. 70%+ сайн, 50–69% анхаарах, 50%-иас доош эрсдэлтэй.</p>
    <details><summary>Асуулт тус бүрээр</summary><div class="deptbars">${P.byItem.map(x=>`<div class="db"><span>${esc(x.t)}</span><span class="t"><i style="width:${x.v}%;background:var(--${heat(x.v)})"></i></span><span class="v">${x.v}%</span></div>`).join("")}</div></details></div>
  <div class="sheet stack"><div class="tag"><b>02</b>Алба × чиглэл</div>
    <div class="heatbox"><table class="heat"><thead><tr><th>Алба</th><th class="num">n</th>${P.groups.map(g=>`<th class="num">${esc(g.split(/[ ,]/)[0])}</th>`).join("")}<th class="num">eNPS</th></tr></thead>
    <tbody>${P.depts.map(x=>x.hidden?`<tr><td>${esc(x.d)}</td><td class="num">${x.n}</td><td colspan="${P.groups.length+1}" class="muted">Нууцлалын үүднээс харуулахгүй (${MIN_GROUP}-аас цөөн)</td></tr>`:`<tr><td>${esc(x.d)}</td><td class="num">${x.n}</td>${x.groups.map(v=>`<td class="num"><span class="hc ${heat(v)}">${v}%</span></td>`).join("")}<td class="num">${x.enps}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="sheet stack"><div class="tag"><b>03</b>Ажлаас гарах боломжит шалтгаан</div>
    <div class="deptbars">${Object.entries(P.leave).sort((a,b)=>b[1]-a[1]).map(([l,c])=>`<div class="db"><span>${esc(l)}</span><span class="t"><i style="width:${c/P.n*100}%"></i></span><span class="v">${c}</span></div>`).join("")||'<span class="muted">Хариулт алга</span>'}</div></div>
  <div class="sheet stack"><div class="tag"><b>04</b>Ажилчдын санал</div>
    <div class="comments">${P.comments.map(c=>`<blockquote class="cm ${c.k}"><small>${c.k==="like"?"Таалагддаг":"Өөрчлөх"}</small>${esc(c.t)}</blockquote>`).join("")||'<span class="muted">Санал алга</span>'}</div></div>`}
  </div>`;
}

if(key){$("#view").innerHTML='<p class="muted">Ачаалж байна…</p>';load()}else login();
