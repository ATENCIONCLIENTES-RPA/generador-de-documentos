
/* ===================== MÓDULO DERECHO: ÁRBOL DE TRANSACCIONES ===================== */
(function(){
const $=id=>document.getElementById(id);
const A=window.ARBOL;
if(!A){$('resD').innerHTML='<div class="vacio">Faltan los datos del árbol de transacciones.<br>Cargue la matriz con <b>⬆ Cargar versión</b>.</div>';return;}
$('verD').textContent=A.version;
const NR='NO REGISTRA EN LA MATRIZ';
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ@.\s-]/g,' ').replace(/\s+/g,' ').trim();
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/parcilamente/g,'parcialmente').replace(/proyecctos/g,'proyectos');
const VACIAS=new Set(['a','de','del','la','el','los','las','y','en','por','para','al','con','un','una','o','e','que','se','su','sus','mi','me','como','cual','cuales','proceso','procesos','tramite']);
const raizN=w=>w.length>5&&w.endsWith('es')&&!/[aeiou]es$/.test(w.slice(-3))?w.slice(0,-2):(w.length>4&&w.endsWith('s')?w.slice(0,-1):w);
const RAIZM=new Map();
const raiz=w=>{let v=RAIZM.get(w);if(v===undefined){v=raizN(w);if(RAIZM.size<60000)RAIZM.set(w,v);}return v;};
const tokens=q=>norm(q).split(' ').filter(w=>w&&(!VACIAS.has(w)||/\d/.test(w)));
const dig=s=>(s||'').replace(/\D/g,'');
/* ¿Distancia de edición ≤ 1? Equivale a lev(a,b)<=1 sin crear matrices en cada llamada */
function lev1(a,b){const la=a.length,lb=b.length;if(la-lb>1||lb-la>1)return false;
  let i=0;const m=la<lb?la:lb;while(i<m&&a.charCodeAt(i)===b.charCodeAt(i))i++;
  if(i===m)return true;
  if(la===lb){for(let j=i+1;j<la;j++)if(a.charCodeAt(j)!==b.charCodeAt(j))return false;return true;}
  if(la>lb){for(let j=i+1;j<la;j++)if(a.charCodeAt(j)!==b.charCodeAt(j-1))return false;return true;}
  for(let j=i+1;j<lb;j++)if(a.charCodeAt(j-1)!==b.charCodeAt(j))return false;return true;}
/* Calidad de coincidencia de una palabra en un texto ya normalizado (con sus palabras) */
function calidad(t,txt,pal){
  if(/^\d+$/.test(t))return pal.includes(t)?1:(txt.includes(t)?.5:0);
  const r=raiz(t);
  if(pal.some(w=>w.startsWith(r)))return 1;
  if(txt.includes(r))return .6;
  if(r.length>=5&&pal.some(w=>(w.length>=r.length-1&&lev1(r,w.length>r.length?w.slice(0,r.length):w))||lev1(r,raiz(w))))return .4;
  return 0;
}
const prepN=s=>{const t=norm(s);return {t,p:t.split(' ')};};
/* con memoria: los textos de datos (causas, descripciones…) se normalizan una sola vez, no en cada consulta */
const PREPM=new Map();
const prep=s=>{let v=PREPM.get(s);if(v===undefined){v=prepN(s);if(PREPM.size<60000)PREPM.set(s,v);}return v;};
function puntaje(toks,texto){
  const x=prep(texto);if(!toks.length)return 1;let s=0;
  for(const t of toks){const v=calidad(t,x.t,x.p);if(!v)return 0;s+=v*3;}
  const f=toks.join(' ');if(x.t===f)s+=50;else if(x.t.startsWith(f))s+=20;else if(x.t.includes(f))s+=10;
  return s;
}
function buscarEn(lista,toks,campo){if(!toks.length)return lista.slice();return lista.map(x=>({x,s:puntaje(toks,campo(x))})).filter(o=>o.s).sort((a,b)=>b.s-a.s).map(o=>o.x);}
let COPIAS=[];
const btnCopiar=()=>''; /* el árbol no lleva botones Copiar */
const val=v=>v?esc(v).replace(/\n/g,'<br>'):`<span class="na">${NR}</span>`;
const titulo=(t,n)=>`<div class="tit"><span>${t}</span>${n!=null?`<small><b>${n}</b> ${n===1?'resultado':'resultados'}</small>`:''}</div>`;
const sinRes=q=>`<div class="vacio">No se encontraron coincidencias para <b>${esc(q)}</b>.</div>`;
const ANS_PQR='Días hábiles contados desde la recepción de la PQR',ANS_SIG='Días hábiles contados desde el día siguiente de la recepción',ANS_DIA='Días hábiles contados desde el día de la recepción';
const ETQ_L={'Tipo proceso':['Tipo de proceso'],'Reporte al SUI':['Reporte al SUI (únicamente EGA)'],
 'ANS solicitud del insumo':['ANS para la solicitud del insumo',ANS_PQR],'ANS entrega del insumo':['ANS para la entrega del insumo',ANS_SIG],
 'Responsable':['Responsable de la revisión o suministro del insumo'],'Notas del Excel':['Notas de la matriz'],
 'Revisión ATC y/o F>1':['Revisión ATC o equipos de medida (factor > 1)'],'Subprocesos SAC':['Subprocesos SAC']};
