
/* ===================== CROMA · asignación de firmas por bloque =====================
   Capa independiente que se aplica DESPUÉS de cada búsqueda en #res (Matriz) y #resD (Árbol).
   No altera la lógica de búsqueda ni los botones existentes: solo añade atributos/clases.
   · Clave de bloque = entidad normalizada (municipio, aliado, proceso…). Los trámites de la
     Matriz se enlazan con el Árbol por el código de proceso que generan (p. ej. 4101).
   · Registro de sesión (sessionStorage): la misma clave conserva su firma toda la sesión.
   · 12 tonos armonizados × 4 formas = 48 firmas distintas, más un monograma de 2 letras. */
(function(){
'use strict';
const D=document,res=D.getElementById('res'),resD=D.getElementById('resD');
if(!res||!resD)return;
/* Paleta OKLCH: luminancia y croma equilibrados; orden pensado para que tonos consecutivos contrasten */
const PAL=[[.53,.17,268],[.60,.11,188],[.70,.14,72],[.58,.17,14],[.60,.14,152],[.54,.18,302],
           [.62,.12,236],[.60,.13,46],[.64,.13,118],[.56,.18,338],[.50,.06,252],[.62,.10,210]];
const col=(p,dk)=>`oklch(${(dk?Math.min(p[0]+.17,.84):p[0]).toFixed(2)} ${(dk?p[1]*.92:p[1]).toFixed(3)} ${p[2]})`;
const FORMAS=['o','s','h','t'];
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim();
const KEY='essa_croma_v1';
let REG={},n=0;
try{const o=JSON.parse(sessionStorage.getItem(KEY)||'{}');REG=o.r||{};n=o.n||0;}catch(_){}
const guardar=()=>{try{sessionStorage.setItem(KEY,JSON.stringify({r:REG,n}));}catch(_){}};
function indice(k,prev){
  if(REG[k]!=null)return REG[k];
  let i=n++;if(prev!=null&&i%12===prev%12)i=n++;   /* nunca dos vecinos nuevos con el mismo tono */
  REG[k]=i;return i;
}
const firma=i=>({c:i%12,f:FORMAS[Math.floor(i/12)%4]});
const mono=s=>{const w=norm(s).split(' ').filter(x=>x.length>1&&!/^(de|del|la|el|los|las|y|en|por|para|con)$/.test(x));
  if(!w.length)return '··';return (w.length>1?w[0][0]+w[w.length-1][0]:w[0].slice(0,2)).toUpperCase();};

/* ---- Claves de entidad ---- */
const M=window.MATRIZ||{},A=window.ARBOL||{};
const TRK={};(M.tramites||[]).forEach(t=>{const tx=(t.s||[]).map(x=>x.join(' ')).join(' ');const m=tx.match(/proceso\s*(\d{4})/i);
  TRK[t.c]={k:m?'p'+m[1]:'t'+norm(t.n),n:t.n};});
const PRK=i=>{const p=(A.procesos||[])[+i];return p?{k:'p'+p.c,n:p.n}:null;};
const PREF=/^(ejecutivo|ap|ciclo|circuito o linea|circuito|linea)\s+/;
function claveTitulo(span){
  const c=span.cloneNode(true);c.querySelectorAll('small,.ix').forEach(x=>x.remove());
  const raw=c.textContent.replace(/\s+/g,' ').trim();
  const k=norm(raw).replace(PREF,'').replace(/^(\S+ )?(\d{4}) .*$/,(m,a,d)=>/^(queja|pedido|peticion|recurso|reclamo|sugerencia|dano|proceso)/.test(m)?'#'+d:m);
  if(!k)return null;
  return {k:k.startsWith('#')?'p'+k.slice(1):'m'+k,n:raw.replace(/^(Ejecutivo|AP)\s+/i,'')};
}
function pintar(el,k,nombre,prev,conSello){
  const i=indice(k,prev),f=firma(i),p=PAL[f.c];
  el.dataset.k=k;el.style.setProperty('--kl',col(p,0));el.style.setProperty('--kd',col(p,1));
  if(conSello){conSello.dataset.mono=mono(nombre);conSello.dataset.shape=f.f;}
  return i;
}
function aplicar(cont,lado){
  let prev=null;const cards=[];
  /* listas de trámites/procesos */
  cont.querySelectorAll('.otros>div').forEach(r=>{
    const o=r.dataset.tr?TRK[r.dataset.tr]:r.dataset.ir?TRK[r.dataset.ir]:r.dataset.pr!=null?PRK(r.dataset.pr):null;
    if(o)prev=pintar(r,o.k,o.n,prev,r);
  });
  /* fichas de detalle: el encabezado define el bloque y sus secciones lo heredan */
  cont.querySelectorAll('.encab').forEach(e=>{
    const b=e.querySelector('.plate b');if(!b)return;
    const o=lado==='izq'?TRK[b.textContent.trim()]:{k:'p'+b.textContent.trim(),n:(e.querySelector('h2')||b).textContent};
    if(!o)return;pintar(e,o.k,o.n,null,null);
    const pa=e.parentElement;
    pa.querySelectorAll(':scope>.ic').forEach(c=>{c.classList.add('kx-det');pintar(c,o.k,o.n,null,null);});
  });
  /* tarjetas de resultado */
  cont.querySelectorAll('.ic').forEach(c=>{
    if(c.classList.contains('kx-det'))return;
    const sp=c.querySelector(':scope>.cab>span:first-child');if(!sp)return;
    const chip=c.querySelector('.cab [data-pr]');
    /* Árbol: las fichas de responsables toman el color de su trámite/hoja (Insumos ATC PQR, ATC Proyectos…), no del municipio */
    const gi=lado==='izq'&&!chip&&c.closest('#res>.grp'),gc=gi&&gi.style.getPropertyValue('--hc');
    if(gc){const o=claveTitulo(sp);if(o)pintar(c,o.k,o.n,null,sp);else c.dataset.k='g';
      c.style.setProperty('--kl',gc);c.style.setProperty('--kd',gc);if(sp.dataset)sp.dataset.shape='o';c.tabIndex=0;cards.push(c);return;}
    const gp=lado!=='izq'&&c.closest('.grp'),gt=gp&&gp.querySelector(':scope>.grupo');
    if(gt&&!chip&&window.colorHoja){const hn=(gt.firstChild&&gt.firstChild.textContent||gt.textContent).trim();
      const cc=window.colorHoja(hn)[0];c.dataset.k='h'+norm(hn);c.style.setProperty('--kl',cc);c.style.setProperty('--kd',cc);
      sp.dataset.mono=mono(hn);sp.dataset.shape='s';c.tabIndex=0;cards.push(c);return;}
    const o=chip?PRK(chip.dataset.pr):claveTitulo(sp);if(!o)return;
    prev=pintar(c,o.k,o.n,prev,sp);c.tabIndex=0;cards.push(c);
  });
  return cards;
}
const ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
function vincular(){
  const kI=new Set([...res.querySelectorAll('[data-k]')].map(e=>e.dataset.k));
  const kD=new Set([...resD.querySelectorAll('[data-k]')].map(e=>e.dataset.k));
  [[res,kD,'Árbol','Árbol de transacciones'],[resD,kI,'Matriz','Matriz de requisitos']].forEach(([c,otro,et,larga])=>{
    c.querySelectorAll('.kx-link').forEach(x=>x.remove());c.querySelectorAll('.kx-par').forEach(x=>x.classList.remove('kx-par'));
    let pares=new Set();
    c.querySelectorAll('.ic[data-k]:not(.kx-det)').forEach(card=>{
      if(!otro.has(card.dataset.k))return;pares.add(card.dataset.k);
      card.classList.add('kx-par');const i=D.createElement('i');i.className='kx-link';i.innerHTML=ICO+et;
      i.dataset.tip='Bloque vinculado';i.dataset.tipE='Identidad cromática';i.dataset.tipI='tag';
      i.dataset.tipD='Este mismo bloque aparece en '+larga+' con el mismo color y sello. Haga clic en la tarjeta para resaltarlo en ambos módulos.';
      card.appendChild(i);
    });
    c.querySelectorAll('.kx-sum').forEach(x=>x.remove());
    const t=c.querySelector(':scope>.tit,:scope>.grp>.tit');
    if(t&&pares.size){const s=D.createElement('span');s.className='kx-sum';
      const mu=[...pares].slice(0,4).map(k=>{const e=c.querySelector(`[data-k="${CSS.escape(k)}"]`);return `<b style="background:var(--k);--kl:${e.style.getPropertyValue('--kl')};--kd:${e.style.getPropertyValue('--kd')}" data-k="${k}"></b>`;}).join('');
      s.innerHTML=`<i>${mu}</i>${pares.size} ${pares.size===1?'vinculado':'vinculados'} con ${et}`;
      s.dataset.tip=pares.size+' bloque(s) compartidos';s.dataset.tipE='Identidad cromática';s.dataset.tipD='Los bloques con el mismo color y sello representan la misma entidad en ambos módulos.';
      const sm=t.querySelector('small');t.insertBefore(s,sm||null);}
  });
  if(PIN)fijar(PIN,false);
}

/* ---- Resaltado cruzado ---- */
let PIN=null,HOT=null;
const todos=k=>[...D.querySelectorAll(`#res [data-k="${CSS.escape(k)}"],#resD [data-k="${CSS.escape(k)}"]`)].filter(e=>!e.classList.contains('kx-sum')&&!e.closest('.kx-sum'));
function calentar(k){if(HOT===k)return;D.querySelectorAll('.kx-hot').forEach(e=>e.classList.remove('kx-hot'));HOT=k;
  if(k)todos(k).forEach(e=>{if(!e.classList.contains('kx-det')&&!e.classList.contains('encab'))e.classList.add('kx-hot');});}
function fijar(k,desplazar,origen){
  D.querySelectorAll('.kx-pin').forEach(e=>e.classList.remove('kx-pin'));res.classList.remove('kx-foco');resD.classList.remove('kx-foco');
  PIN=k;if(!k)return;
  const L=todos(k).filter(e=>!e.classList.contains('kx-det'));
  if(!L.length){PIN=null;return;}
  L.forEach(e=>e.classList.add('kx-pin'));
  [res,resD].forEach(c=>{if(c.querySelectorAll('.ic[data-k]:not(.kx-det)').length>1&&L.some(e=>c.contains(e)))c.classList.add('kx-foco');});
  if(desplazar){const otro=origen&&res.contains(origen)?resD:res;const t=L.find(e=>otro.contains(e));
    if(t)t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});}
}
const interactivo=t=>t.closest('button,a,input,select,textarea,label,[data-c],[data-tr],[data-pr],[data-ir],[data-ej],.chip,.kx-link,.imgs img,iframe');
[res,resD].forEach(c=>{
  c.addEventListener('pointerover',e=>{const x=e.target.closest('[data-k]');calentar(x&&c.contains(x)&&!x.classList.contains('kx-det')?x.dataset.k:null);});
  c.addEventListener('pointerleave',()=>calentar(null));
  c.addEventListener('focusin',e=>{const x=e.target.closest('.ic[data-k]');if(x)calentar(x.dataset.k);});
  c.addEventListener('click',e=>{
    const x=e.target.closest('.ic[data-k]');if(!x||x.classList.contains('kx-det')||interactivo(e.target))return;
    if(getSelection&&String(getSelection()).length)return;   /* respeta la selección de texto */
    fijar(PIN===x.dataset.k?null:x.dataset.k,true,x);
  });
  c.addEventListener('keydown',e=>{const x=e.target.matches&&e.target.matches('.ic[data-k]')?e.target:null;
    if(x&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fijar(PIN===x.dataset.k?null:x.dataset.k,true,x);}});
});
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&PIN)fijar(null);});

/* ---- Se aplica tras cada pintado de resultados ---- */
let tmr=0;
function todo(){aplicar(res,'izq');aplicar(resD,'der');guardar();vincular();}
/* Solo se recolorea el módulo que cambió (antes se recalculaban ambos en cada búsqueda) */
const sucios=new Set();
function parcial(){const a=sucios.has(res),b=sucios.has(resD);sucios.clear();if(a)aplicar(res,'izq');if(b)aplicar(resD,'der');guardar();vincular();}
const obs=new MutationObserver(ms=>{ms.forEach(m=>sucios.add(m.target));clearTimeout(tmr);tmr=setTimeout(parcial,0);});
obs.observe(res,{childList:true});obs.observe(resD,{childList:true});
todo();
window.CROMA={reiniciar(){REG={};n=0;guardar();todo();},firma:k=>REG[k]!=null?firma(REG[k]):null};
})();

export {};
