// Small DOM and chart helpers shared by the survey and the HR dashboard
// Line icons (24px grid, stroke follows the text colour) used inside buttons
const IC={
  left:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
  right:'<path d="M5 12h14M12 5l7 7-7 7"/>',
  play:'<path d="M7 4.5v15l12-7.5z"/>',
  send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  flag:'<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  login:'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
  userPlus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
  userCheck:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 11 2 2 4-4"/>',
  userX:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m18 8 5 5M23 8l-5 5"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  archive:'<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  report:'<path d="M3 3v18h18M7 16v-4M12 16V8M17 16v-7"/>',
  printer:'<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7zM17.5 12h.01"/>'
};
export const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
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
