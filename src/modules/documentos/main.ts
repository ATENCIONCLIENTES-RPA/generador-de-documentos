// @ts-nocheck — cuerpo legado del módulo «documentos», extraído sin cambios de lógica desde el HTML original.
// Se ejecuta como módulo ES. El tipado estricto se aplicará de forma progresiva (fase 2).
import '../../styles/fonts.css';
import '../shared/module-embedded.css';
import '../../components/guided-tour/guided-tour.css';
import './documentos.css';
import '../shared/module-bridge';
import { GuidedTour } from '../../components/guided-tour/guided-tour';

/* ---- script 1/1 (orden original del documento) ---- */
const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const DOC = SVG('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>');

/* Registros: exclusivamente filas reales de “SAC Trámite Excel” del DocStore. */
let registros=[];
let sacEstado='empty',sacError='';
const MAX_RECORD_RESULTS=200;
const recordList=document.getElementById('recordList');
const searchInput=document.getElementById('searchInput'),dd=document.getElementById('searchDropdown');
const escRec=t=>String(t==null?'':t).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
/* ---- Rendimiento (v36) ----
   Antes: cada llamada a sacValue() recalculaba la normalización Unicode (NFD + 2 expresiones regulares) de TODAS las
   columnas (~90) por cada dato leído, y el Filtro general leía 6 datos por fila y recorría los registros dos veces
   (buscar el radicado + dibujar la lista filtrada): O(registros × columnas) con coste de normalización por celda.
   Ahora: (1) la normalización de encabezados se memoiza (se repiten en todas las filas), (2) el esquema de columnas se
   resuelve una sola vez por «forma» de fila, (3) lo derivado de cada fila (datos visibles y texto de búsqueda) se calcula
   una vez y se reutiliza, y (4) un índice radicado → registros se construye en segundo plano en cuanto llegan los datos.
   Los resultados (qué filas coinciden, en qué orden y con qué valores) son exactamente los mismos. */