const ANS_HOJA={'PedidosHomologado':ANS_DIA,'ProcesosInternos':ANS_DIA,'Pedidos inactivos':ANS_SIG};
const etq=(l,p)=>{const e=ETQ_L[l];if(e)return e;if(l==='ANS'&&p&&ANS_HOJA[p.h])return ['ANS',ANS_HOJA[p.h]];return [l];};
const etqH=(l,p)=>{const e=etq(l,p);return esc(e[0])+(e[1]?`<small>${esc(e[1])}</small>`:'');};
const iniciales=n=>{const w=n.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g,' ').split(/\s+/).filter(x=>x.length>1);return ((w[0]||'?')[0]+(w.length>1?w[w.length-1][0]:'')).toUpperCase();};
const persona=v=>{const m=(v||'').match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ.' ]{4,}?)\s*(?:-|–|:)\s*((?:ESSA\\)?[A-Za-z]{3,20})$/);
  if(!m||/\d/.test(m[1]))return null;return `<span class="persona"><i class="av" aria-hidden="true">${esc(iniciales(m[1]))}</i><span><b>${esc(m[1].trim())}</b><small>${esc(m[2])}</small></span></span>`;};
const grupoTP=t=>/^Recurso/.test(t)?'Recurso':/^Pedido/.test(t)?'Pedido':t;
function tarjeta(tit,sub,campos,k){
  return `<div class="ic ${k||''}"><div class="cab"><span>${esc(tit)}${sub?` <small>· ${esc(sub)}</small>`:''}</span>${btnCopiar(campos.map(c=>c[0]+': '+(c[1]||NR)).join('\n'))}</div>
   <div class="cuerpo">${campos.map(c=>`<div class="lin"><b>${esc(c[0])}</b><span>${(c[0]==='Responsable'&&persona(c[1]))||val(c[1])}</span></div>`).join('')}</div></div>`;
}
function chips(txt){
  const n=norm(txt),out=[];
  if(/contrato integral/.test(n))out.push(['Contrato integral · por ciclo','ciclo ']);
  if(/mantenimiento/.test(n))out.push(['Mantenimiento · por circuito','circuito ']);
  if(/\batc\b|conexion|factibilidad|proyectos electricos|interventor/.test(n))out.push(['ATC · por municipio','atc ']);
  if(/\brce\b/.test(n))out.push(['RCE · por municipio','rce ']);
  return out.length?`<div class="extra">Buscar responsable: ${out.map(c=>`<span class="chip" data-ej="${c[1]}">${esc(c[0])}</span>`).join('')}</div>`:'';
}
/* ---------- PROCESOS: índice de búsqueda ---------- */
const PR=A.procesos;
const IDX=new WeakMap();PR.forEach(p=>{IDX.set(p,{n:prepN(p.n),d:prepN(p.d),v:prepN(p.vr.map(r=>r.join(' ')).join(' ')),c:prepN(p.ca.map(c=>c[3]).join(' ')),g:prepN(p.g.map(x=>x[1]).join(' '))});});
const PESO={n:30,c:8,d:6,v:4,g:2},ETQ={n:'nombre',c:'causas / cierres',d:'descripción',v:'clasificación o detalle',g:'datos generales'};
function buscarProcesos(toks,filtro){
  let L=PR.filter(p=>!filtro||filtro(p));
  if(!toks.length)return L.map(p=>({p,en:[]}));
  if(toks.length===1&&/^\d+$/.test(toks[0])){
    const ex=L.filter(p=>p.c===toks[0]);if(ex.length)return ex.map(p=>({p,en:['código']}));
    const pre=L.filter(p=>p.c.startsWith(toks[0]));if(pre.length)return pre.map(p=>({p,en:['código']}));
  }
  const f=toks.join(' ');const res=[];
  L.forEach((p,i)=>{let s=0;const en=new Set();
    for(const t of toks){let mejor=0;
      if(p.c===t){mejor=1000;en.add('código');}
      for(const k of Object.keys(PESO)){const F=IDX.get(p);const q=calidad(t,F[k].t,F[k].p)*PESO[k];if(q>0)en.add(ETQ[k]);if(q>mejor)mejor=q;}
      if(!mejor)return;s+=mejor;}
    {const F=IDX.get(p);if(F.n.t.includes(f))s+=60;else if(F.d.t.includes(f))s+=12;}
    res.push({p,s:s-i/10000,en:[...en]});});
  return res.sort((a,b)=>b.s-a.s);
}
let prSel=null,prLista=[];
const MODOS_ORD=['Accede','Accede imputable','Accede no imputable','Accede parcialmente imputable','Accede parcialmente no imputable','No accede','No accede no imputable','Archiva','Archiva no imputable','Confirma (causa final del reclamo inicial)','Modifica - Revoca','Rechaza'];
const FAM=m=>/^accede parcial/i.test(m)?'Accede parcialmente':/^accede/i.test(m)?'Accede':/^no accede/i.test(m)?'No accede':/^archiva/i.test(m)?'Archiva':/^confirma/i.test(m)?'Confirma':/^modifica/i.test(m)?'Modifica - Revoca':/^rechaza/i.test(m)?'Rechaza':m;
const COLF={'Accede':'k1','Accede parcialmente':'k1','No accede':'k4','Archiva':'k5','Confirma':'k4','Modifica - Revoca':'k1','Rechaza':'k5'};
function vistaCierres(p){
  const G={};p.ca.forEach(c=>(G[c[0]]=G[c[0]]||[]).push(c));
  const ks=Object.keys(G).sort((a,b)=>(MODOS_ORD.indexOf(a)+1||99)-(MODOS_ORD.indexOf(b)+1||99));
  const tx=ks.map(k=>k.toUpperCase()+'\n'+G[k].map(c=>c[3]).join('\n')).join('\n\n');
  const fams=[...new Set(ks.map(FAM))];
  return {tx,html:`<div class="ic k2"><div class="cab"><span>Cierres del proceso · causas finales por tipo de respuesta <small>(${p.ca.length})</small></span>${btnCopiar(tx,'Copiar todos')}</div><div class="cuerpo">
    <div class="extra" style="margin:0 0 6px">Tipos de respuesta con causas: ${fams.map(f=>`<b>${esc(f)}</b>`).join(' · ')}</div>
    <div class="cierres">`+ks.map(k=>`<div class="cierre ${COLF[FAM(k)]||''}"><div class="modo"><span>${esc(k)} <small>(${G[k].length})</small></span>${btnCopiar(G[k].map(c=>c[3]).join('\n'))}</div>`+
      G[k].map(c=>`<div class="causa">${esc(c[3])}${c[4]?`<div class="cz">↔ Contraria en la misma fila: ${esc(c[4]).replace(/\n/g,' · ')}</div>`:''}${c[5]?`<div class="df"><b>Definición:</b> ${esc(c[5])}</div>`:''}${c[6]?`<div class="df"><i>${esc(c[6])}</i></div>`:''}</div>`).join('')+`</div>`).join('')+`</div></div></div>`};
}
function vistaProceso(p){
  const todo=[`${p.t} ${p.c} – ${p.n}`,p.d?'DESCRIPCIÓN\n'+p.d:''];
  let h=`<div class="encab"><div class="plate" aria-hidden="true"><small>Código</small><b>${esc(p.c)}</b></div><div class="et"><span class="tp ${grupoTP(p.t)}">${esc(p.t)}</span><h2><span class="sr-t">${esc(p.t)} ${esc(p.c)} – </span>${esc(p.n)}</h2><span class="pag">Hoja «${esc(p.h)}»</span></div>%TODO%</div>`;
  if(p.d)h+=`<div class="ic"><div class="cab"><span>Descripción</span>${btnCopiar(p.d)}</div><div class="cuerpo">${val(p.d)}</div></div>`;
  if(p.ca.length){const v=vistaCierres(p);h+=v.html;todo.push('CIERRES (CAUSAS FINALES)\n'+v.tx);}
  else if(/Queja|Pedido|Sugerencia|Proceso interno|Daño/.test(p.t))h+=`<div class="extra" style="margin:0 0 8px">Este proceso no tiene causas finales en la matriz; su cierre se hace con el tipo de respuesta indicado en los datos generales.</div>`;
  if(p.g.length){todo.push('DATOS GENERALES\n'+p.g.map(x=>x[0]+': '+x[1]).join('\n'));
    h+=`<div class="ic k1"><div class="cab"><span>Datos generales</span>${btnCopiar(p.g.map(x=>x[0]+': '+x[1]).join('\n'))}</div>
     <div class="cuerpo">${p.g.map(x=>`<div class="lin"><b>${etqH(x[0],p)}</b><span>${val(x[1])}</span></div>`).join('')}${chips(p.g.map(x=>x[1]).join(' '))}</div></div>`;}
  if(p.vr.length){const tx=[p.vc.join(' | ')].concat(p.vr.map(r=>r.map(x=>x.replace(/\n/g,' / ')).join(' | '))).join('\n');todo.push('DETALLE\n'+tx);
    h+=`<div class="ic k3"><div class="cab"><span>Detalle por ${esc(p.vc[0].toLowerCase())}</span>${btnCopiar(tx)}</div><div class="cuerpo" style="overflow-x:auto">
      <table class="ig"><tr>${p.vc.map(c=>`<td>${esc(etq(c,p)[0])}</td>`).join('')}</tr>${p.vr.map(r=>`<tr>${r.map(x=>`<td>${val(x)}</td>`).join('')}</tr>`).join('')}</table>${chips(p.vr.map(r=>r.join(' ')).join(' '))}</div></div>`;}
  if(p.sd.length){const tx=p.sd.map(s=>s[0]+' - '+s[1]+(s[2]?': '+s[2]:'')).join('\n');
    h+=`<div class="ic k5"><div class="cab"><span>Subprocesos SAC (qué permite cada uno)</span>${btnCopiar(tx)}</div><div class="cuerpo">${p.sd.map(s=>`<div class="lin"><b>${esc(s[0])} - ${esc(s[1])}</b><span>${s[2]?esc(s[2]):'<span class="na">Sin descripción en la matriz</span>'}</span></div>`).join('')}</div></div>`;}
  return h.replace('%TODO%',btnCopiar(todo.filter(Boolean).join('\n\n'),'Copiar todo'));
}
function pintarProcesos(tit){
  let h=titulo(tit||'Procesos',prLista.length);
  if(!prLista.length)return h+`<div class="vacio">No se encontró ningún proceso.</div>`;
  if(prLista.length>1)h+=`<div class="otros">${prLista.slice(0,60).map(o=>`<div class="${o.p===prSel?'sel':''}" style="${EH(o.p.h)}" data-pr="${PR.indexOf(o.p)}"><span class="tp ${grupoTP(o.p.t)}">${esc(o.p.t)}</span><span class="cod">${esc(o.p.c)}</span><span>${esc(o.p.n)}${o.en&&o.en.length&&!o.en.includes('código')?`<div class="hits">Coincide en: ${esc(o.en.join(', '))}</div>`:''}</span></div>`).join('')}</div>`;
  return h+grp(prSel.h,vistaProceso(prSel));
}
function fijarLista(L){prLista=L;if(!L.some(o=>o.p===prSel))prSel=L.length?L[0].p:null;}
/* ---------- CAUSAS ---------- */
function buscarCausas(toks){
  const L=[];PR.forEach(p=>p.ca.forEach(c=>L.push({p,c})));
  const r=buscarEn(L,toks,o=>o.c[3]);
  if(!r.length)return titulo('Causas finales',0)+sinRes(toks.join(' '));
  const G={};r.slice(0,300).forEach(o=>{const k=o.p.t+' '+o.p.c;(G[k]=G[k]||{p:o.p,l:[]}).l.push(o.c);});
  return titulo('Causas finales',r.length)+Object.values(G).map(g=>`<div class="ic hc" style="${EH(g.p.h)}"><div class="cab"><span>${esc(g.p.t)} ${esc(g.p.c)} – ${esc(g.p.n)}</span><span class="chip" data-pr="${PR.indexOf(g.p)}">Ver proceso</span></div><div class="cuerpo">`+
     g.l.map(c=>`<div class="causa"><b>${esc(c[0])}:</b> ${esc(c[3])}${c[4]?`<div class="cz">↔ Contraria en la misma fila: ${esc(c[4]).replace(/\n/g,' · ')}</div>`:''}${c[5]?`<div class="df"><b>Definición:</b> ${esc(c[5])}</div>`:''}</div>`).join('')+`</div></div>`).join('');
}
/* ---------- RESPONSABLES ---------- */
const HOJA_ATC={'InsumosATCPQR':'Insumos ATC PQR','ATCProyectosEléctricos':'ATC Proyectos eléctricos','ATCConexiónSencilla1y2':'ATC Conexión sencilla 1 y 2','ATCConexiónCompleja-Interventor':'ATC Conexión compleja - Interventor','ATCFactibilidades':'ATC Factibilidades'};
const hojasATC=[...new Set(A.atc.map(a=>a[0]))];const nomATC=k=>HOJA_ATC[k]||k;
const resp=(n,u)=>n+(u?' - '+u:'');
const atcCard=a=>tarjeta(a[5],nomATC(a[0]),[['Responsable',resp(a[2],a[3])],['Región',a[1]]].concat(a[4]?[['Sección',a[4]]]:[]).concat(a[6]?[['Ciclo y circuito',a[6]]]:[]));
const ciCard=r=>tarjeta('Ciclo '+r[0],'Contrato integral · '+r[2],[['Responsable',resp(r[4],r[5])],['Zona',r[2]],['Sector',r[3]],['Cantidad',r[1]]],'k1');
const mtoCard=r=>tarjeta('Circuito o línea '+r[0],'Insumos mantenimiento '+r[1],[['Responsable',resp(r[2],r[3])],['Zona',r[1]]].concat(r[4]?[['Profesional contacto interno',r[4]]]:[]),'k2');
const rceCard=r=>tarjeta(r[1],'RCE · '+r[0],[['Responsable',r[2]],['Zona',r[0]]],'k4');
const mtCard=r=>tarjeta(r[2]||r[3],'Mantenimiento trabajos a terceros · '+r[0],[['Región',r[1]],['Municipio / localidad',r[2]],['Circuito',r[3]],['Línea o subestación',r[4]],['Profesional',r[5]],['Planeador',r[6]],['Técnico',r[7]],['Usuario SAC técnico',r[8]],['Observaciones',r[9]]].filter(x=>x[1]),'k3');
const EH=n=>window.estiloHoja?window.estiloHoja(n):'';
const grp=(t,html)=>`<div class="grp" style="${EH(t)}">${html}</div>`;
const sec=(t,L,f)=>L.length?grp(t,`<div class="grupo">${esc(t)} <small>(${L.length})</small></div>`+L.map(f).join('')):'';
/* Coincidencia de lugar: primero por municipio; si no hay, por región */
function porLugar(L,toks,mun,reg){
  let r=buscarEn(L,toks,mun);if(r.length||!reg)return {r,por:'municipio'};
  return {r:buscarEn(L,toks,reg),por:'región'};
}
const nota=t=>`<div class="extra">${t}</div>`;
function respATC(q){const t=tokens(q);if(!t.length)return titulo('Responsables ATC')+`<div class="vacio">Escriba el municipio o región. Ej.: <b>ATC Barichara</b></div>`;
  const {r,por}=porLugar(A.atc,t,a=>a[5],a=>a[1]);let h=titulo('Responsables ATC – '+esc(q),r.length);if(!r.length)return null;
  if(por==='región')h+=nota('No se encontró como municipio; se muestran los municipios de la región que coincide.');
  hojasATC.forEach(k=>{h+=sec(nomATC(k),r.filter(a=>a[0]===k),atcCard);});return h;}
