const $=id=>document.getElementById(id),Q=s=>[...document.querySelectorAll(s)],rnd=(a,b)=>a+Math.random()*(b-a);

/* 1. Section titles and descriptions break apart letter by letter on tap (hero left untouched) */
Q('.shatter').forEach(el=>{
  el.innerHTML=el.textContent.split(' ').map(w=>'<span class="word">'+[...w].map(c=>`<span class="char" style="--rx:${rnd(-70,70)}px;--ry:${rnd(-70,70)}px;--rr:${rnd(-140,140)}deg">${c}</span>`).join('')+'</span>').join(' ');
  el.addEventListener('click',e=>{
    el.classList.add('vib');setTimeout(()=>el.classList.remove('vib'),300);
    el.querySelectorAll('.char').forEach(c=>{
      const b=c.getBoundingClientRect();
      if(Math.hypot(e.clientX-b.left-b.width/2,e.clientY-b.top-b.height/2)<150){c.classList.add('br');setTimeout(()=>c.classList.remove('br'),5000)}
    });
  });
});

/* 2. Robotic electric saber lightning: thunder/lightning path around border */
function bolt(w,h){
  const p=[],s=8,j=()=>rnd(-3,3);
  for(let x=0;x<w;x+=s)p.push([x,j()]);
  for(let y=0;y<h;y+=s)p.push([w+j(),y]);
  for(let x=w;x>0;x-=s)p.push([x,h+j()]);
  for(let y=h;y>0;y-=s)p.push([j(),y]);
  return 'M'+p.map(a=>a[0].toFixed(1)+','+a[1].toFixed(1)).join('L')+'Z';
}
function saber(el){
  const r=el.getBoundingClientRect(),w=r.width,h=r.height,m=8,ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('class','saber');
  svg.setAttribute('viewBox',`${-m} ${-m} ${w+2*m} ${h+2*m}`);
  svg.style.cssText=`left:${r.left+scrollX-m}px;top:${r.top+scrollY-m}px;width:${w+2*m}px;height:${h+2*m}px`;
  const ps=['sb','sc','sy'].map(c=>{const p=document.createElementNS(ns,'path');p.setAttribute('class',c);p.setAttribute('pathLength',100);svg.appendChild(p);return p});
  const draw=()=>ps.forEach(p=>p.setAttribute('d',bolt(w,h)));
  draw();document.body.appendChild(svg);
  const t=setInterval(draw,60);
  setTimeout(()=>{clearInterval(t);svg.remove()},850);
}

