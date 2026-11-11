import {DEPTS,FAMILY,COMP,ANCHOR,PULSE,MIN_GROUP,PROX,proximity,HEADCOUNT,APP_N_COMMON,APP_N_JOB,APP_MINUTES} from "./data.mjs";
import {interviewGuide,stageGuide,REJECT,assess} from "./interview.mjs";
import {analyze,matchRoster} from "./analysis.mjs";
import {$,esc,avg,fmtDate,mmss,lvl,initials,setBand,gauge,radarMulti,ic} from "./ui.mjs";

const KEY="hunnu-admin-key";
let key=(()=>{try{return sessionStorage.getItem(KEY)||""}catch(e){return""}})();
let staff=[],pulse=null,apps=[],bank={},openings=[],roster=[],raters=[],sims={},people=[],reqs=[],RQI=[],peopleEdit=false,raterLabel="",newCode=null,rosterEdit=false,editOpen=false,selS=null,selA=null,appFilter="",deptFilter="",msg="",view=["sum","staff","pulse","app","contacts","req"].includes(location.hash.slice(1))?location.hash.slice(1):"sum";

async function api(method,body){
  const res=await fetch("api/admin",{method,headers:{"x-admin-key":key,"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await res.json().catch(()=>({}));
  if(res.status===401){key="";try{sessionStorage.removeItem(KEY)}catch(e){}throw Object.assign(new Error(j.error||"Нууц үг буруу"),{auth:true})}
  if(!res.ok)throw new Error(j.error||("HTTP "+res.status));
  return j;
}
let role="admin";
async function load(){
  try{const j=await api("GET");role=j.role||"admin";document.body.classList.toggle("role-manager",role==="manager");staff=j.staff;pulse=j.pulse;apps=j.applicants||[];bank=j.bank||{};openings=j.openings||[];roster=j.roster||[];reqs=j.reqs||[];raters=j.raters||[];sims=j.sims||{};people=j.people||[];raterLabel=j.label||"";applyNames();msg="";if(!selS&&staff.length)selS=staff[0].id;if(!selA&&apps.length)selA=apps[0].id;render()}
  catch(e){if(e.auth)return login(e.message);msg="Ачаалж чадсангүй: "+e.message;render()}
}
const PRINT=`<button type="button" id="print" class="pp-print" title="Хэвлэх" aria-label="Хэвлэх">${ic("printer")}</button>`;
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
        <span class="pw"><input type="password" id="pw" autocomplete="current-password" required aria-invalid="${err?"true":"false"}"${err?' aria-describedby="pwErr"':""}><button type="button" id="pwShow" aria-label="Нууц үгийг харуулах" aria-pressed="false">${ic("eye")}Харах</button></span></label>
      ${err?`<div class="err" id="pwErr" role="alert">${esc(err)}</div>`:""}
      <button class="primary gate-go" type="submit">${ic("login")}Нэвтрэх</button>
      <p class="gate-note">Нууц үг зөвхөн энэ таб нээлттэй байх хугацаанд хадгалагдана. Дундын компьютер дээр ажлаа дуусгаад табаа хаана уу.</p>
    </form>
  </div>`;
  $("#pwShow").onclick=e=>{const i=$("#pw"),on=i.type==="password";i.type=on?"text":"password";e.currentTarget.innerHTML=on?ic("eyeOff")+"Нуух":ic("eye")+"Харах";e.currentTarget.setAttribute("aria-pressed",String(on));i.focus()};
  $("#fLogin").onsubmit=e=>{e.preventDefault();const v=$("#pw").value.trim();if(!v){$("#pw").focus();return}key=v;try{sessionStorage.setItem(KEY,key)}catch(e){}const b=e.target.querySelector(".gate-go");b.disabled=true;b.textContent="Шалгаж байна…";load()};
  if(matchMedia("(hover:hover)").matches)$("#pw").focus();
}
function tabs(cur){
  return `<div class="row spread"><nav class="tabs" aria-label="Үр дүнгийн хэсэг">${[["sum","Нэгдсэн анализ","report"],["staff","Ажилтны паспорт","users"],["pulse","Сэтгэл ханамж","heart"],["app","Горилогчид"+(apps.some(a=>a.status==="new")?" ("+apps.filter(a=>a.status==="new").length+")":""),"userPlus"],["contacts","Холбоо барих","phone"],...(role==="admin"?[["req","Хүсэлт, засвар"+(reqs.some(r=>r.s==="new"||r.s==="doing")?" ("+reqs.filter(r=>r.s==="new"||r.s==="doing").length+")":""),"chat"]]:[])].map(([v,t,i])=>`<button type="button" data-view="${v}" ${v===cur?'aria-current="page"':""}>${ic(i)}${t}</button>`).join("")}</nav><div class="row">${cur==="staff"||cur==="app"?`<button type="button" id="xls">${ic("download")}Excel татах</button>`:""}<button type="button" id="reload">${ic("refresh")}Шинэчлэх</button><button type="button" id="logout">${ic("logout")}Гарах</button></div></div>`;
}
function bindTabs(){
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;history.replaceState(null,"","#"+view);render()});
  const r=$("#reload");if(r)r.onclick=()=>{r.disabled=true;load()};
  const o=$("#logout");if(o)o.onclick=logout;
}
function render(){
  if(role==="rater"){renderRater();return}
  if(view==="sum")renderSummary();else if(view==="pulse")renderPulse();else if(view==="app")renderApps();else if(view==="contacts")renderContacts();else if(view==="req"&&role==="admin")renderReqs();else renderStaffHr();
  // Leaders: everything is visible, but only the skill-rating buttons save (the server enforces the same)
  if(role==="manager"){document.querySelectorAll("#view textarea,#view input[type=text]").forEach(e=>e.readOnly=true);const t=document.querySelector("nav.tabs");if(t&&!$("#roleNote"))t.closest(".row").insertAdjacentHTML("afterend",'<div class="note" id="roleNote">Удирдлагын эрх: үр дүнг харах, ажилтны ур чадварыг 1–5 үнэлэх. Бусад мэдээллийг өөрчлөхгүй.</div>')}
  bindTabs();
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
  download("gorilogchid",[head,...apps.map(a=>{const r=assess(a),ia=Object.values(a.iAns||{}),n=k=>ia.filter(x=>x.r===k).length;return [fmtDate(a.submittedAt),a.name,a.phone,a.email,a.dept,a.position,a.birthYear,a.edu,a.major,a.exp,a.lastJob,a.district,a.khoroo,a.area,PXT[proximity(a.district,a.area)]||"",tested(a)?kPct(a):"",tested(a)?pctOf(a.byPart?.common):"",tested(a)?pctOf(a.byPart?.job):"",tested(a)?mmss(a.durationSec||0):"",r.verdict,r.score,(STATUS[a.status]||STATUS.new)[0],n(3)+"/"+n(2)+"/"+n(1),a.salary,a.startDate,(a.license||[]).join(" "),a.hrNote]})]);
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
        <button type="button" id="rpt" class="${selS==="report"?"primary":""}">${selS==="report"?ic("x")+"Тайланг хаах":ic("report")+"Албаны тайлан"}</button>
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
  return `<article class="passport"><header class="pp-head">${PRINT}<div class="pp-id"><div><div class="pp-kicker">Албаны тайлан · ${fmtDate(Date.now())}</div><h2>Ажилтны үнэлгээний нэгдсэн тайлан</h2><div class="pp-meta">${list.length} ажилтан · ${ds.length} алба${deptFilter?" · "+esc(deptFilter):""}</div></div></div></header>
    ${ds.length?ds.map(sec).join(""):`<div class="pp-sec muted">Одоогоор бөглөсөн ажилтан алга.</div>`}</article>`;
}
function staffPassport(s){
  const k=kPct(s);const sv=COMP.map(c=>(s.self?.[c.id]||0)/5),mv=COMP.map(c=>(s.mgr?.[c.id]||0)/5);
  const gaps=COMP.filter(c=>s.self?.[c.id]&&s.mgr?.[c.id]&&Math.abs(s.self[c.id]-s.mgr[c.id])>=2);
  const bp=s.byPart||{};const pp=x=>x&&x.t?Math.round(x.c/x.t*100):0;
  const qids=s.questions||[];const wrong=qids.map(id=>bank[id]).filter(q=>q&&s.answers?.[q.id]!==q.a);
  const devNeeds=COMP.filter(c=>(s.mgr?.[c.id]||s.self?.[c.id]||5)<=2).map(c=>c.t);
  return `<article class="passport">
    <header class="pp-head">${PRINT}<div class="pp-id"><span class="avatar">${esc(initials(s.name))}</span><div style="min-width:0"><div class="pp-kicker">Ажилтны паспорт · ${"HS-"+String(s.id).slice(-8).toUpperCase()}</div><h2>${esc(s.name)}</h2>${s.rawName&&s.rawName!==s.name?`<div class="pp-meta">Өөрөө бичсэн нэр: ${esc(s.rawName)}</div>`:""}<div class="pp-meta">${esc(s.position)} · ${esc(s.dept)}</div></div></div>
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
      <div class="row"><button type="button" class="primary" id="sSave">${ic("check")}Хадгалах</button><span id="sMsg" class="muted" style="font-size:15px" aria-live="polite"></span></div></section>
    <details class="pp-sec"><summary>Буруу хариулсан асуултууд (${wrong.length})</summary><div class="ansl">${wrong.map(q=>{const a=s.answers?.[q.id];return `<div>${esc(q.q)}<small>Хариулт: ${a===undefined?"хариулаагүй":esc(q.o[a])}</small><small>Зөв: ${esc(q.o[q.a])}</small></div>`}).join("")||'<div class="ok">Бүгд зөв.</div>'}</div></details>
    <div class="row pp-sec" id="sDelRow" style="flex-direction:row"><button type="button" class="danger" id="sDel">${ic("trash")}Устгах</button></div>
  </article>`;
}

function bindStaff(s){
  const save=async patch=>{try{const j=await api("POST",{action:"update",id:s.id,patch});Object.assign(s,j.row);applyNames();return true}catch(e){if(e.auth)return login(e.message);$("#sMsg").textContent="Хадгалж чадсангүй: "+e.message;return false}};
  document.querySelectorAll(".mgr-list [data-c]").forEach(b=>b.onclick=async()=>{if(await save({mgr:{...(s.mgr||{}),[b.dataset.c]:+b.dataset.n}})){const y=window.scrollY;renderAll();window.scrollTo(0,y)}});
  $("#sSave").onclick=async()=>{if(await save({plan:$("#sPlan").value,hrNote:$("#sNote").value}))$("#sMsg").textContent="Хадгалагдлаа."};
  $("#sDel").onclick=()=>{$("#sDelRow").innerHTML=`<span style="font-size:14px">${esc(s.name)}-ийн үнэлгээг устгах уу?</span><button type="button" class="danger" id="sYes">${ic("trash")}Тийм, устгах</button><button type="button" id="sNo">${ic("x")}Болих</button>`;
    $("#sNo").onclick=()=>renderAll();
    $("#sYes").onclick=async()=>{try{await api("POST",{action:"delete",id:s.id});staff=staff.filter(x=>x.id!==s.id);selS=null;renderAll()}catch(e){$("#sMsg").textContent="Устгаж чадсангүй: "+e.message}}};
}
const SICON={new:"inbox",interview:"chat",reserve:"archive",hire:"userCheck",reject:"userX"};
const STATUS={new:["Шинэ","idle"],interview:["Ярилцлагад урих","warn"],reserve:["Нөөцөд","idle"],hire:["Ажилд авах","good"],reject:["Татгалзсан","bad"]};
// Suggested next step from the test score; HR makes the decision
const tested=a=>(a.max||0)>0;
const advice=k=>k>=70?{t:"Ярилцлагад урих",k:"good"}:k>=50?{t:"Ярилцлагаар тодруулах",k:"warn"}:{t:"Тэнцээгүй",k:"bad"};
const ansWrong=a=>(a.questions||[]).map(id=>bank[id]).filter(q=>q&&a.answers?.[q.id]!==q.a);
let proxFilter=false;
const proxPill=a=>{const p=PROX[proximity(a.district,a.area)];return p?` <span class="pill ${p[1]}">${p[0]}</span>`:""};
function renderApps(){
  setBand("Ажил","горилогчид.","Онлайн анкет ирнэ. Тохирох хүнийг оффист урьж, мэдлэгийн шалгалтыг энд эхлүүлээд, ярилцлагын шийдвэрээ тэмдэглэнэ.");
  const list=apps.filter(a=>(!appFilter||a.status===appFilter)&&(!proxFilter||["top","near"].includes(proximity(a.district,a.area))));
  const cur=apps.find(a=>a.id===selA);
  const cnt=k=>apps.filter(a=>a.status===k).length;
  $("#view").innerHTML=`<div class="stack" style="gap:24px">
    ${tabs("app")}
    <div class="stats">
      <div><b>${apps.length}</b><strong>Нийт анкет</strong><span>шинэ ${cnt("new")}</span></div>
      <div><b>${apps.some(tested)?Math.round(avg(apps.filter(tested).map(kPct)))+"%":"—"}</b><strong>Шалгалтын дундаж</strong><span>оффист өгсөн ${apps.filter(tested).length}</span></div>
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
          <span class="pc-score"><b>${tested(a)?k+"%":"—"}</b></span><span class="pc-pill"><span class="pill ${st[1]}">${st[0]}</span></span>
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
  if(!editOpen)return `<div class="sheet stack"><div class="row spread"><div class="tag"><b>01</b>Нээлттэй ажлын байр (${openings.length})</div><button type="button" id="opEdit">${ic("edit")}Засах</button></div>
    ${openings.length?`<div class="chips">${openings.map(k=>`<span class="chip on">${esc(k.split("|")[1])}</span>`).join("")}</div>`:`<p style="margin:0">Одоогоор нээлттэй ажлын байр алга. Анкетын хуудас «нээлттэй ажлын байр алга» гэж харуулна. «Засах» дарж ажилд авах албан тушаалаа чагтална уу.</p>`}
    <p class="muted" style="margin:0;font-size:14px">Анкетын холбоос: <b style="color:var(--fg)">${esc(location.host+location.pathname.replace(/admin(\.html)?$/,"")+"apply")}</b></p></div>`;
  return `<div class="sheet stack"><div class="tag"><b>01</b>Ажилд авах албан тушаалаа чагтална уу</div>
    <div class="opgrid">${Object.entries(DEPTS).map(([d,ps])=>`<fieldset class="opdept"><legend>${esc(d)}</legend>${ps.map(p=>{const k=d+"|"+p[0];return `<label class="opchk"><input type="checkbox" value="${esc(k)}" ${open.has(k)?"checked":""}><span>${esc(p[0])}</span></label>`}).join("")}</fieldset>`).join("")}</div>
    <div class="row"><button type="button" class="primary" id="opSave">${ic("check")}Хадгалах</button><button type="button" id="opCancel">${ic("x")}Болих</button><span id="opMsg" class="muted" aria-live="polite"></span></div></div>`;
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
  const t=tested(a),k=kPct(a),ad=t?advice(k):{t:a.exam?"Шалгалт эхэлсэн":"Шалгалт өгөөгүй",k:"idle"},bp=a.byPart||{},pp=x=>x&&x.t?Math.round(x.c/x.t*100):0;
  const sv=COMP.map(c=>(a.self?.[c.id]||0)/5),iv=COMP.map(c=>(a.interview?.[c.id]||0)/5);
  const wrong=ansWrong(a),fact=(t,v)=>`<div><dt>${t}</dt><dd>${v?esc(v):"—"}</dd></div>`;
  const px=proximity(a.district,a.area);
  const flags=[px==="top"||px==="near"?`<div class="flag good">Гэр нь Үйлдвэр 2.0-д ойр (${esc(a.district||a.area)}). Ажилд авахад давуу тал.</div>`:"",t&&(a.durationSec||0)<300&&!a.timedOut?`<div class="flag bad">Шалгалтыг хэт богино хугацаанд (${mmss(a.durationSec||0)}) өгсөн. Таамаглан хариулсан байж болзошгүй.</div>`:"",
    a.timedOut?`<div class="flag warn">Шалгалтын хугацаа дуусч автоматаар хаагдсан.</div>`:"",
    a.away>=2?`<div class="flag warn">Шалгалтын үеэр өөр цонх руу ${a.away} удаа шилжсэн. Хариултыг хайж олсон байж болзошгүй.</div>`:""].join("");
  return `<article class="passport">
    <header class="pp-head">${PRINT}<div class="pp-id"><span class="avatar">${esc(initials(a.name))}</span><div style="min-width:0"><div class="pp-kicker">Ажлын анкет · ${"AP-"+String(a.id).slice(-8).toUpperCase()}</div><h2>${esc(a.name)}</h2><div class="pp-meta">${esc(a.position)} · ${esc(a.dept)}</div></div></div>
      <div class="pp-total"><div class="big">${t?k+"%":"—"}</div><span class="pill ${ad.k}">${ad.t}</span></div></header>
    <dl class="pp-facts">${fact("Утас",a.phone)}${fact("Төрсөн он",a.birthYear)}${fact("Боловсрол",a.edu)}${fact("Туршлага",a.exp)}</dl>
    ${flags?`<div class="flags">${flags}</div>`:""}
    <section class="pp-sec"><div class="tag"><b>A</b>Шийдвэр</div>
      ${recBlock(a)}
      <div class="chips" role="radiogroup" aria-label="Шийдвэр">${Object.entries(STATUS).map(([v,[t]])=>`<button type="button" class="chip ${a.status===v?"on":""}" data-st="${v}">${ic(SICON[v])}${t}</button>`).join("")}</div>
      ${a.status==="interview"?iqBlock(a,wrong):stageBlock(a)}
      <label class="f">Тэмдэглэл (ярилцлагын дүгнэлт, санал болгосон цалин гэх мэт)<textarea id="aNote" style="min-height:70px">${esc(a.hrNote||"")}</textarea></label>
      <div class="row"><button type="button" class="primary" id="aSave">${ic("check")}Хадгалах</button><span id="aMsg" class="muted" style="font-size:15px" aria-live="polite"></span></div></section>
    <section class="pp-sec"><div class="tag"><b>B</b>Мэдлэгийн шалгалт (HR оффист)</div>
      ${t?"":examBlock(a)}
      ${t?`<div class="gauges">${gauge(pp(bp.common),(bp.common?.c||0)+"/"+(bp.common?.t||0),"Ерөнхий мэдлэг")}${gauge(pp(bp.job),(bp.job?.c||0)+"/"+(bp.job?.t||0),"Мэргэжлийн мэдлэг")}${gauge(k,a.score+"/"+a.max,"Нийт · "+mmss(a.durationSec||0))}</div>
      <p class="muted" style="font-size:14px;margin:0">${a.testedAt?"Оффист өгсөн: "+fmtDate(a.testedAt)+". ":""}70%+ ярилцлагад урих, 50–69% ярилцлагаар тодруулах, 50%-иас доош тэнцээгүй гэж санал болгоно.</p>`:""}</section>
    <section class="pp-sec"><div class="tag"><b>C</b>Ур чадвар: өөрийн ба ярилцлагын үнэлгээ</div>
      <div class="pp-grid"><div class="radarbox">${radarMulti(COMP.map(c=>c.t.split(/[ ,]/)[0]),[{vals:sv,fill:"var(--accent)",op:.3,stroke:"var(--fg)"},{vals:iv,fill:"none",op:0,stroke:"var(--good)",dash:1}])}
        <div class="legend2"><span><i style="background:var(--accent)"></i>Өөрийн үнэлгээ</span><span><i style="border:2px dashed var(--good)"></i>Ярилцлагын үнэлгээ</span></div></div>
      <div class="mgr-list">${COMP.map(c=>`<div class="mg"><div><b>${c.t}</b><small>Өөрөө: ${a.self?.[c.id]||"—"} · ${ANCHOR[a.self?.[c.id]||0]||""}</small></div><div class="score5">${[1,2,3,4,5].map(n=>`<button type="button" data-ic="${c.id}" data-n="${n}" class="${a.interview?.[c.id]===n?"on":""}" title="${ANCHOR[n]}">${n}</button>`).join("")}</div></div>`).join("")}</div></div>
      <p class="muted" style="font-size:14px;margin:0">Ярилцлагын дараа ур чадвар бүрийг 1–5-аар үнэлнэ.</p></section>
    <section class="pp-sec"><div class="tag"><b>D</b>Анкет</div>
      <dl class="kv">${[["И-мэйл",a.email],["Гэрийн хаяг",[a.district,a.khoroo?a.khoroo+"-р хороо":"",a.area].filter(Boolean).join(", ")],["Мэргэжил",a.major],["Сүүлийн ажил",a.lastJob],["Жолооны ангилал",(a.license||[]).join(", ")],["Ажиллах боломжтой",a.startDate],["Цалингийн хүлээлт",/^[\d,\s.]+$/.test(a.salary||"")&&/\d/.test(a.salary)?Number(a.salary.replace(/\D/g,"")).toLocaleString("en-US")+" ₮":a.salary],["Ажлын бүлэг",FAMILY[a.family]],["Илгээсэн",fmtDate(a.submittedAt)]].map(([t,v])=>`<div><dt>${t}</dt><dd>${v?esc(v):"—"}</dd></div>`).join("")}</dl>
      ${a.why?`<blockquote class="cm like"><small>Яагаад Хүннү Конкрет</small>${esc(a.why)}</blockquote>`:""}</section>
    ${t?`<details class="pp-sec"><summary>Буруу хариулсан асуултууд (${wrong.length})</summary><div class="ansl">${wrong.map(q=>{const x=a.answers?.[q.id];return `<div>${esc(q.q)}<small>Хариулт: ${x===undefined?"хариулаагүй":esc(q.o[x])}</small><small>Зөв: ${esc(q.o[q.a])}</small></div>`}).join("")||'<div class="ok">Бүгд зөв.</div>'}</div></details>`:""}
    <div class="row pp-sec" id="aDelRow" style="flex-direction:row"><button type="button" class="danger" id="aDel">${ic("trash")}Устгах</button></div>
  </article>`;
}
// Office knowledge test: HR presses start, the test opens in a new tab on the office computer (one-time link, 30 minutes)
let examLink=null;
function examBlock(a){
  const link=examLink&&examLink.id===a.id?examLink.url:"";
  return `<div class="iq"><div class="iq-head"><b>${a.exam?"Шалгалтын холбоос гарсан":"Горилогч оффист ирэхэд шалгалтыг эхлүүлнэ"}</b>${a.exam?`<span class="muted">${fmtDate(a.exam.issuedAt)}${a.exam.startedAt?" · эхэлсэн":""}</span>`:""}</div>
    <p style="margin:8px 0 12px;font-size:15px">«Шалгалт эхлүүлэх» дармагц энэ горилогчийн албан тушаалын ${APP_N_COMMON+APP_N_JOB} асуулттай шалгалт шинэ цонхонд нээгдэнэ. Холбоос нэг удаагийнх, 12 цагийн дотор хүчинтэй. Цаг нь горилогч хуудсыг нээмэгц эхэлнэ (${APP_MINUTES} минут). Шалгалтын дараа ур чадвараа өөрөө 1–5-аар үнэлээд илгээнэ, дүн нь энд гарна.</p>
    <div class="row"><button type="button" class="yellow" id="exStart">${ic("play")}${a.exam?"Шинэ холбоосоор дахин эхлүүлэх":"Шалгалт эхлүүлэх"}</button><span id="exMsg" class="muted" aria-live="polite"></span></div>
    ${link?`<div class="tpl"><div class="row spread"><small class="muted">Шинэ цонх нээгдээгүй бол энэ холбоосыг оффисын компьютер дээр нээнэ үү</small><button type="button" id="exCopy">${ic("copy")}Хуулах</button></div><textarea id="exLink" readonly style="min-height:0">${esc(link)}</textarea></div>`:""}</div>`;
}
function bindExam(a){
  if(!$("#exStart"))return;
  $("#exStart").onclick=async()=>{
    if(a.exam&&a.exam.startedAt&&!confirm("Өмнөх шалгалтын холбоос хүчингүй болж, шинэ асуулт гарна. Үргэлжлүүлэх үү?"))return;
    const w=window.open("about:blank","_blank");$("#exStart").disabled=true;
    try{const j=await api("POST",{action:"examStart",id:a.id});Object.assign(a,j.row);
      const url=new URL("exam#"+encodeURIComponent(a.id)+"."+j.token,location.href).href;examLink={id:a.id,url};
      if(w)w.location.href=url;const y=window.scrollY;renderAll();window.scrollTo(0,y)}
    catch(e){if(w)w.close();if(e.auth)return login(e.message);$("#exMsg").textContent="Эхлүүлж чадсангүй: "+e.message;$("#exStart").disabled=false}};
  if($("#exCopy"))$("#exCopy").onclick=async()=>{const t=$("#exLink");try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();document.execCommand("copy")}$("#exCopy").innerHTML=ic("check")+"Хуулсан"};
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
    <div class="tpl"><div class="row spread"><small class="muted">Илгээх мессежийн загвар ([…] хэсгийг бөглөнө)</small><button type="button" id="tplCopy">${ic("copy")}Хуулах</button></div><textarea id="tplText">${esc(g.msg)}</textarea></div>
    ${a.status==="new"?`<p class="muted" style="margin:10px 0 0;font-size:14px">«Ярилцлагад урих» дарахад ярилцлагын асуултууд гарна.</p>`:""}</div>`;
}
function bindApp(a){
  bindExam(a);
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
  if($("#tplCopy"))$("#tplCopy").onclick=async()=>{const t=$("#tplText");try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();document.execCommand("copy")}$("#tplCopy").innerHTML=ic("check")+"Хуулсан"};
  $("#aSave").onclick=async()=>{if(await save({hrNote:$("#aNote").value}))$("#aMsg").textContent="Хадгалагдлаа."};
  $("#aDel").onclick=()=>{$("#aDelRow").innerHTML=`<span style="font-size:14px">${esc(a.name)}-ийн анкетыг устгах уу?</span><button type="button" class="danger" id="aYes">${ic("trash")}Тийм, устгах</button><button type="button" id="aNo">${ic("x")}Болих</button>`;
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
    <p class="muted" style="margin:0;font-size:14px">Жинхэнэ үнэлгээ эхлэхээс өмнө туршилтаар бөглөсөн бүх ажилтны паспорт (${staff.length}) болон сэтгэл ханамжийн хариултыг (${pulse?.n||0}) энд нэг дор устгана. Ажил горилогчдын анкет устахгүй. Буцаах боломжгүй.</p>
    <div class="row" id="pgRow"><button type="button" class="danger" id="pg">${ic("trash")}Ажилтны үнэлгээг цэвэрлэх (${staff.length+(pulse?.n||0)})</button></div></div>
  </div>`;
  $("#pg").onclick=()=>{$("#pgRow").innerHTML=`<label class="f" style="flex:1 1 260px">Баталгаажуулахын тулд УСТГАХ гэж бичнэ үү<input type="text" id="pgTxt" autocomplete="off"></label><button type="button" class="danger" id="pgYes">${ic("trash")}Устгах</button><button type="button" id="pgNo">${ic("x")}Болих</button><span id="pgMsg" class="muted"></span>`;
    $("#pgNo").onclick=()=>render();
    $("#pgYes").onclick=async()=>{if($("#pgTxt").value.trim()!=="УСТГАХ"){$("#pgMsg").textContent="УСТГАХ гэж бичнэ үү.";return}
      try{const j=await api("POST",{action:"purgeSurvey"});$("#pgMsg").textContent=j.staff+" паспорт, "+j.pulse+" хариулт устгагдлаа.";await load()}catch(e){if(e.auth)return login(e.message);$("#pgMsg").textContent="Устгаж чадсангүй: "+e.message}}};
}

if(key){$("#view").innerHTML='<p class="muted">Ачаалж байна…</p>';load()}else login();

// Combined analysis, recomputed from the live data on every load. The last figures seen on an earlier day
// are kept in this browser so the page can say how things moved since then.
const SNAP="hunnu-sum-snap";
function renderSummary(){
  setBand("Нэгдсэн","анализ.","Ажилтны үнэлгээ, сэтгэл ханамжийн дүгнэлт. Хуудсыг шинэчлэх бүрт одоогийн өгөгдлөөр дахин тооцно.");
  const A=analyze(staff,pulse,roster),{n,target,notDone,unmatched,P,K,part,done,missing,low,gap,comp,train,other,mgrDone,suspect,weak,strong,hot,likes,themes,likeTeam}=A;
  const today=new Date().toDateString();let prev=null;
  try{const all=JSON.parse(localStorage.getItem(SNAP)||"{}");prev=all.cur&&all.cur.day!==today?all.cur:all.prev||null;
    localStorage.setItem(SNAP,JSON.stringify({prev,cur:{day:today,at:Date.now(),n,K,enps:P.hidden?null:P.enps,overall:P.hidden?null:P.overall}}))}catch(e){}
  const was=(v,pv,unit="")=>pv==null||pv===v?"":` <small class="muted">(${fmtDay(prev.at)}: ${pv}${unit})</small>`;
  const st=(v,g=70,w=50)=>v==null?"":v>=g?"good":v>=w?"warn":"bad",eSt=v=>v<0?"bad":v<=30?"warn":"good";
  const sgn=v=>(v>0?"+":"")+v;
  const sec=(no,title,body)=>`<section class="pp-sec"><div class="tag"><b>${no}</b>${title}</div>${body}</section>`;
  const head=(icon,t)=>`<h4 class="sum-h">${ic(icon)}${t}</h4>`;
  const note=t=>t?`<p class="sum-note">${ic("check")}<span>${t}</span></p>`:"";
  const bars=(rows,{max=100,fmt=v=>v+"%",cls=v=>st(v)}={})=>`<div class="deptbars sum-bars">${rows.map(([l,v,sub])=>`<div class="db"><span>${l}${sub!=null?` <small>(${sub})</small>`:""}</span><span class="t"><i style="width:${Math.min(100,v/max*100)}%" class="${cls(v)}"></i></span><span class="v ${cls(v)}">${fmt(v)}</span></div>`).join("")}</div>`;
  const tbl=(cols,rows)=>`<table class="sum-tbl"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const kpi=(icon,label,val,cls,sub,delta)=>`<div class="kpi">${ic(icon)}<div><span class="kpi-l">${label}</span><b class="kpi-v ${cls}">${val}</b><span class="kpi-s">${sub}${delta||""}</span></div></div>`;
  const pr=Math.round(Math.min(n,target)/target*100);
  $("#view").innerHTML=`<div class="stack" style="gap:24px">${tabs("sum")}
  ${msg?`<div class="err">${esc(msg)}</div>`:""}
  <article class="passport sum"><header class="pp-head">${PRINT}<div class="pp-id"><div><div class="pp-kicker">Нэгдсэн анализ · ${fmtDate(Date.now())}</div><h2>Ажилтны үнэлгээ: ${n} хүн (${target}-аас ${pr}%)</h2>
    <div class="pp-meta">${prev?`Харьцуулалт: ${fmtDay(prev.at)}-нд ${prev.n} хүнтэй байсан.`:"Дараагийн өдөр нээхэд өнөөдрийнхтэй харьцуулна."}</div></div></div></header>
  ${!n?`<div class="pp-sec"><p>Одоогоор бөглөсөн ажилтан алга.</p></div>${rosterSec(notDone,unmatched)}`:`
  <section class="pp-sec"><div class="sum-kpis">
    ${kpi("users","Оролцоо",`${n}/${target}`,st(pr,80,50),roster.length?`${pr}% · бөглөөгүй ${notDone.length}`:missing.length?`Эхлээгүй: ${esc(missing.join(", "))}`:"Бүх алба оролцсон",was(n,prev?.n))}
    ${kpi("book","Мэдлэг",K+"%",st(K),`Ажлын ${part("job")}% · нийтлэг ${part("common")}%`,was(K,prev?.K,"%"))}
    ${kpi("smile","Сэтгэл ханамж",P.hidden?"—":P.overall+"%",P.hidden?"":st(P.overall),"4–5 гэж хариулсан хувь",P.hidden?"":was(P.overall,prev?.overall,"%"))}
    ${kpi("thumb","eNPS",P.hidden?"—":sgn(P.enps),P.hidden?"":eSt(P.enps),P.hidden?"":`Үлдэх хүсэл ${P.stay}%`,P.hidden?"":was(P.enps,prev?.enps))}
  </div></section>
  ${rosterSec(notDone,unmatched)}
  ${raterSec()}
  ${sec("01","Мэдлэг",`<div class="sum-grid">
    <div>${head("building","Албаар · хүний тоо хаалтанд")}${bars(done.map(x=>[esc(x.d),x.k,x.n]),{cls:v=>st(v,75,60)})}</div>
    <div class="sum-card">${head("alert",`60%-иас доош · ${low.length} хүн`)}${low.length?tbl(["Нэр","Албан тушаал","Мэдлэг"],low.map(s=>[esc(s.name),esc(s.position),`<b class="${st(kPct(s),75,60)}">${kPct(s)}%</b>`])):'<p class="muted">Алга.</p>'}
      ${gap.length?`${head("chat",`Өөрийн үнэлгээ зөрсөн · ${gap.length} хүн`)}${tbl(["Нэр","Албан тушаал","Мэдлэг","Өөрөө"],gap.map(s=>[esc(s.name),esc(s.position),kPct(s)+"%",selfAvg(s).toFixed(1)+"/5"]))}`:""}</div></div>
    ${note(done.length?`Хамгийн өндөр: ${esc(done[0].d)} ${done[0].k}%. Хамгийн бага: ${esc(done[done.length-1].d)} ${done[done.length-1].k}%.`:"")}`)}
  ${sec("02","Ур чадвар, сургалт",`<div class="sum-grid">
    <div>${head("award","Өөрийн үнэлгээ · 5-аас")}${bars([...comp].reverse().map(c=>[esc(c.t),+c.v.toFixed(1)]),{max:5,fmt:v=>v.toFixed(1),cls:v=>v>=4?"good":v>=3.5?"":"warn"})}</div>
    <div>${head("cap","Хүссэн сургалт · хүний тоо")}${train.length?bars(train.map(([t,c])=>[esc(t),c]),{max:train[0][1],fmt:v=>String(v),cls:()=>""}):'<p class="muted">Алга.</p>'}
      ${other.length?`<p class="sum-small">Өөрөө бичсэн: ${esc(other.join("; "))}</p>`:""}</div></div>
    ${note(train.length?`Эхний ээлжийн сургалт: ${train.slice(0,3).map(([t,c])=>`${esc(t)} (${c})`).join(", ")}.`:"")}`)}`}
  ${sec("03","Сэтгэл ханамж",P.hidden?`<p>${P.n} хариулт ирсэн. ${MIN_GROUP}-аас дээш болмогц дүн гарна.</p>`:`
    ${head("smile","Чиглэлээр · 4–5 гэж хариулсан хувь")}${bars([...P.byGroup].sort((a,b)=>a.v-b.v).map(x=>[esc(x.g),x.v]))}
    <div class="sum-cols">
      <div class="sum-card">${head("down","Сул тал")}${weak.length?`<ul class="sum-list">${weak.map(x=>`<li><b class="${st(x.v)}">${x.v}%</b><span>${esc(x.t)}</span></li>`).join("")}</ul>`:'<p class="muted">50%-иас доош асуулт алга.</p>'}</div>
      <div class="sum-card">${head("up","Сайн тал")}${strong.length?`<ul class="sum-list">${strong.map(x=>`<li><b class="${st(x.v)}">${x.v}%</b><span>${esc(x.t)}</span></li>`).join("")}</ul>`:'<p class="muted">Алга.</p>'}</div>
      <div class="sum-card">${head("out","Гарвал шалтгаан нь")}<ul class="sum-list">${Object.entries(P.leave||{}).sort((a,b)=>b[1]-a[1]).map(([l,c])=>`<li><b>${c}</b><span>${esc(l)}</span></li>`).join("")}</ul></div>
    </div>
    ${hot.length?`${head("alert","Анхаарах алба")}${tbl(["Алба","Хүн","eNPS","45%-иас доош чиглэл"],hot.map(d=>[`<b>${esc(d.d)}</b>`,d.n,`<b class="${eSt(d.enps)}">${sgn(d.enps)}</b>`,d.bad.map(([g,v])=>`${esc(g)} <b class="${v<30?"bad":"warn"}">${v}%</b>`).join(" · ")||"—"]))}`:""}
    ${note(weak.length?`Хамгийн сул: ${esc(weak[0].t.replace(/\.$/,""))} (${weak[0].v}%).`:"")}`)}
  ${P.hidden?"":sec("04","Сэтгэгдэл",`${likes.length?`<p>Таалагддаг зүйлд <b>${likes.length}-аас ${likeTeam}</b> нь хамт олноо дурджээ. Өөрчлөх саналын сэдэв:</p>`:""}
    ${themes.length?`<div class="sum-themes">${themes.map(x=>`<details class="sum-card"><summary><span>${esc(x.t)}</span><b>${x.list.length}</b></summary><ul class="sum-ul">${x.list.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></details>`).join("")}</div>`:"<p class=\"muted\">Санал алга.</p>"}`)}
  ${sec("05","Хийх зүйл",`<ol class="sum-steps">${[`Удирдлагын үнэлгээ <b>${mgrDone}/${n}</b>.${mgrDone<n?" Алба бүрийн дарга нар паспорт дээр үнэлгээгээ оруулна.":""}`,
    roster.length?(notDone.length?`${notDone.length} ажилтан бөглөөгүй байна (дээрх жагсаалт).`:""):n<target?`${target-n} ажилтан бөглөөгүй байна${missing.length?", ялангуяа "+esc(missing.join(", ")):""}.`:"",
    suspect.length?`Шалгах бичлэг: ${suspect.map(s=>`${esc(s.name)} (${mmss(s.durationSec||0)})`).join(", ")}. Туршилт эсвэл хэт богино хугацаанд бөглөсөн бол устгана уу.`:""].filter(Boolean).map(t=>`<li>${t}</li>`).join("")}</ol>`)}
  </article></div>`;
  bindRoster();bindRaters();
}
// Who is in scope (HR's list): one line per person «Алба | Нэр | Албан тушаал»; empty list falls back to HEADCOUNT
// Show HR's spelling of each name (from the roster) instead of what the employee typed; stored records are not changed
function applyNames(){
  staff.forEach(s=>{if(s.rawName==null)s.rawName=s.name});
  const m=new Map((roster.length?matchRoster(roster,staff).pairs:[]).map(([r,st])=>[st,r.name]));
  staff.forEach(s=>{s.name=m.get(s)||s.rawName});
}
// Rating-only accounts: HR creates a code per department head; the code is shown once
function raterSec(){
  if(role!=="admin")return "";
  const D=Object.keys(DEPTS);
  return `<section class="pp-sec"><div class="tag"><b>!</b>Удирдлагын үнэлгээний эрх</div>
    <p class="sum-small" style="margin:0!important">Алба бүрийн даргад өгөх код. Код нь зөвхөн сонгосон албаны ажилтны нэр, албан тушаалыг харуулж, 8 ур чадварыг 1–5-аар үнэлүүлнэ. Оноо, сэтгэл ханамж, бусад мэдээлэл харагдахгүй. Нэвтрэх хаяг: hunnu.asia/talent/admin.html. Код энд хадгалагдана. Хэрэггүй болсон кодыг «Хаах»-аар устгана.</p>
    
    ${raters.length?`<table class="sum-tbl"><thead><tr><th>Хэнд</th><th>Алба</th><th>Код</th><th></th></tr></thead><tbody>${raters.map(r=>`<tr${r.code&&r.code===newCode?' style="background:var(--surface-2,#f4f4f4)"':""}><td><b>${esc(r.label)}</b></td><td>${esc((r.depts||[]).join(", "))}</td><td>${r.code?`<b style="font-family:var(--mono);font-size:16px">${esc(r.code)}</b>`:'<span class="muted">хуучин, дахин үүсгэнэ</span>'}</td><td style="text-align:right;white-space:nowrap">${r.code?`<button type="button" data-rcopy="${esc(r.code)}">${ic("copy")}Хуулах</button> `:""}<button type="button" class="danger" data-rdel="${esc(r.id)}">${ic("trash")}Хаах</button></td></tr>`).join("")}</tbody></table>`:""}
    <div class="sum-card"><label class="f">Хэнд (жишээ: Чанарын албаны дарга)<input type="text" id="rtLabel" maxlength="80"></label>
      <div class="chips">${D.map(d=>`<label class="chip"><input type="checkbox" data-rdept="${esc(d)}"> ${esc(d)}</label>`).join("")}</div>
      <div class="row"><button type="button" class="primary" id="rtAdd">${ic("userPlus")}Код үүсгэх</button><span id="rtMsg" class="muted"></span></div></div>
  </section>`;
}
function bindRaters(){
  const a=$("#rtAdd");if(!a)return;
  document.querySelectorAll("[data-rdept]").forEach(i=>i.onchange=()=>i.closest(".chip").classList.toggle("on",i.checked));
  a.onclick=async()=>{const label=$("#rtLabel").value.trim(),depts=[...document.querySelectorAll("[data-rdept]:checked")].map(x=>x.dataset.rdept);
    if(!label||!depts.length){$("#rtMsg").textContent="Нэр бичиж, алба сонгоно уу.";return}
    try{const j=await api("POST",{action:"raterAdd",label,depts});raters=j.raters;newCode=j.code;render()}catch(e){if(e.auth)return login(e.message);$("#rtMsg").textContent="Үүсгэж чадсангүй: "+e.message}};
  document.querySelectorAll("[data-rcopy]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.rcopy);b.innerHTML=ic("check")+"Хуулсан"}catch(e){prompt("Кодыг хуулна уу:",b.dataset.rcopy)}});
  document.querySelectorAll("[data-rdel]").forEach(b=>b.onclick=async()=>{if(!confirm("Энэ кодыг хаах уу? Тэр хүн дахин нэвтэрч чадахгүй."))return;
    try{const j=await api("POST",{action:"raterDel",id:b.dataset.rdel});raters=j.raters;newCode=null;render()}catch(e){if(e.auth)return login(e.message)}});
}
// Department head view: names and positions of their departments, 1–5 skill ratings, nothing else
function renderRater(){
  setBand("Удирдлагын","үнэлгээ.",`${raterLabel}: ажилтан бүрийн ур чадварыг 1–5-аар үнэлнэ үү. Дарсан даруйд хадгалагдана.`);
  const by={};staff.forEach(s=>(by[s.dept]=by[s.dept]||[]).push(s));
  const done=staff.filter(s=>COMP.every(c=>s.mgr?.[c.id])).length;
  $("#view").innerHTML=`<div class="stack" style="gap:20px">
    <div class="row spread"><div class="tag"><b>${done}/${staff.length}</b>Үнэлсэн ажилтан</div><div class="row"><button type="button" id="reload">${ic("refresh")}Шинэчлэх</button><button type="button" id="logout">${ic("logout")}Гарах</button></div></div>
    ${msg?`<div class="err">${esc(msg)}</div>`:""}
    <div class="sheet"><p class="sum-small" style="margin:0!important">${[1,2,3,4,5].map(n=>`<b>${n}</b> ${ANCHOR[n]}`).join(" · ")}</p></div>
    ${!staff.length?'<div class="sheet"><p style="margin:0">Таны албанаас үнэлгээ бөглөсөн ажилтан хараахан алга.</p></div>':Object.entries(by).map(([d,l])=>`<div class="stack" style="gap:12px"><h3 style="margin:0">${esc(d)}</h3>
      ${l.map(s=>`<article class="sheet stack" style="gap:10px"><div class="row spread"><div><b style="font-size:17px">${esc(s.name)}</b><div class="muted" style="font-size:13px">${esc(s.position)}</div></div>${COMP.every(c=>s.mgr?.[c.id])?'<span class="pill good">Үнэлсэн</span>':'<span class="pill idle">Дутуу</span>'}</div>
        <div class="mgr-list">${COMP.map(c=>`<div class="mg"><div><b>${c.t}</b><small>${esc(c.d||"")}</small></div><div class="score5">${[1,2,3,4,5].map(n=>`<button type="button" data-sid="${esc(s.id)}" data-c="${c.id}" data-n="${n}" class="${s.mgr?.[c.id]===n?"on":""}" title="${ANCHOR[n]}">${n}</button>`).join("")}</div></div>`).join("")}</div></article>`).join("")}</div>`).join("")}
  </div>`;
  $("#reload").onclick=()=>load();$("#logout").onclick=logout;
  document.querySelectorAll("[data-sid]").forEach(b=>b.onclick=async()=>{const s=staff.find(x=>x.id===b.dataset.sid);if(!s)return;
    try{const j=await api("POST",{action:"update",id:s.id,patch:{mgr:{...(s.mgr||{}),[b.dataset.c]:+b.dataset.n}}});s.mgr=j.row.mgr;msg="";const y=window.scrollY;renderRater();window.scrollTo(0,y)}
    catch(e){if(e.auth)return login(e.message);msg="Хадгалж чадсангүй: "+e.message;renderRater()}});
}
function rosterSec(notDone,unmatched){
  const head=(icon,t)=>`<h4 class="sum-h">${ic(icon)}${t}</h4>`;
  const tbl=(cols,rows)=>`<table class="sum-tbl"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const byDept={};notDone.forEach(r=>(byDept[r.dept||"—"]=byDept[r.dept||"—"]||[]).push(r));
  const txt=roster.map(r=>[r.dept,r.name,r.position].join(" | ")).join("\n");
  return `<section class="pp-sec"><div class="row spread"><div class="tag"><b>00</b>Оролцоо${roster.length?` · ${roster.length} хүнээс`:""}</div>${role==="admin"?`<button type="button" id="rsEdit">${ic("edit")}Жагсаалт засах</button>`:""}</div>
    ${rosterEdit?`<label class="f">Хамрагдах ажилтнууд, мөр бүрт «Алба | Нэр | Албан тушаал». Түр ажилтан, гарсан, жирэмсний амралттай хүнийг оруулахгүй.<textarea id="rsTxt" rows="14" spellcheck="false">${esc(txt)}</textarea></label>
      <div class="row"><button type="button" class="primary" id="rsSave">${ic("check")}Хадгалах</button><button type="button" id="rsNo">${ic("x")}Болих</button><span id="rsMsg" class="muted"></span></div>`
    :!roster.length?`<p class="muted">Хамрагдах ажилтны жагсаалт оруулаагүй тул оролцоог ${HEADCOUNT} хүнээс тооцож байна. «Жагсаалт засах» дарж оруулбал бөглөөгүй хүмүүс нэрээрээ харагдана.</p>`
    :`<div class="sum-grid"><div class="sum-card">${head("alert",`Бөглөөгүй · ${notDone.length} хүн`)}${notDone.length?tbl(["Алба","Нэр","Албан тушаал"],Object.entries(byDept).flatMap(([d,l])=>l.map((r,i)=>[i?"":`<b>${esc(d)}</b>`,esc(r.name),esc(r.position)]))):'<p class="good"><b>Бүгд бөглөсөн.</b></p>'}</div>
      ${unmatched.length?`<div class="sum-card">${head("chat",`Жагсаалттай тааруулж чадаагүй · ${unmatched.length}`)}<p class="sum-small" style="margin:0!important">Нэрээ өөрөөр бичсэн эсвэл жагсаалтад байхгүй хүн. Жагсаалтын нэрийг засвал таарна.</p>${tbl(["Нэр","Албан тушаал"],unmatched.map(s=>[esc(s.name),esc(s.position)]))}</div>`:""}</div>`}
  </section>`;
}
function bindRoster(){
  const e=$("#rsEdit");if(e)e.onclick=()=>{rosterEdit=true;render()};
  const no=$("#rsNo");if(no)no.onclick=()=>{rosterEdit=false;render()};
  const sv=$("#rsSave");if(sv)sv.onclick=async()=>{
    const list=$("#rsTxt").value.split("\n").map(l=>l.split("|").map(x=>x.trim())).filter(a=>a.some(Boolean)).map(a=>a.length>=3?{dept:a[0],name:a[1],position:a[2]}:{dept:"",name:a[0],position:a[1]||""});
    try{const j=await api("POST",{action:"roster",roster:list});roster=j.roster;applyNames();rosterEdit=false;render()}catch(err){if(err.auth)return login(err.message);$("#rsMsg").textContent="Хадгалж чадсангүй: "+err.message}};
}
const fmtDay=t=>{const d=new Date(t);return String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getDate()).padStart(2,"0")};