function respMto(q){const d=dig(q);if(d&&d.length>=3)return porCircuito(q);
  return titulo('Responsables de mantenimiento')+`<div class="vacio">La información de mantenimiento se consulta por <b>número de circuito o línea</b>.<br>Ej.: <b>mantenimiento 208</b> · <b>circuito 76501</b>${tokens(q).length?`<br><br>Para trabajos a terceros por municipio use: <b>terceros ${esc(q)}</b>`:''}</div>`;}
function respRCE(q){const t=tokens(q);if(!t.length)return titulo('Responsables RCE')+`<div class="vacio">Escriba el municipio o zona. Ej.: <b>RCE Socorro</b></div>`;
  const {r}=porLugar(A.rce,t,x=>x[1],x=>x[0]);if(!r.length)return null;return titulo('Responsables RCE – '+esc(q),r.length)+grp('Insumos RCE',r.map(rceCard).join(''));}
function respTerceros(q){const t=tokens(q);const {r,por}=porLugar(A.mt,t,x=>x[2]+' '+x[3],x=>x[1]);if(!r.length)return null;
  return titulo('Mantenimiento trabajos a terceros – '+esc(q),r.length)+(por==='región'?nota('Se muestran los municipios de la región que coincide.'):'')+grp('Mantenimiento trabajos a terceros',r.slice(0,200).map(mtCard).join(''));}
