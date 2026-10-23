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

/* ===== PATCH v3.1: FEED WALL for Visual department (NDI / output screen feeds instead of the mic board) ===== */
(function(){
const FEED=c=>!!c&&/visual|broadcast/i.test(c.name||'');   /* departments that get the feed wall */
const NOBOARD=c=>!!c&&/visual|broadcast|networking/i.test(c.name||'');   /* departments with NO mic monitor board */
const curId=()=>cur?cur.id:(($('mchSel')&&$('mchSel').value)||'');
const feedDept=()=>FEED(S.ch.find(x=>x.id===curId()));
const mainName=()=>{try{return localStorage.getItem('pt_main')||''}catch(e){return''}};
const isMain=n=>mainName()?n===mainName():/main|output|ndi/i.test(n);
const stl=document.createElement('style');stl.textContent=`
#feedwall{display:none;flex-direction:column;flex:1;min-height:0;overflow:auto;padding:4px}
#feedwall .fg{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}
.fd{position:relative;background:#000;border:1px solid var(--ln);aspect-ratio:16/9;cursor:pointer;overflow:hidden}
.fd video{width:100%;height:100%;object-fit:contain;background:#000;display:block}
.fd .fn{position:absolute;left:8px;bottom:6px;background:#000a;padding:2px 8px;border-radius:4px;font-size:13px}
.fd .fs{position:absolute;top:6px;right:6px;border:0;border-radius:14px;background:#000a;color:#fff;padding:3px 10px;cursor:pointer;font-size:12px}
.fd .fs:hover{background:var(--bl)}
.fd.main{outline:3px solid var(--ac)}
.fd.big{grid-column:1/-1}
#moutp{display:none!important}
#feedwall.nof .fg,#feedwall.nof .hint{display:none}`;
document.head.appendChild(stl);
const FT={};
function ensureWall(){if($('feedwall'))return;const mb=document.querySelector('#monv .mb');if(!mb)return;
 const w=document.createElement('div');w.id='feedwall';
 w.innerHTML='<div class="empty" id="fempty"></div><div class="fg" id="fg"></div><div class="hint" style="margin-top:10px">Tip: on the output / NDI computer, join this call and either press Share Screen, or select the OBS Virtual Camera (fed by your NDI source) as the camera. Click a feed to enlarge it. ★ marks the Main Output.</div>';
 mb.appendChild(w)}
function syncFeeds(){const w=$('feedwall');if(!w||w.style.display==='none')return;
 const st=R?R.presenceState():{},nm=k=>(st[k]&&st[k][0]&&st[k][0].name)||'Guest',want=[];
 if(cur){if(screenStream)want.push({k:'me',n:ME.name+' (you, screen)',s:screenStream});
  Object.keys(P).forEach(k=>{const s=P[k].stream;if(s&&s.getVideoTracks().length)want.push({k,n:nm(k),s})})}
 const g=$('fg'),keys=want.map(x=>x.k);
 Object.keys(FT).forEach(k=>{if(!keys.includes(k)){FT[k].remove();delete FT[k]}});
 want.forEach(x=>{let t=FT[x.k];
  if(!t){t=FT[x.k]=document.createElement('div');t.className='fd';t.innerHTML='<video autoplay muted playsinline></video><span class="fn"></span><button class="fs">★ Main</button>';
   t.onclick=()=>t.classList.toggle('big');
   t.querySelector('.fs').onclick=e=>{e.stopPropagation();if(x.k==='me')return;try{localStorage.setItem('pt_main',t.dataset.n)}catch(_){}syncFeeds();toast('Main Output: '+t.dataset.n)};
   g.appendChild(t)}
  t.dataset.n=x.n;const v=t.querySelector('video');if(v.srcObject!==x.s)v.srcObject=x.s;if(v.paused)v.play().catch(()=>{});
  const m=isMain(x.n);t.classList.toggle('main',m);t.style.order=m?0:1;t.querySelector('.fn').textContent=(m?'★ ':'')+x.n});
 const nof=w.classList.contains('nof');
 $('fempty').textContent=nof?'No monitor board for this department.':want.length?'':(cur?'No feeds yet. Waiting for an output or NDI device to share video.':'Join this department\'s call to see its feeds.');
 $('fempty').style.display=(nof||!want.length)?'':'none'}
const _rm2=renderMon;
renderMon=function(){_rm2();const m=$('monv');if(!m||m.style.display!=='block')return;
 const d=S.ch.find(x=>x.id===curId()),nb=NOBOARD(d),f=FEED(d);ensureWall();
 const mbg=document.querySelector('#monv .mbg'),h=document.querySelector('#monv .mbh h2');
 if(mbg)mbg.style.display=nb?'none':'';
 if($('feedwall')){$('feedwall').style.display=nb?'flex':'none';$('feedwall').classList.toggle('nof',nb&&!f)}
 if(h)h.textContent=f?'FEED WALL':nb?((d&&d.name)||'').toUpperCase():'MONITOR BOARD';syncFeeds()};
const _dg4=drawGrid;drawGrid=function(){_dg4();syncFeeds()};
})();