const NORM_CACHE=new Map();
const normKey=k=>{const s=String(k||'');let v=NORM_CACHE.get(s);if(v===undefined){v=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');if(NORM_CACHE.size>4000)NORM_CACHE.clear();NORM_CACHE.set(s,v);}return v;};
let SAC_SCHEMA=null;
function sacSchema(keys){
  const s=SAC_SCHEMA;
  if(s&&s.keys.length===keys.length){let same=true;for(let i=0;i<keys.length;i++){if(s.keys[i]!==keys[i]){same=false;break;}}if(same)return s;}
  const idx=new Map();for(let i=0;i<keys.length;i++){const n=normKey(keys[i]),a=idx.get(n);if(a)a.push(i);else idx.set(n,[i]);}
  return SAC_SCHEMA={keys,idx};
}
/* Lectura única de columnas SAC: coincidencia EXACTA por nombre normalizado, respetando el ORDEN de `names`. */
function sacValue(row,names){
  if(!row)return'';const keys=Object.keys(row),sc=sacSchema(keys);
  for(const name of names){const ix=sc.idx.get(normKey(name));if(!ix)continue;for(let j=0;j<ix.length;j++){const v=row[keys[ix[j]]];if(v!==null&&v!==undefined&&String(v).trim()!=='')return v;}}
  return'';
}
const DISPLAY_CACHE=new WeakMap(),SEARCH_CACHE=new WeakMap();
const isObj=v=>!!v&&typeof v==='object';
function recordDisplay(row){
  const hit=isObj(row)?DISPLAY_CACHE.get(row):undefined;if(hit)return hit;
  const d=Object.freeze({rad:sacValue(row,['RADICADO_ENTRADA']),cuenta:sacValue(row,['NUMERO_CUENTA']),
    nombre:sacValue(row,['NOMBRE_SOLICITANTE','NOMBRE_SUSCRIPTOR','NOMBRE_USUARIO_INICIAL_PROCESO']),
    cc:sacValue(row,['CEDULA_SOLICITANTE']),proceso:sacValue(row,['NUMERO_PROCESO']),
    fechaSolicitud:sacValue(row,['FECHA_SOLICITUD'])});
  if(isObj(row))DISPLAY_CACHE.set(row,d);
  return d;
}
/* Excluye del origen del Filtro general los nombres placeholder formados solo por
   dos o más repeticiones de “anónimo”, sin depender de tildes, espacios o mayúsculas. */
function normalizeRecordName(value){
  return String(value==null?'':value).trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleUpperCase('es-CO');
}
function isAnonymousPlaceholderRecord(row){
  const words=normalizeRecordName(recordDisplay(row).nombre).split(' ').filter(Boolean);
  return words.length>=2&&words.every(word=>word==='ANONIMO');
}
function recordSearchText(row){
  let t=isObj(row)?SEARCH_CACHE.get(row):undefined;if(t!==undefined)return t;
  const d=recordDisplay(row);t=[d.nombre,d.rad,d.cuenta,d.cc,d.proceso].map(v=>String(v||'')).join(' ').toLocaleLowerCase('es-CO');
  if(isObj(row))SEARCH_CACHE.set(row,t);return t;
}
/* Índice radicado → posiciones en `registros` (mismo criterio de coincidencia de siempre: solo dígitos de RADICADO_ENTRADA).
   Se construye por tramos de ~8 ms cediendo el hilo principal entre tramo y tramo, así nunca congela la interfaz; arranca solo
   cuando llegan los datos de SAC y deja además calentadas las cachés de datos visibles y texto de búsqueda. */
const digitsOnly=v=>String(v==null?'':v).replace(/\D/g,'');
const yieldMain=()=>new Promise(r=>{try{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();r();};c.port2.postMessage(0);}catch(e){setTimeout(r,0);}});
let REC_INDEX=null;
function ensureIndex(onProgress){
  const rows=registros;let st=REC_INDEX;
  if(st&&st.ref===rows){if(st.done)return Promise.resolve(st);if(onProgress)st.listeners.add(onProgress);return st.promise;}
  st=REC_INDEX={ref:rows,byRad:new Map(),done:false,listeners:new Set(onProgress?[onProgress]:[]),promise:null,ms:0};
  st.promise=(async()=>{
    const n=rows.length;let i=0;
    while(i<n){
      const t0=performance.now(),stop=t0+8;
      while(i<n&&performance.now()<stop){
        const end=Math.min(n,i+64);
        for(;i<end;i++){const r=rows[i],k=digitsOnly(recordDisplay(r).rad),a=st.byRad.get(k);if(a)a.push(i);else st.byRad.set(k,[i]);recordSearchText(r);}
      }
      st.ms+=performance.now()-t0;
      st.listeners.forEach(f=>{try{f(i/n);}catch(e){}});
      if(REC_INDEX!==st)return st;            /* llegaron otros registros: este índice queda obsoleto */
      if(i<n)await yieldMain();
    }
    st.done=true;st.listeners.clear();return st;
  })();
  return st.promise;
}
function renderRecords(){
  const count=document.getElementById('recordCount');if(count)count.textContent=registros.length.toLocaleString('es-CO');
  const q=searchInput.value.trim().toLocaleLowerCase('es-CO');
  if(!registros.length){
    const msg=sacEstado==='busy'?'Procesando SAC Trámite Excel…':sacEstado==='error'?(sacError||'No fue posible leer SAC Trámite Excel.'):'Carga SAC Trámite Excel en Recursos para consultar trámites reales.';
    recordList.innerHTML=`<div class="empty-state"><span class="es-ic">${DOC}</span><b>Sin datos disponibles</b><span>${escRec(msg)}</span></div>`;return;
  }
  const hits=[];for(let i=0;i<registros.length&&hits.length<MAX_RECORD_RESULTS;i++)if(!q||recordSearchText(registros[i]).includes(q))hits.push(i);
  if(!hits.length){recordList.innerHTML=`<div class="empty-state"><span class="es-ic">${DOC}</span><b>Sin resultados</b><span>Revisa el radicado, la cuenta, el proceso o el solicitante.</span></div>`;return;}
  recordList.innerHTML=hits.map(i=>{const d=recordDisplay(registros[i]);return `<div class="record-item" data-i="${i}">
    <span class="rec-icon">${DOC}</span><span class="rec-body"><span class="rec-name">${escRec(d.nombre||'Sin nombre disponible')}</span>
    <span class="rec-tags"><span class="tag rad">${escRec(d.rad||'Sin radicado')}</span><span class="tag">Cta: ${escRec(d.cuenta||'Sin cuenta')}</span></span>
    ${d.cc?`<span class="rec-sub">C.C. ${escRec(d.cc)}</span>`:''}</span><button class="btn-cargar">Cargar</button></div>`;}).join('')+
    (hits.length===MAX_RECORD_RESULTS?`<div class="empty-state"><span>Mostrando los primeros ${MAX_RECORD_RESULTS.toLocaleString('es-CO')} resultados. Escribe más datos para afinar la búsqueda.</span></div>`:'');
}
const openDD=()=>dd.classList.add('open'),closeDD=()=>dd.classList.remove('open');
searchInput.addEventListener('focus',openDD);
searchInput.addEventListener('input',renderRecords);
['filterToggle','btnCambiar'].forEach(id=>document.getElementById(id).addEventListener('click',()=>{openDD();searchInput.focus();}));
document.addEventListener('click',e=>{if(!e.target.closest('.search-field,.filter-toggle,.active-record'))closeDD();});
recordList.addEventListener('click',e=>{const it=e.target.closest('.record-item');if(!it)return;const r=registros[Number(it.dataset.i)];if(!r)return;const d=recordDisplay(r);document.getElementById('activeRad').textContent=d.rad?`Rad. ${d.rad}`:'Sin radicado';closeDD();});
let ai=-1;
searchInput.addEventListener('keydown',e=>{const items=[...recordList.querySelectorAll('.record-item')];if(e.key==='ArrowDown'){e.preventDefault();ai=Math.min(ai+1,items.length-1);}else if(e.key==='ArrowUp'){e.preventDefault();ai=Math.max(ai-1,0);}else if(e.key==='Enter'){e.preventDefault();items[ai]&&items[ai].click();return;}else return;items.forEach(i=>i.classList.remove('active'));items[ai]&&items[ai].classList.add('active');items[ai]&&items[ai].scrollIntoView({block:'nearest'});});
renderRecords();

/* Colapsables *//* Colapsables */
document.querySelectorAll('[data-toggle]').forEach(h=>h.addEventListener('click',()=>document.getElementById(h.dataset.toggle).classList.toggle('collapsed')));

/* Plantillas
   Origen único: las plantillas cargadas en Recursos (Módulo 1) a través del estado compartido.
   Este módulo NO define nombres: muestra el nombre real de cada archivo y se actualiza solo. */
let plantillas=Object.freeze([]);   /* vista de solo lectura de AD.store.getTemplates() */
let plEstado='empty', plError='';   /* empty | busy | error | ready (estado del recurso en Recursos) */
let asignada=null,page=0,filtered=[];const PS=14;
const pl=document.getElementById('plantillaList');
const CHECK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>`;
const escPl=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function filtrarPl(){
  const q=document.getElementById('plantillaSearch').value.toLowerCase().trim();
  filtered=plantillas.map((t,i)=>i).filter(i=>(plantillas[i].title+' '+plantillas[i].fileName).toLowerCase().includes(q));
}
function renderPl(){
  const tp=Math.max(1,Math.ceil(filtered.length/PS));page=Math.min(page,tp-1);
  pl.innerHTML=filtered.slice(page*PS,page*PS+PS).map(i=>{const t=plantillas[i];return `
    <div class="plantilla-item ${t.id===asignada?'active':''}" data-i="${i}" data-id="${escPl(t.id)}" data-file="${escPl(t.fileName)}">
      <span class="pl-icon">${DOC}</span>
      <span class="pl-text"><span class="pl-name">${escPl(t.title)}</span></span>
      <span class="check-circ">${CHECK}</span>
    </div>`;}).join('');
  document.getElementById('pagLabel').textContent=`${page+1} / ${tp}`;
  if(window.__AD_SYNC_SELECTION_GUIDE)window.__AD_SYNC_SELECTION_GUIDE();
}
renderPl();
document.getElementById('plantillaSearch').addEventListener('input',()=>{filtrarPl();page=0;renderPl();});
pl.addEventListener('click',e=>{const it=e.target.closest('.plantilla-item');if(!it)return;asignada=it.dataset.id;renderPl();});
document.getElementById('pagPrev').onclick=()=>{page=Math.max(0,page-1);renderPl();};
document.getElementById('pagNext').onclick=()=>{page++;renderPl();};

/* Switch */
const slider=document.getElementById('switchSlider'),sbtns=[...document.querySelectorAll('.tab-switch-btn')];
sbtns.forEach((b,i)=>b.addEventListener('click',()=>{sbtns.forEach(x=>x.classList.remove('active'));b.classList.add('active');slider.classList.toggle('pos-1',i===1);}));

/* Generar documento: controlador DOCX real al final de este módulo. */
const bg=document.getElementById('btnGenerar');

/* Descripciones */
const STAR=`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9.8 8.3 3 10l6.8 2.3L12 19l2.3-6.7L21 10l-6.8-1.7L12 2Z"/></svg>`;
/* Fuente única del mapeo “Descripciones del documento”: campo (id) ← columna SAC (col) → marcadores Word (tokens). */
const descs=[
  {t:'tipo-solicitud',n:'01',id:'descSolicitud',col:'OBSERVACION_PROCESO',tokens:['DESCRIPCION_SOLICITUD','OBSERVACION_PROCESO'],title:'Descripción de la solicitud',hint:'Qué pide el cliente',ph:'Describa brevemente la solicitud del cliente…',ic:SVG('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>')},
  {t:'tipo-insumo',n:'02',id:'descInsumo',col:'OBSERVACION_REVISION',tokens:['OBSERVACION_REVISION'],title:'Observación del insumo',hint:'Hallazgos de la revisión',ph:'Observaciones de revisión (OBSERVACION_REVISION)…',ic:SVG('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>')},
  {t:'tipo-decision',n:'03',id:'descDecision',col:'OBSERVACION_DECISION',tokens:['OBSERVACION_DECISION'],title:'Observación de la decisión',hint:'Resultado y justificación',ph:'Observaciones de la decisión (OBSERVACION_DECISION)…',ic:SVG('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>')}
];
descs.forEach(d=>Object.freeze(d.tokens)&&Object.freeze(d));Object.freeze(descs);
document.getElementById('descBody').innerHTML=descs.map(d=>`
  <div class="desc-block ${d.t}">
    <div class="desc-block-head">
      <span class="desc-ic">${d.ic}</span>
      <div class="desc-titles"><label for="${d.id}">${d.title}</label><span class="desc-hint">${d.hint}</span></div>
      <span class="desc-step">${d.n}</span>
    </div>
    <textarea id="${d.id}" placeholder="${d.ph}"></textarea>
    <div class="desc-foot"><button class="btn-mejorar">${STAR}Mejorar texto</button></div>
  </div>`).join('');
document.querySelectorAll('.btn-mejorar').forEach(m=>{m.addEventListener('click',()=>{m.classList.add('spin');setTimeout(()=>m.classList.remove('spin'),800);});});

/* ===================== GUÍA / TOUR INTERACTIVO ===================== */
/* Guía rápida: el motor (overlay, posicionamiento, navegación) vive en el componente
   compartido GuidedTour (guided-tour.js); aquí solo se define el contenido de esta guía. */
const ICN = GuidedTour.ICN;
const tourSteps = [
  {sel:'.brand', ic:ICN.wave,
   title:'¡Hola! Bienvenido 👋',
   text:'Este es el módulo donde armas y generas tus documentos de respuesta. Te voy a mostrar rapidito cómo funciona cada parte, ¡toma solo un minuto!'},
  {sel:'.searchbar', ic:ICN.search,
   title:'Busca tu caso aquí',
   text:'Con "Filtro general" puedes afinar la búsqueda, y en la barra escribes el radicado, la cuenta o el nombre del solicitante para encontrar el caso que necesitas. A la derecha siempre ves cuál registro tienes activo.'},
  {sel:'#panelSolicitante', ic:ICN.user,
   title:'Datos del solicitante',
   text:'Aquí van los datos de la persona o entidad a la que le vas a responder: nombre, dirección, correo, etc. Fíjate que el campo "Radicado de salida" está resaltado en naranja porque se llena solo cuando radicas.'},
  {sel:'#panelPlantillas', ic:ICN.list,
   title:'Elige una plantilla',
   text:'Acá tienes todo el catálogo de plantillas disponibles. Usa el buscador para encontrar la tuya rapidito, y haz clic sobre una para dejarla seleccionada (se marca con una franja azul y un check).'},
  {sel:'.tabs-switch', ic:ICN.switch,
   title:'Cambia de vista',
   text:'Con este interruptor te mueves entre ver el "Diseño de plantilla" (cómo luce en blanco) o el "Documento generado" (ya con los datos del caso aplicados). Así comparas fácil antes de enviar.'},
  {resolve:()=>document.querySelector('#previewHost')||document.querySelector('.doc-stage'),
   ic:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
   title:'Vista previa del documento',
   text:'Aquí ves cómo va a quedar el documento antes de generarlo. Los datos del solicitante que vas escribiendo se actualizan en vivo, y lo que aún falta por llenar aparece en gris cursiva. Revísalo con calma: lo que ves es lo que se genera.'},
  {sel:'#btnGenerar', ic:ICN.doc,
   title:'Descarga tu documento',
   text:'El documento se genera automáticamente al seleccionar la plantilla y el trámite. Cuando la vista previa esté lista, usa este botón para descargar exactamente ese DOCX final.'},
  {sel:'.desc-panel', ic:ICN.edit,
   title:'Cuenta la historia del caso',
   text:'En estas tres tarjetas describes qué pidió el cliente, qué encontraste al revisar y cuál fue la decisión. El botón "Mejorar texto" te ayuda a dejar la redacción más clara en un clic.'},
  {sel:'.btn-guide', ic:ICN.check,
   title:'¡Listo, ya sabes lo esencial! 🎉',
   text:'Puedes volver a ver esta guía cuando quieras dándole clic a este mismo botón. ¡Ahora sí, manos a la obra con tus radicados!'}
];

/* El motor de posicionamiento, overlay, navegación por teclado y accesibilidad
   vive una sola vez en GuidedTour.mount() (guided-tour.js); aquí solo se registran
   los pasos de ESTA guía. mount() además apaga el "pulse-dot" del botón al abrir
   y conecta automáticamente el clic en #btnGuide. */
GuidedTour.mount(tourSteps);

/* ===================== MODO OSCURO / CLARO ===================== */
const SUN = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
const MOON = '<path d="M20.5 14.2a8.5 8.5 0 1 1-9.7-11.7 7 7 0 0 0 9.7 11.7Z"/>';
const ttKnob = document.getElementById('ttKnob');
const themeToggle = document.getElementById('themeToggle');
function applyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  ttKnob.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${mode==='dark'?MOON:SUN}</svg>`;
  themeToggle.title = mode==='dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  try{ localStorage.setItem('essa-theme', mode); }catch(e){}
}
let savedTheme='light';
try{ savedTheme = localStorage.getItem('essa-theme') || 'light'; }catch(e){}
applyTheme(savedTheme);
themeToggle.addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur==='dark' ? 'light' : 'dark');
});
/* ===================== CELEBRACIÓN ===================== */
/* Title Case para los campos Nombre, Dirección, Departamento y Municipio del bloque
   "Información del solicitante". Solo cambia mayúsculas/minúsculas: números, #, -, /,
   puntos, tildes y espacios internos se conservan. En palabras con dígitos (27A, 45B, 301B)
   las letras quedan en mayúscula para no alterar la nomenclatura de la dirección. */
const CAMPOS_TITULO=[0,2,3,4];
/* Correo electrónico (6.º campo del bloque): SIEMPRE en minúsculas, venga de SAC Trámite, de lo que escriba o pegue el usuario
   o del respaldo de columnas. Una sola función alimenta los tres lugares: el campo del bloque, la vista en vivo y el marcador
   [CORREO_SOLICITANTE] del Word, de modo que los tres usan exactamente el mismo valor. */
const IDX_CORREO=5;
const correoMin=v=>String(v==null?'':v).toLowerCase();
function formatoTitulo(v){
  const t=String(v==null?'':v).trim().replace(/\s+/g,' ');
  if(!t)return'';
  return t.split(' ').map(w=>{
    if(/\d/.test(w))return w.toLocaleUpperCase('es-CO');
    return w.toLocaleLowerCase('es-CO').replace(/(^|[-\/(.'"])(\p{L})/gu,(m,p,c)=>p+c.toLocaleUpperCase('es-CO'));
  }).join(' ');
}

(function(){
  const cv=document.createElement('canvas');cv.id='confettiCanvas';document.body.appendChild(cv);
  const ctx=cv.getContext('2d');
  const toast=document.createElement('div');toast.className='gen-toast';
  toast.innerHTML='<span class="gt-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span><div><div class="gt-title">¡Documento generado con éxito!</div><div class="gt-sub">Tu documento está listo para revisar.</div></div><span class="gt-bar"><i></i></span>';
  document.body.appendChild(toast);
  const COLORS=['#1664B0','#60A5FA','#BFDBFE','#D21624','#F3C3C7','#DCCFBA','#1E40AF'];
  let parts=[],raf=null,toastT=null;
  function resize(){const d=window.devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0);}
  resize();addEventListener('resize',resize);
  function burst(x,y){
    for(let i=0;i<70;i++){
      const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.1, v=5+Math.random()*7;
      parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,w:5+Math.random()*5,h:3+Math.random()*4,
        r:Math.random()*6.28,vr:(Math.random()-.5)*.3,c:COLORS[i%COLORS.length],
        s:Math.random()<.3?'c':'r',life:0,max:110+Math.random()*50,tilt:Math.random()*6.28});
    }
  }
  function tick(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    parts=parts.filter(p=>p.life<p.max);
    parts.forEach(p=>{
      p.life++;p.vx*=.97;p.vy=p.vy*.97+.22;p.x+=p.vx+Math.sin(p.tilt+=.08)*.6;p.y+=p.vy;p.r+=p.vr;
      ctx.save();ctx.globalAlpha=Math.max(0,1-p.life/p.max)*.95;ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;
      if(p.s==='c'){ctx.beginPath();ctx.arc(0,0,p.h*.7,0,6.28);ctx.fill();}
      else ctx.fillRect(-p.w/2,-p.h/2*Math.abs(Math.cos(p.tilt)),p.w,p.h*Math.abs(Math.cos(p.tilt))+.5);
      ctx.restore();
    });
    raf=parts.length?requestAnimationFrame(tick):null;
  }
  window.celebrate=function(){
    const r=document.getElementById('btnGenerar').getBoundingClientRect();
    burst(r.left+r.width/2,r.top+r.height/2);
    if(!raf)raf=requestAnimationFrame(tick);
    toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');
    clearTimeout(toastT);toastT=setTimeout(()=>toast.classList.remove('show'),3000);
  };
})();
/* ===================== MAGIA · TEXTO DE RADICACIÓN =====================
   Solo presentación: destellos del botón hacia el documento, barrido de luz y aviso (éxito/advertencia/error). */
(function(){
  const cv=document.createElement('canvas');cv.id='magicCanvas';document.body.appendChild(cv);
  const ctx=cv.getContext('2d');
  const toast=document.createElement('div');toast.className='gen-toast tr-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  toast.innerHTML='<span class="gt-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span><div><div class="gt-title"></div><div class="gt-sub"></div></div><span class="gt-bar"><i></i></span>';
  document.body.appendChild(toast);
  const ICON={ok:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',warn:'<path d="M12 8v5M12 16.5h.01"/>',error:'<path d="M15 9l-6 6M9 9l6 6"/>'};
  const COLORS=['#A78BFA','#7C5CE0','#60A5FA','#1664B0','#FFFFFF','#FDE68A'];
  let parts=[],raf=null,toastT=null;
  function resize(){const d=window.devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0);}
  resize();addEventListener('resize',resize);
  function star(x,y,r,rot){ctx.beginPath();for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,rr=i%2?r*.38:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();ctx.fill();}
  function spawn(from,to){
    for(let i=0;i<46;i++){const t=i/46;parts.push({kind:'trail',x:from.x,y:from.y,sx:from.x,sy:from.y,tx:to.x+(Math.random()-.5)*to.w*.7,ty:to.y+(Math.random()-.5)*Math.min(260,to.h*.5),
        cx:(from.x+to.x)/2+(Math.random()-.5)*240,cy:Math.min(from.y,to.y)-60-Math.random()*120,delay:t*22,life:0,max:62+Math.random()*18,
        r:1.8+Math.random()*3.2,c:COLORS[i%COLORS.length],rot:Math.random()*6.28});}
    for(let i=0;i<34;i++){const a=Math.random()*6.28,v=1.2+Math.random()*3.2;
      parts.push({kind:'burst',x:from.x,y:from.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:40+Math.random()*25,r:1.5+Math.random()*3,c:COLORS[(i+2)%COLORS.length],rot:Math.random()*6.28});}
  }
  function tick(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    parts=parts.filter(p=>p.life<p.max+(p.delay||0));
    parts.forEach(p=>{
      p.life++;p.rot+=.12;let alpha,x,y;
      if(p.kind==='trail'){const k=(p.life-p.delay)/p.max;if(k<0)return;const e=1-Math.pow(1-Math.min(1,k),3);
        x=(1-e)*(1-e)*p.sx+2*(1-e)*e*p.cx+e*e*p.tx;y=(1-e)*(1-e)*p.sy+2*(1-e)*e*p.cy+e*e*p.ty;alpha=k<.15?k/.15:1-Math.max(0,(k-.7)/.3);}
      else{p.vx*=.95;p.vy=p.vy*.95+.03;p.x+=p.vx;p.y+=p.vy;x=p.x;y=p.y;alpha=1-p.life/p.max;}
      ctx.save();ctx.globalAlpha=Math.max(0,alpha);ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=10;star(x,y,p.r*1.6,p.rot);ctx.restore();
    });
    raf=parts.length?requestAnimationFrame(tick):null;
  }
  function show(kind,title,sub){
    toast.classList.toggle('is-warn',kind==='warn');toast.classList.toggle('is-error',kind==='error');
    toast.querySelector('.gt-ic svg').innerHTML=ICON[kind]||ICON.ok;
    toast.querySelector('.gt-title').textContent=title;toast.querySelector('.gt-sub').textContent=sub||'';
    toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');
    clearTimeout(toastT);toastT=setTimeout(()=>toast.classList.remove('show'),kind==='error'?5200:3400);
  }
  window.radicacionMagic={
    success(sub){
      const b=document.getElementById('btnTextoRad').getBoundingClientRect(),host=document.getElementById('previewHost'),h=host.getBoundingClientRect();
      const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(!reduce){spawn({x:b.left+b.width/2,y:b.top+b.height/2},{x:h.left+h.width/2,y:h.top+Math.min(h.height,700)/2,w:h.width,h:Math.min(h.height,700)});if(!raf)raf=requestAnimationFrame(tick);}
      setTimeout(()=>{host.classList.remove('tr-shine');void host.offsetWidth;host.classList.add('tr-shine');setTimeout(()=>host.classList.remove('tr-shine'),1200);},reduce?0:700);
      show('ok','Texto de radicación agregado correctamente',sub);
    },
    warn(title,sub){show('warn',title,sub);},
    error(title,sub){show('error',title,sub);}
  };
})();
/* ===================== CAPA UX SENIOR ===================== */
(function(){
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const hl=(t,q)=>{t=esc(t);if(!q)return t;const i=t.toLowerCase().indexOf(q.toLowerCase());return i<0?t:t.slice(0,i)+'<mark class="hl">'+t.slice(i,i+q.length)+'</mark>'+t.slice(i+q.length);};
  const ICS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  const IX='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /* --- Accesibilidad: etiquetas en botones de solo icono --- */
  $('#pagPrev').setAttribute('aria-label','Página anterior');
  $('#pagNext').setAttribute('aria-label','Página siguiente');
  $('#themeToggle').setAttribute('aria-label','Cambiar tema claro u oscuro');
  $('#searchInput').setAttribute('aria-label','Buscar registro');
  $('#plantillaSearch').setAttribute('aria-label','Buscar plantilla');
  $$('.tab-switch-btn').forEach(b=>b.setAttribute('role','tab'));

  /* --- Encabezados: pasos del flujo + subtítulos --- */
  const addHead=(panelSel,n,sub)=>{const p=$(panelSel);if(!p)return;const t=p.querySelector('.panel-title');if(!t)return;
    t.insertAdjacentHTML('beforebegin',`<span class="flow-step">${n}</span>`);
    const w=document.createElement('span');t.parentNode.insertBefore(w,t);w.appendChild(t);w.insertAdjacentHTML('beforeend',`<span class="panel-sub">${sub}</span>`);
    const c=w.nextElementSibling;if(c&&c.classList.contains('panel-count')){t.appendChild(c);} };
  addHead('#panelSolicitante',1,'Datos de destino de la respuesta');
  addHead('#panelPlantillas',2,'Selecciona el tipo de respuesta');
  addHead('.desc-panel',3,'Contexto que alimenta el documento');

  /* --- Completitud del solicitante + vista previa en vivo --- */
  const head=$('#panelSolicitante .panel-head > div:last-child');
  head.insertAdjacentHTML('afterbegin','<span class="completion" id="compl"><span class="bar"><i></i></span><span id="complTxt">0 de 5</span></span>');
  const inputs=$$('#panelSolicitante .field:not(.field-radicado) input');
  const rec=$('.paper-recipient');
  rec.innerHTML='<div class="name">Señor(a)</div><div class="dyn" data-k="0"></div><div class="dyn" data-k="2"></div><div class="dyn" data-k="mun"></div><div><a href="#" class="dyn" data-k="5"></a></div>';
  const all=$$('#panelSolicitante .field input');
  /* Correo en minúsculas mientras se escribe/pega: el oyente de captura del panel corre antes que la vista en vivo
     (sync) y que la regeneración del documento, así que ambos ya reciben el valor normalizado. Se conserva el cursor. */
  const correoEl=all[IDX_CORREO];
  if(correoEl){
    const fuerzaMin=()=>{const v=correoEl.value,m=correoMin(v);if(v===m)return;
      const a=correoEl.selectionStart,z=correoEl.selectionEnd;correoEl.value=m;
      try{if(a!=null)correoEl.setSelectionRange(a,z);}catch(e){}};
    $('#panelSolicitante').addEventListener('input',e=>{if(e.target===correoEl)fuerzaMin();},true);
    correoEl.addEventListener('change',fuerzaMin);
  }
  const PH=['Nombre del solicitante','','Dirección de notificación','','','correo@ejemplo.com'];
  function sync(changed){
    const v=all.map(i=>i.value.trim());
    const set=(k,txt,ph)=>{const el=rec.querySelector(`[data-k="${k}"]`);el.textContent=txt||ph;el.classList.toggle('empty',!txt);
      if(changed!==undefined&&(String(changed)===String(k)||(k==='mun'&&(changed==3||changed==4)))){el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),500);}};
    set(0,v[0],PH[0]);set(2,v[2],PH[2]);set(5,correoMin(v[5]),PH[5]);
    set('mun',[v[4],v[3]].filter(Boolean).join(', '),'Municipio, Departamento');
    all.forEach(i=>i.classList.toggle('filled',!!i.value.trim()));
    const n=inputs.filter(i=>i.value.trim()).length;
    $('#compl .bar i').style.width=(n/inputs.length*100)+'%';
    $('#complTxt').textContent=n===inputs.length?'Completo':`${n} de ${inputs.length}`;
    $('#compl').classList.toggle('full',n===inputs.length);
  }
  all.forEach((i,k)=>i.addEventListener('input',()=>sync(k)));
  $$('#panelSolicitante .field input').forEach(i=>i.addEventListener('click',e=>e.stopPropagation()));
  /* al salir de Nombre, Dirección, Departamento o Municipio se aplica Title Case (mismo formato que al cargar el registro) */
  all.forEach((i,k)=>{ if(!CAMPOS_TITULO.includes(k))return;
    i.addEventListener('change',()=>{const f=formatoTitulo(i.value);
      if(f && f!==i.value){i.value=f;i.dispatchEvent(new Event('input',{bubbles:true}));}}); });
  sync();

  /* --- Plantillas: nombre completo, vacío y paginación --- */
  const psInput=$('#plantillaSearch'),psWrap=$('.plantilla-search');
  psWrap.insertAdjacentHTML('beforeend',`<button class="ps-clear" type="button" aria-label="Limpiar búsqueda">${IX}</button><kbd class="kb">/</kbd>`);
  const enhancePl=()=>{
    const q=psInput.value.trim();
    $$('#plantillaList .plantilla-item').forEach(it=>{
      it.tabIndex=0;it.setAttribute('role','option');it.setAttribute('aria-selected',it.classList.contains('active'));
      const nm=it.querySelector('.pl-name');if(nm.dataset.done)return;
      const full=nm.textContent;
      nm.dataset.done=1;nm.innerHTML=hl(full,q);
      it.title=it.dataset.file||full;
    });
    const list=$('#plantillaList');
    const sinPl=!plantillas.length;
    psInput.disabled=sinPl; psWrap.classList.toggle('is-disabled',sinPl);
    if(!list.children.length){
      if(sinPl){ list.innerHTML=plEstado==='busy'
          ?`<div class="empty-state pl-empty"><span class="es-ic"><i class="pl-spin"></i></span><b>Cargando plantillas…</b><span>Se están preparando las plantillas cargadas en Recursos.</span></div>`
          :plEstado==='error'
          ?`<div class="empty-state pl-empty is-err"><span class="es-ic">${DOC}</span><b>No se pudieron cargar las plantillas</b><span>${esc(plError||'Revisa la carpeta de plantillas en Recursos.')}</span><button type="button" data-ad-nav="recursos">Ir a Recursos</button></div>`
          :`<div class="empty-state pl-empty"><span class="es-ic">${DOC}</span><b>Aún no hay plantillas</b><span>Carga tu carpeta de plantillas Word en Recursos. Sus nombres aparecerán aquí automáticamente.</span><button type="button" data-ad-nav="recursos">Ir a Recursos</button></div>`; }
      else{ list.innerHTML=`<div class="empty-state"><span class="es-ic">${ICS}</span><b>Sin coincidencias</b><span>No encontramos plantillas para “${esc(q)}”. Prueba con otra palabra.</span><button type="button" id="plReset">Limpiar búsqueda</button></div>`;
      $('#plReset').onclick=()=>{psInput.value='';psInput.dispatchEvent(new Event('input'));psInput.focus();}; } }
    const [a,b]=$('#pagLabel').textContent.split('/').map(s=>+s.trim());
    $('#pagPrev').disabled=a<=1;$('#pagNext').disabled=a>=b;
    $('.panel-count').textContent=list.querySelector('.plantilla-item')?(q?filtered.length:plantillas.length):0;
  };
  new MutationObserver(enhancePl).observe($('#plantillaList'),{childList:true});
  enhancePl();
  psInput.addEventListener('input',()=>{psWrap.classList.toggle('has-value',!!psInput.value);});
  psWrap.querySelector('.ps-clear').onclick=()=>{psInput.value='';psInput.dispatchEvent(new Event('input'));psInput.focus();};
  $('#plantillaList').addEventListener('keydown',e=>{
    const it=e.target.closest('.plantilla-item');if(!it)return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();const i=it.dataset.i;it.click();const n=$(`#plantillaList .plantilla-item[data-i="${i}"]`);n&&n.focus();}
    if(e.key==='ArrowDown'){e.preventDefault();(it.nextElementSibling||it).focus();}
    if(e.key==='ArrowUp'){e.preventDefault();(it.previousElementSibling||it).focus();}
  });

  /* --- Buscador de registros: el filtrado real vive en renderRecords() --- */
  const sIn=$('#searchInput');
  $('.search-field').insertAdjacentHTML('beforeend','<kbd class="kb">Ctrl K</kbd>');

  /* --- Atajos de teclado --- */
  document.addEventListener('keydown',e=>{
    const typing=/INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();sIn.focus();sIn.select();}
    else if(e.key==='/'&&!typing){e.preventDefault();psInput.focus();}
    else if(e.key==='Escape'){
      if($('#tourOverlay').classList.contains('open'))$('#tourSkip').click();
      else{$('#searchDropdown').classList.remove('open');if(typing)document.activeElement.blur();}
    }
  });

  /* --- Descripciones: marcar paso completado --- */
  $$('.desc-block textarea').forEach(t=>t.addEventListener('input',()=>t.closest('.desc-block').classList.toggle('done',!!t.value.trim())));

  /* --- Aviso accesible del resultado --- */
  const toast=$('.gen-toast');if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');}
})();
/* ===================== GUÍA UNIFICADA DE SELECCIÓN ===================== */
(function(){
  const stage=document.querySelector('.doc-stage'),host=document.getElementById('previewHost'),bar=document.querySelector('.searchbar');
  const ar=document.querySelector('.active-record'),rad=document.getElementById('activeRad'),btnC=document.getElementById('btnCambiar');
  const gen=document.getElementById('btnGenerar'),sIn=document.getElementById('searchInput'),plInput=document.getElementById('plantillaSearch');
  const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
  const templateIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';
  const checkIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const arrowIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  stage.insertAdjacentHTML('afterbegin',`
  <section class="selection-guide" id="selectionGuide" role="status" aria-live="polite" aria-labelledby="sgTitle">
    <div class="sg-layout">
      <div class="sg-visual" aria-hidden="true">
        <div class="sg-art">
          <span class="sg-art-main"><svg viewBox="0 0 96 112" fill="none"><path d="M20 5h39l22 22v72a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8V13a8 8 0 0 1 8-8Z" fill="url(#sgDoc)" stroke="currentColor" stroke-width="2"/><path d="M59 5v17a5 5 0 0 0 5 5h17" fill="#DCEBFB" stroke="currentColor" stroke-width="2"/><path d="M28 46h38M28 59h38M28 72h28" stroke="#9FC2EE" stroke-width="5" stroke-linecap="round"/><path d="m31 90 7 7 16-18" stroke="#D21624" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="sgDoc" x1="12" y1="5" x2="83" y2="107"><stop stop-color="#fff"/><stop offset="1" stop-color="#EAF2FC"/></linearGradient></defs></svg></span>
          <span class="sg-art-chip search">${searchIcon}</span>
          <span class="sg-art-chip template">${templateIcon}</span>
        </div>
        <span class="sg-visual-note">Flujo documental ESSA</span>
      </div>
      <div class="sg-content">
        <span class="sg-badge"><span class="dot"></span><span id="sgBadgeText">Preparando tu respuesta</span></span>
        <h3 class="sg-title" id="sgTitle">Todo listo para <span>empezar</span></h3>
        <p class="sg-text" id="sgText">Busca un trámite y elige la plantilla que usarás. La vista previa se generará automáticamente cuando ambas selecciones estén listas.</p>
        <div class="sg-checklist" aria-label="Selecciones necesarias">
          <div class="sg-item current" id="sgRecordItem">
            <span class="sg-item-icon">${searchIcon}</span>
            <span class="sg-item-copy"><b>Trámite o registro</b><span id="sgRecordCopy">Busca por radicado, cuenta, proceso o solicitante.</span></span>
            <span class="sg-item-status" id="sgRecordStatus">Pendiente</span>
          </div>
          <div class="sg-item" id="sgTemplateItem">
            <span class="sg-item-icon">${templateIcon}</span>
            <span class="sg-item-copy"><b>Plantilla de respuesta</b><span id="sgTemplateCopy">Se carga desde Módulo 1 · Recursos y aparece aquí automáticamente.</span></span>
            <span class="sg-item-status" id="sgTemplateStatus">Pendiente</span>
          </div>
        </div>
        <div class="sg-actions">
          <button type="button" class="sg-primary" id="sgPrimary"><span class="sg-btn-icon">${searchIcon}</span><span id="sgPrimaryLabel">Buscar registro</span></button>
          <button type="button" class="sg-secondary" id="sgResources">Gestionar plantillas en Recursos ${arrowIcon}</button>
          <span class="sg-hint" id="sgHint">También puedes presionar <kbd>Ctrl</kbd> + <kbd>K</kbd></span>
        </div>
      </div>
    </div>
    <div class="sg-progress" aria-label="Progreso de generación">
      <span class="sg-step current" data-step="record"><span class="sg-step-num">1</span><span class="sg-step-label">Busca</span></span><i class="sg-connector" data-after="record"></i>
      <span class="sg-step" data-step="template"><span class="sg-step-num">2</span><span class="sg-step-label">Elige plantilla</span></span><i class="sg-connector" data-after="template"></i>
      <span class="sg-step" data-step="generate"><span class="sg-step-num">3</span><span class="sg-step-label">Genera</span></span>
    </div>
  </section>`);

  const guide=document.getElementById('selectionGuide'),badge=document.getElementById('sgBadgeText'),title=document.getElementById('sgTitle'),text=document.getElementById('sgText');
  const recItem=document.getElementById('sgRecordItem'),tplItem=document.getElementById('sgTemplateItem');
  const recCopy=document.getElementById('sgRecordCopy'),tplCopy=document.getElementById('sgTemplateCopy');
  const recStatus=document.getElementById('sgRecordStatus'),tplStatus=document.getElementById('sgTemplateStatus');
  const primary=document.getElementById('sgPrimary'),primaryLabel=document.getElementById('sgPrimaryLabel'),primaryIcon=primary.querySelector('.sg-btn-icon');
  const resources=document.getElementById('sgResources'),hint=document.getElementById('sgHint');
  let hasRecord=false,currentRecord=null,primaryAction='record';

  const setItem=(el,on,current,status)=>{el.classList.toggle('done',on);el.classList.toggle('current',!on&&current);status.innerHTML=on?checkIcon+' Lista':'Pendiente';};
  const setStep=(name,state)=>{const el=guide.querySelector(`[data-step="${name}"]`);if(!el)return;el.classList.toggle('done',state==='done');el.classList.toggle('current',state==='current');};
  const openSearch=()=>{sIn.focus();sIn.select();document.getElementById('searchDropdown').classList.add('open');bar.scrollIntoView({block:'nearest',behavior:'smooth'});};
  const openTemplates=()=>{const panel=document.getElementById('panelPlantillas');panel.scrollIntoView({block:'center',behavior:'smooth'});setTimeout(()=>{if(!plInput.disabled){plInput.focus();plInput.select();}},320);};
  const goResources=()=>{if(window.AD&&typeof AD.navigate==='function')AD.navigate('recursos');};

  function syncGuide(){
    const meta=plantillas.find(t=>t.id===asignada)||null,hasTemplate=!!meta,waiting=!(hasRecord&&hasTemplate);
    stage.classList.toggle('awaiting-selection',waiting);stage.classList.toggle('no-record',!hasRecord);stage.classList.toggle('has-template',hasTemplate);
    guide.hidden=!waiting;guide.setAttribute('aria-hidden',String(!waiting));
    setItem(recItem,hasRecord,!hasRecord,recStatus);setItem(tplItem,hasTemplate,hasRecord&&!hasTemplate,tplStatus);
    const d=hasRecord?recordDisplay(currentRecord):null;
    recCopy.textContent=hasRecord?(d.rad?'Rad. '+d.rad+' seleccionado':(d.proceso?'Proceso '+d.proceso+' seleccionado':'Registro seleccionado')):'Busca por radicado, cuenta, proceso o solicitante.';
    tplCopy.textContent=hasTemplate?(meta.title||meta.fileName||'Plantilla seleccionada'):'Se carga desde Módulo 1 · Recursos y aparece aquí automáticamente.';
    setStep('record',hasRecord?'done':'current');setStep('template',hasTemplate?'done':(hasRecord?'current':'pending'));setStep('generate','pending');
    guide.querySelector('[data-after="record"]').classList.toggle('done',hasRecord);
    guide.querySelector('[data-after="template"]').classList.toggle('done',hasRecord&&hasTemplate);
    if(!waiting)return;
    if(!hasRecord&&!hasTemplate){
      badge.textContent='Esperando selecciones';title.innerHTML='Prepara tu <span>respuesta documental</span>';
      text.textContent='Busca el trámite que vas a responder y elige una plantilla. Al completar ambos pasos, el documento se procesará automáticamente en tu navegador.';
      primaryAction='record';primaryLabel.textContent='Buscar registro';primaryIcon.innerHTML=searchIcon;hint.hidden=false;resources.hidden=false;
    }else if(!hasRecord){
      badge.textContent='Plantilla lista';title.innerHTML='Ahora selecciona el <span>trámite</span>';
      text.textContent='La plantilla ya está preparada. Busca el radicado o registro correspondiente para generar la respuesta con sus datos reales.';
      primaryAction='record';primaryLabel.textContent='Buscar registro';primaryIcon.innerHTML=searchIcon;hint.hidden=false;resources.hidden=true;
    }else{
      badge.textContent='Registro listo';title.innerHTML='Elige la <span>plantilla de respuesta</span>';
      text.textContent='El trámite ya está seleccionado. Elige una plantilla de la lista; las cargadas en Recursos aparecen aquí automáticamente.';
      const needsResources=!plantillas.length&&plEstado!=='busy';primaryAction=needsResources?'resources':'template';primaryLabel.textContent=needsResources?'Cargar plantillas en Recursos':'Elegir plantilla';primaryIcon.innerHTML=templateIcon;hint.hidden=true;resources.hidden=needsResources;
    }
    gen.classList.add('locked');gen.title=!hasRecord?'Primero busca un registro':'Selecciona una plantilla para continuar';
  }

  function setState(r){
    hasRecord=!!r;currentRecord=r||null;window.__AD_ACTIVE_RECORD=currentRecord;
    window.dispatchEvent(new CustomEvent('ad-record-change',{detail:currentRecord}));
    ar.classList.toggle('empty',!hasRecord);btnC.textContent=hasRecord?'Cambiar':'Buscar';
    if(!hasRecord){rad.textContent='Ningún registro';syncGuide();return;}
    const d=recordDisplay(r);rad.textContent=d.rad?`Rad. ${d.rad}`:'Sin radicado';
    const subj=document.querySelector('.paper-subject'),asunto=['Asunto: Respuesta al radicado número '+(d.rad||''),d.cuenta?'Cuenta '+d.cuenta:'',d.proceso?'ID Proceso No. '+d.proceso:''].filter(Boolean);if(subj)subj.textContent=asunto.join(' · ');
    syncGuide();
  }
  window.__AD_SET_RECORD=setState;window.__AD_SYNC_SELECTION_GUIDE=syncGuide;
  primary.addEventListener('click',e=>{e.stopPropagation();if(primaryAction==='record')openSearch();else if(primaryAction==='resources')goResources();else openTemplates();});
  resources.addEventListener('click',goResources);
  document.getElementById('recordList').addEventListener('click',e=>{const it=e.target.closest('.record-item');if(it)setState(registros[it.dataset.i]);});
  document.getElementById('plantillaList').addEventListener('click',e=>{if(e.target.closest('.plantilla-item'))requestAnimationFrame(syncGuide);});
  document.addEventListener('click',e=>{
    if(e.target.closest('#btnGenerar')&&!(hasRecord&&asignada)){e.stopPropagation();e.preventDefault();
      if(!hasRecord){bar.classList.remove('nudge');void bar.offsetWidth;bar.classList.add('nudge');openSearch();}else openTemplates();}
  },true);
  setState(null);
})();