/* 3. Smaller finer shatter pieces that break and reassemble seamlessly back and forth */
const COLS=16,ROWS=12,TB=1200,BUILD=2400,D=TB+BUILD,SW=750;
function snap(v){
  try{if(!v.videoWidth)throw 0;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/jpeg',.6)}
  catch(_){return v.poster}
}
function prep(face){
  const t=face.cloneNode(true),vs=t.querySelectorAll('video');
  face.querySelectorAll('video').forEach((v,i)=>{const im=new Image(),s=snap(v);if(s)im.src=s;vs[i].replaceWith(im)});
  return t;
}
const tr=(x,y,a)=>`translate(${x}px,${y}px) rotate(${a}deg)`,fr=t=>Math.min(1,t/D);
function flip(st){
  if(st.dataset.busy)return;st.dataset.busy=1;
  const ff=st.querySelector('.ff'),fb=st.querySelector('.fb'),back=st.classList.contains('flipped'),
    oldF=prep(back?fb:ff),newF=fb?prep(back?ff:fb):oldF,
    W=st.clientWidth,H=st.clientHeight,gx=W/COLS,gy=H/ROWS,box=document.createElement('div'),parts=[],
    P=[...Array(ROWS+1)].map((_,r)=>[...Array(COLS+1)].map((_,c)=>[c*gx+(c%COLS?rnd(-.15,.15)*gx:0),r*gy+(r%ROWS?rnd(-.15,.15)*gy:0)]));
  box.className='shards';
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const a=P[r][c],b=P[r][c+1],e=P[r+1][c+1],d=P[r+1][c],k=Math.random();
    (k<.45?[[a,b,e,d]]:k<.725?[[a,b,d],[b,e,d]]:[[a,b,e],[a,e,d]]).forEach(pts=>parts.push({pts,r}));
  }
  parts.forEach(({pts,r})=>{
    const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),bx=Math.floor(Math.min(...xs)),by=Math.floor(Math.min(...ys)),
      bw=Math.ceil(Math.max(...xs))-bx,bh=Math.ceil(Math.max(...ys))-by,s=document.createElement('div'),
      n=newF.cloneNode(true),o=oldF.cloneNode(true);
    s.className='shard';
    s.style.cssText=`left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;clip-path:polygon(${pts.map(q=>(q[0]-bx).toFixed(1)+'px '+(q[1]-by).toFixed(1)+'px').join(',')})`;
    n.classList.add('g','n');o.classList.add('g','o');
    [n,o].forEach(g=>g.style.cssText=`left:${-bx}px;top:${-by}px;width:${W}px;height:${H}px`);
    s.append(n,o);box.appendChild(s);
    const rot=rnd(-55,55),ra=Math.abs(rot*Math.PI/180),hh=(bw*Math.sin(ra)+bh*Math.cos(ra))/2,
      ty=H-2-hh-(ROWS-1-r)*bh*rnd(.18,.32)-(by+bh/2),
      tx=Math.max(-bx-bw*.08,Math.min(W-bx-bw*.92,rnd(-.08,.08)*W)),
      fd=480+Math.abs(ty)*.7,d1=rnd(0,120),lift=rnd(4,12),ta=TB+rnd(0,BUILD*.25),ad=BUILD*.75,
      rest=tr(tx,ty,rot),home=tr(0,0,0);
    s.animate([
      {offset:0,transform:home},
      {offset:fr(d1),transform:home,easing:'cubic-bezier(.5,0,.9,.55)'},
      {offset:fr(d1+.6*fd),transform:tr(tx*.8,ty,rot*.9),easing:'cubic-bezier(.2,.6,.4,1)'},
      {offset:fr(d1+.8*fd),transform:tr(tx*.9,ty-lift,rot*.95),easing:'cubic-bezier(.5,0,.9,.55)'},
      {offset:fr(d1+fd),transform:rest},
      {offset:fr(ta),transform:rest,easing:'ease-in'},
      {offset:fr(ta+.4*ad),transform:tr(tx*.45,ty*.55-rnd(15,40),rot*.5),easing:'ease-out'},
      {offset:fr(ta+ad),transform:home},
      {offset:1,transform:home}
    ],{duration:D,fill:'forwards'});
  });
  st.appendChild(box);st.classList.add('shat');
  setTimeout(()=>box.classList.add('sw'),SW);
  setTimeout(()=>{if(fb)st.classList.toggle('flipped');st.classList.remove('shat');box.remove();delete st.dataset.busy},D+100);
}

/* Tap handler for images/videos */
document.addEventListener('click',e=>{
  if(e.target.closest('.shatter'))return;
  const st=e.target.closest('.stage');
  if(!st)return;
  saber(st);
  flip(st);
});

/* 4. Videos play by themselves (muted, looping) while they're on screen and pause when they scroll away.
   Videos with controls can still be tapped for sound; a video someone paused stays paused. */
