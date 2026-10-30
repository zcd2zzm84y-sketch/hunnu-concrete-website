import {DEPTS,FAMILY,TENURE,N_COMMON,N_JOB,COMP,ANCHOR,TRAIN,PULSE,LIKERT,LEAVE,MIN_GROUP,posInfo,migrateRole} from "./data.mjs";
import {$,esc,shuffle,setBand,ic} from "./ui.mjs";

const LS2="hunnu-staff-draft-v2";
const freshStaff=()=>({stage:"info",emp:null,order:[],qs:{},shuffles:{},answers:{},idx:0,self:{},train:[],trainOther:"",pulse:{},enps:null,leave:"",like:"",change:"",startedAt:0,err:"",confirm:false});
let T=freshStaff();
const saveStaff=()=>{try{localStorage.setItem(LS2,JSON.stringify(T))}catch(e){}};
const clearStaff=()=>{try{localStorage.removeItem(LS2)}catch(e){}};
function loadStaff(){try{const d=JSON.parse(localStorage.getItem(LS2)||"null");if(d&&d.stage&&d.stage!=="info"&&d.stage!=="done"){T={...d,err:"",confirm:false};fixRole()}}catch(e){}}
// Drafts started before the official titles came in may carry old names: map them, or ask once on the last page
function fixRole(){if(!T.emp)return;const r=migrateRole(T.emp.dept,T.emp.position);T.emp={...T.emp,dept:r.dept||T.emp.dept,position:r.pos};
  if(r.ok){T.emp.family=posInfo(r.dept,r.pos)[1];T.needRole=false}else T.needRole=true;saveStaff()}
function roleBox(){const e=T.emp,dept=DEPTS[e.dept]?e.dept:"";
  return `<div class="sheet stack" id="roleBox"><div><b>Алба, албан тушаалаа сонгоно уу.</b> Албан тушаалын нэрс шинэчлэгдсэн тул дахин сонгоход л хангалттай. Бусад хариулт хадгалагдсан.</div>
    <div class="grid2"><label class="f">Алба, хэлтэс<select id="rDept"><option value="">— Сонгох —</option>${Object.keys(DEPTS).map(d=>`<option ${d===dept?"selected":""}>${d}</option>`).join("")}</select></label>
    <label class="f">Албан тушаал<select id="rPos"><option value="">— Сонгох —</option>${(DEPTS[dept]||[]).map(p=>`<option ${e.position===p[0]?"selected":""}>${p[0]}</option>`).join("")}</select></label></div></div>`}
