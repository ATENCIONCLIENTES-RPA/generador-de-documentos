// @ts-nocheck — cuerpo legado del módulo «recursos», extraído sin cambios de lógica desde el HTML original.
// Se ejecuta como módulo ES. El tipado estricto se aplicará de forma progresiva (fase 2).
import '../../styles/fonts.css';
import '../shared/module-embedded.css';
import '../../components/guided-tour/guided-tour.css';
import './recursos.css';
import '../shared/module-bridge';
import { GuidedTour } from '../../components/guided-tour/guided-tour';

/* ---- script 1/1 (orden original del documento) ---- */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const svg=(p,w=2)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I={
  check:'<path d="M20 6 9 17l-5-5"/>',
  doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  sheet:'<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M3.5 9h17M3.5 14.5h17M9.5 9v11.5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  swap:'<path d="M17 3l4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
  sun:'<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  moon:'<path d="M20.5 14.2a8.5 8.5 0 1 1-9.7-11.7 7 7 0 0 0 9.7 11.7Z"/>',
  col:'<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M15 3.5v17"/>'
};
const USER_FILL='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M4 20.5c0-4.3 3.6-6.8 8-6.8s8 2.5 8 6.8Z"/></svg>';
/* Los recursos (SAC, Plantillas, Mercurio) viven en el DocStore del Asistente: única fuente de verdad.
   Este módulo es el único punto de carga; aquí solo queda el estado local del perfil. */
const store=window.AD?AD.store:null;
const RCFG=store?store.config.resources:{};
const MODS=store?store.config.modules:{};
const state={perfil:null};
let SNAP=store?store.getState():null;
const STEPS=(store?store.config.order:[]).map(k=>({k,label:RCFG[k].short,req:RCFG[k].required})).concat([{k:'perfil',label:'Perfil'}]);
const fmtSize=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB';
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- Diagnóstico de almacenamiento (la lógica vive en el DocStore) ---------- */
async function checkStorageHealth(){
  const ok=store?await store.checkStorage():false;
  $('#storageWarn').style.display=ok?'none':'flex';
  return ok;
}
let tT;function toast(msg,err){const t=$('#toast');t.classList.toggle('err',!!err);t.querySelector('.t-ic').innerHTML=svg(err?I.alert:I.check,2.4);$('#toastTxt').textContent=msg;t.classList.add('show');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('show'),2600);}

/* ---------- Confeti de celebración (sutil, al cargar un recurso con éxito) ---------- */
const CONFETTI_PALETTES={
  sac:['#1664B0','#60A5FA','#BFDBFE','#FFFFFF'],
  plantillas:['#D21624','#E0323F','#F3C3C7','#FFFFFF'],
  mercurio:['#5C6B7D','#93A1B0','#DCE3EA','#FFFFFF']
};
function celebrate(card){
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const anchor=card.querySelector('.file-ic')||card.querySelector('.rc-tile');
  if(!anchor)return;
  const r=anchor.getBoundingClientRect();
  const cx=r.left+r.width/2,cy=r.top+r.height*0.35;
  const layer=document.createElement('div');
  layer.className='confetti-layer';
  layer.style.left='0';layer.style.top='0';layer.style.width='0';layer.style.height='0';
  const colors=CONFETTI_PALETTES[card.dataset.key]||CONFETTI_PALETTES.sac;
  const N=16;
  for(let i=0;i<N;i++){
    const p=document.createElement('span');
    const round=Math.random()<0.4;
    p.className='confetti-piece'+(round?' round':'');
    const size=4+Math.random()*4;
    p.style.width=size+'px';p.style.height=round?size+'px':(size*0.65)+'px';
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    const angle=(Math.random()*Math.PI)-Math.PI/2-Math.PI/2; // bias upward/outward
    const spread=28+Math.random()*34;
    const x0=cx,y0=cy;
    const x1=cx+Math.cos(angle)*spread+(Math.random()*20-10);
    const y1=cy+ (18+Math.random()*46);
    p.style.setProperty('--x0',x0+'px');p.style.setProperty('--y0',y0+'px');
    p.style.setProperty('--x1',x1+'px');p.style.setProperty('--y1',y1+'px');
    p.style.setProperty('--r0',(Math.random()*60-30)+'deg');
    p.style.setProperty('--r1',(Math.random()*360+180)+'deg');
    p.style.setProperty('--dur',(850+Math.random()*450)+'ms');
    p.style.setProperty('--delay',(Math.random()*120)+'ms');
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),1500);
}

