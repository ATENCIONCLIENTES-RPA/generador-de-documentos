
/* ===================== CAPA DE EXPERIENCIA: movimiento e interacción ===================== */
(function(){
const $=id=>document.getElementById(id);
const quieto=matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil=()=>matchMedia('(max-width:900px)').matches;
const body=document.body;

/* --- Arranque: la corriente entra y colapsa en el conductor central --- */
const ar=$('arranque');
const marcarListo=()=>{body.classList.add('listo');const vm=document.getElementById('viewMatrices');if(vm)vm.classList.add('listo');};
if(quieto){ar.remove();marcarListo();}
else{setTimeout(marcarListo,120);ar.addEventListener('animationend',e=>{if(e.animationName==='colapsa')ar.remove();});setTimeout(()=>ar.isConnected&&ar.remove(),2500);}

/* --- Pestañas (tableta y móvil) --- */
function vista(v,foco){
  body.dataset.vista=v;
  $('tabA').setAttribute('aria-selected',v==='a');$('tabB').setAttribute('aria-selected',v==='b');
  if(foco&&movil())setTimeout(()=>$(v==='a'?'q':'qD').focus({preventScroll:true}),350);
}
document.querySelectorAll('.pestanas button').forEach(b=>b.addEventListener('click',()=>vista(b.dataset.vista,true)));
['izq','der'].forEach(id=>$(id).addEventListener('focusin',()=>{if(!movil())body.dataset.vista=id==='izq'?'a':'b';}));

/* --- Conductor central arrastrable (ancho de los módulos, se recuerda) --- */
const cond=$('conductor');
const poner=p=>{p=Math.min(72,Math.max(28,p));document.documentElement.style.setProperty('--split',p+'%');cond.setAttribute('aria-valuenow',Math.round(p));return p;};
const fijar=p=>{p=poner(p);try{localStorage.setItem('essa_split',p);}catch(e){}};
/* el estado «sobre» no se activa al pasar por el interruptor de tema (que vive sobre el conductor) */
cond.addEventListener('pointerover',e=>cond.classList.toggle('sobre',!e.target.closest('.tema')));
cond.addEventListener('pointerleave',()=>{if(!cond.classList.contains('arrastra'))cond.classList.remove('sobre');});
try{const s=parseFloat(localStorage.getItem('essa_split'));if(s)fijar(s);}catch(e){}
cond.addEventListener('pointerdown',e=>{
  if(movil())return;cond.setPointerCapture(e.pointerId);cond.classList.add('arrastra');body.style.userSelect='none';
  /* durante el arrastre solo se aplica el estilo (una vez por frame); la preferencia se guarda al soltar */
  let ult=null,rf=0;
  const mv=ev=>{ult=ev.clientX/innerWidth*100;if(!rf)rf=requestAnimationFrame(()=>{rf=0;if(ult!==null)poner(ult);});};
  const up=()=>{if(rf){cancelAnimationFrame(rf);rf=0;}if(ult!==null)fijar(ult);cond.classList.remove('arrastra');body.style.userSelect='';cond.removeEventListener('pointermove',mv);cond.removeEventListener('pointerup',up);cond.removeEventListener('pointercancel',up);};
  cond.addEventListener('pointermove',mv);cond.addEventListener('pointerup',up);cond.addEventListener('pointercancel',up);
});
cond.addEventListener('dblclick',()=>fijar(50));
cond.addEventListener('keydown',e=>{const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--split'))||50;
  if(e.key==='ArrowLeft'){fijar(v-2);e.preventDefault();}if(e.key==='ArrowRight'){fijar(v+2);e.preventDefault();}if(e.key==='Home'){fijar(50);}});

/* --- Cada consulta energiza su módulo: barrido del riel + chispa en el conductor --- */
const chispa=$('chispa');
/* Reinicia las animaciones en el ciclo de frames (quitar la clase en un frame y ponerla en el siguiente) en lugar de
   forzar un reflujo síncrono con offsetWidth tras cada consulta. El resultado visual es el mismo. */
const m2c={};
const m2de=panel=>{const k=panel.id+'|'+(document.documentElement.dataset.tema||'');return m2c[k]||(m2c[k]=getComputedStyle(panel).getPropertyValue('--m2'));};
const colaE=new Set();let rafE=0;
function pasoE(){
  const ps=[...colaE];colaE.clear();
  ps.forEach(p=>p.classList.remove('pulso'));
  if(!movil())chispa.className='chispa';
  rafE=requestAnimationFrame(()=>{
    ps.forEach(p=>p.classList.add('pulso'));
    if(!movil()&&ps.length){const p=ps[ps.length-1];chispa.style.setProperty('--c',m2de(p));chispa.className='chispa va'+(p.id==='der'?' sube':'');}
    rafE=0;if(colaE.size)rafE=requestAnimationFrame(pasoE);
  });
}
function energizar(panel){
  if(quieto)return;
  colaE.add(panel);
  if(!rafE)rafE=requestAnimationFrame(pasoE);
}
[['res','izq'],['resD','der']].forEach(([r,p])=>{
  let listo=false;
  new MutationObserver(()=>{if(listo)energizar($(p));}).observe($(r),{childList:true});
  setTimeout(()=>listo=true,900);
});

/* --- Onda de señal mientras se escribe --- */
[['q'],['qD']].forEach(([id])=>{const bar=$(id).closest('.barra');let t;
  $(id).addEventListener('input',()=>{bar.classList.add('tecleando');clearTimeout(t);t=setTimeout(()=>bar.classList.remove('tecleando'),650);});});

/* --- Palabras clave accesibles con teclado --- */
['ayuda','ayudaD'].filter(id=>$(id)).forEach(id=>$(id).addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-ej]')){e.preventDefault();e.target.click();}}));

/* --- Atajos: "/" enfoca el buscador del módulo activo --- */
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&!e.target.closest('input,select,textarea')&&!$('velo').classList.contains('on')){e.preventDefault();$(body.dataset.vista==='b'?'qD':'q').focus();}
  if(e.key==='Escape'&&$('lupa').classList.contains('on'))cerrarLupa();
});

