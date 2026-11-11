import {DEPTS,APP_N_COMMON,APP_N_JOB,APP_MINUTES,DISTRICTS,KHOROO} from "./data.mjs";
import {$,esc,setBand,ic} from "./ui.mjs";

// Job application: a short online form only. The knowledge test is taken in person at the HR office (exam.html, started by HR).
const LS="hunnu-apply-draft-v2";
const EDU=["Бүрэн дунд","Мэргэжлийн (ТМС, коллеж)","Бакалавр","Магистр, доктор"];
const EXP=["Туршлагагүй","1 жил хүртэл","1–3 жил","3–5 жил","5-аас дээш жил"];
const LIC=["A","B","C","D","E","M"];
const TOTAL=APP_N_COMMON+APP_N_JOB;
const fmtNum=v=>{const d=String(v??"").replace(/\D/g,"");return d?Number(d).toLocaleString("en-US"):String(v??"")};
const fresh=()=>({stage:"form",f:{consent:false,license:[]},err:""});
let A=fresh();
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(A))}catch(e){}};
const clear=()=>{try{localStorage.removeItem(LS);localStorage.removeItem("hunnu-apply-draft-v1")}catch(e){}};
try{const d=JSON.parse(localStorage.getItem(LS)||"null");if(d&&d.stage==="form")A={...fresh(),f:{...fresh().f,...d.f}}}catch(e){}
// Carry over the personal details of an old draft (from when the test was online); its test part is dropped
try{if(!localStorage.getItem(LS)){const o=JSON.parse(localStorage.getItem("hunnu-apply-draft-v1")||"null");if(o&&o.f)A.f={...A.f,...o.f}}}catch(e){}

const keep=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};
function render(){return A.stage==="done"?done():form()}