const isBusy=r=>r&&(r.status==='loading'||r.status==='processing');
function stepState(k){
  if(k==='perfil')return state.perfil?'done':'';
  const r=SNAP&&SNAP.resources[k];if(!r)return '';
  return r.status==='ready'?'done':isBusy(r)?'busy':r.status==='error'?'err':'';
}
function refresh(){
  $('#steps').innerHTML=STEPS.map(s=>{const st=stepState(s.k);
    const dot=st==='busy'?'<i class="mini-spin"></i>':svg(st==='err'?'<path d="M12 7v6M12 17v.01"/>':I.check,3.4);
    return `<span class="step s-${s.k} ${st}" title="${esc(s.label)}"><span class="s-dot">${dot}</span>${s.label}</span>`;}).join('');
  const req=STEPS.filter(s=>s.req);
  const faltan=req.filter(s=>stepState(s.k)!=='done').map(s=>s.label);
  const busy=STEPS.filter(s=>stepState(s.k)==='busy').map(s=>s.label);
  const errs=STEPS.filter(s=>stepState(s.k)==='err').map(s=>s.label);
  const ok=!faltan.length,btn=$('#btnGenerar'),was=!btn.disabled;
  btn.disabled=!ok;btn.title=ok?'':'Carga los recursos obligatorios para continuar';
  $('#abMsg').innerHTML=ok?(busy.length?`<b>Todo listo</b> · procesando ${busy.join(' y ')}`:'<b>Todo listo</b> para generar')
    :busy.length?`Procesando: <b>${busy.join(' y ')}</b>`:errs.length?`Revisa: <b>${errs.join(' y ')}</b>`:`Falta: <b>${faltan.join(' y ')}</b>`;
  if(ok&&!was){btn.classList.remove('ready');void btn.offsetWidth;btn.classList.add('ready');}
}

/* ---------- Tarjetas ---------- */
/* Textos, formatos, enlaces y módulos consumidores salen de la configuración del DocStore */
function bindConfig(card){
  const c=RCFG[card.dataset.key];if(!c)return;
  card.dataset.label=c.label;
  const t=card.querySelector('.rc-title');if(t&&t.firstChild&&t.firstChild.nodeType===3)t.firstChild.nodeValue=c.label+' ';
  const sub=card.querySelector('.rc-sub');if(sub)sub.textContent=c.description;
  const a=card.querySelector('.btn-src');if(a&&c.sourceUrl)a.href=c.sourceUrl;
  const inp=card.querySelector('.drop input');if(c.kind!=='folder')inp.setAttribute('accept',c.extensions.map(e=>'.'+e).join(','));
  card.querySelector('.fmts').innerHTML=(c.kind==='folder'?'<span class="f-carpeta">Carpeta</span>':'')+c.extensions.map(e=>`<span class="f-${e}">.${e}</span>`).join('');
  const note=card.querySelector('.rc-note');if(note)note.lastChild.nodeValue=c.note;
  const uses=document.createElement('div');uses.className='uses';
  uses.innerHTML=`<span class="u-lbl">Disponible para</span>`+c.consumers.map(m=>`<button type="button" class="u-chip" data-ad-nav="${m}" title="Ir a ${esc(MODS[m].title)}"><i></i>${esc(MODS[m].label)}</button>`).join('');
  card.querySelector('.rc-body').appendChild(uses);
}
function renderLoaded(card,d){
  const isFolder=card.dataset.type==='folder',box=card.querySelector('.loaded');
  if(isFolder){
    const nF=(d.folders||[]).length;
    const info=`${nF} carpeta${nF===1?'':'s'} · ${d.count} plantilla${d.count===1?'':'s'}`;
    box.innerHTML=`<div class="file-row">
        <span class="file-ic">${svg(I.folder,1.8)}<span class="ok">${svg(I.check,3.4)}</span></span>
        <div class="file-meta"><div class="file-name">Plantillas Word</div><div class="file-info">${info}</div></div>
        <button class="ic-btn" data-act="add-folder" title="Agregar otra carpeta" aria-label="Agregar otra carpeta">${svg(TPL_PLUS,2.4)}</button>
        <button class="ic-btn del" data-act="remove" title="Quitar todas las plantillas" aria-label="Quitar todas las plantillas">${svg(I.trash)}</button>
      </div><div class="load-bar"><i></i></div><div class="proc" data-proc role="status" aria-live="polite"></div>`;
    return;
  }
  const info=`${fmtSize(d.size)} · ${d.date}`;
  box.innerHTML=`<div class="file-row">
      <span class="file-ic">${svg(I.sheet,1.8)}<span class="ok">${svg(I.check,3.4)}</span></span>
      <div class="file-meta"><div class="file-name" title="${esc(d.name)}">${esc(d.name)}</div><div class="file-info">${info}</div></div>
      <button class="ic-btn" data-act="replace" title="Reemplazar" aria-label="Reemplazar">${svg(I.swap)}</button>
      <button class="ic-btn del" data-act="remove" title="Quitar" aria-label="Quitar">${svg(I.trash)}</button>
    </div><div class="load-bar"><i></i></div><div class="proc" data-proc role="status" aria-live="polite"></div>`;
}
/* Línea de estado: qué está pasando con el archivo y cuántos datos quedaron disponibles */
function renderProc(card,r){
  const el=card.querySelector('[data-proc]');if(!el)return;
  let cls='',html='';
  if(r.status==='loading'){html='<i class="spin"></i>Guardando en este equipo…';}
  else if(r.status==='processing'){html='<i class="spin"></i>Procesando registros…';}
  else if(r.status==='error'){cls='err';html=svg(I.alert,2.2)+`<span>${esc(r.error||'No se pudo procesar el archivo.')}</span><button type="button" class="retry" data-act="retry">Reintentar</button>`;}
  else if(r.status==='ready'){cls='ok';
    const n=RCFG[r.key].kind==='folder'?`${r.file.count} plantilla${r.file.count===1?'':'s'} lista${r.file.count===1?'':'s'}`:`${Number(r.rowCount).toLocaleString('es-CO')} registros procesados`;
    html=svg(I.check,2.6)+`<span>${n}</span>`+(r.persisted===false?'<span class="warnp" title="Se perderá al recargar la página">· no quedó guardado en este equipo</span>':'');
    if(r.warnings&&r.warnings.length)html+=`<span class="warnp" title="${esc(r.warnings.join(' '))}">· ${esc(r.warnings[0])}</span>`;}
  el.className='proc '+cls;el.innerHTML=html;
}
/* Plantillas: se listan agrupadas por carpeta (múltiples carpetas acumulativas) desde el estado
   compartido. Cada carpeta conserva sus propias plantillas; una plantilla con el mismo nombre que
   otra de una carpeta más reciente queda atribuida a esa carpeta (sin duplicarse). */
