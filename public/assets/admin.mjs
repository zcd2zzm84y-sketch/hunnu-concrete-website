import {DEPTS,FAMILY,COMP,ANCHOR,PULSE,MIN_GROUP,PROX,proximity} from "./data.mjs";
import {interviewGuide,stageGuide,REJECT,assess} from "./interview.mjs";
import {$,esc,avg,fmtDate,mmss,lvl,initials,setBand,gauge,radarMulti} from "./ui.mjs";

const KEY="hunnu-admin-key";
let key=(()=>{try{return sessionStorage.getItem(KEY)||""}catch(e){return""}})();
let staff=[],pulse=null,apps=[],bank={},openings=[],editOpen=false,selS=null,selA=null,appFilter="",deptFilter="",msg="",view=["staff","pulse","app"].includes(location.hash.slice(1))?location.hash.slice(1):"staff";

async function api(method,body){
  const res=await fetch("api/admin",{method,headers:{"x-admin-key":key,"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await res.json().catch(()=>({}));
  if(res.status===401){key="";try{sessionStorage.removeItem(KEY)}catch(e){}throw Object.assign(new Error(j.error||"Нууц үг буруу"),{auth:true})}
  if(!res.ok)throw new Error(j.error||("HTTP "+res.status));
  return j;
}
async function load(){
  try{const j=await api("GET");staff=j.staff;pulse=j.pulse;apps=j.applicants||[];bank=j.bank||{};openings=j.openings||[];msg="";if(!selS&&staff.length)selS=staff[0].id;if(!selA&&apps.length)selA=apps[0].id;render()}
  catch(e){if(e.auth)return login(e.message);msg="Ачаалж чадсангүй: "+e.message;render()}
}
// Forget the password in this tab and drop loaded data from memory
function logout(){key="";try{sessionStorage.removeItem(KEY)}catch(e){}staff=[];pulse=null;apps=[];bank={};openings=[];editOpen=false;selS=selA=null;view="staff";login()}
function login(err){
  setBand("HR","самбар.","Хүннү Конкрет ХХК-ийн ажилтны үнэлгээний нэгдсэн үр дүн.");
  $("#view").innerHTML=`<div class="gate">
    <aside class="gate-side concrete">
      <div class="gate-kicker">Building Smarter.</div>
      <h2>Ажилтан бүрийн<br><span>чадварыг нэг дороос.</span></h2>
      <ol class="gate-list">
        <li><b>01</b><div><strong>Ажилтны паспорт</strong><small>Мэдлэгийн оноо, ур чадварын радар, удирдлагын үнэлгээ</small></div></li>
        <li><b>02</b><div><strong>Сэтгэл ханамж</strong><small>Нэргүй нэгдсэн дүн, компанийг санал болгох индекс, албадын харьцуулалт</small></div></li>
        <li><b>03</b><div><strong>Горилогчид</strong><small>Ажлын анкет, мэдлэгийн шалгалт, ажилд авах шийдвэр</small></div></li>
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
  if(matchMedia("(hover:hover)").matches)$("#pw").focus();
}
function tabs(cur){
  return `<div class="row spread"><nav class="tabs" aria-label="Үр дүнгийн хэсэг">${[["staff","Ажилтны паспорт"],["pulse","Сэтгэл ханамж"],["app","Горилогчид"+(apps.some(a=>a.status==="new")?" ("+apps.filter(a=>a.status==="new").length+")":"")]].map(([v,t])=>`<button type="button" data-view="${v}" ${v===cur?'aria-current="page"':""}>${t}</button>`).join("")}</nav><div class="row">${cur!=="pulse"?`<button type="button" id="xls">Excel татах</button>`:""}<button type="button" id="reload">Шинэчлэх</button><button type="button" id="logout">Гарах</button></div></div>`;
}
function render(){
  if(view==="pulse")renderPulse();else if(view==="app")renderApps();else renderStaffHr();
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;history.replaceState(null,"","#"+view);render()});
  const r=$("#reload");if(r)r.onclick=()=>{r.disabled=true;load()};
  const o=$("#logout");if(o)o.onclick=logout;
  const x=$("#xls");if(x)x.onclick=()=>view==="app"?exportApps():exportStaff();
  const pr=$("#print");if(pr)pr.onclick=()=>{document.querySelectorAll("#detail details").forEach(d=>d.open=true);window.print()};
}
// CSV with a UTF-8 BOM so Excel shows Cyrillic correctly
function download(name,rows){
  const cell=v=>{const t=v==null?"":String(v);return /[",\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
  const blob=new Blob(["\ufeff"+rows.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name+"-"+new Date().toISOString().slice(0,10)+".csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
const pctOf=x=>x&&x.t?Math.round(x.c/x.t*100):"";
const PXT={top:"Маш ойр",near:"Ойр",mid:"Дунд",far:"Хол"};
function exportApps(){
  const head=["Илгээсэн","Нэр","Утас","И-мэйл","Алба","Албан тушаал","Төрсөн он","Боловсрол","Мэргэжил","Туршлага","Сүүлийн ажил","Дүүрэг","Хороо","Байршил","Үйлдвэр 2.0-д","Шалгалт %","Ерөнхий %","Мэргэжлийн %","Шалгалтын хугацаа","Зөвлөмж","Зөвлөмжийн оноо","Төлөв","Ярилцлага: сайн/дунд/сул","Цалингийн хүлээлт","Ажиллах огноо","Жолооны ангилал","HR тэмдэглэл"];
  download("gorilogchid",[head,...apps.map(a=>{const r=assess(a),ia=Object.values(a.iAns||{}),n=k=>ia.filter(x=>x.r===k).length;return [fmtDate(a.submittedAt),a.name,a.phone,a.email,a.dept,a.position,a.birthYear,a.edu,a.major,a.exp,a.lastJob,a.district,a.khoroo,a.area,PXT[proximity(a.district,a.area)]||"",kPct(a),pctOf(a.byPart?.common),pctOf(a.byPart?.job),mmss(a.durationSec||0),r.verdict,r.score,(STATUS[a.status]||STATUS.new)[0],n(3)+"/"+n(2)+"/"+n(1),a.salary,a.startDate,(a.license||[]).join(" "),a.hrNote]})]);
}
function exportStaff(){
  const head=["Илгээсэн","Нэр","Алба","Албан тушаал","Ажилласан","Мэдлэг %","Өөрийн үнэлгээ (дундаж)","Удирдлагын үнэлгээ (дундаж)",...COMP.flatMap(c=>[c.t+" (өөрөө)",c.t+" (удирдлага)"]),"Сургалтын хэрэгцээ","Хөгжлийн төлөвлөгөө"];
  const r1=v=>v?Math.round(v*10)/10:"";
  download("ajiltnii-unelgee",[head,...staff.map(s=>[fmtDate(s.submittedAt),s.name,s.dept,s.position,s.tenure,kPct(s),r1(avg(COMP.map(c=>s.self?.[c.id]).filter(Boolean))),r1(mgrAvg(s)),...COMP.flatMap(c=>[s.self?.[c.id]||"",s.mgr?.[c.id]||""]),[...(s.train||[]),s.trainOther].filter(Boolean).join("; "),s.plan])]);
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
        <button type="button" id="rpt" class="${selS==="report"?"primary":""}">${selS==="report"?"Тайланг хаах":"Албаны тайлан"}</button>
        <div class="tag"><b>02</b>Ажилтнууд</div>
        <label class="f">Албаар шүүх<select id="df"><option value="">Бүгд</option>${Object.keys(DEPTS).map(d=>`<option ${d===deptFilter?"selected":""}>${d}</option>`).join("")}</select></label>
        <div class="plist">${list.length?list.map(s=>{const k=kPct(s),L=lvl(k);return `<button type="button" class="pcard ${s.id===selS?"on":""}" data-id="${esc(s.id)}">
          <span class="pc-main"><b>${esc(s.name)}</b><small>${esc(s.position)}</small><small class="lvl">${esc(s.dept)}</small></span>
          <span class="pc-score"><b>${k}%</b></span><span class="pc-pill">${COMP.every(c=>s.mgr?.[c.id])?'<span class="pill good">Удирдлага үнэлсэн</span>':'<span class="pill idle">Удирдлагын үнэлгээ дутуу</span>'}</span>
          <span class="pc-bar"><i style="width:${k}%"></i></span></button>`}).join(""):`<div class="sheet empty">Одоогоор бөглөсөн ажилтан алга. Ажилчдад үнэлгээний холбоос эсвэл QR кодыг илгээнэ үү.</div>`}</div>
      </aside>
      <div id="detail">${selS==="report"?deptReport(list):cur?staffPassport(cur):`<div class="sheet empty">Паспортыг харах ажилтнаа сонгоно уу.</div>`}</div>
    </div></div>`;
  $("#rpt").onclick=()=>{selS=selS==="report"?(staff[0]?.id||null):"report";renderAll()};
  $("#df").onchange=e=>{deptFilter=e.target.value;renderAll()};
  document.querySelectorAll("[data-dept]").forEach(b=>b.onclick=()=>{deptFilter=deptFilter===b.dataset.dept?"":b.dataset.dept;renderAll()});
  document.querySelectorAll(".pcard").forEach(b=>b.onclick=()=>{selS=b.dataset.id;renderAll();if(window.innerWidth<920)$("#detail").scrollIntoView({behavior:"smooth"})});
  if(cur)bindStaff(cur);
}
// Department summary: knowledge, self vs manager competency averages, weakest areas and training demand
function deptReport(list){
  const ds=Object.keys(DEPTS).map(d=>[d,list.filter(s=>s.dept===d)]).filter(([,g])=>g.length);
  const r1=v=>v?v.toFixed(1):"—",bar=(v,max)=>`<span class="t"><i style="width:${max?v/max*100:0}%"></i></span>`;
  const sec=([d,g])=>{
    const k=Math.round(avg(g.map(kPct))),low=g.filter(s=>kPct(s)<50).length,mg=g.filter(s=>COMP.every(c=>s.mgr?.[c.id])).length;
    const comp=COMP.map(c=>{const sv=g.map(s=>s.self?.[c.id]).filter(Boolean),mv=g.map(s=>s.mgr?.[c.id]).filter(Boolean);return{t:c.t,s:avg(sv),m:mv.length?avg(mv):null}});
    const weak=[...comp].sort((a,b)=>(a.m??a.s)-(b.m??b.s)).slice(0,2);
    const tc={};g.forEach(s=>(s.train||[]).forEach(t=>tc[t]=(tc[t]||0)+1));const tt=Object.entries(tc).sort((a,b)=>b[1]-a[1]).slice(0,4);
    return `<section class="pp-sec rp"><h3>${esc(d)} <small class="muted">${g.length} хүн</small></h3>
      <dl class="pp-facts">${[["Мэдлэгийн дундаж",k+"%"],["50%-иас доош",low+" хүн"],["Удирдлага үнэлсэн",mg+"/"+g.length],["Ур чадвар (өөрөө)",r1(avg(g.map(selfAvg)))]].map(([t,v])=>`<div><dt>${t}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <div class="deptbars">${comp.map(c=>`<div class="db"><span>${esc(c.t)}</span>${bar(c.m??c.s,5)}<span class="v">${r1(c.s)} / ${r1(c.m)}</span></div>`).join("")}</div>
      <p class="muted" style="margin:0;font-size:13px">Тоо: өөрийн үнэлгээ / удирдлагын үнэлгээ (5-аас). Зурвас удирдлагын үнэлгээгээр, байхгүй бол өөрийн үнэлгээгээр.</p>
      <p style="margin:0"><b>Сул тал:</b> ${weak.map(w=>esc(w.t)).join(", ")}</p>
      <p style="margin:0"><b>Сургалтын хэрэгцээ:</b> ${tt.length?tt.map(([t,n])=>`${esc(t)} (${n})`).join(", "):"—"}</p>
      ${low?`<p style="margin:0"><b>Анхаарах ажилтан (мэдлэг 50%-иас доош):</b> ${g.filter(s=>kPct(s)<50).map(s=>esc(s.name)+" "+kPct(s)+"%").join(", ")}</p>`:""}</section>`};
  return `<article class="passport"><header class="pp-head"><button type="button" id="print" class="pp-print">Хэвлэх</button><div class="pp-id"><div><div class="pp-kicker">Албаны тайлан · ${fmtDate(Date.now())}</div><h2>Ажилтны үнэлгээний нэгдсэн тайлан</h2><div class="pp-meta">${list.length} ажилтан · ${ds.length} алба${deptFilter?" · "+esc(deptFilter):""}</div></div></div></header>
    ${ds.length?ds.map(sec).join(""):`<div class="pp-sec muted">Одоогоор бөглөсөн ажилтан алга.</div>`}</article>`;
}
function staffPassport(s){
  const k=kPct(s);const sv=COMP.map(c=>(s.self?.[c.id]||0)/5),mv=COMP.map(c=>(s.mgr?.[c.id]||0)/5);
  const gaps=COMP.filter(c=>s.self?.[c.id]&&s.mgr?.[c.id]&&Math.abs(s.self[c.id]-s.mgr[c.id])>=2);
  const bp=s.byPart||{};const pp=x=>x&&x.t?Math.round(x.c/x.t*100):0;
  const qids=s.questions||[];const wrong=qids.map(id=>bank[id]).filter(q=>q&&s.answers?.[q.id]!==q.a);
  const devNeeds=COMP.filter(c=>(s.mgr?.[c.id]||s.self?.[c.id]||5)<=2).map(c=>c.t);
  return `<article class="passport">
    <header class="pp-head"><button type="button" id="print" class="pp-print">Хэвлэх</button><div class="pp-id"><span class="avatar">${esc(initials(s.name))}</span><div style="min-width:0"><div class="pp-kicker">Ажилтны паспорт · ${"HS-"+String(s.id).slice(-8).toUpperCase()}</div><h2>${esc(s.name)}</h2><div class="pp-meta">${esc(s.position)} · ${esc(s.dept)}</div></div></div>
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
const STATUS={new:["Шинэ","idle"],interview:["Ярилцлагад урих","warn"],reserve:["Нөөцөд","idle"],hire:["Ажилд авах","good"],reject:["Татгалзсан","bad"]};
// Suggested next step from the test score; HR makes the decision
const advice=k=>k>=70?{t:"Ярилцлагад урих",k:"good"}:k>=50?{t:"Ярилцлагаар тодруулах",k:"warn"}:{t:"Тэнцээгүй",k:"bad"};
const ansWrong=a=>(a.questions||[]).map(id=>bank[id]).filter(q=>q&&a.answers?.[q.id]!==q.a);
let proxFilter=false;
const proxPill=a=>{const p=PROX[proximity(a.district,a.area)];return p?` <span class="pill ${p[1]}">${p[0]}</span>`:""};
function renderApps(){
  setBand("Ажил","горилогчид.","Ажлын анкет, мэдлэгийн шалгалтын дүн. Шалгалт сайн өгсөн хүнийг ярилцлагад урьж, шийдвэрээ энд тэмдэглэнэ.");
  const list=apps.filter(a=>(!appFilter||a.status===appFilter)&&(!proxFilter||["top","near"].includes(proximity(a.district,a.area))));
  const cur=apps.find(a=>a.id===selA);
  const cnt=k=>apps.filter(a=>a.status===k).length;
  $("#view").innerHTML=`<div class="stack" style="gap:24px">
    ${tabs("app")}
    <div class="stats">
      <div><b>${apps.length}</b><strong>Нийт анкет</strong><span>шинэ ${cnt("new")}</span></div>
      <div><b>${apps.length?Math.round(avg(apps.map(kPct)))+"%":"—"}</b><strong>Шалгалтын дундаж</strong><span>ерөнхий + мэргэжлийн</span></div>
      <div><b>${cnt("interview")}</b><strong>Ярилцлагад</strong><span>уригдсан</span></div>
      <div><b>${cnt("hire")}</b><strong>Ажилд авах</strong><span>шийдвэрлэсэн</span></div>
    </div>
    ${openingsCard()}
    ${msg?`<div class="err">${esc(msg)}</div>`:""}
    <div class="hr">
      <aside class="stack" style="gap:12px">
        <div class="tag"><b>02</b>Горилогчид</div>
        <label class="f">Төлөвөөр шүүх<select id="af"><option value="">Бүгд</option>${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${k===appFilter?"selected":""}>${v[0]} (${cnt(k)})</option>`).join("")}</select></label>
        <label class="consent"><input type="checkbox" id="pxf" ${proxFilter?"checked":""}><span>Зөвхөн Үйлдвэр 2.0-д гэр ойр</span></label>
        <div class="plist">${list.length?list.map(a=>{const k=kPct(a),st=STATUS[a.status]||STATUS.new;return `<button type="button" class="pcard ${a.id===selA?"on":""}" data-aid="${esc(a.id)}">
          <span class="pc-main"><b>${esc(a.name)}</b><small>${esc(a.position)}</small><small class="lvl">${fmtDate(a.submittedAt)}${proxPill(a)}</small></span>
          <span class="pc-score"><b>${k}%</b></span><span class="pc-pill"><span class="pill ${st[1]}">${st[0]}</span></span>
          <span class="pc-bar"><i style="width:${k}%"></i></span></button>`}).join(""):`<div class="sheet empty">${apps.length?"Энэ төлөвт горилогч алга.":"Одоогоор анкет ирээгүй байна."}</div>`}</div>
      </aside>
      <div id="detail">${cur?appPassport(cur):`<div class="sheet empty">Анкетыг харах горилогчоо сонгоно уу.</div>`}</div>
    </div></div>`;
  $("#af").onchange=e=>{appFilter=e.target.value;renderAll()};
  $("#pxf").onchange=e=>{proxFilter=e.target.checked;renderAll()};
  bindOpenings();
  document.querySelectorAll("[data-aid]").forEach(b=>b.onclick=()=>{selA=b.dataset.aid;renderAll();if(window.innerWidth<920)$("#detail").scrollIntoView({behavior:"smooth"})});
  if(cur)bindApp(cur);
}
// HR ticks which positions take applications; /apply lists only these
function openingsCard(){
  const open=new Set(openings);
  if(!editOpen)return `<div class="sheet stack"><div class="row spread"><div class="tag"><b>01</b>Нээлттэй ажлын байр (${openings.length})</div><button type="button" id="opEdit">Засах</button></div>
    ${openings.length?`<div class="chips">${openings.map(k=>`<span class="chip on">${esc(k.split("|")[1])}</span>`).join("")}</div>`:`<p style="margin:0">Одоогоор нээлттэй ажлын байр алга. Анкетын хуудас «нээлттэй ажлын байр алга» гэж харуулна. «Засах» дарж ажилд авах албан тушаалаа чагтална уу.</p>`}
    <p class="muted" style="margin:0;font-size:14px">Анкетын холбоос: <b style="color:var(--fg)">${esc(location.host+location.pathname.replace(/admin(\.html)?$/,"")+"apply")}</b></p></div>`;
  return `<div class="sheet stack"><div class="tag"><b>01</b>Ажилд авах албан тушаалаа чагтална уу</div>
    <div class="opgrid">${Object.entries(DEPTS).map(([d,ps])=>`<fieldset class="opdept"><legend>${esc(d)}</legend>${ps.map(p=>{const k=d+"|"+p[0];return `<label class="opchk"><input type="checkbox" value="${esc(k)}" ${open.has(k)?"checked":""}><span>${esc(p[0])}</span></label>`}).join("")}</fieldset>`).join("")}</div>
    <div class="row"><button type="button" class="primary" id="opSave">Хадгалах</button><button type="button" id="opCancel">Болих</button><span id="opMsg" class="muted" aria-live="polite"></span></div></div>`;
}
function bindOpenings(){
  const redraw=()=>{const y=window.scrollY;renderAll();window.scrollTo(0,y)};
  if($("#opEdit"))$("#opEdit").onclick=()=>{editOpen=true;redraw()};
  if($("#opCancel"))$("#opCancel").onclick=()=>{editOpen=false;redraw()};
  if($("#opSave"))$("#opSave").onclick=async()=>{
    const list=[...document.querySelectorAll(".opchk input:checked")].map(x=>x.value);
    $("#opSave").disabled=true;
    try{const j=await api("POST",{action:"openings",openings:list});openings=j.openings;editOpen=false;redraw()}
    catch(e){if(e.auth)return login(e.message);$("#opMsg").textContent="Хадгалж чадсангүй: "+e.message;$("#opSave").disabled=false}};
}
function appPassport(a){
  const k=kPct(a),ad=advice(k),bp=a.byPart||{},pp=x=>x&&x.t?Math.round(x.c/x.t*100):0;
  const sv=COMP.map(c=>(a.self?.[c.id]||0)/5),iv=COMP.map(c=>(a.interview?.[c.id]||0)/5);
  const wrong=ansWrong(a),fact=(t,v)=>`<div><dt>${t}</dt><dd>${v?esc(v):"—"}</dd></div>`;
  const px=proximity(a.district,a.area);
  const flags=[px==="top"||px==="near"?`<div class="flag good">Гэр нь Үйлдвэр 2.0-д ойр (${esc(a.district||a.area)}). Ажилд авахад давуу тал.</div>`:"",(a.durationSec||0)<300&&!a.timedOut?`<div class="flag bad">Шалгалтыг хэт богино хугацаанд (${mmss(a.durationSec||0)}) өгсөн. Таамаглан хариулсан байж болзошгүй.</div>`:"",
    a.timedOut?`<div class="flag warn">Шалгалтын хугацаа дуусч автоматаар хаагдсан.</div>`:"",
    a.away>=2?`<div class="flag warn">Шалгалтын үеэр өөр цонх руу ${a.away} удаа шилжсэн. Хариултыг хайж олсон байж болзошгүй.</div>`:""].join("");
  return `<article class="passport">
    <header class="pp-head"><button type="button" id="print" class="pp-print">Хэвлэх</button><div class="pp-id"><span class="avatar">${esc(initials(a.name))}</span><div style="min-width:0"><div class="pp-kicker">Ажлын анкет · ${"AP-"+String(a.id).slice(-8).toUpperCase()}</div><h2>${esc(a.name)}</h2><div class="pp-meta">${esc(a.position)} · ${esc(a.dept)}</div></div></div>
      <div class="pp-total"><div class="big">${k}%</div><span class="pill ${ad.k}">${ad.t}</span></div></header>
    <dl class="pp-facts">${fact("Утас",a.phone)}${fact("Төрсөн он",a.birthYear)}${fact("Боловсрол",a.edu)}${fact("Туршлага",a.exp)}</dl>
    ${flags?`<div class="flags">${flags}</div>`:""}
    <section class="pp-sec"><div class="tag"><b>A</b>Шийдвэр</div>
      ${recBlock(a)}
      <div class="chips" role="radiogroup" aria-label="Шийдвэр">${Object.entries(STATUS).map(([v,[t]])=>`<button type="button" class="chip ${a.status===v?"on":""}" data-st="${v}">${t}</button>`).join("")}</div>
      ${a.status==="interview"?iqBlock(a,wrong):stageBlock(a)}
      <label class="f">Тэмдэглэл (ярилцлагын дүгнэлт, санал болгосон цалин гэх мэт)<textarea id="aNote" style="min-height:70px">${esc(a.hrNote||"")}</textarea></label>
      <div class="row"><button type="button" class="primary" id="aSave">Хадгалах</button><span id="aMsg" class="muted" style="font-size:15px" aria-live="polite"></span></div></section>
    <section class="pp-sec"><div class="tag"><b>B</b>Мэдлэгийн шалгалт</div>
      <div class="gauges">${gauge(pp(bp.common),(bp.common?.c||0)+"/"+(bp.common?.t||0),"Ерөнхий мэдлэг")}${gauge(pp(bp.job),(bp.job?.c||0)+"/"+(bp.job?.t||0),"Мэргэжлийн мэдлэг")}${gauge(k,a.score+"/"+a.max,"Нийт · "+mmss(a.durationSec||0))}</div>
      <p class="muted" style="font-size:14px;margin:0">70%+ ярилцлагад урих, 50–69% ярилцлагаар тодруулах, 50%-иас доош тэнцээгүй гэж санал болгоно.</p></section>
    <section class="pp-sec"><div class="tag"><b>C</b>Ур чадвар: өөрийн ба ярилцлагын үнэлгээ</div>
      <div class="pp-grid"><div class="radarbox">${radarMulti(COMP.map(c=>c.t.split(/[ ,]/)[0]),[{vals:sv,fill:"var(--accent)",op:.3,stroke:"var(--fg)"},{vals:iv,fill:"none",op:0,stroke:"var(--good)",dash:1}])}
        <div class="legend2"><span><i style="background:var(--accent)"></i>Өөрийн үнэлгээ</span><span><i style="border:2px dashed var(--good)"></i>Ярилцлагын үнэлгээ</span></div></div>
      <div class="mgr-list">${COMP.map(c=>`<div class="mg"><div><b>${c.t}</b><small>Өөрөө: ${a.self?.[c.id]||"—"} · ${ANCHOR[a.self?.[c.id]||0]||""}</small></div><div class="score5">${[1,2,3,4,5].map(n=>`<button type="button" data-ic="${c.id}" data-n="${n}" class="${a.interview?.[c.id]===n?"on":""}" title="${ANCHOR[n]}">${n}</button>`).join("")}</div></div>`).join("")}</div></div>
      <p class="muted" style="font-size:14px;margin:0">Ярилцлагын дараа ур чадвар бүрийг 1–5-аар үнэлнэ.</p></section>
    <section class="pp-sec"><div class="tag"><b>D</b>Анкет</div>
      <dl class="kv">${[["И-мэйл",a.email],["Гэрийн хаяг",[a.district,a.khoroo?a.khoroo+"-р хороо":"",a.area].filter(Boolean).join(", ")],["Мэргэжил",a.major],["Сүүлийн ажил",a.lastJob],["Жолооны ангилал",(a.license||[]).join(", ")],["Ажиллах боломжтой",a.startDate],["Цалингийн хүлээлт",/^[\d,\s.]+$/.test(a.salary||"")&&/\d/.test(a.salary)?Number(a.salary.replace(/\D/g,"")).toLocaleString("en-US")+" ₮":a.salary],["Ажлын бүлэг",FAMILY[a.family]],["Илгээсэн",fmtDate(a.submittedAt)]].map(([t,v])=>`<div><dt>${t}</dt><dd>${v?esc(v):"—"}</dd></div>`).join("")}</dl>
      ${a.why?`<blockquote class="cm like"><small>Яагаад Хүннү Конкрет</small>${esc(a.why)}</blockquote>`:""}</section>
    <details class="pp-sec"><summary>Буруу хариулсан асуултууд (${wrong.length})</summary><div class="ansl">${wrong.map(q=>{const x=a.answers?.[q.id];return `<div>${esc(q.q)}<small>Хариулт: ${x===undefined?"хариулаагүй":esc(q.o[x])}</small><small>Зөв: ${esc(q.o[q.a])}</small></div>`}).join("")||'<div class="ok">Бүгд зөв.</div>'}</div></details>
    <div class="row pp-sec" id="aDelRow" style="flex-direction:row"><button type="button" class="danger" id="aDel">Устгах</button></div>
  </article>`;
}
// Interview questions with a good-answer hint, a 3-step rating and a short note per question
const IQR=[[3,"Сайн","good"],[2,"Дунд","warn"],[1,"Сул","bad"]];
function iqBlock(a,wrong){
  const g=interviewGuide(a,wrong),ans=a.iAns||{},n=k=>g.filter(q=>ans[q.id]?.r===k).length,done=n(3)+n(2)+n(1);
  const verdict=!done?"Ярилцлагын явцад асуулт бүрийг үнэлбэл энд дүгнэлт гарна.":n(1)>=3||n(1)>n(3)?"Сул хариулт олон байна. Татгалзах эсвэл нөөцөд үлдээхийг бодоорой.":n(3)>=done*.6?"Ихэнх хариулт сайн байна. Ажилд авах санал гаргаж болно.":"Холимог дүн. Сул хариултыг нь дахин тодруулаарай.";
  return `<details class="iq" ${a.status==="interview"?"open":""}><summary>Ярилцлагын асуулт (${g.length}) · үнэлсэн ${done}</summary>
    <div class="iq-sum"><span class="pill good">Сайн ${n(3)}</span><span class="pill warn">Дунд ${n(2)}</span><span class="pill bad">Сул ${n(1)}</span><span>${verdict}</span></div>
    <ol class="iq-list">${g.map(q=>{const x=ans[q.id]||{};return `<li><div class="iq-q"><small>${esc(q.src)}</small>${esc(q.q)}</div><div class="iq-good">Сайн хариулт: ${esc(q.good)}</div>
      <div class="iq-row"><span class="iq-r">${IQR.map(([v,t,c])=>`<button type="button" class="${c} ${x.r===v?"on":""}" data-iq="${q.id}" data-r="${v}">${t}</button>`).join("")}</span><input type="text" data-iqt="${q.id}" maxlength="500" placeholder="Хариултын товч тэмдэглэл" value="${esc(x.t||"")}"></div></li>`}).join("")}</ol></details>`;
}
function recBlock(a){
  const r=assess(a),li=(xs,c)=>xs.map(x=>`<li class="${c}">${esc(x)}</li>`).join("");
  return `<div class="rec rec-${r.cls}"><div class="rec-head"><span>Зөвлөмж</span><b>${esc(r.verdict)}</b><span class="rec-sc">${r.score}/100</span></div>
    <ul>${li(r.pros,"pro")}${li(r.cons,"con")}</ul><small class="muted">Шалгалт, анкет, байршлаас автоматаар тооцсон санал. Эцсийн шийдвэрийг ярилцлагын дараа гаргана.</small></div>`;
}
function stageBlock(a){
  const g=stageGuide(a),c=a.chk||{},done=g.items.filter(([k])=>c[k]).length;
  return `<div class="iq"><div class="iq-head"><b>${esc(g.t)}</b><span class="muted">${done}/${g.items.length} хийсэн</span></div>
    ${g.reasons?`<div class="chips" style="margin-top:10px">${REJECT.map(r=>`<button type="button" class="chip ${c.reason===r?"on":""}" data-rj="${esc(r)}">${esc(r)}</button>`).join("")}</div>`:""}
    <ul class="ck-list">${g.items.map(([k,t,h])=>`<li><label><input type="checkbox" data-ck="${k}" ${c[k]?"checked":""}><span><b>${esc(t)}</b><small>${esc(h)}</small></span></label></li>`).join("")}</ul>
    <div class="tpl"><div class="row spread"><small class="muted">Илгээх мессежийн загвар ([…] хэсгийг бөглөнө)</small><button type="button" id="tplCopy">Хуулах</button></div><textarea id="tplText">${esc(g.msg)}</textarea></div>
    ${a.status==="new"?`<p class="muted" style="margin:10px 0 0;font-size:14px">«Ярилцлагад урих» дарахад ярилцлагын асуултууд гарна.</p>`:""}</div>`;
}
function bindApp(a){
  const save=async patch=>{try{const j=await api("POST",{kind:"app",action:"update",id:a.id,patch});Object.assign(a,j.row);return true}catch(e){if(e.auth)return login(e.message);$("#aMsg").textContent="Хадгалж чадсангүй: "+e.message;return false}};
  const redraw=()=>{const y=window.scrollY;renderAll();window.scrollTo(0,y)};
  document.querySelectorAll("[data-st]").forEach(b=>b.onclick=async()=>{if(await save({status:b.dataset.st}))redraw()});
  document.querySelectorAll("[data-ic]").forEach(b=>b.onclick=async()=>{if(await save({interview:{...(a.interview||{}),[b.dataset.ic]:+b.dataset.n}}))redraw()});
  const setIq=(id,v)=>save({iAns:{...(a.iAns||{}),[id]:{...(a.iAns?.[id]||{}),...v}}});
  document.querySelectorAll("[data-iq]").forEach(b=>b.onclick=async()=>{const id=b.dataset.iq,r=+b.dataset.r;if(await setIq(id,{r:a.iAns?.[id]?.r===r?0:r}))redraw()});
  document.querySelectorAll("[data-iqt]").forEach(i=>i.onchange=()=>setIq(i.dataset.iqt,{t:i.value}));
  const setChk=v=>save({chk:{...(a.chk||{}),...v}});
  document.querySelectorAll("[data-ck]").forEach(i=>i.onchange=async()=>{if(await setChk({[i.dataset.ck]:i.checked}))redraw()});
  document.querySelectorAll("[data-rj]").forEach(b=>b.onclick=async()=>{const r=b.dataset.rj;if(await setChk({reason:a.chk?.reason===r?"":r,j1:a.chk?.reason!==r}))redraw()});
  if($("#tplCopy"))$("#tplCopy").onclick=async()=>{const t=$("#tplText");try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();document.execCommand("copy")}$("#tplCopy").textContent="Хуулсан"};
  $("#aSave").onclick=async()=>{if(await save({hrNote:$("#aNote").value}))$("#aMsg").textContent="Хадгалагдлаа."};
  $("#aDel").onclick=()=>{$("#aDelRow").innerHTML=`<span style="font-size:14px">${esc(a.name)}-ийн анкетыг устгах уу?</span><button type="button" class="danger" id="aYes">Тийм, устгах</button><button type="button" id="aNo">Болих</button>`;
    $("#aNo").onclick=()=>renderAll();
    $("#aYes").onclick=async()=>{try{await api("POST",{kind:"app",action:"delete",id:a.id});apps=apps.filter(x=>x.id!==a.id);selA=null;renderAll()}catch(e){$("#aMsg").textContent="Устгаж чадсангүй: "+e.message}}};
}
function renderPulse(){
  setBand("Сэтгэл","ханамж.","Нэргүй хариултын нэгдсэн дүн. "+MIN_GROUP+"-аас цөөн хүнтэй бүлгийг нууцлалын үүднээс харуулахгүй.");
  const P=pulse||{n:0,hidden:true};const heat=v=>v===null||v===undefined?"":v>=70?"good":v>=50?"warn":"bad";
  $("#view").innerHTML=`<div class="stack" style="gap:24px">${tabs("pulse")}
  ${P.hidden?`<div class="sheet empty">Одоогоор ${P.n} хариулт ирсэн. ${MIN_GROUP}-аас дээш хариулт ирмэгц нэгдсэн дүн гарна.</div>`:`
  <div class="stats">
    <div><b>${P.n}</b><strong>Хариулт</strong><span>нэргүй</span></div>
    <div><b>${P.enps>0?"+":""}${P.enps}</b><strong>Санал болгох индекс (eNPS)</strong><span>«найздаа санал болгох уу?» −100…+100</span></div>
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
  <div class="sheet stack"><div class="tag"><b>!</b>Туршилтын өгөгдөл цэвэрлэх</div>
    <p class="muted" style="margin:0;font-size:14px">Хариулт нэргүй тул нэг нэгээр нь устгах боломжгүй. Жинхэнэ судалгаа эхлэхээс өмнө туршилтын бүх хариултыг энд нэг дор устгана. Буцаах боломжгүй.</p>
    <div class="row" id="pgRow"><button type="button" class="danger" id="pg">Бүх хариултыг устгах (${pulse?.n||0})</button></div></div>
  </div>`;
  $("#pg").onclick=()=>{$("#pgRow").innerHTML=`<label class="f" style="flex:1 1 260px">Баталгаажуулахын тулд УСТГАХ гэж бичнэ үү<input type="text" id="pgTxt" autocomplete="off"></label><button type="button" class="danger" id="pgYes">Устгах</button><button type="button" id="pgNo">Болих</button><span id="pgMsg" class="muted"></span>`;
    $("#pgNo").onclick=()=>render();
    $("#pgYes").onclick=async()=>{if($("#pgTxt").value.trim()!=="УСТГАХ"){$("#pgMsg").textContent="УСТГАХ гэж бичнэ үү.";return}
      try{const j=await api("POST",{action:"purgePulse"});$("#pgMsg").textContent=j.deleted+" хариулт устгагдлаа.";await load()}catch(e){if(e.auth)return login(e.message);$("#pgMsg").textContent="Устгаж чадсангүй: "+e.message}}};
}

if(key){$("#view").innerHTML='<p class="muted">Ачаалж байна…</p>';load()}else login();
