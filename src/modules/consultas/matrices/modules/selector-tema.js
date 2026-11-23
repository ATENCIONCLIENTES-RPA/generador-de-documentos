
/* ===================== SELECTOR DE TEMA (claro · automático · oscuro) =====================
   · El tema CLARO es el predeterminado: sin preferencia guardada se muestra siempre el claro. La
     preferencia elegida se guarda en localStorage ("essa_tema": light | dark | auto) y se aplica antes del
     primer pintado con el script del <head> (sin destello del tema equivocado).
   · "Automático" sigue prefers-color-scheme y reacciona en vivo a los cambios del sistema.
   · El cambio se anima con un revelado circular (View Transitions) desde el propio interruptor; sin esa
     API, o con "reducir movimiento", el cambio es instantáneo o un fundido breve acotado a superficies. */
(function(){
'use strict';
const R=document.documentElement,KEY='essa_tema';
const mq=matchMedia('(prefers-color-scheme: dark)'),mm=matchMedia('(prefers-reduced-motion: reduce)');
const ICON={
  sun:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2.6v2M12 19.4v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.6 12h2M19.4 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  auto:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg>',
  moon:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.6A8.4 8.4 0 1 1 9.4 4 6.6 6.6 0 0 0 20 14.6z"/></svg>'
};
const OPC=[
  {v:'light',n:'Claro',d:'Papel azulado y superficies luminosas. Ideal con buena luz.',i:'sun'},
  {v:'auto',n:'Automático',d:'',i:'auto'},
  {v:'dark',n:'Oscuro',d:'Tinta marino con acentos luminosos. Más cómodo con poca luz.',i:'moon'}
];
const leer=()=>{try{const v=localStorage.getItem(KEY);return v==='light'||v==='dark'||v==='auto'?v:'light';}catch(e){return 'light';}};
let pref=leer();
const resolver=p=>p==='auto'?(mq.matches?'dark':'light'):p;
const grupos=[];

function pintarTema(){
  const t=resolver(pref);
  R.dataset.temaPref=pref;R.dataset.tema=t;R.style.colorScheme=t;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',t==='dark'?'#090e1c':'#eef2f9');
  grupos.forEach(g=>{
    g.querySelectorAll('.tema-b').forEach(b=>{
      const on=b.dataset.v===pref;
      b.setAttribute('aria-checked',on);b.tabIndex=on?0:-1;
      if(b.dataset.v==='auto')b.dataset.tipD='Sigue la preferencia de su sistema operativo, que ahora usa el tema '+(mq.matches?'oscuro':'claro')+'.';
    });
  });
}

function fundido(){
  if(mm.matches)return;
  R.classList.add('tema-fade');clearTimeout(fundido.t);fundido.t=setTimeout(()=>R.classList.remove('tema-fade'),420);
}
function aplicar(nueva,origen){
  const antes=R.dataset.tema,despues=resolver(nueva);
  pref=nueva;
  try{localStorage.setItem(KEY,pref);}catch(e){}
  if(antes===despues){pintarTema();return;}
  if(mm.matches){pintarTema();return;}
  if(origen&&document.startViewTransition){
    R.classList.add('vt-reveal');
    const x=origen.x,y=origen.y,r=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
    let vt;
    try{vt=document.startViewTransition(()=>pintarTema());}catch(e){R.classList.remove('vt-reveal');pintarTema();return;}
    vt.ready.then(()=>{
      R.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]},
        {duration:680,easing:'cubic-bezier(.22,1,.36,1)',pseudoElement:'::view-transition-new(root)'});
    }).catch(()=>{});
    vt.finished.finally(()=>R.classList.remove('vt-reveal'));
  }else{fundido();pintarTema();}
}

function crear(orient){
  const g=document.createElement('div');
  g.className='tema '+orient;g.setAttribute('role','radiogroup');g.setAttribute('aria-label','Tema de color');
  g.innerHTML='<i class="tema-th" aria-hidden="true"></i>'+OPC.map(o=>
    `<button type="button" class="tema-b" role="radio" data-v="${o.v}" aria-checked="false" aria-label="Tema ${o.n.toLowerCase()}" data-tip="${o.n}" data-tip-e="Tema de color" data-tip-d="${o.d}" data-tip-i="${o.i}" data-tip-p="${orient==='v'?'right':'bottom'}">${ICON[o.i]}</button>`).join('');
  const centro=b=>{const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};};
  g.addEventListener('click',e=>{
    const b=e.target.closest('.tema-b');if(!b||b.dataset.v===pref)return;
    aplicar(b.dataset.v,centro(b));
    const nb=[...document.querySelectorAll('.tema-b')].filter(x=>x.dataset.v===b.dataset.v);
    nb.forEach(x=>{x.classList.remove('pop');void x.offsetWidth;x.classList.add('pop');});
    setTimeout(()=>nb.forEach(x=>x.classList.remove('pop')),800);
  });
  g.addEventListener('keydown',e=>{
    const k=e.key;if(!/^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(k))return;
    e.preventDefault();e.stopPropagation();
    const bs=[...g.querySelectorAll('.tema-b')];let i=bs.findIndex(b=>b.dataset.v===pref);
    if(k==='Home')i=0;else if(k==='End')i=bs.length-1;
    else i=(i+(/Right|Down/.test(k)?1:-1)+bs.length)%bs.length;
    const b=bs[i];b.focus();b.click();
  });
  /* el conductor central se arrastra con el puntero: el interruptor no debe iniciar el arrastre ni recentrar */
  ['pointerdown','dblclick'].forEach(n=>g.addEventListener(n,e=>e.stopPropagation()));
  grupos.push(g);return g;
}
const cond=document.getElementById("conductor"),barraTop=document.querySelector(".topbar");
if(cond)cond.appendChild(crear('v'));
if(barraTop)barraTop.appendChild(crear("h"));
pintarTema();

/* Cambios del sistema (modo automático) y de otras pestañas */
const alSistema=()=>{if(pref!=='auto')return;fundido();pintarTema();};
mq.addEventListener?mq.addEventListener('change',alSistema):mq.addListener(alSistema);
window.addEventListener('storage',e=>{if(e.key===KEY){pref=leer();fundido();pintarTema();}});
})();

export {};