let tplOpen=false;
const TPL_DOC='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>';
const TPL_PLUS='<path d="M12 5v14M5 12h14"/>';
function renderTplList(card,r){
  if(card.dataset.key!=='plantillas')return;
  const box0=card.querySelector('.tpl-box');
  if(!r.file||!r.file.items||isBusy(r)||r.status!=='ready'){if(box0)box0.remove();return;}
  const items=r.file.items,folders=r.file.folders||[],box=box0||document.createElement('div');
  box.className='tpl-box'+(tplOpen?' open':'');
  const byFolder=new Map(folders.map(f=>[f.id,[]]));
  items.forEach(it=>{ if(it.folderId&&byFolder.has(it.folderId))byFolder.get(it.folderId).push(it); });
  const fila=t=>`<li title="${esc(t.fileName)}"><span class="t-ic">${svg(TPL_DOC,1.9)}</span><span class="t-name">${esc(t.title)}</span><span class="t-ext">.${esc(t.ext)}</span><button type="button" class="t-del" data-act="tpl-del" data-id="${esc(t.id)}" aria-label="Quitar ${esc(t.fileName)}" title="Quitar plantilla">${svg(I.trash)}</button></li>`;
  const grupos=folders.map(f=>{
    const lista=byFolder.get(f.id)||[],manual=f.id==='__manual__';
    return `<li class="tpl-group${manual?' manual':''}">
        <div class="tpl-group-h">
          <span class="tg-ic">${svg(manual?TPL_PLUS:I.folder,1.6)}</span>
          <span class="tg-name" title="${esc(f.name)}">${esc(f.name)}</span>
          <span class="tg-count">${lista.length}</span>
          ${manual?'':`<button type="button" class="tg-del" data-act="folder-del" data-fid="${esc(f.id)}" title="Quitar esta carpeta" aria-label="Quitar carpeta ${esc(f.name)}">${svg(I.trash)}</button>`}
        </div>
        <ul class="tpl-sub">${lista.length?lista.map(fila).join(''):'<li class="tpl-empty-note">Sin plantillas activas (reemplazadas por otra carpeta)</li>'}</ul>
      </li>`;
  }).join('');
  box.innerHTML=`<div class="tpl-head">
      <button type="button" class="tpl-toggle" data-act="tpl-toggle" aria-expanded="${tplOpen}">${svg('<path d="m6 9 6 6 6-6"/>',2.4)}<span>${tplOpen?'Ocultar':'Ver'} plantillas por carpeta</span><b>${items.length}</b></button>
      <button type="button" class="tpl-add" data-act="tpl-add" title="Agregar archivos .docx sueltos, sin carpeta">${svg(TPL_PLUS,2.6)}Archivos sueltos</button>
    </div>
    <ul class="tpl-list" role="list">${grupos}</ul>`;
  if(!box0)card.querySelector('.loaded').appendChild(box);
}
function setBadge(card,mode){
  const b=card.querySelector('[data-badge]');
  if(!b.dataset.cls){b.dataset.cls=b.className;b.dataset.html=b.innerHTML;}
  if(mode==='ok'){b.className='badge ok';b.innerHTML=svg(I.check,3.4)+'Cargado';}
  else if(mode==='busy'){b.className='badge ok busy';b.innerHTML='<i class="mini-spin"></i>Procesando';}
  else if(mode==='err'){b.className='badge ok err';b.innerHTML=svg('<path d="M12 7v6M12 17v.01"/>',3.4)+'Error';}
  else{b.className=b.dataset.cls;b.innerHTML=b.dataset.html;}
}
function syncCard(card,r){
  const busy=isBusy(r),has=!!r.file;
  card.classList.toggle('is-loading',busy);
  card.classList.toggle('is-ready',has&&!busy);
  card.classList.toggle('is-error',r.status==='error');
  card.querySelectorAll('.u-chip').forEach(c=>c.classList.toggle('on',r.status==='ready'));
  if(!has){card.querySelector('.loaded').innerHTML='';card.dataset.sig='';setBadge(card,false);return;}
  const sig=[r.file.name,r.file.size,r.file.count,r.file.folders?r.file.folders.length:'',r.updatedAt&&r.status==='loading'?r.updatedAt:''].join('|');
  if(card.dataset.sig!==sig||!card.querySelector('[data-proc]')){renderLoaded(card,r.file);card.dataset.sig=sig;}
  renderProc(card,r);
  renderTplList(card,r);
  setBadge(card,r.status==='ready'?'ok':busy?'busy':r.status==='error'?'err':false);
}
function onStore(snap,evt){
  SNAP=snap;
  if(evt&&evt.key==='perfil'){perfil=snap.profile||null;renderPerfil();return;}
  $$('.res-card[data-key]').forEach(card=>syncCard(card,snap.resources[card.dataset.key]));
  refresh();
  if(!evt||evt.origin!=='user'||!evt.key)return;
  const card=$(`.res-card[data-key="${evt.key}"]`),c=RCFG[evt.key];
  if(evt.type==='ready'){
    const r=snap.resources[evt.key];
    toast(`${c.label} cargado correctamente`+(c.kind==='xlsx'?` · ${Number(r.rowCount).toLocaleString('es-CO')} registros`:''));
    celebrate(card);
  }else if(evt.type==='updated'&&evt.change){
    const ch=evt.change,n=a=>a?a.length:0,pl=k=>k===1?'plantilla':'plantillas';
    if(ch.folderRemoved){
      toast(n(ch.removed)?`Carpeta quitada · ${n(ch.removed)} ${pl(n(ch.removed))} ya no disponible${n(ch.removed)===1?'':'s'}`:'Carpeta quitada');
    }else if(n(ch.removed)){
      toast(n(ch.removed)===1?'Plantilla quitada · ya no aparece en Generación documental':`${n(ch.removed)} plantillas quitadas`);
    }else{
      const p=[];if(n(ch.added))p.push(`${n(ch.added)} ${pl(n(ch.added))} agregada${n(ch.added)===1?'':'s'}`);if(n(ch.replaced))p.push(`${n(ch.replaced)} reemplazada${n(ch.replaced)===1?'':'s'}`);
      const folderTxt=ch.folderName?` en «${esc(ch.folderName)}»`:'';
      toast((p.join(' · ')||'Plantillas actualizadas')+folderTxt);
    }
  }else if(evt.type==='error'||evt.type==='rejected'){toast(evt.error||'No se pudo cargar el archivo',true);}
  else if(evt.type==='persist-failed'){checkStorageHealth();}
}
function readEntries(entry,out=[]){
  return new Promise(res=>{
    if(entry.isFile){entry.file(f=>{out.push(f);res(out);},()=>res(out));return;}
    const r=entry.createReader(),all=[];
    const next=()=>r.readEntries(async ents=>{if(!ents.length){for(const e of all)await readEntries(e,out);res(out);return;}all.push(...ents);next();},()=>res(out));
    next();
  });
}
$$('.res-card[data-key]').forEach(card=>{
  const key=card.dataset.key,drop=card.querySelector('.drop'),input=card.querySelector('input');
  bindConfig(card);
  /* Carpetas de plantillas: cada selección (clic en "Agregar otra carpeta" o soltar una carpeta) SUMA
     a las ya cargadas; nunca reemplaza. Se distingue una carpeta real (trae ruta relativa) de un
     grupo de archivos sueltos arrastrados directamente sobre la tarjeta. */
  const send=(files,root)=>{
    if(!store)return toast('Abre el Asistente Documental para cargar archivos',true);
    if(card.dataset.type==='folder'){ (root||(files[0]&&files[0].webkitRelativePath))?store.addFolder(files,{root}):store.addTemplates(files); }
    else store.load(key,files,{root});
  };
  /* El mismo input (y su valor) se reutiliza en cada carga: limpiarlo permite elegir la MISMA carpeta
     dos veces seguidas sin que el navegador omita el evento "change" por creer que no cambió nada. */
  input.addEventListener('change',()=>{const f=[...input.files];input.value='';if(f.length)send(f);});
  drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}});
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over');}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');}));
  drop.addEventListener('drop',async e=>{
    const it=e.dataTransfer.items&&e.dataTransfer.items[0];
    if(card.dataset.type==='folder'&&it&&it.webkitGetAsEntry){const en=it.webkitGetAsEntry();if(en&&en.isDirectory)return send(await readEntries(en),en.name);}
    send([...e.dataTransfer.files]);
  });
  /* Plantillas sueltas (.docx): agregar nuevas o reemplazar las del mismo nombre */
  let addInput=null;
  if(card.dataset.type==='folder'){
    addInput=document.createElement('input');addInput.type='file';addInput.multiple=true;addInput.hidden=true;
    addInput.accept=(RCFG[key]?RCFG[key].extensions:['docx']).map(e=>'.'+e).join(',');
    addInput.addEventListener('change',()=>{const f=[...addInput.files];addInput.value='';if(f.length&&store)store.addTemplates(f);});
    card.appendChild(addInput);
  }
  card.querySelector('.loaded').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||!store)return;
    const act=b.dataset.act;
    if(act==='replace'||act==='add-folder')input.click();   /* reabre el mismo selector de carpeta: nunca queda deshabilitado tras la primera carga */
    else if(act==='retry')store.reprocess(key);
    else if(act==='tpl-toggle'){tplOpen=!tplOpen;renderTplList(card,store.getState().resources[key]);}
    else if(act==='tpl-add'&&addInput)addInput.click();
    else if(act==='tpl-del')store.removeTemplate(b.dataset.id);
    else if(act==='folder-del')store.removeFolder(b.dataset.fid);
    else if(act==='remove')store.remove(key);});
});

