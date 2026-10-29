import {DEPTS,FAMILY,COMP,ANCHOR,APP_N_COMMON,APP_N_JOB,APP_MINUTES,posInfo} from "./data.mjs";
import {$,esc,shuffle,setBand,mmss} from "./ui.mjs";

// Job application: form → timed knowledge test → self-rated skills → sent to HR
const LS="hunnu-apply-draft-v1";
const EDU=["Бүрэн дунд","Мэргэжлийн (ТМС, коллеж)","Бакалавр","Магистр, доктор"];
const EXP=["Туршлагагүй","1 жил хүртэл","1–3 жил","3–5 жил","5-аас дээш жил"];
const LIC=["A","B","C","D","E","M"];
const TOTAL=APP_N_COMMON+APP_N_JOB;
const fresh=()=>({stage:"form",f:{consent:false,license:[]},order:[],qs:{},shuffles:{},answers:{},idx:0,self:{},startedAt:0,endedAt:0,timedOut:false,away:0,err:"",confirm:false});
let A=fresh();
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(A))}catch(e){}};
const clear=()=>{try{localStorage.removeItem(LS)}catch(e){}};
try{const d=JSON.parse(localStorage.getItem(LS)||"null");if(d&&d.stage&&d.stage!=="done")A={...fresh(),...d,err:"",confirm:false}}catch(e){}

const STEPS=[["form","Анкет"],["test","Мэдлэгийн шалгалт"],["skill","Ур чадвар"]];
const stepper=cur=>{const ci=STEPS.findIndex(s=>s[0]===cur);return `<ol class="stepper">${STEPS.map((s,i)=>`<li class="${i<ci?"done":i===ci?"cur":""}"><b>${String(i+1).padStart(2,"0")}</b>${s[1]}</li>`).join("")}</ol>`};
const keep=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};
const left=()=>Math.max(0,Math.round((A.startedAt+APP_MINUTES*60000-Date.now())/1000));
let tick=null;
function render(){
  clearInterval(tick);
  if(A.stage==="form")return form();
  if(A.stage==="test")return test();
  if(A.stage==="skill")return skill();
  return done();
}

