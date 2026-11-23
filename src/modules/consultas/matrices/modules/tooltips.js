
/* ===================== TOOLTIPS (componente único) =====================
   Sustituye al globo nativo del atributo "title". Los elementos conservan su
   "title" como respaldo: el script lo guarda en data-tip-raw al primer contacto,
   así el navegador no muestra su propio globo. También admite:
     data-tip, data-tip-d (descripción), data-tip-e (etiqueta superior),
     data-tip-i (icono), data-tip-r (filas JSON), data-tip-p (top|bottom|left|right)
   Accesible: role="tooltip" + aria-describedby; se muestra con foco de teclado,
   se cierra con Esc, y en pantallas táctiles aparece con pulsación larga. */
(function(){
'use strict';
const D=document,B=D.body;
const svg=d=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
const IC={
  copy:'<rect x="9" y="9" width="11" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  ok:'<path d="m5 12.5 4.5 4.5L19 7.5" stroke-width="2.6"/>',
  up:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  re:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  drag:'<path d="M8 7 3 12l5 5M16 7l5 5-5 5M3 12h18"/>',
  file:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h4"/>',
  zoom:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M10.5 8v5M8 10.5h5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  tag:'<path d="M4 4h8l8 8-8 8-8-8z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2M12 19.4v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.6 12h2M19.4 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.6A8.4 8.4 0 1 1 9.4 4 6.6 6.6 0 0 0 20 14.6z"/>',
  auto:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>'
};
const MN={req:'Matriz de requisitos',arb:'Árbol de transacciones'};
const modDe=e=>e.closest('#izq')?'req':e.closest('#der')?'arb':'';
const txt=e=>(e.textContent||'').replace(/\s+/g,' ').trim();
const json=s=>{try{return JSON.parse(s);}catch(_){return null;}};
const cut=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;

/* ---------- Estructura ---------- */
const tt=D.createElement('div');tt.className='rt';tt.id='rt';tt.setAttribute('role','tooltip');tt.setAttribute('aria-hidden','true');
tt.innerHTML='<div class="rt-in"><i class="rt-line"></i><div class="rt-ico"></div><div class="rt-bd"><div class="rt-eb"></div><div class="rt-ti"></div><div class="rt-de"></div><dl class="rt-rows"></dl><div class="rt-ks"></div></div><span class="rt-arrow"></span></div>';
B.appendChild(tt);
const $in=tt.firstElementChild,$ico=tt.querySelector('.rt-ico'),$eb=tt.querySelector('.rt-eb'),$ti=tt.querySelector('.rt-ti'),$de=tt.querySelector('.rt-de'),$rows=tt.querySelector('.rt-rows'),$ks=tt.querySelector('.rt-ks');

/* ---------- Qué dice cada elemento ---------- */
function describe(e){
  const mod=modDe(e);
  if(e.matches('iframe'))return null;
  if(e.matches('.medidor')){
    const rows=json(e.dataset.tipR);
    return {e:MN[mod]||'Versión',t:txt(e.querySelector('.tv'))||'Sin versión',i:'file',r:rows,
      d:rows?'':'Todavía no hay una versión cargada.'};
  }
  if(e.matches('.ub')){
    const carga=e.matches('label');
    if(carga)return {e:MN[mod],t:'Cargar nueva versión',i:'up',d:'Elija el Excel (.xlsx) de la nueva versión. También puede soltarlo sobre este recuadro.'};
    const urg=e.classList.contains('urgente');
    return {e:MN[mod],t:'Actualizar aplicativo',i:'re',tone:urg?'warn':'',
      d:urg?'Hay una versión guardada pendiente. Pulse para aplicarla.':'Recarga el aplicativo para usar la versión guardada.'};
  }
  if(e.matches('[data-c]')){
    if(e.classList.contains('ok'))return {t:'Copiado',i:'ok',tone:'ok',d:'El texto ya está en el portapapeles.'};
    const todo=/todo/i.test(txt(e));
    const cab=e.closest('.cab');let sec='';
    if(cab&&cab.firstElementChild){const c=cab.firstElementChild.cloneNode(true);c.querySelectorAll('small,.ix').forEach(n=>n.remove());sec=cut(txt(c),48);}
    return {e:todo?'':sec,t:todo?'Copiar todo':'Copiar sección',i:'copy',
      d:todo?'Copia todas las secciones en un solo paso.':'Copia el texto de este bloque al portapapeles.'};
  }
  if(e.matches('.conductor'))return {e:'Vista dividida',t:'Ajustar ancho de los módulos',i:'drag',p:'right',
    d:'Arrastre el divisor para repartir el espacio. Doble clic para centrar.',k:[[['←','→'],'Ajustar'],[['Inicio'],'Centrar']]};
  if(e.matches('.imgs img'))return {t:'Ampliar imagen',i:'zoom',d:'Clic para ver en tamaño completo.'};
  if(e.matches('[data-carpeta]')){
    const v=/vincular/i.test(txt(e));
    return {e:'Carpeta del aplicativo',t:v?'Vincular carpeta':'Cambiar carpeta',i:'folder',
      d:v?'Elija la carpeta donde está guardado este HTML para que las nuevas versiones se guarden allí.':'Elija otra carpeta para guardar las nuevas versiones.'};
  }
  if(e.matches('.eb .codigo')){
    return {e:'Código del documento',t:txt(e),i:'tag',d:(MN[mod]||'')+' · Proceso Atención a Clientes'};
  }
  if(e.matches('.ust')){
    if(e.scrollWidth<=e.clientWidth+1)return null;
    return {e:'Estado',t:txt(e),i:'info'};
  }
  if(e.matches('.dd-btn')){
    const raw=e.dataset.tipRaw;if(!raw||!e.classList.contains('tiene'))return null;
    return {e:'Consulta seleccionada',t:raw,i:'grid'};
  }
  if(e.dataset.tip!=null||e.dataset.tipRaw!=null){
    return {e:e.dataset.tipE||'',t:e.dataset.tip||e.dataset.tipRaw,d:e.dataset.tipD||'',i:e.dataset.tipI||'',r:json(e.dataset.tipR),p:e.dataset.tipP||''};
  }
  return null;
}
/* "title" → data-tip-raw (evita el globo nativo) */
function migrar(e){
  if(e.nodeType!==1||!e.hasAttribute('title')||e.matches('iframe'))return;
  e.dataset.tipRaw=e.getAttribute('title');e.removeAttribute('title');
}
function encontrar(t){
  for(let e=t instanceof Element?t:(t&&t.parentElement);e&&e!==B&&e!==D.documentElement;e=e.parentElement){
    migrar(e);
    const c=describe(e);
    if(c&&(c.t||c.d))return {el:e,c};
  }
  return null;
}
D.querySelectorAll('[title]').forEach(migrar);
new MutationObserver(m=>m.forEach(r=>migrar(r.target))).observe(D.documentElement,{attributes:true,attributeFilter:['title'],subtree:true});

/* ---------- Pintar contenido ---------- */
function pintar(c,el){
  $ico.innerHTML=c.i?svg(IC[c.i]||IC.info):'';
  $eb.textContent=c.e||'';$ti.textContent=c.t||'';$de.textContent=c.d||'';
  $rows.textContent='';
  (c.r||[]).forEach(([k,v])=>{if(v==null||v==='')return;const r=D.createElement('div');r.className='rt-r';const dt=D.createElement('dt'),dd=D.createElement('dd');dt.textContent=k;dd.textContent=v;r.append(dt,dd);$rows.append(r);});
  $ks.textContent='';
  (c.k||[]).forEach(([keys,lab])=>{const g=D.createElement('span');g.className='rt-kg';keys.forEach(k=>{const b=D.createElement('kbd');b.textContent=k;g.append(b);});const s=D.createElement('span');s.textContent=lab;g.append(s);$ks.append(g);});
  $in.classList.toggle('solo',!c.d&&!(c.r&&c.r.length)&&!(c.k&&c.k.length)&&!c.e);
  /* tema del módulo */
  const mod=modDe(el);if(mod)tt.dataset.mod=mod;else tt.removeAttribute('data-mod');
  if(c.tone)tt.dataset.tone=c.tone;else tt.removeAttribute('data-tone');
}

/* ---------- Posición ---------- */
const OP={top:'bottom',bottom:'top',left:'right',right:'left'};
function colocar(el,c,pt,modo){
  const vw=D.documentElement.clientWidth,vh=window.innerHeight,m=8;
  let r=el.getBoundingClientRect();
  const grande=r.height>140||r.width>320;
  let punto=null;
  if(grande){punto=pt||{x:r.left+r.width/2,y:r.top+r.height/2};r={left:punto.x,right:punto.x,top:punto.y,bottom:punto.y,width:0,height:0};}
  const w=tt.offsetWidth,h=tt.offsetHeight,gap=punto?14:11;
  const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const pref=c.p||'top';
  const orden=[pref,OP[pref],...(pref==='top'||pref==='bottom'?['right','left']:['top','bottom'])];
  const caber={top:r.top-gap-h>=m,bottom:r.bottom+gap+h<=vh-m,left:r.left-gap-w>=m,right:r.right+gap+w<=vw-m};
  let pl=orden.find(p=>caber[p]);
  if(!pl)pl=(r.top>vh-r.bottom)?'top':'bottom';
  let x,y;
  if(pl==='top'){x=cx-w/2;y=r.top-gap-h;}
  else if(pl==='bottom'){x=cx-w/2;y=r.bottom+gap;}
  else if(pl==='left'){x=r.left-gap-w;y=cy-h/2;}
  else{x=r.right+gap;y=cy-h/2;}
  x=Math.max(m,Math.min(x,vw-m-w));y=Math.max(m,Math.min(y,vh-m-h));
  const horiz=pl==='top'||pl==='bottom';
  const ax=Math.max(16,Math.min(w-16,cx-x)),ay=Math.max(14,Math.min(h-14,cy-y));
  tt.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
  $in.classList.remove('p-top','p-bottom','p-left','p-right');$in.classList.add('p-'+pl);
  $in.style.setProperty('--ax',ax+'px');$in.style.setProperty('--ay',ay+'px');
  const d={top:['0','6px'],bottom:['0','-6px'],left:['6px','0'],right:['-6px','0']}[pl];
  $in.style.setProperty('--dx',d[0]);$in.style.setProperty('--dy',d[1]);
  $in.style.transformOrigin=horiz?`${ax}px ${pl==='top'?'100%':'0'}`:`${pl==='left'?'100%':'0'} ${ay}px`;
}

/* ---------- Ciclo de vida ---------- */
let cur=null,tShow=0,tHide=0,tAuto=0,lastHide=0,vig=0,pointer=null;
const ahora=()=>performance.now();
function mostrar(h,modo){
  clearTimeout(tHide);
  const mismo=cur&&cur.el===h.el,estaba=!!cur;
  if(cur&&cur.el!==h.el)cur.el.removeAttribute('aria-describedby');
  cur={el:h.el,modo,t:ahora()};
  pintar(h.c,h.el);
  tt.classList.add('vis');
  colocar(h.el,h.c,modo==='mouse'?pointer:null,modo);
  tt.classList.toggle('glide',estaba);
  $in.classList.remove('an');void tt.offsetWidth;$in.classList.add('an');
  if(!estaba){$in.classList.remove('on');void $in.offsetWidth;}
  $in.classList.add('on');
  tt.setAttribute('aria-hidden','false');h.el.setAttribute('aria-describedby','rt');
  clearInterval(vig);
  vig=setInterval(()=>{if(!cur||!cur.el.isConnected)ocultar();},250);
}
function ocultar(){
  clearTimeout(tShow);clearTimeout(tHide);clearTimeout(tAuto);clearInterval(vig);
  if(!cur){return;}
  cur.el.removeAttribute('aria-describedby');cur=null;lastHide=ahora();
  $in.classList.remove('on');tt.classList.remove('glide');tt.setAttribute('aria-hidden','true');
  tt.classList.remove('vis');
}
function armar(h,modo){
  clearTimeout(tShow);clearTimeout(tHide);
  const tibio=cur||(ahora()-lastHide<450);
  const demora=modo==='tecla'?0:tibio?70:420;
  tShow=setTimeout(()=>mostrar(h,modo),demora);
}
const salir=(ms)=>{clearTimeout(tShow);if(!cur)return;clearTimeout(tHide);tHide=setTimeout(ocultar,ms);};

/* Ratón */
D.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')pointer={x:e.clientX,y:e.clientY};},{passive:true,capture:true});
D.addEventListener('pointerover',e=>{
  if(e.pointerType==='touch')return;
  pointer={x:e.clientX,y:e.clientY};
  const h=encontrar(e.target);
  if(!h){salir(90);return;}
  if(cur&&cur.el===h.el){clearTimeout(tHide);return;}
  armar(h,'mouse');
},true);
D.documentElement.addEventListener('pointerleave',()=>{salir(0);});
D.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch')return;
  const h=cur&&cur.el.contains(e.target)&&cur.el.matches('[data-c]');
  if(!h)ocultar();
},true);

