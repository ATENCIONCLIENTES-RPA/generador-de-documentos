import { CONV_REQ, CONV_ARBOL } from './lector-excel.js';

/* ===================== ACTUALIZACIÓN DE VERSIONES (cajones del encabezado) ===================== */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const M=window.MATRIZ,G=window.INFOGEN,A=window.ARBOL;
const LS={get:k=>{try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},del:k=>{try{localStorage.removeItem(k);}catch(e){}}};

/* ---------- Ventanas de aviso ---------- */
function ventana(tipo,titulo,cuerpo,botones){
  const ic={ok:'✔',err:'✖',info:'ℹ',warn:'⚠'}[tipo]||'';
  $('ventana').innerHTML=`<div class="vh ${tipo}">${ic} ${esc(titulo)}</div><div class="vb">${cuerpo}</div>`+(botones&&botones.length?`<div class="vf">${botones.map((b,i)=>`<button data-b="${i}" class="${b.pri?'pri':''}">${esc(b.t)}</button>`).join('')}</div>`:'');
  $('velo').classList.add('on');
  return new Promise(res=>{$('ventana').onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;const x=botones[+b.dataset.b];cerrar();res(x.v);};});
}
const cerrar=()=>$('velo').classList.remove('on');
const espera=t=>{$('ventana').innerHTML=`<div class="vh info">⏳ Procesando…</div><div class="vb" style="text-align:center"><div class="giro"></div><span id="espTxt">${esc(t)}</span></div>`;$('velo').classList.add('on');};
const versiones=(nue,act)=>`<div class="vv"><div class="n"><span>Versión nueva</span><b>${esc(nue)}</b></div><div><span>Versión actual del aplicativo</span><b>${esc(act||'—')}</b></div></div>`;

/* ---------- Detalle de cada versión (al pasar el mouse sobre la versión) ---------- */
const bonita=v=>String(v||'').replace(/Versi[oó]n\s*No\.?\s*:?\s*/i,'Versión ').trim();
if(M)$('ver').textContent=bonita(M.version);
if(A)$('verD').textContent=bonita(A.version);
/* Detalle para el rótulo (tooltip) de la versión: filas clave–valor */
const filasVer=(n,et,o,f)=>JSON.stringify([[et,String(n)],['Archivo',o||'—']].concat(f?[['Cargado el',f]]:[]));
if(M)$('ver').parentElement.dataset.tipR=filasVer(M.tramites.length,'Trámites',M.origen,M.fecha);
if(A)$('verD').parentElement.dataset.tipR=filasVer(A.procesos.length,'Procesos',A.origen,A.fecha);

/* ---------- Carpeta del aplicativo (el permiso queda guardado) ---------- */
const soporta='showDirectoryPicker' in window;
const NOMBRE=decodeURIComponent((location.pathname.split('/').pop())||'')||'index.html';
function idb(){return new Promise((ok,ko)=>{const r=indexedDB.open('consulta_essa',1);r.onupgradeneeded=()=>r.result.createObjectStore('k');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error);});}
async function idbGet(k){try{const d=await idb();return await new Promise(ok=>{const q=d.transaction('k').objectStore('k').get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null);});}catch(e){return null;}}
async function idbSet(k,v){try{const d=await idb();await new Promise(ok=>{const t=d.transaction('k','readwrite');t.objectStore('k').put(v,k);t.oncomplete=ok;t.onerror=ok;});}catch(e){}}
let carpeta=null;
async function elegirCarpeta(forzar){
  let hd=forzar?null:await idbGet('carpeta');
  if(hd){const p=await hd.requestPermission({mode:'readwrite'});if(p==='granted')return hd;}
  await ventana('info','Seleccione la carpeta del aplicativo',`A continuación se abrirá una ventana para elegir la carpeta donde está guardado este aplicativo (la que contiene el archivo <b>${esc(NOMBRE)}</b>).<br>El navegador le pedirá permiso para guardar cambios en ella: elija <b>Guardar cambios / Permitir</b>.`,[{t:'Elegir carpeta',pri:1,v:1}]);
  hd=await window.showDirectoryPicker({id:'consulta-essa',mode:'readwrite'});
  const nombres=[];for await(const [n] of hd.entries())nombres.push(n);
  if(!nombres.includes(NOMBRE)){
    const r=await ventana('warn','¿Es la carpeta correcta?',`En la carpeta <b>${esc(hd.name)}</b> no se encontró el archivo del aplicativo <b>${esc(NOMBRE)}</b>.<br>Elija la carpeta donde está guardado este HTML.`,[{t:'Elegir otra carpeta',v:'otra'},{t:'Usar esta carpeta',pri:1,v:'si'}]);
    if(r==='otra')return elegirCarpeta(true);
  }
  await idbSet('carpeta',hd);carpeta=hd;return hd;
}

