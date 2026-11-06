import {FAMILY,COMP,ANCHOR} from "./data.mjs";
import {$,esc,shuffle,setBand,mmss,ic} from "./ui.mjs";

// Knowledge test at the HR office. HR opens exam#<applicantId>.<token> from the dashboard; the link works once.
// Flow: start → timed test → self-rated skills → sent to HR. The server keeps the question set and the start time.
const h=decodeURIComponent(location.hash.slice(1)),dot=h.lastIndexOf(".");
const ID=dot>0?h.slice(0,dot):"",TOK=dot>0?h.slice(dot+1):"";
const LS="hunnu-exam-"+ID;
let A={stage:"intro",answers:{},shuffles:{},idx:0,self:{},away:0,confirm:false,err:""},X=null,off=0,tick=null;
try{const d=JSON.parse(localStorage.getItem(LS)||"null");if(d&&d.tok===TOK)A={...A,...d,confirm:false,err:""}}catch(e){}
const save=()=>{try{localStorage.setItem(LS,JSON.stringify({...A,tok:TOK}))}catch(e){}};
const clear=()=>{try{localStorage.removeItem(LS)}catch(e){}};
const keep=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};
const TOTAL=()=>X.order.length;
const left=()=>Math.max(0,Math.round((X.startedAt+X.minutes*60000-(Date.now()+off))/1000));
const STEPS=[["test","Мэдлэгийн шалгалт"],["skill","Ур чадвар"]];
const stepper=cur=>{const ci=STEPS.findIndex(s=>s[0]===cur);return `<ol class="stepper">${STEPS.map((s,i)=>`<li class="${i<ci?"done":i===ci?"cur":""}"><b>${String(i+1).padStart(2,"0")}</b>${s[1]}</li>`).join("")}</ol>`};
const fail=m=>{setBand("Шалгалт","нээгдсэнгүй.","");$("#view").innerHTML=`<div class="sheet stack"><p style="margin:0">${esc(m)}</p><p class="muted" style="margin:0">Хүний нөөц 8806 6831</p></div>`};

async function fetchExam(){
  const r=await fetch("api/exam?id="+encodeURIComponent(ID)+"&t="+encodeURIComponent(TOK),{cache:"no-store"});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||("HTTP "+r.status));
  X=j;off=j.now-Date.now();
  X.order.forEach(id=>{if(!A.shuffles[id])A.shuffles[id]=shuffle(X.qs[id].o.map((_,i)=>i))});
}
function render(){
  clearInterval(tick);
  if(A.stage==="intro")return intro();
  if(A.stage==="test")return test();
  if(A.stage==="skill")return skill();
  return done();
}
function intro(){
  setBand("Мэдлэгийн","шалгалт.","Хүннү Конкрет ХХК · Хүний нөөцийн алба");
  $("#view").innerHTML=`<div class="sheet stack">
    <p style="margin:0">Шалгалт нь ерөнхий ба мэргэжлийн асуулттай. Асуулт бүр нэг зөв хариулттай. «Эхлүүлэх» дармагц цаг эхэлнэ, хугацаа дуусахад автоматаар хаагдана.</p>
    <p class="muted" style="margin:0">Шалгалтын үеэр өөр цонх, хуудас нээхгүй байна уу. Утас ашиглахгүй. Дууссаны дараа ур чадвараа өөрөө 1–5-аар үнэлээд илгээнэ.</p>
    ${A.err?`<div class="err" role="alert">${esc(A.err)}</div>`:""}
    <div class="row"><button type="button" class="yellow" id="go">${ic("play")}Шалгалт эхлүүлэх</button></div></div>`;
  $("#go").onclick=async()=>{
    $("#go").disabled=true;
    try{document.documentElement.requestFullscreen?.().catch(()=>{})}catch(e){}
    try{await fetchExam();A.stage="test";A.err="";save();render();window.scrollTo(0,0)}
    catch(e){A.err=e.message;$("#go").disabled=false;intro()}};
}
function finishTest(timedOut){A.stage="skill";A.timedOut=!!timedOut;A.confirm=false;save();render();window.scrollTo(0,0)}
function test(){
  clearInterval(tick);
  if(left()<=0)return finishTest(true);
  setBand(null);
  const N=TOTAL(),i=A.idx,id=X.order[i],q=X.qs[id],answered=X.order.filter(x=>A.answers[x]!==undefined).length;
  const part=X.common.includes(id)?"Ерөнхий мэдлэг":"Мэргэжлийн мэдлэг · "+(FAMILY[X.family]||"");
  $("#view").innerHTML=`<div class="stack">
    ${stepper("test")}
    <div class="bar"><div><div class="muted" style="font-size:13px">${esc(X.name)} · ${esc(X.position)}</div><div class="timer"><span id="clock">${mmss(left())}</span> үлдсэн · ${answered}/${N}</div></div>
      <div class="prog"><i style="width:${answered/N*100}%"></i></div></div>
    <div class="sheet stack">
      <div class="qmeta">Асуулт ${i+1} / ${N} · ${part}</div>
      <div class="qtext" id="qt">${esc(q.q)}</div>
      <div class="opts fresh" role="radiogroup" aria-labelledby="qt">${A.shuffles[id].map((oi,k)=>`<label class="opt ${A.answers[id]===oi?"sel":""}"><input type="radio" name="opt" value="${oi}" ${A.answers[id]===oi?"checked":""}><span class="k">${"АБВГД"[k]}</span><span>${esc(q.o[oi])}</span></label>`).join("")}</div>
      <div class="row spread"><button type="button" id="prev" ${i===0?"disabled":""}>${ic("left")}Өмнөх</button>
      ${i<N-1?`<button type="button" class="primary" id="next">Дараах${ic("right")}</button>`:`<button type="button" class="yellow" id="next">${ic("flag")}Шалгалт дуусгах</button>`}</div>
      ${A.confirm?`<div class="confirm stack"><div><b>${N-answered} асуулт хариултгүй байна.</b> Дуусгавал хариултыг өөрчлөх боломжгүй.</div><div class="row"><button type="button" class="primary" id="yes">${ic("flag")}Дуусгах</button><button type="button" id="no">${ic("left")}Буцах</button></div></div>`:""}
    </div>
    <div class="navgrid">${X.order.map((x,k)=>`<button type="button" data-go="${k}" class="${A.answers[x]!==undefined?"ans":""} ${k===i?"cur":""}" aria-label="Асуулт ${k+1}">${k+1}</button>`).join("")}</div>
  </div>`;
  const opts=document.querySelector(".opts");opts.addEventListener("pointermove",()=>opts.classList.remove("fresh"),{once:true});document.activeElement?.blur?.();
  document.querySelectorAll('input[name="opt"]').forEach(r=>r.onchange=()=>{A.answers[id]=+r.value;if(i<N-1)A.idx++;save();test()});
  $("#prev").onclick=()=>{A.idx--;A.confirm=false;save();test()};
  $("#next").onclick=()=>{if(i<N-1){A.idx++;save();return test()}if(answered<N&&!A.confirm){A.confirm=true;return test()}finishTest(false)};
  if($("#yes"))$("#yes").onclick=()=>finishTest(false);
  if($("#no"))$("#no").onclick=()=>{A.confirm=false;test()};
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{A.idx=+b.dataset.go;save();test()});
  tick=setInterval(()=>{if(A.stage!=="test")return clearInterval(tick);const s=left();const c=$("#clock");if(c)c.textContent=mmss(s);if(s<=0){clearInterval(tick);finishTest(true)}},1000);
}
// Leaving the test window is counted and shown to HR
document.addEventListener("visibilitychange",()=>{if(document.hidden&&A.stage==="test"){A.away++;save()}});

