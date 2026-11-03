// Leadership deck of the combined analysis (PptxGenJS). Same numbers as the «Нэгдсэн анализ» tab; positions only, no names.
// Look follows the company profile deck: A4 landscape, Arial, white pages, #333/#9A9A9A, numbered section header, "Building Smarter." footer.
// Bars are drawn as shapes on a fixed grid (not chart objects) so every chart page lines up; icons are thin-line PNGs passed in by the caller.
import {HEADCOUNT} from "./data.mjs";
import {kPct,selfAvg} from "./analysis.mjs";

export const THEME={ink:"333333",body:"333333",muted:"9A9A9A",soft:"C9C9C9",track:"EFEFEF",font:"Arial"};
const W=11.69,H=8.26,X=0.55,CW=10.59,TOP=2.45;
const pct=v=>v==null?"—":v+"%";
const sign=v=>v==null?"—":(v>0?"+":"")+v;
const cut=(t,n)=>t.length>n?t.slice(0,n-1).trim()+"…":t;
const clean=t=>t.replace(/\.$/,"");

// Lucide-style 24px line icons; the caller rasterizes them (iconSvg) and passes {name: dataURL}
export const ICONS={
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  book:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  thumb:'<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  anchor:'<circle cx="12" cy="5" r="3"/><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>',
  smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  chat:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  award:'<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  cap:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
  down:'<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  up:'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  list:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  wallet:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  check:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
};
export const STATUS={red:"D64545",amber:"E0A100",green:"2E9E5B",blue:"2F6FB3"};
export const ICON_COLORS={ink:"#333333",muted:"#9A9A9A",white:"#FFFFFF"};
export const iconSvg=(name,color="#333333",px=96)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
export async function iconPngs(){const out={};
  for(const n of Object.keys(ICONS))for(const [tone,col] of Object.entries(ICON_COLORS)){
    const img=new Image();img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(iconSvg(n,col));await img.decode();
    const c=document.createElement("canvas");c.width=c.height=96;c.getContext("2d").drawImage(img,0,0,96,96);out[n+"_"+tone]=c.toDataURL("image/png")}
  return out}
const THEME_ICON={"Хамт олон, харилцаа":"users","Ажлын ачаалал":"clock","Журам, систем, эмх цэгц":"list","Шийдвэр, хүсэлтийн шуурхай байдал":"zap","Цалин, урамшуулал":"wallet","Ажлын орчин, аюулгүй байдал":"shield","Хөгжил, сургалт":"cap"};