/* ---------- Perfil ---------- */
let perfil=null,tmpFirma=null,tmpSize=220;
const SIG_MIN=90,SIG_MAX=420;
try{perfil=store&&store.getProfile?store.getProfile():JSON.parse(localStorage.getItem('essa-perfil'));}catch(e){}
const initials=n=>n.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
function renderPerfil(){
  const p=perfil||{};
  const set=(id,v,ph)=>{const el=$(id);el.classList.toggle('empty',!v);el.textContent=v||ph;};
  set('#pfNombre',p.nombre,'Sin registrar');set('#pfCargo',p.cargo,'Sin registrar');
  const f=$('#pfFirma');f.classList.toggle('empty',!p.firma);f.innerHTML=p.firma?`<img src="${p.firma}" alt="Firma" style="max-height:24px;max-width:130px;object-fit:contain;">`:'Sin firma';
  $('#pfAvatar').innerHTML=p.nombre?initials(p.nombre):USER_FILL;
  const ok=!!(p.nombre&&p.cargo&&p.firma),b=$('#pfBadge');
  b.className='badge '+(ok?'cfg':'pend');b.innerHTML=ok?svg(I.check,3.4)+'Configurado':'<span class="d"></span>Pendiente';
  $('#btnPerfilTxt').textContent=ok?'Editar perfil y firma':'Configurar perfil y firma';
  state.perfil=ok?p:null;refresh();
}
function sigView(src){
  const stage=$('#sigStage');
  stage.classList.toggle('drop-empty',!src);
  if(!src){
    stage.innerHTML=`<span class="sig-empty"><span class="e-ic">${svg(I.upload)}</span>Arrastra tu firma o <b style="color:inherit">haz clic para subirla</b><br><span style="font-weight:400;opacity:.8">PNG o JPG, fondo transparente recomendado</span></span>`;
    stage.onclick=()=>$('#inFirma').click();
    $('#sigSizeTag').textContent='—';
    return;
  }
  stage.onclick=null;
  stage.innerHTML=`<div class="sig-frame" style="--sw:${tmpSize}px">
      <img id="sigImg" src="${src}" alt="Firma">
      <div class="sig-actions">
        <button type="button" data-sig="replace" title="Reemplazar" aria-label="Reemplazar firma">${svg(I.swap)}</button>
        <button type="button" class="del" data-sig="remove" title="Quitar" aria-label="Quitar firma">${svg(I.trash)}</button>
      </div>
      <div class="sig-handle" title="Arrastra para cambiar el tamaño" aria-label="Redimensionar firma">${svg('<path d="M21 3 3 21M21 10v11H10"/>',2.3)}</div>
    </div>`;
  $('#sigSizeTag').textContent=`${tmpSize} px`;
  $('#sigRange').value=tmpSize;
  stage.querySelector('[data-sig="replace"]').onclick=e=>{e.stopPropagation();$('#inFirma').click();};
  stage.querySelector('[data-sig="remove"]').onclick=e=>{e.stopPropagation();tmpFirma=null;sigView(null);};
  bindHandleDrag();
}
$('#inFirma').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{tmpFirma=r.result;sigView(tmpFirma);};r.readAsDataURL(f);e.target.value='';});
function setSize(px){tmpSize=Math.max(SIG_MIN,Math.min(SIG_MAX,Math.round(px)));const img=$('#sigImg');if(img)img.closest('.sig-frame').style.setProperty('--sw',tmpSize+'px');$('#sigSizeTag').textContent=tmpSize+' px';$('#sigRange').value=tmpSize;}
function bindHandleDrag(){
  const handle=$('.sig-handle'),frame=$('.sig-frame');
  if(!handle)return;
  let startX=0,startW=0,dragging=false;
  const onMove=e=>{if(!dragging)return;const x=e.touches?e.touches[0].clientX:e.clientX;setSize(startW+(x-startX));};
  const onUp=()=>{dragging=false;document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);};
  handle.addEventListener('pointerdown',e=>{
    e.preventDefault();dragging=true;startX=e.clientX;startW=tmpSize;
    handle.setPointerCapture&&handle.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp);
  });
}
/* Zoom buttons + slider (delegated, bound once) */
$('#sigZoomIn').onclick=()=>setSize(tmpSize+20);
$('#sigZoomOut').onclick=()=>setSize(tmpSize-20);
$('#sigRange').addEventListener('input',e=>setSize(+e.target.value));

