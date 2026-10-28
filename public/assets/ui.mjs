// Small DOM and chart helpers shared by the survey and the HR dashboard
export const $=s=>document.querySelector(s);
export const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
export const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
export const fmtDate=t=>{if(!t)return"—";const d=new Date(t);return d.getFullYear()+"."+String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getDate()).padStart(2,"0")+" "+d.toTimeString().slice(0,5)};
export const mmss=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(Math.max(0,s%60)).padStart(2,"0");
export const lvl=p=>p>=80?{t:"Сайн",k:"good"}:p>=50?{t:"Дунд",k:"warn"}:{t:"Сул",k:"bad"};
export const initials=n=>String(n||"?").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
export function setBand(title,dim,sub){
  $("#band").hidden=!title;
  if(title){$("#bandTitle").innerHTML=esc(title)+" <span>"+esc(dim)+"</span>";$("#bandSub").textContent=sub||"";$("#bandSub").hidden=!sub}
}
export function gauge(p,lab,sub){const r=34,c=2*Math.PI*r;return `<div class="gauge"><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--line)" stroke-width="8"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-dasharray="${(c*(p||0)/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/></svg><div><b>${lab}</b><span>${sub}</span></div></div>`}
export function radarMulti(labels,series){
  const n=labels.length;if(n<3)return"";const C=170,R=110,pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[C+r*Math.cos(a),C+r*Math.sin(a)]};
  const ring=f=>labels.map((_,i)=>pt(i,R*f).map(v=>v.toFixed(1)).join(",")).join(" ");
  return `<svg viewBox="-70 -6 480 352" class="radar" role="img" aria-label="Ур чадварын радар диаграмм">
    ${[.2,.4,.6,.8,1].map(f=>`<polygon points="${ring(f)}" fill="none" stroke="var(--line)"/>`).join("")}
    ${labels.map((_,i)=>{const[x,y]=pt(i,R);return `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)"/>`}).join("")}
    ${series.filter(s=>s.vals.some(v=>v>0)).map(s=>`<polygon points="${s.vals.map((v,i)=>pt(i,R*Math.max(v,.02)).map(x=>x.toFixed(1)).join(",")).join(" ")}" fill="${s.fill}" fill-opacity="${s.op}" stroke="${s.stroke}" stroke-width="2" ${s.dash?'stroke-dasharray="5 4"':""}/>`).join("")}
    ${labels.map((l,i)=>{const[x,y]=pt(i,R+22);const an=Math.abs(x-C)<8?"middle":x>C?"start":"end";return `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="${an}" font-size="15" font-weight="700" fill="var(--fg)">${esc(l)}</text>`}).join("")}
  </svg>`;
}