const onScreen=new Set();
const vio='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{
  const v=e.target;
  if(e.isIntersecting){onScreen.add(v);if(!v.getAttribute('src')&&v.dataset.src)v.src=v.dataset.src;if(!v.dataset.hold)v.play().catch(()=>{})}
  else{onScreen.delete(v);if(!v.paused){v._sys=1;v.pause()}}
}),{threshold:.3}):null;
function watchVideo(v){
  v.muted=true;v.defaultMuted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.removeAttribute('autoplay');
  v.addEventListener('pause',()=>{if(!v._sys)v.dataset.hold=1;v._sys=0});
  v.addEventListener('play',()=>{delete v.dataset.hold});
  if(vio)vio.observe(v);else{if(v.dataset.src&&!v.getAttribute('src'))v.src=v.dataset.src;v.play().catch(()=>{})}
}
Q('video').forEach(v=>{if(v.id!=='introV'&&!v.closest('dialog,.ba'))watchVideo(v)});
const kick=()=>onScreen.forEach(v=>{if(v.paused&&!v.dataset.hold)v.play().catch(()=>{})});
addEventListener('load',kick);document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick()});
['touchstart','pointerdown','scroll','keydown'].forEach(n=>addEventListener(n,kick,{once:true,passive:true}));

/* 5. Category filter (Portfolio) */
const tabs=Q('#portfolio-gallery .tab'),cards=Q('#portfolio-gallery .card');
const tabNote=$('tabNote');
tabs.forEach(b=>b.onclick=()=>{
  tabs.forEach(t=>{t.classList.toggle('on',t===b);t.setAttribute('aria-pressed',t===b)});
  cards.forEach(c=>c.style.display=b.dataset.f==='all'||c.dataset.cat.split(' ').includes(b.dataset.f)?'':'none');
  if(tabNote){tabNote.textContent=b.dataset.note||'';tabNote.hidden=!b.dataset.note}
});

/* 5b. Project viewer: a project card opens its videos and photos */
const PJ=window.PJ||{};
const pv=$('pv'),pvG=$('pvG');
if(pv){
function openProject(id){
  const p=PJ[id];if(!p)return;
  $('pvM').innerHTML=p.m;$('pvT').innerHTML=p.t;$('pvD').innerHTML=p.d;
  $('pvL').innerHTML=p.l?`<a href="${p.l[0]}" target="_blank" rel="noopener">${p.l[1]} →</a>`:'';
  let h='',hv='',hi='';
  p.v.forEach(v=>{hv+=v.ba
    ?`<figure class="wide">${baHTML(v)}<figcaption>${v.label}</figcaption></figure>`
    :v.embed
    ?`<figure class="wide"><div class="emb${v.ar==='1/1'?' sq':''}"><iframe src="https://drive.google.com/file/d/${v.embed}/preview" title="${v.label}" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe></div><figcaption>${v.label} &middot; <a href="https://drive.google.com/file/d/${v.embed}/view" target="_blank" rel="noopener">Open in Google Drive ↗</a></figcaption></figure>`
    :`<figure class="wide"><video controls playsinline preload="metadata" poster="${v.poster}" width="${v.w}" height="${v.h}"${v.muted?' muted':''}><source src="${v.src}" type="video/mp4"></video><figcaption>${v.label}</figcaption></figure>`});
  p.i.forEach(i=>{hi+=`<figure${p.i.length===1?' class="wide"':''}><img src="${i.src}" alt="${i.alt}" width="${i.w}" height="${i.h}" loading="lazy" decoding="async"></figure>`});
  h=p.f?hi+hv:hv+hi;
  pvG.className='pv-media'+(p.i.length>1?' two':'');pvG.innerHTML=h;
  pv.showModal();pv.querySelector('.pv-in').scrollTop=0;const tt=document.querySelector('.taptip');if(tt)tt.remove();
  pvG.querySelectorAll('.ba').forEach(baSlider);
  const fv=pvG.querySelector('video[controls]');   /* opening a project starts its first video, with sound when the browser allows it */
  if(fv&&!pvG.querySelector('.ba'))fv.play().catch(()=>{fv.muted=true;fv.play().catch(()=>{})});
}
function closeProject(){pvG.querySelectorAll('video').forEach(v=>v.pause());pv.close()}
Q('.card.proj').forEach(c=>{
  c.addEventListener('click',()=>openProject(c.dataset.p));
  c.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openProject(c.dataset.p)}});
});
pv.querySelector('.pv-x').onclick=closeProject;
pv.addEventListener('click',ev=>{if(ev.target===pv)closeProject()});
pv.addEventListener('close',()=>{pvG.querySelectorAll('video').forEach(v=>v.pause());pvG.innerHTML=''});
}

