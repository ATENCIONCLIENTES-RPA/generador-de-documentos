
(function(){
const $=id=>document.getElementById(id);
const M=window.MATRIZ, G=window.INFOGEN;
const faltan=[!M&&'Matriz de requisitos',!G&&'Información general'].filter(Boolean);
if(faltan.length){$('res').innerHTML=`<div class="vacio">Faltan datos en el aplicativo: <b>${faltan.join('</b> y <b>')}</b>.<br>Cargue la matriz con <b>⬆ Cargar versión</b>.</div>`;return;}
$('ver').textContent=M.version||G.version||'';
const S=M.secciones, NR='NO REGISTRA EN LA MATRIZ';

/* ---------- Utilidades de texto ---------- */
const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ@.\s-]/g,' ').replace(/\s+/g,' ').trim();
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const una=(s,sep)=>(s||'').split(/\s*\n\s*/).filter(Boolean).join(sep||' / ');
const VACIAS=new Set(['a','de','del','la','el','los','las','y','en','por','para','al','con','un','una','o','e']);
const tokens=q=>norm(q).split(' ').filter(w=>w&&(!VACIAS.has(w)||/\d/.test(w)));
/* ¿Distancia de edición ≤ 1? Equivale a lev(a,b)<=1 sin crear matrices en cada llamada */
function lev1(a,b){const la=a.length,lb=b.length;if(la-lb>1||lb-la>1)return false;
  let i=0;const m=la<lb?la:lb;while(i<m&&a.charCodeAt(i)===b.charCodeAt(i))i++;
  if(i===m)return true;
  if(la===lb){for(let j=i+1;j<la;j++)if(a.charCodeAt(j)!==b.charCodeAt(j))return false;return true;}
  if(la>lb){for(let j=i+1;j<la;j++)if(a.charCodeAt(j)!==b.charCodeAt(j-1))return false;return true;}
  for(let j=i+1;j<lb;j++)if(a.charCodeAt(j-1)!==b.charCodeAt(j))return false;return true;}
/* Coincidencia flexible: contiene la palabra, empieza por ella o tiene 1 letra de diferencia */
let ESTRICTO=false;
function tokScore(t,txt,pal){
  if(txt.includes(t)) return pal.some(w=>w.startsWith(t))?3:2;
  if(ESTRICTO) return 0;
  if(t.length>=4&&pal.some(w=>lev1(t,w)||(w.length>t.length&&lev1(t,w.slice(0,t.length))))) return 1;
  return 0;
}
/* Texto normalizado y sus palabras, memorizados: los textos de datos se repiten en cada consulta */
const PREPM=new Map();
function prepM(s){let v=PREPM.get(s);if(v===undefined){const t=norm(s);v={t,p:t.split(' ')};if(PREPM.size<60000)PREPM.set(s,v);}return v;}
function puntaje(toks,texto){
  const P=prepM(texto),txt=P.t; if(!toks.length) return 1;
  const pal=P.p; let s=0;
  for(const t of toks){const v=tokScore(t,txt,pal); if(!v) return 0; s+=v;}
  const frase=toks.join(' '); if(txt===frase) s+=50; else if(txt.startsWith(frase)) s+=20; else if(txt.includes(frase)) s+=10;
  return s;
}
/* Busca primero en los campos principales; si no hay nada, en todos los campos */
function buscarEn(lista,toks,principal,secundario){
  if(!toks.length) return lista.slice();
  let r=lista.map(x=>({x,s:puntaje(toks,principal(x))})).filter(o=>o.s);
  if(!r.length&&secundario) r=lista.map(x=>({x,s:puntaje(toks,secundario(x))})).filter(o=>o.s);
  return r.sort((a,b)=>b.s-a.s).map(o=>o.x);
}