export function buildDeck(pptx,A,{date,logo,icons={}}){
  const T=THEME,F=T.font,P=A.P;
  pptx.defineLayout({name:"A4L",width:W,height:H});pptx.layout="A4L";
  pptx.title="Ажилтны үнэлгээ 2026 — Нэгдсэн дүн";pptx.company="Hunnu Concrete | Хүннү Конкрет";pptx.author="Хүний нөөцийн алба";
  const tx=(s,text,o)=>s.addText(text,{fontFace:F,margin:0,color:T.body,valign:"top",...o});
  const box=(s,x,y,w,h,color)=>s.addShape("rect",{x,y,w,h,fill:{color},line:{color,width:0}});
  const rule=(s,y,color=T.ink,x=X,w=CW,pt=0.75)=>s.addShape("line",{x,y,w,h:0,line:{color,width:pt}});
  const ico=(s,name,x,y,sz,tone="ink")=>{const d=icons[name+"_"+tone]||icons[name];if(d)s.addImage({data:d,x,y,w:sz,h:sz})};
  const ring=(s,name,x,y,d=0.5)=>{s.addShape("ellipse",{x,y,w:d,h:d,fill:{color:"FFFFFF"},line:{color:T.soft,width:0.75}});ico(s,name,x+d*0.25,y+d*0.25,d*0.5)};
  const disc=(s,name,x,y,d=0.5)=>{s.addShape("ellipse",{x,y,w:d,h:d,fill:{color:T.ink},line:{color:T.ink,width:0}});ico(s,name,x+d*0.24,y+d*0.24,d*0.52,"white")};
  // Section label: small muted icon + [ CAPS ]
  const label=(s,t,o,icon)=>{const{x,y}=o;if(icon)ico(s,icon,x,y+0.01,0.17,"muted");tx(s,`[ ${t} ]`,{fontSize:7.5,bold:true,color:T.muted,charSpacing:1,h:0.2,...o,x:icon?x+0.24:x})};
  const pair=(s,a,b,o)=>tx(s,[{text:a,options:{color:T.ink,breakLine:true}},{text:b,options:{color:T.muted}}],{fontSize:22,bold:true,h:0.95,w:CW,x:X,y:1.25,lineSpacingMultiple:0.95,...o});
  let no=1;
  const page=(num,cap)=>{
    const s=pptx.addSlide();no++;s.background={color:"FFFFFF"};
    s.addShape("roundRect",{x:X,y:0.4,w:0.36,h:0.36,rectRadius:0.06,fill:{color:T.ink},line:{color:T.ink,width:0}});
    tx(s,num,{x:X,y:0.4,w:0.36,h:0.36,fontSize:10,bold:true,color:"FFFFFF",align:"center",valign:"middle"});
    tx(s,cap,{x:1.04,y:0.4,w:7,h:0.36,fontSize:9,bold:true,color:T.ink,charSpacing:1,valign:"middle"});
    if(logo)s.addImage({data:logo,x:10.49,y:0.50,w:0.66,h:0.25});
    rule(s,0.89);
    rule(s,7.61,T.muted,X,CW,0.5);
    tx(s,"Building Smarter.",{x:X,y:7.74,w:3,h:0.2,fontSize:8,color:T.muted});
    tx(s,String(no).padStart(2,"0"),{x:10.4,y:7.74,w:0.74,h:0.2,fontSize:8,color:T.body,align:"right"});
    return s;
  };
  // Horizontal bars on a fixed grid: left-aligned label column, grey track, value bar, value at the track end
  const hbar=(s,rows,{x,y,w,lw=2.1,rh=0.5,max=100,fmt=v=>v+"%",dark=()=>true,ref}={})=>{
    const tw=w-lw-0.55,bx=x+lw;
    if(ref!=null){const rx=bx+tw*ref/max;s.addShape("line",{x:rx,y:y-0.05,w:0,h:rows.length*rh,line:{color:T.muted,width:0.5,dashType:"dash"}});
      tx(s,fmt(ref),{x:rx-0.3,y:y+rows.length*rh-0.02,w:0.6,h:0.18,fontSize:7,color:T.muted,align:"center"})}
    rows.forEach(([l,v],i)=>{const cy=y+i*rh,mid=cy+rh/2;
      tx(s,l,{x,y:cy,w:lw-0.15,h:rh,fontSize:9,color:T.body,valign:"middle"});
      box(s,bx,mid-0.11,tw,0.22,T.track);
      const col=dark(v)?T.ink:T.soft;
      if(v>0)s.addShape("rect",{x:bx,y:mid-0.11,w:Math.max(0.02,tw*Math.min(v,max)/max),h:0.22,fill:{color:col},line:{color:col,width:0},objectName:"anim-bar-"+i});
      tx(s,fmt(v),{x:bx+tw+0.08,y:cy,w:0.47,h:rh,fontSize:9,bold:true,color:T.ink,valign:"middle",objectName:"anim-val-"+i})});
    return y+rows.length*rh;
  };
  // Right-hand card: top rule, icon label, rows of text
  const card=(s,{x,y,w,h},title,icon,lines,fs=9.5)=>{rule(s,y,T.ink,x,w);label(s,title,{x,y:y+0.14,w:w-0.3},icon);
    tx(s,lines.map(t=>({text:t,options:{breakLine:true,paraSpaceAfter:4}})),{x,y:y+0.45,w,h:h-0.45,fontSize:fs,color:T.body})};
  const list=(s,items,o)=>tx(s,items.filter(Boolean).map(t=>({text:t,options:{bullet:{indent:12},paraSpaceAfter:7,breakLine:true}})),{fontSize:11,color:T.body,...o});
  // KPI row (REPORT360 style): dark discs with white icons on one grey line, CAPS label, value, description
  const strip=(s,cols)=>{rule(s,5.9,"CCCCCC",X,CW,1);[0.55,3.20,5.84,8.49].forEach((x,i)=>{const c=cols[i];if(!c)return;
    disc(s,c[3],x,5.6,0.6);
    tx(s,c[1].toUpperCase(),{x,y:6.35,w:2.5,h:0.2,fontSize:7.5,bold:true,color:"777777",charSpacing:1});
    tx(s,c[0],{x,y:6.56,w:2.5,h:0.42,fontSize:22,bold:true,color:T.ink});
    tx(s,c[2],{x,y:7.0,w:2.45,h:0.45,fontSize:8.3,color:"555555"})})};
  // Dark highlight card: white text on #333
  const darkCard=(s,{x,y,w,h},title,icon,lines,fs=9.5)=>{s.addShape("roundRect",{x,y,w,h,rectRadius:0.1,fill:{color:T.ink},line:{color:T.ink,width:0}});
    ico(s,icon,x+0.25,y+0.22,0.2,"white");tx(s,title,{x:x+0.55,y:y+0.2,w:w-0.8,h:0.24,fontSize:8,bold:true,color:"FFFFFF",charSpacing:1,valign:"middle"});
    lines.forEach((t,i)=>{const ly=y+0.6+i*0.36;if(i)s.addShape("line",{x:x+0.25,y:ly-0.04,w:w-0.5,h:0,line:{color:"5A5A5A",width:0.5}});tx(s,t,{x:x+0.25,y:ly,w:w-0.5,h:0.32,fontSize:fs,color:"FFFFFF",valign:"middle"})})};
  const part=Math.round(A.n/HEADCOUNT*100);
  const LX=X,LW=6.05,RX=7.0,RW=W-X-1.0-RX+0.45; // left chart column, right card column (ends at 11.14)

  // Cover
  const c=pptx.addSlide();c.background={color:"EFEFED"};
  if(logo)c.addImage({data:logo,x:0.62,y:0.56,w:1.31,h:0.49});
  tx(c,date,{x:8.5,y:0.66,w:2.64,h:0.2,fontSize:8.5,color:T.muted,align:"right",charSpacing:1});
  label(c,"ХҮНИЙ НӨӨЦИЙН АЛБА · УДИРДЛАГАД ТАНИЛЦУУЛАХ",{x:X,y:4.85,w:8});
  box(c,0,5.25,W,1.42,T.ink);
  tx(c,[{text:"Ажилтны үнэлгээ ",options:{color:"FFFFFF"}},{text:"2026.",options:{color:T.muted}}],{x:X,y:5.25,w:CW,h:1.42,fontSize:43,bold:true,valign:"middle"});
  tx(c,`Нэгдсэн дүн · ${A.n} ажилтны хариулт (${HEADCOUNT}-ийн ${part}%) · Hunnu Concrete | Хүннү Конкрет`,{x:X,y:6.85,w:CW,h:0.25,fontSize:10,color:T.body});

  // 01 Overview
  const o=page("01","ТОЙМ");
  pair(o,`${A.n} ажилтан санал өглөө,`,`нийт ${HEADCOUNT}-ийн ${part}%.`);
  label(o,"СЭТГЭЛ ХАНАМЖ",{x:X,y:TOP,w:4},"smile");
  tx(o,P.hidden?"—":pct(P.overall),{x:X,y:2.7,w:5,h:1.45,fontSize:90,bold:true,color:T.ink});
  tx(o,`Сэтгэл ханамжийн асуултуудад 4 эсвэл 5 гэж хариулсан хувь.${P.hidden?"":P.overall>=70?" Ихэнх нь сэтгэл хангалуун байна.":P.overall>=50?" Тал илүү нь сэтгэл хангалуун байна.":" Тал хүрэхгүй нь сэтгэл хангалуун байна."}`,{x:X,y:4.3,w:4.6,h:0.6,fontSize:9.5});
  rule(o,TOP-0.1,T.ink,RX,RW);
  label(o,"ГОЛ ДҮГНЭЛТ",{x:RX,y:TOP+0.05,w:4},"target");
  const keys=[A.likes.length?["users",`Хамгийн их таалагддаг зүйл нь хамт олон (${A.likes.length}-аас ${A.likeTeam}).`]:null,
    A.strong[0]?["up",`Хамгийн өндөр: ${clean(A.strong[0].t)} (${A.strong[0].v}%).`]:null,
    A.weak[0]?["down",`Хамгийн бага: ${clean(A.weak[0].t)} (${A.weak[0].v}%).`]:null,
    ["book",`Мэдлэгийн дундаж ${A.K}%. 60%-иас доош ${A.low.length} ажилтан.`],
    A.train[0]?["cap",`Хамгийн их хүссэн сургалт: ${A.train[0][0]} (${A.train[0][1]} хүн).`]:null].filter(Boolean);
  keys.forEach(([ic,t],i)=>{const y=TOP+0.4+i*0.56;ico(o,ic,RX,y+0.02,0.22);tx(o,t,{x:RX+0.38,y,w:RW-0.38,h:0.58,fontSize:10.5})});
  strip(o,[[`${A.n} / ${HEADCOUNT}`,"Оролцоо",A.missing.length?`Эхлээгүй: ${A.missing.join(", ")}`:"Бүх алба оролцсон","users"],
    [pct(A.K),"Мэдлэг",`Ажлын ${A.part("job")}% · нийтлэг ${A.part("common")}%`,"book"],
    [P.hidden?"—":sign(P.enps),"eNPS","Найздаа санал болгох (−100…+100)","thumb"],
    [P.hidden?"—":pct(P.stay),"Үлдэх хүсэл","Нэг жилийн дараа ч энд ажиллана","anchor"]]);

  // 02 Knowledge
  const kn=page("02","МЭДЛЭГ");
  pair(kn,`Мэдлэгийн дундаж ${A.K}%,`,`ажлын ${A.part("job")}%, нийтлэг ${A.part("common")}%.`);
  rule(kn,TOP-0.1,T.ink,LX,LW);
  label(kn,"АЛБААР · ХАРИУЛСАН ХҮН · ТАСАРХАЙ ШУГАМ 60%",{x:LX,y:TOP+0.05,w:LW},"building");
  hbar(kn,A.done.map(d=>[`${d.d} (${d.n})`,d.k]),{x:LX,y:TOP+0.45,w:LW,lw:2.5,rh:Math.min(0.5,4.2/Math.max(1,A.done.length)),dark:v=>v<60,ref:60});
  const kh=A.gap.length?2.05:4.6;
  card(kn,{x:RX,y:TOP-0.1,w:RW,h:kh},"60%-ИАС ДООШ","alert",A.low.length?A.low.map(s=>`${kPct(s)}% · ${s.position}`):["Ийм ажилтан алга."]);
  if(A.gap.length)card(kn,{x:RX,y:TOP+2.15,w:RW,h:2.35},"ЯРИЛЦАЖ ТОДРУУЛАХ","chat",[...A.gap.map(s=>`${s.position}: мэдлэг ${kPct(s)}%, өөрийн үнэлгээ ${selfAvg(s).toFixed(1)}`),""]);
  if(A.gap.length)tx(kn,"Өөрийн үнэлгээ ба мэдлэгийн оноо хоорондоо зөрсөн.",{x:RX,y:7.25,w:RW,h:0.2,fontSize:8,color:T.muted});

  // 03 Skills and training
  const sk=page("03","УР ЧАДВАР БА СУРГАЛТ");
  const lo=A.comp[0],hi=A.comp[A.comp.length-1];
  pair(sk,lo?`Сул ур чадвар: ${lo.t.toLowerCase()},`:"Ур чадвар",hi?`хамгийн сайн нь ${hi.t.toLowerCase()}.`:"");
  const half=(CW-0.5)/2,SX2=X+half+0.5;
  const rows=Math.max(A.comp.length,Math.min(7,A.train.length)),rh=Math.min(0.5,4.4/Math.max(1,rows));
  rule(sk,TOP-0.1,T.ink,X,half);rule(sk,TOP-0.1,T.ink,SX2,half);
  label(sk,"ӨӨРИЙН ҮНЭЛГЭЭ · 5-ААС · ТАСАРХАЙ ШУГАМ 3.5",{x:X,y:TOP+0.05,w:half},"award");
  hbar(sk,[...A.comp].reverse().map(x=>[x.t,+x.v.toFixed(1)]),{x:X,y:TOP+0.45,w:half,lw:2.0,rh,max:5,fmt:v=>v.toFixed(1),dark:v=>v<3.5,ref:3.5});
  label(sk,"ХҮССЭН СУРГАЛТ · ХҮНИЙ ТОО",{x:SX2,y:TOP+0.05,w:half},"cap");
  const tr=A.train.slice(0,7),tmax=tr.length?tr[0][1]:1;
  const ty=hbar(sk,tr.map(t=>[t[0],t[1]]),{x:SX2,y:TOP+0.45,w:half,lw:2.2,rh,max:tmax,fmt:v=>String(v),dark:v=>v>=tmax*0.7});
  if(A.other.length)tx(sk,"Бусад: "+cut(A.other.join("; "),200),{x:SX2,y:Math.max(ty+0.15,6.3),w:half,h:1.0,fontSize:8.5,color:T.muted});

  // 04 Satisfaction
  const sa=page("04","СЭТГЭЛ ХАНАМЖ");
  if(P.hidden)pair(sa,`${P.n} хариулт ирсэн.`,"3-аас дээш болмогц дүн гарна.");
  else{
    pair(sa,`${P.overall}% эерэг, eNPS ${sign(P.enps)},`,`үлдэх хүсэл ${P.stay}%.`);
    const g=[...P.byGroup].sort((a,b)=>a.v-b.v);
    rule(sa,TOP-0.1,T.ink,LX,LW);
    label(sa,"ЧИГЛЭЛЭЭР · 4–5 ГЭСЭН ХУВЬ · ХАР НЬ 50%-ИАС ДООШ",{x:LX,y:TOP+0.05,w:LW},"smile");
    hbar(sa,g.map(x=>[x.g,x.v]),{x:LX,y:TOP+0.45,w:LW,lw:2.5,rh:Math.min(0.58,4.2/Math.max(1,g.length)),dark:v=>v<50,ref:50});
    const wk=A.weak.map(x=>`${x.v}% · ${cut(clean(x.t),36)}`),dh=0.62+wk.length*0.36;
    darkCard(sa,{x:RX,y:TOP-0.1,w:RW,h:dh},"СУЛ ТАЛ · 50%-ИАС ДООШ","down",wk,9);
    let cy2=TOP-0.1+dh+0.3;
    const st=A.strong.map(x=>`${x.v}% · ${cut(clean(x.t),48)}`),sh=0.5+st.length*0.27;
    card(sa,{x:RX,y:cy2,w:RW,h:sh},"САЙН ТАЛ","up",st,9);cy2+=sh+0.2;
    const lv=A.leave.slice(0,4).map(([l,n])=>`${n} хүн · ${l}`);
    card(sa,{x:RX,y:cy2,w:RW,h:Math.min(7.45-cy2,0.5+lv.length*0.27)},"ГАРВАЛ ШАЛТГААН НЬ","out",lv,9);
  }

  // 05 Departments to watch: table kept; only the figures carry status colour (Tigo: «үзүүлэлтүүдийг өнгөөр тодруулж л болно»)
  if(!P.hidden&&A.hot.length){
    const hd=page("05","АНХААРАХ АЛБА");
    pair(hd,`${A.hot.length} албанд анхаарах чиглэл байна,`,"дарга нартай нь тусад нь ярилцана.");
    const C=STATUS,lvl=v=>v<30?C.red:v<45?C.amber:C.green,ec=v=>v<0?C.red:v<=30?C.amber:C.green;
    rule(hd,TOP-0.1);
    label(hd,"eNPS СӨРӨГ ЭСВЭЛ 45%-ИАС ДООШ ЧИГЛЭЛТЭЙ АЛБА",{x:X,y:TOP+0.05,w:8},"alert");
    const th=t=>({text:t,options:{bold:true,color:T.muted,fontSize:7.5,charSpacing:1}});
    const runs=bad=>bad.length?bad.flatMap(([g,v],i)=>[...(i?[{text:"   ·   ",options:{color:T.soft}}]:[]),{text:g+" ",options:{color:T.body}},{text:v+"%",options:{bold:true,color:lvl(v)}}]):[{text:"—",options:{color:T.muted}}];
    const rows2=[[th("АЛБА"),th("ХҮН"),th("eNPS"),th("45%-ИАС ДООШ ЧИГЛЭЛ")],
      ...A.hot.map(d=>[{text:d.d,options:{bold:true,color:T.ink}},String(d.n),{text:sign(d.enps),options:{bold:true,fontSize:13,color:ec(d.enps)}},{text:runs(d.bad)}])];
    hd.addTable(rows2,{x:X,y:TOP+0.4,w:CW,colW:[2.9,0.7,0.8,CW-4.4],fontFace:F,fontSize:10,color:T.body,border:[{type:"none"},{type:"none"},{type:"solid",color:T.soft,pt:0.5},{type:"none"}],rowH:0.5,valign:"middle",margin:[0.04,0.08,0.04,0]});
    const lg=[[C.red,"eNPS сөрөг · 30%-иас доош"],[C.amber,"eNPS 0–30 · 30–45%"],[C.green,"eNPS 30-аас дээш"]];
    lg.forEach(([col,t],i)=>{const lx=X+i*2.6;hd.addShape("ellipse",{x:lx,y:7.27,w:0.12,h:0.12,fill:{color:col},line:{color:col,width:0}});tx(hd,t,{x:lx+0.2,y:7.23,w:2.3,h:0.2,fontSize:8,color:T.body})});
    tx(hd,"3-аас цөөн хариулттай албыг харуулахгүй. Хувь нь 4–5 гэж хариулсан хувь.",{x:7.0,y:7.23,w:4.14,h:0.2,fontSize:8,color:T.muted,align:"right"});
  }

  // 06 Voice of employees
  if(!P.hidden&&A.themes.length){
    const vo=page("06","АЖИЛТНЫ САНАЛ");
    pair(vo,"Ажилтнууд юуг өөрчлөхийг хүсэж байна вэ?",A.likes.length?`Таалагддаг зүйлд ${A.likes.length}-аас ${A.likeTeam} нь хамт олноо дурдсан.`:"");
    const cw=(CW-0.5)/3;
    A.themes.slice(0,6).forEach((x,i)=>{const cx=X+(i%3)*(cw+0.25),cy=TOP-0.1+Math.floor(i/3)*2.45;
      rule(vo,cy,T.ink,cx,cw);
      ring(vo,THEME_ICON[x.t]||"chat",cx,cy+0.15,0.5);
      tx(vo,x.t,{x:cx+0.65,y:cy+0.15,w:cw-1.2,h:0.5,fontSize:10,bold:true,color:T.ink,valign:"middle"});
      tx(vo,String(x.list.length),{x:cx+cw-0.55,y:cy+0.15,w:0.55,h:0.5,fontSize:20,bold:true,color:T.muted,align:"right",valign:"middle"});
      tx(vo,x.list.slice(0,2).map(q=>({text:`«${cut(q,95)}»`,options:{breakLine:true,paraSpaceAfter:4}})),{x:cx,y:cy+0.8,w:cw,h:1.5,fontSize:9,color:T.body})});
    tx(vo,"Тоо нь тухайн сэдвийг дурдсан ажилтны санал.",{x:X,y:7.3,w:CW,h:0.2,fontSize:8,color:T.muted});
  }

  // 07 Next steps, derived from the figures
  const nx=page("07","ДАРААГИЙН АЛХАМ");
  pair(nx,"Санал болгож буй алхам,","тоон дүнгээс гаргасан.");
  const wk=t=>A.weak.some(x=>x.t.includes(t));
  const steps=[A.mgrDone<A.n?["award",`Алба бүрийн дарга ажилтныхаа ур чадварыг HR самбарт үнэлэх (одоо ${A.mgrDone}/${A.n}).`]:null,
    A.n<HEADCOUNT?["users",`Үлдсэн ${HEADCOUNT-A.n} ажилтныг бөглүүлэх${A.missing.length?": "+A.missing.join(", "):""}.`]:null,
    A.low.length?["book",`60%-иас доош ${A.low.length} ажилтанд ажлын байрны сургалт, давтан шалгалт.`]:null,
    A.train[0]?["cap",`Хамгийн их хүссэн сургалтыг эхлүүлэх: ${A.train.slice(0,3).map(t=>t[0]).join(", ")}.`]:null,
    wk("Урамшуулал")?["wallet","Урамшууллын журмыг ажилтнуудад тайлбарлаж, шалгуурыг ил болгох."]:null,
    wk("сургалтад")?["list","Жилийн сургалтын төлөвлөгөөг алба бүрээр гаргах."]:null,
    wk("аюулгүй")?["shield","Ажлын байрны аюулгүй байдлын үзлэг (тоос, цемент, ачилт буулгалт)."]:null,
    A.hot.length?["chat",`Анхаарах албадын даргатай тусад нь уулзах: ${A.hot.map(d=>d.d).join(", ")}.`]:null].filter(Boolean);
  const hs=Math.ceil(steps.length/2),colW=(CW-0.5)/2;
  steps.forEach(([ic,t],i)=>{const cx=X+(i<hs?0:colW+0.5),cy=TOP-0.1+(i%hs)*1.2;
    const first=i===0,fg=first?"FFFFFF":T.ink;
    nx.addShape("roundRect",{x:cx,y:cy,w:colW,h:1.05,rectRadius:0.08,fill:{color:first?T.ink:"FFFFFF"},line:{color:T.ink,width:1.5}});
    (first?ring:disc)(nx,ic,cx+0.22,cy+0.27,0.5);
    tx(nx,String(i+1).padStart(2,"0"),{x:cx+0.85,y:cy+0.27,w:0.5,h:0.5,fontSize:16,bold:true,color:T.muted,valign:"middle"});
    tx(nx,t,{x:cx+1.4,y:cy+0.1,w:colW-1.6,h:0.85,fontSize:10.5,bold:first,color:fg,valign:"middle"})});

  // Back page: mirrors the cover band
  const b=pptx.addSlide();b.background={color:"EFEFED"};
  if(logo)b.addImage({data:logo,x:0.62,y:0.56,w:1.31,h:0.49});
  tx(b,date,{x:8.5,y:0.66,w:2.64,h:0.2,fontSize:8.5,color:T.muted,align:"right",charSpacing:1});
  label(b,"АСУУЛТ, САНАЛ",{x:X,y:2.25,w:6},"chat");
  box(b,0,2.6,W,2.3,T.ink);
  tx(b,[{text:"Баярлалаа.",options:{color:"FFFFFF",fontSize:48,breakLine:true}},{text:"Дүн HR самбарт тогтмол шинэчлэгдэнэ: hunnu.asia/talent",options:{color:T.muted,fontSize:16}}],{x:X,y:2.6,w:CW,h:2.3,bold:true,valign:"middle"});
  rule(b,5.55);
  [["ХҮНИЙ НӨӨЦ","Б.Мөнхмандах","8806 6831","users"],["УТАС","7575 4040","Оффис","phone"],["ИМЭЙЛ","info@hunnu.asia","Ерөнхий","mail"],["ВЭБ","www.hunnu.asia","Hunnu Concrete | Хүннү Конкрет","globe"]].forEach(([l,v,sub,ic],i)=>{const x=[0.55,3.20,5.84,8.49][i];
    disc(b,ic,x,5.78,0.36);
    tx(b,l,{x:x+0.48,y:5.76,w:2,h:0.16,fontSize:6.5,bold:true,color:T.muted,charSpacing:1});
    tx(b,v,{x:x+0.48,y:5.93,w:2.1,h:0.22,fontSize:9.5,bold:true,color:T.ink});
    tx(b,sub,{x:x+0.48,y:6.15,w:2.1,h:0.16,fontSize:7,color:T.muted})});
  rule(b,7.61,T.muted,X,CW,0.5);
  tx(b,"© 2026 Хүннү Конкрет ХХК",{x:X,y:7.74,w:4,h:0.2,fontSize:8,color:T.muted});
  tx(b,"Building Smarter.",{x:8.14,y:7.74,w:3,h:0.2,fontSize:8,color:T.muted,align:"right"});
  return pptx;
}
