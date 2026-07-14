'use strict';
/* BMDR site engine — one centralized rAF timeline drives scroll, reveals,
   hovers, glow phases, demos, and the accordion. No CSS transitions race it. */
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches||/[?&]still/.test(location.search);
const ROUTES=['index','method','features','pricing','faq','app'];
const ACCENT='#00ffcc';

const TL={t:0,last:performance.now()};
const S={cur:0,tgt:0,anim:false};let wheelT=-10;
let route='index',appMounted=false;
const reveals=[],mags=[],accs=[];
let chips=[],heroCv=null,heroCtx=null,engRead=null,demo={hz:1.2,px:60,phase:0};

/* ---------- text splitting ---------- */
function splitChars(el){
  if(el._chars)return el._chars;
  const chars=[];const frag=document.createDocumentFragment();
  const addWords=(text)=>{
    const words=text.split(/\s+/).filter(Boolean);
    words.forEach(w=>{
      const ws=document.createElement('span');ws.className='w';
      for(const ch of w){const cs=document.createElement('span');cs.className='c';cs.textContent=ch;ws.appendChild(cs);chars.push(cs);}
      frag.appendChild(ws);
      frag.appendChild(document.createTextNode(' '));
    });
  };
  for(const node of [...el.childNodes]){
    if(node.nodeType===3)addWords(node.textContent);
    else if(node.nodeName==='BR')frag.appendChild(document.createElement('br'));
    else addWords(node.textContent);
  }
  if(frag.lastChild&&frag.lastChild.nodeType===3)frag.removeChild(frag.lastChild);
  el.textContent='';el.appendChild(frag);
  el._chars=chars;return chars;
}

/* ---------- reveal registry ---------- */
function mountSection(sec){
  reveals.length=0;
  $$('.k-head',sec).forEach(h=>{const chars=splitChars(h);h._p=0;reveals.push({el:h,chars,p:0});});
  $$('[data-reveal]',sec).forEach(el=>{reveals.push({el,p:0});});
  const fw=$('#foot-wrap footer');if(fw&&!reveals.some(r=>r.el===fw))reveals.push({el:fw,p:0});
}

/* ---------- magnetic hovers ---------- */
function addMag(el){
  const m={el,inner:el.querySelector('.mag-in'),tx:0,ty:0,x:0,y:0};
  el.addEventListener('pointermove',e=>{
    const r=el.getBoundingClientRect();
    m.tx=clamp(e.clientX-(r.left+r.width/2),-60,60)*.22;
    m.ty=clamp(e.clientY-(r.top+r.height/2),-30,30)*.34;
  });
  el.addEventListener('pointerleave',()=>{m.tx=0;m.ty=0;});
  mags.push(m);
}

/* ---------- border tracking + glow phase ---------- */
function addTrack(el){
  el._g=0;el._gt=0;
  el.addEventListener('pointermove',e=>{
    const r=el.getBoundingClientRect();
    el.style.setProperty('--mx',(e.clientX-r.left)+'px');
    el.style.setProperty('--my',(e.clientY-r.top)+'px');
    el._gt=1;
  });
  el.addEventListener('pointerleave',()=>{el._gt=0;});
}

/* ---------- accordion ---------- */
function initFaq(){
  $$('.qa').forEach(qa=>{
    const a={btn:$('.qa-q',qa),body:$('.qa-b',qa),inner:$('.qa-in',qa),icon:$('.qa-i',qa),o:0,tgt:0};
    a.btn.addEventListener('click',()=>{
      const open=a.tgt>0.5;
      accs.forEach(x=>{x.tgt=0;x.btn.setAttribute('aria-expanded','false');});
      if(!open){a.tgt=1;a.btn.setAttribute('aria-expanded','true');}
    });
    accs.push(a);
  });
}

/* ---------- lissajous ---------- */
function lissPoint(a){return[150+120*Math.sin(a),65+48*Math.sin(2*a)];}
function buildLiss(){
  let d='';
  for(let i=0;i<=128;i++){const[x,y]=lissPoint(i/128*Math.PI*2);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}
  $('#liss-path').setAttribute('d',d+'Z');
}

/* ---------- features demos ---------- */
function initDemos(){
  const hz=$('#f-hz'),hzV=$('#f-hz-val'),px=$('#f-px'),pxV=$('#f-px-val');
  if(!hz)return;
  hz.addEventListener('input',()=>{demo.hz=parseFloat(hz.value);hzV.textContent=demo.hz.toFixed(1);});
  px.addEventListener('input',()=>{demo.px=parseInt(px.value,10);pxV.textContent=px.value;});
  buildLiss();
  chips=$$('.chip-c');
}