/* ---------- Tarjetas con botón Copiar ---------- */
let COPIAS=[];
const val=v=>v?esc(v).replace(/\n/g,'<br>'):`<span class="na">${NR}</span>`;
const btnCopiar=txt=>`<button class="btn" type="button" title="Copiar al portapapeles" data-c="${COPIAS.push(txt)-1}">Copiar</button>`;
function tarjeta(titulo,sub,campos,extra,nota){
  return `<div class="ic"><div class="cab"><span>${esc(titulo)}${sub?` <small>· ${esc(sub)}</small>`:''}</span>${btnCopiar(campos.map(c=>c[1]||NR).join('\n'))}</div>
   <div class="cuerpo">${campos.map(c=>`<div class="lin"><b>${esc(c[0])}</b><span>${val(c[1])}</span></div>`).join('')}
   ${extra?`<div class="extra">${extra}</div>`:''}${nota?`<div class="nota"><b>Nota de la matriz:</b>\n${esc(nota)}</div>`:''}</div></div>`;
}
const titulo=(t,n)=>`<div class="tit"><span>${t}</span>${n!=null?`<small><b>${n}</b> ${n===1?'resultado':'resultados'}</small>`:''}</div>`;
const sinRes=q=>`<div class="vacio">No se encontraron coincidencias para <b>${esc(q)}</b>.</div>`;
function grid(rows){return `<div style="overflow-x:auto"><table class="ig">${rows.map(r=>`<tr>${r.map(c=>`<td rowspan="${c[1]}" colspan="${c[2]}">${esc(c[0])}</td>`).join('')}</tr>`).join('')}</table></div>`;}
const BLOBS=new Map();
function blobURL(d){if(BLOBS.has(d))return BLOBS.get(d);const i=d.indexOf(',');const m=d.slice(5,d.indexOf(';'));const bin=atob(d.slice(i+1));
  const u8=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u8[k]=bin.charCodeAt(k);const u=URL.createObjectURL(new Blob([u8],{type:m}));BLOBS.set(d,u);return u;}
function elemento(x){
  if(typeof x==='string'||x.t==='img'){const s=typeof x==='string'?x:x.d;return `<img src="${s}" title="Clic para ver en tamaño completo">`;}
  const u=blobURL(x.d);const ico='';
  return `<div class="doc"><div class="dh"><span>${esc(x.n||'Documento')}</span><span class="da"><a href="${u}" target="_blank" rel="noopener">↗ Abrir en ventana</a><a href="${u}" download="${esc(x.n||'documento')}">⬇ Descargar</a></span></div>`+
    (x.t==='pdf'?`<iframe src="${u}#view=FitH" title="${esc(x.n||'PDF')}"></iframe>`:`<div class="dn">Este documento no se puede mostrar dentro del aplicativo. Use <b>Abrir</b> o <b>Descargar</b>.</div>`)+`</div>`;
}
function imagenes(hoja,nombre,texto){
  const L=(window.IMGGEN||{})[hoja]||[];
  if(!L.length) return titulo(nombre)+`<div class="vacio">Aún no hay imágenes ni documentos guardados para <b>${esc(nombre)}</b>.<br>Cargue la matriz de requisitos con <b>⬆ Cargar versión</b> para extraerlos del Excel.</div>`;
  return titulo(nombre,null)+(texto?`<div class="ic"><div class="cuerpo">${texto.map(esc).join('<br>')}</div></div>`:'')+
    `<div class="imgs">${L.map(elemento).join('')}</div>`;
}

/* ---------- Trámites (requisitos) — solo Pedidos y Peticiones ---------- */
const TR=M.tramites.filter(t=>t.t==='Pedido'||t.t==='Petición');
/* Texto normalizado de cada trámite: se calcula la primera vez que se necesita y, entretanto, por adelantado cuando el
   navegador está libre (antes se calculaba todo durante el arranque). El resultado de la búsqueda es idéntico. */
const esImg=l=>typeof l==='string'&&l.charCodeAt(0)===1&&l.startsWith('\u0001IMG:');
const sinImg=a=>a.filter(l=>!esImg(l));
const idxT=t=>{if(t.nN===undefined){t.nN=norm(t.n);t.nS=norm(t.s.map(x=>sinImg(x).join(' ')).join(' '));}return t;};
{const libre=f=>window.requestIdleCallback?requestIdleCallback(f,{timeout:3000}):setTimeout(()=>f(null),400);
 let i=0;const paso=d=>{while(i<TR.length&&(!d||d.timeRemaining()>3))idxT(TR[i++]);if(i<TR.length)libre(paso);};
 libre(paso);}