/* ===== PATCH v3.2: hide Main Output box + right-click delete for the owner ===== */
(function(){
const stl=document.createElement('style');stl.textContent=`
#moutp{display:none!important}
#ctx2{position:fixed;display:none;background:#1b1f26;border:1px solid var(--ln);z-index:95;padding:4px;box-shadow:0 6px 20px #000a;min-width:170px}
#ctx2 button{display:block;background:none;border:0;color:var(--tx);padding:9px 14px;font:inherit;cursor:pointer;width:100%;text-align:left}
#ctx2 button:hover{background:var(--bl)}#ctx2 button.dl:hover{background:var(--bad)}`;
document.head.appendChild(stl);
let OWN=false;
const chk=()=>SB.auth.getSession().then(r=>{const u=r.data&&r.data.session&&r.data.session.user;OWN=!!u&&(u.email||'').toLowerCase()===OWNER}).catch(()=>{});
chk();SB.auth.onAuthStateChange(()=>chk());   /* to allow every operator instead: replace OWN with isOp() in the handler below */
const LEG2=()=>{const a=S.ch.find(c=>c.id==='seed-aud')||[...S.ch].sort((a,b)=>(a.o||0)-(b.o||0))[0];return a?a.id:''};
const curId=()=>cur?cur.id:(($('mchSel')&&$('mchSel').value)||'');
/* tag rows with their ids so we know what was right-clicked */
const _rp=renderPg;renderPg=function(){_rp();const s=sorted();document.querySelectorAll('#pgb tr').forEach((tr,i)=>{if(s[i])tr.dataset.pid=s[i].id})};
const _rm3=renderMon;renderMon=function(){_rm3();const c=curId(),L=LEG2(),
 ids=[...S.lg].filter(l=>(l.ch||L)===c).sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,60).map(l=>l.id);
 document.querySelectorAll('#lgs .lg').forEach((d,i)=>{if(ids[i])d.dataset.lid=ids[i]})};
renderPg();
/* menu */
const menu=document.createElement('div');menu.id='ctx2';document.body.appendChild(menu);
const hide=()=>menu.style.display='none';
function doDel(it){if(!confirm('Delete this '+it.label+'? This cannot be undone.'))return;
 if(it.col==='musicians')S.eq.filter(e=>e.to===it.id).forEach(e=>save('equip',{...e,to:''}));
 if(it.col==='channels')SB.from('channel_pass').delete().eq('id',it.id).then(()=>{});
 del(it.col,it.id)}
document.addEventListener('contextmenu',e=>{if(!OWN)return;const t=e.target;let el,it=null;
 if(el=t.closest('.eq')){const s=el.querySelector('[data-to]');if(s)it={col:'equip',id:s.dataset.to,label:'equipment'}}
 else if(el=t.closest('.mr')){const b=el.querySelector('[data-rmm]');if(b)it={col:'musicians',id:b.dataset.rmm,label:'musician'}}
 else if(el=t.closest('.oi')){const k=el.dataset.o;if(k&&!k.startsWith('eq:'))it={col:'outs',id:k,label:'OUT item',fix:k}}
 else if(el=t.closest('.lg')){if(el.dataset.lid)it={col:'monlog',id:el.dataset.lid,label:'log entry'}}
 else if(el=t.closest('#pgb tr')){if(el.dataset.pid)it={col:'program',id:el.dataset.pid,label:'program row'}}
 else if(el=t.closest('.nw')){const b=el.querySelector('[data-x]');if(b)it={col:'news',id:b.dataset.x,label:'news post'}}
 else if(el=t.closest('.ch')){it={col:'channels',id:el.dataset.id,label:'department'}}
 if(!it)return;
 e.preventDefault();e.stopPropagation();
 menu.innerHTML=(it.fix?'<button id="c2f">✔ Claim as fixed</button>':'')+'<button class="dl" id="c2d">🗑 Delete '+it.label+'</button>';
 menu.style.display='block';menu.style.left=Math.min(e.clientX,innerWidth-200)+'px';menu.style.top=Math.min(e.clientY,innerHeight-90)+'px';
 $('c2d').onclick=()=>{hide();doDel(it)};if(it.fix)$('c2f').onclick=()=>{hide();fixOut(it.fix)}},true);
document.addEventListener('click',hide);document.addEventListener('scroll',hide,true);
})();