/* Drag & drop sobre el escenario de firma */
const sigStageEl=$('#sigStage');
['dragenter','dragover'].forEach(ev=>sigStageEl.addEventListener(ev,e=>{e.preventDefault();sigStageEl.classList.add('over');}));
['dragleave','drop'].forEach(ev=>sigStageEl.addEventListener(ev,e=>{e.preventDefault();sigStageEl.classList.remove('over');}));
sigStageEl.addEventListener('drop',e=>{
  const f=e.dataTransfer.files[0];if(!f||!/^image\/(png|jpe?g)$/.test(f.type))return toast('Sube una imagen PNG o JPG',true);
  const r=new FileReader();r.onload=()=>{tmpFirma=r.result;sigView(tmpFirma);};r.readAsDataURL(f);
});

const modal=$('#modal');
function openModal(){
  const p=perfil||{};$('#inNombre').value=p.nombre||'';$('#inCargo').value=p.cargo||'';
  tmpFirma=p.firma||null;tmpSize=p.firmaSize||220;sigView(tmpFirma);
  modal.classList.add('open');setTimeout(()=>$('#inNombre').focus(),200);
}
const closeModal=()=>modal.classList.remove('open');
$('#btnPerfil').onclick=openModal;$('#mClose').onclick=closeModal;$('#mCancel').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal();});
$('#mSave').onclick=()=>{
  const nombre=$('#inNombre').value.trim(),cargo=$('#inCargo').value.trim();
  if(!nombre){
    perfil={nombre:'',cargo,firma:tmpFirma,firmaSize:tmpSize};
    if(store&&store.setProfile)store.setProfile(perfil);else try{localStorage.setItem('essa-perfil',JSON.stringify(perfil));}catch(e){}
    renderPerfil();closeModal();toast('Nombre del firmante eliminado');return;
  }
  if(!cargo||!tmpFirma)return toast('Completa cargo y firma',true);
  perfil={nombre,cargo,firma:tmpFirma,firmaSize:tmpSize};
  if(store&&store.setProfile)store.setProfile(perfil);else try{localStorage.setItem('essa-perfil',JSON.stringify(perfil));}catch(e){}
  renderPerfil();closeModal();toast('Perfil guardado');
};