async function drawStaff(dept,pos){
  const res=await fetch("api/quiz",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"staff",dept,position:pos})});
  const j=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(j.error||("HTTP "+res.status));
  return j;
}
const STEPS=[["info","Мэдээлэл"],["know","Мэдлэг"],["skill","Чадвар"],["pulse","Сэтгэл ханамж"]];
function stepper(cur){
  const ci=STEPS.findIndex(s=>s[0]===cur);
  return `<ol class="stepper">${STEPS.map((s,i)=>`<li class="${i<ci?"done":i===ci?"cur":""}"><b>${String(i+1).padStart(2,"0")}</b>${s[1]}</li>`).join("")}</ol>`;
}
function renderStaff(){
  if(T.stage==="info")return staffInfo();
  if(T.stage==="know")return staffKnow();
  if(T.stage==="skill")return staffSkill();
  if(T.stage==="pulse")return staffPulse();
  return staffDone();
}
function staffInfo(){
  setBand("Ажилтны","үнэлгээ 2026.","Мэдлэг, ур чадвар, сэтгэл ханамжийг нэг дор. Ойролцоогоор 20 минут.");
  const e=T.emp||{};const dept=e.dept||Object.keys(DEPTS)[0];
  $("#view").innerHTML=`<div class="stack" style="gap:24px">
    ${stepper("info")}
    <div class="stats">
      <div><b>${N_COMMON+N_JOB}</b><strong>Мэдлэгийн асуулт</strong><span>нийтлэг ${N_COMMON} + ажлын ${N_JOB}</span></div>
      <div><b>${COMP.length}</b><strong>Ур чадвар</strong><span>өөрийгөө 1–5 үнэлнэ</span></div>
      <div><b>${PULSE.length+1}</b><strong>Сэтгэл ханамж</strong><span>нэргүй хадгална</span></div>
      <div><b>~20′</b><strong>Хугацаа</strong><span>цаг хязгааргүй</span></div>
    </div>
    <form class="stack" id="fStaff" novalidate style="gap:18px">
      <div class="sheet stack">
        <div class="grid2">
          <label class="f">Овог нэр<input type="text" id="eName" value="${esc(e.name)}" autocomplete="name"></label>
          <label class="f">Ажилласан хугацаа<select id="eTen">${TENURE.map(t=>`<option ${e.tenure===t?"selected":""}>${t}</option>`).join("")}</select></label>
          <label class="f">Алба, хэлтэс<select id="eDept">${Object.keys(DEPTS).map(d=>`<option ${d===dept?"selected":""}>${d}</option>`).join("")}</select></label>
          <label class="f">Албан тушаал<select id="ePos">${DEPTS[dept].map(p=>`<option ${e.position===p[0]?"selected":""}>${p[0]}</option>`).join("")}</select></label>
        </div>
      </div>
      <div class="note">Мэдлэг, ур чадварын хэсэг таны нэртэй хадгалагдаж, сургалт, хөгжлийн төлөвлөгөөнд ашиглагдана. Сэтгэл ханамжийн хэсэг <b>таны нэргүйгээр</b>, зөвхөн алба, ажилласан хугацаатай тусад нь хадгалагдана.</div>
      ${T.err?`<div class="err" role="alert">${esc(T.err)}</div>`:""}
      <div class="row"><button class="yellow" type="submit">${ic("play")}Эхлэх</button></div>
    </form></div>`;
  $("#eDept").onchange=()=>{T.emp={...readEmp(),position:""};staffInfo()};
  $("#fStaff").addEventListener("submit",async ev=>{
    ev.preventDefault();const emp=readEmp();T.emp=emp;
    if(emp.name.length<3){T.err="Овог нэрээ бүтэн бичнэ үү.";return staffInfo()}
    const btn=ev.target.querySelector("[type=submit]");btn.disabled=true;btn.textContent="Ачаалж байна…";
    let d;try{d=await drawStaff(emp.dept,emp.position)}catch(e){T.err="Асуулт ачаалж чадсангүй: "+e.message+" Интернэт холболтоо шалгана уу.";return staffInfo()}
    T={...T,err:"",stage:"know",emp:{...emp,family:posInfo(emp.dept,emp.position)[1]},order:d.order,common:d.common,qs:d.qs,shuffles:Object.fromEntries(d.order.map(id=>[id,shuffle(d.qs[id].o.map((_,i)=>i))])),answers:{},idx:0,startedAt:Date.now()};
    saveStaff();renderStaff();
  });
}
function readEmp(){return{name:$("#eName").value.trim(),tenure:$("#eTen").value,dept:$("#eDept").value,position:$("#ePos").value}}
function staffKnow(){
  setBand(null);
  const i=T.idx,total=T.order.length,id=T.order[i],q={...T.qs[id],id};
  const answered=T.order.filter(id=>T.answers[id]!==undefined).length;
  const part=T.common.includes(q.id)?"Нийтлэг мэдлэг":"Ажлын мэдлэг · "+FAMILY[T.emp.family];
  $("#view").innerHTML=`<div class="stack">
    ${stepper("know")}
    <div class="bar"><div><div class="muted" style="font-size:12px">${esc(T.emp.name)} · ${esc(T.emp.position)}</div><div class="timer">${answered}/${total}</div></div>
      <div class="prog"><i style="width:${answered/total*100}%"></i></div></div>
    <div class="sheet stack">
      <div class="qmeta">Асуулт ${i+1} / ${total} · ${part}</div>
      <div class="qtext" id="qt">${esc(q.q)}</div>
      <div class="opts fresh" role="radiogroup" aria-labelledby="qt">${T.shuffles[q.id].map((oi,k)=>`<label class="opt ${T.answers[q.id]===oi?"sel":""}"><input type="radio" name="opt" id="sopt-${q.id}-${oi}" value="${oi}" ${T.answers[q.id]===oi?"checked":""}><span class="k">${"АБВГ"[k]}</span><span>${esc(q.o[oi])}</span></label>`).join("")}</div>
      <div class="row spread"><button type="button" id="prev" ${i===0?"disabled":""}>${ic("left")}Өмнөх</button>
      ${i<total-1?`<button type="button" class="primary" id="next">Дараах${ic("right")}</button>`:`<button type="button" class="yellow" id="next">Ур чадвар руу${ic("right")}</button>`}</div>
    </div>
    <div class="navgrid">${T.order.map((id,k)=>`<button type="button" data-go="${k}" class="${T.answers[id]!==undefined?"ans":""} ${k===i?"cur":""}" aria-label="Асуулт ${k+1}">${k+1}</button>`).join("")}</div>
  </div>`;
  const opts=document.querySelector(".opts");opts.addEventListener("pointermove",()=>opts.classList.remove("fresh"),{once:true});document.activeElement?.blur?.();
  document.querySelectorAll('input[name="opt"]').forEach(r=>r.onchange=()=>{T.answers[q.id]=+r.value;if(i<total-1)T.idx++;saveStaff();staffKnow()});
  $("#prev").onclick=()=>{T.idx--;saveStaff();staffKnow()};
  $("#next").onclick=()=>{if(i<total-1)T.idx++;else T.stage="skill";saveStaff();renderStaff();window.scrollTo(0,0)};
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{T.idx=+b.dataset.go;saveStaff();staffKnow()});
}
function scale5(name,val,labels){
  return `<div class="scale" role="radiogroup">${[1,2,3,4,5].map(n=>`<label class="sc ${val===n?"on":""}" title="${esc(labels?labels[n]:"")}"><input type="radio" name="${name}" value="${n}" ${val===n?"checked":""}><b>${n}</b>${labels?`<small>${esc(labels[n])}</small>`:""}</label>`).join("")}</div>`;
}
function staffSkill(){
  setBand(null);
  const done=COMP.filter(c=>T.self[c.id]).length;
  $("#view").innerHTML=`<div class="stack" style="gap:18px">
    ${stepper("skill")}
    <div><h2>Өөрийн ур чадварыг үнэлнэ үү</h2><p class="muted">Өнөөдрийн бодит түвшнээ сонгоно уу. Шууд удирдлага тань мөн адил үнэлж, хоёр үнэлгээг харьцуулна.</p></div>
    <div class="legend">${[1,2,3,4,5].map(n=>`<span><b>${n}</b> ${ANCHOR[n]}</span>`).join("")}</div>
    ${COMP.map(c=>`<div class="sheet comp"><div><b>${c.t}</b><small>${c.d}</small></div>${scale5("s-"+c.id,T.self[c.id],ANCHOR)}</div>`).join("")}
    <div class="sheet stack"><h2 style="font-size:16px">Ямар сургалтад хамрагдмаар байна вэ?</h2>
      <div class="chips">${TRAIN.map((t,i)=>`<label class="chip ${T.train.includes(t)?"on":""}"><input type="checkbox" id="tr-${i}" value="${esc(t)}" ${T.train.includes(t)?"checked":""}>${esc(t)}</label>`).join("")}</div>
      <label class="f">Бусад<input type="text" id="trO" value="${esc(T.trainOther)}"></label></div>
    ${T.err?`<div class="err">${esc(T.err)}</div>`:""}
    <div class="row spread"><button type="button" id="back">${ic("left")}Мэдлэг</button><button type="button" class="yellow" id="next">Сэтгэл ханамж руу${ic("right")}<span class="muted" style="color:inherit;font-weight:400">(${done}/${COMP.length})</span></button></div>
  </div>`;
  COMP.forEach(c=>document.querySelectorAll(`input[name="s-${c.id}"]`).forEach(r=>r.onchange=()=>{T.self[c.id]=+r.value;saveStaff();keep(staffSkill)}));
  document.querySelectorAll(".chip input").forEach(cb=>cb.onchange=()=>{T.train=[...document.querySelectorAll(".chip input")].filter(x=>x.checked).map(x=>x.value);saveStaff();keep(staffSkill)});
  $("#trO").oninput=e=>{T.trainOther=e.target.value;saveStaff()};
  $("#back").onclick=()=>{T.stage="know";T.err="";saveStaff();renderStaff()};
  $("#next").onclick=()=>{if(COMP.some(c=>!T.self[c.id])){T.err="Бүх ур чадварыг үнэлнэ үү.";return staffSkill()}T.err="";T.stage="pulse";saveStaff();renderStaff();window.scrollTo(0,0)};
}
function keep(fn){const y=window.scrollY;fn();window.scrollTo(0,y)}
function staffPulse(){
  setBand(null);
  const groups=[...new Set(PULSE.map(p=>p.g))];
  $("#view").innerHTML=`<div class="stack" style="gap:18px">
    ${stepper("pulse")}
    <div class="note"><b>Энэ хэсэг нэргүй.</b> Хариулт таны нэр, албан тушаалгүйгээр тусад нь хадгалагдана. Үр дүнг зөвхөн ${MIN_GROUP}-аас дээш хүнтэй бүлгээр нэгтгэж харуулна. Чөлөөтэй, үнэнээр хариулна уу.</div>
    <div class="legend"><span><b>1</b> Огт санал нийлэхгүй</span><span><b>3</b> Хэлж мэдэхгүй</span><span><b>5</b> Бүрэн санал нийлнэ</span></div>
    ${groups.map(g=>`<div class="sheet stack"><div class="qmeta">${g}</div>${PULSE.filter(p=>p.g===g).map(p=>`<div class="lik"><div>${esc(p.t)}</div>${likert("p-"+p.id,T.pulse[p.id])}</div>`).join("")}</div>`).join("")}
    <div class="sheet stack"><div class="qmeta">Санал болгох байдал</div>
      <div>Хүннү Конкретыг ажиллах газар болгон найз нөхөддөө санал болгох магадлал хэр вэ?</div>
      <div class="nps" role="radiogroup">${Array.from({length:11},(_,n)=>`<label class="sc ${T.enps===n?"on":""}"><input type="radio" name="enps" value="${n}" ${T.enps===n?"checked":""}><b>${n}</b></label>`).join("")}</div>
      <div class="row spread muted" style="font-size:12px"><span>0 — огт үгүй</span><span>10 — заавал санал болгоно</span></div>
    </div>
    <div class="sheet stack">
      <label class="f">Хэрэв ажлаас гарах бол хамгийн гол шалтгаан юу байх вэ?<select id="pLeave"><option value="">— Сонгох —</option>${LEAVE.map(l=>`<option ${T.leave===l?"selected":""}>${l}</option>`).join("")}</select></label>
      <label class="f">Ажлын байрандаа хамгийн их таалагддаг зүйл<textarea id="pLike" style="min-height:70px">${esc(T.like)}</textarea></label>
      <label class="f">Нэн тэргүүнд өөрчлөх ёстой нэг зүйл<textarea id="pChange" style="min-height:70px">${esc(T.change)}</textarea></label>
    </div>
    ${T.needRole?roleBox():""}
    ${T.confirm?`<div class="confirm stack"><div><b>Илгээх үү?</b> Илгээсний дараа өөрчлөх боломжгүй.</div>${T.err?`<div class="err">${esc(T.err)}</div>`:""}<div class="row"><button type="button" class="primary" id="send">${ic("send")}Илгээх</button><button type="button" id="noSend">${ic("left")}Буцах</button></div></div>`:(T.err?`<div class="err">${esc(T.err)}</div>`:"")}
    <div class="row spread"><button type="button" id="back">${ic("left")}Ур чадвар</button><button type="button" class="yellow" id="fin">${ic("flag")}Дуусгах</button></div>
  </div>`;
  PULSE.forEach(p=>document.querySelectorAll(`input[name="p-${p.id}"]`).forEach(r=>r.onchange=()=>{T.pulse[p.id]=+r.value;saveStaff();keep(staffPulse)}));
  document.querySelectorAll('input[name="enps"]').forEach(r=>r.onchange=()=>{T.enps=+r.value;saveStaff();keep(staffPulse)});
  $("#pLeave").onchange=e=>{T.leave=e.target.value;saveStaff()};
  $("#pLike").oninput=e=>{T.like=e.target.value;saveStaff()};
  $("#pChange").oninput=e=>{T.change=e.target.value;saveStaff()};
  $("#back").onclick=()=>{T.stage="skill";T.err="";T.confirm=false;saveStaff();renderStaff()};
  if($("#rDept")){$("#rDept").onchange=e=>{T.emp={...T.emp,dept:e.target.value,position:""};saveStaff();keep(staffPulse)};
    $("#rPos").onchange=e=>{T.emp={...T.emp,position:e.target.value};if(e.target.value){T.emp.family=posInfo(T.emp.dept,e.target.value)[1];T.err=""}saveStaff();keep(staffPulse)}}
  $("#fin").onclick=()=>{const miss=PULSE.filter(p=>!T.pulse[p.id]).length+(T.enps===null?1:0);
    if(T.needRole&&!T.emp.position){T.err="Алба, албан тушаалаа сонгоно уу.";T.confirm=false;return keep(staffPulse)}
    if(miss){T.err=miss+" асуулт хариултгүй байна.";T.confirm=false;return keep(staffPulse)}T.err="";T.confirm=true;keep(staffPulse)};
  if($("#send"))$("#send").onclick=sendStaff;
  if($("#noSend"))$("#noSend").onclick=()=>{T.confirm=false;keep(staffPulse)};
}
function likert(name,val){
  return `<div class="likert" role="radiogroup">${[1,2,3,4,5].map(n=>`<label class="sc ${val===n?"on":""}" title="${LIKERT[n-1]}"><input type="radio" name="${name}" value="${n}" ${val===n?"checked":""}><b>${n}</b><small>${LIKERT[n-1]}</small></label>`).join("")}</div>`;
}
let sendingStaff=false;
async function sendStaff(){
  if(sendingStaff)return;sendingStaff=true;
  const now=new Date();
  const staffDoc={name:T.emp.name,dept:T.emp.dept,position:T.emp.position,family:T.emp.family,tenure:T.emp.tenure,startedAt:T.startedAt,submittedAt:Date.now(),
    durationSec:Math.round((Date.now()-T.startedAt)/1000),questions:T.order,answers:T.answers,self:T.self,train:T.train,trainOther:T.trainOther,mgr:{},hrNote:"",plan:""};
  const pulseDoc={dept:T.emp.dept,tenure:T.emp.tenure,month:now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0"),items:T.pulse,enps:T.enps,leave:T.leave,like:T.like,change:T.change};
  try{
    const res=await fetch("api/submit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({staff:{...staffDoc,common:T.common},pulse:pulseDoc})});
    if(!res.ok){const j=await res.json().catch(()=>({}));
      if(j.code==="role"){T.needRole=true;T.emp={...T.emp,position:""};T.confirm=false;T.err=j.error;saveStaff();sendingStaff=false;keep(staffPulse);$("#roleBox")?.scrollIntoView({block:"center"});return}
      T.err="Илгээж чадсангүй: "+(j.error||("HTTP "+res.status));sendingStaff=false;return keep(staffPulse)}
  }catch(e){T.err="Илгээж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.";sendingStaff=false;return keep(staffPulse)}
  clearStaff();const name=T.emp.name;T={...freshStaff(),stage:"done",emp:{name}};sendingStaff=false;renderStaff();window.scrollTo(0,0);
}
function staffDone(){
  setBand("Баярлалаа,",(T.emp?.name||"")+".","");
  $("#view").innerHTML=`<div class="sheet stack"><p>Таны үнэлгээ хадгалагдлаа. Сэтгэл ханамжийн хариулт нэргүйгээр тусад нь хадгалагдсан. Үр дүнгээр сургалт, хөгжлийн төлөвлөгөө гаргаж танд мэдэгдэнэ.</p>
    <div class="row"><button type="button" class="primary" id="again">${ic("userPlus")}Дараагийн ажилтан</button></div></div>`;
  $("#again").onclick=()=>{T=freshStaff();renderStaff()};
}


loadStaff();
renderStaff();