let trSel=null, trLista=[];
function buscarTramites(toks){
  if(!toks.length) return TR.slice();
  const r=[];
  for(const t of TR){
    if(toks.length===1&&norm(t.c)===toks[0]){r.push({t,s:1e4});continue;}
    idxT(t);const pal=t.nN.split(' '); let s=0,ok=true,enNombre=0;
    for(const w of toks){
      const n=tokScore(w,t.nN,pal), c=t.nS.includes(w)?1:0;
      if(!n&&!c){ok=false;break;} s+=n*30+c; if(n)enNombre++;
    }
    if(!ok) continue;
    const frase=toks.join(' '); if(t.nN.includes(frase)) s+=100; if(enNombre===toks.length) s+=50;
    r.push({t,s});
  }
  return r.sort((a,b)=>b.s-a.s).map(o=>o.t);
}
function linea(l){
  const h=esc(l).replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g,'<a href="mailto:$1">$1</a>');
  const br=h.replace(/\n/g,'<br>');
  const num=l.match(/^(\d{1,3})\.\s+([\s\S]*)$/);
  if(num){const cut=h.replace(/^\d{1,3}\.\s+/,'').replace(/\n/g,'<br>');return `<p class="req"><span class="n">${num[1]}</span><span class="t">${cut}</span></p>`;}
  if(/^notas?\s*:?\s*$/i.test(l.trim()))return `<p class="sub">${br}</p>`;
  if(/^nota\s*\d*\s*[:.\-–]/i.test(l))return `<p class="nt">${br}</p>`;
  const sub=/:\s*$/.test(l)&&l.length<110&&!/^\d+\./.test(l);
  return `<p${sub?' class="sub"':''}>${br}</p>`;
}
const textoSec=(t,i)=>{const a=sinImg(t.s[i]);return a.length?a.join('\n'):NR;};
function lineaT(l,t){
  if(!esImg(l))return linea(l);
  const u=((window.IMGREQ||{})['REQ '+t.c]||[])[+l.slice(5)];
  return u?`<div class="imgs inl"><img src="${u}" alt="Imagen de la matriz de requisitos" title="Clic para ver en tamaño completo" decoding="async"></div>`:'';
}
function pintarTramites(){
  let h=titulo('Requisitos por trámite (Pedidos y Peticiones)',trLista.length);
  if(!trLista.length) return h+`<div class="vacio">No se encontró ningún trámite con esas palabras.</div>`;
  if(trLista.length>1) h+=`<div class="otros">${trLista.map(t=>`<div class="${t.t}${t===trSel?' sel':''}" data-tr="${esc(t.c)}"><span class="cod">${esc(t.c)}</span><span>${esc(t.n)}</span><span class="tpx">${esc(t.t)}</span></div>`).join('')}</div>`;
  const t=trSel;
  h+=`<div class="encab"><div class="plate" aria-hidden="true"><small>${esc(t.t)}</small><b>${esc(t.c)}</b></div><div class="et"><h2><span class="sr-t">${esc(t.t)} ${esc(t.c)} – </span>${esc(t.n)}</h2><span class="pag">${esc(t.p)}</span></div>
      ${btnCopiar(S.map((s,i)=>s.toUpperCase()+'\n'+textoSec(t,i)).join('\n\n')).replace('>Copiar<','>Copiar todo<')}</div>`;
  h+=S.map((s,i)=>`<div class="ic c${i}"><div class="cab"><span><i class="ix" aria-hidden="true">${String(i+1).padStart(2,'0')}</i>${esc(s)}</span>${btnCopiar(textoSec(t,i))}</div>
      <div class="cuerpo">${t.s[i].length?t.s[i].map(l=>lineaT(l,t)).join(''):`<p class="na">${NR}</p>`}</div></div>`).join('');
  return h;
}