/* 11. Before / after slider. One video holds both versions stacked (before on top, after underneath);
   a canvas shows "before" left of the line and "after" right of it, so both halves stay frame-perfect.
   Mouse: just move over it. Touch: drag sideways. Keyboard: arrow keys. It sweeps by itself until someone uses it. */
function baHTML(v){return `<div class="ba" data-src="${v.ba}" data-poster="${v.poster}" style="--ar:${v.ar||'2/1'}" tabindex="0" role="slider" aria-label="${v.alt||'Before and after the visual effects'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><canvas></canvas><span class="ba-tag l">Before</span><span class="ba-tag r">After</span><div class="ba-bar"><span class="ba-knob" aria-hidden="true">&#8644;</span></div><div class="ba-hint">Drag to compare</div></div>`}
const baHint=matchMedia('(hover:hover) and (pointer:fine)').matches?'Move your mouse across to compare':'Drag sideways to compare';
function baSlider(el){
  if(el._ba)return;el._ba=1;
  const c=el.querySelector('canvas'),x=c.getContext('2d'),v=document.createElement('video'),img=new Image();
  v.muted=true;v.defaultMuted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('muted','');v.preload='auto';v.className='ba-v';v.setAttribute('aria-hidden','true');
  el.appendChild(v);img.src=el.dataset.poster;const hn=el.querySelector('.ba-hint');if(hn)hn.textContent=baHint;
  let p=.5,vis=false,raf=0,t0=0,last=-1e9,drag=false;
  const set=q=>{p=Math.min(1,Math.max(0,q));el.style.setProperty('--p',(p*100).toFixed(2)+'%');el.setAttribute('aria-valuenow',Math.round(p*100))};
  const used=()=>{last=performance.now();el.classList.add('used')};
  function draw(ts){
    raf=0;if(!el.isConnected){v.pause();v.removeAttribute('src');return}
    if(ts-last>3500){if(!t0)t0=ts;const k=((ts-t0)/1000)%8,g=k<5?.5+.36*Math.sin(k/5*2*Math.PI):.5;set(p+(g-p)*.1)}else t0=0;
    const s=v.readyState>=2?v:(img.complete&&img.naturalWidth?img:null);
    if(s){const W=s.videoWidth||s.naturalWidth,H=(s.videoHeight||s.naturalHeight)/2;
      if(c.width!==W||c.height!==H){c.width=W;c.height=H}
      x.drawImage(s,0,H,W,H,0,0,W,H);
      const cw=Math.round(W*p);if(cw>0)x.drawImage(s,0,0,cw,H,0,0,cw,H)}
    if(vis)raf=requestAnimationFrame(draw);
  }
  const go=()=>{if(!raf)raf=requestAnimationFrame(draw)};
  const at=e=>{const r=el.getBoundingClientRect();set((e.clientX-r.left)/r.width);used();go()};
  el.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||drag)at(e)});
  el.addEventListener('pointerdown',e=>{drag=true;try{el.setPointerCapture(e.pointerId)}catch(_){}at(e)});
  ['pointerup','pointercancel'].forEach(n=>el.addEventListener(n,()=>{drag=false}));
  el.addEventListener('keydown',e=>{const d={ArrowLeft:-.05,ArrowRight:.05,Home:-1,End:1}[e.key];if(d!==undefined){e.preventDefault();set(p+d);used();go()}});
  const on=()=>{vis=true;if(!v.getAttribute('src'))v.src=el.dataset.src;v.play().catch(()=>{});go()},
        off=()=>{vis=false;v.pause()};
  if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?on():off()),{threshold:.25}).observe(el);else on();
  img.onload=go;set(.5);
}
Q('.ba').forEach(baSlider);