/* ---------- Línea de estado de cada cajón ---------- */
function estado(){
  const p=LS.get('essa_pendiente')||{};
  const pend={req:p.req&&(!M||p.req!==M.version)?p.req:null,arb:p.arb&&(!A||p.arb!==A.version)?p.arb:null};
  for(const [t,s,b] of [['req','sReq','aReq'],['arb','sArb','aArb']]){
    const el=$(s);
    if(pend[t]){el.className='ust pend';el.innerHTML=`⏳ ${esc(pend[t])} guardada · pulse Actualizar`;}
    else{el.className='ust';
      el.innerHTML=!soporta?'La nueva versión se descargará como un HTML nuevo':carpeta?`📁 Carpeta: ${esc(carpeta.name)} · <a data-carpeta>cambiar</a>`:`📁 Carpeta sin vincular · <a data-carpeta>vincular</a>`;}
    $(b).classList.toggle('urgente',!!pend[t]);
  }
}
document.addEventListener('click',async e=>{
  if(!e.target.closest('[data-carpeta]'))return;
  try{await elegirCarpeta(true);estado();}
  catch(err){if(err.name!=='AbortError')ventana('err','No se pudo vincular la carpeta',esc(err.message)+'<br><br>Sugerencia: guarde el aplicativo en una carpeta propia (por ejemplo <b>Documentos\\Consulta ESSA</b>) y no directamente en Descargas o en el Escritorio.',[{t:'Entendido',pri:1}]);}
});
idbGet('carpeta').then(h=>{carpeta=h||null;estado();});