/* ---------- Bases de Información general ---------- */
const B={
 ap:{n:'Base de datos alumbrado público',f:q=>{const L=buscarEn(G.ap,tokens(q),a=>a.mun,a=>[a.mun,a.nom,a.zona,a.dep].join(' '));
   return titulo('Base de datos alumbrado público',L.length)+(L.length?L.map(a=>tarjeta('AP '+a.mun,a.prest+' · '+a.dep,
   [['Nombre',a.nom],['Dirección',una(a.dir,' ')],['Teléfono - Celular',[una(a.tel),una(a.cel)].filter(Boolean).join(' - ')],['Correo electrónico',una(a.mail,' ')]],
   '',G.apNotas[a.mun])).join(''):sinRes(q));}},
 essa:{n:'Directorio de contactos ESSA en casa (aliados)',f:q=>{const L=buscarEn(G.essaCasa,tokens(q),a=>a.emp,a=>[a.emp,a.cont,a.port,a.dir,a.mail].join(' '));
   return titulo('Directorio de contactos ESSA en casa',L.length)+(L.length?L.map(a=>tarjeta(a.emp,'',
   [['Empresa',a.emp],['Dirección',una(a.dir,' ')],['Municipio, Departamento',a.ubic],['Teléfono',una(a.tel)],['Correo electrónico',una(a.mail,' ')]],
   `<b>Contacto:</b> ${esc(una(a.cont,', '))||NR} · <b>Portafolio:</b> ${esc(a.port)||NR} <i>(no se copia)</i>`)).join(''):sinRes(q));}},
 rel:{n:'Relacionamiento ESSA - Municipios (ejecutivos)',f:q=>{const L=buscarEn(G.rel,tokens(q),a=>a.mun,a=>[a.mun,a.zona,a.ejec].join(' '));
   return titulo('Relacionamiento ESSA - Municipios (Segmento Gobierno)',L.length)+(L.length?L.map(a=>tarjeta('Ejecutivo '+a.mun,'Zona '+a.zona,[['Ejecutivo',a.ejec]])).join(''):sinRes(q));}},
 adm:{n:'Directorio Administraciones Municipales',f:q=>{const L=buscarEn(G.adm,tokens(q),a=>a.mun,a=>[a.mun,a.dpto,a.cta].join(' '));
   return titulo('Directorio Administraciones Municipales',L.length)+(L.length?L.map(a=>tarjeta(a.mun,a.dpto,
   [['Cuenta padre AP',a.cta],['Municipio',a.mun],['Dirección',una(a.dir,' ')],['Teléfono',una(a.tel)]])).join(''):sinRes(q));}},
 aseo:{n:'Facturación conjunta - Aseo',f:q=>{const L=buscarEn(G.aseo,tokens(q),a=>a.mun+' '+a.emp,a=>[a.mun,a.emp,a.cont,a.dir,a.mail,a.tel].join(' '));
   return titulo('Facturación conjunta - Aseo',L.length)+(L.length?L.map(a=>tarjeta(a.emp,a.mun,
   [['Empresa',a.emp],['Dirección',una(a.dir,' ')],['Teléfono',una(a.tel)],['Correo electrónico',una(a.mail,' ')]],
   `<b>Contacto:</b> ${esc(a.cont)||NR} · <b>Municipio donde presta el servicio:</b> ${esc(a.mun)} <i>(no se copia)</i>`)).join(''):sinRes(q));}},
 sitios:{n:'Sitios de menor desarrollo económico',f:q=>{const L=buscarEn(G.sitios,tokens(q),x=>x);
   return titulo('Sitios de menor desarrollo económico',L.length)+(L.length?`<div class="ic"><div class="cab"><span>Listado</span>${btnCopiar(L.join('\n'))}</div><div class="cuerpo">${L.map(esc).join('<br>')}</div></div>`:sinRes(q));}},
 costos:{n:'Costo materiales',f:q=>{const L=buscarEn(G.costos,tokens(q),c=>c.cat+' '+c.desc);let cat='';
   return titulo('Costo materiales (valor unitario IVA incluido)',L.length)+(L.length?`<table class="ig"><tr><td>Descripción</td><td>Unidad</td><td>Valor unitario</td></tr>${L.map(c=>(c.cat!==cat?(cat=c.cat,`<tr><td colspan="3" style="background:var(--purple-tint);color:var(--purple);font-weight:700">${esc(c.cat)}</td></tr>`):'')+`<tr><td>${esc(c.desc)}</td><td>${esc(c.und)}</td><td style="white-space:nowrap">${esc(c.val)}</td></tr>`).join('')}</table>`:sinRes(q));}},
 conexion:{n:'Costos por conexión al servicio',f:()=>imagenes('CostosConexión','Costos por conexión al servicio')},
 financ:{n:'Condiciones para financiación',f:()=>titulo('Condiciones para financiación')+grid(G.financ)},
 otc:{n:'Otras comercializadoras SDL',f:q=>{const L=buscarEn(G.otc,tokens(q),a=>a.otc+' '+a.cta,a=>[a.otc,a.cta,a.nit,a.ciu,a.dep,a.dir].join(' '));
   return titulo('Base de datos otras comercializadoras SDL',L.length)+(L.length?L.map(a=>tarjeta(a.otc,'',[['Cuenta',a.cta],['OTC',a.otc]].concat([['Nit',a.nit],['Teléfono',a.tel],['Dirección',a.dir],['Ciudad',a.ciu],['Departamento',a.dep]].filter(x=>x[1])))).join(''):sinRes(q));}},
 med:{n:'Medidores parametrizables',f:q=>{const L=buscarEn(G.medidores,tokens(q),m=>m.marca+' '+m.modelo);
   return titulo('Medidores parametrizables',L.length)+(L.length?`<div class="ic"><div class="cab"><span>Marca · Modelo</span>${btnCopiar(L.map(m=>m.marca+' '+m.modelo).join('\n'))}</div><div class="cuerpo"><table class="ig"><tr><td>Marca</td><td>Modelo</td></tr>${L.map(m=>`<tr><td>${esc(m.marca)}</td><td>${esc(m.modelo)}</td></tr>`).join('')}</table></div></div>`:sinRes(q));}},
 asent:{n:'Asentamientos Bga-Bca',f:q=>{if(!tokens(q).length) return titulo('Asentamientos Bga-Bca')+grid(G.asent);
   const todos=[];G.asent.slice(1).forEach(r=>r.forEach(c=>{if(c[0])todos.push(c[0]);}));const L=buscarEn(todos,tokens(q),x=>x);
   return titulo('Asentamientos Bga-Bca',L.length)+(L.length?`<div class="ic"><div class="cuerpo">${L.map(esc).join('<br>')}</div></div>`:sinRes(q));}},
 asentF:{n:'Asentamientos Floridablanca',f:()=>imagenes('Asentamientos Floridablanca','Asentamientos Floridablanca')},
 anexo1:{n:'Anexo 1: Instalaciones que requieren dictamen RETIE',f:()=>titulo('Anexo 1: Instalaciones que requieren dictamen de inspección RETIE')+`<div class="ic"><div class="cuerpo">${G.anexo1.map(esc).join('<br>')}</div></div>`},
 anexo2:{n:'Anexo 2: Ampliaciones y remodelaciones (RETIE)',f:()=>imagenes('Anexo 2','Anexo 2: Ampliaciones y remodelaciones que requieren dictamen de inspección RETIE')},
 anexo3:{n:'Anexo 3: Componentes del sistema de medición',f:()=>titulo('Anexo 3: Componentes del sistema de medición')+`<div class="ic"><div class="cuerpo">${G.anexo3.map(esc).join('<br>')}</div></div>`},
 anexo4:{n:'Anexo 4: Certificación de conformidad de producto',f:()=>imagenes('Anexo 4','Anexo 4: Certificación de conformidad de producto para los elementos del sistema de medición')},
 anexo5:{n:'Anexo 5: Formato autorización cobro de conexo',f:()=>imagenes('Anexo 5','Anexo 5: Formato autorización cobro de conexo para medidores')},
 rut:{n:'RUT',f:()=>imagenes('RUT','RUT')},
 planos:{n:'Planos',f:()=>imagenes('Planos','Planos')},
 guati:{n:'Comunicado Guatiguara',f:()=>imagenes('ComunicadoGuatiguara','Comunicado Guatiguara')}
};
/* Hojas con imágenes o documentos que no tienen consulta propia: se agregan a la lista */
{const usadas=new Set(['CostosConexión','Asentamientos Floridablanca','Anexo 2','Anexo 4','Anexo 5','RUT','Planos','ComunicadoGuatiguara']);
 (window.IMGGEN_CLAVES?window.IMGGEN_CLAVES():Object.keys(window.IMGGEN||{})).filter(h=>!usadas.has(h)&&!/^REQ /.test(h)).forEach((h,i)=>{B['x'+i]={n:h+' (imágenes y documentos)',f:()=>imagenes(h,h)};});}