/* ===================== OPTIMIZACIÓN DE RENDIMIENTO ===================== */
(function(){
  // Pausa animaciones cuando la pestaña está en segundo plano
  document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('is-idle',document.hidden));
  // Pausa el letrero animado cuando no está en pantalla
  const card=document.querySelector('.selection-guide');
  if(card&&'IntersectionObserver' in window){
    new IntersectionObserver(es=>es.forEach(e=>card.classList.toggle('offscreen',!e.isIntersecting))).observe(card);
  }
  // Búsqueda de registros con antirrebote (evita redibujar la lista en cada tecla)
  const sIn=document.getElementById('searchInput');
  if(sIn){
    let t=null,pass=false;
    sIn.addEventListener('input',e=>{
      if(pass){pass=false;return;}
      e.stopImmediatePropagation();
      clearTimeout(t);
      t=setTimeout(()=>{pass=true;sIn.dispatchEvent(new Event('input'));},120);
    },true);
  }
  // Recalcular la guía solo una vez por frame al redimensionar/scroll
})();

/* ===================== DATOS Y PLANTILLAS · ESTADO COMPARTIDO =====================
   Módulo 1 → DocStore → Módulo 3. No existen registros de demostración ni valores fijos. */
(function(){
  if(!window.AD||!AD.store) return;
  const bienvenida=tourSteps.find(t=>t.sel==='.brand');if(bienvenida)bienvenida.sel='.app-header';
  let lastRows=null;
  /* ---- Contexto de navegación (Módulo 2 → Módulo 3) ----
     El shell llama a window.__AD_ON_NAVIGATE({radicado}, ctl) mientras muestra su pantalla de progreso y espera {ok,error}.
     `ctl` (opcional) permite informar las etapas REALES del proceso: ctl.step(i, detalle) y ctl.progress(0..1).
     Se reutiliza el Filtro general existente: el radicado se escribe en el buscador, la lista se filtra con renderRecords()
     y, si identifica un único registro, se carga igual que cuando el usuario lo elige con un clic (listener de #recordList).
     Solo se modifica la interfaz cuando el radicado existe; si no, se devuelve el error y el filtro queda como estaba.
     Etapas:  0 analizar (índice de radicados: ya construido en segundo plano; si falta, se completa por tramos)
              1 filtrar (búsqueda directa en el índice + lista filtrada)   2 procesar (cargar el registro en el módulo)
              3 preparar (campos, guía y, si ya hay plantilla elegida, la vista previa del documento). */
  const soloDig=v=>String(v==null?'':v).replace(/\D/g,'');
  const MSG_SIN_SAC='SAC Trámite no tiene registros cargados. Cárgalo en Recursos e inténtalo de nuevo.';
  const nf=n=>Number(n).toLocaleString('es-CO');
  let navSeq=0,filasWaiter=null;
  function esperaFilas(ms){return new Promise(res=>{filasWaiter={res,timer:setTimeout(()=>{filasWaiter=null;res(false);},ms)};});}
  function liberaFilas(ok){if(!filasWaiter)return;clearTimeout(filasWaiter.timer);const w=filasWaiter;filasWaiter=null;w.res(ok);}
  /* Espera a que la vista previa (si hay plantilla elegida) termine de generarse; nunca bloquea más de `ms`. */
  window.__AD_WHEN_PREVIEW=ms=>new Promise(res=>{
    const h=document.getElementById('previewHost'),t0=performance.now();let seen=false;
    const tick=()=>{const s=h&&h.dataset.state;if(s==='loading')seen=true;
      if((s==='ready'||s==='error'||s==='empty')&&(seen||performance.now()-t0>250)){res(s);return;}
      if(performance.now()-t0>ms){res('timeout');return;}setTimeout(tick,40);};tick();});
  window.__AD_ON_NAVIGATE=async(ctx,ctl)=>{
    const rad=ctx&&ctx.radicado!=null?String(ctx.radicado).trim():'';
    if(!rad)return {ok:true};
    const C=Object.assign({step:()=>0,progress(){},detail(){}},ctl||{});
    const seq=++navSeq,otra=()=>seq!==navSeq,ERR_OTRA={ok:false,error:'Se inició otra solicitud.'};
    liberaFilas(false);
    /* 0 · Analizar la información */
    await C.step(0,registros.length?'Revisando '+nf(registros.length)+' registros de SAC Trámite':'Esperando a que SAC Trámite termine de procesarse');
    if(otra())return ERR_OTRA;
    if(!registros.length){
      if(sacEstado!=='busy')return {ok:false,error:MSG_SIN_SAC};
      const ok=await esperaFilas(20000);if(otra())return ERR_OTRA;
      if(!ok&&!registros.length)return {ok:false,error:sacEstado==='busy'?'SAC Trámite sigue procesándose. Inténtalo de nuevo en unos segundos.':MSG_SIN_SAC};
    }
    let st;do{st=await ensureIndex(f=>C.progress(f));if(otra())return ERR_OTRA;}while(st.ref!==registros||!st.done);
    /* 1 · Filtrar los datos */
    await C.step(1,'Buscando el radicado '+rad);
    if(otra())return ERR_OTRA;
    const idx=st.byRad.get(soloDig(rad))||[];
    if(!idx.length)return {ok:false,error:'No se encontró el radicado '+rad+' entre los registros disponibles en Generación Documental.'};
    searchInput.value=rad;renderRecords();
    C.detail(idx.length===1?'Radicado encontrado en 1 registro':'Radicado encontrado en '+idx.length+' registros');
    /* 2 · Procesar la información */
    await C.step(2,idx.length===1?'Cargando los datos del trámite en Generación documental':'Hay '+idx.length+' procesos con este radicado');
    if(otra())return ERR_OTRA;
    let cargado=false;
    if(idx.length===1){const it=recordList.querySelector('.record-item[data-i="'+idx[0]+'"]');if(it){it.click();cargado=true;}}
    if(!cargado)openDD();      /* varios procesos con el mismo radicado: la lista queda filtrada para elegir */
    /* 3 · Preparar la respuesta */
    await C.step(3,cargado&&asignada?'Generando la vista previa con los datos del trámite':'Preparando los campos del documento');
    if(otra())return ERR_OTRA;
    if(cargado&&asignada&&window.__AD_WHEN_PREVIEW)await window.__AD_WHEN_PREVIEW(4000);
    return {ok:true,registros:idx.length};
  };
  function aplicar(snap,evt){
    const rp=snap.resources.plantillas;
    const estado=rp.status==='ready'?'ready':(rp.status==='loading'||rp.status==='processing')?'busy':rp.status==='error'?'error':'empty';
    const lista=AD.store.getTemplates();
    if(lista!==plantillas||estado!==plEstado||String(rp.error||'')!==plError){
      plantillas=lista;plEstado=estado;plError=rp.error||'';
      if(asignada&&!plantillas.some(t=>t.id===asignada))asignada=null;
      filtrarPl();renderPl();
    }
    const rs=snap.resources.sac;
    sacEstado=rs.status==='ready'?'ready':(rs.status==='loading'||rs.status==='processing')?'busy':rs.status==='error'?'error':'empty';
    sacError=rs.error||'';
    const filas=rs.status==='ready'?(AD.store.getRows('sac')||[]):[];
    if(filas!==lastRows){
      lastRows=filas;
      registros=filas.filter(row=>!isAnonymousPlaceholderRecord(row));
      renderRecords();
      if(window.__AD_SET_RECORD)window.__AD_SET_RECORD(null);
      if(registros.length)setTimeout(()=>{ensureIndex();},0);   /* índice de radicados en segundo plano, apenas llegan los datos */
    }
    else if(evt&&evt.key==='sac')renderRecords();
    if(filasWaiter){if(registros.length)liberaFilas(true);else if(sacEstado!=='busy')liberaFilas(false);}
  }
  const quitar=AD.store.subscribe(aplicar);
  addEventListener('pagehide',()=>quitar());
})();
/* ===================== DOCX CLIENT-SIDE · VISTA PREVIA Y GENERACIÓN =====================
   Pipeline: docx-preview vendorizado (si está embebido) → Mammoth.js vendorizado (si está embebido) → renderer OOXML integrado.
   JSZip y el renderer OOXML están embebidos; no se necesita red. El .bat de build puede regenerar el bloque de terceros.
   Generación: edición directa del paquete OOXML; no reconstruye la plantilla. */