/* --- Luz que sigue el cursor sobre las fichas (solo con mouse) --- */
if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!quieto){
  let pend=null,ev=null;
  ['res','resD'].forEach(id=>$(id).addEventListener('pointermove',e=>{ev=e;if(pend)return;pend=requestAnimationFrame(()=>{pend=null;
    const c=ev.target.closest&&ev.target.closest('.ic');if(!c)return;const r=c.getBoundingClientRect();
    c.style.setProperty('--mx',(ev.clientX-r.left)+'px');c.style.setProperty('--my',(ev.clientY-r.top)+'px');});},{passive:true}));
}

/* --- Microinteracción: chispa al pulsar controles --- */
if(!quieto)document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.btn,.ub,#limpiar,#limpiarD,#ayuda b,#ayudaD b,.chip,.vf button');if(!b)return;
  const z=document.createElement('span');z.className='zap';z.style.left=e.clientX+'px';z.style.top=e.clientY+'px';
  document.body.appendChild(z);z.addEventListener('animationend',()=>z.remove());
},{passive:true});

/* --- Visor de imágenes integrado (reemplaza la ventana emergente) --- */
const lupa=$('lupa'),limg=lupa.querySelector('img');let blobU=null;
function abrirLupa(src){
  limg.src=src;lupa.classList.add('on');
  if(blobU){URL.revokeObjectURL(blobU);blobU=null;}
  fetch(src).then(r=>r.blob()).then(b=>{blobU=URL.createObjectURL(b);$('lupaAbrir').href=blobU;}).catch(()=>{$('lupaAbrir').href=src;});
  $('lupaCerrar').focus();
}
function cerrarLupa(){lupa.classList.remove('on');limg.removeAttribute('src');}
$('lupaCerrar').onclick=cerrarLupa;
lupa.addEventListener('click',e=>{if(e.target===lupa||e.target===limg)cerrarLupa();});
$('res').addEventListener('click',e=>{const im=e.target.closest('.imgs img');if(!im)return;e.stopImmediatePropagation();abrirLupa(im.src);},true);
})();

export {};