/* ---------- Acciones ---------- */
$('#btnCancelar').onclick=async()=>{if(!store)return;await store.clear();toast('Se limpiaron los recursos cargados');};
$('#btnActualizar').onclick=e=>{const b=e.currentTarget;b.classList.remove('spin');void b.offsetWidth;b.classList.add('spin');toast('Datos actualizados');};
$('#btnGenerar').onclick=()=>{toast('Recursos listos. Continuando a generación documental…');if(window.AD)setTimeout(()=>AD.navigate('documentos'),450);};

/* ---------- Tema ---------- */
function applyTheme(m){document.documentElement.setAttribute('data-theme',m);$('#ttKnob').innerHTML=svg(m==='dark'?I.moon:I.sun,2.2);$('#themeToggle').title=m==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro';try{localStorage.setItem('essa-theme',m);}catch(e){}}
let th='light';try{th=localStorage.getItem('essa-theme')||'light';}catch(e){}
applyTheme(th);
$('#themeToggle').onclick=()=>applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');

$('#storageWarnClose').onclick=()=>{$('#storageWarn').style.display='none';};
renderPerfil();if(store){const quitar=store.subscribe(onStore);addEventListener('pagehide',()=>quitar());}checkStorageHealth();

/* ================= CARPETA DE DATOS · interfaz del repositorio central =================
   DataRepository contiene toda la persistencia. Esta tarjeta solo representa su estado
   y dispara las operaciones compartidas; no mantiene una segunda copia de los datos. */
(function(){
  const card=$('#backupCard');
  const data=window.AD&&(AD.data||AD.backup);
  if(!card||!data){ if(card) card.remove(); return; }
  const chip=$('#backupChip'), sub=$('#backupSub'), local=$('#dataLocalStatus');
  const health=$('#dataHealth'), count=$('#dataCount'), last=$('#dataLastSave');
  const connectText=$('#dataConnectText'), connectIcon=$('#dataConnectIcon'), stateIcon=$('#dataStateIcon');
  const actions=[$('#bkExp'),$('#bkImp'),$('#bkMant')];
  const IC_FOLDER='<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>';
  const IC_SYNC='<path d="M20 7h-5V2M4 17h5v5"/><path d="M18.5 11a7 7 0 0 0-12-4L4 9M5.5 13a7 7 0 0 0 12 4L20 15"/>';
  const busy=s=>s.status==='initializing'||s.status==='saving'||s.folderStatus==='choosing'||s.folderStatus==='saving';
  const shortSize=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB';
  function render(s){
    const isBusy=busy(s), hasError=s.status==='error';
    card.classList.toggle('is-data-error',hasError);
    actions.forEach(b=>b.disabled=isBusy);
    health.className='data-health'+(hasError?' err':isBusy?' warn':'');
    if(s.status==='initializing'){
      local.textContent='Preparando repositorio local…'; health.textContent='Iniciando'; stateIcon.innerHTML='<span class="data-spinner"></span>';
    }else if(s.status==='saving'){
      local.textContent='Guardando cambios…'; health.textContent='Guardando'; stateIcon.innerHTML='<span class="data-spinner"></span>';
    }else if(hasError){
      local.textContent='Revisa el almacenamiento local'; health.textContent='Atención'; stateIcon.innerHTML=svg(I.alert,2.2);
    }else{
      local.textContent='Repositorio local listo'; health.textContent=s.persistent?'Persistente':'IndexedDB'; stateIcon.innerHTML=svg(I.check,2.6);
    }
    count.textContent=(s.itemCount||0)+' registro'+(s.itemCount===1?'':'s')+' · '+shortSize(s.bytes||0);
    chip.classList.remove('connected','attention'); chip.disabled=isBusy||!s.folderSupported;
    if(s.folderStatus==='choosing'){
      connectIcon.innerHTML='<span class="data-spinner"></span>'; connectText.textContent='Esperando selección…'; sub.textContent='Elige una carpeta con permiso de lectura y escritura';
    }else if(s.folderStatus==='saving'){
      connectIcon.innerHTML='<span class="data-spinner"></span>'; connectText.textContent='Guardando copia externa…'; sub.textContent='Sincronizando cambios con «'+(s.dirName||'Carpeta de datos')+'»';
    }else if(s.folderStatus==='connected'){
      chip.classList.add('connected'); connectIcon.innerHTML=svg(I.check,2.5); connectText.textContent='Carpeta conectada · '+s.dirName;
      sub.textContent='Copia externa sincronizada automáticamente';
    }else if(s.folderStatus==='permission'||s.folderStatus==='error'){
      chip.classList.add('attention'); connectIcon.innerHTML=svg(IC_SYNC,2); connectText.textContent='Reconectar '+(s.dirName?'«'+s.dirName+'»':'carpeta');
      sub.textContent=s.folderError||'La copia local sigue disponible; reconecta para actualizar la copia externa';
    }else if(s.folderStatus==='unsupported'){
      connectIcon.innerHTML=svg(I.folder,2); connectText.textContent='Carpeta externa no disponible'; sub.textContent='IndexedDB está activo; también puedes exportar un respaldo JSON';
    }else{
      connectIcon.innerHTML=svg(IC_FOLDER+'<path d="M12 11v6M9 14l3 3 3-3"/>',2); connectText.textContent='Elegir carpeta externa';
      sub.textContent=s.error||'Añade una copia fuera del navegador para máxima recuperación';
    }
    last.textContent=s.lastSaved?new Date(s.lastSaved).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):(s.dirName?'Pendiente de sincronizar':'Aún no conectada');
  }
  data.subscribe(render);
  function refreshRecoveredState(){
    try{ if(AD.store&&AD.store.refreshProfile) AD.store.refreshProfile(); }catch(e){}
    try{ AD.theme.set(data.getItem('essa-theme')||data.getItem('essa_cm_theme')||AD.theme.get()); }catch(e){}
    AD.reloadModule('cuadro');
  }
  chip.onclick=async()=>{
    const s=data.getState();
    const r=(s.folderStatus==='permission'||s.folderStatus==='error')?await data.reconectar():await data.elegir();
    if(r&&r.cancelled) return;
    if(!r||r.ok===false) return toast((r&&r.error)||'No fue posible conectar la carpeta',true);
    if(r.applied){ refreshRecoveredState(); toast('Datos recuperados desde la carpeta externa'); }
    else toast('Carpeta conectada y copia externa actualizada');
  };
  $('#bkExp').onclick=()=>{ data.exportarJSON(); toast('Respaldo preparado para descargar'); };
  $('#bkImp').onclick=()=>$('#bkFile').click();
  $('#bkFile').onchange=async e=>{
    const f=e.target.files[0]; e.target.value=''; if(!f) return;
    const r=await data.importarJSON(f);
    if(!r.ok) return toast(r.error,true);
    if(!confirm('Se restaurarán '+r.count+' registros del respaldo y se reemplazarán los datos actuales de la aplicación. ¿Deseas continuar?')) return;
    await r.apply(); refreshRecoveredState(); render(data.getState()); toast('Respaldo restaurado correctamente');
  };
  $('#bkMant').onclick=async()=>{
    actions.forEach(b=>b.disabled=true); toast('Ejecutando mantenimiento…');
    try{
      const res=await AD.runMaintenance();
      if(!res||res.ok===false){
        if(res&&res.reason==='sin-datos') return toast('Carga SAC Trámite y Mercurio Trámite antes del mantenimiento',true);
        return toast((res&&res.error)||'No se pudo ejecutar el mantenimiento',true);
      }
      await data.flush();
      const kb=n=>(n/1024).toFixed(0)+' KB', r=res.r;
      alert('Mantenimiento terminado.\n\nRegistros depurados:\n· Evacuados: '+r.evac+'\n· Marcas de color sin nota: '+r.marcas+'\n· Expedientes sin observación: '+r.exp+'\n· Ajustes de fecha: '+r.aju+'\n· Consultas anteriores de más de un año: '+r.cons+'\n· Notas de calendario de más de 2 años: '+r.cal+'\n\nAlmacenamiento: '+kb(res.antes)+' → '+kb(res.despues)+'.\nLas notas de consultas activas nunca se borran.');
      toast('Mantenimiento terminado · '+kb(res.antes)+' → '+kb(res.despues));
    }finally{ render(data.getState()); }
  };
})();