// Positions HR has opened ("dept|position"); null while loading
let OPEN=null,openErr="";
async function loadOpenings(){
  try{const r=await fetch("/api/openings");const j=await r.json();if(!r.ok)throw new Error(j.error||("HTTP "+r.status));OPEN=j.openings||[]}
  catch(e){OPEN=[];openErr="Нээлттэй ажлын байрны жагсаалтыг ачаалж чадсангүй. Интернэт холболтоо шалгаад хуудсаа шинэчилнэ үү."}
}
function form(){
  setBand("Хүннү Конкретод","ажилд орох.","Анкетаа бөглөөд, сонгосон албан тушаалынхаа мэдлэгийн богино шалгалтыг өгнө үү. Нийт 30–40 минут.");
  if(!OPEN.length){$("#view").innerHTML=`<div class="sheet stack"><h2 style="margin:0">${openErr?"Түр алдаа гарлаа":"Одоогоор нээлттэй ажлын байр алга байна"}</h2><p style="margin:0">${openErr||"Шинэ ажлын байр нээгдэхэд энэ хуудсаар дамжуулан бүртгүүлэх боломжтой. Лавлах: 7575 4040 · info@hunnu.asia"}</p></div>`;return}
  const openSet=new Set(OPEN),wanted=(A.f.dept||"")+"|"+(A.f.position||"");
  const [dept,pos]=(openSet.has(wanted)?wanted:OPEN[0]).split("|");const f=A.f;
  const opt=(list,v)=>list.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");
  $("#view").innerHTML=`<div class="stack" style="gap:24px">
    ${stepper("form")}
    <div class="stats">
      <div><b>01</b><strong>Анкет</strong><span>хувийн ба ажлын мэдээлэл</span></div>
      <div><b>${TOTAL}</b><strong>Шалгалтын асуулт</strong><span>ерөнхий ${APP_N_COMMON} + мэргэжлийн ${APP_N_JOB}</span></div>
      <div><b>${APP_MINUTES}′</b><strong>Шалгалтын хугацаа</strong><span>хугацаа дуусахад автоматаар дуусна</span></div>
      <div><b>${COMP.length}</b><strong>Ур чадвар</strong><span>өөрийгөө 1–5 үнэлнэ</span></div>
    </div>
    <form class="stack" id="fApp" novalidate style="gap:18px">
      <div class="sheet stack"><div class="tag"><b>A</b>Сонирхож буй ажлын байр</div>
        <label class="f">Албан тушаал<select id="aPos">${Object.entries(DEPTS).map(([d,ps])=>[d,ps.filter(p=>openSet.has(d+"|"+p[0]))]).filter(([,ps])=>ps.length).map(([d,ps])=>`<optgroup label="${esc(d)}">${ps.map(p=>`<option value="${esc(d+"|"+p[0])}" ${d===dept&&p[0]===pos?"selected":""}>${esc(p[0])}</option>`).join("")}</optgroup>`).join("")}</select></label>
      </div>
      <div class="sheet stack"><div class="tag"><b>B</b>Хувийн мэдээлэл</div>
        <div class="grid2">
          <label class="f">Овог нэр *<input type="text" id="aName" value="${esc(f.name)}" autocomplete="name"></label>
          <label class="f">Утас *<input type="tel" id="aPhone" value="${esc(f.phone)}" autocomplete="tel" inputmode="tel"></label>
          <label class="f">И-мэйл<input type="email" id="aEmail" value="${esc(f.email)}" autocomplete="email"></label>
          <label class="f">Төрсөн он<input type="number" id="aBirth" value="${esc(f.birthYear)}" min="1950" max="2010" inputmode="numeric"></label>
          <label class="f">Оршин суугаа дүүрэг, сум<input type="text" id="aDistrict" value="${esc(f.district)}"></label>
        </div>
      </div>
      <div class="sheet stack"><div class="tag"><b>C</b>Боловсрол, туршлага</div>
        <div class="grid2">
          <label class="f">Боловсрол<select id="aEdu"><option value="">— Сонгох —</option>${opt(EDU,f.edu)}</select></label>
          <label class="f">Мэргэжил<input type="text" id="aMajor" value="${esc(f.major)}"></label>
          <label class="f">Энэ чиглэлийн ажлын туршлага<select id="aExp"><option value="">— Сонгох —</option>${opt(EXP,f.exp)}</select></label>
          <label class="f">Сүүлд ажилласан газар, албан тушаал<input type="text" id="aLast" value="${esc(f.lastJob)}"></label>
        </div>
        <div class="f">Жолооны үнэмлэхийн ангилал<div class="chips">${LIC.map(l=>`<label class="chip ${f.license.includes(l)?"on":""}"><input type="checkbox" value="${l}" ${f.license.includes(l)?"checked":""}>${l}</label>`).join("")}</div></div>
      </div>
      <div class="sheet stack"><div class="tag"><b>D</b>Нэмэлт</div>
        <div class="grid2">
          <label class="f">Хэзээнээс ажиллах боломжтой<input type="date" id="aStart" value="${esc(f.startDate)}"></label>
          <label class="f">Цалингийн хүлээлт (₮, сараар)<input type="text" id="aSalary" value="${esc(f.salary)}" inputmode="numeric"></label>
        </div>
        <label class="f">Яагаад Хүннү Конкретод ажиллахыг хүсэж байна вэ?<textarea id="aWhy" style="min-height:80px">${esc(f.why)}</textarea></label>
      </div>
      <label class="consent"><input type="checkbox" id="aConsent" ${f.consent?"checked":""}><span>Миний өгсөн мэдээллийг Хүннү Конкрет ХХК зөвхөн ажилд авах шалгаруулалтад ашиглахыг зөвшөөрч байна.</span></label>
      ${A.err?`<div class="err" role="alert">${esc(A.err)}</div>`:""}
      <div class="note">«Шалгалт эхлүүлэх» дармагц ${APP_MINUTES} минутын хугацаа эхэлнэ. Тайван, интернэт сайн газраас өгнө үү. Асуулт бүр нэг зөв хариулттай.</div>
      <div class="row"><button class="yellow" type="submit">Шалгалт эхлүүлэх →</button></div>
    </form></div>`;
  document.querySelectorAll(".chip input").forEach(cb=>cb.onchange=()=>{A.f=read();save();keep(form)});
  $("#fApp").addEventListener("input",()=>{A.f=read();save()});
  $("#fApp").addEventListener("submit",start);
}
function read(){
  const [dept,position]=$("#aPos").value.split("|");
  return{dept,position,name:$("#aName").value.trim(),phone:$("#aPhone").value.trim(),email:$("#aEmail").value.trim(),birthYear:$("#aBirth").value,district:$("#aDistrict").value.trim(),
    edu:$("#aEdu").value,major:$("#aMajor").value.trim(),exp:$("#aExp").value,lastJob:$("#aLast").value.trim(),license:[...document.querySelectorAll(".chip input:checked")].map(x=>x.value),
    startDate:$("#aStart").value,salary:$("#aSalary").value.trim(),why:$("#aWhy").value,consent:$("#aConsent").checked};
}
async function start(ev){
  ev.preventDefault();const f=read();A.f=f;
  const miss=f.name.length<3?"Овог нэрээ бүтэн бичнэ үү.":f.phone.replace(/\D/g,"").length<8?"Утасны дугаараа зөв бичнэ үү.":!f.consent?"Мэдээлэл ашиглах зөвшөөрлийг тэмдэглэнэ үү.":"";
  if(miss){A.err=miss;return keep(form)}
  const btn=ev.target.querySelector("[type=submit]");btn.disabled=true;btn.textContent="Ачаалж байна…";
  try{
    const res=await fetch("/api/quiz",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"apply",dept:f.dept,position:f.position})});
    const j=await res.json().catch(()=>({}));if(!res.ok)throw new Error(j.error||("HTTP "+res.status));
    A={...A,err:"",stage:"test",order:j.order,common:j.common,qs:j.qs,shuffles:Object.fromEntries(j.order.map(id=>[id,shuffle(j.qs[id].o.map((_,i)=>i))])),answers:{},idx:0,startedAt:Date.now(),timedOut:false,away:0};
  }catch(e){A.err="Шалгалт ачаалж чадсангүй: "+e.message+" Интернэт холболтоо шалгана уу.";return keep(form)}
  save();render();window.scrollTo(0,0);
}
function finishTest(timedOut){A.stage="skill";A.endedAt=Date.now();A.timedOut=!!timedOut;save();render();window.scrollTo(0,0)}
function test(){
  clearInterval(tick);
  if(left()<=0)return finishTest(true);
  setBand(null);
  const i=A.idx,id=A.order[i],q=A.qs[id],answered=A.order.filter(x=>A.answers[x]!==undefined).length;
  const part=A.common.includes(id)?"Ерөнхий мэдлэг":"Мэргэжлийн мэдлэг · "+FAMILY[posInfo(A.f.dept,A.f.position)[1]];
  $("#view").innerHTML=`<div class="stack">
    ${stepper("test")}
    <div class="bar"><div><div class="muted" style="font-size:13px">${esc(A.f.name)} · ${esc(A.f.position)}</div><div class="timer"><span id="clock">${mmss(left())}</span> үлдсэн · ${answered}/${TOTAL}</div></div>
      <div class="prog"><i style="width:${answered/TOTAL*100}%"></i></div></div>
    <div class="sheet stack">
      <div class="qmeta">Асуулт ${i+1} / ${TOTAL} · ${part}</div>
      <div class="qtext" id="qt">${esc(q.q)}</div>
      <div class="opts" role="radiogroup" aria-labelledby="qt">${A.shuffles[id].map((oi,k)=>`<label class="opt ${A.answers[id]===oi?"sel":""}"><input type="radio" name="opt" value="${oi}" ${A.answers[id]===oi?"checked":""}><span class="k">${"АБВГ"[k]}</span><span>${esc(q.o[oi])}</span></label>`).join("")}</div>
      <div class="row spread"><button type="button" id="prev" ${i===0?"disabled":""}>← Өмнөх</button>
      ${i<TOTAL-1?`<button type="button" class="primary" id="next">Дараах →</button>`:`<button type="button" class="yellow" id="next">Шалгалт дуусгах →</button>`}</div>
      ${A.confirm?`<div class="confirm stack"><div><b>${TOTAL-answered} асуулт хариултгүй байна.</b> Дуусгавал хариултыг өөрчлөх боломжгүй.</div><div class="row"><button type="button" class="primary" id="yes">Дуусгах</button><button type="button" id="no">Буцах</button></div></div>`:""}
    </div>
    <div class="navgrid">${A.order.map((x,k)=>`<button type="button" data-go="${k}" class="${A.answers[x]!==undefined?"ans":""} ${k===i?"cur":""}" aria-label="Асуулт ${k+1}">${k+1}</button>`).join("")}</div>
  </div>`;
  document.querySelectorAll('input[name="opt"]').forEach(r=>r.onchange=()=>{A.answers[id]=+r.value;if(i<TOTAL-1)A.idx++;save();test()});
  $("#prev").onclick=()=>{A.idx--;A.confirm=false;save();test()};
  $("#next").onclick=()=>{if(i<TOTAL-1){A.idx++;save();return test()}if(answered<TOTAL&&!A.confirm){A.confirm=true;return test()}A.confirm=false;finishTest(false)};
  if($("#yes"))$("#yes").onclick=()=>{A.confirm=false;finishTest(false)};
  if($("#no"))$("#no").onclick=()=>{A.confirm=false;test()};
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{A.idx=+b.dataset.go;save();test()});
  tick=setInterval(()=>{if(A.stage!=="test")return clearInterval(tick);const s=left();const c=$("#clock");if(c)c.textContent=mmss(s);if(s<=0){clearInterval(tick);finishTest(true)}},1000);
}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&A.stage==="test"){A.away++;save()}});