/* 12. A one-time tip so visitors know the headings and text break apart when tapped */
(()=>{const first=document.querySelector('.shatter');if(!first||!('IntersectionObserver' in window))return;
 let seen=false;try{seen=sessionStorage.getItem('tapTip')==='1'}catch(_){}
 if(seen)return;
 const tip=document.createElement('div');tip.className='taptip';tip.setAttribute('role','status');
 tip.innerHTML='<span class="tt-i" aria-hidden="true">&#128070;</span><span><b>Psst&hellip;</b> tap any heading or line of text and watch it break apart.<span class="tt-long"> It puts itself back together.</span></span><button type="button" aria-label="Close tip">&times;</button>';
 let shown=false;
 const done=()=>{try{sessionStorage.setItem('tapTip','1')}catch(_){}if(!shown)return;tip.classList.remove('on');setTimeout(()=>tip.remove(),450)};
 tip.querySelector('button').onclick=done;
 const io=new IntersectionObserver(es=>{if(!es.some(e=>e.isIntersecting))return;io.disconnect();shown=true;
   document.body.appendChild(tip);requestAnimationFrame(()=>requestAnimationFrame(()=>tip.classList.add('on')));
   first.classList.add('vib');setTimeout(()=>first.classList.remove('vib'),300);setTimeout(done,10000)},{threshold:1});
 io.observe(first);
 Q('.shatter').forEach(el=>el.addEventListener('click',done,{once:true}));
})();

/* 7. Mobile menu */
const mn=$('mn'),nv=$('nv');
mn.onclick=()=>{const o=nv.classList.toggle('open');mn.setAttribute('aria-expanded',o)};
Q('#nv a').forEach(a=>a.addEventListener('click',()=>{nv.classList.remove('open');mn.setAttribute('aria-expanded',false)}));

/* 8. Keyboard access: tap cards also open with Enter / Space */
Q('.stage').forEach(st=>{
  st.tabIndex=0;st.setAttribute('role','button');
  const a=st.querySelector('img,video');st.setAttribute('aria-label',(a&&a.getAttribute('alt')||'Card')+'. Press Enter to flip.');
  st.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();saber(st);flip(st)}});
});