/* Teclado */
D.addEventListener('focusin',e=>{
  if(!e.target.matches||!e.target.matches(':focus-visible'))return;
  const h=encontrar(e.target);
  if(!h||h.el.matches('.dd-btn'))return;
  armar(h,'tecla');
},true);
D.addEventListener('focusout',()=>ocultar(),true);
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&cur)ocultar();},true);
window.addEventListener('scroll',e=>{if(cur&&!tt.contains(e.target)&&!(cur.modo==='tecla'&&ahora()-cur.t<400))ocultar();},true);
window.addEventListener('resize',ocultar);
window.addEventListener('blur',ocultar);

/* Copiar: el rótulo confirma la acción */
D.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-c]');if(!b)return;
  let n=0;const t=setInterval(()=>{
    if(b.classList.contains('ok')){clearInterval(t);const c=describe(b);mostrar({el:b,c},cur&&cur.el===b?cur.modo:'auto');clearTimeout(tAuto);tAuto=setTimeout(ocultar,1500);}
    else if(++n>20)clearInterval(t);
  },50);
});

/* Táctil: pulsación larga */
let lp=0,tx=0,ty=0,tocado=false,tragar=0;
D.addEventListener('touchstart',e=>{
  if(e.touches.length!==1)return;
  const t=e.touches[0],h=encontrar(e.target);if(!h)return;
  tx=t.clientX;ty=t.clientY;clearTimeout(lp);
  lp=setTimeout(()=>{pointer={x:tx,y:ty};mostrar(h,'toque');tocado=true;clearTimeout(tAuto);tAuto=setTimeout(ocultar,2800);},520);
},{passive:true});
D.addEventListener('touchmove',e=>{const t=e.touches[0];if(t&&Math.hypot(t.clientX-tx,t.clientY-ty)>10)clearTimeout(lp);},{passive:true});
['touchend','touchcancel'].forEach(n=>D.addEventListener(n,()=>{clearTimeout(lp);if(tocado){tocado=false;tragar=Date.now()+500;}},{passive:true}));
D.addEventListener('click',e=>{if(Date.now()<tragar){e.preventDefault();e.stopPropagation();tragar=0;}},true);
D.addEventListener('touchstart',e=>{if(cur&&cur.modo==='toque'&&!cur.el.contains(e.target))ocultar();},{passive:true});
})();

export {};