function skill(){
  setBand(null);
  $("#view").innerHTML=`<div class="stack" style="gap:18px">
    ${stepper("skill")}
    ${A.timedOut?`<div class="note">Шалгалтын хугацаа дууссан тул мэдлэгийн хэсэг автоматаар хаагдлаа.</div>`:""}
    <div><h2>Ур чадвараа үнэлнэ үү</h2><p class="muted">Одоогийн бодит түвшнээ сонгоно уу. Ярилцлагын үеэр эдгээрийг тодруулж асууна.</p></div>
    <div class="legend">${[1,2,3,4,5].map(n=>`<span><b>${n}</b> ${ANCHOR[n]}</span>`).join("")}</div>
    ${COMP.map(c=>`<div class="sheet comp"><div><b>${c.t}</b><small>${c.d}</small></div><div class="scale" role="radiogroup">${[1,2,3,4,5].map(n=>`<label class="sc ${A.self[c.id]===n?"on":""}"><input type="radio" name="s-${c.id}" value="${n}" ${A.self[c.id]===n?"checked":""}><b>${n}</b><small>${ANCHOR[n]}</small></label>`).join("")}</div></div>`).join("")}
    ${A.confirm?`<div class="confirm stack"><div><b>Анкетаа илгээх үү?</b> Илгээсний дараа өөрчлөх боломжгүй.</div>${A.err?`<div class="err">${esc(A.err)}</div>`:""}<div class="row"><button type="button" class="primary" id="send">Илгээх</button><button type="button" id="no">Буцах</button></div></div>`:(A.err?`<div class="err">${esc(A.err)}</div>`:"")}
    <div class="row"><button type="button" class="yellow" id="fin">Дуусгах</button></div>
  </div>`;
  COMP.forEach(c=>document.querySelectorAll(`input[name="s-${c.id}"]`).forEach(r=>r.onchange=()=>{A.self[c.id]=+r.value;save();keep(skill)}));
  $("#fin").onclick=()=>{if(COMP.some(c=>!A.self[c.id])){A.err="Бүх ур чадварыг үнэлнэ үү.";A.confirm=false;return keep(skill)}A.err="";A.confirm=true;keep(skill)};
  if($("#no"))$("#no").onclick=()=>{A.confirm=false;keep(skill)};
  if($("#send"))$("#send").onclick=send;
}
let sending=false;
async function send(){
  if(sending)return;sending=true;$("#send").disabled=true;
  const applicant={...A.f,questions:A.order,answers:A.answers,self:A.self,startedAt:A.startedAt,durationSec:Math.round(((A.endedAt||Date.now())-A.startedAt)/1000),timedOut:A.timedOut,away:A.away};
  try{
    const res=await fetch("/api/apply",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({applicant})});
    if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error||("HTTP "+res.status))}
  }catch(e){A.err="Илгээж чадсангүй: "+e.message+" Интернэт холболтоо шалгаад дахин оролдоно уу.";sending=false;return keep(skill)}
  clear();const name=A.f.name;A={...fresh(),stage:"done",f:{name}};sending=false;render();window.scrollTo(0,0);
}
function done(){
  setBand("Баярлалаа,",(A.f?.name||"")+".","");
  $("#view").innerHTML=`<div class="sheet stack"><p>Таны анкет болон шалгалтын хариулт Хүний нөөцийн албанд хүрлээ. Шалгаруулалтын дүнг таны үлдээсэн утсаар мэдэгдэнэ.</p>
    <p class="muted" style="margin:0">Лавлах: 7575 4040 · info@hunnu.asia</p></div>`;
}
loadOpenings().then(render);