/* ================= GUÍA RÁPIDA =================
   El motor (overlay, posicionamiento, navegación) vive en el componente compartido
   GuidedTour (guided-tour.js); aquí solo se define el contenido de esta guía. */
(function(){
  const ICN=GuidedTour.ICN;
  const steps=[
    {sel:'.sec-head', ic:ICN.wave,
     title:'¡Hola! Bienvenido 👋',
     text:'Este es el punto de partida del Asistente: aquí cargas una sola vez los documentos base y las plantillas que usan el Cuadro de Mando y la Generación documental. Te muestro cómo funciona en un minuto.'},
    {sel:'.res-grid', ic:ICN.upload,
     title:'Carga tus documentos base',
     text:'Arrastra o selecciona el archivo SAC Trámite (obligatorio) y, si lo tienes, Mercurio Trámite (opcional). Cada uno se procesa automáticamente apenas lo sueltas: no hace falta hacer nada más.'},
    {sel:'.c-plantillas', ic:ICN.folder,
     title:'Plantillas Word: puedes agregar varias carpetas',
     text:'Selecciona la carpeta con tus plantillas .docx. Una vez cargada, aparece el botón "+" para agregar otra carpeta: puedes sumar tantas como necesites sin perder las que ya cargaste. También puedes ver, agregar o quitar plantillas una por una.'},
    {sel:'.c-data', ic:ICN.folder,
     title:'Carpeta de datos: tu repositorio persistente',
     text:'Aquí se conservan configuraciones, rutas, notas y observaciones. IndexedDB guarda una copia local automática y puedes conectar una carpeta externa, exportar, importar o ejecutar mantenimiento desde el mismo bloque.'},
    {sel:'#steps', ic:ICN.board,
     title:'Así sabes en qué va cada archivo',
     text:'Esta barra resume el estado de cada recurso: en proceso, listo o con error. Si algo falla, el aviso te dice exactamente qué corregir y puedes reintentar sin perder lo demás.'},
    {sel:'#btnGenerar', ic:ICN.arrow,
     title:'¿Y después de cargar?',
     text:'Cuando SAC Trámite y las Plantillas estén listos, este botón te lleva a Generación documental. Mientras tanto, el Cuadro de Mando ya puede usar SAC y Mercurio automáticamente, sin que tengas que ir a cargarlos otra vez allá.'},
    {sel:'.btn-guide', ic:ICN.check,
     title:'¡Listo, ya sabes lo esencial! 🎉',
     text:'Puedes volver a ver esta guía cuando quieras dándole clic a este mismo botón.'}
  ];
  GuidedTour.mount(steps);
})();