function skill(){
  setBand(null);
  $("#view").innerHTML=`<div class="stack" style="gap:18px">
    ${stepper("skill")}
    ${A.timedOut?`<div class="note">Шалгалтын хугацаа дууссан тул мэдлэгийн хэсэг автоматаар хаагдлаа.</div>`:""}
    <div><h2>Ур чадвараа үнэлнэ үү</h2><p class="muted">Одоогийн бодит түвшнээ сонгоно уу. Ярилцлагын үеэр эдгээрийг тодруулж асууна.</p></div>
    <div class="legend">${[1,2,3,4,5].map(n=>`<span><b>${n}</b> ${ANCHOR[n]}</span>`).join("")}</div>
    ${COMP.map(c=>`<div class="sheet comp"><div><b>${c.t}</b><small>${c.d}</small></div><div class="scale" role="radiogroup">${[1,2,3,4,5].map(n=>`<label class="sc ${A.self[c.id]===n?"on":""}"><input type="radio" name="s-${c.id}" value="${n}" ${A.self[c.id]===n?"checked":""}><b>${n}</b><small>${ANCHOR[n]}</small></label>`).join("")}</div></div>`).join("")}
    ${A.confirm?`<div class="confirm stack"><div><b>Илгээх үү?</b> Илгээсний дараа өөрчлөх боломжгүй.</div>${A.err?`<div class="err">${esc(A.err)}</div>`:""}<div class="row"><button type="button" class="primary" id="send">${ic("send")}Илгээх</button><button type="button" id="no">${ic("left")}Буцах</button></div></div>`:(A.err?`<div class="err">${esc(A.err)}</div>`:"")}
    <div class="row"><button type="button" class="yellow" id="fin">${ic("flag")}Дуусгах</button></div>
  </div>`;
  COMP.forEach(c=>document.querySelectorAll(`input[name="s-${c.id}"]`).forEach(r=>r.onchange=()=>{A.self[c.id]=+r.value;save();keep(skill)}));
  $("#fin").onclick=()=>{if(COMP.some(c=>!A.self[c.id])){A.err="Бүх ур чадварыг үнэлнэ үү.";A.confirm=false;return keep(skill)}A.err="";A.confirm=true;keep(skill)};
  if($("#no"))$("#no").onclick=()=>{A.confirm=false;keep(skill)};
  if($("#send"))$("#send").onclick=send;
}
let sending=false;
async function send(){
  if(sending)return;sending=true;$("#send").disabled=true;
  try{
    const res=await fetch("api/exam",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:ID,t:TOK,answers:A.answers,self:A.self,away:A.away,timedOut:!!A.timedOut})});
    if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error||("HTTP "+res.status))}
  }catch(e){A.err="Илгээж чадсангүй: "+e.message;sending=false;return keep(skill)}
  clear();A={stage:"done"};history.replaceState(null,"",location.pathname);try{document.fullscreenElement&&document.exitFullscreen()}catch(e){}
  render();window.scrollTo(0,0);
}
function done(){
  setBand("Баярлалаа.","","");
  $("#view").innerHTML=`<div class="sheet stack"><p style="margin:0">Таны шалгалтын хариулт Хүний нөөцийн албанд хүрлээ. Хүний нөөцийн ажилтанд хэлж, ярилцлагаа үргэлжлүүлнэ үү.</p></div>`;
}

if(!ID||!TOK)fail("Шалгалтын холбоос буруу байна. Хүний нөөцийн ажилтанд хандана уу.");
else if(A.stage==="test"||A.stage==="skill")fetchExam().then(render,e=>fail(e.message));
else render();