// Department contacts: one row per company number, grouped by shared mailbox; HR records who holds each number
const DOMAIN="hunnuconcrete.mn";
const CROWS=[
  {k:"77017575",n:"7701-7575",a:"Захиргаа",em:"info",land:true,h:"Оффис",st0:"Бэлэн",for:"Компанийн ерөнхий хаяг. Албан бичиг, гэрээ, хамтын ажиллагааны санал"},
  {k:"93090935",n:"9309-0935",a:"Үйлдвэр",em:"info",for:"Үйлдвэрлэл, засвар, тээвэр, Үйлдвэр 2.0"},
  {k:"legal",n:"",a:"Хууль, эрх зүй",em:"info",for:"Гэрээний төсөл, нэхэмжлэл, албан шаардлага. 9309-09 цувралаас шинэ SIM авна"},
  {k:"75754040",n:"7575-4040",a:"Систем хөгжүүлэлт",em:"info",land:true,h:"Оффис",st0:"Бэлэн",for:"REPORT360 — Hunnu Concrete, эрх, тоног төхөөрөмж"},
  {k:"93090906",n:"9309-0906",a:"Маркетинг, борлуулалт",em:"sales",h:"Хангал.Б",for:"Үнийн санал, бетон захиалга, хүргэлтийн цаг"},
  {k:"93090908",n:"9309-0908",a:"Маркетинг, борлуулалт",em:"sales",second:true,for:"Борлуулалтын 2 дахь дугаар"},
  {k:"93090932",n:"9309-0932",a:"Чанарын алба",em:"sales",for:"Шинжилгээний дүн, гэрчилгээ, гомдол"},
  {k:"93090938",n:"9309-0938",a:"Санхүү",em:"finance",for:"Нэхэмжлэх, төлбөр, тооцоо нийлэх акт"},
  {k:"93090931",n:"9309-0931",a:"Хүний нөөц",em:"hr",for:"Ажлын анкет, ажилтны асуудал, тодорхойлолт"}
];
let simEdit=null;
const fmtD=d=>d?d.replace(/-/g,"."):"";
function renderContacts(){
  setBand("Холбоо","барих.","Алба бүрийн утас, имэйл, компанийн дугаар хэнд байгаа.");
  const ed=role==="admin";
  const groups=["info","sales","finance","hr"].map(k=>CROWS.filter(d=>d.em===k));
  const who=r=>{const v=sims[r.k]||{};return v.holder??r.h??""};
  const stOf=r=>!r.n?["c-snew","Авах"]:who(r)?["c-sok",r.st0||"Олгосон"]:["c-stodo","Олгох"];
  // 01: one row per department, mailbox cell merged per shared address
  const depts=[];CROWS.forEach(r=>{const d=depts.find(x=>x.a===r.a);if(d)d.nums.push(r);else depts.push({a:r.a,em:r.em,for:r.for,nums:[r]})});
  const dg=["info","sales","finance","hr"].map(k=>depts.filter(d=>d.em===k));
  const t1=dg.map(g=>g.map((d,j)=>`<tr${j===0?' class="c-grp"':""}><td><b>${esc(d.a)}</b></td>
    <td class="c-num">${d.nums.map(r=>r.n?`<a href="tel:+976${r.k}">${r.n}</a>${r.land?'<span class="c-tag">суурин</span>':""}`:'<span class="c-ph">9309-09__</span>').join(' <span class="muted">·</span> ')}</td>
    ${j===0?`<td rowspan="${g.length}" class="c-mail"><a href="mailto:${d.em}@${DOMAIN}">${d.em}@${DOMAIN}</a></td>`:""}
    <td class="c-for">${esc(d.for)}</td></tr>`).join("")).join("");
  // 02: SIM matrix, read-only text; the pencil opens an edit row underneath
  const form=r=>{const v=sims[r.k]||{},h=who(r),names=people.map(p=>p.name);if(h&&!names.includes(h))names.unshift(h);
    return `<tr class="c-editrow"><td colspan="7"><div class="c-edit"><span class="c-elab">${r.n||"Хуулийн дугаар"} хэнд:</span><select id="seH"><option value="">— хоосон —</option>${names.map(n=>`<option${n===h?" selected":""}>${esc(n)}</option>`).join("")}</select>
      <label class="c-dl">Олгосон огноо<input type="text" id="seD" inputmode="numeric" maxlength="10" placeholder="2026.11.08" value="${esc(fmtD(v.date)||fmtD(new Date().toISOString().slice(0,10)))}"></label>
      <button type="button" class="primary" id="seOk">${ic("check")}Хадгалах</button><button type="button" id="seNo">${ic("x")}Болих</button></div>
      ${people.length?"":'<small class="muted">Нэр сонгохын тулд доорх ажилтны жагсаалтыг бөглөнө үү.</small>'}</td></tr>`};
  const t2=CROWS.map(r=>{const v=sims[r.k]||{},h=who(r),[sc,st]=stOf(r);return `<tr${simEdit===r.k?' class="c-on"':""}>
    <td class="c-num">${r.n?`<b>${r.n}</b>`:'<span class="c-ph">9309-09__</span>'}</td><td>${r.land?"Суурин":"G-Mobile"}</td><td>${esc(r.a)}${r.second?' <span class="muted">(2)</span>':""}</td>
    <td>${h?esc(h):`<span class="muted">${r.n?"—":"Дугаар аваагүй"}</span>`}</td><td class="c-num">${v.date?fmtD(v.date):'<span class="muted">—</span>'}</td>
    <td><span class="c-st ${sc}">${st}</span></td>
    <td class="c-act">${ed&&simEdit!==r.k?`<button type="button" class="c-pen" data-se="${r.k}" title="Засах" aria-label="${esc(r.n||r.a)} засах">${ic("edit")}</button>`:""}</td></tr>${simEdit===r.k?form(r):""}`}).join("");
  const byDept={};people.forEach(r=>(byDept[r.dept||"—"]=byDept[r.dept||"—"]||[]).push(r));
  const txt=people.map(r=>[r.dept,r.name,r.position].join(" | ")).join("\n");
  const free=CROWS.filter(r=>r.n&&!((sims[r.k]||{}).holder??r.h)).length;
  $("#view").innerHTML=`<div class="stack" style="gap:24px">${tabs("contacts")}
  ${msg?`<div class="err">${esc(msg)}</div>`:""}
  <div class="c-page">
  <section class="c-sec"><div class="c-h2">Алба бүрийн холбоо барих</div>
    <div class="c-box"><table class="c-tbl c-t1"><thead><tr><th>Алба</th><th>Утас</th><th>Имэйл</th><th>Юугаар хандах</th></tr></thead><tbody>${t1}</tbody></table></div>
  </section>
  <section class="c-sec"><div class="c-h2">Дугаарын матриц</div>
    <p class="c-note">Дугаар хэнд байгааг харандаа дарж жагсаалтаас сонгоно.${ed?"":" Энэ эрхээр зөвхөн харна."}${free?` Олгоогүй ${free} дугаар байна.`:""} <span id="simMsg" class="c-saved"></span></p>
    <div class="c-box"><table class="c-tbl c-t2"><thead><tr><th>Дугаар</th><th>Оператор</th><th>Алба</th><th>Одоо хэнд</th><th>Олгосон огноо</th><th>Төлөв</th><th></th></tr></thead><tbody>${t2}</tbody></table></div>
  </section>
  <section class="c-sec"><div class="c-h2">Хэрэглээ</div>
    <div class="sum-grid">
      <div class="sum-card"><h4 class="sum-h">${ic("send")}Имэйлийн гарын үсгийн жишээ</h4>
        <div class="c-sig"><b>[Нэр Овог]</b><span class="muted">Борлуулалтын менежер</span><b>Hunnu Concrete | Хүннү Конкрет</b><span class="c-num">sales@${DOMAIN} · 9309-0906</span><span class="muted">${DOMAIN}</span></div>
        <p class="sum-small" style="margin:0!important">Хувийн хаягийн оронд албаны хаягийг тавьснаар харилцагч хүнээс биш албаас хариу авна.</p></div>
      <div class="sum-card"><h4 class="sum-h">${ic("check")}Хэрэгжүүлэх алхам</h4>
        <ol class="c-steps">
          <li><b>Нэршлийг батлах.</b> 4 хаягийг (info, sales, finance, hr) удирдлагаар баталгаажуулна.</li>
          <li><b>Имэйл нээх.</b> Microsoft 365-д 4 хуваалцсан шуудан нээж, албаны ажилтнуудад эрх өгнө. Нэмэлт лиценз шаардахгүй.</li>
          <li><b>Дугаар.</b> G-Mobile-ийн 9309-09xx цувралаас компанийн нэр дээр SIM авсан. Захиргаа суурин 7701-7575-аа хэрэглэнэ. Хуулийн албаны дугаарыг G-Mobile-оос авна.</li>
          <li><b>Нийтлэх.</b> Вэбсайт, нэхэмжлэх, гэрээний загвар, Teams «HUN | …» бүлгүүдэд тавина.</li>
        </ol></div>
    </div>
  </section>
  <section class="c-sec"><div class="row spread"><div class="c-h2" style="margin:0">Ажилтны жагсаалт${people.length?` · ${people.length} хүн`:""}</div>${ed?`<button type="button" id="pplEdit">${ic("edit")}Жагсаалт засах</button>`:""}</div>
    ${peopleEdit?`<label class="f">Одоо ажиллаж буй ажилтнууд, мөр бүрт «Алба | Нэр | Албан тушаал». Ажлаас гарсан хүнийг эндээс устгана.<textarea id="pplTxt" rows="16" spellcheck="false">${esc(txt)}</textarea></label>
      <div class="row"><button type="button" class="primary" id="pplSave">${ic("check")}Хадгалах</button><button type="button" id="pplNo">${ic("x")}Болих</button>${roster.length?`<button type="button" id="pplRoster">${ic("copy")}Үнэлгээний жагсаалтаас хуулах</button>`:""}<span id="pplMsg" class="muted"></span></div>`
    :!people.length?`<p class="muted">Жагсаалт хоосон. «Жагсаалт засах» дарж одоо ажиллаж буй хүмүүсийг оруулбал дугаар олгохдоо нэрээр нь сонгоно.</p>`
    :`<details class="c-ppl"><summary>Жагсаалтыг харах</summary><div style="overflow-x:auto"><table class="sum-tbl"><thead><tr><th>Алба</th><th>Нэр</th><th>Албан тушаал</th></tr></thead><tbody>${Object.entries(byDept).flatMap(([d,l])=>l.map((r,i)=>`<tr><td>${i?"":`<b>${esc(d)}</b>`}</td><td>${esc(r.name)}</td><td>${esc(r.position)}</td></tr>`)).join("")}</tbody></table></div></details>
      <p class="sum-small" style="margin:0!important">Ажлаас гарсан хүнийг «Жагсаалт засах»-аас устгана. Тэр хүнд дугаар байвал дээрээс өөр хүнд шилжүүлнэ.</p>`}
  </section>
  </div></div>`;
  if(!ed)return;
  const rerender=()=>{const y=window.scrollY;renderContacts();bindTabs();window.scrollTo(0,y)};
  document.querySelectorAll("[data-se]").forEach(b=>b.onclick=()=>{simEdit=b.dataset.se;rerender()});
  const no2=$("#seNo");if(no2)no2.onclick=()=>{simEdit=null;rerender()};
  const ok=$("#seOk");if(ok)ok.onclick=async()=>{
    const raw=$("#seD").value.trim(),m=raw.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})$/),date=m?`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`:"";
    if(raw&&!m){$("#simMsg").textContent="Огноог 2026.11.08 хэлбэрээр бичнэ үү.";$("#seD").focus();return}
    ok.disabled=true;
    try{const j=await api("POST",{action:"sim",k:simEdit,holder:$("#seH").value,date});sims=j.sims;simEdit=null;rerender();$("#simMsg").textContent="Хадгаллаа."}
    catch(e){if(e.auth)return login(e.message);ok.disabled=false;$("#simMsg").textContent="Хадгалж чадсангүй: "+e.message}};
  $("#pplEdit").onclick=()=>{peopleEdit=true;render()};
  const no=$("#pplNo");if(no)no.onclick=()=>{peopleEdit=false;render()};
  const fr=$("#pplRoster");if(fr)fr.onclick=()=>{$("#pplTxt").value=roster.map(r=>[r.dept,r.name,r.position].join(" | ")).join("\n")};
  const sv=$("#pplSave");if(sv)sv.onclick=async()=>{
    const list=$("#pplTxt").value.split("\n").map(l=>l.split("|").map(x=>x.trim())).filter(a=>a.some(Boolean)).map(a=>a.length>=3?{dept:a[0],name:a[1],position:a[2]}:{dept:"",name:a[0],position:a[1]||""});
    try{const j=await api("POST",{action:"people",people:list});people=j.people;peopleEdit=false;render()}catch(err){if(err.auth)return login(err.message);$("#pplMsg").textContent="Хадгалж чадсангүй: "+err.message}};
}