(function(){
  'use strict';
  const ZIP=window.JSZip||(window.AD&&AD.libs&&AD.libs.JSZip)||(window.parent&&window.parent.JSZip);
  const PIZZIP=window.PizZip||(window.AD&&AD.libs&&AD.libs.PizZip)||(window.parent&&window.parent.PizZip);
  const DOCXTEMPLATER=window.docxtemplater||window.Docxtemplater||(window.AD&&AD.libs&&AD.libs.docxtemplater)||(window.parent&&(window.parent.docxtemplater||window.parent.Docxtemplater));
  const EASYX=window.easyTemplateX||window.EasyTemplateX||(window.AD&&AD.libs&&AD.libs.easyTemplateX)||(window.parent&&(window.parent.easyTemplateX||window.parent.EasyTemplateX));
  const DOCX=window.docx||(window.AD&&AD.libs&&AD.libs.docx)||(window.parent&&window.parent.docx);
  const DOCX_RENDERER=window.docxRenderer||(window.AD&&AD.libs&&AD.libs.docxRenderer)||(window.parent&&window.parent.docxRenderer);
  const MAMMOTH=window.mammoth||(window.AD&&AD.libs&&AD.libs.mammoth)||(window.parent&&window.parent.mammoth);
  /* Los motores se publican en el iframe para conservar sus contratos browser clásicos. */
  if(!window.JSZip&&ZIP)window.JSZip=ZIP;if(!window.PizZip&&PIZZIP)window.PizZip=PIZZIP;if(!window.docxtemplater&&DOCXTEMPLATER)window.docxtemplater=DOCXTEMPLATER;
  if(!window.easyTemplateX&&EASYX)window.easyTemplateX=EASYX;if(!window.docx&&DOCX)window.docx=DOCX;if(!window.docxRenderer&&DOCX_RENDERER)window.docxRenderer=DOCX_RENDERER;if(!window.mammoth&&MAMMOTH)window.mammoth=MAMMOTH;
  const stage=document.querySelector('.doc-stage');
  const host=document.getElementById('previewHost');
  const canvas=document.getElementById('previewCanvas'),styleHost=document.getElementById('previewStyles');
  const loading=document.getElementById('previewLoading');
  const errorBox=document.getElementById('previewError');
  const emptyBox=document.getElementById('previewEmpty');
  const errorDetail=document.getElementById('previewErrorDetail');
  const retry=document.getElementById('previewRetry');
  const downloadBtn=document.getElementById('btnDescargar');
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const RELS='http://schemas.openxmlformats.org/package/2006/relationships';
  const CONTENT_TYPES='http://schemas.openxmlformats.org/package/2006/content-types';
  const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  let mode='generated',generatedBlob=null,generatedName='',generatedFromId=null,activeRecord=null;
  let lastPopulatedRecordKey=null;
  /* “Agregar texto de radicación”: mientras está activo, el bloque [RADICADO_SALIDA]+[FECHA_RAD_SALIDA] recibe el
     texto de construcción UNA vez (applyTokenBlocks). Se desactiva al cambiar de trámite o de plantilla. */
  const TEXTO_RADICACION='RAD EN CONSTRUCCION FEC EN CONSTRUCCION',CAMPOS_RADICACION=Object.freeze(['RADICADO_SALIDA','FECHA_RAD_SALIDA']);
  const BLOQUE_RADICACION=Object.freeze({keys:CAMPOS_RADICACION,value:TEXTO_RADICACION});
  let textoRadicacionActivo=false;
  function setTextoRadicacion(on){textoRadicacionActivo=!!on;const b=document.getElementById('btnTextoRad');if(b){b.classList.toggle('is-on',textoRadicacionActivo);b.setAttribute('aria-pressed',String(textoRadicacionActivo));}}
  const fallbackRecordIds=new WeakMap();let fallbackRecordSeq=0;
  let renderSeq=0,lastRenderKey='',objectUrls=[],rendererDisposers=[];
  let resizeObserver=null,pageObserver=null,paginationFrame=0,previewPages=[],headerTargets=null;

  const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const safeName=s=>String(s||'documento').replace(/\.docx$/i,'').replace(/[\\/:*?"<>|]+/g,'_').trim()||'documento';
  const selectedMeta=()=>plantillas.find(t=>t.id===asignada)||null;
  const selectedBlob=()=>window.AD&&AD.store&&AD.store.getTemplateBlob?AD.store.getTemplateBlob(asignada):null;
  const clearObjectUrls=()=>{rendererDisposers.splice(0).forEach(fn=>{try{fn();}catch(e){}});objectUrls.splice(0).forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});};
  const show=(el,on)=>{if(el)el.hidden=!on;};

  /* Estado de carga: el título/detalle y los pasos reflejan la fase real del pipeline. */
  const loadingTitle=document.getElementById('previewLoadingTitle'),loadingDetail=document.getElementById('previewLoadingDetail');
  const LOADING_STEPS=['read','fill','render'];
  function updateLoading(message,detail){
    if(!loading)return;
    const phase=/procesando|reemplaz/i.test(message||'')?'fill':'render',generated=mode==='generated',idx=LOADING_STEPS.indexOf(phase);
    loading.dataset.phase=phase;
    if(loadingTitle)loadingTitle.textContent=message||'Preparando vista previa';
    if(loadingDetail)loadingDetail.textContent=detail||'Interpretando estilos, páginas, imágenes y encabezados…';
    loading.querySelectorAll('.pv-steps li').forEach(li=>{const i=LOADING_STEPS.indexOf(li.dataset.step);
      li.hidden=!generated&&li.dataset.step==='fill';li.classList.toggle('done',i<idx);li.classList.toggle('active',i===idx);});
    loading.classList.toggle('pv-two',!generated);
  }
  function setState(state,message,detail){
    host.dataset.state=state;
    if(state==='loading')updateLoading(message,detail);
    show(loading,state==='loading');show(errorBox,state==='error');show(emptyBox,state==='empty');show(canvas,state==='ready');
    if(errorDetail)errorDetail.textContent=detail||'';
    if(state!=='ready'){canvas.innerHTML='';if(styleHost)styleHost.innerHTML='';canvas.style.removeProperty('--preview-scale');stage.style.removeProperty('height');clearObjectUrls();lastRenderKey='';previewPages=[];headerTargets=null;}
    const canDownload=state==='ready'&&mode==='generated'&&!!generatedBlob;if(bg){bg.disabled=!canDownload;bg.classList.toggle('locked',!canDownload);bg.title=canDownload?'Descargar el documento Word generado':'El documento estará disponible al finalizar el procesamiento';}
    if(downloadBtn)downloadBtn.hidden=true;
  }

  const MAX_DOCX_BYTES=60*1024*1024,RENDER_TIMEOUT_MS=45000;
  const errorData=e=>({name:e&&e.name||'Error',message:e&&e.message||String(e),stack:e&&e.stack||'',cause:e&&e.cause?String(e.cause):''});
  function technicalLog(level,step,renderer,err,blob,extra){
    const meta=selectedMeta()||{};const data={step,renderer,mode,file:meta.fileName||'(sin nombre)',size:blob&&blob.size||0,lastModified:meta.lastModified||null,error:errorData(err),...extra};
    (console[level]||console.error).call(console,'[Asistente Documental][DOCX]',data);
  }
  function timeout(promise,ms,label){let id;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{id=setTimeout(()=>{const e=new Error(label+' excedió '+Math.round(ms/1000)+' s');e.name='TimeoutError';reject(e);},ms);})]).finally(()=>clearTimeout(id));}
  async function inspectDocx(blob){
    if(!ZIP)throw new Error('JSZip no está disponible en el paquete autocontenido.');
    if(!blob||typeof blob.arrayBuffer!=='function'||!blob.size)throw new Error('El archivo está vacío o no está disponible.');
    if(blob.size>MAX_DOCX_BYTES){const e=new Error('El DOCX supera el límite preventivo de 60 MB para vista previa en navegador.');e.name='FileTooLargeError';throw e;}
    const buffer=await blob.arrayBuffer(),sig=new Uint8Array(buffer,0,Math.min(4,buffer.byteLength));
    if(sig.length<4||sig[0]!==0x50||sig[1]!==0x4b)throw new Error('El archivo no tiene una cabecera ZIP/DOCX válida.');
    /* No se fuerza CRC en la ruta interactiva: algunos DOCX válidos regenerados por terceros traen metadatos CRC inconsistentes. */
    const zip=await ZIP.loadAsync(buffer,{checkCRC32:false,createFolders:false});
    for(const path of ['[Content_Types].xml','_rels/.rels','word/document.xml'])if(!zip.file(path))throw new Error('El paquete DOCX no contiene '+path+'.');
    const xml=await zip.file('word/document.xml').async('string'),parsed=new DOMParser().parseFromString(xml,'application/xml');
    if(parsed.getElementsByTagName('parsererror').length)throw new Error('word/document.xml no es XML válido.');
    const entries=Object.keys(zip.files),external=entries.filter(n=>/_rels\/.*\.rels$/i.test(n));
    const body=q(parsed,'body')[0]||parsed.documentElement,expectedText=(q(body,'t').map(n=>n.textContent||'').join(' ').replace(/\s+/g,' ').trim());
    return {buffer,zip,entries:entries.length,relationshipParts:external.length,expectedTextLength:expectedText.length};
  }
  function previewQuality(pkg){
    const structural=canvas.querySelector('section,.ooxml-page,.mammoth-page,table,img'),copy=canvas.cloneNode(true);copy.querySelectorAll('style,script').forEach(n=>n.remove());const actual=copy.textContent.replace(/\s+/g,' ').trim().length,expected=pkg&&pkg.expectedTextLength||0;
    if(!structural&&!actual)return {ok:false,reason:'sin contenido visible',actual,expected};
    if(expected>=180&&actual<Math.max(70,Math.floor(expected*.32)))return {ok:false,reason:'contenido incompleto',actual,expected};
    return {ok:true,actual,expected};
  }
  function findPreviewPages(){
    /* docx-preview usa hijos directos, pero docx-renderer puede interponer contenedores.
       Se toman todas las páginas descendientes y se descartan solo candidatas anidadas. */
    const all=Array.from(canvas.querySelectorAll('.docx-wrapper section.docx,.ooxml-pages > .ooxml-page,.mammoth-page'));
    return all.filter(page=>!all.some(other=>other!==page&&other.contains(page)));
  }
  function collectPreviewPages(){
    /* Scroll continuo: TODAS las páginas quedan visibles y apiladas en el escenario.
       Las marcas .ad-preview-page solo identifican páginas para medición y accesibilidad. */
    canvas.querySelectorAll('.ad-preview-page').forEach(p=>{p.classList.remove('ad-preview-page');p.hidden=false;p.removeAttribute('aria-hidden');});
    previewPages=findPreviewPages();
    previewPages.forEach(p=>{p.classList.add('ad-preview-page');p.hidden=false;});
  }

  /* Tablas de encabezado posicionadas (w:tblpPr): docx-preview/docx-renderer ignoran tblpY y
     dejan la tabla en flujo normal, muy por debajo de donde Word la sitúa (~80 px de más arriba),
     lo que desplaza también el cuerpo del documento hacia abajo. Estas funciones recuperan la Y
     real desde el XML y desplazan el <header> para que la tabla quede a su distancia original
     respecto al borde de la página; el cuerpo sigue debajo del encabezado (sin solapes). */
  async function headerFloatTargets(zip){
    try{
      if(!zip||typeof zip.file!=='function'||!zip.file('word/document.xml'))return null;
      const parse=x=>new DOMParser().parseFromString(x,'application/xml');
      const doc=parse(await zip.file('word/document.xml').async('string'));
      if(doc.getElementsByTagName('parsererror').length)return null;
      const rels={};
      if(zip.file('word/_rels/document.xml.rels')){
        const rd=parse(await zip.file('word/_rels/document.xml.rels').async('string'));
        Array.from(rd.getElementsByTagName('Relationship')).forEach(r=>{rels[r.getAttribute('Id')]=r.getAttribute('Target');});
      }
      const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',parts=[];
      for(const sect of Array.from(doc.getElementsByTagNameNS(W,'sectPr'))){
        const refs=Array.from(sect.getElementsByTagNameNS(W,'headerReference'));
        if(!refs.length)continue;
        const ref=refs.filter(r=>(r.getAttributeNS(W,'type')||'default')==='default')[0]||refs[0];
        const rid=ref.getAttributeNS(R,'id')||ref.getAttribute('r:id')||'',target=rels[rid];
        if(!target)continue;
        const t=String(target);
        const path=t.charAt(0)==='/'?t.slice(1):(t.indexOf('word/')===0?t:'word/'+t);
        if(!zip.file(path)||parts.some(p=>p.path===path))continue;
        const pgMar=sect.getElementsByTagNameNS(W,'pgMar')[0];
        const topTw=pgMar?parseFloat(pgMar.getAttributeNS(W,'top')||'0')||0:0;
        const hd=parse(await zip.file(path).async('string'));
        if(hd.getElementsByTagName('parsererror').length)continue;
        const ys=[];
        Array.from(hd.getElementsByTagNameNS(W,'tbl')).forEach(tbl=>{
          const pr=tbl.getElementsByTagNameNS(W,'tblpPr')[0];if(!pr)return;
          const yAttr=pr.getAttributeNS(W,'tblpY');
          if(yAttr===null||yAttr==='')return;
          const y=parseFloat(yAttr);if(!isFinite(y))return;
          const va=pr.getAttributeNS(W,'vertAnchor')||'margin';
          if(va==='paragraph')return; /* anclaje al párrafo: se deja el flujo original */
          ys.push(((va==='page')?y:(topTw+y))*96/1440);
        });
        if(ys.length)parts.push({path,ys});
      }
      return parts.length?parts:null;
    }catch(err){technicalLog('warn','header-targets','xml',err,null,{step:'headerFloatTargets'});return null;}
  }
  function applyHeaderFloatTargets(parts){
    delete canvas.dataset.headerAlign;
    if(!parts||!parts.length)return;
    try{
      const wrapper=canvas.querySelector('.docx-wrapper,.ooxml-pages');
      const z=parseFloat((wrapper&&getComputedStyle(wrapper).zoom)||'')||1;
      if(!isFinite(z)||z<=0)return;
      let applied=0;
      findPreviewPages().forEach(sec=>{
        const h=sec&&sec.querySelector(':scope > header');
        if(!h)return;
        const floats=Array.from(h.querySelectorAll('table')).filter(t=>getComputedStyle(t).float==='left');
        if(!floats.length)return;
        const cand=parts.length===1?parts[0]:(parts.filter(p=>p.ys.length===floats.length)[0]||parts[0]);
        const target=cand&&cand.ys[0];
        if(target==null||!isFinite(target))return;
        const secTop=sec.getBoundingClientRect().top;
        const curTop=(floats[0].getBoundingClientRect().top-secTop)/z;
        if(!isFinite(curTop))return;
        const padTop=parseFloat(getComputedStyle(sec).paddingTop)||0;
        const curMargin=parseFloat(getComputedStyle(h).marginTop)||0;
        let next=curMargin-(curTop-Math.max(target,0));
        if(next<-padTop)next=-padTop; /* el encabezado no sube más allá del borde de la página */
        if(Math.abs(next-curMargin)<0.5)return;
        h.style.marginTop=next+'px';applied++;
      });
      if(applied)canvas.dataset.headerAlign='word';
    }catch(err){technicalLog('warn','header-align','dom',err,null,{step:'applyHeaderFloatTargets'});}
  }

  function fitPages(){
    if(host.dataset.state!=='ready')return;
    const page=previewPages[0]||canvas.querySelector('section.docx,.ooxml-page,.mammoth-page');
    if(!page)return;
    const old=canvas.style.getPropertyValue('--preview-scale');canvas.style.setProperty('--preview-scale','1');
    const width=page.getBoundingClientRect().width||page.offsetWidth||816;
    const available=Math.max(260,stage.clientWidth-36);
    const scale=Math.min(1,Math.max(.36,available/width));
    canvas.style.setProperty('--preview-scale',String(scale));
    if(old!==String(scale))canvas.dataset.scale=Math.round(scale*100)+'%';
    /* Altura fija de UNA hoja: la ventana de vista previa no crece con el número de páginas
       (1, 2 o más hojas conservan el mismo tamaño) y el exceso se navega con scroll interno
       del escenario. Sin scroll cuando solo hay una hoja. */
    try{
      const pages=previewPages.length?previewPages:[page];
      const last=pages[pages.length-1];
      const wrapper=canvas.querySelector('.docx-wrapper,.ooxml-pages');
      const z=parseFloat((wrapper&&getComputedStyle(wrapper).zoom)||'')||1;
      const pageH=page.getBoundingClientRect().height;
      const trailing=(parseFloat(getComputedStyle(last).marginBottom)||0)*z;
      const sc=getComputedStyle(stage),hc=getComputedStyle(host);
      const pad=(parseFloat(sc.paddingTop)||0)+(parseFloat(sc.paddingBottom)||0);
      const hostMin=(parseFloat(hc.minHeight)||0)+(parseFloat(hc.paddingTop)||0)+(parseFloat(hc.paddingBottom)||0);
      stage.style.height=Math.ceil(Math.max(pageH+trailing,hostMin)+pad)+'px';
    }catch(e){stage.style.removeProperty('height');}
  }
  if('ResizeObserver' in window){resizeObserver=new ResizeObserver(()=>requestAnimationFrame(fitPages));resizeObserver.observe(stage);}
  else addEventListener('resize',fitPages,{passive:true});
  /* Algunos renderers completan imágenes o subdividen páginas después de resolver su promesa.
     Si cambia la estructura ya visible, se vuelve a aplicar la virtualización antes del siguiente repintado. */
  if('MutationObserver' in window){
    pageObserver=new MutationObserver(mutations=>{
      if(host.dataset.state!=='ready'||!mutations.some(m=>m.addedNodes.length||m.removedNodes.length))return;
      cancelAnimationFrame(paginationFrame);paginationFrame=requestAnimationFrame(()=>{collectPreviewPages();if(headerTargets)applyHeaderFloatTargets(headerTargets);fitPages();});
    });
    pageObserver.observe(canvas,{childList:true,subtree:true});
  }

  async function renderPrimary(pkg){
    if(!DOCX||typeof DOCX.renderAsync!=='function')throw new Error('docx-preview no está embebido.');
    const created=[],original=URL.createObjectURL;
    URL.createObjectURL=function(v){const u=original.call(URL,v);created.push(u);return u;};
    try{
      await DOCX.renderAsync(pkg.buffer.slice(0),canvas,styleHost||canvas,{
        className:'docx',inWrapper:true,hideWrapperOnPrint:false,ignoreWidth:false,ignoreHeight:false,
        ignoreFonts:false,breakPages:true,ignoreLastRenderedPageBreak:true,experimental:false,
        trimXmlDeclaration:true,useBase64URL:false,renderChanges:false,renderHeaders:true,renderFooters:true,
        renderFootnotes:true,renderEndnotes:true,renderComments:false,renderAltChunks:true,debug:false
      });
    }finally{objectUrls.push(...created);URL.createObjectURL=original;}
  }
  async function renderDocxRenderer(pkg){
    if(!DOCX_RENDERER)throw new Error('docx-renderer no está embebido.');
    const fn=typeof DOCX_RENDERER.render==='function'?DOCX_RENDERER.render:DOCX_RENDERER.renderAsync;
    if(typeof fn!=='function')throw new Error('docx-renderer no expone render/renderAsync.');
    const created=[],original=URL.createObjectURL;URL.createObjectURL=function(v){const u=original.call(URL,v);created.push(u);return u;};
    try{
      const result=await fn.call(DOCX_RENDERER,pkg.buffer.slice(0),canvas,styleHost||canvas,{className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,breakPages:true,ignoreLastRenderedPageBreak:true,experimental:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true,renderAltChunks:true});
      if(result&&typeof result.dispose==='function')rendererDisposers.push(()=>result.dispose());
    }finally{objectUrls.push(...created);URL.createObjectURL=original;}
  }
  function sanitizeMammoth(root){
    root.querySelectorAll('script,iframe,object,embed,link,meta,base').forEach(n=>n.remove());
    root.querySelectorAll('*').forEach(el=>Array.from(el.attributes||[]).forEach(a=>{if(/^on/i.test(a.name)||(/^(href|src|xlink:href)$/i.test(a.name)&&/^\s*javascript:/i.test(a.value)))el.removeAttribute(a.name);}));
  }
  async function renderMammoth(pkg){
    if(!MAMMOTH||typeof MAMMOTH.convertToHtml!=='function')throw new Error('Mammoth.js no está embebido.');
    const imageConverter=MAMMOTH.images&&MAMMOTH.images.imgElement?MAMMOTH.images.imgElement(image=>image.read('base64').then(data=>({src:'data:'+image.contentType+';base64,'+data}))):undefined;
    const result=await MAMMOTH.convertToHtml({arrayBuffer:pkg.buffer.slice(0)},{includeDefaultStyleMap:true,ignoreEmptyParagraphs:false,convertImage:imageConverter});
    const page=document.createElement('section');page.className='mammoth-page docx';page.innerHTML=result.value||'';sanitizeMammoth(page);canvas.appendChild(page);
    (result.messages||[]).forEach(msg=>technicalLog(msg.type==='error'?'error':'warn','render','mammoth',new Error(msg.message),null,{mammothType:msg.type}));
  }

  const q=(n,local)=>n&&n.getElementsByTagNameNS?Array.from(n.getElementsByTagNameNS(W,local)):[];
  const attr=(n,local)=>n?n.getAttributeNS(W,local)||n.getAttribute('w:'+local)||n.getAttribute(local):null;
  const px=twips=>(Number(twips)||0)/15;
  const cssEscape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function parseProps(node,kind){
    const out={};if(!node)return out;
    const one=n=>q(node,n)[0];
    if(kind!=='p'){
      if(one('b'))out.fontWeight='700';if(one('i'))out.fontStyle='italic';
      const u=one('u');if(u&&attr(u,'val')!=='none')out.textDecoration='underline';
      if(one('strike'))out.textDecoration=(out.textDecoration?out.textDecoration+' ':'')+'line-through';
      const color=one('color');if(color&&attr(color,'val')&&!/auto/i.test(attr(color,'val')))out.color='#'+attr(color,'val');
      const hi=one('highlight');if(hi&&attr(hi,'val'))out.backgroundColor=attr(hi,'val');
      const sz=one('sz');if(sz&&attr(sz,'val'))out.fontSize=(Number(attr(sz,'val'))/2)+'pt';
      const fonts=one('rFonts');if(fonts){const f=attr(fonts,'ascii')||attr(fonts,'hAnsi')||attr(fonts,'eastAsia');if(f)out.fontFamily='"'+f.replace(/"/g,'')+'",sans-serif';}
      const va=one('vertAlign');if(va){const v=attr(va,'val');if(v==='superscript'){out.verticalAlign='super';out.fontSize=out.fontSize||'.75em';}if(v==='subscript'){out.verticalAlign='sub';out.fontSize=out.fontSize||'.75em';}}
    }
    if(kind!=='r'){
      const jc=one('jc');if(jc){const v=attr(jc,'val');out.textAlign={both:'justify',center:'center',right:'right',left:'left',distribute:'justify'}[v]||v;}
      const ind=one('ind');if(ind){if(attr(ind,'left'))out.marginLeft=px(attr(ind,'left'))+'px';if(attr(ind,'right'))out.marginRight=px(attr(ind,'right'))+'px';if(attr(ind,'firstLine'))out.textIndent=px(attr(ind,'firstLine'))+'px';if(attr(ind,'hanging'))out.textIndent='-'+px(attr(ind,'hanging'))+'px';}
      const sp=one('spacing');if(sp){if(attr(sp,'before'))out.marginTop=px(attr(sp,'before'))+'px';if(attr(sp,'after'))out.marginBottom=px(attr(sp,'after'))+'px';if(attr(sp,'line'))out.lineHeight=(Number(attr(sp,'line'))/240).toFixed(2);}
      if(one('pageBreakBefore'))out.pageBreakBefore='always';
    }
    return out;
  }
  const styleText=o=>Object.entries(o).map(([k,v])=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+v).join(';');

  function parseStyles(xml){
    const map=new Map();if(!xml)return map;const d=new DOMParser().parseFromString(xml,'application/xml');
    q(d,'style').forEach(s=>{const id=attr(s,'styleId');if(!id)return;map.set(id,{id,based:attr(q(s,'basedOn')[0],'val'),p:parseProps(q(s,'pPr')[0],'p'),r:parseProps(q(s,'rPr')[0],'r')});});
    const resolve=(id,seen=new Set())=>{const x=map.get(id);if(!x||seen.has(id))return{p:{},r:{}};seen.add(id);const b=resolve(x.based,seen);return{p:{...b.p,...x.p},r:{...b.r,...x.r}};};
    map.forEach((v,k)=>map.set(k,{...v,...resolve(k)}));return map;
  }
  function parseRelationships(xml){
    const map=new Map();if(!xml)return map;const d=new DOMParser().parseFromString(xml,'application/xml');
    Array.from(d.getElementsByTagNameNS(RELS,'Relationship')).forEach(x=>map.set(x.getAttribute('Id'),x.getAttribute('Target')));return map;
  }
  function normalizeTarget(part,target){
    if(!target)return null;if(target[0]==='/')return target.slice(1);
    const base=part.slice(0,part.lastIndexOf('/')+1),bits=(base+target).split('/'),out=[];
    bits.forEach(b=>{if(b==='..')out.pop();else if(b&&b!=='.')out.push(b);});return out.join('/');
  }
  async function imageUrl(zip,part,rels,id){
    const raw=id&&rels.get(id);if(!raw||/^(?:https?:|file:|data:)/i.test(raw))return null;
    const target=normalizeTarget(part,raw),f=target&&zip.file(target);if(!f)return null;
    const blob=await f.async('blob'),u=URL.createObjectURL(blob);objectUrls.push(u);return u;
  }

  async function fallbackPart(zip,part,styles,page,ctx){
    const xml=await zip.file(part).async('string'),doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw new Error('XML de Word no válido: '+part);
    const relPath=part.replace(/([^/]+)$/,'_rels/$1.rels'),rels=parseRelationships(zip.file(relPath)?await zip.file(relPath).async('string'):null);
    const renderRun=async r=>{
      const span=document.createElement('span'),rp=q(r,'rPr')[0],pStyle=ctx.rStyle||{};span.setAttribute('style',styleText({...pStyle,...parseProps(rp,'r')}));
      for(const n of Array.from(r.childNodes)){
        if(n.namespaceURI!==W)continue;
        if(n.localName==='t'||n.localName==='delText'||n.localName==='instrText')span.appendChild(document.createTextNode(n.textContent));
        else if(n.localName==='tab')span.appendChild(document.createTextNode('\t'));
        else if(n.localName==='br'){if(attr(n,'type')==='page')ctx.pageBreak=true;else span.appendChild(document.createElement('br'));}
        else if(n.localName==='lastRenderedPageBreak'){/* Marca de Word informativa: no es un salto explícito. */}
        else if(n.localName==='drawing'||n.localName==='pict'){
          const blips=Array.from(n.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main','blip'));
          const id=blips[0]&&(blips[0].getAttributeNS(R,'embed')||blips[0].getAttribute('r:embed'));
          const linked=blips[0]&&(blips[0].getAttributeNS(R,'link')||blips[0].getAttribute('r:link'));
          const u=await imageUrl(zip,part,rels,id||linked);if(u){const img=document.createElement('img');img.src=u;img.alt='Imagen del documento';img.className='ooxml-image';
            const ex=Array.from(n.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','extent'))[0];
            if(ex){img.style.width=(Number(ex.getAttribute('cx'))/9525)+'px';img.style.height=(Number(ex.getAttribute('cy'))/9525)+'px';}span.appendChild(img);}
          else if(linked){const ph=document.createElement('span');ph.className='ooxml-linked-image';ph.textContent='[Imagen vinculada no disponible sin conexión]';span.appendChild(ph);}
        }
      }return span;
    };
    const renderParagraph=async p=>{
      const el=document.createElement('p'),pp=q(p,'pPr')[0],sid=attr(q(pp,'pStyle')[0],'val'),sty=styles.get(sid)||{p:{},r:{}};
      ctx.rStyle=sty.r||{};el.setAttribute('style',styleText({...sty.p,...parseProps(pp,'p')}));
      const numPr=q(pp,'numPr')[0];if(numPr){const lvl=Number(attr(q(numPr,'ilvl')[0],'val')||0),num=attr(q(numPr,'numId')[0],'val')||'0',key=num+':'+lvl;ctx.counters[key]=(ctx.counters[key]||0)+1;const mark=document.createElement('span');mark.className='ooxml-list-marker';mark.textContent=lvl%2?'•':ctx.counters[key]+'.';el.appendChild(mark);}
      for(const child of Array.from(p.childNodes)){
        if(child.namespaceURI!==W)continue;
        if(child.localName==='r')el.appendChild(await renderRun(child));
        else if(child.localName==='hyperlink')for(const r of Array.from(child.childNodes).filter(x=>x.localName==='r'))el.appendChild(await renderRun(r));
        else if(child.localName==='fldSimple')for(const r of q(child,'r'))el.appendChild(await renderRun(r));
      }
      const ps=q(p,'sectPr')[0],st=ps&&q(ps,'type')[0];if(ps&&attr(st,'val')!=='continuous')ctx.pageBreak=true;
      if(!el.textContent.trim()&&!el.querySelector('img,br'))el.innerHTML='&nbsp;';return el;
    };
    const renderTable=async tbl=>{
      const table=document.createElement('table');table.className='ooxml-table';
      for(const tr of Array.from(tbl.childNodes).filter(x=>x.localName==='tr')){const row=document.createElement('tr');
        for(const tc of Array.from(tr.childNodes).filter(x=>x.localName==='tc')){const cell=document.createElement('td'),tcp=q(tc,'tcPr')[0],span=q(tcp,'gridSpan')[0];if(span)cell.colSpan=Number(attr(span,'val'))||1;
          const shd=q(tcp,'shd')[0];if(shd&&attr(shd,'fill')&&!/auto/i.test(attr(shd,'fill')))cell.style.backgroundColor='#'+attr(shd,'fill');
          const mar=q(tcp,'tcMar')[0];if(mar){const vals=['top','right','bottom','left'].map(k=>q(mar,k)[0]);cell.style.padding=vals.map(x=>x?px(attr(x,'w'))+'px':'5px').join(' ');}
          for(const n of Array.from(tc.childNodes).filter(x=>x.namespaceURI===W)){if(n.localName==='p')cell.appendChild(await renderParagraph(n));else if(n.localName==='tbl')cell.appendChild(await renderTable(n));}row.appendChild(cell);}table.appendChild(row);}return table;
    };
    const root=doc.documentElement.localName==='document'?q(doc,'body')[0]:doc.documentElement;
    const renderBlock=async(child,target)=>{
      if(!child||child.namespaceURI!==W)return;
      if(child.localName==='p')target.appendChild(await renderParagraph(child));
      else if(child.localName==='tbl')target.appendChild(await renderTable(child));
      else if(['sdt','sdtContent','customXml','ins','del','moveFrom','moveTo','txbxContent'].includes(child.localName))for(const n of Array.from(child.childNodes))await renderBlock(n,target);
      if(ctx.pageBreak&&part==='word/document.xml'){ctx.pageBreak=false;page=ctx.newPage();}
    };
    for(const child of Array.from(root.childNodes))await renderBlock(child,page);
    return page;
  }

  async function renderFallback(pkg){
    if(!ZIP)throw new Error('JSZip no está disponible.');
    const zip=pkg&&pkg.zip?pkg.zip:await ZIP.loadAsync(pkg.buffer,{checkCRC32:false});
    if(!zip.file('word/document.xml'))throw new Error('El archivo no contiene word/document.xml.');
    const styles=parseStyles(zip.file('word/styles.xml')?await zip.file('word/styles.xml').async('string'):null);
    const docXml=await zip.file('word/document.xml').async('string'),doc=new DOMParser().parseFromString(docXml,'application/xml');
    const sections=q(doc,'sectPr'),sect=sections[sections.length-1]||null,pgSz=q(sect,'pgSz')[0],pgMar=q(sect,'pgMar')[0];
    let width=px(attr(pgSz,'w')||12240),height=px(attr(pgSz,'h')||15840);if(attr(pgSz,'orient')==='landscape'&&height>width)[width,height]=[height,width];
    const margins={top:px(attr(pgMar,'top')||1440),right:px(attr(pgMar,'right')||1440),bottom:px(attr(pgMar,'bottom')||1440),left:px(attr(pgMar,'left')||1440)};
    const pages=document.createElement('div');pages.className='ooxml-pages';canvas.appendChild(pages);
    const refs=kind=>[...new Set(sections.flatMap(s=>q(s,kind+'Reference').map(x=>x.getAttributeNS(R,'id')||x.getAttribute('r:id')).filter(Boolean)))];
    const docRels=parseRelationships(zip.file('word/_rels/document.xml.rels')?await zip.file('word/_rels/document.xml.rels').async('string'):null);
    const headerParts=refs('header').map(id=>normalizeTarget('word/document.xml',docRels.get(id))).filter(p=>p&&zip.file(p));
    const footerParts=refs('footer').map(id=>normalizeTarget('word/document.xml',docRels.get(id))).filter(p=>p&&zip.file(p));
    const ctx={counters:{},pageBreak:false,rStyle:{},newPage:null};
    const newPage=()=>{const pg=document.createElement('section');pg.className='ooxml-page docx';pg.style.cssText=`width:${width}px;height:${height}px;padding:${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`;
      const hd=document.createElement('header');hd.className='ooxml-header';const body=document.createElement('main');body.className='ooxml-body';const ft=document.createElement('footer');ft.className='ooxml-footer';pg.append(hd,body,ft);pages.appendChild(pg);ctx.currentPage=pg;return body;};
    ctx.newPage=newPage;let body=newPage();
    for(const p of headerParts.slice(0,1))await fallbackPart(zip,p,styles,ctx.currentPage.querySelector('header'),ctx);
    await fallbackPart(zip,'word/document.xml',styles,body,ctx);
    for(const pg of pages.children){const hd=pg.querySelector('header'),ft=pg.querySelector('footer');if(!hd.childNodes.length&&headerParts[0])await fallbackPart(zip,headerParts[0],styles,hd,ctx);if(footerParts[0])await fallbackPart(zip,footerParts[0],styles,ft,ctx);}
    if(!canvas.textContent.trim()&&!canvas.querySelector('img,table'))throw new Error('El documento no produjo contenido visible.');
  }

  function emptyCopy(title,detail){
    const b=emptyBox&&emptyBox.querySelector('b'),p=emptyBox&&emptyBox.querySelector('p');if(b)b.textContent=title||'';if(p)p.textContent=detail||'';
  }
  function emptyState(message,title,detail){
    /* Invariante del flujo: con plantilla + trámite reales nunca se muestra una placa de “aún no generado”. */
    if(typeof selectedMeta==='function'&&selectedMeta()&&selectedBlob()&&activeRecord){mode='generated';setState('loading','Procesando y reemplazando campos','Generando automáticamente la vista previa…');Promise.resolve().then(()=>renderDocument('generated',true));return;}
    emptyCopy(title,detail);setState('empty',message,detail);
  }

  /* Normalización centralizada: todos los nombres usan exactamente la misma regla. */
  function normalizeName(v){
    return String(v==null?'':v).trim().replace(/\s+/g,' ').toLocaleLowerCase('es-CO').split(' ').filter(Boolean)
      .map(w=>w.charAt(0).toLocaleUpperCase('es-CO')+w.slice(1)).join(' ');
  }
  function valueText(v){
    if(v===null||v===undefined)return'';
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);
    return String(v).trim();
  }
  const MONTHS_ES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function parseDateValue(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return new Date(v.getFullYear(),v.getMonth(),v.getDate());
    const raw=String(v==null?'':v).trim();if(!raw)return null;let m;
    if((m=/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(raw)))return new Date(+m[3],+m[2]-1,+m[1]);
    if((m=/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(raw)))return new Date(+m[1],+m[2]-1,+m[3]);
    const d=new Date(raw);return Number.isNaN(d.getTime())?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
  }
  function longDateEs(v){const d=parseDateValue(v);return d?`${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`:'';}
  function profile(){try{return window.AD&&AD.store&&AD.store.getProfile?(AD.store.getProfile()||{}):(JSON.parse(localStorage.getItem('essa-perfil')||'{}')||{});}catch(e){return{};}}
  function applicantKind(row,name){
    const explicit=String(sacValue(row,['TIPO_PERSONA','TIPO_SOLICITANTE','NATURALEZA_PERSONA','NATURALEZA_SOLICITANTE','PERSONA_NATURAL_JURIDICA'])||'').toLocaleLowerCase('es-CO');
    if(/jur[ií]d|empresa|sociedad|entidad|organizaci[oó]n|corporaci[oó]n/.test(explicit))return'company';
    if(/natural|persona natural/.test(explicit))return'person';
    const docType=String(sacValue(row,['TIPO_IDENTIFICACION','TIPO_DOCUMENTO','TIPO_DOCUMENTO_SOLICITANTE'])||'').toLocaleUpperCase('es-CO');
    if(/\b(NIT|NI|RUT)\b/.test(docType))return'company';
    if(/\b(CC|CE|TI|RC|PA|PASAPORTE|CEDULA)\b/.test(docType))return'person';
    const legal=/\b(S\.?\s*A\.?\s*S\.?|S\.?\s*A\.?|LTDA\.?|LIMITADA|E\.?\s*S\.?\s*P\.?|EMPRESA|SOCIEDAD|FUNDACI[ÓO]N|CORPORACI[ÓO]N|COOPERATIVA|ASOCIACI[ÓO]N|UNIVERSIDAD|ALCALD[IÍ]A|MUNICIPIO|GOBERNACI[ÓO]N|BANCO|ENTIDAD)\b/i;
    if(legal.test(String(name||''))||sacValue(row,['NIT','RAZON_SOCIAL']))return'company';
    return'person';
  }
  /* [PRIMER_NOMBRE]: interpretación en el núcleo compartido (PersonName del shell). */
  const PERSON_NAME=(window.AD&&AD.names)||(window.parent&&window.parent!==window&&window.parent.PersonName)||null;
  function firstGivenName(row,fullName,kind){
    if(kind==='company'||!PERSON_NAME)return'';
    return PERSON_NAME.firstGivenName({fullName,
      firstName:sacValue(row,['PRIMER_NOMBRE','NOMBRE_1','NOMBRE1']),
      givenNames:sacValue(row,['NOMBRES','NOMBRES_SOLICITANTE']),
      surnames:[sacValue(row,['PRIMER_APELLIDO','APELLIDO_1','APELLIDO1']),sacValue(row,['SEGUNDO_APELLIDO','APELLIDO_2','APELLIDO2'])]});
  }
  /* [DISTINTIVO]: tratamiento del destinatario. Única fuente del texto; la tarjeta “Señor(a)” de la vista
     del solicitante usa el mismo valor. */
  const DISTINTIVO='Señor(a)';

  function replacementData(){
    const lookup=Object.create(null),put=(k,v,overwrite=true)=>{const nk=normKey(k);if(!nk)return;if(overwrite||!Object.prototype.hasOwnProperty.call(lookup,nk))lookup[nk]=valueText(v);};
    const fieldText=id=>{const el=document.getElementById(id);return el?String(el.value==null?'':el.value):'';};
    const putExact=(k,v)=>{const nk=normKey(k);if(nk)lookup[nk]=v==null?'':String(v);};
    if(activeRecord)Object.entries(activeRecord).forEach(([k,v])=>put(k,v));
    const fields=Array.from(document.querySelectorAll('#panelSolicitante .field input')).map(i=>i.value.trim());
    const p=profile(),realName=fields[0]||sacValue(activeRecord,['NOMBRE_SOLICITANTE','NOMBRE_SUSCRIPTOR']),kind=applicantKind(activeRecord,realName),name=normalizeName(realName);
    const requestDate=sacValue(activeRecord,['FECHA_SOLICITUD']),today=new Date();
    /* Departamento: mismo valor capturado en el bloque (o en SAC Trámite); se reutiliza para todos sus marcadores */
    const departamento=fields[3]||formatoTitulo(sacValue(activeRecord,['DEPTO_SOLICITANTE','DEPARTAMENTO_SOLICITANTE','DEPARTAMENTO_SUSCRIPTOR','DEPARTAMENTO']));
    const aliases={DISTINTIVO,NOMBRE:name,NOMBRE_COMPLETO:name,NOMBRE_SOLICITANTE:name,NOMBRE_SUSCRIPTOR:name,PRIMER_NOMBRE:firstGivenName(activeRecord,realName,kind),
      TIPO_PERSONA_DETECTADO:kind==='company'?'Persona jurídica':'Persona natural',
      RADICADO_ENTRADA:sacValue(activeRecord,['RADICADO_ENTRADA']),RADICADO_SALIDA:fields[1]||sacValue(activeRecord,['RADICADO_SALIDA']),
      FECHA_SOLICITUD:longDateEs(requestDate),FECHA_RAD_SALIDA:longDateEs(today),FECHA_RADICADO_SALIDA:longDateEs(today),
      NUMERO_CUENTA:sacValue(activeRecord,['NUMERO_CUENTA']),NUMERO_PROCESO:sacValue(activeRecord,['NUMERO_PROCESO']),
      DIRECCION_SOLICITANTE:fields[2]||formatoTitulo(sacValue(activeRecord,['DIRECCION_SOLICITANTE','DIRECCION_SUSCRIPTOR','DIRECCION'])),
      DIRECCION_NOTIFICACION:fields[2]||formatoTitulo(sacValue(activeRecord,['DIRECCION_SOLICITANTE','DIRECCION_SUSCRIPTOR','DIRECCION'])),
      DEPARTAMENTO:departamento,
      /* marcador [DEPARTAMENTO_SOLICITANTE] de la plantilla Word */
      DEPARTAMENTO_SOLICITANTE:departamento,
      MUNICIPIO:fields[4]||formatoTitulo(sacValue(activeRecord,['MUNICIPIO_SOLICITANTE','MUNICIPIO_SUSCRIPTOR'])),
      MUNICIPIO_SOLICITANTE:fields[4]||formatoTitulo(sacValue(activeRecord,['MUNICIPIO_SOLICITANTE','MUNICIPIO_SUSCRIPTOR'])),
      CORREO_SOLICITANTE:correoMin(fields[IDX_CORREO]||sacValue(activeRecord,['CORREO_SOLICITANTE','CORREO_SUSCRIPTOR','CORREO','EMAIL'])),
      /* [TELEFONO_SOLICITANTE] de la plantilla se llena con la columna CELULAR_SOLICITANTE de SAC Trámite */
      TELEFONO_SOLICITANTE:sacValue(activeRecord,['CELULAR_SOLICITANTE']),
      NOMBRE_FIRMANTE:normalizeName(p.nombre||''),
      FIRMA_DOCUMENTO:p.firma?'__ESSA_SIGNATURE__':''};
    Object.entries(aliases).forEach(([k,v])=>put(k,v));
    /* Descripciones del documento → SUS marcadores según `descs` (exacto, conserva saltos de línea). */
    descs.forEach(d=>{const v=fieldText(d.id);d.tokens.forEach(k=>putExact(k,v));});
    /* El texto de radicación NO se asigna a cada marcador por separado (eso lo duplicaba):
       se declara como bloque y applyTokenBlocks decide cuántas veces y dónde aparece. */
    const blocks=textoRadicacionActivo?[BLOQUE_RADICACION]:[];
    blocks.forEach(b=>putExact(b.keys[0],b.value));
    return {lookup,profile:p,applicantKind:kind,blocks};
  }

  function resolveValue(lookup,key,stats){
    const nk=normKey(key),known=Object.prototype.hasOwnProperty.call(lookup,nk),value=known?lookup[nk]:'',intentionalBlank=nk==='PRIMER_NOMBRE'&&lookup.TIPO_PERSONA_DETECTADO==='Persona jurídica';
    stats.tokens.add(nk||String(key));if(!intentionalBlank&&(!known||value===''))stats.missing.add(nk||String(key));return value;
  }
  const TOKEN_RE=/⟦\s*([^⟦⟧]+?)\s*⟧|\{\{\s*([^{}]+?)\s*\}\}|\[\[\s*([^\[\]]+?)\s*\]\]|\[\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ_. \-]{1,80})\s*\]|\$\{\s*([^{}]+?)\s*\}|«\s*([^»]+?)\s*»/g;
  function tokensIn(text){const out=[];let m;TOKEN_RE.lastIndex=0;while((m=TOKEN_RE.exec(text))){const key=m.slice(1).find(Boolean);out.push({token:m[0],key});}return out;}
  function setTextValue(doc,textNode,value){
    const parts=String(value).split(/\r?\n/);textNode.textContent=parts[0]||'';if(/^\s|\s$/.test(textNode.textContent))textNode.setAttribute('xml:space','preserve');
    let anchor=textNode;for(let i=1;i<parts.length;i++){const br=doc.createElementNS(W,'w:br'),t=doc.createElementNS(W,'w:t');t.textContent=parts[i];if(/^\s|\s$/.test(t.textContent))t.setAttribute('xml:space','preserve');anchor.parentNode.insertBefore(br,anchor.nextSibling);anchor.parentNode.insertBefore(t,br.nextSibling);anchor=t;}
  }
  function replaceToken(paragraph,token,value){
    let guard=0;
    while(guard++<100){
      const texts=q(paragraph,'t'),vals=texts.map(t=>t.textContent||''),full=vals.join(''),start=full.indexOf(token);if(start<0)return;
      const end=start+token.length;let pos=0,si=-1,ei=-1,so=0,eo=0;const ranges=[];
      for(let i=0;i<vals.length;i++){const next=pos+vals[i].length;ranges.push([pos,next]);if(si<0&&start>=pos&&start<=next){si=i;so=start-pos;}if(end>=pos&&end<=next){ei=i;eo=end-pos;break;}pos=next;}
      if(si<0||ei<0)return;const pre=vals[si].slice(0,so),post=vals[ei].slice(eo);let target=si,best=-1;
      for(let i=si;i<=ei;i++){const a=Math.max(start,ranges[i][0])-ranges[i][0],b=Math.min(end,ranges[i][1])-ranges[i][0],score=(vals[i].slice(a,b).match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_]/g)||[]).length;if(score>best){best=score;target=i;}}
      for(let i=si;i<=ei;i++)texts[i].textContent='';
      if(si===ei)setTextValue(paragraph.ownerDocument,texts[si],pre+value+post);
      else{setTextValue(paragraph.ownerDocument,texts[si],target===si?pre+value:pre);if(target!==si)setTextValue(paragraph.ownerDocument,texts[target],value);if(ei===target)setTextValue(paragraph.ownerDocument,texts[ei],value+post);else setTextValue(paragraph.ownerDocument,texts[ei],post);}
    }
  }
  function replaceSimpleMergeFields(doc,lookup,stats){
    q(doc,'fldSimple').forEach(f=>{const instr=attr(f,'instr')||'',m=/\bMERGEFIELD\s+(?:\"([^\"]+)\"|([^\\\s]+))/i.exec(instr);if(!m)return;
      const value=resolveValue(lookup,m[1]||m[2],stats),texts=q(f,'t');if(texts[0]){texts[0].textContent=value;for(let i=1;i<texts.length;i++)texts[i].textContent='';}
      const parent=f.parentNode;while(f.firstChild)parent.insertBefore(f.firstChild,f);parent.removeChild(f);
    });
  }
  function drawingNode(doc,rid,w,h,id){
    const cx=Math.round(w*9525),cy=Math.round(h*9525),xml=`<root xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Firma ESSA"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Firma ESSA"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></root>`;
    const d=new DOMParser().parseFromString(xml,'application/xml');return doc.importNode(d.documentElement.firstElementChild,true);
  }
  function replaceXml(xml,lookup,signature,stats){
    const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('XML DOCX no válido');
    replaceSimpleMergeFields(doc,lookup,stats);
    q(doc,'p').forEach(p=>{const full=q(p,'t').map(t=>t.textContent||'').join('');const seen=new Set();tokensIn(full).forEach(x=>{if(seen.has(x.token))return;seen.add(x.token);replaceToken(p,x.token,resolveValue(lookup,x.key,stats));});});
    let signatureUsed=false;
    if(signature){q(doc,'t').forEach((t,i)=>{if(!t.textContent.includes('__ESSA_SIGNATURE__'))return;t.textContent=t.textContent.replace(/__ESSA_SIGNATURE__/g,'');t.parentNode.appendChild(drawingNode(doc,signature.rid,signature.width,signature.height,9000+i));signatureUsed=true;});}
    return {xml:new XMLSerializer().serializeToString(doc),signatureUsed};
  }
  function relsPath(part){return part.replace(/([^/]+)$/,'_rels/$1.rels');}
  async function addImageRelationship(zip,part,rid,target){
    const path=relsPath(part);let doc;if(zip.file(path))doc=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');else doc=new DOMParser().parseFromString(`<Relationships xmlns="${RELS}"/>`,'application/xml');
    if(!Array.from(doc.getElementsByTagNameNS(RELS,'Relationship')).some(x=>x.getAttribute('Id')===rid)){const r=doc.createElementNS(RELS,'Relationship');r.setAttribute('Id',rid);r.setAttribute('Type','http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');r.setAttribute('Target',target);doc.documentElement.appendChild(r);}zip.file(path,new XMLSerializer().serializeToString(doc));
  }
  async function imageInfo(dataUrl,size){
    const m=/^data:(image\/(?:png|jpe?g));base64,(.+)$/i.exec(dataUrl||'');if(!m)return null;const bin=atob(m[2]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const dims=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve({w:im.naturalWidth||1,h:im.naturalHeight||1});im.onerror=()=>resolve({w:3,h:1});im.src=dataUrl;});
    const requested=Math.max(90,Math.min(420,Number(size)||220)),scale=Math.min(requested/dims.w,150/dims.h),width=Math.max(1,dims.w*scale),height=Math.max(1,dims.h*scale);
    return {bytes,ext:/png/i.test(m[1])?'png':'jpg',mime:/png/i.test(m[1])?'image/png':'image/jpeg',width,height};
  }
  async function ensureContentType(zip,ext,mime){const path='[Content_Types].xml',doc=new DOMParser().parseFromString(await zip.file(path).async('string'),'application/xml');if(!Array.from(doc.getElementsByTagNameNS(CONTENT_TYPES,'Default')).some(x=>x.getAttribute('Extension').toLowerCase()===ext)){const d=doc.createElementNS(CONTENT_TYPES,'Default');d.setAttribute('Extension',ext);d.setAttribute('ContentType',mime);doc.documentElement.appendChild(d);zip.file(path,new XMLSerializer().serializeToString(doc));}}
  function templaterCtor(){return typeof DOCXTEMPLATER==='function'?DOCXTEMPLATER:(DOCXTEMPLATER&&typeof DOCXTEMPLATER.default==='function'?DOCXTEMPLATER.default:null);}
  function easyHandlerCtor(){return EASYX&&(EASYX.TemplateHandler||(EASYX.default&&EASYX.default.TemplateHandler));}
  function normalizedEngineData(data){const out={};Object.entries(data.lookup||{}).forEach(([k,v])=>out[normKey(k)]=v);return out;}
  async function normalizedTemplateBuffer(blob){
    if(!PIZZIP)throw new Error('PizZip no está disponible.');const zip=new PIZZIP(await blob.arrayBuffer()),detected=new Set();
    const parts=Object.keys(zip.files).filter(n=>/^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments\d*)\.xml$/.test(n));
    for(const part of parts){const f=zip.file(part);if(!f)continue;const d=new DOMParser().parseFromString(f.asText(),'application/xml');if(d.getElementsByTagName('parsererror').length)continue;
      q(d,'p').forEach(p=>{const full=q(p,'t').map(t=>t.textContent||'').join(''),seen=new Set();tokensIn(full).forEach(x=>{if(seen.has(x.token))return;seen.add(x.token);const key=normKey(x.key);if(!key)return;detected.add(key);replaceToken(p,x.token,`⟦${key}⟧`);});});
      zip.file(part,new XMLSerializer().serializeToString(d));
    }
    return {buffer:zip.generate({type:'arraybuffer',compression:'DEFLATE'}),detected};
  }
  async function generateWithDocxtemplater(blob,data){
    const Ctor=templaterCtor();if(!PIZZIP||!Ctor)throw new Error('PizZip/Docxtemplater no están disponibles.');const prep=await normalizedTemplateBuffer(blob),zip=new PIZZIP(prep.buffer),values=normalizedEngineData(data);
    const parser=tag=>({get:()=>Object.prototype.hasOwnProperty.call(values,normKey(tag))?values[normKey(tag)]:''});
    const instance=new Ctor(zip,{paragraphLoop:true,linebreaks:true,delimiters:{start:'⟦',end:'⟧'},parser,nullGetter:()=>''});instance.render(values);
    return {buffer:instance.getZip().generate({type:'arraybuffer',compression:'DEFLATE'}),detected:prep.detected,engine:'docxtemplater'};
  }
  async function generateWithEasyTemplateX(blob,data){
    const Handler=easyHandlerCtor();if(!Handler)throw new Error('easy-template-x no está disponible.');const prep=await normalizedTemplateBuffer(blob),values=normalizedEngineData(data),handler=new Handler({delimiters:{tagStart:'⟦',tagEnd:'⟧'}});
    const output=await handler.process(prep.buffer,values),buffer=output&&typeof output.arrayBuffer==='function'?await output.arrayBuffer():(ArrayBuffer.isView(output)?output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength):new Uint8Array(output).slice().buffer);
    return {buffer,detected:prep.detected,engine:'easy-template-x'};
  }
  async function finalizeGenerated(input,data,onProgress,base){
    if(!ZIP)throw new Error('JSZip no está disponible.');const raw=input&&typeof input.arrayBuffer==='function'?await input.arrayBuffer():(ArrayBuffer.isView(input)?input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength):new Uint8Array(input).slice().buffer);
    const zip=await ZIP.loadAsync(raw,{checkCRC32:false});if(!zip.file('word/document.xml'))throw new Error('La plantilla no contiene word/document.xml.');
    const img=await imageInfo(data.profile.firma,data.profile.firmaSize),media=img&&`word/media/essa_firma.${img.ext}`;if(img){zip.file(media,img.bytes);await ensureContentType(zip,img.ext,img.mime);}
    const parts=Object.keys(zip.files).filter(n=>/^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments\d*)\.xml$/.test(n));
    const stats={tokens:new Set(base&&base.detected||[]),missing:new Set()};for(const k of stats.tokens)if(!data.lookup[k]&&!(k==='PRIMER_NOMBRE'&&data.lookup.TIPO_PERSONA_DETECTADO==='Persona jurídica'))stats.missing.add(k);
    for(const part of parts){const rid='rIdEssaFirma',src=await zip.file(part).async('string'),res=replaceXml(src,data.lookup,img?{...img,rid}:null,stats);zip.file(part,res.xml);if(res.signatureUsed&&img)await addImageRelationship(zip,part,rid,`media/essa_firma.${img.ext}`);}
    const out=await zip.generateAsync({type:'blob',mimeType:DOCX_MIME,compression:'DEFLATE',compressionOptions:{level:6}},m=>onProgress&&onProgress(m.percent));
    return {blob:out,stats:{engine:base&&base.engine||'ooxml-integrado',tokens:[...stats.tokens],missing:[...stats.missing]}};
  }
  /* ---------- Bloques de marcadores ----------
     Antes de cualquier motor, une en el XML de la plantilla cada aparición de dos marcadores DISTINTOS del bloque
     separados solo por un conector (vacío, espacios, tabulaciones, saltos de línea w:br, conectores cortos como
     “de”, “y”, “-”, “,”…; también a través de un salto de párrafo) en un único marcador KEY1. Así el valor
     se escribe UNA vez y en la posición del primer marcador. Un KEY2 suelto queda vacío si el bloque ya aparece. */
  const BLOCK_CONNECTOR=/^[\s\u00a0,;:.\-–—\/|]*(?:(?:de|del|y|e|con|fecha|el|la|d[ií]a)[\s\u00a0,;:.\-–—\/|]*){0,3}$/i;
  const RUN_CHILDREN=new Set(['t','br','cr','tab']);
  function paragraphSegments(p){
    const segs=[];let text='';
    Array.from(p.getElementsByTagNameNS(W,'*')).forEach(n=>{
      if(!RUN_CHILDREN.has(n.localName)||!n.parentNode||n.parentNode.localName!=='r')return;
      const v=n.localName==='t'?(n.textContent||''):n.localName==='tab'?'\t':'\n';
      segs.push({node:n,start:text.length,end:text.length+v.length,isText:n.localName==='t'});text+=v;});
    return {segs,text};
  }
  function editRange(p,start,end,replacement){
    const {segs}=paragraphSegments(p);let placed=false;
    segs.forEach(sg=>{
      if(sg.end<=start||sg.start>=end){return;}
      if(!sg.isText){sg.node.parentNode.removeChild(sg.node);return;}
      const v=sg.node.textContent||'',a=Math.max(0,start-sg.start),b=Math.min(v.length,end-sg.start);
      const next=v.slice(0,a)+(!placed&&replacement?replacement:'')+v.slice(b);placed=placed||!!replacement;
      sg.node.textContent=next;if(/^\s|\s$/.test(next))sg.node.setAttribute('xml:space','preserve');
    });
  }
  function tokenPositions(text,keys){const out=[];let m;TOKEN_RE.lastIndex=0;while((m=TOKEN_RE.exec(text))){const key=normKey(m.slice(1).find(Boolean));if(keys.includes(key))out.push({key,token:m[0],start:m.index,end:m.index+m[0].length});}return out;}
  const isBlankParagraph=p=>!paragraphSegments(p).text.trim()&&!q(p,'drawing').length&&!q(p,'pict').length&&!q(p,'object').length;
  function collapseBlocksInDoc(doc,block,stats){
    const [k1]=block.keys;
    q(doc,'p').forEach(p=>{
      for(let guard=0;guard<50;guard++){
        const {text}=paragraphSegments(p),toks=tokenPositions(text,block.keys);let hit=null;
        for(let i=0;i+1<toks.length;i++){if(toks[i].key!==toks[i+1].key&&BLOCK_CONNECTOR.test(text.slice(toks[i].end,toks[i+1].start))){hit=[toks[i],toks[i+1]];break;}}
        if(!hit)break;
        editRange(p,hit[0].start,hit[1].end,'['+k1+']');stats.pairs++;
      }
    });
    q(doc,'p').forEach(p1=>{
      if(!p1.parentNode)return;
      const a=paragraphSegments(p1),ta=tokenPositions(a.text,block.keys),last=ta[ta.length-1];
      if(!last||!BLOCK_CONNECTOR.test(a.text.slice(last.end)))return;
      const between=[];let n=p1.nextElementSibling;
      while(n&&n.localName==='p'&&isBlankParagraph(n)&&between.length<3){between.push(n);n=n.nextElementSibling;}
      if(!n||n.localName!=='p')return;
      const b=paragraphSegments(n),tb=tokenPositions(b.text,block.keys),first=tb[0];
      if(!first||first.key===last.key||!BLOCK_CONNECTOR.test(b.text.slice(0,first.start)))return;
      editRange(p1,last.start,a.text.length,'['+k1+']');editRange(n,0,first.end,'');
      between.forEach(x=>x.parentNode.removeChild(x));
      if(isBlankParagraph(n))n.parentNode.removeChild(n);
      stats.pairs++;
    });
    q(doc,'p').forEach(p=>tokenPositions(paragraphSegments(p).text,block.keys).forEach(t=>{stats.remaining[t.key]=(stats.remaining[t.key]||0)+1;}));
  }
  /* ---------- Color de los campos reemplazados ----------
     Única regla de formato para los marcadores. Se aplica sobre la plantilla ANTES de cualquier motor (docxtemplater,
     easy-template-x u ooxml-integrado), así todos heredan el mismo resultado: cada marcador se aísla en su propio w:r
     (clonando su w:rPr, sin tocar el texto vecino) y recibe color directo negro. Esto anula el gris que traiga la
     plantilla (color directo, color de tema o estilo «Texto del marcador de posición»).
     Excepción explícita: los campos de FIELD_COLOR_KEEP conservan exactamente el formato de la plantilla. */
  const FIELD_COLOR='000000';
  const FIELD_COLOR_KEEP=new Set(['CORREO_SOLICITANTE']);
  const keepsTemplateColor=key=>FIELD_COLOR_KEEP.has(normKey(key));
  /* Hijos de w:rPr que deben ir DESPUÉS de w:color según el esquema OOXML (orden estricto para Word). */
  const RPR_AFTER_COLOR=new Set(['spacing','w','kern','position','sz','szCs','highlight','u','effect','bdr','shd','fitText','vertAlign','rtl','cs','em','lang','eastAsianLayout','specVanish','oMath','rPrChange']);
  const wChild=(n,local)=>Array.from(n.childNodes).find(c=>c.nodeType===1&&c.namespaceURI===W&&c.localName===local)||null;
  function setRunColor(run){
    if(!run||run.localName!=='r')return false;const doc=run.ownerDocument;
    let rPr=wChild(run,'rPr');if(!rPr){rPr=doc.createElementNS(W,'w:rPr');run.insertBefore(rPr,run.firstChild);}
    let color=wChild(rPr,'color');
    if(!color){color=doc.createElementNS(W,'w:color');rPr.insertBefore(color,Array.from(rPr.childNodes).find(c=>c.nodeType===1&&RPR_AFTER_COLOR.has(c.localName))||null);}
    color.setAttributeNS(W,'w:val',FIELD_COLOR);['themeColor','themeTint','themeShade'].forEach(a=>{color.removeAttributeNS(W,a);color.removeAttribute('w:'+a);});
    return true;
  }
  /* Parte un w:t en `offset`: el resto del texto (y lo que siga en el run) pasa a un w:r nuevo con el mismo w:rPr. */
  function splitTextNode(t,offset){
    const run=t.parentNode,doc=t.ownerDocument,text=t.textContent||'';
    if(!run||run.localName!=='r'||!run.parentNode||offset<=0||offset>=text.length)return;
    const r2=doc.createElementNS(W,'w:r'),rPr=wChild(run,'rPr');if(rPr)r2.appendChild(rPr.cloneNode(true));
    const t2=doc.createElementNS(W,'w:t');t2.textContent=text.slice(offset);r2.appendChild(t2);
    let n=t.nextSibling;while(n){const nx=n.nextSibling;r2.appendChild(n);n=nx;}
    t.textContent=text.slice(0,offset);
    [t,t2].forEach(x=>{if(/^\s|\s$/.test(x.textContent))x.setAttribute('xml:space','preserve');});
    run.parentNode.insertBefore(r2,run.nextSibling);
  }
  function textBoundary(p,pos){
    let at=0;for(const t of q(p,'t')){const len=(t.textContent||'').length;if(pos>at&&pos<at+len){splitTextNode(t,pos-at);return;}at+=len;}
  }
  function colorTokenRuns(p){
    /* Mismo criterio de detección que replaceToken (concatenación de los w:t del párrafo + TOKEN_RE). */
    const full=q(p,'t').map(t=>t.textContent||'').join(''),hits=[];let m,count=0;TOKEN_RE.lastIndex=0;
    while((m=TOKEN_RE.exec(full))){const key=m.slice(1).find(Boolean);if(normKey(key)&&!keepsTemplateColor(key))hits.push([m.index,m.index+m[0].length]);}
    hits.forEach(([start,end])=>{
      textBoundary(p,start);textBoundary(p,end);
      let at=0;q(p,'t').forEach(t=>{const len=(t.textContent||'').length;if(len&&at>=start&&at+len<=end&&setRunColor(t.parentNode))count++;at+=len;});
    });
    return count;
  }
  function applyFieldColor(doc){
    let count=0;
    q(doc,'fldSimple').forEach(f=>{const m=/\bMERGEFIELD\s+(?:"([^"]+)"|([^\\\s]+))/i.exec(attr(f,'instr')||'');if(!m||keepsTemplateColor(m[1]||m[2]))return;q(f,'r').forEach(r=>{if(setRunColor(r))count++;});});
    q(doc,'p').forEach(p=>{if(!q(p,'p').length)count+=colorTokenRuns(p);});
    return count;
  }
  /* Preparación de la plantilla (un solo paso sobre el ZIP): 1) bloques de marcadores, 2) color de los campos. */
  async function applyTokenBlocks(blob,data){
    const blocks=(data&&data.blocks)||[];
    if(!ZIP)throw new Error('JSZip no está disponible.');
    const zip=await ZIP.loadAsync(await blob.arrayBuffer(),{checkCRC32:false});
    const parts=Object.keys(zip.files).filter(n=>/^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments\d*)\.xml$/.test(n));
    const lookup={...data.lookup},blockStats=[];
    for(const block of blocks){
      const stats={keys:block.keys.slice(),pairs:0,found:{},remaining:{}};
      for(const part of parts){
        const xml=await zip.file(part).async('string'),doc=new DOMParser().parseFromString(xml,'application/xml');
        if(doc.getElementsByTagName('parsererror').length)continue;
        q(doc,'p').forEach(p=>tokenPositions(paragraphSegments(p).text,block.keys).forEach(t=>{stats.found[t.key]=(stats.found[t.key]||0)+1;}));
        const before=stats.pairs;collapseBlocksInDoc(doc,block,stats);
        if(stats.pairs!==before)zip.file(part,new XMLSerializer().serializeToString(doc));
      }
      const [k1,k2]=block.keys;
      lookup[k1]=block.value;
      lookup[k2]=(stats.pairs||stats.remaining[k1])?'':block.value;
      blockStats.push(stats);
    }
    let colored=0;
    for(const part of parts){
      const doc=new DOMParser().parseFromString(await zip.file(part).async('string'),'application/xml');
      if(doc.getElementsByTagName('parsererror').length)continue;
      const n=applyFieldColor(doc);if(n){colored+=n;zip.file(part,new XMLSerializer().serializeToString(doc));}
    }
    if(!blocks.length&&!colored)return {blob,data,blockStats:null};
    const out=await zip.generateAsync({type:'blob',mimeType:DOCX_MIME,compression:'DEFLATE'});
    return {blob:out,data:{...data,lookup},blockStats:blocks.length?blockStats:null};
  }
  async function generateDocx(blob,data,onProgress){
    const pre=await applyTokenBlocks(blob,data);blob=pre.blob;data=pre.data;
    const failures=[],engines=[];if(PIZZIP&&templaterCtor())engines.push(['docxtemplater',generateWithDocxtemplater]);if(easyHandlerCtor())engines.push(['easy-template-x',generateWithEasyTemplateX]);engines.push(['ooxml-integrado',async b=>({buffer:await b.arrayBuffer(),detected:new Set(),engine:'ooxml-integrado'})]);
    for(const [name,fn] of engines){try{onProgress&&onProgress(name==='docxtemplater'?8:name==='easy-template-x'?12:18);const prepared=await timeout(fn(blob,data),RENDER_TIMEOUT_MS,'El generador '+name);const result=await finalizeGenerated(prepared.buffer,data,onProgress,prepared);result.stats.blocks=pre.blockStats;technicalLog('info','generate-ready',name,new Error('ok'),result.blob,{tokens:result.stats.tokens.length,missing:result.stats.missing});return result;}catch(err){failures.push({engine:name,...errorData(err)});technicalLog('warn','generate',name,err,blob);}}
    const e=new Error('Todos los motores de generación fallaron.');e.failures=failures;throw e;
  }

  function hashText(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  let generationSeq=0,generationKey='',generationStats=null,autoTimer=null;
  function currentGenerationKey(meta,data){return [meta.id,meta.size||0,meta.lastModified||0,hashText(JSON.stringify(data.lookup)),hashText(String(data.profile.firma||''))].join('|');}
  function invalidateGenerated(auto=true){generationSeq++;generationKey='';generationStats=null;generatedBlob=null;generatedName='';generatedFromId=null;downloadBtn.hidden=true;lastRenderKey='';clearTimeout(autoTimer);if(bg){bg.disabled=true;bg.classList.add('locked');}if(auto){mode='generated';autoTimer=setTimeout(()=>renderDocument('generated',true),120);}}
  async function prepareGenerated(force,onProgress){
    const meta=selectedMeta(),blob=selectedBlob();
    if(!meta||!blob){emptyState('Sin plantilla seleccionada','Selecciona una plantilla','Carga o selecciona una plantilla Word desde Recursos.');return null;}
    if(!activeRecord){emptyState('Sin datos disponibles','Selecciona un trámite','El documento generado necesita un trámite real de SAC Trámite Excel.');return null;}
    const data=replacementData(),key=currentGenerationKey(meta,data);
    if(!force&&generatedBlob&&generatedFromId===meta.id&&generationKey===key)return generatedBlob;
    const seq=++generationSeq;setState('loading','Procesando y reemplazando campos','Aplicando automáticamente los datos reales del trámite sobre una copia de la plantilla…');
    const result=await generateDocx(blob,data,onProgress);if(seq!==generationSeq)return null;
    generatedBlob=result.blob;generationStats=result.stats;generationKey=key;generatedFromId=meta.id;
    const rad=valueText(sacValue(activeRecord,['RADICADO_ENTRADA','NUMERO_PROCESO']));generatedName=safeName(meta.fileName)+(rad?'_'+safeName(rad):'_generado')+'.docx';return generatedBlob;
  }
  async function renderBlob(blob,key,seq){
    setState('loading',mode==='generated'?'Renderizando documento generado':'Preparando vista previa','Validando e interpretando el documento directamente en tu navegador…');await nextFrame();
    let pkg;
    try{pkg=await timeout(inspectDocx(blob),RENDER_TIMEOUT_MS,'La validación del DOCX');}
    catch(err){if(seq!==renderSeq)return;technicalLog('error','validate','jszip',err,blob);setState('error','Error al generar','No fue posible procesar o mostrar este DOCX. Comprueba que el archivo no esté vacío o dañado.');return;}
    const engines=[];if(DOCX_RENDERER&&(typeof DOCX_RENDERER.render==='function'||typeof DOCX_RENDERER.renderAsync==='function'))engines.push(['docx-renderer',renderDocxRenderer]);if(DOCX&&typeof DOCX.renderAsync==='function')engines.push(['docx-preview',renderPrimary]);if(MAMMOTH&&typeof MAMMOTH.convertToHtml==='function')engines.push(['mammoth',renderMammoth]);engines.push(['ooxml-integrado',renderFallback]);
    const failures=[];let used='';
    for(const [name,fn] of engines){
      if(seq!==renderSeq)return;canvas.innerHTML='';if(styleHost)styleHost.innerHTML='';clearObjectUrls();
      try{await timeout(fn(pkg),RENDER_TIMEOUT_MS,'El renderer '+name);const quality=previewQuality(pkg);if(!quality.ok)throw new Error('Vista descartada por control de calidad: '+quality.reason+` (${quality.actual}/${quality.expected} caracteres).`);used=name;break;}
      catch(err){failures.push({renderer:name,...errorData(err)});technicalLog('warn','render',name,err,blob,{entries:pkg.entries});}
    }
    if(seq!==renderSeq)return;
    if(!used){const err=new Error('Todos los renderers disponibles fallaron.');technicalLog('error','render-pipeline','all',err,blob,{failures,entries:pkg.entries,relationshipParts:pkg.relationshipParts});setState('error','Error al generar','No fue posible procesar o mostrar este DOCX. Comprueba que el archivo no esté vacío o dañado.');return;}
    canvas.dataset.renderer=used;console.info('[Asistente Documental][DOCX]',{step:'ready',renderer:used,file:(selectedMeta()||{}).fileName,size:blob.size,mode});
    lastRenderKey=key;setState('ready','','');await nextFrame();
    /* docx-renderer recibe el lienzo oculto durante el estado de carga; sin dimensiones no puede
       dividir el desbordamiento natural. Repetir solo su fase de paginación con el lienzo visible. */
    if(used==='docx-renderer'&&DOCX_RENDERER&&typeof DOCX_RENDERER.paginate==='function'){DOCX_RENDERER.paginate(canvas);await nextFrame();}
    applyHeaderFloatTargets(headerTargets=await headerFloatTargets(pkg.zip));
    collectPreviewPages();fitPages();
  }
  async function renderDocument(kind,force){
    if(window.__AD_SYNC_SELECTION_GUIDE)window.__AD_SYNC_SELECTION_GUIDE();
    const requestedMode=kind||mode;mode=requestedMode;const meta=selectedMeta();sbtns.forEach((b,i)=>{const on=(requestedMode==='template'?i===0:i===1);b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});slider.classList.toggle('pos-1',requestedMode==='generated');
    if(!meta){stage.classList.remove('has-template');emptyState('Sin plantilla seleccionada','Selecciona una plantilla','Las plantillas cargadas en Recursos aparecerán aquí automáticamente.');return;}
    stage.classList.add('has-template');let blob,key;
    if(requestedMode==='generated'){
      renderSeq++;if(!activeRecord){emptyState('Sin datos disponibles','Selecciona un trámite','El documento se generará automáticamente cuando selecciones un registro real.');return;}
      try{blob=await prepareGenerated(!!force);if(!blob||mode!==requestedMode)return;}catch(err){if(mode!==requestedMode)return;technicalLog('error','generate','ooxml-generator',err,selectedBlob());setState('error','Error al generar','La plantilla puede estar dañada o usar una estructura DOCX no compatible.');return;}
      key='generated:'+generationKey+':'+blob.size;
    }else{blob=selectedBlob();key='template:'+meta.id+':'+(blob&&blob.size)+':'+(meta.lastModified||0);}
    if(!blob||typeof blob.arrayBuffer!=='function'||!blob.size){const err=new Error('Archivo vacío o no disponible');technicalLog('error','precondition','input',err,blob);setState('error','Error al generar','El archivo está vacío o ya no está disponible. Vuelve a cargarlo en Recursos.');return;}
    if(!/\.docx$/i.test(meta.fileName||'')){const err=new Error('Extensión distinta de .docx');technicalLog('error','precondition','input',err,blob);setState('error','Error al generar','El archivo seleccionado no es un DOCX.');return;}
    if(!force&&lastRenderKey===key&&host.dataset.state==='ready')return;const seq=++renderSeq;await renderBlob(blob,key,seq);
  }

  function recordIdentity(r){
    if(!r)return'';
    const parts=['RADICADO_ENTRADA','NUMERO_PROCESO','NUMERO_CUENTA','CEDULA_SOLICITANTE','FECHA_SOLICITUD'].map(k=>valueText(sacValue(r,[k])));
    if(parts.some(Boolean))return parts.join('\u001f');
    if(typeof r==='object'){if(!fallbackRecordIds.has(r))fallbackRecordIds.set(r,'local-'+(++fallbackRecordSeq));return fallbackRecordIds.get(r);}
    return String(r);
  }
  function populateRecord(r){
    const inputs=Array.from(document.querySelectorAll('#panelSolicitante .field input'));
    const vals=r?[sacValue(r,['NOMBRE_SOLICITANTE','NOMBRE_SUSCRIPTOR']),sacValue(r,['RADICADO_SALIDA']),sacValue(r,['DIRECCION_SOLICITANTE','DIRECCION_SUSCRIPTOR','DIRECCION']),sacValue(r,['DEPTO_SOLICITANTE','DEPARTAMENTO_SOLICITANTE','DEPARTAMENTO_SUSCRIPTOR','DEPARTAMENTO']),sacValue(r,['MUNICIPIO_SOLICITANTE','MUNICIPIO_SUSCRIPTOR']),sacValue(r,['CORREO_SOLICITANTE','CORREO_SUSCRIPTOR','CORREO','EMAIL'])]:['','','','','',''];
    inputs.forEach((i,k)=>{const t=valueText(vals[k]);i.value=CAMPOS_TITULO.includes(k)?formatoTitulo(t):(k===IDX_CORREO?correoMin(t):t);i.dispatchEvent(new Event('input',{bubbles:true}));});
    /* Relación unívoca desde la tabla `descs`: cada campo lee EXCLUSIVAMENTE su columna (sin respaldos). */
    descs.forEach(d=>{const el=document.getElementById(d.id);if(!el)return;const v=r?sacValue(r,[d.col]):'';el.value=v==null?'':String(v);el.dispatchEvent(new Event('input',{bubbles:true}));});
  }
  window.addEventListener('ad-record-change',e=>{
    const nextRecord=e.detail||null,nextKey=recordIdentity(nextRecord),recordChanged=nextKey!==lastPopulatedRecordKey;
    activeRecord=nextRecord;
    /* Re-poblar únicamente al cambiar realmente de registro; plantilla, perfil y regeneración conservan la edición. */
    if(recordChanged){populateRecord(activeRecord);lastPopulatedRecordKey=nextKey;setTextoRadicacion(false);}
    invalidateGenerated(false);mode='generated';renderDocument('generated',true);
  });
  pl.addEventListener('click',e=>{const it=e.target.closest('.plantilla-item');if(!it)return;setTextoRadicacion(false);invalidateGenerated(false);mode='generated';renderDocument('generated',true);});
  sbtns.forEach((b,i)=>b.addEventListener('click',()=>renderDocument(i===0?'template':'generated')));
  retry.addEventListener('click',()=>renderDocument(mode,true));
  document.querySelectorAll('#panelSolicitante input,.desc-panel textarea').forEach(el=>el.addEventListener('input',()=>invalidateGenerated(true)));
  /* Respaldo para ejecuciones fuera del shell; dentro del Asistente la reactividad llega por DocStore. */
  addEventListener('storage',e=>{if(e.key==='essa-perfil'){invalidateGenerated(false);mode='generated';renderDocument('generated',true);}});

  function triggerDownload(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name||'documento_generado.docx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
  bg.addEventListener('click',e=>{
    if(bg.disabled||!generatedBlob||mode!=='generated'||host.dataset.state!=='ready'){e.preventDefault();return;}
    const txt=bg.querySelector('.bg-txt'),setTxt=v=>{bg.classList.add('swap');setTimeout(()=>{txt.textContent=v;bg.classList.remove('swap');},120);};triggerDownload(generatedBlob,generatedName);bg.classList.add('done');setTxt('Documento descargado');window.celebrate&&celebrate();setTimeout(()=>{bg.classList.remove('done');setTxt('Generar documento');},1700);
  });
  if(window.AD&&AD.store){const off=AD.store.subscribe((snap,evt)=>{if(evt&&evt.key==='plantillas'&&asignada){const exists=AD.store.getTemplates().some(t=>t.id===asignada);invalidateGenerated(false);mode='generated';renderDocument('generated',true);}else if(evt&&evt.key==='perfil'){invalidateGenerated(false);mode='generated';renderDocument('generated',true);}});addEventListener('pagehide',()=>off());}
  addEventListener('pagehide',()=>{clearTimeout(autoTimer);clearObjectUrls();cancelAnimationFrame(paginationFrame);if(resizeObserver)resizeObserver.disconnect();if(pageObserver)pageObserver.disconnect();generationSeq++;generatedBlob=null;});
  /* Acción del botón: regenera el documento actual con el texto de construcción y valida el resultado. */
  const btnTR=document.getElementById('btnTextoRad');
  async function agregarTextoRadicacion(){
    const M=window.radicacionMagic;
    if(!activeRecord||!selectedMeta()||!selectedBlob()){
      M.warn('Primero prepara el documento',!activeRecord?'Selecciona un trámite y una plantilla para agregar el texto de radicación.':'Selecciona una plantilla para agregar el texto de radicación.');return;}
    const previo=textoRadicacionActivo,txt=btnTR.querySelector('.tr-txt');
    btnTR.classList.add('is-busy');btnTR.setAttribute('aria-busy','true');txt.textContent='Agregando texto…';
    try{
      setTextoRadicacion(true);invalidateGenerated(false);mode='generated';
      await renderDocument('generated',true);
      if(host.dataset.state!=='ready'||!generatedBlob)throw new Error('La vista previa no terminó correctamente ('+host.dataset.state+').');
      const st=(generationStats&&generationStats.blocks&&generationStats.blocks[0])||{found:{},pairs:0},hallados=CAMPOS_RADICACION.filter(k=>st.found[k]);
      if(!hallados.length){
        setTextoRadicacion(previo);
        if(!previo){invalidateGenerated(false);await renderDocument('generated',true);}
        M.warn('La plantilla no tiene campos de radicación','No se encontraron [RADICADO_SALIDA] ni [FECHA_RAD_SALIDA] en este documento.');return;
      }
      M.success(st.pairs?'[RADICADO_SALIDA] y [FECHA_RAD_SALIDA] se unificaron en «'+TEXTO_RADICACION+'».'
        :hallados.length===1?'Se reemplazó ['+hallados[0]+']. La plantilla no contiene ['+CAMPOS_RADICACION.find(k=>k!==hallados[0])+'].'
        :'Se reemplazó [RADICADO_SALIDA] por «'+TEXTO_RADICACION+'».');
    }catch(err){
      technicalLog('error','texto-radicacion','ooxml-generator',err,selectedBlob());
      setTextoRadicacion(previo);invalidateGenerated(false);renderDocument('generated',true);
      M.error('No se pudo agregar el texto de radicación','Ocurrió un problema al procesar el documento. Inténtalo de nuevo o revisa la plantilla.');
    }finally{btnTR.classList.remove('is-busy');btnTR.removeAttribute('aria-busy');txt.textContent='Agregar texto de radicación';}
  }
  if(btnTR)btnTR.addEventListener('click',agregarTextoRadicacion);

  window.__AD_DOCX_DIAGNOSTICS=Object.freeze({tokensIn,inspectDocx,generateDocx,generateWithDocxtemplater,generateWithEasyTemplateX,finalizeGenerated,renderBlob,replacementData,getGenerationStats:()=>generationStats,getRenderer:()=>canvas.dataset.renderer||'',getDownloadState:()=>({mode,hasBlob:!!generatedBlob,name:generatedName,ready:host.dataset.state==='ready',buttonDisabled:!!bg.disabled})});
  downloadBtn.hidden=true;renderDocument('generated',false);
})();

