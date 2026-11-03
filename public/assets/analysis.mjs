import {DEPTS,COMP} from "./data.mjs";

// Combined analysis numbers, shared by the HR dashboard tab and the PowerPoint export
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
export const kPct=s=>s.max?Math.round(s.score/s.max*100):0;
export const selfAvg=s=>avg(COMP.map(c=>s.self?.[c.id]).filter(Boolean));
export const THEMES=[["Хамт олон, харилцаа",/хамт|харилцаа/i],["Ажлын ачаалал",/ачаал|илүү цаг/i],["Журам, систем, эмх цэгц",/журам|систем|стандарт|эмх|дүрэм|тогтсон/i],["Шийдвэр, хүсэлтийн шуурхай байдал",/шийдвэр|хүлээ|сануул|хэрэгжил|шуурхай/i],["Цалин, урамшуулал",/цалин|урамшуул/i],["Ажлын орчин, аюулгүй байдал",/тоос|цемент|аюулгүй|орчин|машин|тээвэр/i],["Хөгжил, сургалт",/сургалт|чадамж|хөгж|сур/i]];
export function analyze(staff,pulse){
  const n=staff.length,P=pulse||{n:0,hidden:true};
  const K=n?Math.round(avg(staff.map(kPct))):0;
  const part=k=>{const c=staff.reduce((a,s)=>a+(s.byPart?.[k]?.c||0),0),t=staff.reduce((a,s)=>a+(s.byPart?.[k]?.t||0),0);return t?Math.round(c/t*100):0};
  const depts=Object.keys(DEPTS).map(d=>{const g=staff.filter(s=>s.dept===d);return{d,n:g.length,k:g.length?Math.round(avg(g.map(kPct))):null}});
  const done=depts.filter(x=>x.n).sort((a,b)=>b.k-a.k),missing=depts.filter(x=>!x.n).map(x=>x.d);
  const low=staff.filter(s=>kPct(s)<60).sort((a,b)=>kPct(a)-kPct(b));
  const gap=staff.filter(s=>{const sa=selfAvg(s),k=kPct(s);return(sa>=4.5&&k<60)||(sa<=1.5&&k>=75)});
  const comp=COMP.map(c=>{const v=staff.map(s=>s.self?.[c.id]).filter(Boolean);return{t:c.t,v:v.length?avg(v):0}}).sort((a,b)=>a.v-b.v);
  const tc={};staff.forEach(s=>(s.train||[]).forEach(t=>tc[t]=(tc[t]||0)+1));const train=Object.entries(tc).sort((a,b)=>b[1]-a[1]);
  const other=staff.map(s=>(s.trainOther||"").trim()).filter(t=>t.length>3&&!/^(байхгүй|үгүй|-)$/i.test(t));
  const mgrDone=staff.filter(s=>COMP.every(c=>s.mgr?.[c.id])).length;
  const suspect=staff.filter(s=>(s.durationSec||0)<240||/тест|test/i.test(s.name||""));
  const items=P.hidden?[]:[...P.byItem].sort((a,b)=>a.v-b.v),weak=items.filter(x=>x.v<50).slice(0,4),strong=items.slice().reverse().filter(x=>x.v>=70).slice(0,3);
  const hot=P.hidden?[]:(P.depts||[]).filter(d=>!d.hidden).map(d=>{const bad=(d.groups||[]).map((v,i)=>[P.groups[i],v]).filter(([,v])=>v<45).sort((a,b)=>a[1]-b[1]);return{...d,bad}}).filter(d=>d.enps<0||d.bad.length);
  const changes=(P.comments||[]).filter(c=>c.k==="change"&&c.t.trim().length>3).map(c=>c.t.trim());
  const likes=(P.comments||[]).filter(c=>c.k==="like").map(c=>c.t.trim());
  const themes=THEMES.map(([t,re])=>({t,list:changes.filter(c=>re.test(c))})).filter(x=>x.list.length).sort((a,b)=>b.list.length-a.list.length);
  const likeTeam=likes.filter(t=>/хамт|хамд|олон/i.test(t)).length;
  const leave=Object.entries(P.leave||{}).sort((a,b)=>b[1]-a[1]);
  return{n,P,K,part,depts,done,missing,low,gap,comp,train,other,mgrDone,suspect,weak,strong,hot,leave,changes,likes,themes,likeTeam};
}