/* ---------- hero canvas (0.4 Hz ambient engine, split-aware) ---------- */
function sizeHero(){
  if(!heroCv)return;
  const r=heroCv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
  heroCv.width=Math.max(1,r.width*dpr);heroCv.height=Math.max(1,r.height*dpr);
  heroCtx.setTransform(dpr,0,0,dpr,0,0);
}
function splitPoly(ctx,r,sign){
  /* half-plane of the 105deg gradient boundary, in canvas coords */
  const cx=innerWidth/2-r.left,cy=innerHeight/2-r.top;
  const d={x:Math.sin(105*Math.PI/180)*sign,y:-Math.cos(105*Math.PI/180)*sign};
  const b={x:-d.y,y:d.x},L=6000;
  ctx.beginPath();
  ctx.moveTo(cx-b.x*L,cy-b.y*L);
  ctx.lineTo(cx+b.x*L,cy+b.y*L);
  ctx.lineTo(cx+b.x*L+d.x*L,cy+b.y*L+d.y*L);
  ctx.lineTo(cx-b.x*L+d.x*L,cy-b.y*L+d.y*L);
  ctx.closePath();ctx.clip();
}
function orb(ctx,x,y,rad,core,edge){
  const g=ctx.createRadialGradient(x,y,0,x,y,rad);
  g.addColorStop(0,core);g.addColorStop(1,edge);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
}
function drawHero(){
  if(!heroCv||route!=='index')return;
  const r=heroCv.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight)return;
  const w=r.width,h=r.height,ctx=heroCtx;
  ctx.clearRect(0,0,w,h);
  const xn=Math.sin(TL.t*Math.PI*2*0.4);
  const x=w/2+xn*w*0.36,y=h*0.56;
  /* dark side: luminous teal */
  ctx.save();splitPoly(ctx,r,1);
  for(let k=5;k>=0;k--){
    const tt=TL.t-k*0.05,gx=w/2+Math.sin(tt*Math.PI*2*0.4)*w*0.36;
    orb(ctx,gx,y,120+k*12,'rgba(0,255,204,'+(0.20*(1-k/6))+')','rgba(0,255,204,0)');
  }
  orb(ctx,x,y,26,'rgba(230,255,250,.95)','rgba(0,255,204,0)');
  ctx.restore();
  /* light side: inverted polarity — deep ink orb */
  ctx.save();splitPoly(ctx,r,-1);
  for(let k=5;k>=0;k--){
    const tt=TL.t-k*0.05,gx=w/2+Math.sin(tt*Math.PI*2*0.4)*w*0.36;
    orb(ctx,gx,y,120+k*12,'rgba(10,14,13,'+(0.16*(1-k/6))+')','rgba(10,14,13,0)');
  }
  orb(ctx,x,y,26,'rgba(0,90,72,.95)','rgba(0,90,72,0)');
  ctx.restore();
  if(engRead)engRead.textContent='Engine preview · 0.4 Hz · x '+(xn<0?'−':'+')+Math.abs(xn).toFixed(2);
}

/* ---------- app mount: plain relative iframe (app.html ships alongside this file) ---------- */
function mountApp(){
  if(appMounted)return;appMounted=true;
  $('#app-frame').src='/app.html';
}

/* ---------- smooth scroll (wheel-normalized) ---------- */
const maxScroll=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
addEventListener('wheel',e=>{
  if(RM||route==='app')return;
  e.preventDefault();
  wheelT=TL.t;
  S.tgt=clamp(S.tgt+e.deltaY,0,maxScroll());
},{passive:false});
addEventListener('scroll',()=>{if(!S.anim){S.tgt=scrollY;S.cur=scrollY;}},{passive:true});