/* ===== PATCH v3.2: owner right-click delete ===== */
(function(){
let OWN=false,shownAt=0,T=null;
const chk=x=>{const u=x&&x.user;OWN=!!u&&(u.email||'').toLowerCase()===OWNER};
SB.auth.getSession().then(r=>chk(r.data&&r.data.session)).catch(()=>{});
SB.auth.onAuthStateChange((e,x)=>chk(x));
const st=document.createElement('style');st.textContent='#dctx{position:fixed;display:none;background:#1b1f26;border:1px solid var(--ln);z-index:120;padding:4px;box-shadow:0 6px 20px #000a}#dctx button{display:block;background:none;border:0;color:var(--tx);padding:9px 14px;font:inherit;cursor:pointer;width:100%;text-align:left}#dctx button:hover{background:var(--bl)}#dctx #dDel:hover{background:var(--bad)}';
document.head.appendChild(st);
const m=document.createElement('div');m.id='dctx';m.innerHTML='<button id="dDel">🗑 Delete</button><button id="dFix" style="display:none">✔ Claim as fixed</button>';document.body.appendChild(m);
function target(el){let n;
 if(n=el.closest('.ch[data-id]'))return{col:'channels',id:n.dataset.id,label:'department'};
 if(n=el.closest('.nw')){const b=n.querySelector('[data-x]');return b?{col:'news',id:b.dataset.x,label:'news post'}:null}
 if(n=el.closest('#eqs .eq')){const x=n.querySelector('[data-to]');return x?{col:'equip',id:x.dataset.to,label:'equipment'}:null}
 if(n=el.closest('#mus .mr')){const b=n.querySelector('[data-rmm]');return b?{col:'musicians',id:b.dataset.rmm,label:'musician'}:null}
 if(n=el.closest('#ous .oi'))return{col:'outs',id:n.dataset.o,label:'OUT item',oi:true};
 if(n=el.closest('#lgs .lg'))return n.dataset.lid?{col:'monlog',id:n.dataset.lid,label:'log entry'}:null;
 return null}
function show(x,y,t){T=t;shownAt=Date.now();$('dFix').style.display=t.oi?'block':'none';m.style.display='block';m.style.left=Math.min(x,innerWidth-190)+'px';m.style.top=Math.min(y,innerHeight-100)+'px'}
document.addEventListener('contextmenu',e=>{if(!OWN)return;const t=target(e.target);if(!t)return;e.preventDefault();e.stopPropagation();show(e.clientX,e.clientY,t)},true);
let lp;document.addEventListener('touchstart',e=>{if(!OWN)return;const t=target(e.target);if(!t)return;const p=e.touches[0];lp=setTimeout(()=>show(p.clientX,p.clientY,t),600)},{passive:true,capture:true});
['touchend','touchmove','touchcancel'].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(lp),true));
document.addEventListener('click',()=>{if(Date.now()-shownAt>400)m.style.display='none'});
$('dFix').onclick=()=>{m.style.display='none';if(T&&T.oi)fixOut(T.id)};
$('dDel').onclick=()=>{const t=T;m.style.display='none';if(!t||!OWN)return;
 if(t.oi&&String(t.id).startsWith('eq:'))return toast('That one is just an offline item. Use Claim as fixed, or set the equipment Online.');
 if(!confirm('Delete this '+t.label+'?'))return;
 if(t.col==='musicians')S.eq.filter(e=>e.to===t.id).forEach(e=>save('equip',{...e,to:''}));
 if(t.col==='equip')S.ou.filter(o=>o.eq===t.id).forEach(o=>del('outs',o.id));
 if(t.col==='channels')SB.from('channel_pass').delete().eq('id',t.id).then(()=>{});
 del(t.col,t.id);toast('Deleted')};
/* tag log rows with their ids so they can be right-clicked */
const _rm3=renderMon;renderMon=function(){_rm3();const v=$('monv');if(!v||v.style.display!=='block')return;
 const c=cur?cur.id:(($('mchSel')&&$('mchSel').value)||''),a=S.ch.find(x=>x.id==='seed-aud')||[...S.ch].sort((x,y)=>(x.o||0)-(y.o||0))[0],L=a?a.id:'';
 const ls=S.lg.filter(l=>(l.ch||L)===c).sort((x,y)=>(y.ts||0)-(x.ts||0)).slice(0,60);
 $('lgs').querySelectorAll('.lg').forEach((e,i)=>{if(ls[i])e.dataset.lid=ls[i].id})};
})();