function respCI(q){const t=tokens(q);if(dig(q)&&t.every(x=>/^\d+$/.test(x)))return porCiclo(q);const r=buscarEn(A.ci,t,x=>x[2]+' '+x[3]);if(!r.length)return null;
  return titulo('Contrato integral – '+esc(q),r.length)+grp('Contrato integral',r.slice(0,200).map(ciCard).join(''));}
function porMunicipio(q){
  const t=tokens(q);if(!t.length)return titulo('Responsables por municipio')+`<div class="vacio">Escriba el municipio. Ej.: <b>municipio Girón</b></div>`;
  const atc=buscarEn(A.atc,t,a=>a[5]),rce=buscarEn(A.rce,t,r=>r[1]),mt=buscarEn(A.mt,t,r=>r[2]),ci=buscarEn(A.ci,t,r=>r[3]);
  const n=atc.length+rce.length+mt.length+ci.length;
  let h=titulo('Responsables en '+esc(q),n);if(!n)return h+sinRes(q);
  hojasATC.forEach(k=>{h+=sec(nomATC(k),atc.filter(a=>a[0]===k),atcCard);});
  return h+sec('Insumos RCE',rce,rceCard)+sec('Mantenimiento trabajos a terceros',mt,mtCard)+sec('Contrato integral (municipio mencionado en el sector)',ci.slice(0,100),ciCard);
}
function porCiclo(q){
  const d=dig(q);if(!d)return titulo('Responsables por ciclo')+`<div class="vacio">Escriba el número de ciclo. Ej.: <b>ciclo 250</b></div>`;
  const ci=A.ci.filter(r=>dig(r[0])===d);
  const atc=A.atc.filter(a=>new RegExp('(^|\\D)'+d+'(\\D|$)').test(a[6]+' '+a[5])&&/ciclo|\d/i.test(a[6]+a[5]));
  let h=titulo('Responsables por ciclo '+d,ci.length+atc.length);
  if(!ci.length&&!atc.length)return h+sinRes('ciclo '+d);
  h+=sec('Contrato integral',ci,ciCard);hojasATC.forEach(k=>{h+=sec(nomATC(k)+' (ciclo mencionado)',atc.filter(a=>a[0]===k),atcCard);});
  return h+nota('Las hojas ATC indican rangos (p. ej. "ciclos menores a 200") que no se evalúan automáticamente; consulte también por municipio.');
}
function porCircuito(q){
  const d=dig(q);if(!d)return titulo('Responsables por circuito')+`<div class="vacio">Escriba el número de circuito o línea. Ej.: <b>circuito 76501</b></div>`;
  const mto=A.mto.filter(r=>dig(r[0])===d);
  const mt=A.mt.filter(r=>{const m=(r[3]||'').match(/^[\d\s]+/);return m&&dig(m[0])===d;});
  const atc=A.atc.filter(a=>(' '+(a[6]+' '+a[5]).replace(/(\d)\s(?=\d{3}\b)/g,'$1').replace(/\D+/g,' ')+' ').includes(' '+d+' '));
  let h=titulo('Responsables por circuito '+d,mto.length+mt.length+atc.length);
  if(!mto.length&&!mt.length&&!atc.length)return h+sinRes('circuito '+d);
  h+=sec('Insumos mantenimiento',mto,mtoCard)+sec('Mantenimiento trabajos a terceros',mt,mtCard);
  hojasATC.forEach(k=>{h+=sec(nomATC(k)+' (circuito mencionado)',atc.filter(a=>a[0]===k),atcCard);});
  return h;
}
/* Lugares conocidos (para reconocer "Barichara" o "San Gil" escritos solos) */
const LUGARES=new Set();[...A.atc.map(a=>a[5]),...A.rce.map(r=>r[1]),...A.mt.map(r=>r[2])].forEach(x=>{const n=norm(x.replace(/\(.*\)/,''));if(n)LUGARES.add(n);});
/* ---------- Lista desplegable ---------- */
const lst=(f,t)=>q=>{fijarLista(buscarProcesos(tokens(q),f));return pintarProcesos(t);};
const B={
 pq:{n:'Procesos – Quejas',f:lst(p=>p.t==='Queja','Quejas')},
 pp:{n:'Procesos – Peticiones',f:lst(p=>p.t==='Petición','Peticiones')},
 pr:{n:'Procesos – Reclamos',f:lst(p=>p.t==='Reclamo','Reclamos')},
 prr:{n:'Procesos – Recursos de reposición',f:lst(p=>p.t==='Recurso de reposición','Recursos de reposición')},
 pra:{n:'Procesos – Recursos de apelación',f:lst(p=>p.t==='Recurso de apelación','Recursos de apelación')},
 ph:{n:'Procesos – Pedidos homologados',f:lst(p=>p.t==='Pedido (homologado)','Pedidos homologados')},
 pi:{n:'Procesos – Pedidos inactivos',f:lst(p=>p.t==='Pedido (inactivo)','Pedidos inactivos')},
 ps:{n:'Procesos – Sugerencias',f:lst(p=>p.t==='Sugerencia','Sugerencias')},
 pin:{n:'Procesos – Procesos internos',f:lst(p=>p.t==='Proceso interno','Procesos internos')},
 pd:{n:'Procesos – Daños',f:lst(p=>p.t==='Daño','Daños')},
 tr:{n:'Tipos de respuesta (definiciones)',f:q=>{const L=buscarEn(A.tr,tokens(q),r=>r.join(' '));return titulo('Tipos de respuesta',L.length)+(L.length?grp('TiposRespuestas',L.map(r=>tarjeta(r[0],r[2],[['Definición',r[1]],['PQR a la que aplica',r[2]]])).join('')):sinRes(q));}},
 subs:{n:'Subprocesos SAC (qué permite cada uno)',f:q=>{const L=buscarEn(A.subs,tokens(q),r=>r.join(' '));return titulo('Subprocesos SAC',L.length)+(L.length?`<table class="ig"><tr><td>Código</td><td>Nombre</td><td>Descripción</td></tr>${L.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${r[2]?esc(r[2]):'<span class="na">Sin descripción</span>'}</td></tr>`).join('')}</table>`:sinRes(q));}},
 rci:{n:'Responsables – Contrato integral (ciclos)',f:q=>{const L=buscarEn(A.ci,tokens(q),r=>r.join(' '));return titulo('Insumos Contrato integral',L.length)+(L.length?grp('Contrato integral',L.slice(0,200).map(ciCard).join('')):sinRes(q));}},
 rmto:{n:'Responsables – Mantenimiento (circuitos)',f:q=>{const L=buscarEn(A.mto,tokens(q),r=>r.join(' '));return titulo('Insumos Mantenimiento',L.length)+(L.length?grp('Insumos mantenimiento',L.slice(0,200).map(mtoCard).join('')):sinRes(q));}},
 ratc:{n:'Responsables – ATC (todas las hojas)',f:q=>{const L=buscarEn(A.atc,tokens(q),a=>a.slice(0,7).join(' '));let h=titulo('Responsables ATC',L.length);if(!L.length)return h+sinRes(q);
   hojasATC.forEach(k=>{h+=sec(nomATC(k),L.filter(a=>a[0]===k),atcCard);});return h+(A.atcNotas.length?`<div class="nota"><b>Nota de la hoja ATC Proyectos eléctricos:</b>\n${esc(A.atcNotas.join('\n'))}</div>`:'');}},
 rrce:{n:'Responsables – RCE',f:q=>{const L=buscarEn(A.rce,tokens(q),r=>r.join(' '));return titulo('Insumos RCE',L.length)+(L.length?grp('Insumos RCE',L.map(rceCard).join('')):sinRes(q));}},
 rmt:{n:'Responsables – Mantenimiento trabajos a terceros',f:q=>{const L=buscarEn(A.mt,tokens(q),r=>r.join(' '));return titulo('Mantenimiento trabajos a terceros',L.length)+(L.length?grp('Mantenimiento trabajos a terceros',L.slice(0,200).map(mtCard).join('')):sinRes(q));}}
};
$('otrasD').innerHTML+=Object.entries(B).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');
/* ---------- Palabras clave ---------- */
const CLAVES=[[/^procesos?(\s+|$)/,'proc'],[/^causas?(\s+|$)/,'causa'],[/^cierres?(\s+|$)/,'proc'],[/^municipios?(\s+|$)/,'mun'],[/^ciclos?(\s+|$)/,'ciclo'],[/^circuitos?(\s+|$)/,'circ'],
  [/^mantenimiento(\s+|$)/,'mto'],[/^mto(\s+|$)/,'mto'],[/^atc(\s+|$)/,'atc'],[/^rce(\s+|$)/,'rce'],[/^terceros?(\s+|$)/,'ter'],[/^contrato integral(\s+|$)/,'ci']];
function libre(crudo,q){
  const t=tokens(q);if(!t.length)return sinRes(crudo);
  let h='';
  if(t.every(x=>/^\d+$/.test(x))){
    const L=buscarProcesos(t);if(L.length&&L[0].p.c===t[0]){fijarLista(L);return pintarProcesos('Proceso '+t[0]);}
    const c1=porCiclo(q),c2=porCircuito(q);return c1+c2;
  }
  const lugar=LUGARES.has(norm(q));
  const L=buscarProcesos(t);fijarLista(L);
  if(lugar)h+=porMunicipio(q);
  if(L.length)h+=pintarProcesos(lugar?'Procesos que mencionan '+esc(crudo):'Procesos relacionados con "'+esc(crudo)+'"');
  return h||sinRes(crudo)+`<div class="vacio">Pruebe con otras palabras o use: <b>proceso</b>, <b>causa</b>, <b>mantenimiento</b>, <b>ATC</b>, <b>RCE</b>, <b>municipio</b>, <b>ciclo</b> o <b>circuito</b>.</div>`;
}
function ejecutar(){
  COPIAS=[];
  const crudo=$('qD').value,q=norm(crudo),sel=$('otrasD').value;let html='',clave=null,resto=q;
  for(const [re,k] of CLAVES){const m=q.match(re);if(m){clave=k;resto=q.slice(m[0].length).trim();break;}}
  if(clave){
    if(sel)$('otrasD').value='';
    const rc=crudo.trim().replace(/^\S+(\s+integral)?\s*/i,'');
    if(clave==='proc'){fijarLista(buscarProcesos(tokens(resto)));
      html=resto?pintarProcesos():titulo('Procesos')+`<div class="vacio">Escriba el código o una palabra después de <b>proceso</b>.<br>Ej.: proceso 2905 · proceso podas</div>`;}
    else if(clave==='causa')html=resto?buscarCausas(tokens(resto)):titulo('Causas finales')+`<div class="vacio">Ej.: <b>causa promedio errado</b></div>`;
    else if(clave==='mun')html=porMunicipio(rc);
    else if(clave==='ciclo')html=porCiclo(resto);
    else if(clave==='circ')html=porCircuito(resto);
    else{const f={mto:respMto,atc:respATC,rce:respRCE,ter:respTerceros,ci:respCI}[clave];
      html=f(rc);if(html==null)html=sinRes(crudo)+`<div class="vacio">No se encontró <b>${esc(rc)}</b> como municipio o región en esa tabla de responsables.</div>`+(()=>{const L=buscarProcesos(tokens(q));fijarLista(L);return L.length?pintarProcesos('Procesos relacionados con "'+esc(crudo)+'"'):'';})();}
  }else if(sel)html=B[sel].f(q);
  else if(!q)html=`<div class="vacio inicio"><div class="vi-ico" aria-hidden="true"></div><h3>Explore procesos, causas y responsables</h3><p>Escriba el código de un proceso, una palabra clave, un municipio, un ciclo o un circuito, o abra <b>Otras consultas</b> para recorrer el árbol.</p></div>`;
  else html=libre(crudo,q);
  $('resD').innerHTML=html;
}
let tm;
$('qD').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(()=>{$('resD').scrollTop=0;ejecutar();},220);});
$('qD').addEventListener('keydown',e=>{if(e.key==='Escape'){$('qD').value='';ejecutar();}});
$('otrasD').addEventListener('change',()=>{if(CLAVES.some(([re])=>re.test(norm($('qD').value))))$('qD').value='';prSel=null;$('resD').scrollTop=0;ejecutar();$('qD').focus();});
$('limpiarD').onclick=()=>{$('qD').value='';$('otrasD').value='';prSel=null;ejecutar();$('qD').focus();};
const irA=t=>{$('otrasD').value='';$('qD').value=t;$('qD').focus();$('resD').scrollTop=0;ejecutar();};
if($('ayudaD'))$('ayudaD').addEventListener('click',e=>{const b=e.target.closest('[data-ej]');if(b)irA(b.dataset.ej);});
$('resD').addEventListener('click',async e=>{
  const ch=e.target.closest('.chip[data-ej]');if(ch){irA(ch.dataset.ej);return;}
  const pr=e.target.closest('[data-pr]');
  if(pr){const p=PR[+pr.dataset.pr];
    if(pr.classList.contains('chip')){$('otrasD').value='';$('qD').value=p.c;prSel=p;ejecutar();$('resD').scrollTop=0;return;}
    prSel=p;const lista=$('resD').querySelector('.otros');const st=lista?lista.scrollTop:0;
    const cont=$('resD').querySelector('.encab');if(cont){const g=cont.closest('.grp')||cont;const nuevo=document.createElement('div');nuevo.innerHTML=grp(p.h,vistaProceso(p));
      const ref=g.nextElementSibling;g.remove();[...nuevo.childNodes].forEach(x=>$('resD').insertBefore(x,ref));}
    lista&&lista.querySelectorAll('div[data-pr]').forEach(d=>d.classList.toggle('sel',d===pr));if(lista)lista.scrollTop=st;return;}
  const b=e.target.closest('[data-c]');if(!b)return;
  const txt=COPIAS[+b.dataset.c];
  try{await navigator.clipboard.writeText(txt);}catch(_){const a=document.createElement('textarea');a.value=txt;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();}
  const o=b.textContent;b.textContent='Copiado';b.classList.add('ok');setTimeout(()=>{b.textContent=o;b.classList.remove('ok');},1300);
});
ejecutar();
})();

export {};