/* Cada base de información general se muestra con el color de su hoja */
Object.values(B).forEach(v=>{const f=v.f;v.f=q=>`<div class="grp" style="${window.estiloHoja?window.estiloHoja(v.n):''}">${f(q)}</div>`;});
/* Lista desplegable (orden alfabético) */
$('otras').innerHTML+=Object.entries(B).sort((a,b)=>a[1].n.localeCompare(b[1].n,'es')).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');

/* ---------- Palabras clave ---------- */
/* Solo 4 palabras clave: la primera palabra define DÓNDE buscar; lo demás es QUÉ buscar */
const CLAVES=[
 [/^requisitos(\s+|$)/,'req'],
 [/^ap(\s+|$)/,'ap'],
 [/^aliados?(\s+|$)/,'essa'],
 [/^ejecutivos?(\s+|$)/,'rel'],
 [/^aseo(\s+|$)/,'aseo'],
 [/^(alcaldia|administracion)(\s+|$)/,'adm'],
 [/^otc(\s+|$)/,'otc']
];
function ejecutar(){
  COPIAS=[];
  const crudo=$('q').value, q=norm(crudo), sel=$('otras').value;
  let html='';
  let clave=null,resto=q;
  for(const [re,k] of CLAVES){const m=q.match(re);if(m){clave=k;resto=q.slice(m[0].length).trim();break;}}
  if(clave){
    if(sel){$('otras').value='';}
    if(clave==='req'){
      const nuevo=buscarTramites(tokens(resto));
      if(!nuevo.includes(trSel)) trSel=nuevo[0]||null;
      trLista=nuevo; html=resto?pintarTramites():titulo('Requisitos por trámite')+`<div class="vacio">Escriba el nombre del trámite después de <b>requisitos</b>.<br>Ej.: requisitos traslado saldo a favor</div>`;
    } else html=B[clave].f(resto);
  }
  else if(sel){ html=B[sel].f(q); }
  else if(!q){ html=`<div class="vacio inicio"><div class="vi-ico" aria-hidden="true"></div><h3>¿Qué trámite necesita consultar?</h3><p>Escriba el nombre de un trámite, un municipio, una empresa (aliado, aseo, OTC), un ejecutivo o un material, o abra <b>Otras consultas</b>.</p></div>`; }
  else{
    /* Búsqueda libre por RELEVANCIA: primero la coincidencia más exacta, venga de donde venga.
       Nivel 4 = el nombre es exactamente lo buscado · 3 = el nombre contiene la frase completa
       2 = el nombre contiene todas las palabras · 1 = solo aparece en otros datos (contacto, portafolio, requisitos…)
       Empates: los trámites van primero. Las aproximaciones (1 letra de diferencia) solo se usan si no hay nada más. */
    const t=tokens(q), frase=t.join(' ');
    const J=(...v)=>v.filter(Boolean).join(' ');
    const pal=x=>' '+norm(x)+' ';
    const todas=(txt)=>{const p=norm(txt).split(' ');return t.every(w=>p.some(x=>x.startsWith(w)));};
    const nivel=(pri,sec)=>{const P=tokens(pri).join(' ');if(!t.length)return 0;
      if(P===frase)return 4; if(pal(P).includes(' '+frase+' '))return 3; if(todas(P))return 2; if(sec&&todas(sec))return 1; return 0;};
    const asentTodos=[];(G.asent||[]).slice(1).forEach(r=>r.forEach(c=>{if(c[0])asentTodos.push(c[0]);}));
    const BUS=[
      ['essa',G.essaCasa,a=>a.emp,a=>J(a.emp,a.cont,a.port,a.dir,a.mail)],
      ['aseo',G.aseo,a=>a.emp,a=>J(a.emp,a.mun,a.cont,a.dir,a.mail)],
      ['ap',G.ap,a=>a.mun,a=>J(a.mun,a.nom,a.zona,a.dep)],
      ['rel',G.rel,a=>a.mun,a=>J(a.mun,a.zona,a.ejec)],
      ['adm',G.adm,a=>a.mun,a=>J(a.mun,a.dpto,a.cta)],
      ['otc',G.otc,a=>a.otc,a=>J(a.otc,a.cta,a.nit,a.ciu)],
      ['med',G.medidores,m=>J(m.marca,m.modelo),m=>J(m.marca,m.modelo)],
      ['costos',G.costos,c=>c.desc,c=>J(c.cat,c.desc)],
      ['sitios',G.sitios,x=>x,x=>x],
      ['asent',asentTodos,x=>x,x=>x]];
    const bloques=[];
    /* Trámites: nivel por nombre del trámite; nivel 1 si la palabra solo está en el contenido */
    ESTRICTO=true;
    const trs=buscarTramites(t).map((x,i)=>({x,i,n:Math.max(nivel(x.n,null),norm(x.c)===frase?4:0,1)})).sort((a,b)=>b.n-a.n||a.i-b.i);
    const trTop=trs.slice(0,8).map(o=>o.x);
    const pintaTr=L=>`<div class="grp grp-tr" style="${window.estiloHoja?window.estiloHoja('tramites'):''}">`+titulo('Trámites relacionados',L.length)+`<div class="otros">${L.map(x=>`<div class="${x.t}" data-ir="${esc(x.c)}"><span class="cod">${esc(x.c)}</span><span>${esc(x.n)}</span><span class="tpx">${esc(x.t)}</span></div>`).join('')}</div></div>`;
    /* Si el nombre del trámite coincide exactamente, se abre de una vez con todo su contenido (texto e imágenes) */
    if(trs.length&&trs[0].n===4){trLista=trTop;trSel=trs[0].x;bloques.push({n:4,o:0,h:`<div class="grp grp-tr" style="${window.estiloHoja?window.estiloHoja('tramites'):''}">`+pintarTramites()+`</div>`});}
    else if(trs.length) bloques.push({n:trs[0].n,o:0,h:pintaTr(trTop)});
    BUS.forEach(([k,L,pri,sec],j)=>{if(!B[k]||!L)return;let m=0;for(const x of L){const v=nivel(pri(x),sec(x));if(v>m){m=v;if(m===4)break;}}
      if(m) bloques.push({n:m,o:j+1,h:B[k].f(q)});});
    ESTRICTO=false;
    bloques.sort((a,b)=>b.n-a.n||a.o-b.o);
    html=bloques.map(x=>x.h).join('');
    if(!html){ /* sin coincidencias exactas: sugerencias aproximadas, trámites primero */
      const tr=buscarTramites(t).slice(0,8);
      if(tr.length) html+=pintaTr(tr);
      for(const [k,L,pri,sec] of BUS) if(B[k]&&L&&L.some(x=>puntaje(t,sec(x))>0)) html+=B[k].f(q);
      if(html) html=`<div class="vacio aprox">No hay coincidencia exacta para <b>${esc(crudo)}</b>. Estas son las sugerencias más parecidas:</div>`+html;
    }
    if(!html) html=sinRes(crudo)+`<div class="vacio">Use las palabras clave: <b>requisitos</b>, <b>AP</b>, <b>aliado</b>, <b>ejecutivo</b>, <b>aseo</b>, <b>alcaldía</b> u <b>OTC</b>.</div>`;
  }
  $('res').innerHTML=html;
}