/* 6. AI assistant */
const L=(u,t)=>`<a href='${u}' target='_blank' rel='noopener'>${t}</a>`;
const IMDB=L('https://www.imdb.com/name/nm11192416/?ref_=ext_shr_lnk','IMDb');
const ABOUT=`Yancarlos Martinez is a multi-disciplinary creator: a film editor recognized on ${IMDB} for “The Families Feud,” a New York Film Academy graduate (Class of 2019) who also studied at Goodwin College, a game developer and 3D artist (Unreal Engine 5, Unity, Blender, Character Creator 5), and a commercial print model.`;
const KB=[
[/salon|trish|donat|charity|children|ccmc|luncheon|hospital/i,`The Ms. Trish Self-Care Salon was Patricia “Ms. Trish” Candillo’s vision: a salon inside the hospital for patients, parents and staff. Her family is raising the funds to build it at Connecticut Children’s Medical Center. Yancarlos designed it in 3D and built the narrated presentation for the CCMC Charity Luncheon. ${L('/salon/','See the project and how to support it')}.`],
[/family|short film|bridg|emmanuel|olivia|\bmom\b|\bson\b|daughter/i,'His upcoming animated short stars Character Creator 5 versions of his family: Bridgitte (mom), Emmanuel (son), Olivia (daughter) and his youngest son.'],
[/web|site|develop|html|javascript|three/i,`He builds websites and interactive 3D pages, including this site and the Ms. Trish salon 3D tour. ${L('/web-development/','See his web development work')}.`],
[/sylvia|presentation|welcome/i,`Sylvia’s animated character welcomed guests at the CCMC Charity Luncheon. ${L('/sylvia/','See Sylvia’s page')}.`],
[/3d|game|unreal|unity|blender|\bcod(e|er|ing)\b|character|dot|robot|broccarlos|broccoli|victor|animat/i,`He builds games, shaders, and 3D virtual environments with Unreal Engine 5, Unity, Blender, and Character Creator 5, plus original universes like Broccarlos, Avictor and Dot Robot. ${L('/','See his animation work')}.`],
[/model|print|backstage|fashion|photo ?shoot/i,`Yancarlos works as a commercial print model for product and fashion shoots. ${L('/films/#portfolio-gallery','See his modeling work')} or his ${L('https://www.backstage.com','Backstage')} profile.`],
[/film|edit|award|imdb|movie|feud|nyfa|academy|goodwin|school|educat|diploma|graduat/i,`Yancarlos is recognized on ${IMDB} for editing the feature film “The Families Feud.” He studied at the New York Film Academy (Class of 2019) and Goodwin College. ${L('/films/','See his films')}.`],
[/social|instagram|tiktok|linkedin|facebook/i,'Connect with Yancarlos:<br>• '+L('https://www.linkedin.com/in/yancarlos-martinez-56a610203?trk=contact-info','LinkedIn')+'<br>• '+L('https://www.instagram.com/yancarlosmart1nez?vrfl=ZmpobjMyZnM4cjVl','Instagram')+'<br>• '+L('https://www.tiktok.com/@yancarlosmart1nez?_r=1&_t=ZP-9Ahc36fQtxv','TikTok')+'<br>• '+L('https://www.facebook.com/share/19sGsR39n8/','Facebook')],
[/contact|hire|email|reach/i,`You can reach Yancarlos directly at ${L('mailto:yanmartinez92@gmail.com','yanmartinez92@gmail.com')}, or see ${L('/about/','About &amp; Contact')}.`]
];
const chat=$('chat'),msgs=$('msgs'),q=$('q');
function say(who,txt,html){
  const p=document.createElement('p'),b=document.createElement('b');
  b.textContent=who+': ';p.appendChild(b);
  if(html)p.insertAdjacentHTML('beforeend',txt);else p.append(txt);
  msgs.appendChild(p);msgs.scrollTop=msgs.scrollHeight;
}
function ask(){
  const t=q.value.trim();if(!t)return;
  q.value='';say('You',t);
  setTimeout(()=>say('AI',(KB.find(k=>k[0].test(t))||[0,ABOUT])[1],1),400);
}
$('tg').onclick=()=>chat.classList.toggle('hidden');
$('xc').onclick=()=>chat.classList.add('hidden');$('snd').onclick=ask;
q.onkeydown=e=>{if(e.key==='Enter')ask()};

/* 9. Old one-page links (#portfolio-gallery, #contact...) go to their new pages */
(()=>{const m={'#portfolio-gallery':'/films/','#collaborators':'/about/#collaborators','#contact':'/about/#contact','#socials':'/about/#socials','#sylvia-section':'/sylvia/','#salon-section':'/salon/'};
 if(document.body.classList.contains('page-home')&&m[location.hash])location.replace(m[location.hash]);})();

/* 10. Intro video: plays once per visit, only when /media/yancarlos-intro.mp4 exists; can be skipped */
(()=>{const box=$('intro');if(!box)return;const v=$('introV');let seen=false;
 try{seen=sessionStorage.getItem('introSeen')==='1'}catch(_){}
 if(seen||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const close=()=>{try{sessionStorage.setItem('introSeen','1')}catch(_){};v.pause();box.hidden=true;document.documentElement.style.overflow=''};
 v.addEventListener('loadeddata',()=>{box.hidden=false;document.documentElement.style.overflow='hidden';v.play().catch(()=>{})},{once:true});
 v.addEventListener('ended',close);$('skip').onclick=close;
 $('introSnd').onclick=()=>{v.muted=!v.muted;$('introSnd').textContent=v.muted?'Sound on':'Sound off'};
 addEventListener('keydown',e=>{if(e.key==='Escape'&&!box.hidden)close()});
 v.src=v.dataset.src;v.load();})();
