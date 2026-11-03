// Entrance animation for the deck's bars (PptxGenJS has no animation API, so <p:timing> is added to the saved file).
// Shapes named "anim-bar-*" wipe in from the left one after another when the slide opens; "anim-val-*" labels fade in with their bar.
const set=(id,sp)=>`<p:set><p:cBhvr><p:cTn id="${id}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
const fx=(id,sp,filter,dur)=>`<p:animEffect transition="in" filter="${filter}"><p:cBhvr><p:cTn id="${id}" dur="${dur}"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl></p:cBhvr></p:animEffect>`;
function timing(items){let n=4;const pars=items.map(({sp,kind,delay},i)=>{const a=++n,b=++n,c=++n;const wipe=kind==="bar";
  return `<p:par><p:cTn id="${a}" presetID="${wipe?22:10}" presetClass="entr" presetSubtype="${wipe?8:0}" fill="hold" nodeType="${i?"withEffect":"afterEffect"}"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${set(b,sp)}${fx(c,sp,wipe?"wipe(left)":"fade",wipe?600:300)}</p:childTnLst></p:cTn></p:par>`}).join("");
  return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${pars}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`}
export async function animateBars(zip){
  for(const f of Object.keys(zip.files).filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f))){
    let x=await zip.file(f).async("string");if(x.includes("<p:timing"))continue;
    const items=[];let row=-1,k=0;
    for(const m of x.matchAll(/<p:cNvPr id="(\d+)" name="anim-(bar|val)-(\d+)"/g)){
      const kind=m[2];if(kind==="bar")k++;items.push({sp:m[1],kind,delay:kind==="bar"?(k-1)*120:(k-1)*120+450})}
    if(!items.length)continue;
    x=x.replace("</p:clrMapOvr>","</p:clrMapOvr>"+timing(items));zip.file(f,x)}
  return zip;
}