/* ---------- Eventos ---------- */
let tm;
$('q').addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(()=>{$('res').scrollTop=0;ejecutar();},220);});
$('q').addEventListener('keydown',e=>{if(e.key==='Escape'){$('q').value='';ejecutar();}});
$('otras').addEventListener('change',()=>{const m=norm($('q').value);if(CLAVES.some(([re])=>re.test(m)))$('q').value='';$('res').scrollTop=0;ejecutar();$('q').focus();});
$('limpiar').onclick=()=>{$('q').value='';$('otras').value='';trSel=null;ejecutar();$('q').focus();};
if($('ayuda'))$('ayuda').addEventListener('click',e=>{const b=e.target.closest('[data-ej]');if(!b)return;$('otras').value='';$('q').value=b.dataset.ej;$('q').focus();ejecutar();});
$('res').addEventListener('click',async e=>{
  const tr=e.target.closest('[data-tr]'); if(tr){trSel=TR.find(t=>t.c===tr.dataset.tr);COPIAS=[];$('res').innerHTML=pintarTramites();return;}
  const ir=e.target.closest('[data-ir]'); if(ir){const t=TR.find(x=>x.c===ir.dataset.ir);$('q').value='requisitos '+t.n;trSel=t;ejecutar();return;}
  const im=e.target.closest('.imgs img'); if(im){const w=window.open();if(w)w.document.write(`<img src="${im.src}" style="max-width:100%">`);return;}
  const b=e.target.closest('[data-c]'); if(!b) return;
  const txt=COPIAS[+b.dataset.c];
  try{await navigator.clipboard.writeText(txt);}catch(_){const a=document.createElement('textarea');a.value=txt;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();}
  const o=b.textContent;b.textContent='Copiado';b.classList.add('ok');setTimeout(()=>{b.textContent=o;b.classList.remove('ok');},1300);
});
ejecutar();
})();

export {};