// «Хүсэлт, засвар»: HR writes what to add or fix (with up to 3 screenshots); the Зөвлөх's assistant answers here
const RQC={sum:"Нэгдсэн анализ",staff:"Ажилтны паспорт",pulse:"Сэтгэл ханамж",app:"Горилогчид",contacts:"Холбоо барих",web:"Судалгаа, анкетын хуудас",other:"Бусад"},RQC0={board:"HR самбар",social:"Сошиал суваг"},RQS={new:["idle","Шинэ"],doing:["warn","Хийгдэж байна"],done:["good","Хийгдсэн"],no:["bad","Хийхгүй"]},IMC={};
const fmtAt=t=>{const d=new Date(t);return isNaN(d)?"":fmtDay(t)+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
const shrink=f=>new Promise((ok,no)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);const w=im.naturalWidth,h=im.naturalHeight;
  for(const [mx,q] of [[1800,.85],[1400,.8],[1100,.72]]){const k=Math.min(1,mx/Math.max(w,h)),c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);const d=c.toDataURL("image/jpeg",q);if(d.length<1400000)return ok(d)}
  no(new Error("Зураг хэт том байна."))};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("Зургийг уншиж чадсангүй."))};im.src=u});
async function imgData(q){if(IMC[q])return IMC[q];const r=await fetch("api/admin?img="+encodeURIComponent(q),{headers:{"x-admin-key":key}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Алдаа");return IMC[q]=j.d}
function renderReqs(){
  setBand("Хүсэлт,","засвар.","Юу нэмэх, хасах, засахаа бичнэ. Ажлын өдөр 2 цаг тутам шалгаж хариулна.");
  const row=r=>{const st=RQS[r.s]||RQS.new,u=/^https?:\/\//i.test(r.url||"")?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`:esc(r.url||"");
    return `<div class="rq" data-id="${esc(r.id)}"><div class="rh"><span class="pill ${st[0]}">${st[1]}</span><span>${RQC[r.cat]||RQC0[r.cat]||""}</span><span>${esc(r.by||"")}${r.by?" · ":""}${fmtAt(r.at)}</span>${r.s==="new"?`<button type="button" class="rx" data-rqdel>${ic("trash")}Устгах</button>`:""}</div><div class="rt">${esc(r.t)}</div>${r.url?`<div class="rl">${u}</div>`:""}${r.imgs?`<div class="rqims">${Array.from({length:r.imgs},(_,n)=>`<button type="button" class="rqim" data-q="${esc(r.id)}-${n}" aria-label="Зураг ${n+1}"></button>`).join("")}</div>`:""}${r.reply?`<div class="ra"><b>Хариу${r.rat?" · "+fmtAt(r.rat):""}:</b> ${esc(r.reply)}</div>`:""}</div>`};
  const isOpen=r=>r.s==="new"||r.s==="doing",open=reqs.filter(isOpen),closed=reqs.filter(r=>!isOpen(r));
  $("#view").innerHTML=`<div class="stack" style="gap:20px">${tabs("req")}
    <form class="rqf sheet" id="rqf" novalidate>
      <textarea name="t" maxlength="2000" placeholder="Юу нэмэх, хасах, засах вэ? Жишээ: анкетын асуулт засах, самбарт шинэ хэсэг нэмэх, ажлын зар..." aria-label="Хүсэлт"></textarea>
      <div class="rqr"><select name="cat" aria-label="Төрөл">${Object.entries(RQC).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select><input name="url" type="url" maxlength="300" placeholder="Холбоос (байвал)" aria-label="Холбоос"><button type="button" id="rqa">${ic("image")}Зураг</button><button type="submit" class="primary">${ic("send")}Илгээх</button></div>
      <input type="file" id="rqfile" accept="image/*" multiple hidden>
      <div class="rqp" id="rqp"></div>
      <p class="rqhint">Дэлгэцийн зургаа Ctrl+V (Mac: Cmd+V) дарж шууд буулгаж болно. 3 хүртэл зураг.</p>
      <p class="rqhint"><b>Зөвхөн HR сайтын (судалгаа, анкет, HR самбар) засвар хийгдэнэ. hunnu.asia болон бусад сайтын засвар энд хийгдэхгүй.</b></p>
    </form>
    <div class="rqs sheet" id="rqs">${open.map(row).join("")||'<p class="muted" style="margin:0">Нээлттэй хүсэлт алга.</p>'}${closed.length?`<details class="rqdone"><summary>Хийгдсэн, хаагдсан (${closed.length})${ic("chev")}</summary>${closed.map(row).join("")}</details>`:""}</div></div>`;
  bindTabs();
  const drawPick=()=>{$("#rqp").innerHTML=RQI.map((d,i)=>`<span><img src="${d}" alt=""><button type="button" data-rm="${i}" aria-label="Хасах">×</button></span>`).join("")};drawPick();
  const addFiles=async fs=>{for(const f of fs){if(!/^image\//.test(f.type))continue;if(RQI.length>=3){alert("3 хүртэл зураг");break}try{RQI.push(await shrink(f));drawPick()}catch(e){alert(e.message)}}};
  $("#rqa").onclick=()=>$("#rqfile").click();
  $("#rqfile").onchange=e=>{addFiles([...e.target.files]);e.target.value=""};
  $("#rqp").onclick=e=>{const b=e.target.closest("[data-rm]");if(b){RQI.splice(+b.dataset.rm,1);drawPick()}};
  const f=$("#rqf");
  f.onpaste=e=>{const fs=[...(e.clipboardData?.files||[])].filter(x=>/^image\//.test(x.type));if(fs.length){e.preventDefault();addFiles(fs)}};
  f.ondragover=e=>{e.preventDefault();f.classList.add("drag")};f.ondragleave=()=>f.classList.remove("drag");f.ondrop=e=>{e.preventDefault();f.classList.remove("drag");addFiles([...(e.dataTransfer?.files||[])])};
  f.onsubmit=async ev=>{ev.preventDefault();const b=f.querySelector("[type=submit]"),t=f.t.value.trim();if(t.length<3&&!RQI.length){f.t.focus();return}
    b.disabled=true;try{const j=await api("POST",{action:"req",t,cat:f.cat.value,url:f.url.value.trim(),imgs:RQI});reqs=j.reqs||reqs;RQI=[];render()}catch(e){if(e.auth)return login(e.message);alert(e.message);b.disabled=false}};
  document.querySelectorAll(".rqim[data-q]").forEach(async b=>{try{b.innerHTML=`<img src="${await imgData(b.dataset.q)}" alt="Хавсаргасан зураг">`}catch(e){b.textContent="—"}});
  $("#rqs").onclick=async e=>{const im=e.target.closest(".rqim");if(im){try{const bl=await (await fetch(await imgData(im.dataset.q))).blob();window.open(URL.createObjectURL(bl),"_blank")}catch(x){alert(x.message)}return}
    const d=e.target.closest("[data-rqdel]");if(!d||!confirm("Энэ хүсэлтийг устгах уу?"))return;
    try{const j=await api("POST",{action:"reqdel",id:d.closest(".rq").dataset.id});reqs=j.reqs||[];render()}catch(x){if(x.auth)return login(x.message);alert(x.message)}};
}
