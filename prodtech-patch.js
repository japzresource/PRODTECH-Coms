/* ===== PATCH v3: call stability, per-department monitor, replaced/monitoring, log purge, A1/A2, main output ===== */
(function(){
const stl=document.createElement('style');stl.textContent=`
.wn{color:var(--ac);font-size:16px;cursor:help;line-height:1}
#moutv{width:100%;max-height:34vh;background:#000;object-fit:contain;display:none}
#bigpin{position:absolute;top:10px;right:56px;z-index:3;border:0;border-radius:19px;background:#000a;color:#fff;padding:0 14px;height:38px;cursor:pointer}
#bigpin:hover{background:var(--bl)}
.lgd{display:flex;gap:6px;align-items:center;flex-wrap:wrap}`;
document.head.appendChild(stl);

/* ---------- 1. CALL STABILITY ---------- */
const KEEP={};
const _dg3=drawGrid;
drawGrid=function(){
 if(!R)return _dg3();
 const orig=R.presenceState,s=orig.call(R),now=Date.now();
 Object.keys(s).forEach(k=>KEEP[k]={v:s[k],t:now});
 Object.keys(KEEP).forEach(k=>{if(!s[k]&&now-KEEP[k].t>10000)delete KEEP[k]});
 const merged={};Object.keys(KEEP).forEach(k=>merged[k]=s[k]||KEEP[k].v);
 R.presenceState=()=>merged;
 try{_dg3()}finally{R.presenceState=orig}
 syncMain()};
const _mp=makePeer;makePeer=function(k){const p=_mp(k);p.g=uid();return p};
const _sig=sig;sig=function(to,o){_sig(to,{...o,g:P[to]&&P[to].g})};
function killPeer(k){if(P[k]){try{P[k].pc.close()}catch(e){}delete P[k]}}
function rebuild(k){sig(k,{type:'reset'});killPeer(k);drawGrid()}
const _os=onSig;
onSig=async function(m){
 if(m&&m.to===MYKEY&&cur){
  if(m.type==='reset'){killPeer(m.from);drawGrid();return}
  if(m.type==='offer'){const p=P[m.from];if(p&&p.rg&&p.rg!==m.g)killPeer(m.from);const q=P[m.from]||makePeer(m.from);q.rg=m.g}}
 return _os(m)};
const _en0=enter;enter=async function(c){Object.keys(KEEP).forEach(k=>delete KEEP[k]);const p=_en0(c);renderMon();return p};
setInterval(()=>{if(!cur)return;
 document.querySelectorAll('#grid video').forEach(v=>{if(v.paused&&v.srcObject&&v.play)v.play().catch(()=>{})});
 drawGrid();
 Object.keys(P).forEach(async k=>{const p=P[k];if(!p)return;
  if(p.st){p.bad=(p.bad||0)+1;if(p.bad>=4){p.bad=0;rebuild(k)}return}p.bad=0;
  try{const r=await p.pc.getStats();let b=0;r.forEach(x=>{if(x.type==='inbound-rtp')b+=x.bytesReceived||0});
   if(p.lb>0&&b<=p.lb)p.stall=(p.stall||0)+1;else p.stall=0;p.lb=b;
   if(p.stall>=3){p.stall=0;rebuild(k)}}catch(e){}})},4000);

/* ---------- 2. PERMISSIONS ---------- */
const canMon=()=>isOp()||['A1','A2'].includes(ME.pos);
loadPos=function(){if(!UID)return;SB.from('profiles').select('position').eq('id',UID).maybeSingle().then(r=>{ME.pos=(r.data&&r.data.position)||'';renderMon()},()=>{})};

/* ---------- 3. PER-DEPARTMENT DATA ---------- */
const MCH=()=>cur?cur.id:(($('mchSel')&&$('mchSel').value)||'');
const LEG=()=>{const a=S.ch.find(c=>c.id==='seed-aud')||[...S.ch].sort((a,b)=>(a.o||0)-(b.o||0))[0];return a?a.id:''};
const _sv=save;
save=async function(col,obj){if(['equip','musicians','outs','monlog'].includes(col)&&!obj.ch)obj.ch=MCH()||LEG();return _sv(col,obj)};
seedEq=function(){const c=MCH();[['wmic','Wireless Mic 1'],['wmic','Wireless Mic 2'],['wired','Wired Mic 1'],['wired','Wired Mic 2'],...[1,2,3,4,5,6,7,8].map(n=>['iem','In-Ear '+n])].forEach((x,i)=>save('equip',{id:'eq-'+c+'-'+x[1].toLowerCase().replace(/[^a-z0-9]/g,''),ch:c,kind:x[0],label:x[1],status:'online',to:'',o:i}))};
function ensureSel(){let s=$('mchSel');const h=document.querySelector('#monv .mbh');
 if(!s&&h){s=document.createElement('select');s.id='mchSel';s.style.cssText='background:#0e1115;color:#fff;border:1px solid var(--ln);padding:8px;margin-left:auto';h.insertBefore(s,$('monback'));s.onchange=renderMon}
 if(s){s.style.display=cur?'none':'';const mine=myCh(),l=isOp()?S.ch:S.ch.filter(x=>mine.has(x.id)),v=s.value;
  s.innerHTML=l.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');if([...s.options].some(o=>o.value===v))s.value=v}}
const _rm=renderMon;
renderMon=function(){const m=$('monv');if(!m||m.style.display!=='block')return;
 ensureSel();const c=MCH(),L=LEG(),f=a=>a.filter(x=>(x.ch||L)===c),full={eq:S.eq,mu:S.mu,ou:S.ou,lg:S.lg};
 S.eq=f(S.eq);S.mu=f(S.mu);S.ou=f(S.ou);S.lg=f(S.lg);
 try{_rm()}finally{S.eq=full.eq;S.mu=full.mu;S.ou=full.ou;S.lg=full.lg}
 decorate();syncMain()};

/* ---------- 4. STATUS DISPLAY (offline / Replaced / monitoring triangle) ---------- */
function decorate(){
 document.querySelectorAll('#eqs .eq').forEach(card=>{const sel=card.querySelector('[data-to]');if(!sel)return;
  const e=S.eq.find(x=>x.id===sel.dataset.to);if(!e)return;
  const pill=card.querySelector('.pill'),down=e.status==='offline'||S.ou.some(o=>o.eq===e.id);
  if(down){pill.textContent='OFFLINE';const ss=card.querySelector('[data-st]');if(ss)ss.value='offline';if(e.rep&&!e.to)sel.options[0].textContent='Replaced'}
  else if(e.mon){const w=document.createElement('span');w.className='wn';w.title='Fixed, still being monitored';w.textContent='⚠';
   const g=document.createElement('span');g.style.cssText='display:flex;gap:6px;align-items:center';pill.replaceWith(g);g.append(w,pill)}});
 if(!canMon())['#eqs select','#lgM','#lgT','#lgI','#lgO','#lgS','#lgA','#muN','#muR','#muA'].forEach(q=>document.querySelectorAll('#monv '+q).forEach(x=>x.disabled=true));
 const pg=$('lgPurge');if(pg)pg.style.display=isOp()?'flex':'none'}

/* ---------- 5. LOG BUTTON + PURGE ---------- */
function initLog(){
 $('lgA').onclick=()=>{
  if(!canMon())return toast('Only Operators, A1 and A2 can log.');
  const mu=$('lgM').value,inId=$('lgI').value,outId=$('lgO').value,st=$('lgS').value,note=$('lgT').value.trim();
  if(!note&&!inId&&!outId)return toast('Add a note or pick equipment');
  const inE=S.eq.find(e=>e.id===inId),outE=S.eq.find(e=>e.id===outId),isO=e=>S.ou.some(o=>o.eq===e.id);
  const clearOut=e=>S.ou.filter(o=>o.eq===e.id).forEach(o=>del('outs',o.id));
  if(outE&&(st==='replaced'||st==='reported')){
   if(inE){if(inE.id===outE.id)return toast('IN and OUT must be different');
    if(isO(inE)||inE.status==='offline')return toast(inE.label+' is down. Pick working equipment.');
    save('equip',{...inE,to:outE.to||mu||inE.to||'',status:'online',mon:false,rep:false})}
   save('equip',{...outE,to:'',status:'offline',rep:!!inE,mon:false});
   if(!isO(outE))save('outs',{id:uid(),name:outE.label,eq:outE.id,note:inE?'Replaced by '+inE.label:(note||'Reported'),by:ME.name,ts:Date.now()})}
  else if(st==='monitoring'){const e=inE||outE;if(e){clearOut(e);save('equip',{...e,status:'online',mon:true,rep:false})}}
  else if(st==='fixed'){[inE,outE].filter(Boolean).forEach(e=>{clearOut(e);save('equip',{...e,status:'online',mon:false,rep:false})})}
  addLog({mu:muName(mu),note,inN:inE?inE.label:'',outN:outE?outE.label:'',inId,outId,st});
  $('lgT').value='';$('lgI').value='';$('lgO').value=''};
 $('eqA').onclick=()=>{if(!isOp())return;const k=$('eqK').value,c=MCH(),L=LEG(),mine=S.eq.filter(e=>(e.ch||L)===c);let n=1;while(mine.some(e=>e.label===KINDS[k]+' '+n))n++;
  save('equip',{id:uid(),ch:c,kind:k,label:KINDS[k]+' '+n,status:'online',to:'',o:S.eq.reduce((m,e)=>Math.max(m,e.o||0),0)+1})};
 const d=document.createElement('div');d.id='lgPurge';d.className='lgd';d.style.cssText='margin-bottom:8px;display:none';
 d.innerHTML='<span class="hint">Delete logs older than</span><select id="lgAge"><option value="1">1 month</option><option value="4">4 months</option><option value="12">1 year</option><option value="c">Custom…</option></select><button class="b r" id="lgDel">Delete</button>';
 $('lgs').parentNode.insertBefore(d,$('lgs'));
 $('lgDel').onclick=async()=>{if(!isOp())return;let m=$('lgAge').value;if(m==='c'){m=+prompt('Delete logs older than how many months?','2');if(!m||m<1)return}m=+m;
  const cut=new Date();cut.setMonth(cut.getMonth()-m);const c=MCH(),L=LEG(),old=S.lg.filter(l=>(l.ch||L)===c&&(l.ts||0)<cut.getTime());
  if(!old.length)return toast('No logs older than that.');
  if(!confirm('Delete '+old.length+' log(s) older than '+m+' month(s) for this department?'))return;
  const ids=old.map(l=>l.id),r=await SB.from('docs').delete().eq('col','monlog').in('id',ids);
  if(r.error)return toast(errMsg(r.error));S.lg=S.lg.filter(l=>!ids.includes(l.id));renderMon();toast(old.length+' log(s) deleted')}}
initLog();

/* ---------- 6. MAIN OUTPUT PANE (video from the main laptop / NDI bridge) ---------- */
let MAINN='';try{MAINN=localStorage.getItem('pt_main')||''}catch(e){}
function syncMain(){
 if(!$('moutp')){const col=document.querySelectorAll('#monv .mcol')[1];if(!col)return;
  const s=document.createElement('section');s.className='mp';s.id='moutp';
  s.innerHTML='<h3>Main Output <small class="hint" id="moutn"></small></h3><video id="moutv" autoplay muted playsinline></video>';col.prepend(s)}
 const v=$('moutv'),st=R?R.presenceState():{},nm=x=>(st[x]&&st[x][0]&&st[x][0].name)||'',ks=Object.keys(P);
 const k=ks.find(x=>MAINN&&nm(x)===MAINN)||ks.find(x=>/main|output|ndi/i.test(nm(x)));
 const ms=k&&P[k].stream&&P[k].stream.getVideoTracks().length?P[k].stream:null;
 $('moutn').textContent=k?'· '+nm(k):'· open a camera tile and press ★ Main Output (or name the device MAIN OUTPUT)';
 if(v.srcObject!==ms)v.srcObject=ms;v.style.display=ms?'block':'none';if(ms&&v.paused)v.play().catch(()=>{})}
const pin=document.createElement('button');pin.id='bigpin';pin.textContent='★ Main Output';
pin.onclick=()=>{if(!SEL||SEL==='me')return toast('Select another person\'s tile first.');
 const x=R&&R.presenceState()[SEL];if(!x||!x[0])return;MAINN=x[0].name;try{localStorage.setItem('pt_main',MAINN)}catch(e){}syncMain();toast('Main Output: '+MAINN)};
$('bigwrap').appendChild(pin);
})();