/* =====================================================================
   TALLER DE PLANTILLAS · “Construye tu propia plantilla”
   Experiencia guiada de 3 pasos. Campos, ejemplos y simulación usan la MISMA detección de marcadores
   (tokensIn) y los MISMOS datos (replacementData) que el generador real del Módulo 3.
   ===================================================================== */
(function(){
  const btn=document.getElementById('btnConstruir');if(!btn)return;
  const D=()=>window.__AD_DOCX_DIAGNOSTICS||null;
  const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const I=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
  const IC={
    wand:'<path d="m4 20 10.5-10.5"/><path d="m13 8 3 3"/><path d="M18 3v3M16.5 4.5h3M20 10v2M19 11h2M9 3.5v2M8 4.5h2"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    doc:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    brackets:'<path d="M8 3H5v18h3M16 3h3v18h-3"/><path d="M9.5 12h5"/>',
    upload:'<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    spark:'<path d="M12 3 9.8 9.3 3 11l6.8 2.3L12 20l2.3-6.7L21 11l-6.8-1.7z"/>',
    bulb:'<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    right:'<path d="M5 12h14M13 6l6 6-6 6"/>',left:'<path d="M19 12H5M11 6l-6 6 6 6"/>',down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13h8"/>',
    text:'<path d="M4 6h16M4 12h16M4 18h10"/>',pen:'<path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
    reset:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'
  };
  /* Catálogo didáctico: SOLO campos que el generador reemplaza (ver replacementData). */
  const FIELDS=[
    {g:'Solicitante',k:'DISTINTIVO',d:'Tratamiento de cortesía para el destinatario.',w:'[DISTINTIVO]',ej:'Señor(a)'},
    {g:'Solicitante',k:'NOMBRE_SOLICITANTE',d:'Nombre completo del cliente o solicitante.',w:'Estimado(a) [NOMBRE_SOLICITANTE]',ej:'Juan Carlos Pérez Gómez'},
    {g:'Solicitante',k:'PRIMER_NOMBRE',d:'Solo el primer nombre, para un saludo cercano.',w:'Hola, [PRIMER_NOMBRE]:',ej:'Juan'},
    {g:'Solicitante',k:'DIRECCION_SOLICITANTE',d:'Dirección de notificación registrada.',w:'Dirección: [DIRECCION_SOLICITANTE]',ej:'Carrera 27 # 45-12'},
    {g:'Solicitante',k:'MUNICIPIO_SOLICITANTE',d:'Municipio del solicitante.',w:'Ciudad: [MUNICIPIO_SOLICITANTE]',ej:'Bucaramanga'},
    {g:'Solicitante',k:'DEPARTAMENTO_SOLICITANTE',d:'Departamento del solicitante.',w:'[DEPARTAMENTO_SOLICITANTE]',ej:'Santander'},
    {g:'Solicitante',k:'CORREO_SOLICITANTE',d:'Correo electrónico de contacto.',w:'Correo: [CORREO_SOLICITANTE]',ej:'cliente@correo.com'},
    {g:'Solicitante',k:'TELEFONO_SOLICITANTE',d:'Número celular del solicitante.',w:'Celular: [TELEFONO_SOLICITANTE]',ej:'3001234567'},
    {g:'Trámite',k:'RADICADO_ENTRADA',d:'Radicado con el que llegó la solicitud.',w:'Radicado [RADICADO_ENTRADA]',ej:'20261000012345'},
    {g:'Trámite',k:'NUMERO_PROCESO',d:'Número del proceso creado en SAC.',w:'Proceso No. [NUMERO_PROCESO]',ej:'900125'},
    {g:'Trámite',k:'NUMERO_CUENTA',d:'Cuenta del servicio asociada al trámite.',w:'Cuenta [NUMERO_CUENTA]',ej:'3001458921'},
    {g:'Trámite',k:'FECHA_SOLICITUD',d:'Fecha en que el cliente hizo la solicitud.',w:'Recibida el [FECHA_SOLICITUD]',ej:'2 de octubre de 2026'},
    {g:'Trámite',k:'RADICADO_SALIDA',d:'Radicado de la respuesta (si ya existe).',w:'Rad. salida [RADICADO_SALIDA]',ej:'20262000067890'},
    {g:'Trámite',k:'FECHA_RAD_SALIDA',d:'Fecha de la respuesta (el día de hoy).',w:'Bucaramanga, [FECHA_RAD_SALIDA]',ej:'6 de octubre de 2026'},
    {g:'Descripciones del documento',k:'OBSERVACION_PROCESO',d:'Lo que pide el cliente (Descripción de la solicitud).',w:'Solicitud: [OBSERVACION_PROCESO]',ej:'Solicita revisión del consumo facturado.'},
    {g:'Descripciones del documento',k:'OBSERVACION_REVISION',d:'Hallazgos de la revisión (Observación del insumo).',w:'Se encontró: [OBSERVACION_REVISION]',ej:'Medidor verificado en sitio.'},
    {g:'Descripciones del documento',k:'OBSERVACION_DECISION',d:'Resultado y justificación de la decisión.',w:'Decisión: [OBSERVACION_DECISION]',ej:'Se reliquida el consumo.'},
    {g:'Firmante',k:'NOMBRE_FIRMANTE',d:'Tu nombre, tomado del bloque Firmante.',w:'Atentamente, [NOMBRE_FIRMANTE]',ej:'Laura Andrea Báez'},
    {g:'Firmante',k:'FIRMA_DOCUMENTO',d:'Tu firma como imagen, tomada del bloque Firmante.',w:'[FIRMA_DOCUMENTO]',ej:'__ESSA_SIGNATURE__'}
  ];
  const GROUPS={'Solicitante':{c:'tg-g1',ic:IC.user},'Trámite':{c:'tg-g2',ic:IC.folder},'Descripciones del documento':{c:'tg-g3',ic:IC.text},'Firmante':{c:'tg-g4',ic:IC.pen}};
  const BY_KEY=Object.fromEntries(FIELDS.map(f=>[f.k,f]));
  const SAMPLE='[DISTINTIVO]\n[NOMBRE_SOLICITANTE]\n[DIRECCION_SOLICITANTE]\n[MUNICIPIO_SOLICITANTE], [DEPARTAMENTO_SOLICITANTE]\n\nEstimado(a) [PRIMER_NOMBRE]:\n\nDamos respuesta a su solicitud con radicado [RADICADO_ENTRADA] y proceso [NUMERO_PROCESO], asociada a la cuenta [NUMERO_CUENTA].\n\n[OBSERVACION_DECISION]\n\nAtentamente,\n[FIRMA_DOCUMENTO]\n[NOMBRE_FIRMANTE]';
  const SIM_START='Estimado(a) [NOMBRE_SOLICITANTE],\n\nNos dirigimos a usted respecto a la solicitud con radicado [RADICADO_ENTRADA] y proceso [NUMERO_PROCESO], asociada a su cuenta [NUMERO_CUENTA].';
  const HERO='[DISTINTIVO]\n[NOMBRE_SOLICITANTE]\n\nRespuesta al radicado [RADICADO_ENTRADA], proceso [NUMERO_PROCESO].';
  const QUICK=['NOMBRE_SOLICITANTE','PRIMER_NOMBRE','DIRECCION_SOLICITANTE','MUNICIPIO_SOLICITANTE','RADICADO_ENTRADA','NUMERO_PROCESO','NUMERO_CUENTA','FECHA_RAD_SALIDA','OBSERVACION_DECISION'];
  const STEPS=[
    {t:'Cómo funciona',s:'4 pasos sencillos',h:'Tu Word + campos = respuesta lista',p:'El sistema busca en tu Word las palabras escritas entre corchetes y las cambia por la información real del trámite.'},
    {t:'Campos disponibles',s:'Copia y pega en Word',h:'Elige los datos que quieres en tu carta',p:'Selecciona un campo para ver cómo funciona y cópialo para pegarlo en tu Word donde quieras que aparezca.'},
    {t:'Pruébalo en vivo',s:'Simulador interactivo',h:'Mira cómo quedará tu carta',p:'Escribe un fragmento de tu plantilla o inserta campos con un clic, y observa el resultado al instante.'}
  ];
  const tok=k=>'<span class="tg-tok"><i>[</i>'+esc(k)+'<i>]</i></span>';
  const groups=[...new Set(FIELDS.map(f=>f.g))];

  /* ---------- marcado ---------- */
  const fieldRow=f=>{const G=GROUPS[f.g];return '<div class="tg-field '+G.c+'" role="option" tabindex="0" aria-selected="false" data-k="'+f.k+'" data-s="'+esc((f.k+' '+f.d+' '+f.g).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''))+'">'+
    '<span class="tg-fic">'+I(G.ic)+'</span><span class="tg-fmain"><code>['+f.k+']</code><small>'+esc(f.d)+'</small></span>'+
    '<button type="button" class="tg-copy" data-copy="['+f.k+']" aria-label="Copiar ['+f.k+']">'+I(IC.copy)+'<span>Copiar</span></button>'+
    '<div class="tg-fmore" data-more="'+f.k+'"></div></div>';};
  const ov=document.createElement('div');ov.className='tg-overlay';ov.id='tgModal';ov.setAttribute('aria-hidden','true');
  ov.innerHTML=
  '<section class="tg-modal" role="dialog" aria-modal="true" aria-labelledby="tgTitle">'+
    '<aside class="tg-rail">'+
      '<div class="tg-brand"><span class="tg-logo">'+I(IC.wand)+'</span><div><small>Taller de plantillas</small><b id="tgTitle">Construye tu propia plantilla</b></div>'+
        '<button type="button" class="tg-close tg-close-m" aria-label="Cerrar tutorial">'+I(IC.x)+'</button></div>'+
      '<ol class="tg-steps" role="tablist" aria-label="Pasos del tutorial">'+STEPS.map((x,i)=>'<li class="tg-step" role="tab" tabindex="0" data-go="'+i+'" aria-controls="tgP'+i+'"><span class="tg-num"><span>'+(i+1)+'</span>'+I(IC.check)+'</span><span class="tg-txt"><b>'+x.t+'</b><small>'+x.s+'</small></span></li>').join('')+'</ol>'+
      '<div class="tg-rail-card"><span class="tg-rc-ic">'+I(IC.doc)+'</span><b>¿Prefieres partir de un ejemplo?</b><p>Copia una carta modelo con los campos ya ubicados y pégala en Word.</p>'+
        '<button type="button" class="tg-draft" id="tgDraft">'+I(IC.copy)+'Copiar borrador de ejemplo</button></div>'+
    '</aside>'+
    '<div class="tg-stage">'+
      '<header class="tg-stage-head" id="tgHead"><div><span class="tg-eyebrow" id="tgEyebrow"></span><h3 id="tgStageTitle"></h3><p id="tgStageSub"></p></div>'+
        '<button type="button" class="tg-close" aria-label="Cerrar tutorial">'+I(IC.x)+'</button></header>'+
      '<div class="tg-body">'+
        /* ---------- Paso 1 ---------- */
        '<div class="tg-panel" id="tgP0" role="tabpanel">'+
          '<div class="tg-hero"><div><div class="tg-sheet-tag"><i></i>Tu plantilla en Word</div><div class="tg-paper" id="tgHeroIn"></div></div>'+
            '<div class="tg-bridge"><span>'+I(IC.wand)+'</span></div>'+
            '<div><div class="tg-sheet-tag out"><i></i>Documento generado</div><div class="tg-paper" id="tgHeroOut"></div></div></div>'+
          '<ol class="tg-journey">'+
            '<li class="tg-card tg-c1"><span class="tg-node">'+I(IC.doc)+'<em>1</em></span><div><h4>Crea tu documento</h4><p>Diseña la carta en Word como siempre: membrete, tablas y texto. Guárdala como <b>.docx</b>.</p></div></li>'+
            '<li class="tg-card tg-c2"><span class="tg-node">'+I(IC.brackets)+'<em>2</em></span><div><h4>Escribe los campos</h4><p>Donde va un dato del cliente, escribe su campo: '+tok('NOMBRE_SOLICITANTE')+'</p></div></li>'+
            '<li class="tg-card tg-c3"><span class="tg-node">'+I(IC.upload)+'<em>3</em></span><div><h4>Agrégala en Recursos</h4><p>En <b>Módulo 1 · Recursos</b>, carga el archivo o la carpeta en <b>Plantillas Word</b>.</p></div></li>'+
            '<li class="tg-card tg-c4"><span class="tg-node">'+I(IC.spark)+'<em>✓</em></span><div><h4>Úsala aquí</h4><p>Elige la plantilla y un trámite: el documento se llena solo y lo descargas con <b>Generar documento</b>.</p></div></li>'+
          '</ol>'+
          '<div class="tg-cta"><span class="tg-cta-ic">'+I(IC.brackets)+'</span><div><b>¿Qué campos puedo escribir en mi Word?</b><span>Hay '+FIELDS.length+' campos listos para usar. Cópialos con un clic.</span></div>'+
            '<button type="button" class="tg-btn tg-primary" data-go="1">Ver campos disponibles'+I(IC.right)+'</button></div>'+
        '</div>'+
        /* ---------- Paso 2 ---------- */
        '<div class="tg-panel" id="tgP1" role="tabpanel"><div class="tg-cat">'+
          '<div class="tg-cat-list"><label class="tg-search">'+I(IC.search)+'<input type="search" id="tgSearch" placeholder="Buscar campo… (nombre, radicado, fecha)" aria-label="Buscar campo" autocomplete="off"></label>'+
            '<div class="tg-list" role="listbox" aria-label="Campos disponibles">'+
              groups.map(g=>'<section class="tg-group" data-g="'+esc(g)+'"><h4>'+esc(g)+'</h4>'+FIELDS.filter(f=>f.g===g).map(fieldRow).join('')+'</section>').join('')+
              '<div class="tg-empty" id="tgEmpty">'+I(IC.search)+'<b>No encontramos ese campo</b><span>Prueba con otra palabra, como “correo” o “proceso”.</span></div>'+
            '</div></div>'+
          '<div class="tg-detail" id="tgDetail" aria-live="polite"></div>'+
        '</div></div>'+
        /* ---------- Paso 3 ---------- */
        '<div class="tg-panel" id="tgP2" role="tabpanel"><div class="tg-sim">'+
          '<div class="tg-sim-bar"><span>Insertar</span><div class="tg-chips">'+QUICK.map(k=>'<button type="button" class="tg-ins" data-ins="['+k+']"><b>+</b>'+k+'</button>').join('')+'</div></div>'+
          '<div class="tg-sim-grid">'+
            '<div class="tg-pane"><div class="tg-pane-h"><i></i><label for="tgIn">Tu plantilla (Word)</label><span class="tg-sp"></span><button type="button" class="tg-mini" id="tgReset">'+'Restablecer</button></div><textarea id="tgIn" class="tg-paper" spellcheck="false"></textarea></div>'+
            '<div class="tg-swap" aria-hidden="true"><span>'+I(IC.right)+'</span></div>'+
            '<div class="tg-pane"><div class="tg-pane-h"><i class="out"></i>Documento generado<span class="tg-sp"></span><span class="tg-src" id="tgSrc"><i></i><span></span></span></div><div class="tg-result tg-paper" id="tgOut" aria-live="polite"></div></div>'+
          '</div>'+
          '<div class="tg-legend"><span><i style="background:rgba(15,122,108,.35)"></i>Dato reemplazado</span><span><i style="background:#F4EFE7;border:1px solid #E6DBC8"></i>Campo sin dato en este trámite</span><span><i style="background:#FBE7E8;border:1px solid #F3C3C7"></i>Campo no reconocido</span><span class="tg-stats" id="tgStats"></span></div>'+
        '</div></div>'+
      '</div>'+
      '<footer class="tg-foot"><button type="button" class="tg-btn tg-ghost" id="tgBack" aria-label="Atrás">'+I(IC.left)+'Atrás</button>'+
        '<div class="tg-prog"><span class="tg-count" id="tgCount"></span><span class="tg-segs" aria-hidden="true">'+STEPS.map(()=>'<i></i>').join('')+'</span><span class="tg-bar"><i id="tgBar"></i></span></div>'+
        '<button type="button" class="tg-btn tg-primary" id="tgNext"></button></footer>'+
      '<div class="tg-toast" id="tgToast" role="status">'+I(IC.check)+'<span></span></div>'+
    '</div>'+
  '</section>';
  document.body.appendChild(ov);

  const $=s=>ov.querySelector(s),$$=s=>[...ov.querySelectorAll(s)];
  const panels=$$('.tg-panel'),stepEls=$$('.tg-step'),body=$('.tg-body'),next=$('#tgNext'),back=$('#tgBack'),simIn=$('#tgIn'),simOut=$('#tgOut');
  let cur=0,lastFocus=null,toastT=null,selKey='NOMBRE_SOLICITANTE',SRC=null;

  /* ---------- datos: los del trámite activo (mismo generador) o de ejemplo ---------- */
  function sourceData(){
    const d=D();let lookup=null,rad='';
    if(d&&window.__AD_ACTIVE_RECORD){try{lookup=d.replacementData().lookup;rad=lookup.RADICADO_ENTRADA||'';}catch(e){lookup=null;}}
    return {real:!!lookup,rad,get(k){const nk=normKey(k);if(lookup&&Object.prototype.hasOwnProperty.call(lookup,nk))return {v:lookup[nk],known:true};const f=BY_KEY[nk];return f?{v:lookup?'':f.ej,known:true}:{v:'',known:!!(lookup&&nk in lookup)};}};
  }
  const tokens=text=>{const d=D();return d&&d.tokensIn?d.tokensIn(text):[];};
  function renderValue(v,known,raw,i){
    const st=i!=null?' style="--i:'+i+'"':'';
    if(!known)return '<span class="tg-val bad" title="Este campo no existe: revisa cómo está escrito">'+esc(raw)+'</span>';
    if(v==='__ESSA_SIGNATURE__')return '<span class="tg-val sig"'+st+'>✍ Tu firma</span>';
    if(v==='')return '<span class="tg-val empty"'+st+'>sin dato</span>';
    return '<span class="tg-val"'+st+'>'+esc(v)+'</span>';
  }
  function transform(text,fn){let out='',pos=0;tokens(text).forEach((t,i)=>{const at=text.indexOf(t.token,pos);if(at<0)return;out+=esc(text.slice(pos,at))+fn(t,i);pos=at+t.token.length;});return out+esc(text.slice(pos));}
  const asTemplate=text=>transform(text,(t,i)=>'<span class="tg-tok" style="--i:'+i+'"><i>[</i>'+esc(normKey(t.key))+'<i>]</i></span>');
  function simulate(text,src,stats){return transform(text,(t,i)=>{const r=src.get(t.key);if(stats){stats.n++;if(!r.known)stats.bad++;else if(r.v==='')stats.empty++;}return renderValue(r.v,r.known,t.token,i);});}

  /* ---------- paso 1 ---------- */
  function renderHero(){$('#tgHeroIn').innerHTML=asTemplate(HERO);$('#tgHeroOut').innerHTML=simulate(HERO,SRC);}
  /* ---------- paso 2 ---------- */
  function flowHTML(f){
    return '<div class="tg-paper">'+asTemplate(f.w)+'</div><div class="tg-dt-arrow">'+I(IC.down)+'Se convierte en</div><div class="tg-paper out">'+simulate(f.w,SRC)+'</div>';
  }
  function renderDetail(){
    const f=BY_KEY[selKey];if(!f)return;const G=GROUPS[f.g];
    $('#tgDetail').innerHTML='<div class="tg-dt-top '+G.c+'"><span class="tg-fic">'+I(G.ic)+'</span><span>'+esc(f.g)+'</span></div>'+
      '<div class="tg-dt-tok"><i>[</i>'+f.k+'<i>]</i></div><p class="tg-dt-desc">'+esc(f.d)+'</p>'+
      '<div class="tg-dt-flow">'+flowHTML(f)+'</div>'+
      '<div class="tg-dt-actions"><button type="button" class="tg-btn tg-primary tg-copy-big" data-copy="['+f.k+']">'+I(IC.copy)+'Copiar campo</button>'+
      '<span class="tg-dt-hint">Luego pégalo en Word con <span class="tg-kbd">Ctrl</span> + <span class="tg-kbd">V</span></span></div>';
    $$('.tg-field').forEach(r=>{const on=r.dataset.k===selKey;r.classList.toggle('sel',on);r.setAttribute('aria-selected',String(on));});
    const more=$('.tg-fmore[data-more="'+selKey+'"]');$$('.tg-fmore').forEach(m=>{if(m!==more)m.innerHTML='';});if(more)more.innerHTML=flowHTML(f);
  }
  function select(k,focus){selKey=k;renderDetail();if(focus){const r=$('.tg-field[data-k="'+k+'"]');r&&r.focus();}}
  ov.addEventListener('click',e=>{const r=e.target.closest('.tg-field');if(r&&!e.target.closest('.tg-copy'))select(r.dataset.k);});
  $('.tg-list').addEventListener('keydown',e=>{
    const r=e.target.closest('.tg-field');if(!r)return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();select(r.dataset.k);return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const vis=$$('.tg-field').filter(x=>!x.hidden&&!x.closest('[hidden]'));const i=vis.indexOf(r)+(e.key==='ArrowDown'?1:-1);if(vis[i])select(vis[i].dataset.k,true);}
  });
  /* ---------- paso 3 ---------- */
  function refreshSim(){
    const badge=$('#tgSrc');
    badge.classList.toggle('demo',!SRC.real);badge.querySelector('span').textContent=SRC.real?'Datos reales':'Datos de ejemplo';
    badge.title=SRC.real?('Datos del trámite seleccionado'+(SRC.rad?' · Rad. '+SRC.rad:'')):'Selecciona un trámite para ver sus datos reales';
    const st={n:0,empty:0,bad:0};
    simOut.innerHTML=simulate(simIn.value,SRC,st)||'<span class="tg-val empty">Escribe algo a la izquierda…</span>';
    $('#tgStats').textContent=st.n?(st.n+(st.n===1?' campo':' campos')+(st.empty?' · '+st.empty+' sin dato':'')+(st.bad?' · '+st.bad+' no reconocido'+(st.bad>1?'s':''):'')):'';
  }
  let simT=null;simIn.addEventListener('input',()=>{clearTimeout(simT);simT=setTimeout(refreshSim,90);});
  $('#tgReset').addEventListener('click',()=>{simIn.value=SIM_START;refreshSim();simIn.focus();});
  ov.addEventListener('click',e=>{const b=e.target.closest('.tg-ins');if(!b)return;
    const t=b.dataset.ins,a=simIn.selectionStart??simIn.value.length,z=simIn.selectionEnd??a,pre=simIn.value.slice(0,a),post=simIn.value.slice(z),sep=pre&&!/\s$/.test(pre)?' ':'',sep2=post&&!/^[\s.,;:)]/.test(post)?' ':'';
    simIn.value=pre+sep+t+sep2+post;const p=a+sep.length+t.length;simIn.focus();simIn.setSelectionRange(p,p);refreshSim();});

  /* ---------- navegación ---------- */
  function go(i,dir){
    i=Math.max(0,Math.min(STEPS.length-1,i));const changed=i!==cur,backwards=dir===undefined?i<cur:dir<0;cur=i;
    panels.forEach((p,k)=>{p.classList.toggle('active',k===i);p.classList.toggle('back',k===i&&backwards);});
    stepEls.forEach((el,k)=>{el.classList.toggle('active',k===i);el.classList.toggle('done',k<i);el.setAttribute('aria-selected',String(k===i));el.tabIndex=k===i?0:-1;});
    $('#tgEyebrow').textContent='Paso '+(i+1)+' · '+STEPS[i].t;$('#tgStageTitle').textContent=STEPS[i].h;$('#tgStageSub').textContent=STEPS[i].p;
    const h=$('#tgHead');if(changed){h.classList.remove('swap');void h.offsetWidth;h.classList.add('swap');}
    back.hidden=i===0;
    const last=i===STEPS.length-1;
    next.innerHTML=last?'Finalizar'+I(IC.check):'Continuar'+I(IC.right);next.dataset.last=String(last);
    $('#tgCount').textContent='Paso '+(i+1)+' de '+STEPS.length;$('#tgBar').style.width=((i+1)/STEPS.length*100)+'%';
    $$('.tg-segs i').forEach((s,k)=>{s.classList.toggle('on',k<=i);s.classList.toggle('cur',k===i);});
    body.scrollTop=0;SRC=sourceData();
    if(i===0)renderHero();else if(i===1)renderDetail();else refreshSim();
  }
  next.addEventListener('click',()=>next.dataset.last==='true'?close():go(cur+1,1));
  back.addEventListener('click',()=>go(cur-1,-1));
  ov.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)go(+g.dataset.go);});
  stepEls.forEach(el=>el.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();go(+el.dataset.go);}
    else if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();const n=(+el.dataset.go+(/Down|Right/.test(e.key)?1:-1)+STEPS.length)%STEPS.length;go(n);stepEls[n].focus();}
  }));

  /* ---------- buscador ---------- */
  const norm=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  $('#tgSearch').addEventListener('input',e=>{
    const q=norm(e.target.value).replace(/[\[\]]/g,'');let total=0,first=null;
    $$('.tg-group').forEach(g=>{let n=0;g.querySelectorAll('.tg-field').forEach(f=>{const on=!q||q.split(/\s+/).every(w=>f.dataset.s.includes(w)||f.dataset.k.toLowerCase().includes(w));f.hidden=!on;if(on){n++;first=first||f;}});g.hidden=!n;total+=n;});
    $('#tgEmpty').classList.toggle('on',!total);
    const selVisible=$('.tg-field[data-k="'+selKey+'"]:not([hidden])');if(!selVisible&&first)select(first.dataset.k);
  });

  /* ---------- copiar ---------- */
  async function copy(text){
    try{if(navigator.clipboard&&window.isSecureContext!==false){await navigator.clipboard.writeText(text);return true;}}catch(e){}
    try{const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;top:0;left:0';ov.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(e){return false;}
  }
  function toast(msg){const t=$('#tgToast');t.querySelector('span').textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1900);}
  ov.addEventListener('click',async e=>{
    const c=e.target.closest('[data-copy]');if(!c)return;e.stopPropagation();
    const ok=await copy(c.dataset.copy);
    if(ok){
      toast(c.dataset.copy+' copiado. Pégalo en tu Word.');
      if(c.classList.contains('tg-copy')){const lbl=c.querySelector('span');c.classList.add('ok');lbl.textContent='Copiado';setTimeout(()=>{c.classList.remove('ok');lbl.textContent='Copiar';},1500);}
      else{const old=c.innerHTML;c.innerHTML=I(IC.check)+'¡Copiado!';setTimeout(()=>{c.innerHTML=old;},1500);}
    }else toast('No se pudo copiar. Selecciónalo y usa Ctrl+C.');
  });
  $('#tgDraft').addEventListener('click',async()=>toast(await copy(SAMPLE)?'Borrador copiado. Pégalo en un documento de Word.':'No se pudo copiar el borrador.'));

  /* ---------- abrir / cerrar (foco atrapado, Esc, clic fuera) ---------- */
  function open(){
    lastFocus=document.activeElement;if(!simIn.value)simIn.value=SIM_START;SRC=sourceData();
    ov.classList.add('open');ov.setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden';
    cur=-1;go(0);setTimeout(()=>next.focus(),60);
  }
  function close(){
    ov.classList.remove('open');ov.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';
    if(lastFocus&&lastFocus.focus)lastFocus.focus();
  }
  btn.addEventListener('click',open);
  $$('.tg-close').forEach(b=>b.addEventListener('click',close));
  ov.addEventListener('mousedown',e=>{if(e.target===ov)close();});
  document.addEventListener('keydown',e=>{
    if(!ov.classList.contains('open'))return;
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key==='Tab'){const f=[...ov.querySelectorAll('button,[tabindex="0"],input,textarea')].filter(x=>!x.hidden&&x.offsetParent!==null&&getComputedStyle(x).visibility!=='hidden');if(!f.length)return;
      const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}
  });
  window.__AD_TEMPLATE_GUIDE=Object.freeze({open,close,go,fields:FIELDS.map(f=>f.k)});
})();