/* ---------- router ---------- */
function go(){
  let h=(location.hash||'').replace(/^#\/?/,'');
  if(!ROUTES.includes(h))h='index';
  route=h;
  $$('.page').forEach(p=>p.classList.toggle('on',p.dataset.route===h));
  document.body.classList.toggle('app-mode',h==='app');
  $('#foot-wrap').style.display=h==='app'?'none':'';
  $$('#nav a[data-r]').forEach(a=>{const cur=a.dataset.r===h||(h==='index'&&a.dataset.r==='index');a.classList.toggle('cur',cur);if(cur)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(h==='app')mountApp();
  scrollTo(0,0);S.cur=0;S.tgt=0;S.anim=false;
  requestAnimationFrame(()=>{
    mountSection($('.page[data-route="'+h+'"]'));
    if(h==='index'){heroCv=$('#hero-canvas');heroCtx=heroCv.getContext('2d');engRead=$('#eng-read');sizeHero();}
  });
}
addEventListener('hashchange',go);
addEventListener('resize',()=>{if(route==='index')sizeHero();});

/* ---------- the timeline ---------- */
function frame(){
  const now=performance.now(),dt=Math.min(.05,(now-TL.last)/1000);
  TL.last=now;TL.t+=dt;
  const k1=1-Math.pow(.002,dt),k2=1-Math.pow(.0001,dt),vh=innerHeight;

  /* scroll */
  if(!RM&&route!=='app'&&TL.t-wheelT<2){
    S.anim=Math.abs(S.tgt-S.cur)>.4;
    if(S.anim){S.cur+=(S.tgt-S.cur)*k1;scrollTo(0,S.cur);}else{S.cur=S.tgt;S.anim=false;}
  }

  /* reveals */
  for(const r of reveals){
    const rect=r.el.getBoundingClientRect();
    let raw=clamp((vh*0.94-rect.top)/(vh*0.42),0,1);
    if(RM){raw=rect.top<vh?1:0;r.p=raw;}else{r.p+=(raw-r.p)*k2;}
    if(r.chars){
      const n=r.chars.length,st=n>1?0.7/(n-1):0;
      for(let i=0;i<n;i++){
        const q=clamp((r.p-i*st)/0.3,0,1),e=1-Math.pow(1-q,3);
        r.chars[i].style.transform='translateY('+((1-e)*125).toFixed(2)+'%) rotate('+((1-e)*6).toFixed(2)+'deg)';
      }
    }else{
      const e=1-Math.pow(1-r.p,3);
      r.el.style.transform='translateY('+((1-e)*44).toFixed(2)+'px)';
      r.el.style.opacity=(.02+.98*e).toFixed(3);
    }
  }

  /* magnetic */
  for(const m of mags){
    m.x+=(m.tx-m.x)*k1;m.y+=(m.ty-m.y)*k1;
    m.el.style.transform='translate('+m.x.toFixed(2)+'px,'+m.y.toFixed(2)+'px)';
    if(m.inner)m.inner.style.transform='translate('+(-m.x*.35).toFixed(2)+'px,'+(-m.y*.35).toFixed(2)+'px)';
  }

  /* glow phases on tracked cards */
  for(const el of trackEls){
    el._g+=(el._gt-el._g)*k1;
    const pulse=el._g*(0.75+0.25*Math.sin(TL.t*3.1));
    el.style.setProperty('--gp',pulse.toFixed(3));
  }

  /* accordion */
  if(route==='faq'){
    for(const a of accs){
      if(RM)a.o=a.tgt;else a.o+=(a.tgt-a.o)*k1;
      if(Math.abs(a.tgt-a.o)<.001)a.o=a.tgt;
      a.body.style.height=(a.inner.scrollHeight*a.o).toFixed(1)+'px';
      a.icon.style.transform='rotate('+(a.o*135).toFixed(2)+'deg)';
    }
  }

  /* features demos */
  if(route==='features'){
    demo.phase+=dt*Math.PI*2*demo.hz;
    const dot=$('#demo-dot');
    if(dot){
      const lane=dot.parentElement,half=(lane.clientWidth-demo.px)/2-10;
      dot.style.width=dot.style.height=demo.px+'px';
      dot.style.transform='translate('+(Math.sin(demo.phase)*half-demo.px/2).toFixed(1)+'px,-50%)';
    }
    const sd=$('#sway-dot'),ld=$('#liss-dot');
    if(sd)sd.setAttribute('cx',(150+120*Math.sin(TL.t*Math.PI*2*0.35)).toFixed(1));
    if(ld){const[x,y]=lissPoint(TL.t*1.4);ld.setAttribute('cx',x.toFixed(1));ld.setAttribute('cy',y.toFixed(1));}
    for(let i=0;i<chips.length;i++){
      const g=.5+.5*Math.sin(TL.t*2.2+i*1.3),c=chips[i].dataset.c;
      chips[i].style.boxShadow='0 0 '+(14+g*26).toFixed(0)+'px '+c;
    }
    const pl=$('#panL i'),pr=$('#panR i');
    if(pl){const p=Math.sin(TL.t*Math.PI*2*0.4);
      pl.style.width=((.5-.5*p)*100).toFixed(1)+'%';pr.style.width=((.5+.5*p)*100).toFixed(1)+'%';}
  }

  drawHero();
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
let trackEls=[];
$$('.mag').forEach(addMag);
trackEls=$$('.track');trackEls.forEach(addTrack);
initFaq();initDemos();go();
requestAnimationFrame(frame);