// Positions HR has opened ("dept|position"); null while loading
let OPEN=null,openErr="";
async function loadOpenings(){
  try{const r=await fetch("api/openings");const j=await r.json();if(!r.ok)throw new Error(j.error||("HTTP "+r.status));OPEN=j.openings||[]}
  catch(e){OPEN=[];openErr="Нээлттэй ажлын байрны жагсаалтыг ачаалж чадсангүй. Интернэт холболтоо шалгаад хуудсаа шинэчилнэ үү."}
}
function form(){
  setBand("Хүннү Конкретод","ажилд орох.","Анкетаа 5 минутад бөглөөд илгээнэ үү. Тохирох бол Хүний нөөцийн алба утсаар холбогдож, оффист урина.");
  if(!OPEN.length){$("#view").innerHTML=`<div class="sheet stack"><h2 style="margin:0">${openErr?"Түр алдаа гарлаа":"Одоогоор нээлттэй ажлын байр алга байна"}</h2><p style="margin:0">${openErr||"Шинэ ажлын байр нээгдэхэд энэ хуудсаар дамжуулан бүртгүүлэх боломжтой. Лавлах: Хүний нөөц 8806 6831, munkhmandakh@teso.mn · Компани 7575 4040 · info@hunnu.asia"}</p></div>`;return}
  const openSet=new Set(OPEN),wanted=(A.f.dept||"")+"|"+(A.f.position||"");
  const [dept,pos]=(openSet.has(wanted)?wanted:OPEN[0]).split("|");const f=A.f;
  const opt=(list,v)=>list.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");
  $("#view").innerHTML=`<div class="stack" style="gap:24px">
    <div class="stats">
      <div><b>01</b><strong>Онлайн анкет</strong><span>одоо, 5 минут</span></div>
      <div><b>02</b><strong>Утсаар урилга</strong><span>Хүний нөөцийн алба холбогдоно</span></div>
      <div><b>03</b><strong>Мэдлэгийн шалгалт</strong><span>HR оффист, ${TOTAL} асуулт, ${APP_MINUTES} минут</span></div>
      <div><b>04</b><strong>Ярилцлага</strong><span>шалгалтын дараа, тэр өдөртөө</span></div>
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
        </div>
        <div class="grid2">
          <label class="f">Гэрийн хаяг: дүүрэг *<select id="aDistrict"><option value="">— Сонгох —</option>${opt(DISTRICTS,f.district)}</select></label>
          <label class="f">Хороо<select id="aKhoroo" ${KHOROO[f.district]?"":"disabled"}><option value="">${KHOROO[f.district]?"— Сонгох —":"—"}</option>${Array.from({length:KHOROO[f.district]||0},(_,i)=>`<option value="${i+1}" ${String(f.khoroo)===String(i+1)?"selected":""}>${i+1}-р хороо</option>`).join("")}</select></label>
        </div>
        <label class="f">Байршил, ойролцоох газар<input type="text" id="aArea" value="${esc(f.area)}" placeholder="Жишээ: Яармаг, 5-р гудамж"></label>
        <div class="muted" style="font-size:13px">Манай Үйлдвэр 2.0 Хан-Уул дүүрэгт, Яармаг, Нисэхийн орчимд байрладаг.</div>
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
          <label class="f">Цалингийн хүлээлт (₮, сараар)<input type="text" id="aSalary" value="${esc(fmtNum(f.salary))}" inputmode="numeric" placeholder="Жишээ: 2,500,000"></label>
        </div>
        <label class="f">Яагаад Хүннү Конкретод ажиллахыг хүсэж байна вэ?<textarea id="aWhy" style="min-height:80px">${esc(f.why)}</textarea></label>
      </div>
      <label class="consent"><input type="checkbox" id="aConsent" ${f.consent?"checked":""}><span>Миний өгсөн мэдээллийг Хүннү Конкрет ХХК зөвхөн ажилд авах шалгаруулалтад ашиглахыг зөвшөөрч байна.</span></label>
      ${A.err?`<div class="err" role="alert">${esc(A.err)}</div>`:""}
      <div class="note">Мэдлэгийн шалгалтыг онлайнаар биш, манай оффист ирж өгнө. Шалгалтын өдөр иргэний үнэмлэх, боловсролын баримтаа авчрна уу.</div>
      <div class="row"><button class="yellow" type="submit">${ic("send")}Анкет илгээх</button></div>
    </form></div>`;
  document.querySelectorAll(".chip input").forEach(cb=>cb.onchange=()=>{A.f=read();save();keep(form)});
  // Thousands separators while typing: 2500000 → 2,500,000
  $("#aSalary").oninput=e=>{const el=e.target,d=el.value.replace(/\D/g,"").slice(0,12);el.value=d?Number(d).toLocaleString("en-US"):""};
  $("#aDistrict").onchange=()=>{A.f={...read(),khoroo:""};save();keep(form)};
  $("#fApp").addEventListener("input",()=>{A.f=read();save()});
  $("#fApp").addEventListener("submit",send);
}
function read(){
  const [dept,position]=$("#aPos").value.split("|");
  return{dept,position,name:$("#aName").value.trim(),phone:$("#aPhone").value.trim(),email:$("#aEmail").value.trim(),birthYear:$("#aBirth").value,district:$("#aDistrict").value,khoroo:$("#aKhoroo").value,area:$("#aArea").value.trim(),
    edu:$("#aEdu").value,major:$("#aMajor").value.trim(),exp:$("#aExp").value,lastJob:$("#aLast").value.trim(),license:[...document.querySelectorAll(".chip input:checked")].map(x=>x.value),
    startDate:$("#aStart").value,salary:$("#aSalary").value.trim(),why:$("#aWhy").value,consent:$("#aConsent").checked};
}
let sending=false;
async function send(ev){
  ev.preventDefault();if(sending)return;const f=read();A.f=f;
  const miss=f.name.length<3?"Овог нэрээ бүтэн бичнэ үү.":f.phone.replace(/\D/g,"").length<8?"Утасны дугаараа зөв бичнэ үү.":!f.district?"Гэрийн хаягийн дүүргээ сонгоно уу.":!f.consent?"Мэдээлэл ашиглах зөвшөөрлийг тэмдэглэнэ үү.":"";
  if(miss){A.err=miss;return keep(form)}
  sending=true;const btn=ev.target.querySelector("[type=submit]");btn.disabled=true;btn.textContent="Илгээж байна…";
  try{
    const res=await fetch("api/apply",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({applicant:f,src:SRC})});
    if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error||("HTTP "+res.status))}
  }catch(e){A.err="Илгээж чадсангүй: "+e.message+" Интернэт холболтоо шалгаад дахин оролдоно уу.";sending=false;return keep(form)}
  clear();A={...fresh(),stage:"done",f:{name:f.name}};sending=false;render();window.scrollTo(0,0);
}
function done(){
  setBand("Баярлалаа,",(A.f?.name||"")+".","");
  $("#view").innerHTML=`<div class="sheet stack"><p>Таны анкет Хүний нөөцийн албанд хүрлээ. Тохирох бол бид таны үлдээсэн утсаар холбогдож, оффист урина. Оффист ${APP_MINUTES} минутын мэдлэгийн богино шалгалт өгөөд, ярилцлагад орно.</p>
    <p class="muted" style="margin:0">Лавлах: Хүний нөөц 8806 6831, munkhmandakh@teso.mn · Компани 7575 4040 · info@hunnu.asia</p></div>`;
}
// Links from posts carry ?src=fb (where the applicant came from) and ?job=dept|position (preselected)
const Q=new URLSearchParams(location.search),SRC=/^[a-z0-9_-]{1,20}$/.test(Q.get("src")||"")?Q.get("src"):"";
{const m=/^(\d+)-(\d+)$/.exec(Q.get("job")||""),d=m&&Object.keys(DEPTS)[+m[1]],p=d&&DEPTS[d][+m[2]];if(p&&A.stage==="form")A.f={...A.f,dept:d,position:p[0]}}
loadOpenings().then(render);