/* ---------- Comparación entre la versión actual y la nueva ---------- */
const AUX=new Set(['nN','nS','nC','nT','F','grupo']);
const sinAux=(k,v)=>AUX.has(k)?undefined:v;
const igual=(a,b)=>JSON.stringify(a,sinAux)===JSON.stringify(b,sinAux);
const cnt=x=>x==null?'—':Array.isArray(x)?x.length:typeof x==='object'?Object.keys(x).length:1;
function fila(nombre,ant,nue,conserva){
  let st;
  if(conserva)st=`<span class="st-mal">No se pudo leer en el archivo nuevo: se conserva la anterior</span>`;
  else if(ant==null)st=`<span class="st-cam">Nueva</span>`;
  else if(igual(ant,nue))st=`<span class="st-ok">Sin cambios</span>`;
  else st=`<span class="st-cam">Actualizada</span>`;
  return `<tr><td>${esc(nombre)}</td><td>${cnt(ant)}</td><td>${conserva?cnt(ant):cnt(nue)}</td><td>${st}</td></tr>`;
}
const tabla=f=>`<table><tr><th>Información</th><th>Actual</th><th>Nueva</th><th>Estado</th></tr>${f.join('')}</table>`;
const listaAv=a=>a.length?`<b>Observaciones de la lectura:</b><ul>${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';


/* ---------- Bases de información general ---------- */
const BASES={ap:'Alumbrado público',apNotas:'Notas de alumbrado público',essaCasa:'Aliados ESSA en Casa',aseo:'Facturación conjunta aseo',rel:'Ejecutivos por municipio',adm:'Administraciones municipales',
  otc:'Otras comercializadoras',medidores:'Medidores parametrizables',costos:'Costo materiales',sitios:'Sitios de menor desarrollo',asent:'Asentamientos Bga-Bca',financ:'Condiciones de financiación',anexo1:'Anexo 1',anexo3:'Anexo 3'};
/* ---------- Resumen de novedades entre la versión en uso y la nueva ---------- */
const J=x=>JSON.stringify(x,sinAux);
const nrm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const corto=(t,n=90)=>{t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1)+'…':t;};
const MAXL=6;
const lista=(arr)=>arr.length?`<ul>${arr.slice(0,MAXL).map(x=>`<li>${x}</li>`).join('')}${arr.length>MAXL?`<li><i>… y ${arr.length-MAXL} más</i></li>`:''}</ul>`:'';
const plural=(n,a,b)=>n+' '+(n===1?a:b);
function porClave(ant,nue,clave){
  const A0=new Map(),B0=new Map();(ant||[]).forEach(x=>A0.set(clave(x),x));(nue||[]).forEach(x=>B0.set(clave(x),x));
  const nuevos=[],retirados=[],cambiados=[];
  for(const [k,x] of B0){if(!A0.has(k))nuevos.push(x);else if(J(A0.get(k))!==J(x))cambiados.push([A0.get(k),x]);}
  for(const [k,x] of A0)if(!B0.has(k))retirados.push(x);
  return {nuevos,retirados,cambiados};
}
const resumenNum=d=>[d.nuevos.length&&plural(d.nuevos.length,'nuevo','nuevos'),d.cambiados.length&&plural(d.cambiados.length,'modificado','modificados'),d.retirados.length&&plural(d.retirados.length,'retirado','retirados')].filter(Boolean).join(', ');
const bloque=(t,html)=>html?`<div class="nov"><div class="nt">${t}</div>${html}</div>`:'';
function novedadesReq(Mn,Gn,In){
  let h='';
  if(M){
    const d=porClave(M.tramites,Mn.tramites,t=>t.c);
    const det=[];
    for(const [o,t] of d.cambiados){
      const p=[];if(o.n!==t.n)p.push(`nombre: «${esc(corto(o.n,50))}» → «${esc(corto(t.n,50))}»`);
      (Mn.secciones||[]).forEach((sec,i)=>{const a=o.s[i]||[],b=t.s[i]||[];if(J(a)===J(b))return;
        const add=b.filter(x=>!a.includes(x)),del=a.filter(x=>!b.includes(x));
        const q=[add.length&&'+'+plural(add.length,'línea','líneas'),del.length&&'−'+plural(del.length,'línea','líneas')].filter(Boolean).join(', ')||'orden cambiado';
        p.push(`<b>${esc(sec)}</b> (${q})`+(add.length?`<div class="nx">Nuevo: «${esc(corto(add[0]))}»</div>`:''));});
      if(p.length)det.push(`<b>${esc(t.t)} ${esc(t.c)} – ${esc(t.n)}</b>: ${p.join(' · ')}`);
    }
    h+=bloque('📗 Trámites',(d.nuevos.length?`<div>Trámites nuevos:</div>`+lista(d.nuevos.map(t=>`<b>${esc(t.t)} ${esc(t.c)}</b> – ${esc(t.n)}`)):'')+
      (d.retirados.length?`<div>Trámites retirados:</div>`+lista(d.retirados.map(t=>`<b>${esc(t.t)} ${esc(t.c)}</b> – ${esc(t.n)}`)):'')+
      (det.length?`<div>Trámites modificados (${det.length}):</div>`+lista(det):''));
  }
  if(G){
    const CL={ap:a=>nrm(a.mun),essaCasa:a=>nrm(a.emp),aseo:a=>nrm(a.emp+'|'+a.mun),rel:a=>nrm(a.mun),adm:a=>nrm(a.mun),otc:a=>nrm(a.otc+'|'+a.cta),
      medidores:a=>nrm(a.marca+'|'+a.modelo),costos:a=>nrm(a.cat+'|'+a.desc),sitios:a=>nrm(a),anexo1:a=>nrm(a),anexo3:a=>nrm(a)};
    const NOMB={ap:a=>a.mun,essaCasa:a=>a.emp,aseo:a=>a.emp+' ('+a.mun+')',rel:a=>a.mun,adm:a=>a.mun,otc:a=>a.otc,medidores:a=>a.marca+' '+a.modelo,costos:a=>a.desc,sitios:a=>a,anexo1:a=>a,anexo3:a=>a};
    const L=[];
    for(const [k,n] of Object.entries(BASES)){
      const a=G[k],b=Gn[k];if(b==null||J(a)===J(b))continue;
      if(CL[k]&&Array.isArray(a)&&Array.isArray(b)){const d=porClave(a,b,CL[k]);const r=resumenNum(d);
        const ej=[...d.nuevos.map(x=>'+ '+NOMB[k](x)),...d.cambiados.map(x=>'✎ '+NOMB[k](x[1])),...d.retirados.map(x=>'− '+NOMB[k](x))].slice(0,3).map(x=>esc(corto(x,45)));
        L.push(`<b>${esc(n)}</b>: ${r||'orden cambiado'}${ej.length?` <span class="nx">(${ej.join(' · ')}${d.nuevos.length+d.cambiados.length+d.retirados.length>3?' …':''})</span>`:''}`);}
      else L.push(`<b>${esc(n)}</b>: contenido actualizado`);
    }
    const cuenta=X=>{let i=0,d=0;Object.values(X||{}).forEach(l=>l.forEach(e=>{if(typeof e==='string'||e.t==='img')i++;else d++;}));return [i,d];};
    if(In&&J(window.IMGGEN||{})!==J(In)){const [ni,nd]=cuenta(In);L.push(`<b>Imágenes y documentos</b>: ${Object.keys(In).length} hoja(s) con ${plural(ni,'imagen','imágenes')}${nd?' y '+plural(nd,'documento incrustado (PDF u otro)','documentos incrustados (PDF u otros)'):''}`);}
    h+=bloque('📋 Información general',lista(L));
  }
  return h||'<div class="nov"><i>No se encontraron diferencias de contenido frente a la versión en uso.</i></div>';
}
const HATC={'InsumosATCPQR':'Insumos ATC PQR','ATCProyectosEléctricos':'ATC Proyectos eléctricos','ATCConexiónSencilla1y2':'ATC Conexión sencilla 1 y 2','ATCConexiónCompleja-Interventor':'ATC Conexión compleja - Interventor','ATCFactibilidades':'ATC Factibilidades'};
/* El orden de las causas contrarias de una misma fila no es un cambio de contenido */
const canonCA=procs=>(procs||[]).map(p=>({...p,ca:p.ca.map(c=>{const x=c.slice();x[4]=String(x[4]||'').split('\n').filter(Boolean).sort().join('\n');return x;})}));
function novedadesArb(d,Aproc){
  if(!A)return '<div class="nov"><i>No había una versión anterior para comparar.</i></div>';
  let h='';
  const kp=p=>p.t+'|'+p.c, np=p=>`<b>${esc(p.t)} ${esc(p.c)}</b> – ${esc(p.n)}`;
  const dp=porClave(Aproc||A.procesos,d.procesos,kp);
  const det=[];
  for(const [o,p] of dp.cambiados){
    const q=[];
    if(o.n!==p.n)q.push(`nombre: «${esc(corto(o.n,50))}» → «${esc(corto(p.n,50))}»`);
    if(o.d!==p.d)q.push('descripción');
    const ca=x=>x[0]+'|'+x[3];const sa=new Set(o.ca.map(ca)),sb=new Set(p.ca.map(ca));
    const ad=p.ca.filter(x=>!sa.has(ca(x))),de=o.ca.filter(x=>!sb.has(ca(x)));
    if(ad.length||de.length)q.push(`cierres (${[ad.length&&'+'+ad.length,de.length&&'−'+de.length].filter(Boolean).join(', ')})`+(ad.length?`<div class="nx">Nuevo: ${esc(ad[0][0])} → «${esc(corto(ad[0][3],70))}»</div>`:''));
    else if(J(o.ca)!==J(p.ca))q.push('definiciones de cierres');
    const ga=new Map(o.g),gb=new Map(p.g);const cg=[...new Set([...ga.keys(),...gb.keys()])].filter(k=>ga.get(k)!==gb.get(k));
    if(cg.length)q.push(`datos generales: ${esc(cg.slice(0,4).join(', '))}${cg.length>4?'…':''}`);
    if(J(o.vr)!==J(p.vr)||J(o.vc)!==J(p.vc))q.push('detalle por fila (clasificaciones / responsables)');
    if(J(o.sd)!==J(p.sd))q.push('subprocesos SAC');
    det.push(`${np(p)}: ${q.join(' · ')||'ajustes menores'}`);
  }
  h+=bloque('🌳 Procesos',(dp.nuevos.length?`<div>Procesos nuevos:</div>`+lista(dp.nuevos.map(np)):'')+
    (dp.retirados.length?`<div>Procesos retirados:</div>`+lista(dp.retirados.map(np)):'')+
    (det.length?`<div>Procesos modificados (${det.length}):</div>`+lista(det):''));
  const T=[
    ['Responsables ATC','atc',a=>a[0]+'|'+nrm(a[5])+'|'+nrm(a[6]),a=>a[2],a=>`${a[5]} (${HATC[a[0]]||a[0]})`],
    ['Responsables contrato integral','ci',r=>r[0]+'|'+nrm(r[2]),r=>r[4],r=>`Ciclo ${r[0]}`],
    ['Responsables mantenimiento','mto',r=>r[0],r=>r[2],r=>`Circuito ${r[0]}`],
    ['Responsables RCE','rce',r=>nrm(r[1]),r=>r[2],r=>r[1]],
    ['Mantenimiento trabajos a terceros','mt',r=>r[0]+'|'+nrm(r[2])+'|'+nrm(r[3]),r=>r[5]||r[7],r=>[r[2],r[3]].filter(Boolean).join(' ')],
    ['Tipos de respuesta','tr',r=>nrm(r[0]),r=>'',r=>r[0]],
    ['Subprocesos SAC','subs',r=>r[0],r=>'',r=>r[0]+' '+r[1]]];
  const L=[];
  for(const [n,k,cl,rp,lb] of T){
    if(J(A[k])===J(d[k]))continue;
    const x=porClave(A[k],d[k],cl);
    const cam=x.cambiados.filter(([o,p])=>rp(o)!==rp(p));
    const ej=cam.slice(0,3).map(([o,p])=>`${esc(corto(lb(p),40))}: ${esc(corto(rp(o),30))} → <b>${esc(corto(rp(p),30))}</b>`);
    const partes=[cam.length&&plural(cam.length,'cambio de responsable','cambios de responsable'),x.nuevos.length&&plural(x.nuevos.length,'registro nuevo','registros nuevos'),
      x.retirados.length&&plural(x.retirados.length,'registro retirado','registros retirados'),(x.cambiados.length-cam.length)&&plural(x.cambiados.length-cam.length,'registro ajustado','registros ajustados')].filter(Boolean);
    L.push(`<b>${esc(n)}</b>: ${partes.join(', ')||'orden cambiado'}${ej.length?`<div class="nx">${ej.join('<br>')}</div>`:''}`);
  }
  h+=bloque('👷 Responsables y tablas de apoyo',lista(L));
  return h||'<div class="nov"><i>No se encontraron diferencias de contenido frente a la versión en uso.</i></div>';
}
function guardarNovedades(tipo,v,html){const n=LS.get('essa_novedades')||{};n[tipo]={v,html};LS.set('essa_novedades',n);}

/* ---------- Carga de una nueva versión ---------- */

async function cargarReq(file){
  espera('Leyendo '+file.name+'…');
  let r;try{r=await CONV_REQ.convertir(await file.arrayBuffer(),file.name,t=>{const e=$('espTxt');if(e)e.textContent=t;});}
  catch(e){cerrar();return ventana('err','No se pudo cargar la matriz de requisitos',esc(e.message),[{t:'Cerrar',pri:1}]);}
  const av=r.avisos.slice(),f=[];
  f.push(fila('Trámites (Pedidos, Peticiones, Q/R/R)',M&&M.tramites,r.MATRIZ.tramites));
  const Gn=r.INFOGEN;
  for(const [k,n] of Object.entries(BASES)){
    const ant=G?G[k]:null,vacia=Gn[k]==null||(Array.isArray(Gn[k])&&!Gn[k].length);
    if(vacia&&ant!=null){Gn[k]=ant;f.push(fila(n,ant,ant,true));}else if(!vacia)f.push(fila(n,ant,Gn[k]));
  }
  const I=window.IMGGEN;
  let Ix=r.IMGGEN;
  if(!Object.keys(Ix).length&&I&&Object.keys(I).length){Ix=I;f.push(fila('Hojas con imágenes',I,I,true));}
  else f.push(fila('Hojas con imágenes y documentos',I||null,Ix));
  const IxG={},IxR={};for(const k in Ix)(/^REQ /.test(k)?IxR:IxG)[k]=Ix[k];
  const archivos=[['DATA_MATRIZ','window.MATRIZ='+JSON.stringify(r.MATRIZ)+';'],['DATA_INFOGEN','window.INFOGEN='+JSON.stringify(Gn)+';'],['DATA_IMGREQ','window.IMGREQ='+JSON.stringify(IxR)+';'],['DATA_IMGGEN','window.IMGGEN='+JSON.stringify(IxG)+';'],['DATA_IMGGEN_KEYS',JSON.stringify(Object.keys(IxG))]];
  cerrar();
  const nov=novedadesReq(r.MATRIZ,Gn,Ix);
  const ok=await ventana('ok','Matriz de requisitos cargada',
    `Se leyó el archivo <b>${esc(file.name)}</b>.`+versiones(r.MATRIZ.version,M&&M.version)+
    (M&&M.version===r.MATRIZ.version?`<i>Es la misma versión que ya usa el aplicativo.</i>`:'')+
    `<div class="novs"><div class="nh">Novedades encontradas</div>${nov}</div><details><summary>Ver detalle por base de información</summary>${tabla(f)}</details>`+listaAv(av)+
    `¿Desea guardar esta versión en la carpeta del aplicativo?`,[{t:'Cancelar',v:0},{t:'💾 Guardar en la carpeta del aplicativo',pri:1,v:1}]);
  if(ok){guardarNovedades('req',r.MATRIZ.version,nov);guardar('req',r.MATRIZ.version,M?M.version:'',archivos);}
}
async function cargarArb(file){
  espera('Leyendo '+file.name+'…');
  let r;try{r=await CONV_ARBOL.convertir(await file.arrayBuffer(),file.name);}
  catch(e){cerrar();return ventana('err','No se pudo cargar el árbol de transacciones',esc(e.message),[{t:'Cerrar',pri:1}]);}
  const d=r.datos,av=r.avisos.slice(),f=[];
  d.procesos=canonCA(d.procesos);const Aproc=A?canonCA(A.procesos):null;
  const NOM={procesos:'Procesos',tr:'Tipos de respuesta',subs:'Subprocesos SAC',ci:'Responsables contrato integral',mto:'Responsables mantenimiento',atc:'Responsables ATC',atcNotas:'Notas ATC',rce:'Responsables RCE',mt:'Mantenimiento trabajos a terceros'};
  for(const [k,n] of Object.entries(NOM)){
    const ant=A?(k==='procesos'?Aproc:A[k]):null;
    if((!d[k]||!d[k].length)&&ant&&ant.length){d[k]=ant;f.push(fila(n,ant,ant,true));}else f.push(fila(n,ant,d[k]));
  }
  const cierres=d.procesos.reduce((s,p)=>s+p.ca.length,0),cierresA=A?A.procesos.reduce((s,p)=>s+p.ca.length,0):null;
  f.splice(1,0,`<tr><td>Cierres (causas finales)</td><td>${cierresA==null?'—':cierresA}</td><td>${cierres}</td><td>${cierresA===cierres?'<span class="st-ok">Mismo total</span>':'<span class="st-cam">Cambió</span>'}</td></tr>`);
  const archivos=[['DATA_ARBOL','window.ARBOL='+JSON.stringify(d)+';']];
  cerrar();
  const nov=novedadesArb(d,Aproc);
  const ok=await ventana('ok','Matriz árbol de transacciones cargada',
    `Se leyó el archivo <b>${esc(file.name)}</b>.`+versiones(d.version,A&&A.version)+
    (A&&A.version===d.version?`<i>Es la misma versión que ya usa el aplicativo.</i>`:'')+
    `<div class="novs"><div class="nh">Novedades encontradas</div>${nov}</div><details><summary>Ver detalle por tabla</summary>${tabla(f)}</details>`+listaAv(av)+
    `¿Desea guardar esta versión en la carpeta del aplicativo?`,[{t:'Cancelar',v:0},{t:'💾 Guardar en la carpeta del aplicativo',pri:1,v:1}]);
  if(ok){guardarNovedades('arb',d.version,nov);guardar('arb',d.version,A?A.version:'',archivos);}
}
/* Arrastrar y soltar el Excel sobre el cajón de actualización */
['dragover','drop'].forEach(ev=>window.addEventListener(ev,e=>{if(!e.target.closest||!e.target.closest('.upd'))e.preventDefault();}));
function soltar(caja,fn){
  let c=0;
  caja.addEventListener('dragenter',e=>{e.preventDefault();c++;caja.classList.add('drop');});
  caja.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
  caja.addEventListener('dragleave',()=>{if(--c<=0){c=0;caja.classList.remove('drop');}});
  caja.addEventListener('drop',e=>{e.preventDefault();c=0;caja.classList.remove('drop');
    const f=[...(e.dataTransfer.files||[])][0];if(!f)return;
    if(!/\.xlsx$/i.test(f.name))return ventana('err','Archivo no válido',`El archivo <b>${esc(f.name)}</b> no es un Excel (.xlsx).<br>Arrastre el archivo de Excel de la matriz.`,[{t:'Cerrar',pri:1}]);
    fn(f);});
}
soltar($('fReq').closest('.upd'),f=>cargarReq(f));
soltar($('fArb').closest('.upd'),f=>cargarArb(f));
$('fReq').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)cargarReq(f);};
$('fArb').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)cargarArb(f);};

/* ---------- Guardar en la carpeta (con copia de respaldo) ---------- */
const hoy=()=>new Date().toISOString().slice(0,10);
const limpioNom=s=>String(s||'sin versión').replace(/[\\/:*?"<>|]/g,'').trim();
function marcar(tipo,v){const p=LS.get('essa_pendiente')||{};p[tipo]=v;LS.set('essa_pendiente',p);estado();}
/* Inserta los datos nuevos dentro del propio HTML (bloques de datos con id DATA_…) */
const protege=js=>js.replace(/<\/(script)/gi,'<\\/$1');
function inyectar(html,archivos){
  for(const [id,js] of archivos){
    /* el bloque puede llevar atributos (type="text/plain"): se conserva la etiqueta de apertura tal como está */
    const a='<script id="'+id+'"';const i=html.indexOf(a);
    if(i<0&&id==='DATA_IMGREQ'){const k=html.indexOf('<script id="DATA_IMGGEN"');if(k>=0){html=html.slice(0,k)+'<script id="DATA_IMGREQ" type="text/plain">'+protege(js)+'<'+'/script>\n'+html.slice(k);}continue;}
    if(i<0){if(id==='DATA_IMGGEN_KEYS')continue;throw new Error('El archivo HTML elegido no es este aplicativo (no tiene el bloque de datos '+id+').');}
    const g=html.indexOf('>',i)+1;
    const j=html.indexOf('<'+'/script>',g);html=html.slice(0,g)+protege(js)+html.slice(j);
  }
  return html;
}
function pedirHTML(){return new Promise((ok,ko)=>{const inp=document.createElement('input');inp.type='file';inp.accept='.html,.htm';
  inp.onchange=()=>{const f=inp.files[0];if(!f)return ko(Object.assign(new Error('cancelado'),{name:'AbortError'}));f.text().then(t=>ok({t,n:f.name}),ko);};inp.click();});}
async function guardar(tipo,vNueva,vAnt,archivos){
  const nombreM=tipo==='req'?'Matriz de requisitos':'Matriz árbol de transacciones';
  if(soporta){
    try{
      const dir=await elegirCarpeta(false);
      espera('Guardando la nueva versión dentro de '+NOMBRE+'…');
      const fh=await dir.getFileHandle(NOMBRE);const viejo=await (await fh.getFile()).text();
      const nuevo=inyectar(viejo,archivos);
      let hubo=false;
      try{const resp=await dir.getDirectoryHandle('respaldos',{create:true});
        const nb=`${NOMBRE.replace(/\.html?$/i,'')} (${limpioNom(vAnt)}) respaldo ${hoy()}.html`;
        const w0=await (await resp.getFileHandle(nb,{create:true})).createWritable();await w0.write(viejo);await w0.close();hubo=true;}catch(e){}
      const w=await fh.createWritable();await w.write(nuevo);await w.close();
      marcar(tipo,vNueva);cerrar();
      const r=await ventana('ok',nombreM+' guardada',
        `La <b>${esc(vNueva)}</b> quedó guardada dentro del aplicativo <b>${esc(NOMBRE)}</b> (carpeta <b>${esc(dir.name)}</b>).<br>`+
        (hubo?`La versión anterior quedó como copia de seguridad en la subcarpeta <b>respaldos</b>.<br>`:'')+
        `<br>Pulse <b>⟳ Actualizar</b> para empezar a usar la nueva versión.`,[{t:'Más tarde',v:0},{t:'⟳ Actualizar ahora',pri:1,v:1}]);
      if(r)actualizar();
      return;
    }catch(e){
      cerrar();
      if(e.name==='AbortError')return ventana('warn','No se guardó la nueva versión','Se canceló la selección de la carpeta. La versión cargada no se guardó.',[{t:'Cerrar',pri:1}]);
      const r=await ventana('err','No se pudo guardar en la carpeta',esc(e.message)+'<br><br>Puede generar un HTML nuevo con la versión cargada y reemplazar el actual manualmente.',[{t:'Cancelar',v:0},{t:'⬇ Descargar HTML',pri:1,v:1}]);
      if(!r)return;
    }
  }
  try{
    await ventana('info','Seleccione el aplicativo actual',`A continuación elija el archivo HTML de este aplicativo (<b>${esc(NOMBRE)}</b>). Se generará una copia con la <b>${esc(vNueva)}</b> incluida.`,[{t:'Elegir archivo',pri:1,v:1}]);
    const {t,n}=await pedirHTML();const nuevo=inyectar(t,archivos);
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([nuevo],{type:'text/html'}));a.download=n;document.body.appendChild(a);a.click();a.remove();
    marcar(tipo,vNueva);
    await ventana('info','HTML descargado',`Se descargó <b>${esc(n)}</b> con la <b>${esc(vNueva)}</b>.<br>Reemplace con él el archivo actual del aplicativo (si quiere conservar la versión anterior, guarde antes una copia) y ábralo de nuevo.`,[{t:'Entendido',pri:1,v:0}]);
  }catch(e){
    if(e.name==='AbortError')return ventana('warn','No se guardó la nueva versión','No se eligió ningún archivo.',[{t:'Cerrar',pri:1}]);
    ventana('err','No se pudo generar el HTML',esc(e.message),[{t:'Cerrar',pri:1}]);
  }
}

/* ---------- Actualizar el aplicativo ---------- */
function actualizar(){
  try{sessionStorage.setItem('essa_actualizar','1');}catch(e){}
  espera('Actualizando el aplicativo…');
  setTimeout(()=>location.reload(),400);
}
$('aReq').onclick=actualizar;$('aArb').onclick=actualizar;

/* Después de recargar: confirmar qué versiones quedaron */
(function(){
  let pidio=false;try{pidio=sessionStorage.getItem('essa_actualizar')==='1';sessionStorage.removeItem('essa_actualizar');}catch(e){}
  if(!pidio)return;
  const p=LS.get('essa_pendiente');
  const vr=M?M.version:'(sin datos)',va=A?A.version:'(sin datos)';
  const fallo=[];
  if(p&&p.req&&p.req!==vr)fallo.push(`Matriz de requisitos: se esperaba la <b>${esc(p.req)}</b> y el aplicativo leyó la <b>${esc(vr)}</b>.`);
  if(p&&p.arb&&p.arb!==va)fallo.push(`Árbol de transacciones: se esperaba la <b>${esc(p.arb)}</b> y el aplicativo leyó la <b>${esc(va)}</b>.`);
  if(fallo.length){
    ventana('warn','El aplicativo no tomó la nueva versión',fallo.join('<br>')+`<br><br>Verifique que guardó el HTML actualizado en lugar del anterior y vuelva a pulsar <b>⟳ Actualizar</b>.`,[{t:'Entendido',pri:1}]);
  }else{
    const nv=LS.get('essa_novedades')||{};
    LS.del('essa_pendiente');LS.del('essa_novedades');estado();
    const secN=(n,x)=>x?`<div class="novs"><div class="nh">${n} · Novedades de la ${esc(x.v)}</div>${x.html}</div>`:'';
    ventana('ok','Actualización terminada',
      (p&&(p.req||p.arb)?'La actualización terminó correctamente. Las nuevas versiones ya están cargadas y listas para consultar.':'El aplicativo se recargó.')+
      `<table><tr><th>Matriz</th><th>Versión en uso</th></tr><tr><td>📗 Matriz de requisitos</td><td><b>${esc(vr)}</b>${p&&p.req?' <span class="st-cam">(nueva)</span>':''}</td></tr><tr><td>🌳 Matriz árbol de transacciones</td><td><b>${esc(va)}</b>${p&&p.arb?' <span class="st-cam">(nueva)</span>':''}</td></tr></table>`+secN('📗 Matriz de requisitos',p&&p.req&&nv.req&&nv.req.v===p.req?nv.req:null)+secN('🌳 Matriz árbol de transacciones',p&&p.arb&&nv.arb&&nv.arb.v===p.arb?nv.arb:null),[{t:'Aceptar',pri:1}]);
  }
})();
})();

