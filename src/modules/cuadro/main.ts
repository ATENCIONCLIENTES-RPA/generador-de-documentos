// @ts-nocheck — cuerpo legado del módulo «cuadro», extraído sin cambios de lógica desde el HTML original.
// Se ejecuta como módulo ES. El tipado estricto se aplicará de forma progresiva (fase 2).
import '../../styles/fonts.css';
import '../shared/module-embedded.css';
import '../../components/guided-tour/guided-tour.css';
import './cuadro.base.css';
import './cuadro.redesign.css';
import '../shared/module-bridge';
import { GuidedTour } from '../../components/guided-tour/guided-tour';

/* ---- script 1/3 (orden original del documento) ---- */
(function(){
  const SUN='<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
  const MOON='<path d="M20.5 14.2a8.5 8.5 0 1 1-9.7-11.7 7 7 0 0 0 9.7 11.7Z"/>';
  const wrap=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
  const logo=document.getElementById('brand2Logo'); if(logo) logo.innerHTML=wrap(SUN);
  const knob=document.getElementById('ttKnob2'), toggle=document.getElementById('themeToggle2');
  function applyTheme(mode){
    document.documentElement.setAttribute('data-theme',mode);
    if(knob) knob.innerHTML=wrap(mode==='dark'?MOON:SUN);
    if(toggle) toggle.title=mode==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro';
    try{ localStorage.setItem('essa_cm_theme',mode); }catch(e){}
  }
  let saved='light'; try{ saved=localStorage.getItem('essa_cm_theme')||'light'; }catch(e){}
  applyTheme(saved);
  if(toggle) toggle.addEventListener('click',()=>{
    applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
  });
})();

/* ---- script 2/3 (orden original del documento) ---- */
/* La Carpeta de datos se gestiona desde Recursos (Módulo 1). El estado del tablero
   (notas, colores, consultas, expedientes y rutas) usa el DataRepository compartido:
   IndexedDB es la copia persistente y el espejo síncrono mantiene la compatibilidad. */

/* ---- script 3/3 (orden original del documento) ---- */
/* DataRepository es la única puerta de lectura/escritura para el estado persistente.
   IndexedDB conserva la copia principal; localStorage queda como espejo síncrono para
   compatibilidad cuando este módulo se ejecuta de manera aislada. */
const APPDATA=(window.AD&&(AD.data||AD.backup))||null;
const appDataGet=k=>APPDATA?APPDATA.getItem(k):localStorage.getItem(k);
const appDataSet=(k,v)=>{ if(APPDATA){ if(!APPDATA.setItem(k,v)) throw new Error('No se pudo guardar en el repositorio local'); return true; } localStorage.setItem(k,v); return true; };
const appDataRemove=k=>APPDATA?APPDATA.removeItem(k):localStorage.removeItem(k);

/* ==================== CONFIGURACIÓN AJUSTABLE ==================== */
const CFG = {
  diasHabiles: 15,
  medios: ['Escrito','Página Web','E-Mail'],
  criticoDias: 2,
  proximoDias: 5,
  /* Radicados "de relleno": terminan en 5 o más ceros (ej. 20260300000000).
     No se agrupan, porque cada fila es un caso distinto con su propia cuenta. */
  patronRelleno: /0{5,}$/,
  /* Equipo: el cuadro de mando SOLO trabaja con los usuarios del equipo, pero ya NO existe una lista
     fija de nombres en el código. La lista se obtiene de la configuración de rutas (RUTAS · «Usuarios
     de la ruta», persistida y editable) mediante reconstruirEquipo(). Las variantes del mismo nombre
     (CONT-, abreviaturas, apellidos incompletos) se siguen unificando en el nombre de esa lista. */
  equipo: [],
  /* Ventana ampliada para detectar vencidas (días 16 a 20) */
  diasVencidas: 20,
  /* Rutas de Mercurio que NO entran al informe */
  rutasExcluidas: ['ESSA-DISTRIBUCION Y ALISTAMIENTO DE CORRESPONDENCIA',
                   'GESTION DOCUMENTAL',
                   'SGEPM - NOVEDADES VENTA DE FACTURAS'],
  /* Solo estos prefijos de proceso alimentan el filtro "Tipo de trámite" */
  prefijosTramite: /^(27|28|29|30|31|39|4153|4101|4115)/,
  /* Paleta para marcar radicados */
  colores: ['#d93025','#f29d38','#f7c600','#2e9e5b','#1565d8','#7b61d8','#61708a']
};
/* ================================================================= */

/* ======== BLINDAJE GENERAL ========
   · $ seguro: si un elemento no existe (por una edición futura), se reporta y se
     devuelve un elemento "fantasma" en vez de detener todo el script.
   · Errores visibles: cualquier fallo muestra un aviso en pantalla en lugar de
     dejar paneles en blanco sin explicación. */
const _FANTASMA={};
const $ = id => { const e=document.getElementById(id); if(e) return e;
  if(!_FANTASMA[id]){ _FANTASMA[id]=document.createElement('div'); reportaError('Elemento #'+id+' no encontrado'); }
  return _FANTASMA[id]; };
const _ERRS=[];
function reportaError(donde,err){
  const msg=donde+(err?': '+(err.message||err):'');
  if(_ERRS.includes(msg)) return; _ERRS.push(msg); console.error('[Cuadro de Control]',msg,err||'');
  let b=document.getElementById('barraErr');
  if(!b){ b=document.createElement('div'); b.id='barraErr';
    b.innerHTML='<b>⚠ Se presentó un error en el cuadro de control.</b> <span></span> '+
      '<button onclick="location.reload()">Recargar</button> <button onclick="this.parentNode.remove()">Cerrar</button>';
    (document.body||document.documentElement).appendChild(b); }
  b.querySelector('span').textContent=_ERRS.slice(-3).join(' · ');
}
window.addEventListener('error',e=>reportaError('Error',e.error||e.message));
window.addEventListener('unhandledrejection',e=>reportaError('Error asíncrono',e.reason));
/* envuelve una función para que un fallo no rompa el resto de la herramienta */
const seguro=(fn,nombre)=>function(){ try{ return fn.apply(this,arguments); }catch(e){ reportaError(nombre,e); } };

/* ---------- Festivos de Colombia (Ley 51 de 1983 - Ley Emiliani) ---------- */
function pascua(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
    f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
    i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
    mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;
  return new Date(y,mes-1,dia);
}
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const aLunes=d=>{const x=new Date(d);const w=x.getDay();if(w!==1)x.setDate(x.getDate()+((8-w)%7));return x;};
const clave=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const cacheFest={};
function festivos(y){
  if(cacheFest[y]) return cacheFest[y];
  const P=pascua(y), F=[
    new Date(y,0,1), aLunes(new Date(y,0,6)), aLunes(new Date(y,2,19)),
    addD(P,-3), addD(P,-2), new Date(y,4,1),
    aLunes(addD(P,39)), aLunes(addD(P,60)), aLunes(addD(P,68)),
    aLunes(new Date(y,5,29)), new Date(y,6,20), new Date(y,7,7),
    aLunes(new Date(y,7,15)), aLunes(new Date(y,9,12)), aLunes(new Date(y,10,1)),
    aLunes(new Date(y,10,11)), new Date(y,11,8), new Date(y,11,25)
  ];
  return cacheFest[y]=new Set(F.map(clave));
}
const esHabil = d => d.getDay()!==0 && d.getDay()!==6 && !festivos(d.getFullYear()).has(clave(d));

const HOY=new Date(); HOY.setHours(0,0,0,0);
{ const s=HOY.toLocaleDateString('es-CO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).replace(',','');
  $('hoyTxt').textContent=s.charAt(0).toUpperCase()+s.slice(1);
  $('calMesMini').textContent=HOY.toLocaleDateString('es-CO',{month:'short'}).replace('.','');
  $('calDiaMini').textContent=String(HOY.getDate()).padStart(2,'0'); }
const ESCALERA=[], ESCALERA_EXT=[], MAPA_DIA={};
(function(){
  let cur=new Date(HOY), n=0;
  while(n<CFG.diasVencidas){
    if(esHabil(cur)){ n++; const k=clave(cur);
      const it={dia:n,fecha:new Date(cur),k};
      ESCALERA_EXT.push(it); MAPA_DIA[k]=n;
      if(n<=CFG.diasHabiles) ESCALERA.push(it);
    }
    cur=addD(cur,-1);
  }
})();
(function(){ const d15=ESCALERA.find(s=>s.dia===CFG.diasHabiles);
  const f=d15?d15.fecha.toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}):'';
  $('rangoTxt').innerHTML = !d15 ? '' : (esHabil(HOY)
    ? 'Hoy vence lo que llegó el <b>'+f+'</b>'
    : 'Último día hábil: venció lo que llegó el <b>'+f+'</b>'); })();
function aDiaHabil(d){ let x=new Date(d),g=0; while(!esHabil(x)&&g<15){x=addD(x,1);g++;} return x; }
/* Fecha de vencimiento de un día de recibo: el día hábil en que esos radicados
   llegan al Día 15 (el día de recibo cuenta como Día 1; se descuentan fines de
   semana y festivos). Desde el día hábil siguiente pasan a vencidos. */
const CACHE_VTO={};
function fechaVence(recibo){
  if(!recibo) return null;
  const k=clave(recibo); if(CACHE_VTO[k]) return CACHE_VTO[k];
  let d=aDiaHabil(recibo), n=1;
  while(n<CFG.diasHabiles){ d=addD(d,1); if(esHabil(d)) n++; }
  return CACHE_VTO[k]=d;
}
/* celda de vencimiento: rojo si ya venció, resaltado si vence hoy */
function celdaVence(recibo){
  const v=fechaVence(recibo); if(!v) return '—';
  const dd=difDias(v,HOY);
  if(dd<0)   return '<span class="vtoPas">'+dFmt(v)+'</span>';
  if(dd===0) return '<span class="vtoHoy">'+dFmt(v)+' · hoy</span>';
  return dFmt(v)+' <span class="sp">'+DIA_CORTO[v.getDay()]+'</span>';
}

/* ---------- utilidades ---------- */
const esFechaObj = v => Object.prototype.toString.call(v)==='[object Date]';
const dFmt = d => esFechaObj(d) && !isNaN(d) ? d.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
const difDias = (a,b) => Math.round((new Date(a.getFullYear(),a.getMonth(),a.getDate())-new Date(b.getFullYear(),b.getMonth(),b.getDate()))/86400000);
const txt = v => (v==null||v==='') ? '' : String(v).replace(/_x000D_/g,' ').replace(/\s+/g,' ').trim();
const num = v => v==null||v==='' ? '' : (typeof v==='number' ? (Number.isInteger(v)?String(v):v.toFixed(0)) : String(v).trim());
const esc = t => String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const nfmt = n => n.toLocaleString('es-CO');
const sinTilde = s => String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const soloNum = v => num(v).replace(/\D/g,'');
const canonNombre = s => sinTilde(String(s==null?'':s).replace(/\(.*?\)/g,'')).replace(/\s+/g,' ').trim();
/* usuarios vienen como ESSA\DCARRILL -> DCARRILL */
const limpiaUsuario = s => txt(s).replace(/^.*\\/,'').trim();

function parseFecha(v){
  if(v==null||v==='') return null;
  if(esFechaObj(v)) return isNaN(v)?null:new Date(v.getFullYear(),v.getMonth(),v.getDate());
  if(typeof v==='number'){ const d=new Date(Math.round((v-25569)*86400000));
    return isNaN(d)?null:new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()); }
  const s=String(v).trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return new Date(+m[3],+m[2]-1,+m[1]);
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  const d=new Date(s); return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
const MEDIOS_OK = CFG.medios.map(sinTilde);
function medioValido(m){
  const s=sinTilde(m);
  if(!s||s==='sin medio') return false;
  return MEDIOS_OK.some(x=>s===x)||/correo|e-?mail/.test(s)||/pagina web|portal web/.test(s)||/^escrito/.test(s);
}
const esCorreo = m => /correo|e-?mail/.test(sinTilde(m));

/* ======== SANEAMIENTO DE DATOS GUARDADOS ========
   Los datos guardados pueden venir de versiones anteriores, de un respaldo importado o
   quedar incompletos. Cada estructura se limpia UNA vez al cargarla: se conserva todo lo
   válido tal cual y solo se reparan o descartan las entradas con una forma inesperada,
   para que ningún panel falle al leerlas. */
const _esObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const _str=v=>(v==null||typeof v==='object')?'':String(v);
const _strs=v=>(Array.isArray(v)?v:(v==null||v===''?[]:[v])).filter(x=>x!=null&&typeof x!=='object').map(String).filter(s=>s!=='');
const _fecha=v=>/^\d{4}-\d{2}-\d{2}$/.test(_str(v))?_str(v):'';
const _color=v=>/^#[0-9a-f]{6}$/i.test(_str(v))?_str(v):'';
function sanearMapa(o,fn){ const r={}; if(!_esObj(o)) return r;
  Object.keys(o).forEach(k=>{ try{ const v=fn(o[k],k); if(v!==undefined) r[k]=v; }catch(e){} }); return r; }
const SANEA={
  ajustes:o=>sanearMapa(o,v=>_fecha(v)||undefined),
  marcas:o=>sanearMapa(o,v=>{ if(!_esObj(v)) return undefined; const r=Object.assign({},v);
    if('nota' in r){ r.nota=_str(r.nota); if(!r.nota) delete r.nota; }
    if('color' in r){ r.color=_color(r.color); if(!r.color) delete r.color; }
    if('vis' in r && !_fecha(r.vis)) delete r.vis;
    return (r.nota||r.color)?r:undefined; }),
  evac:o=>sanearMapa(o,(v,k)=>{ if(v==null||v===false) return undefined;
    const r=_esObj(v)?Object.assign({},v):{}; r.f=_fecha(r.f); r.r=_str(r.r)||k; r.u=_str(r.u);
    if('vis' in r && !_fecha(r.vis)) delete r.vis; return r; }),
  exp:o=>sanearMapa(o,v=>{ if(!_esObj(v)) return undefined; const r=Object.assign({},v);
    ['est','n'].forEach(x=>{ if(x in r){ r[x]=_str(r[x]); if(!r[x]) delete r[x]; } });
    if('c' in r){ r.c=_color(r.c); if(!r.c) delete r.c; }
    if('vis' in r && !_fecha(r.vis)) delete r.vis;
    if('ev' in r && !_fecha(r.ev)) delete r.ev; return r; }),
  chk:o=>sanearMapa(o,v=>(v&&typeof v!=='object')?1:undefined),
  cons:o=>sanearMapa(o,(v,k)=>{ if(!_esObj(v)) return undefined; const r=Object.assign({},v);
    if('ev' in r){ r.ev=_fecha(r.ev)||(/^\d{8}$/.test(_str(r.ev))?_str(r.ev).replace(/(\d{4})(\d{2})(\d{2})/,'$1-$2-$3'):''); if(!r.ev) delete r.ev; }
    ['obs','cons'].forEach(x=>{ if(x in r){ r[x]=_str(r[x]); if(!r[x]) delete r[x]; } });
    if('f' in r) r.f=normFoto(r.f,k); return r; }),
  hist:o=>sanearMapa(o,(v,k)=>{ if(!_esObj(v)) return undefined; const r={};
    ['u','r','p','c','t','fr','fv','s','cl','tr','n','o','g','ev','vb','tram'].forEach(x=>r[x]=_str(v[x]));
    if(!r.p) r.p=k; if(!r.u) return undefined; return r; }),
  cuaderno:v=>({ notas:sanearMapa(_esObj(v)&&v.notas,x=>{ const a=_strs(x); return a.length?a:undefined; }),
                 cumple:sanearMapa(_esObj(v)&&v.cumple,x=>{ const a=_strs(x); return a.length?a:undefined; }) }),
  cal:v=>{ const b=SANEA.cuaderno(v); b.u=sanearMapa(_esObj(v)&&v.u,x=>SANEA.cuaderno(x)); return b; },
  listas:(o,def)=>{ const r={}; Object.keys(def).forEach(k=>r[k]=Array.isArray(o&&o[k])?_strs(o[k]):def[k].slice());
    if(_esObj(o)) Object.keys(o).forEach(k=>{ if(!(k in r) && Array.isArray(o[k])) r[k]=_strs(o[k]); }); return r; }
};

/* ---------- ajustes de fecha para correos (persistentes) ---------- */
const LS='essa_fechas_correo';
let AJUSTES={};
try{ AJUSTES=JSON.parse(appDataGet(LS)||'{}'); }catch(e){ AJUSTES={}; }
AJUSTES=SANEA.ajustes(AJUSTES);
const guardaAjustes=()=>{ try{ appDataSet(LS,JSON.stringify(AJUSTES)); }catch(e){ reportaError('No se pudo guardar ('+LS+'): almacenamiento lleno',e); } };

/* ---------- columnas ----------
   Las columnas esperadas de SAC Trámite y Mercurio Trámite se definen en el DocStore
   (config.resources.*.columns), junto con su validación. */
let CRUDO={sac:[],mer:[]}, DATOS=[], INDICE={}, nRelleno=0, nCancel=0, nRuta=0;

/* rutas de Mercurio excluidas del informe */
const RUTAS_NO = CFG.rutasExcluidas.map(sinTilde);
const rutaExcluida = r => { const s=sinTilde(r); return !!s && RUTAS_NO.some(x=>s===x||s.indexOf(x)===0); };
/* proceso cancelado: no entra al informe aunque comparta radicado */
/* Cancelado = código exacto "C" o el texto "Cancelado/Cancelada".
   No basta con que empiece por C: "Citación" es un estado vigente. */
const estadoCancel = v => /^(c|cancelad[oa])$/.test(sinTilde(v));
const esCancelado = r => estadoCancel(r.SUBESTADO) || estadoCancel(r.ESTADO_FIN_INICIAL);
/* trámites admitidos en el desplegable */
const tramiteAdmitido = cod => CFG.prefijosTramite.test(String(cod||''));

/* ---------- marcas de color y notas (guardadas en este equipo) ---------- */
const LS_MK='essa_marcas';
let MARCAS={};
try{ MARCAS=JSON.parse(appDataGet(LS_MK)||'{}'); }catch(e){ MARCAS={}; }
MARCAS=SANEA.marcas(MARCAS);
const guardaMarcas=()=>{ try{ appDataSet(LS_MK,JSON.stringify(MARCAS)); }catch(e){ reportaError('No se pudo guardar ('+LS_MK+'): almacenamiento lleno',e); } };
const marcaDe = d => MARCAS[d.llave||d.radicado] || {};
/* ---------- radicados evacuados (gestionados) ----------
   Como el informe no es en tiempo real, el usuario puede sacar del tablero los
   radicados que ya gestionó. Se guardan en este equipo con la fecha de evacuación. */
const LS_EV='essa_evacuados';
let EVAC={};
try{ EVAC=JSON.parse(appDataGet(LS_EV)||'{}'); }catch(e){ EVAC={}; }
EVAC=SANEA.evac(EVAC);
const guardaEvac=()=>{ try{ appDataSet(LS_EV,JSON.stringify(EVAC)); }catch(e){ reportaError('No se pudo guardar ('+LS_EV+'): almacenamiento lleno',e); } };
const claveR = d => d.llave||d.radicado;
const evacuado = d => !!EVAC[claveR(d)];
/* color hex -> rgba translúcido, para el fondo de las filas marcadas */
function rgba(hex,a){
  const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex||''));
  if(!m) return 'transparent';
  return 'rgba('+parseInt(m[1],16)+','+parseInt(m[2],16)+','+parseInt(m[3],16)+','+a+')';
}

/* ---------- unificación de nombres del equipo ----------
   Normaliza (tildes, CONT-/CON-, códigos entre paréntesis, puntos, tabuladores)
   y compara por secuencia de palabras: cada palabra de la variante debe coincidir,
   en orden, con una del nombre oficial, completa o como abreviatura ("J" = "JONES").
   Exige el mismo primer nombre y al menos 2 palabras completas iguales.
   Si una variante encaja igual de bien con dos personas, no se asigna. */
function tokNombre(s){
  return sinTilde(String(s==null?'':s).replace(/\(.*?\)/g,' '))
    .replace(/^cont?\s*[-.:]\s*/,'').replace(/[^a-z ]/g,' ').split(/\s+/).filter(Boolean);
}
let EQUIPO = [];   /* se llena en reconstruirEquipo() a partir de la configuración de rutas */
function puntaje(v,c){
  if(!v.length || !(v[0]===c[0] || (v[0].startsWith(c[0]) && v[0].length>c[0].length))) return 0;
  let j=0, full=0;
  for(const t of v){
    let ok=false;
    while(j<c.length){
      const ct=c[j], nx=c[j+1];
      if(t===ct){ full++; j++; ok=true; break; }
      if(nx && t===ct+nx){ full+=2; j+=2; ok=true; break; }                    /* palabras pegadas */
      if(nx && t.length>ct.length && t.startsWith(ct) && nx.startsWith(t.slice(ct.length))){
        full++; j+=2; ok=true; break; }                                          /* pegada y truncada */
      if(t.length<ct.length && ct.startsWith(t)){ j++; ok=true; break; }        /* abreviatura */
      j++;
    }
    if(!ok) return 0;
  }
  return full>=2 ? full : 0;
}
const CACHE_EQ={}, ALIAS={};
function equipoDe(raw){
  const r=txt(raw); if(!r) return '';
  if(r in CACHE_EQ) return CACHE_EQ[r];
  const v=tokNombre(r); let best='', bs=0, empate=false;
  EQUIPO.forEach(e=>{ const p=puntaje(v,e.toks);
    if(p>bs){ bs=p; best=e.nombre; empate=false; } else if(p && p===bs) empate=true; });
  const res = (bs && !empate) ? best : '';
  if(res) (ALIAS[res]=ALIAS[res]||new Set()).add(r);
  return CACHE_EQ[r]=res;
}
/* ---------- coincidencia flexible firmante (Módulo 1) ↔ responsable (Módulo 2) ----------
   Solo se usa INTERNAMENTE para comparar: los nombres originales no se modifican
   ni se muestran normalizados. Resuelve el nombre del firmante contra la lista
   cerrada CFG.equipo por niveles, del más estricto al más flexible:
     1. Igualdad exacta tras normalizar (mayúsculas, tildes, espacios, signos).
     2. Mismas palabras en cualquier orden ("Pérez García, Juan" = "Juan Pérez García").
     3. Nombre incompleto contenido en el oficial ("Juan Pérez" ⊂ "Juan Pérez García"),
        admitiendo iniciales ("J. Pérez García").
     4. Pequeños errores de escritura por palabra (distancia de edición acotada).
   Salvaguardas contra falsos positivos:
     · En los niveles 3 y 4 se exige al menos un nombre de pila y un apellido
       coincidentes, y como mínimo 2 palabras completas.
     · Ninguna palabra del firmante puede quedar sin pareja.
     · Si dos personas del equipo encajan igual de bien, NO se asigna a ninguna. */
const PARTICULAS_NOMBRE = new Set(['de','del','la','las','los','y','e','da','van','von','san']);
function normalizaNombre(s){
  return String(s==null?'':s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')    /* tildes y diacríticos (ñ -> n) */
    .toLowerCase()
    .replace(/\(.*?\)/g,' ')                              /* códigos entre paréntesis */
    .replace(/^\s*cont?\s*[-.:]\s*/,'')                   /* prefijo CONT- / CON- */
    .replace(/[^a-z0-9,]+/g,' ')                          /* guiones, puntos, signos -> espacio */
    .replace(/\s*,\s*/g,',').replace(/\s+/g,' ').trim();
}
function tokensNombre(s){
  let n=normalizaNombre(s);
  /* "Apellidos, Nombres" -> "Nombres Apellidos" */
  const partes=n.split(',').map(x=>x.trim()).filter(Boolean);
  if(partes.length===2) n=partes[1]+' '+partes[0]; else n=partes.join(' ');
  return n.split(' ').filter(t=>t && !PARTICULAS_NOMBRE.has(t) && /[a-z]/.test(t));
}
/* distancia de Damerau-Levenshtein (transposiciones incluidas) */
function distEdicion(a,b){
  if(a===b) return 0;
  const m=a.length,n=b.length; if(!m) return n; if(!n) return m;
  const d=[]; for(let i=0;i<=m;i++){ d[i]=[i]; } for(let j=1;j<=n;j++) d[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
    const c=a[i-1]===b[j-1]?0:1;
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
  }
  return d[m][n];
}
/* errores admitidos según la longitud: palabras cortas deben ser exactas */
const toleranciaPalabra = len => len>=8 ? 2 : len>=5 ? 1 : 0;
/* tipo de coincidencia entre una palabra del firmante y una del nombre oficial */
function comparaPalabra(t,c,flex){
  if(t===c) return {tipo:'exacta',coste:0};
  if(t.length===1 && c[0]===t) return {tipo:'inicial',coste:0};
  if(flex){
    const tol=Math.min(toleranciaPalabra(t.length),toleranciaPalabra(c.length));
    if(tol && t[0]===c[0]){ const e=distEdicion(t,c); if(e<=tol) return {tipo:'aprox',coste:e}; }
  }
  return null;
}
/* empareja cada palabra del firmante con una palabra distinta del candidato
   (búsqueda exhaustiva: los nombres tienen pocas palabras) */
function emparejar(v,c,flex){
  let mejor=null;
  const usados=new Array(c.length).fill(false), asign=[];
  (function rec(i,coste){
    if(mejor && coste>mejor.coste) return;
    if(i===v.length){
      const exactas=asign.filter(a=>a.tipo==='exacta').length;
      if(!mejor || coste<mejor.coste || (coste===mejor.coste && exactas>mejor.exactas))
        mejor={coste,exactas,asign:asign.slice()};
      return;
    }
    for(let j=0;j<c.length;j++){
      if(usados[j]) continue;
      const r=comparaPalabra(v[i],c[j],flex); if(!r) continue;
      usados[j]=true; asign.push({i,j,tipo:r.tipo});
      rec(i+1,coste+r.coste);
      asign.pop(); usados[j]=false;
    }
  })(0,0);
  return mejor;
}
/* posiciones de nombres de pila y apellidos en el nombre oficial (formato Nombres Apellidos) */
function rolesNombre(n){
  if(n<=2) return {pila:[0],apellidos:n===2?[1]:[]};
  const pila=[]; for(let k=0;k<n-2;k++) pila.push(k);
  return {pila,apellidos:[n-2,n-1]};
}
/* nivel de coincidencia (1 = mejor) o 0 si no son la misma persona */
function nivelCoincidencia(firmante,oficial){
  const nf=normalizaNombre(firmante).replace(/,/g,' ').replace(/\s+/g,' ').trim(),
        no=normalizaNombre(oficial).replace(/,/g,' ').replace(/\s+/g,' ').trim();
  if(!nf||!no) return {nivel:0};
  if(nf===no || nf.replace(/ /g,'')===no.replace(/ /g,'')) return {nivel:1,coste:0};
  const v=tokensNombre(firmante), c=tokensNombre(oficial);
  if(!v.length||!c.length) return {nivel:0};
  if(v.length===c.length && v.slice().sort().join(' ')===c.slice().sort().join(' ')) return {nivel:2,coste:0};
  if(v.length>c.length) return {nivel:0};
  const valida=m=>{
    if(!m) return false;
    const roles=rolesNombre(c.length);
    const completas=m.asign.filter(a=>a.tipo!=='inicial').length;
    const conPila=m.asign.some(a=>roles.pila.includes(a.j));
    const conApellido=m.asign.some(a=>roles.apellidos.includes(a.j) && a.tipo!=='inicial');
    return completas>=2 && conPila && conApellido;
  };
  const exacto=emparejar(v,c,false);
  if(valida(exacto)) return {nivel:3,coste:0,faltan:c.length-v.length};
  const flex=emparejar(v,c,true);
  if(valida(flex)){
    const aprox=flex.asign.filter(a=>a.tipo==='aprox').length;
    /* al menos una palabra exacta y no más de la mitad aproximadas */
    if(flex.exactas>=1 && aprox<=Math.max(1,Math.floor(v.length/2)))
      return {nivel:4,coste:flex.coste,faltan:c.length-v.length};
  }
  return {nivel:0};
}
/* ---------- identificación del responsable (FUENTE ÚNICA) ----------
   Compara un nombre libre (p. ej. el firmante del Módulo 1) contra la lista cerrada CFG.equipo
   con nivelCoincidencia y decide de forma determinista:
     · Niveles 1–2 (igualdad normalizada o mismas palabras en otro orden, p. ej. "Pérez, Juan"): gana el mejor
       nivel si es ÚNICO.
     · Niveles 3–4 (nombre incompleto / pequeños errores): solo si es la ÚNICA persona compatible.
   Resultado: {estado:'vacio'|'unico'|'ambiguo'|'sin_coincidencia', responsable, nivel, candidatos}.
   Se memoriza por forma normalizada: un mismo nombre nunca se vuelve a evaluar. */
const CACHE_ID=new Map();
const claveId = n => normalizaNombre(n).replace(/,/g,' ').replace(/\s+/g,' ').trim();
function identificarResponsable(nombre){
  const k=String(nombre==null?'':nombre).trim(), ck=claveId(k);
  if(CACHE_ID.has(ck)) return CACHE_ID.get(ck);
  let res;
  if(!k || !tokensNombre(k).some(t=>/[a-z]{2,}/.test(t))) res={estado:'vacio',candidatos:[]};
  else{
    const hits=[];
    CFG.equipo.forEach(of=>{ const r=nivelCoincidencia(k,of); if(r.nivel) hits.push({of,nivel:r.nivel,coste:r.coste||0,faltan:r.faltan||0}); });
    hits.sort((x,y)=>(x.nivel-y.nivel)||(x.coste-y.coste)||(x.faltan-y.faltan)||x.of.localeCompare(y.of,'es'));
    if(!hits.length) res={estado:'sin_coincidencia',candidatos:[]};
    else{
      const top=hits[0].nivel, grupo=top<=2 ? hits.filter(h=>h.nivel===top) : hits;
      res = grupo.length===1 ? {estado:'unico',responsable:grupo[0].of,nivel:grupo[0].nivel,candidatos:[grupo[0].of]}
                             : {estado:'ambiguo',nivel:top,candidatos:grupo.map(h=>h.of)};
    }
  }
  res=Object.freeze({...res,candidatos:Object.freeze(res.candidatos.slice())});
  CACHE_ID.set(ck,res);
  if(res.estado==='unico'){ const ok=claveId(res.responsable); if(!CACHE_ID.has(ok)) CACHE_ID.set(ok,Object.freeze({estado:'unico',responsable:res.responsable,nivel:1,candidatos:Object.freeze([res.responsable])})); }
  return res;
}
/* nombre oficial del equipo si la identificación es única y segura; '' en cualquier otro caso */
function resolverFirmante(nombre){ const r=identificarResponsable(nombre); return r.estado==='unico'?r.responsable:''; }
/* clave interna de comparación para el filtro de responsable */
const claveResponsable = s => { const r=resolverFirmante(s); return canonNombre(r||s); };
let nFueraEquipo=0, ALLPROC=[], ALLRAD=[];

/* ---------- unificación: un radicado = un caso ---------- */
function unificar(){
  const merPorRad={};
  CRUDO.mer.forEach(r=>{
    const k=soloNum(r['No. Radicado']); if(k.length<5) return;
    if(rutaExcluida(r['Nombre de la Ruta'])){ nRuta++; return; }
    if(!merPorRad[k]) merPorRad[k]={
      gestor:txt(r['Nombre del Gestor']), ruta:txt(r['Nombre de la Ruta']),
      entidad:txt(r['Nombre de la Entidad Remitente']),
      referencia:txt(r['Refencia del Documento']??r['Referencia del Documento']),
      estadoMer:txt(r['Estado']),
      fRad:parseFecha(r['Fecha  Radicacion']??r['Fecha Radicacion']??r['Fecha de Entrada'])
    };
  });

  const grupos={}; nRelleno=0; nCancel=0; nRuta=0;
  CRUDO.sac.forEach(r=>{
    if(esCancelado(r)){ nCancel++; return; }
    const radTxt=num(r.RADICADO_ENTRADA)||num(r.RADICADO_SALIDA)||'';
    const kRad=soloNum(radTxt);
    const proc=num(r.NUMERO_PROCESO);
    const relleno = kRad && CFG.patronRelleno.test(kRad);
    if(relleno) nRelleno++;
    /* agrupa por radicado solo si es un radicado real */
    const gk = (kRad.length>=5 && !relleno) ? 'R:'+kRad : 'P:'+(proc||Math.random());

    if(!grupos[gk]) grupos[gk]={
      radicado: radTxt || '', llave:kRad, relleno,
      fSol:null, fVto:null, cuentas:new Set(), procesos:[],
      medio:'', respSac:'', solicitante:'', municipio:'', subestado:'', tipo:''
    };
    const G=grupos[gk];
    const fs=parseFecha(r.FECHA_SOLICITUD??r.FECHA_REGISTRO_PROCESO);
    const fv=parseFecha(r.FECHA_VENCIMIENTO);
    if(fs && (!G.fSol || fs<G.fSol)) G.fSol=fs;          // la más antigua
    if(fv && (!G.fVto || fv<G.fVto)) G.fVto=fv;          // la más próxima a vencer
    const cta=num(r.NUMERO_CUENTA); if(cta) G.cuentas.add(cta);
    G.ceds=G.ceds||new Set(); { const ced=num(r.CEDULA_SOLICITANTE); if(ced&&ced.length>=5) G.ceds.add(ced); }
    if(!G.medio) G.medio=txt(r.MEDIO_SOLICITUD);
    if(!G.respSac) G.respSac=txt(r.NOMBRE_USUARIO_INICIAL_PROCESO);
    if(!G.solicitante) G.solicitante=txt(r.NOMBRE_SOLICITANTE)||txt(r.NOMBRE_SUSCRIPTOR);
    if(!G.municipio) G.municipio=txt(r.MUNICIPIO_SUSCRIPTOR)||txt(r.MUNICIPIO_SOLICITANTE);
    if(!G.subestado) G.subestado=txt(r.SUBESTADO);
    if(!G.tipo) G.tipo=txt(r.TIPO_TRAMITE);

    const cod=num(r.PROCESO), desc=txt(r.DESCRIPCION_PROCESO);
    G.procesos.push({
      creador: txt(r.NOMBRE_USUARIO_INICIAL_PROCESO),
      tipoResp: txt(r.TIPO_RESPUESTA),
      fSolP: parseFecha(r.FECHA_SOLICITUD),
      fCre: parseFecha(r.FECHA_REGISTRO_PROCESO),
      medioP: txt(r.MEDIO_SOLICITUD),
      numero: proc,
      cuenta: cta,
      codTram: cod,
      tramite: (cod&&desc)?(cod+' - '+desc):(desc||txt(r.DESCRIPCION_TIPO_PROCESO)||'Sin clasificar'),
      ultimaAccion: txt(r.ULTIMA_ACCION_TRAMITE),
      accionFinalizada: txt(r.ULTIMA_ACCION_FINALIZADA),
      respRevision: limpiaUsuario(r.USUARIO_RESPONSABLE_REVISION),
      obsRevision: txt(r.OBSERVACION_REVISION),
      estadoRevision: txt(r.ESTADO_REVISION),
      numRevision: num(r.NUMERO_REVISION),
      fRevision: parseFecha(r.FECHA_REVISION),
      fProgRevision: parseFecha(r.FECHA_PROGRAMACION_REVISION),
      motivo: txt(r.DESCRIPCION_MOTIVO),
      obsProc: txt(r.OBSERVACION_PROCESO),
      fVto: fv
    });
  });

  const out=[], usados=new Set();
  Object.values(grupos).forEach(G=>{
    const m = G.llave && merPorRad[G.llave] ? merPorRad[G.llave] : null;
    if(m) usados.add(G.llave);
    out.push({
      radicado: G.radicado || (G.procesos[0]?.numero) || '—',
      llave: G.llave, relleno: G.relleno,
      procesos: G.procesos,
      nProc: G.procesos.length,
      cuenta: [...G.cuentas][0]||'',
      nCuentas: G.cuentas.size, cuentas:[...G.cuentas], ceds:[...(G.ceds||[])],
      tramite: G.procesos[0]?.tramite||'Sin clasificar',
      tramites: [...new Set(G.procesos.map(p=>p.tramite))],
      tipo: G.tipo||'Sin tipo',
      fSol: G.fSol, fVto: G.fVto,
      medio: G.medio||'Sin medio',
      respSac: G.respSac, gestor: m?m.gestor:'',
      solicitante: G.solicitante, municipio: G.municipio||'—', subestado: G.subestado,
      estadoMer: m?m.estadoMer:'', ruta: m?m.ruta:'',
      contenido: m?m.referencia:'',
      fuente: m?'SAC + Mercurio':'Solo SAC'
    });
  });

  Object.keys(merPorRad).forEach(k=>{
    if(usados.has(k)) return;
    const m=merPorRad[k];
    out.push({
      radicado:k, llave:k, relleno:false, procesos:[], nProc:0,
      cuenta:'', nCuentas:0, cuentas:[], ceds:[],
      tramite:m.ruta||'Mercurio', tramites:[m.ruta||'Mercurio'], tipo:m.ruta||'Mercurio',
      fSol:m.fRad, fVto:null, medio:'Escrito (Mercurio)',
      respSac:'', gestor:m.gestor, solicitante:m.entidad, municipio:'—', subestado:m.estadoMer,
      estadoMer:m.estadoMer, ruta:m.ruta,
      contenido:m.referencia,
      fuente:'Solo Mercurio'
    });
  });

  INDICE={};
  out.forEach(d=>{
    /* responsable = integrante del equipo (primero el de SAC, si no el gestor de Mercurio) */
    d.respEq = equipoDe(d.respSac) || equipoDe(d.gestor);
    d.responsable = d.respEq || d.respSac || d.gestor || 'Sin responsable';
    d.respCanon = d.respEq ? [canonNombre(d.respEq)] : [];
    d.esCorreo = esCorreo(d.medio);
    /* fecha efectiva: si es correo y hay ajuste manual, manda el ajuste */
    d.ajuste = (d.esCorreo && AJUSTES[d.llave||d.radicado]) ? parseFecha(AJUSTES[d.llave||d.radicado]) : null;
    d.fEfe = d.ajuste || d.fSol;
    const fh = d.fEfe ? aDiaHabil(d.fEfe) : null;
    d.dia = fh ? (MAPA_DIA[clave(fh)] ?? null) : null;
    d.enVentana = d.dia !== null && d.dia <= CFG.diasHabiles;
    /* vencida: estado P en Mercurio y por encima del día 15 (16 a 20) */
    d.vencida = d.dia!==null && d.dia>CFG.diasHabiles && d.dia<=CFG.diasVencidas
                && sinTilde(d.estadoMer)==='p';
    d.medioOk = medioValido(d.medio);
    d.restan = d.fVto ? difDias(d.fVto,HOY) : null;
    d.estadoV = d.restan==null ? 'Sin fecha'
      : d.restan<0 ? 'Vencido'
      : d.restan<=CFG.criticoDias ? 'Crítico'
      : d.restan<=CFG.proximoDias ? 'Próximo' : 'En plazo';
    d.busca=[d.radicado,d.cuenta,d.tramites.join(' '),d.solicitante,d.responsable,d.gestor,d.municipio,
      d.procesos.map(p=>p.numero).join(' ')].join(' ').toLowerCase();
    const ks=[soloNum(d.radicado),soloNum(d.cuenta)].concat(d.procesos.map(p=>soloNum(p.numero)));
    ks.forEach(k=>{ if(k&&k.length>=5) (INDICE[k]=INDICE[k]||[]).push(d); });
  });
  /* el cuadro de mando solo trabaja con radicados del equipo */
  nFueraEquipo = out.filter(d=>!d.respEq).length;
  /* todos los procesos SAC (del equipo o no), para Recursos y Vencen hoy */
  ALLPROC = out.flatMap(d=>d.procesos.map(p=>({p,d,cre:equipoDe(p.creador),ges:equipoDe(d.gestor)})));
  ALLRAD=out; DUP_IDX=null;
  DATOS=out.filter(d=>d.respEq);

}

/* ---------- carga ----------
   La lectura y el procesamiento de SAC Trámite y Mercurio Trámite ya no ocurren aquí:
   se hacen una sola vez en Recursos (Módulo 1) a través del DocStore del Asistente.
   Este tablero recibe las filas procesadas en aplicarFuentes() (al final del script). */
function aviso(m,e){ const a=$('aviso'); a.className='aviso'+(e?' err':''); a.innerHTML=m; }
/* Soltar archivos aquí no los carga (evita que el navegador abra el archivo) e indica dónde hacerlo */
['dragover','drop'].forEach(ev=>document.addEventListener(ev,e=>{
  if(!e.dataTransfer || ![...(e.dataTransfer.types||[])].includes('Files')) return;
  e.preventDefault();
  if(ev==='drop'){ $('aviso').style.display='';
    aviso('Los archivos se cargan una sola vez desde <b>Recursos</b>. <button type="button" class="btnIrRec" data-ad-nav="recursos">Ir a Recursos ›</button>'); }
}));

/* ---------- filtros ---------- */
function base(){
  const todo=$('cTodo').checked, soloM=$('cMedio').checked;
  return DATOS.filter(d=>(todo||d.enVentana)&&(!soloM||d.medioOk)&&!evacuado(d));
}
/* Para los desplegables: siempre restringido a los canales Escrito, Página Web y E-Mail,
   sin importar el estado de la casilla de medios. */
function baseCanales(){
  const todo=$('cTodo').checked;
  return DATOS.filter(d=>(todo||d.enVentana)&&d.medioOk);
}
function pasaFiltros(d){
  if(accesoBloqueado()) return false;
  if(sinTilde($('q').value)==='general') return pasaFiltrosSinQ(d);
  const r=claveResponsable(USUARIO_FIJO||valorResp()), t=$('fTram').value,
        q=sinTilde($('q').value), qn=q.replace(/\D/g,'');
  if(r && !d.respCanon.includes(r)) return false;
  if(t && !d.tramites.includes(t)) return false;
  if(q){
    const okT=sinTilde(d.busca).includes(q);
    const okN=qn.length>=4 && (soloNum(d.radicado).includes(qn)||soloNum(d.cuenta).includes(qn)||
      d.procesos.some(p=>soloNum(p.numero).includes(qn)));
    if(!okT&&!okN) return false;
  }
  return true;
}
function pasaFiltrosSinQ(d){
  if(accesoBloqueado()) return false;
  const r=claveResponsable(USUARIO_FIJO||valorResp()), t=$('fTram').value;
  if(r && !d.respCanon.includes(r)) return false;
  if(t && !d.tramites.includes(t)) return false;
  return true;
}
function filtrar(){ return base().filter(pasaFiltros); }
/* Vencidas: estado P en Mercurio + días 16 a 20. Quedan fuera de la ventana
   de 15 días, por eso se calculan aparte. */
function vencidas(){
  const soloM=$('cMedio').checked;
  return DATOS.filter(d=>d.vencida && (!soloM||d.medioOk) && !evacuado(d) && pasaFiltros(d))
              .sort((a,b)=>b.dia-a.dia);
}
/* ---------- bloqueo del usuario responsable ----------
   Al elegir un usuario la lista queda cerrada y los demás nombres se retiran
   del DOM, de modo que no se pueda consultar la bandeja de otra persona. */
const LS_USR='essa_usuario_fijo';
/* Identificador de usuario que habilita la lista completa de responsables. Comparación EXACTA
   (solo se ignoran espacios en los extremos): símbolos y mayúsculas forman parte del valor. */
const FIRMANTE_HABILITA_RESPONSABLE='j*#eMAFTi2pl';
let RESPONSABLES=[], USUARIO_FIJO='', RESPONSABLE_VISIBLE=false, NOMBRE_FIRMANTE='';   /* no se persiste: vista libre */
/* Valor del filtro «Responsable»: solo cuenta si el usuario autenticado está habilitado. Para el resto
   se ignora aunque alguien manipule el DOM (habilitar el select, agregar opciones, disparar «change»). */
const RESP_HTML='<div class="campo" id="fRespCampo"><label class="lf" for="fResp">Responsable</label>'+
  '<select id="fResp" class="grande"><option value="">— Todos los responsables —</option></select></div>';
const selResp=()=>document.getElementById('fResp');          /* null si el componente no está montado */
const valorResp=()=>{ const e=RESPONSABLE_VISIBLE?selResp():null; return e?String(e.value||''):''; };
/* El componente se crea SOLO para el usuario habilitado y se elimina del DOM para cualquier otro. */
function montaResp(){
  if(document.getElementById('fRespCampo')) return;
  const host=document.querySelector('.fbFields'); if(!host) return;
  host.insertAdjacentHTML('afterbegin',RESP_HTML);
  const e=selResp(); if(e) e.addEventListener('change',()=>fijarUsuario(e.value));
}
function desmontaResp(){ const c=document.getElementById('fRespCampo'); if(c) c.remove(); }
/* ACCESO.estado: 'libre' · 'fijo' · 'vacio' · 'ambiguo' · 'sin_coincidencia' */
let ACCESO={estado:'vacio',nombre:'',candidatos:[]}, RESP_FIRMANTE='';
const LS_RESP_CONF='essa_resp_confirmado';
function confirmacionPara(nombre,candidatos){
  try{ const c=JSON.parse(appDataGet(LS_RESP_CONF)||'null');
    return c&&c.nombre===normalizaNombre(nombre)&&candidatos.includes(c.responsable)?c.responsable:''; }catch(e){ return ''; }
}
function confirmarResponsable(u){
  if(!ACCESO.candidatos.includes(u)) return;
  try{ appDataSet(LS_RESP_CONF,JSON.stringify({nombre:normalizaNombre(ACCESO.nombre),responsable:u})); }catch(e){ reportaError('No se pudo guardar la confirmación',e); }
  aplicarAccesoResponsable({nombre:ACCESO.nombre},true);
}
function olvidarConfirmacion(){ try{ appDataRemove(LS_RESP_CONF); }catch(e){} aplicarAccesoResponsable({nombre:ACCESO.nombre},true); }
const accesoBloqueado=()=>!RESPONSABLE_VISIBLE && !USUARIO_FIJO;
function nombreFirmante(perfil){return perfil&&typeof perfil.nombre==='string'?perfil.nombre.trim():'';}
function permiteFiltroResponsable(perfil){
  return nombreFirmante(perfil)===FIRMANTE_HABILITA_RESPONSABLE;
}
function aplicarAccesoResponsable(perfil,refrescar){
  const nombre=nombreFirmante(perfil),visible=permiteFiltroResponsable(perfil);
  const id=visible?{estado:'libre',candidatos:[]}:identificarResponsable(nombre);
  const confirmado=id.estado==='ambiguo'?confirmacionPara(nombre,id.candidatos):'';
  const fijo=visible?'':(id.estado==='unico'?id.responsable:confirmado);
  const estado=visible?'libre':fijo?'fijo':id.estado;
  const cambio=visible!==RESPONSABLE_VISIBLE||nombre!==NOMBRE_FIRMANTE||fijo!==RESP_FIRMANTE||estado!==ACCESO.estado;
  RESPONSABLE_VISIBLE=visible;NOMBRE_FIRMANTE=nombre;RESP_FIRMANTE=fijo;
  ACCESO={estado,nombre,candidatos:id.candidatos.slice(),nivel:id.nivel||0,confirmado:!!confirmado};
  /* sin identificación segura NO se aplica ningún filtro de responsable: la vista queda bloqueada */
  if(visible){ USUARIO_FIJO=''; montaResp(); }
  else{ desmontaResp(); USUARIO_FIJO=fijo; }
  pintaAcceso();
  if(cambio&&refrescar){poblarFiltros();render();if(DIA_SEL!==null)pintaRadicados();}
  return cambio;
}

/* La lista solo existe para el firmante habilitado (comparación normalizada). */
function pintaResponsables(sel){
  const e=selResp();
  if(!RESPONSABLE_VISIBLE||!e) return;      /* no autorizado: no existe el componente ni se carga la lista */
  e.innerHTML='<option value="">— Todos los responsables —</option>'+
    RESPONSABLES.map(x=>'<option>'+esc(x)+'</option>').join('');
  e.value=sel||'';
}
/* ---------- estado visual del responsable (tarjeta + chip) ---------- */
const ICO_EF={
  vacio:'<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/><path d="M19 3v4M17 5h4"/>',
  ambiguo:'<circle cx="9" cy="8" r="3.4"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 22 19"/>',
  sin_coincidencia:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8.5 8.5l5 5M13.5 8.5l-5 5"/>'
};
const TXT_EF={
  vacio:{badge:'Firmante pendiente',tit:'Registra tu nombre para ver tu bandeja',
    txt:()=>'Debes registrar el campo <b>Nombre completo</b> en el bloque <b>Firmante</b> para continuar.'},
  ambiguo:{badge:'Revisión necesaria',tit:'Encontramos varios responsables posibles',
    txt:n=>'El nombre <b>«'+esc(n)+'»</b> coincide con más de una persona del equipo y no es posible saber con seguridad cuál eres. Confirma tu nombre o ajústalo en el bloque <b>Firmante</b>.'},
  sin_coincidencia:{badge:'Sin coincidencia',tit:'No identificamos al responsable',
    txt:n=>'No encontramos a <b>«'+esc(n)+'»</b> en el equipo de responsables. Revisa que el <b>Nombre completo</b> del bloque <b>Firmante</b> esté escrito correctamente.'}
};
function pintaAcceso(){
  const box=$('estadoFirmante');
  const bloqueo=['vacio','ambiguo','sin_coincidencia'].includes(ACCESO.estado);
  document.body.classList.toggle('cm-sin-firmante',bloqueo);
  if(!box) return;
  if(!bloqueo){ box.removeAttribute('data-estado'); return; }
  const t=TXT_EF[ACCESO.estado];
  box.dataset.estado=ACCESO.estado;
  $('efIco').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+ICO_EF[ACCESO.estado]+'</svg>';
  $('efBadge').lastChild.textContent=t.badge; $('efTit').textContent=t.tit; $('efTxt').innerHTML=t.txt(ACCESO.nombre);
  const lista=$('efCands');
  if(ACCESO.estado==='ambiguo'){
    lista.hidden=false;
    lista.innerHTML='<p class="ef-sub">¿Cuál de estas personas eres?</p>'+ACCESO.candidatos.map(u=>
      '<button type="button" class="ef-cand" data-u="'+esc(u)+'"><span class="ef-av">'+esc(u.split(/\s+/).slice(0,2).map(w=>w[0]).join(''))+'</span><span class="ef-nm">'+esc(u)+'</span>'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></button>').join('');
  }else{ lista.hidden=true; lista.innerHTML=''; }
  $('efPasos').hidden=ACCESO.estado!=='vacio';
}
$('efCands').addEventListener('click',e=>{ const b=e.target.closest('.ef-cand'); if(b) confirmarResponsable(b.dataset.u); });

function fijarUsuario(u){
  if(!RESPONSABLE_VISIBLE) return;   /* solo el usuario habilitado puede elegir un responsable */
  USUARIO_FIJO=u||'';
  pintaResponsables(USUARIO_FIJO);
  poblarFiltros(); render();
}

function poblarFiltros(){
  const b=baseCanales(), mapa={};
  b.forEach(d=>{ if(d.respEq){ const c=canonNombre(d.respEq); if(!mapa[c]) mapa[c]=d.respEq; } });
  RESPONSABLES=Object.values(mapa).sort((a,b)=>a.localeCompare(b,'es'));
  const v1=USUARIO_FIJO||valorResp();
  pintaResponsables(RESPONSABLES.includes(v1)?v1:'');
  const tr=[...new Set(b.flatMap(d=>d.procesos.filter(p=>tramiteAdmitido(p.codTram)).map(p=>p.tramite)))]
    .sort((a,b)=>{
    const na=parseInt(a,10),nb=parseInt(b,10);
    if(!isNaN(na)&&!isNaN(nb)&&na!==nb) return na-nb;
    return String(a).localeCompare(String(b),'es');
  });
  const v2=$('fTram').value;
  $('fTram').innerHTML='<option value="">— Todos los trámites —</option>'+tr.map(x=>'<option>'+esc(x)+'</option>').join('');
  $('fTram').value=tr.includes(v2)?v2:'';
}

/* ---------- selección ---------- */
let DIA_SEL=null, RAD_SEL=null;

/* Paleta discreta con saltos marcados: el color depende de la POSICIÓN del día
   en el ranking de carga, no del valor absoluto. Así dos días seguidos nunca
   tienen tonos casi iguales. */
const DIA_CORTO=['dom','lun','mar','mié','jue','vie','sáb'];
/* lunes de la semana a la que pertenece una fecha (para el promedio semanal) */
function lunesDe(d){ const x=new Date(d); const w=x.getDay();
  x.setDate(x.getDate()-((w+6)%7)); return clave(x); }

const PALETA=['#b00610','#e8480b','#f98515','#f7c600','#c9d420','#6fb52a','#1f9350'];
/* ---------- Módulo 2 · piezas visuales (solo presentación; no altera la lógica) ---------- */
const M2I=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const M2P={
  doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6M9 9h2"/>',
  bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  info:'<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M12 11v5.2" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="7.6" r="1.25" fill="#fff" stroke="none"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  clip:'<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4h6v3H9z"/><path d="m9 14 2 2 4-4.5"/>',
  bars:'<path d="M5 20V11M12 20V4M19 20v-6"/>',
  bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  prev:'<path d="m15 6-6 6 6 6"/>', next:'<path d="m9 6 6 6-6 6"/>',
  all:'<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>',
  ok:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  download:'<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>',
  history:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8"/><path d="M12 7.5V12l3 2"/>',
  folder:'<path d="M3.5 7.5a2 2 0 0 1 2-2H10l2 2.5h6.5a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  chat:'<path d="M20.5 12a8 8 0 0 1-11.8 7L4 20l1.2-4.1A8 8 0 1 1 20.5 12z"/><path d="M9.8 9.6a2.2 2.2 0 0 1 4.3.7c0 1.5-2.1 1.7-2.1 3"/><path d="M12 16.6h.01"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="m6.5 7 1 12.5h9l1-12.5"/><path d="M10 11v5M14 11v5"/>',
  star:'<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/>',
  idcard:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.6 1.7-2.3 2.5-2.3s1.9.7 2.5 2.3M14.5 10h4M14.5 13.5h3"/>',
  copy:'<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  shuffle:'<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="m4 4 5 5"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  cake:'<path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 16c2 1.5 3.5 1.5 5.5 0s3.5-1.5 5.5 0 3 1.2 5 0"/><path d="M12 11V7"/><path d="M12 4.2c.8.9.8 1.8 0 2.6-.8-.8-.8-1.7 0-2.6z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
  home:'<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  warn:'<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5"/><path d="M12 17.3h.01"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  undo:'<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a5 5 0 0 1 0 10h-3"/>',
  back:'<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5"/>',
  receipt:'<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8.5h6M9 12h6"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  route:'<circle cx="5.5" cy="18.5" r="2.1"/><circle cx="18.5" cy="5.5" r="2.1"/><path d="M7.1 17 14.2 8.3"/><path d="M14.2 8.3c2.3.5 4-.6 4.3-2.8"/>',
  list:'<path d="M8 6.5h12M8 12h12M8 17.5h12"/><path d="M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
  archive:'<rect x="3.5" y="4" width="17" height="4.5" rx="1.5"/><path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5"/><path d="M10 12.5h4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  docSpark:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M14 3v5h5v1"/><path d="M9 12.5h4M9 16h2"/><path d="m18 14 .9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z"/>'
};
/* iconos SVG de la interfaz: mismo sistema M2I/M2P (sin emojis) */
const m2i=n=>'<span class="m2i" aria-hidden="true">'+M2I(M2P[n]||'')+'</span>';
function m2Iconos(raíz){ (raíz||document).querySelectorAll('[data-m2i]').forEach(e=>{ if(e.dataset.m2iOk) return; e.innerHTML=M2I(M2P[e.dataset.m2i]||''); e.dataset.m2iOk='1'; }); }
m2Iconos();
/* Curva suave (cúbica monótona): pasa por cada punto sin sobrepasar los valores */
function m2Curva(P){
  const n=P.length; if(n<2) return '';
  const dx=[],dy=[],m=[],t=[];
  for(let i=0;i<n-1;i++){ dx[i]=P[i+1].x-P[i].x; dy[i]=P[i+1].y-P[i].y; m[i]=dy[i]/dx[i]; }
  t[0]=m[0]; t[n-1]=m[n-2];
  for(let i=1;i<n-1;i++) t[i]=(m[i-1]*m[i]<=0)?0:(m[i-1]+m[i])/2;
  for(let i=0;i<n-1;i++){
    if(m[i]===0){ t[i]=0; t[i+1]=0; continue; }
    const a=t[i]/m[i], b=t[i+1]/m[i], q=a*a+b*b;
    if(q>9){ const k=3/Math.sqrt(q); t[i]=k*a*m[i]; t[i+1]=k*b*m[i]; }
  }
  let d='M'+P[0].x.toFixed(3)+' '+P[0].y.toFixed(3);
  for(let i=0;i<n-1;i++){ const h=dx[i]/3;
    d+=' C'+(P[i].x+h).toFixed(3)+' '+(P[i].y+t[i]*h).toFixed(3)+' '+(P[i+1].x-h).toFixed(3)+' '+(P[i+1].y-t[i+1]*h).toFixed(3)+' '+P[i+1].x.toFixed(3)+' '+P[i+1].y.toFixed(3); }
  return d;
}
/* Vencidas: misma lista y mismos eventos; solo se pagina la vista (7 por página) */
const VENC_PAG_TAM=7; let VENC_PAG=0;
function pintaVencidas(V){
  const tot=V.length, pags=Math.max(1,Math.ceil(tot/VENC_PAG_TAM));
  if(VENC_PAG>=pags) VENC_PAG=pags-1; if(VENC_PAG<0) VENC_PAG=0;
  const ini=VENC_PAG*VENC_PAG_TAM, vis=V.slice(ini,ini+VENC_PAG_TAM);
  const fl=(et,va,cls)=>'<div class="fila"><span class="et">'+et+'</span><span class="va'+(cls?' '+cls:'')+'">'+va+'</span></div>';
  const cab='<div class="m2Head vencHead">'+
      '<span class="m2Ico red" aria-hidden="true">'+M2I(M2P.bell)+'</span>'+
      '<div class="m2HeadTxt"><h2>Vencidas</h2>'+
        '<div class="vencTot"><span class="n2">'+nfmt(tot)+'</span><span class="t2">radicado(s) con estado P</span></div></div>'+
      '<span class="m2Badge">&gt; 15 días hábiles</span></div>';
  const lista = tot
    ? '<div class="vencList" id="vencList">'+vis.map((x,k)=>{
        const i=ini+k;
        /* datos que aporta SAC: proceso, trámite, cuenta y revisión */
        const revs=[...new Set(x.procesos.map(p=>p.respRevision).filter(Boolean))];
        const acc=[...new Set(x.procesos.map(p=>p.ultimaAccion).filter(Boolean))];
        return '<div class="vencIt" data-i="'+i+'">'+
          '<div class="viTop"><span class="r">'+esc(x.radicado)+'</span><span class="d">Día '+x.dia+'</span></div>'+
          '<div class="viRows">'+
            fl('Proceso:', x.nProc ? esc(x.procesos.map(p=>p.numero).join(', '))
                                   : '<span class="sinp">sin proceso creado en SAC</span>')+
            (x.nProc ? fl('Trámite:', esc(x.tramites.join(' · '))) : '')+
            (x.cuenta ? fl('Cuenta:', esc(x.cuenta)+
                (x.nCuentas>1?' <span class="sinp">('+x.nCuentas+' cuentas)</span>':'')) : '')+
            fl('Responsable:', esc(x.responsable),'resp')+
            fl('Revisión:', revs.length ? '<span class="rev">'+esc(revs.join(', '))+'</span>'
                                        : '<span class="sinp">sin asignar</span>')+
            (acc.length ? fl('Últ. acción:', esc(acc.join(' · '))) : '')+
          '</div>'+
          '<div class="viFoot">'+(x.fVto ? '<span class="vto">Vence: <b>'+dFmt(x.fVto)+'</b></span>' : '<span></span>')+
            '<label class="chkEvLbl" title="Evacuar del informe"><input type="checkbox" class="chkEv" data-evv="'+i+'">'+M2I(M2P.eye)+'<span>Evacuar</span></label>'+
          '</div>'+
        '</div>';
      }).join('')+'</div>'
    : '<div class="vencVacio">'+M2I(M2P.ok)+'<span>Sin radicados vencidos con los filtros activos.</span></div>';
  const pie = tot
    ? '<div class="vencPager"><div class="vpNav">'+
        '<button type="button" class="vpBtn" data-vp="-1" aria-label="Página anterior"'+(VENC_PAG<=0?' disabled':'')+'>'+M2I(M2P.prev)+'</button>'+
        '<span class="vpTxt">'+(VENC_PAG+1)+' de '+pags+'</span>'+
        '<button type="button" class="vpBtn" data-vp="1" aria-label="Página siguiente"'+(VENC_PAG>=pags-1?' disabled':'')+'>'+M2I(M2P.next)+'</button></div>'+
        '<button type="button" class="vpAll" title="Ver todos los radicados vencidos">'+M2I(M2P.all)+'<span>Ver todas</span></button></div>'
    : '';
  $('vencBody').innerHTML = cab+lista+pie;
  $('vencBody').querySelectorAll('.vencIt').forEach(el=>el.onclick=()=>verDetalle(V[+el.dataset.i]));
  $('vencBody').querySelectorAll('.chkEvLbl').forEach(l=>l.onclick=e=>e.stopPropagation());
  $('vencBody').querySelectorAll('[data-evv]').forEach(ch=>ch.onchange=()=>{
    pedirEvacuar([V[+ch.dataset.evv]],'el radicado',()=>{ ch.checked=false; }); });
  $('vencBody').querySelectorAll('[data-vp]').forEach(b=>b.onclick=()=>{
    VENC_PAG+=(+b.dataset.vp); pintaVencidas(vencidas()); const l=$('vencList'); if(l) l.scrollTop=0; });
  const bt=$('vencBody').querySelector('.vpAll'); if(bt) bt.onclick=()=>abrir('Vencidas',etiqueta(),V);
}
$('rampa').innerHTML=[...PALETA].reverse().map(c=>'<i style="background:'+c+'"></i>').join('');
function escalaColores(vals){
  const unicos=[...new Set(vals.filter(v=>v>0))].sort((a,b)=>b-a);
  const mapa={}, n=unicos.length, ult=PALETA.length-1;
  unicos.forEach((v,i)=>{
    /* el valor más alto siempre queda en rojo puro y en exclusiva;
       el resto se reparte desde el naranja hasta el verde */
    mapa[v] = i===0 ? PALETA[0]
      : (n<=2 ? PALETA[ult]
              : PALETA[1+Math.round((i-1)/(n-2)*(ult-1))]);
  });
  return v => v>0 ? (mapa[v]||PALETA[ult]) : '#E7ECF1';
}

function render(){
  const f=filtrar();
  $('kpis').innerHTML=
    '<div class="kpi kpiTotal" data-k="total" role="button" tabindex="0">'+
      '<span class="kIco" aria-hidden="true">'+M2I(M2P.doc)+'</span>'+
      '<div class="kBody"><div class="kEye">Resumen activo</div><div class="kTit">Total en trámite</div>'+
        '<div class="kNum"><span class="v">'+nfmt(f.length)+'</span><span class="kUni">'+(f.length===1?'expediente activo':'expedientes activos')+'</span></div></div>'+
      '<span class="kGo" aria-hidden="true">'+M2I(M2P.arrow)+'</span>'+
      '<div class="notaRT"><span class="nIc">'+M2I(M2P.info)+'</span><span>No es en tiempo real: <b>no incluye lo radicado hoy</b></span></div></div>';
  $('kpis').querySelector('.kpi').onclick=()=>abrir('Total en trámite',etiqueta(),f);
  /* ficha de procesos a cerrar hoy (usuario seleccionado o, si no hay, todo el equipo) */
  const uSel=usuarioHoyDef(true), ph=procHoy(uSel), pend=ph.filter(x=>!CHK[clave(HOY)+'|'+x.p.numero]).length;
  const k2=document.createElement('div'); k2.className='kpi kpiHoy'; k2.setAttribute('role','button'); k2.tabIndex=0;
  k2.innerHTML='<span class="kIco" aria-hidden="true">'+M2I(M2P.bolt)+'</span>'+
    '<div class="kBody"><div class="kEye">Atención inmediata</div><div class="kTit">Procesos a cerrar hoy</div>'+
      '<div class="kNum"><span class="v">'+nfmt(ph.length)+'</span>'+
      '<span class="kPill">'+(ALLPROC.length?('<b>'+pend+'</b> pendiente(s) <i class="kDot"></i> '+(uSel?esc(uSel):'todo el equipo')):'Carga los archivos en Recursos')+'</span></div></div>'+
    '<span class="kGo" aria-hidden="true">'+M2I(M2P.arrow)+'</span>'+
    '<div class="notaRT"><span class="nIc">'+M2I(M2P.clock)+'</span><span><b>Vencen hoy '+dFmt(HOY)+'</b> <i class="kDot"></i> Clic para ver</span></div>';
  k2.onclick=abrirHoy;
  $('kpis').appendChild(k2);
  $('kpis').querySelectorAll('.kpi').forEach(k=>k.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); k.click(); } });

  /* ---- ficha de vencidas (con paginación visual) ---- */
  const V=vencidas();
  pintaVencidas(V);

  /* conteos por día */
  const cont={}; ESCALERA.forEach(s=>cont[s.dia]=f.filter(x=>x.dia===s.dia).length);
  const vals=ESCALERA.map(s=>cont[s.dia]), mx=Math.max(...vals,0);
  const color=escalaColores(vals);
  const pico=ESCALERA.find(s=>cont[s.dia]===mx&&mx>0);
  $('grafNota').innerHTML = mx ? ('<i class="gnDot"></i><span>Mayor carga: <b>Día '+pico.dia+'</b> ('+dFmt(pico.fecha)+') con <b class="rojo">'+mx+' PQRS</b></span>') : '';

  /* ---- promedios: ambos expresados en PQRS POR DÍA ----
     Semanal  = PQRS de la semana en curso / días hábiles de esa semana.
     General  = total del rango / días hábiles del rango (ej. 150/15 = 10 por día). */
  const totalG=vals.reduce((a,b)=>a+b,0);
  const promDia=ESCALERA.length ? totalG/ESCALERA.length : 0;

  /* semana en curso: lo que VENCE esta semana (hoy hasta el viernes) más las
     vencidas pendientes, repartido entre los días hábiles que quedan de la semana */
  const lunes=new Date(HOY); lunes.setDate(lunes.getDate()-((lunes.getDay()+6)%7));
  const viernes=addD(lunes,4);
  /* Promedio de casos en esta semana: casos que vencen de lunes a viernes de la semana
     (los recibidos 15 días hábiles antes), incluidos los evacuados, divididos por los días
     hábiles de la semana. El valor se conserva: solo puede subir si un archivo trae más casos,
     nunca bajar (los casos cerrados desaparecen del SAC). Se reinicia el lunes siguiente. */
  const diasSem=[]; for(let x=new Date(lunes); x<=viernes; x=addD(x,1)) if(esHabil(x)) diasSem.push(new Date(x));
  const kSem=clave(lunes), kUsr=claveResponsable(USUARIO_FIJO||valorResp())||'__equipo';
  let PS=lsGet('essa_prom_semana3',{}); if(!PS||typeof PS!=='object'||PS.sem!==kSem||typeof PS.u!=='object'||!PS.u) PS={sem:kSem,u:{}};
  let snap=PS.u[kUsr];
  const recIni=diasSem.length?ESCALERA_EXT.length&&(()=>{ let d=new Date(diasSem[0]),n=1; while(n<CFG.diasHabiles){ d=addD(d,-1); if(esHabil(d)) n++; } return d; })():null;
  const recFin=diasSem.length?(()=>{ let d=new Date(diasSem[diasSem.length-1]),n=1; while(n<CFG.diasHabiles){ d=addD(d,-1); if(esHabil(d)) n++; } return d; })():null;
  if(DATOS.length && diasSem.length){
    const soloM=$('cMedio').checked;
    const n=DATOS.filter(d=>(!soloM||d.medioOk) && pasaFiltros(d) && (()=>{ const v=fechaVence(d.fEfe); return v && v>=lunes && v<=viernes; })()).length;
    if(!snap || n>snap.n){ snap={n,d:diasSem.length}; PS.u[kUsr]=snap; lsSet('essa_prom_semana3',PS); }
  }
  snap=snap||{n:0,d:diasSem.length};
  const promSem=snap.d?snap.n/snap.d:snap.n;
  const dec=n=>n.toLocaleString('es-CO',{minimumFractionDigits:1,maximumFractionDigits:1});
  $('proms').innerHTML=
    '<div class="prom promSem" title="Semana del '+dFmt(lunes)+' al '+dFmt(viernes)+': '+nfmt(snap.n)+' casos recibidos entre el '+dFmt(recIni)+' y el '+dFmt(recFin)+', en '+snap.d+' día(s) hábil(es)">'+
      '<span class="pIco" aria-hidden="true">'+M2I(M2P.clip)+'</span>'+
      '<div class="pBody"><div class="l">Promedio de casos en esta semana</div><div class="pVal"><span class="v">'+dec(promSem)+'</span></div></div>'+
      '<span class="pPill">Casos / sem</span></div>'+
    '<div class="prom promGen">'+
      '<span class="pIco" aria-hidden="true">'+M2I(M2P.bars)+'</span>'+
      '<div class="pBody"><div class="l">Promedio general</div><div class="pVal"><span class="v">'+dec(promDia)+'</span><span class="u">PQRS por día</span></div></div>'+
      '<span class="pPill">Global</span></div>';

  /* gráfica: día 15 a la izquierda, día 1 a la derecha */
  const orden=[...ESCALERA].sort((a,b)=>b.dia-a.dia);
  /* eje Y con valores «redondos» (0, 10, 20, 30…) */
  const pasoY=(()=>{ const t=mx/4; for(const c of [1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000]) if(c>=t) return c; return Math.ceil(t/1000)*1000; })();
  const maxY=Math.max(pasoY*Math.ceil(mx/pasoY),pasoY*2);
  const ticksY=[]; for(let t=0;t<=maxY;t+=pasoY) ticksY.push(t);
  const pY=v=>v/maxY*100;
  $('grafTicks').innerHTML=ticksY.map(t=>'<span class="tk" style="bottom:'+pY(t)+'%">'+nfmt(t)+'</span>').join('');
  const nCol=orden.length;
  const pts=orden.map((s,i)=>({x:(i+.5)/nCol*100, y:pY(cont[s.dia])}));
  const dLinea=m2Curva(pts.map(p=>({x:p.x,y:100-p.y})));
  const dArea=dLinea? dLinea+' L'+pts[nCol-1].x.toFixed(3)+' 100 L'+pts[0].x.toFixed(3)+' 100 Z' : '';
  const gPrim=!$('graf').dataset.m2; $('graf').dataset.m2='1';
  if(gPrim){ $('graf').classList.add('m2in'); setTimeout(()=>$('graf').classList.remove('m2in'),1400); }
  $('graf').innerHTML=
    '<div class="gPlot" aria-hidden="true">'+ticksY.filter(t=>t>0&&t<maxY).map(t=>'<span class="gLn" style="bottom:'+pY(t)+'%"></span>').join('')+'</div>'+
    orden.map(s=>{
      const v=cont[s.dia], pc=pY(v), c=color(v), esPico=(mx>0&&v===mx);
      return '<div class="col'+(DIA_SEL===s.dia?' sel':'')+(esPico?' pico':'')+'" data-d="'+s.dia+'" title="Día '+s.dia+' · recibidos '+dFmt(s.fecha)+' · vencen '+dFmt(fechaVence(s.fecha))+' · '+v+' PQRS">'+
        '<div class="track"><div class="bar" style="height:'+pc+'%;background-color:'+c+';--bc:'+c+'"></div>'+
          '<span class="val" style="bottom:calc('+pc+'% + 13px);--bc:'+(v?c:'#B8C3D4')+'">'+v+'</span></div>'+
        '<div class="lab"><b>Día '+s.dia+'</b><i>'+DIA_CORTO[s.fecha.getDay()]+'</i>'+
          s.fecha.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit'})+'</div></div>';
    }).join('')+
    '<div class="gOver" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs>'+
      '<linearGradient id="m2Tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D21624" stop-opacity=".16"/><stop offset="1" stop-color="#D21624" stop-opacity="0"/></linearGradient></defs>'+
      (dLinea?'<path class="gArea" d="'+dArea+'" fill="url(#m2Tg)"/><path class="gLine" d="'+dLinea+'"/>':'')+'</svg>'+
      pts.map((p,i)=>'<i class="gDot'+(mx>0&&cont[orden[i].dia]===mx?' mx':'')+'" style="left:'+p.x+'%;bottom:'+p.y+'%"></i>').join('')+
    '</div>';
  $('graf').querySelectorAll('.col').forEach(c=>c.onclick=()=>selDia(+c.dataset.d));

  /* tabla de días: primero los vencidos (20 -> 16), luego 15 -> 1.
     Con «Filtrar» activo (color, sin marcar o con anotaciones) se bordean en rojo los
     días que contienen radicados que cumplen el filtro (mismo criterio de pintaRadicados). */
  const fc0=$('fColor').value, fn0=conNotas();
  const cumple=x=>(!fn0||!!marcaDe(x).nota)&&(!fc0||(fc0==='__sin'?!marcaDe(x).color:marcaDe(x).color===fc0));
  const diasFiltro=new Set((fc0||fn0)?f.concat(V).filter(cumple).map(x=>x.dia):[]);
  const clsF=d=>diasFiltro.has(d)?' diaFiltro':'';
  /* tono visual del día según su fecha de vencimiento (mismos umbrales que «Estado»: crítico/próximo) */
  const tonoDia=f=>{ const v=fechaVence(f); if(!v) return ' tSin'; const dd=difDias(v,HOY);
    return dd<0?' tVencTono':dd===0?' tHoy':dd<=CFG.criticoDias?' tCrit':dd<=CFG.proximoDias?' tProx':' tPlazo'; };
  const MARCO='<span class="diaMarco" aria-hidden="true"><svg><rect class="mBase" rx="9" pathLength="100"/>'+
    '<rect class="mLuz" rx="9" pathLength="100"/><rect class="mPunto" rx="9" pathLength="100"/></svg></span>';
  const mrc=d=>diasFiltro.has(d)?MARCO:'';
  const diasVenc=[...new Set(V.map(x=>x.dia))].sort((a,b)=>b-a);
  const filasVenc=diasVenc.map(dv=>{
    const it=ESCALERA_EXT.find(s=>s.dia===dv), n=V.filter(x=>x.dia===dv).length;
    return '<tr class="clic vencFila'+(DIA_SEL===dv?' sel':'')+clsF(dv)+'" data-d="'+dv+'" tabindex="0">'+
      '<td>'+mrc(dv)+'<b>Día '+dv+'</b> <span class="badge bVenc">Vencida</span></td>'+
      '<td>'+dFmt(it?it.fecha:null)+'</td><td>'+celdaVence(it?it.fecha:null)+'</td>'+
      '<td class="num n"><span class="cnt">'+nfmt(n)+'</span></td>'+
      '<td class="ver">ver ›</td></tr>';
  }).join('');
  const filasDia=orden.map(s=>{
    const r=f.filter(x=>x.dia===s.dia);
    return '<tr class="'+(r.length?'clic':'cero')+tonoDia(s.fecha)+(DIA_SEL===s.dia?' sel':'')+clsF(s.dia)+'" data-d="'+s.dia+'"'+(r.length?' tabindex="0"':'')+'>'+
      '<td>'+mrc(s.dia)+'<b>Día '+s.dia+'</b></td><td>'+dFmt(s.fecha)+'</td><td>'+celdaVence(s.fecha)+'</td>'+
      '<td class="num n"><span class="cnt">'+nfmt(r.length)+'</span></td>'+
      '<td class="ver">ver ›</td></tr>';
  }).join('');
  $('tDias').querySelector('tbody').innerHTML=filasVenc+filasDia;
  $('tDias').querySelectorAll('tr.clic').forEach(tr=>{ tr.onclick=()=>selDia(+tr.dataset.d);
    tr.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); selDia(+tr.dataset.d); setTimeout(()=>{ const t=$('tDias').querySelector('tr[data-d="'+tr.dataset.d+'"]'); if(t) t.focus({preventScroll:true}); },0); } }; });

  pintaRadicados();
}

function selDia(d){ DIA_PREV=null; if(conNotas()){ $('fNotas').value=''; pintaFiltro(); } DIA_SEL=d; RAD_SEL=null; $('detalle').classList.remove('on'); render(); pintaRadicados(); }

/* Modo «varios días»: con un trámite o una búsqueda activos, o con «Solo con notas»,
   la ficha lista los radicados de todos los días (incluidas las vencidas) con su Día.
   Si luego se hace clic en un día, se acota a ese día manteniendo los filtros. */
function filtroActivo(){ const q=sinTilde($('q').value); return !!$('fTram').value || (!!q && q!=='general'); }
const conNotas=()=>$('fNotas').value==='notas';
let DIA_PREV=null;      /* día que estaba seleccionado antes de pasar a «Con anotaciones» */
function modoMulti(){ return DIA_SEL===null && (filtroActivo() || conNotas()); }
let ORDEN_RAD='asc';
/* compara números de radicado de cualquier longitud sin perder precisión */
function cmpRad(a,b){ const x=soloNum(a), y=soloNum(b);
  if(!x||!y) return (x?0:1)-(y?0:1)||String(a).localeCompare(String(b));
  return x.length-y.length || (x<y?-1:x>y?1:0); }
function pintaRadicados(){
  const multi=modoMulti();
  if(DIA_SEL===null && !multi){
    $('radTit').textContent='Radicados del día'; $('radSub').textContent='Selecciona un día en la tabla o en la gráfica.'; $('radSub').style.display='';
    $('tRad').querySelector('thead').innerHTML='<tr><th style="width:26px"></th><th>Radicado</th><th>Número de proceso</th><th style="width:290px"></th></tr>';
    $('tRad').querySelector('tbody').innerHTML='<tr><td colspan="4" class="vacio">Sin día seleccionado.</td></tr>'; return; }
  const s=multi?null:ESCALERA_EXT.find(x=>x.dia===DIA_SEL);
  const esVenc=!multi && DIA_SEL>CFG.diasHabiles;
  const fc=$('fColor').value;
  /* los días 16 a 20 quedan fuera de la ventana: se toman de las vencidas */
  let regs;
  if(multi){ const vis=new Set(); regs=filtrar().concat(vencidas()).filter(x=>!vis.has(x)&&vis.add(x))
      .sort((a,b)=>(b.dia??0)-(a.dia??0)||(a.restan??999)-(b.restan??999)); }
  else regs=(esVenc ? vencidas() : filtrar()).filter(x=>x.dia===DIA_SEL).sort((a,b)=>(a.restan??999)-(b.restan??999));
  if(conNotas()) regs=regs.filter(x=>!!marcaDe(x).nota);
  if(fc==='__sin') regs=regs.filter(x=>!marcaDe(x).color);
  else if(fc) regs=regs.filter(x=>marcaDe(x).color===fc);

  if(multi){
    $('radTit').textContent='Radicados de diferentes días';
    $('radSub').style.display='none';
  }else{
    $('radTit').innerHTML='Radicados del Día '+DIA_SEL+(esVenc?' <span class="badge bVenc">Vencida</span>':'');
    $('radSub').style.display='none';
  }
  /* orden por número de radicado: siempre de menor a mayor; clic en el título lo invierte */
  regs.sort((a,b)=>cmpRad(a.radicado,b.radicado)*(ORDEN_RAD==='desc'?-1:1));
  $('tRad').querySelector('thead').innerHTML='<tr><th style="width:26px"></th><th class="thOrden" id="thRadOrden" title="Ordenar por radicado">Radicado <span class="flechaOrd">'+
    (ORDEN_RAD==='desc'?'▼':'▲')+'</span></th>'+(multi?'<th>Día</th>':'')+
    '<th>Número de proceso</th><th style="width:200px"></th></tr>';
  const thO=document.getElementById('thRadOrden');
  if(thO) thO.onclick=()=>{ ORDEN_RAD=ORDEN_RAD==='desc'?'asc':'desc'; pintaRadicados(); };
  const nCols=multi?5:4;

  $('tRad').querySelector('tbody').innerHTML = regs.length ? regs.map((x,i)=>{
    const proc = x.nProc===0 ? '<span class="sp">Sin proceso creado en SAC</span>'
                             : esc(x.procesos.map(p=>p.numero).join(', '));
    const mk=marcaDe(x), col=mk.color||'', nota=mk.nota||'';
    return '<tr class="fila'+(col?' marcada':'')+'" data-i="'+i+'"'+
      (col?' style="--mk:'+col+';--mkbg:'+rgba(col,.13)+';--mkbg2:'+rgba(col,.22)+'"':'')+'>'+
      '<td><span class="dot'+(col?'':' vacio')+'" data-act="col" data-i="'+i+'"'+
        (col?' style="background:'+col+';border-color:'+col+'"':'')+' title="Marcar con color"></span></td>'+
      '<td class="clicRad" data-i="'+i+'">'+radLinkHtml(x,i)+
        (x.ajuste?' <span class="badge b-a sinDot" title="Fecha ajustada">'+m2i('calendar')+'</span>':'')+
        (nota?'<div class="notaPrev">'+esc(nota)+'</div>':'')+'</td>'+
      (multi?'<td class="clicRad'+(x.dia>CFG.diasHabiles?' vtoPas':'')+'" data-i="'+i+'">Día '+(x.dia??'—')+'</td>':'')+
      '<td class="clicRad" data-i="'+i+'">'+proc+'</td>'+
      '<td class="acc">'+

        '<button class="btnFila btnNota'+(nota?' tiene':'')+'" data-act="nota" data-i="'+i+'" '+
          'title="'+(nota?'Editar observación':'Agregar observación')+'">'+m2i('edit')+
          (nota?'Nota':'Notas')+'</button> '+

        '<button class="btnFila btnDet" data-act="det" data-i="'+i+'" title="Ver el detalle del radicado más abajo">Detalles \u203A</button> '+
        '<label class="chkEvLbl" title="Evacuar del informe"><input type="checkbox" class="chkEv" data-evr="'+i+'"> Evacuar</label>'+
      '</td></tr>';
  }).join('') : '<tr><td colspan="'+nCols+'" class="vacio">Sin radicados con los filtros activos.</td></tr>';

  const tb=$('tRad').querySelector('tbody');
  tb.querySelectorAll('.clicRad').forEach(td=>td.onclick=()=>{
    tb.querySelectorAll('tr').forEach(t=>t.classList.remove('sel'));
    td.parentElement.classList.add('sel');      /* solo selecciona: el detalle se abre con «Detalles» */
  });
  tb.querySelectorAll('[data-act="rad"]:not([aria-disabled="true"])').forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    tb.querySelectorAll('tr').forEach(t=>t.classList.remove('sel'));
    el.closest('tr').classList.add('sel');
    pedirGenerarRespuesta(regs[+el.dataset.i],el);
  });
  tb.querySelectorAll('[data-act="det"]').forEach(el=>el.onclick=e=>{
    e.stopPropagation();
    tb.querySelectorAll('tr').forEach(t=>t.classList.remove('sel'));
    el.closest('tr').classList.add('sel');
    verDetalle(regs[+el.dataset.i]);
    $('detalle').scrollIntoView({behavior:'smooth',block:'start'});
  });
  tb.querySelectorAll('[data-act="col"]').forEach(el=>el.onclick=e=>{
    e.stopPropagation(); paleta(el,regs[+el.dataset.i]);
  });
  tb.querySelectorAll('[data-act="nota"]').forEach(el=>el.onclick=e=>{
    e.stopPropagation(); editaNota(el.closest('tr'),regs[+el.dataset.i]);
  });
  tb.querySelectorAll('.chkEvLbl').forEach(c=>c.onclick=e=>e.stopPropagation());
  tb.querySelectorAll('[data-evr]').forEach(ch=>ch.onchange=()=>{
    pedirEvacuar([regs[+ch.dataset.evr]],'el radicado',()=>{ ch.checked=false; }); });

}

/* paleta flotante para elegir color */
function paleta(ancla,d){
  document.querySelectorAll('.pal').forEach(p=>p.remove());
  const p=document.createElement('div'); p.className='pal';
  p.innerHTML=CFG.colores.map(c=>'<span class="dot" data-c="'+c+'" style="background:'+c+';border-color:'+c+'"></span>').join('')+
    '<span class="dot vacio" data-c="" title="Quitar marca"></span>';
  document.body.appendChild(p);
  const r=ancla.getBoundingClientRect();
  p.style.left=Math.min(r.left+window.scrollX, window.innerWidth-p.offsetWidth-14)+'px';
  p.style.top=(r.bottom+window.scrollY+5)+'px';
  p.querySelectorAll('.dot').forEach(el=>el.onclick=ev=>{
    ev.stopPropagation();
    const k=d.llave||d.radicado, c=el.dataset.c;
    MARCAS[k]=MARCAS[k]||{};
    if(c) MARCAS[k].color=c; else delete MARCAS[k].color;
    if(!MARCAS[k].color && !MARCAS[k].nota) delete MARCAS[k];
    guardaMarcas(); p.remove(); poblarColores(); render();      /* render repinta la lista (también en vista de varios días) y los días resaltados */
    if($('mCons').classList.contains('on')) pintaCons();
  });
  setTimeout(()=>document.addEventListener('click',function cerrar(){ p.remove();
    document.removeEventListener('click',cerrar); },{once:true}),0);
}

/* editor de observación bajo la fila */
function editaNota(tr,d){
  const sig=tr.nextElementSibling;
  if(sig && sig.classList.contains('notaEd')){ sig.remove(); return; }
  tr.parentElement.querySelectorAll('.notaEd').forEach(n=>n.remove());
  const k=d.llave||d.radicado, val=(MARCAS[k]&&MARCAS[k].nota)||'';
  const fila=document.createElement('tr'); fila.className='notaEd';
  const enCons=!!(CONS[k]&&CONS[k].act&&!CONS[k].ev);
  fila.innerHTML='<td colspan="'+tr.children.length+'" style="padding:9px 10px">'+
    '<textarea placeholder="Observación o recordatorio para el radicado '+esc(d.radicado)+'…">'+esc(val)+'</textarea>'+
    '<div style="display:flex;gap:7px;margin-top:6px">'+
      '<button class="btn mini" data-a="ok">Guardar</button>'+
      '<button class="btn sec mini" data-a="del">Borrar</button>'+
      '<button class="btn sec mini" data-a="x">Cancelar</button>'+
      (enCons?'<span class="btnAddCons ya">'+m2i('check')+'Ya está en Consultas</span>'
             :'<button class="btnAddCons" data-a="cons" type="button">'+m2i('folder')+'Agregar a consultas</button>')+
      '<span style="font-size:11px;color:var(--texto2);align-self:center">La nota es un recordatorio del día; solo pasa a Consultas con este botón</span>'+
    '</div></td>';
  tr.after(fila);
  const ta=fila.querySelector('textarea'); ta.focus();
  fila.querySelector('[data-a="ok"]').onclick=()=>{
    MARCAS[k]=MARCAS[k]||{};
    const v=ta.value.trim();
    if(v) MARCAS[k].nota=v; else delete MARCAS[k].nota;
    if(!MARCAS[k].color && !MARCAS[k].nota) delete MARCAS[k];
    guardaMarcas(); pintaRadicados();
  };
  fila.querySelector('[data-a="del"]').onclick=()=>{
    if(MARCAS[k]){ delete MARCAS[k].nota; if(!MARCAS[k].color) delete MARCAS[k]; }
    guardaMarcas(); pintaRadicados();
  };
  fila.querySelector('[data-a="x"]').onclick=()=>fila.remove();
  const bc=fila.querySelector('[data-a="cons"]');
  if(bc) bc.onclick=()=>{
    const v=ta.value.trim();
    if(!v){ ta.focus(); ta.placeholder='Escribe la consulta a realizar antes de agregarla…'; return; }
    MARCAS[k]=MARCAS[k]||{}; MARCAS[k].nota=v; guardaMarcas();
    CONS[k]=Object.assign(CONS[k]||{},{act:1,f:fotoCons(d)}); delete CONS[k].ev; delete CONS[k].cons; guardaCons();
    pintaRadicados();
  };
}

/* opciones del filtro de color */
function poblarColores(){
  const usados=[...new Set(Object.values(MARCAS).map(m=>m.color).filter(Boolean))];
  const v=$('fColor').value;
  $('fColor').innerHTML='<option value="">— Todos —</option><option value="__sin">Sin marcar</option>'+
    usados.map(c=>'<option value="'+c+'">'+(NOMBRE_COLOR[c]||c)+'</option>').join('');
  $('fColor').value=v;
  pintaFiltro();
}
/* «Filtrar» reúne en un solo selector las anotaciones y los colores. Escribe en los
   selectores internos fNotas/fColor para que toda la lógica existente siga igual. */
function pintaFiltro(){
  const s=$('fFiltro'), v=$('fNotas').value==='notas'?'notas':$('fColor').value;
  const cols=[...$('fColor').options].filter(o=>o.value&&o.value!=='__sin');
  s.innerHTML='<option value="">— Todos —</option><option value="notas">Con anotaciones</option>'+
    '<optgroup label="Color"><option value="__sin">Sin marcar</option>'+cols.map(o=>'<option value="'+esc(o.value)+'">'+esc(o.textContent)+'</option>').join('')+'</optgroup>';
  s.value=[...s.options].some(o=>o.value===v)?v:'';
}
const NOMBRE_COLOR={'#d93025':'Rojo','#f29d38':'Naranja','#f7c600':'Amarillo',
  '#2e9e5b':'Verde','#1565d8':'Azul','#7b61d8':'Morado','#61708a':'Gris'};

/* ---------- panel de detalle ---------- */
function verDetalle(d){
  RAD_SEL=d.radicado;
  const bc={'Vencido':'b-r','Crítico':'b-n','Próximo':'b-a','En plazo':'b-v','Sin fecha':'b-g'};
  const conRev=d.procesos.filter(p=>p.respRevision||p.numRevision);
  const revTxt = d.nProc===0 ? 'No aplica (sin proceso en SAC)'
    : conRev.length ? ('Sí · '+conRev.length+' de '+d.nProc+' proceso(s)') : 'No tiene revisión asignada';

  const k=d.llave||d.radicado;

  /* ajuste de fecha: solo para radicados llegados por correo */
  let html='';
  if(d.esCorreo){
    html+='<div class="mailbox"><div class="t">'+M2I(M2P.mail)+'Recibido por correo electr\u00f3nico</div>'+
      '<div style="font-size:12.3px;color:var(--texto2);margin-bottom:8px">'+
      'Fecha oficial del sistema: <b>'+dFmt(d.fSol)+'</b>. Si el correo lleg\u00f3 antes, registra la fecha real '+
      'para contar los d\u00edas desde ah\u00ed. El ajuste queda guardado en este equipo.</div>'+
      '<div class="mailrow">'+
        '<div class="campo"><label class="lf">Fecha de recepci\u00f3n</label>'+
        '<input type="date" id="fAjuste" value="'+(d.ajuste?clave(d.ajuste):(d.fSol?clave(d.fSol):''))+'"></div>'+
        '<button class="btn mini" id="bAjuste">Aplicar</button>'+
        (d.ajuste?'<button class="btn sec mini" id="bQuitar">Quitar ajuste</button>':'')+
      '</div></div>';
  }

  /* ---- columna izquierda: ficha del radicado ---- */
  const fila=(et,v,cls)=>'<div class="f'+(cls?' '+cls:'')+'"><span class="k">'+et+'</span><span class="w">'+v+'</span></div>';
  /* v35 · «Datos del radicado» se pinta como cuadrícula compacta: los textos largos (Contenido y Trámite)
     ocupan toda la fila (f-wide) y el resto de datos se reparte en celdas. Mismos textos y mismos datos. */
  const ficha='<div class="ficha">'+
    fila('Contenido', d.contenido ? esc(d.contenido)
        : '<span class="sp">Sin contenido registrado en Mercurio</span>','f-wide')+
    fila('Radicado',radLinkHtml(d),'f-hero')+
    fila('D\u00eda','D\u00eda '+(d.dia??'\u2014'),'t1')+
    fila('F. radicaci\u00f3n',dFmt(d.fSol)+(d.ajuste?' <span class="badge b-a">\u2192 '+dFmt(d.ajuste)+'</span>':''))+
    fila('F. vencimiento',dFmt(d.fVto)+' <span class="badge '+bc[d.estadoV]+'">'+d.estadoV+'</span>','t1')+
    fila('Vence (15 d\u00edas h\u00e1b.)',celdaVence(d.fEfe),'t1')+
    fila('N\u00famero de cuenta',(d.cuenta?esc(d.cuenta):'\u2014')+
      (d.nCuentas>1?' <span class="badge b-b">'+d.nCuentas+' cuentas</span>':''))+
    fila('Procesos en SAC',d.nProc?nfmt(d.nProc):'<span class="sp">Sin proceso creado en SAC</span>','t3')+
    fila('\u00bfRevisi\u00f3n asignada?',esc(revTxt),'t3')+
    fila('Responsable',esc(d.responsable))+
    fila('Solicitante',esc(d.solicitante||'\u2014'))+
    fila('Origen',esc(d.fuente),'t3')+
    fila('Tr\u00e1mite',esc(d.tramites.join(' \u00b7 ')),'f-wide')+
    '</div>';

  /* ---- columna derecha: observaciones de los procesos ---- */
  const conObs=d.procesos.filter(p=>p.obsRevision);
  const obs = conObs.length
    ? '<div class="obsWrap">'+conObs.map(p=>'<div class="obsCard">'+
        '<div class="h">Proceso '+esc(p.numero)+(p.respRevision?' \u00b7 '+esc(p.respRevision):'')+'</div>'+
        '<div class="t">'+esc(p.obsRevision)+'</div></div>').join('')+'</div>'
    : '<div class="ficha"><div class="f"><span class="sp">'+
      (d.nProc?'Este radicado no tiene observaciones de revisi\u00f3n registradas.'
             :'Sin proceso creado en SAC, por lo tanto no hay observaciones.')+'</span></div></div>';

  /* ---- procesos asociados (columna izquierda) ---- */
  const tablaProc = d.nProc
    ? '<div class="procWrap"><table class="tablaProc"><thead><tr><th>Proceso</th><th>Tr\u00e1mite</th>'+
      '<th>Cuenta</th><th>\u00daltima acci\u00f3n</th><th>Resp. revisi\u00f3n</th><th>Estado</th></tr></thead><tbody>'+
      d.procesos.map(p=>'<tr><td class="rad">'+esc(p.numero)+'</td><td>'+esc(p.tramite)+'</td>'+
        '<td>'+esc(p.cuenta||'\u2014')+'</td><td>'+esc(p.ultimaAccion||'\u2014')+'</td>'+
        '<td>'+(p.respRevision?'<b>'+esc(p.respRevision)+'</b>':'<span class="sp">Sin asignar</span>')+'</td>'+
        '<td>'+esc(p.estadoRevision||'\u2014')+'</td></tr>').join('')+'</tbody></table></div>'
    : '<div class="ficha"><div class="f"><span class="sp">Sin proceso creado en SAC.</span></div></div>';

  /* izquierda: datos del radicado · derecha: procesos y, debajo, observaciones */
  html+='<div class="detCols">'+
    '<div><h4 class="hDatos">Datos del radicado</h4>'+ficha+'</div>'+
    '<div><h4 class="h4Acc hProc">Procesos asociados'+(d.nProc?'<span class="hCnt">'+d.nProc+'</span>':'')+
      ((d.cuentas||[]).some(c=>c&&c!=='0')?'<button class="btnCta" id="btnCta" type="button">'+m2i('home')+'Detalles de la cuenta</button>':'')+'</h4>'+tablaProc+
      '<h4 class="hObs">Observaciones de la revisi\u00f3n'+
      (conObs.length?'<span class="hCnt">'+conObs.length+'</span>':'')+'</h4>'+obs+'</div>'+
    '</div>';

  $('detTit').innerHTML='Detalle del radicado '+radLinkHtml(d);
  $('detSub').textContent=d.tramites.join(' · ');
  $('detBody').innerHTML=html;
  $('detalle').classList.add('on');
  enlazaRadicado($('detalle'),d);
  const bCta=document.getElementById('btnCta'); if(bCta) bCta.onclick=()=>abrirCuenta(d);

  if(d.esCorreo){
    $('bAjuste').onclick=()=>{
      const v=$('fAjuste').value; if(!v) return;
      AJUSTES[k]=v; guardaAjustes(); unificar(); poblarFiltros(); render();
      const nd=DATOS.find(x=>(x.llave||x.radicado)===k); if(nd){ if(nd.dia) DIA_SEL=nd.dia; render(); pintaRadicados(); verDetalle(nd); }
    };
    /* $() nunca devuelve null (crea un elemento fantasma y reporta error), por eso se consulta el DOM directamente */
    const bQuitar=document.getElementById('bQuitar');
    if(bQuitar) bQuitar.onclick=()=>{
      delete AJUSTES[k]; guardaAjustes(); unificar(); poblarFiltros(); render();
      const nd=DATOS.find(x=>(x.llave||x.radicado)===k); if(nd){ if(nd.dia) DIA_SEL=nd.dia; render(); pintaRadicados(); verDetalle(nd); }
    };
  }
  /* sin desplazamiento automático: el usuario baja cuando quiera ver el detalle */
}

/* ---------- modal ---------- */
let DET=[];
function abrir(titulo,sub,regs){
  DET=regs; $('mTit').textContent=titulo; $('mSub').textContent=sub+' · '+nfmt(regs.length)+' radicado(s)';
  const bc={'Vencido':'b-r','Crítico':'b-n','Próximo':'b-a','En plazo':'b-v','Sin fecha':'b-g'};
  const o=[...regs].sort((a,b)=>(a.dia??99)-(b.dia??99)||(a.restan??999)-(b.restan??999));
  $('mTabla').querySelector('tbody').innerHTML=o.length?o.map(x=>'<tr>'+
    '<td class="rad">'+esc(x.radicado)+'</td>'+
    '<td>'+(x.nProc?esc(x.procesos.map(p=>p.numero).join(', ')):'<span class="sp">Sin proceso creado en SAC</span>')+'</td>'+
    '<td>'+esc(x.cuenta||'—')+'</td><td>'+esc(x.tramites.join(' · '))+'</td>'+
    '<td>'+dFmt(x.fEfe)+'</td><td>'+dFmt(x.fVto)+'</td>'+
    '<td><span class="badge '+bc[x.estadoV]+'">'+x.estadoV+'</span></td>'+
    '<td>'+esc(x.responsable)+'</td><td>'+esc(x.fuente)+'</td></tr>').join('')
    : '<tr><td colspan="9" class="vacio">Sin registros.</td></tr>';
  $('modal').classList.add('on');
}
$('mCerrar').onclick=()=>$('modal').classList.remove('on');
$('modal').onclick=e=>{ if(e.target===$('modal')) $('modal').classList.remove('on'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') $('modal').classList.remove('on'); });
function etiqueta(){ const r=USUARIO_FIJO||valorResp(),t=$('fTram').value;
  if(!RESPONSABLE_VISIBLE) return t?('Trámite: '+t):'Todos los trámites';   /* sin mención al responsable para usuarios no habilitados */
  return [r?('Responsable: '+r):'Todos los responsables',t?('Trámite: '+t):''].filter(Boolean).join(' · '); }

/* ---------- generador XLSX propio (sin librerías externas) ---------- */
const XLSXW=(function(){
  const T=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; T[n]=c>>>0; }
  const crc=u=>{ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=T[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  const enc=s=>new TextEncoder().encode(s);
  const x=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  const col=n=>{ let s=''; n++; while(n){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; };
  function zip(files){
    const parts=[], cen=[]; let off=0;
    files.forEach(f=>{ const nm=enc(f.n), d=f.d, c=crc(d);
      const lh=new DataView(new ArrayBuffer(30));
      lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true);
      lh.setUint32(14,c,true); lh.setUint32(18,d.length,true); lh.setUint32(22,d.length,true); lh.setUint16(26,nm.length,true);
      parts.push(new Uint8Array(lh.buffer),nm,d);
      const ch=new DataView(new ArrayBuffer(46));
      ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true);
      ch.setUint32(16,c,true); ch.setUint32(20,d.length,true); ch.setUint32(24,d.length,true); ch.setUint16(28,nm.length,true);
      ch.setUint32(42,off,true); cen.push(new Uint8Array(ch.buffer),nm);
      off+=30+nm.length+d.length; });
    const cs=cen.reduce((a,b)=>a+b.length,0), e=new DataView(new ArrayBuffer(22));
    e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true);
    e.setUint32(12,cs,true); e.setUint32(16,off,true);
    return new Blob(parts.concat(cen,[new Uint8Array(e.buffer)]),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function hoja(filas){
    const ancho=[]; filas.forEach(f=>f.forEach((v,i)=>{ ancho[i]=Math.min(60,Math.max(ancho[i]||8,String(v==null?'':v).length+2)); }));
    const cols='<cols>'+ancho.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols>';
    const rows=filas.map((f,r)=>'<row r="'+(r+1)+'">'+f.map((v,c)=>{ const ref=col(c)+(r+1), st=r===0?' s="1"':'';
      if(typeof v==='number'&&isFinite(v)) return '<c r="'+ref+'"'+st+'><v>'+v+'</v></c>';
      return '<c r="'+ref+'" t="inlineStr"'+st+'><is><t xml:space="preserve">'+x(v)+'</t></is></c>'; }).join('')+'</row>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
      cols+'<sheetData>'+rows+'</sheetData>'+(filas.length?'<autoFilter ref="A1:'+col(Math.max(0,filas[0].length-1))+filas.length+'"/>':'')+'</worksheet>';
  }
  function descargar(nombre,hojas){
    const N='http://schemas.openxmlformats.org', f=[];
    f.push({n:'[Content_Types].xml',d:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="'+N+'/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      hojas.map((h,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>')});
    f.push({n:'_rels/.rels',d:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="'+N+'/package/2006/relationships"><Relationship Id="rId1" Type="'+N+'/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')});
    f.push({n:'xl/workbook.xml',d:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="'+N+'/spreadsheetml/2006/main" xmlns:r="'+N+'/officeDocument/2006/relationships"><sheets>'+
      hojas.map((h,i)=>'<sheet name="'+x(String(h.nombre).slice(0,31).replace(/[\\\/\?\*\[\]:]/g,' '))+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>')});
    f.push({n:'xl/_rels/workbook.xml.rels',d:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="'+N+'/package/2006/relationships">'+
      hojas.map((h,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+N+'/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+
      '<Relationship Id="rId'+(hojas.length+1)+'" Type="'+N+'/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')});
    f.push({n:'xl/styles.xml',d:enc('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="'+N+'/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B3C8A"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>')});
    hojas.forEach((h,i)=>f.push({n:'xl/worksheets/sheet'+(i+1)+'.xml',d:enc(hoja(h.filas))}));
    const a=document.createElement('a'); a.href=URL.createObjectURL(zip(f)); a.download=nombre; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }
  return {descargar};
})();
function exportar(regs,nombre){
  if(!regs.length) return alert('No hay datos para exportar.');
  const h=['Radicado','Procesos','Cuenta','Trámite','Fecha radicación','Fecha ajustada','Día','Vence (15 días hábiles)','Fecha vencimiento SAC',
    'Estado','Responsable','Responsable revisión','Última acción','Origen'];
  const l=regs.map(x=>[x.radicado,
    x.nProc?x.procesos.map(p=>p.numero).join(' | '):'Sin proceso creado en SAC',
    x.cuenta,x.tramites.join(' | '),dFmt(x.fSol),x.ajuste?dFmt(x.ajuste):'',x.dia??'',dFmt(fechaVence(x.fEfe)),dFmt(x.fVto),
    x.estadoV,x.responsable,
    [...new Set(x.procesos.map(p=>p.respRevision).filter(Boolean))].join(' | '),
    [...new Set(x.procesos.map(p=>p.ultimaAccion).filter(Boolean))].join(' | '),
    x.fuente]);
  XLSXW.descargar(nombre,[{nombre:'PQRS',filas:[h].concat(l)}]);
}
$('mExp').onclick=()=>exportar(DET,'detalle_pqrs.xlsx');
$('expTodo').onclick=()=>exportar(filtrar(),'cuadro_mando_pqrs.xlsx');

/* al elegir un usuario la lista se bloquea; el botón la libera */
['fTram','q'].forEach(i=>$(i).addEventListener('input',()=>{ if(filtroActivo()) DIA_SEL=null; render(); }));
function cambiaNotas(){
  if(conNotas()){ if(DIA_SEL!==null) DIA_PREV=DIA_SEL; DIA_SEL=null; }
  else if(DIA_PREV!==null && !filtroActivo()){ DIA_SEL=DIA_PREV; DIA_PREV=null; }
  render(); }
$('fNotas').addEventListener('change',cambiaNotas);
/* el Resumen general solo se muestra al escribir "general" en la búsqueda */
$('q').addEventListener('input',()=>{ $('lnkRes').style.display = sinTilde($('q').value)==='general' ? '' : 'none'; });
['cMedio','cTodo'].forEach(i=>$(i).addEventListener('change',()=>{poblarFiltros();render();}));
$('fColor').addEventListener('change',()=>{ render(); });
$('fFiltro').addEventListener('change',()=>{
  const v=$('fFiltro').value, eraNotas=$('fNotas').value==='notas';
  $('fColor').value=(v&&v!=='notas')?v:'';
  $('fNotas').value=v==='notas'?'notas':'';
  if(eraNotas!==(v==='notas')) cambiaNotas();
  else { render(); }
});
poblarColores();
$('limpiar').onclick=()=>{ ['fTram','q'].forEach(i=>$(i).value=''); { const e=selResp(); if(e) e.value=''; }
  USUARIO_FIJO=RESPONSABLE_VISIBLE?'':RESP_FIRMANTE;
  $('fNotas').value=''; $('fColor').value=''; pintaFiltro(); if(DIA_PREV!==null){ DIA_SEL=DIA_PREV; DIA_PREV=null; }
  render(); };
/* ---------- resumen general: todo el equipo, sin filtro de usuario ni trámite ---------- */
let RES_DIA=[], RES_USR=[];
function resumenGeneral(){
  if(!DATOS.length){ alert('Primero carga los archivos.'); return; }
  const soloM=$('cMedio').checked;
  const enRango=DATOS.filter(d=>d.enVentana && (!soloM||d.medioOk) && !evacuado(d));
  const venc=DATOS.filter(d=>d.vencida && (!soloM||d.medioOk) && !evacuado(d));
  RES_DIA=[];
  [...ESCALERA_EXT].sort((a,b)=>a.dia-b.dia).forEach(s=>{
    const esV=s.dia>CFG.diasHabiles;
    const n=(esV?venc:enRango).filter(x=>x.dia===s.dia).length;
    if(!esV || n) RES_DIA.push({dia:s.dia,fecha:s.fecha,n,venc:esV});
  });
  const totD=RES_DIA.reduce((a,r)=>a+r.n,0), mxD=Math.max(1,...RES_DIA.map(r=>r.n));
  $('tResDia').querySelector('tbody').innerHTML=RES_DIA.map(r=>
    '<tr class="'+(r.venc?'vencFila':'')+(r.n?'':' cero')+'"><td><b>Día '+r.dia+'</b>'+
      (r.venc?' <span class="badge bVenc">Vencida</span>':'')+'</td>'+
    '<td>'+dFmt(r.fecha)+' <span class="sp">'+DIA_CORTO[r.fecha.getDay()]+'</span></td>'+
    '<td>'+celdaVence(r.fecha)+'</td>'+
    '<td class="num"><span class="n">'+nfmt(r.n)+'</span><div class="barMini" style="width:'+
      Math.round(r.n/mxD*100)+'%;margin-left:auto"></div></td></tr>').join('')+
    '<tr class="resTot"><td colspan="3">Total</td><td class="num">'+nfmt(totD)+'</td></tr>';
  /* por usuario: tabla cruzada usuario x día (los 23 del equipo) */
  const dias=RES_DIA.map(r=>r.dia);
  const m={}; CFG.equipo.forEach(u=>m[u]={u,t:0,v:0,d:{}});
  enRango.concat(venc).forEach(d=>{ const r=m[d.respEq]; if(!r) return; r.t++; if(d.vencida) r.v++; r.d[d.dia]=(r.d[d.dia]||0)+1; });
  RES_USR=Object.values(m).sort((a,b)=>b.t-a.t||a.u.localeCompare(b.u,'es'));
  const totU=RES_USR.reduce((a,r)=>a+r.t,0);
  $('tResUsr').querySelector('thead').innerHTML='<tr><th>Usuario</th>'+
    RES_DIA.map(r=>'<th class="num'+(r.venc?' vtoPas':'')+'" title="'+dFmt(r.fecha)+'">Día '+r.dia+'</th>').join('')+'<th class="num">Total</th></tr>';
  $('tResUsr').querySelector('tbody').innerHTML=RES_USR.map(r=>{
    const al=[...(ALIAS[r.u]||[])].filter(x=>canonNombre(x)!==canonNombre(r.u));
    return '<tr class="'+(r.t?'':'cero')+'"><td style="white-space:nowrap">'+esc(r.u)+
      (al.length?'<div class="alias">Unifica: '+esc(al.join(' · '))+'</div>':'')+'</td>'+
      dias.map(dd=>{ const n=r.d[dd]||0; return '<td class="num'+(dd>CFG.diasHabiles&&n?' vtoPas':'')+'">'+(n||'<span class="sp">·</span>')+'</td>'; }).join('')+
      '<td class="num n">'+nfmt(r.t)+'</td></tr>';
  }).join('')+
    '<tr class="resTot"><td>Total</td>'+dias.map(dd=>'<td class="num">'+nfmt(RES_USR.reduce((a,r)=>a+(r.d[dd]||0),0))+'</td>').join('')+
    '<td class="num">'+nfmt(totU)+'</td></tr>';
  $('resSub').textContent='Equipo completo · últimos '+CFG.diasHabiles+' días hábiles más vencidas (días 16 a 20)'+
    (soloM?' · medios Escrito, Página Web y E-Mail':'');
  $('mRes').classList.add('on');
}
$('lnkRes').onclick=e=>{ e.preventDefault(); resumenGeneral(); };
$('resCerrar').onclick=()=>$('mRes').classList.remove('on');
$('mRes').onclick=e=>{ if(e.target===$('mRes')) $('mRes').classList.remove('on'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') $('mRes').classList.remove('on'); });
$('resExp').onclick=()=>{
  XLSXW.descargar('resumen_general_pqrs.xlsx',[
    {nombre:'PQRS por día',filas:[['Día','Fecha recibo','Fecha vence','PQRS']].concat(RES_DIA.map(r=>['Día '+r.dia,dFmt(r.fecha),dFmt(fechaVence(r.fecha)),r.n]))},
    {nombre:'PQRS por usuario',filas:[['Usuario'].concat(RES_DIA.map(r=>'Día '+r.dia),['Total'])].concat(
      RES_USR.map(r=>[r.u].concat(RES_DIA.map(x=>r.d[x.dia]||0),[r.t])))}]);
};
/* ---------- evacuar: paso 1 casilla, paso 2 confirmación ---------- */
let CONF_OK=null, CONF_NO=null, CONF_FOCO=null, CONF_ASYNC=false;
/* Personaliza la ventana de confirmación existente (icono, tono y etiqueta del botón principal).
   Sin opciones conserva el aspecto y los textos de siempre («Sí, evacuar»). */
function confPersonaliza(o){ o=o||{}; CONF_ASYNC=false;
  $('mConf').dataset.tone=o.tone||'warn';
  $('confIco').innerHTML=M2I(M2P[o.icon||'warn']);
  $('confSiTxt').textContent=o.ok||'Sí, evacuar';
  $('confSiIc').innerHTML=o.okIcon?M2I(M2P[o.okIcon]):'';
  CONF_FOCO=o.foco||null;
}
function abreConf(foco){ $('mConf').classList.add('on'); setTimeout(()=>{ const b=$(foco==='ok'?'confSi':'confNo'); if(b&&b.focus) b.focus(); },40); }
function cierraConf(cancelado){ $('mConf').classList.remove('on'); if(cancelado&&CONF_NO) CONF_NO(); CONF_OK=CONF_NO=null; CONF_ASYNC=false;
  const f=CONF_FOCO; CONF_FOCO=null; if(f&&document.contains(f)&&f.focus) setTimeout(()=>f.focus({preventScroll:true}),30); }
/* ---------- Radicado → «¿Desea generar la respuesta?» → Módulo 3 (filtro general por ese radicado) ----------
   El número de radicado de «Radicados del día» y de «Detalle del radicado» abre la confirmación existente SOLO si el
   radicado tiene un proceso creado en SAC (d.nProc>0, el mismo dato que pinta «Sin proceso creado en SAC»). Sin proceso
   queda deshabilitado (aria-disabled + mismo patrón visual que los controles deshabilitados) y ningún camino lo ejecuta.
   «Generar respuesta» llama a AD.navigate('documentos',{radicado},{...}): el shell muestra el loader, prepara el Módulo 3,
   aplica el filtro y navega. Si algo falla vuelve aquí con {ok:false,error} y se reabre esta misma ventana con el error. */
const tieneProcesoSAC=d=>!!d&&d.nProc>0;
const MSG_SIN_PROCESO='No disponible: este radicado no tiene un proceso creado en SAC.';
const radLinkHtml=(d,i)=>'<button type="button" class="radLink rad" data-act="rad"'+(i!=null?' data-i="'+i+'"':'')+
  (tieneProcesoSAC(d)?' aria-haspopup="dialog" title="Generar la respuesta de este radicado"':' aria-disabled="true" title="'+MSG_SIN_PROCESO+'"')+'>'+esc(d.radicado)+'</button>';
function enlazaRadicado(raiz,d){ raiz.querySelectorAll('[data-act="rad"]:not([aria-disabled="true"])').forEach(b=>{ b.onclick=e=>{ e.stopPropagation(); e.preventDefault(); pedirGenerarRespuesta(d,b); }; }); }
let GEN_BUSY=false;      /* una sola generación a la vez (el shell también lo garantiza) */
/* Etapas que muestra el Asistente mientras trabaja: las cuatro primeras las informa el propio Módulo 3 al procesar de verdad
   (analizar el índice de radicados, filtrar, cargar el registro, preparar la respuesta); la última es la transición. */
const TXT_CARGA=rad=>({title:'Procesando la información',
  detail:'Preparando el radicado '+rad+' para generar la respuesta',
  steps:['Analizando información','Filtrando datos','Procesando información','Preparando respuesta','Abriendo Módulo\u00a03']});
const MSG_ERR_GEN='No fue posible completar el proceso. Inténtalo de nuevo.';
/* Estado «procesando» del botón «Generar respuesta» de la ventana de confirmación: se aplica en el mismo clic, bloquea
   cancelar/cerrar y evita clics repetidos; al terminar (o fallar) se restaura el estado normal del botón. */
function confOcupado(on){
  const m=$('mConf'),b=$('confSi');
  m.classList.toggle('is-busy',on); b.disabled=on; $('confNo').disabled=on; $('confX').disabled=on;
  b.setAttribute('aria-busy',on?'true':'false');
  if(on){ b.dataset.txt=$('confSiTxt').textContent; $('confSiTxt').textContent='Procesando…'; }
  else if(b.dataset.txt!=null){ $('confSiTxt').textContent=b.dataset.txt; delete b.dataset.txt; }
}
async function irAGenerarRespuesta(d,origen){
  if(GEN_BUSY||!tieneProcesoSAC(d)) return;
  GEN_BUSY=true; confOcupado(true);
  let r;
  try{
    r=(window.AD&&typeof AD.navigate==='function')
      ? await AD.navigate('documentos',{radicado:String(d.radicado)},TXT_CARGA(d.radicado))
      : {ok:false,error:'El Módulo 3 solo está disponible desde el Asistente Documental.'};
  }catch(e){ console.error('[Cuadro de mando] Generar respuesta:',e); r={ok:false,error:MSG_ERR_GEN}; }
  GEN_BUSY=false; confOcupado(false);
  if(r&&r.ok===false&&!r.busy) pedirGenerarRespuesta(d,origen,r.error||MSG_ERR_GEN);   /* la ventana sigue abierta: muestra el error y «Reintentar» */
  else if(r&&r.ok) cierraConf(false);                                                    /* ya está oculta tras la transición */
}
function pedirGenerarRespuesta(d,origen,error){
  if(GEN_BUSY||!tieneProcesoSAC(d)) return;
  const radicado=d.radicado;
  if(origen&&!error){ origen.classList.remove('is-picked'); void origen.offsetWidth; origen.classList.add('is-picked'); }
  $('confTit').textContent=error?'No se pudo generar la respuesta':'¿Desea generar la respuesta para este radicado?';
  $('confTxt').innerHTML='<div class="cfRad"><span aria-hidden="true">'+M2I(M2P.doc)+'</span><div><small>Radicado seleccionado</small><strong>'+esc(radicado)+'</strong></div></div>'+
    (error?'<div class="cfError" role="alert">'+M2I(M2P.warn)+'<span>'+esc(error)+'</span></div>':'');
  confPersonaliza(error?{tone:'error',icon:'warn',ok:'Reintentar',okIcon:'all',foco:origen}
                       :{tone:'info',icon:'docSpark',ok:'Generar respuesta',okIcon:'arrow',foco:origen});
  CONF_NO=null; CONF_OK=()=>irAGenerarRespuesta(d,origen); CONF_ASYNC=true;   /* la ventana queda abierta mientras se procesa */
  abreConf('ok');
}
function pedirEvacuar(regs,que,alCancelar){
  regs=(regs||[]).filter(Boolean);
  if(!regs.length){ if(alCancelar) alCancelar(); return; }
  const uno=regs.length===1;
  $('confTit').textContent=uno?'Evacuar radicado':'Evacuar '+regs.length+' radicados';
  $('confTxt').innerHTML=(uno
      ? '¿Confirmas que el radicado <b>'+esc(regs[0].radicado)+'</b> ya fue gestionado y quieres sacarlo del informe?'
      : '¿Confirmas que quieres sacar del informe '+esc(que)+' (<b>'+regs.length+'</b>)?')+
    (uno?'':'<div class="lista">'+regs.map(r=>esc(r.radicado)).join('<br>')+'</div>')+
    '<div style="margin-top:10px;font-size:12px;color:var(--texto2)">Podrás restaurarlo desde «Evacuados» en la barra de filtros.</div>';
  CONF_NO=alCancelar;
  confPersonaliza({tone:'warn',icon:'archive'});
  CONF_OK=()=>{
    const hoy=clave(HOY);
    regs.forEach(r=>{ EVAC[claveR(r)]={f:hoy,r:r.radicado,u:r.responsable}; });
    guardaEvac(); histEvacuar(regs);
    if(regs.some(r=>r.radicado===RAD_SEL)) $('detalle').classList.remove('on');
    refrescaEvac();
  };
  abreConf('no');
}
$('confSi').onclick=()=>{ const fn=CONF_OK; if(CONF_ASYNC){ if(fn&&!GEN_BUSY) fn(); return; } CONF_NO=null; cierraConf(false); if(fn) fn(); };
$('confNo').onclick=()=>{ if(!GEN_BUSY) cierraConf(true); };
$('confX').onclick=()=>{ if(!GEN_BUSY) cierraConf(true); };
$('mConf').onclick=e=>{ if(e.target===$('mConf')&&!GEN_BUSY) cierraConf(true); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&$('mConf').classList.contains('on')&&!GEN_BUSY) cierraConf(true); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('mConf').classList.contains('on')) $('mEvac').classList.remove('on'); });

function refrescaEvac(){
  $('lnkEv').textContent='Evacuados ('+Object.keys(EVAC).length+')';
  poblarFiltros(); render();
  if($('mEvac').classList.contains('on')) listaEvac();
}
function listaEvac(){
  const ks=Object.keys(EVAC).sort((a,b)=>(EVAC[b].f||'').localeCompare(EVAC[a].f||''));
  $('evSub').textContent=ks.length+' radicado(s) fuera del informe · guardados en este equipo';
  $('tEvac').querySelector('tbody').innerHTML=ks.length?ks.map(k=>{
    const e=EVAC[k], f=e.f?e.f.split('-').reverse().join('/'):'—';
    return '<tr><td class="rad">'+esc(e.r||k)+'</td><td>'+esc(e.u||'—')+'</td><td>'+f+'</td>'+
      '<td style="text-align:right"><button class="btnFila" data-rest="'+esc(k)+'" type="button">'+m2i('undo')+'Restaurar</button></td></tr>';
  }).join(''):'<tr><td colspan="4" class="vacio">No hay radicados evacuados.</td></tr>';
  $('tEvac').querySelectorAll('[data-rest]').forEach(b=>b.onclick=()=>{
    delete EVAC[b.dataset.rest]; guardaEvac(); refrescaEvac(); });
}
$('lnkEv').onclick=()=>{ listaEvac(); $('mEvac').classList.add('on'); };
$('evX').onclick=()=>$('mEvac').classList.remove('on');
$('mEvac').onclick=e=>{ if(e.target===$('mEvac')) $('mEvac').classList.remove('on'); };
$('evTodo').onclick=()=>{ if(!Object.keys(EVAC).length) return;
  EVAC={}; guardaEvac(); refrescaEvac(); };
$('lnkEv').textContent='Evacuados ('+Object.keys(EVAC).length+')';
$('lnkEvLimp').onclick=()=>{ const n=Object.keys(EVAC).length; if(!n){ alert('No hay radicados evacuados.'); return; }
  confirmar('Limpiar evacuados','¿Borrar el registro de <b>'+n+'</b> radicado(s) evacuado(s)? Todos vuelven a aparecer en el cuadro de mando.',
    ()=>{ EVAC={}; guardaEvac(); refrescaEvac(); },()=>{}); };
/* ---------- orden por columnas ---------- */
function valCelda(td){
  const s=td.querySelector('select'); if(s) return s.value||'';
  const i=td.querySelector('input.nota'); if(i) return i.value||'';
  const t=td.textContent.trim(), f=t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if(f) return +(f[3]+f[2]+f[1]);
  const n=t.replace(/\./g,'').replace(',','.'); return (n!==''&&!isNaN(n))?+n:t.toLowerCase();
}
function ordenable(tabla){
  tabla.querySelectorAll('thead th').forEach(x=>{ delete x.dataset.o; x.textContent=x.textContent.replace(/ [▲▼]$/,''); });
  tabla.querySelectorAll('thead th').forEach((th,i)=>{
    if(!th.textContent.trim()) return;
    th.style.cursor='pointer'; th.title='Ordenar';
    th.onclick=()=>{
      const desc=th.dataset.o!=='desc'; tabla.querySelectorAll('thead th').forEach(x=>{ delete x.dataset.o; x.textContent=x.textContent.replace(/ [▲▼]$/,''); });
      th.dataset.o=desc?'desc':'asc'; th.textContent+=desc?' ▼':' ▲';
      const tb=tabla.querySelector('tbody'), fs=[...tb.rows].filter(r=>r.cells.length>1);
      fs.sort((a,b)=>{ const x=valCelda(a.cells[i]), y=valCelda(b.cells[i]);
        const c=(typeof x==='number'&&typeof y==='number')?x-y:String(x).localeCompare(String(y),'es'); return desc?-c:c; });
      fs.forEach(r=>tb.appendChild(r));
    };
  });
}

/* ================= RECURSOS ================= */
const RUTAS_NOM={pq:'Peticiones',es:'Ruta especializada',cd:'Cambio de datos básicos',rc:'Reclamos',rs:'Recursos',sp:'SSPD',so:'Somos'};
const SUB_PQ=['pq','es','cd'];      /* sub-rutas dentro de la pestaña Peticiones */
const PLAZO_ES=10;                 /* la ruta especializada responde en 10 días hábiles */
const RUTAS_DEF={
  pq:['GLORIA LILIANA ROJAS MORENO','EDWARD FELIPE HERNANDEZ OROZCO','KELLY JOHANNA REYES VILLAMIZAR','JORGE LUIS DELGADO RANGEL',
      'EDWARD LEONARDO MONTAÑEZ CABALLERO','JAIRO CHAVES MALAVER','YURLEY VIVIANA SANDOVAL PÉREZ','LEIDY VIVIANA PEREA BARRAGAN',
      'LEIDY VIVIANA ALBARRACÍN CAMPOS'],
  rc:['CLAUDIA MARINA ROA SANCHEZ','LAURA ANDREA GARZON MONSALVE','JESSICA GARCIA RAMIREZ','YANETH CABALLERO PLATA',
      'MAYRA ALEJANDRA PARDO FLOREZ','ESMERALDA BERMUDEZ RANGEL','NIDIA ESPERANZA BECERRA PINTO','YUDY CAROLINA RODRIGUEZ GUTIERREZ',
      'DIANA CAROLINA RIOS JONES','DIANA CAROLINA MARTINEZ AMOROCHO','ADRIANA BAUTISTA ALFONSO'],
  rs:['LIZETH JOHANNA CAICEDO MELO','NORA LILIANA VILLAMIZAR JAIMES'],
  sp:['YINETH NATALIA LOPEZ LEMUS'],
  so:['ALBA YANETH LEAL HERNANDEZ'],
  es:['LEYLA MARIANA SERRANO SANDOVAL'],
  cd:['ZANDRA MILENA JEREZ JAIMES']};
const LS_RUTAS='essa_rutas';
let RUTA='pq';
const LS_ROL='essa_rol_recursos', LS_EXP='essa_expedientes', LS_HOY='essa_checklist_hoy';
const lsGet=(k,d)=>{ try{ return JSON.parse(appDataGet(k))??d; }catch(e){ return d; } };
const lsSet=(k,v)=>{ try{ appDataSet(k,JSON.stringify(v)); }
  catch(e){ reportaError('No se pudo guardar ('+k+'). Almacenamiento lleno: exporta un respaldo y usa «Mantenimiento» en la carpeta de datos',e); } };
let RUTAS=lsGet(LS_RUTAS,null);
if(!RUTAS){ RUTAS=JSON.parse(JSON.stringify(RUTAS_DEF)); const viejo=lsGet(LS_ROL,null); if(Array.isArray(viejo)&&viejo.length) RUTAS.rs=viejo; }
if(typeof RUTAS!=='object'||!RUTAS||Array.isArray(RUTAS)) RUTAS=JSON.parse(JSON.stringify(RUTAS_DEF));
Object.keys(RUTAS_DEF).forEach(k=>{ if(!Array.isArray(RUTAS[k])) RUTAS[k]=RUTAS_DEF[k].slice(); });
RUTAS=SANEA.listas(RUTAS,RUTAS_DEF);
/* ---------- equipo (fuente única: configuración de rutas) ----------
   El equipo es la unión de los integrantes de todas las rutas configuradas (RUTAS). Se calcula una vez
   al iniciar, de modo que cambiar integrantes de una ruta durante la sesión no altere la identificación
   ni los datos en pantalla; el cambio se refleja al volver a abrir el Asistente. */
function reconstruirEquipo(){
  const vistos=new Set(), lista=[];
  Object.keys(RUTAS).forEach(k=>(Array.isArray(RUTAS[k])?RUTAS[k]:[]).forEach(n=>{
    const c=canonNombre(n); if(c&&!vistos.has(c)){ vistos.add(c); lista.push(String(n).trim()); } }));
  lista.sort((a,b)=>a.localeCompare(b,'es'));
  CFG.equipo=lista;
  EQUIPO=lista.map(n=>({nombre:n, toks:tokNombre(n)}));
  Object.keys(CACHE_EQ).forEach(k=>delete CACHE_EQ[k]);
  Object.keys(ALIAS).forEach(k=>delete ALIAS[k]);
  CACHE_ID.clear();
}
reconstruirEquipo();
let ROL=RUTAS[RUTA], EXP=lsGet(LS_EXP,{}), CHK=lsGet(LS_HOY,{});
const _obj=v=>(v&&typeof v==='object'&&!Array.isArray(v))?v:{};
EXP=SANEA.exp(EXP); CHK=SANEA.chk(CHK);
/* migración: la ruta «Cambio de datos básicos» se guardó vacía antes de tener integrantes */
if(!appDataGet('essa_mig_cd_zandra')){
  if(Array.isArray(RUTAS.cd) && !RUTAS.cd.length){ RUTAS.cd=RUTAS_DEF.cd.slice(); lsSet(LS_RUTAS,RUTAS); }
  try{ appDataSet('essa_mig_cd_zandra','1'); }catch(e){}
}
const guardaRutas=()=>{ RUTAS[RUTA]=ROL; lsSet(LS_RUTAS,RUTAS); DUP_IDX=null; };
let SUBREC='dup', EXP_VER_EV=false;

function pintaRol(){
  const v=$('recUsr').value;
  $('recUsr').innerHTML=ROL.map(u=>'<option>'+esc(u)+'</option>').join('');
  $('recUsr').value=ROL.includes(v)?v:(ROL[0]||'');
  $('rolChips').innerHTML=ROL.map((u,i)=>'<span class="rolChip">'+esc(u)+' <b data-q="'+i+'" title="Quitar">×</b></span>').join('')||
    '<span class="sp">Sin usuarios en el rol.</span>';
  $('rolAdd').innerHTML=CFG.equipo.filter(u=>!ROL.includes(u)).map(u=>'<option>'+esc(u)+'</option>').join('');
  $('rolChips').querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{ ROL.splice(+b.dataset.q,1); guardaRutas(); pintaRol(); pintaRec(); });
  /* «Ruta especializada» ya lleva la palabra «ruta»: antes se leía «Usuario de la ruta Ruta especializada» */
  const nomR=RUTAS_NOM[RUTA]||RUTA, deLaRuta=/^Ruta /.test(nomR)?'de la '+nomR.replace(/^Ruta /,'ruta '):'de la ruta '+nomR;
  $('recUsrLbl').textContent='Usuario '+deLaRuta;
  $('rolBoxTit').textContent='Usuarios '+deLaRuta+' (se guarda en este equipo):';
  $('subExp').style.display = RUTA==='rs' ? '' : 'none';
  $('subVen').style.display = RUTA==='es' ? '' : 'none';
  $('subRuta').style.display = SUB_PQ.includes(RUTA) ? '' : 'none';
  $('subRuta').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.r===RUTA));
  rtSync();
}
/* Solo presentación («Rutas»): color de la ruta elegida, nombre en la cabecera del panel, conteo de usuarios por ruta y estado de los botones. */
function rtSync(){
  const main=SUB_PQ.includes(RUTA)?'pq':RUTA, m=$('mRec');
  m.dataset.ruta=main;
  $('rtWhoNom').textContent=RUTAS_NOM[RUTA]||RUTA;
  $('rtWhoK').textContent=main!==RUTA?'Ruta seleccionada · '+RUTAS_NOM[main]:'Ruta seleccionada';
  ['pq','rc','rs','sp','so'].forEach(k=>{ const n=(RUTAS[k]||[]).length, el=$('rtN_'+k);
    if(el){ el.textContent=n; el.title=n+(n===1?' usuario':' usuarios')+' en la ruta'; } });
  m.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.t===main)));
  $('subRuta').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.r===RUTA)));
  m.querySelectorAll('.subtab button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s===SUBREC)));
}
$('recRolBtn').onclick=()=>$('rolBox').classList.toggle('on');
$('rolAddBtn').onclick=()=>{ const u=$('rolAdd').value; if(u&&!ROL.includes(u)){ ROL.push(u); guardaRutas(); pintaRol(); pintaRec(); } };
$('rolReset').onclick=()=>{ ROL=RUTAS_DEF[RUTA].slice(); guardaRutas(); pintaRol(); pintaRec(); };

/* procesos en la bandeja del usuario: creados por él o cuyo radicado está a su cargo en Mercurio */
function procesosDe(u){
  const vistos=new Set();
  return ALLPROC.filter(x=>{ const k=x.p.numero; if(vistos.has(k)) return false;
    const ok = x.cre===u || x.ges===u; if(ok) vistos.add(k); return ok; });
}
/* ¿la cuenta del expediente ya tiene un proceso 3904 (envío de expediente)? */
function medioRec(x){
  const m=x.p.medioP||x.d.medio||'', s=sinTilde(m);
  if(/pagina web|portal|web/.test(s)) return '<span class="medWeb">'+m2i('globe')+'Web</span>';
  if(/^escrito/.test(s)) return '<span class="medEsc">'+m2i('mail')+'Escrito</span>';
  return m?esc(m):'—';
}
function fechaAviso(x){
  if(!/^escrito/.test(sinTilde(x.p.medioP||x.d.medio)) || !x.p.fVto) return '<span class="sp">—</span>';
  let d=new Date(x.p.fVto), n=0;
  while(n<6){ d=addD(d,1); if(esHabil(d)) n++; }
  return '<b>'+dFmt(d)+'</b>';
}
function celdaNota(k,txtN,editando){
  if(!editando && txtN) return '<div class="notaFija">'+esc(txtN)+'</div>'+
    '<div class="notaWrap" style="margin-top:4px"><button class="btn sec mini" data-xed="1">'+m2i('edit')+'Editar</button></div>';
  if(!editando) return '<div class="notaFija vacia">Sin observaciones</div>'+
    '<div class="notaWrap" style="margin-top:4px"><button class="btn sec mini" data-xed="1">'+m2i('edit')+'Escribir</button></div>';
  return '<textarea class="nota" placeholder="Documentos faltantes…">'+esc(txtN)+'</textarea>'+
    '<div class="notaWrap" style="margin-top:4px"><button class="btn mini" data-xg="1">Guardar</button>'+
    '<button class="btn sec mini" data-xcan="1">Cancelar</button></div>';
}
/* cajón de texto genérico: fijo con «Editar» o editable con «Guardar» */
function celdaTxt(txtN,editando,ph){
  if(!editando) return (txtN?'<div class="notaFija">'+esc(txtN)+'</div>':'<div class="notaFija vacia">Sin texto</div>')+
    '<div class="notaWrap" style="margin-top:4px"><button class="btn sec mini" data-xed="1">'+m2i('edit')+(txtN?'Editar':'Escribir')+'</button></div>';
  return '<textarea class="nota" placeholder="'+esc(ph||'')+'">'+esc(txtN)+'</textarea>'+
    '<div class="notaWrap col" style="margin-top:4px"><button class="btn mini" data-xg="1">Guardar</button>'+
    '<button class="btn sec mini" data-xcan="1">Cancelar</button></div>';
}
function aviso3904(x){
  const cta=x.p.cuenta||x.d.cuenta; if(!cta) return '';
  const vistos=new Set();
  const L=ALLPROC.filter(y=>String(y.p.codTram)==='3904' && (y.p.cuenta||y.d.cuenta)===cta &&
    y.p.numero!==x.p.numero && !vistos.has(y.p.numero) && vistos.add(y.p.numero));
  if(!L.length) return '';
  return '<span class="av3904">'+m2i('warn')+'<span>La cuenta '+esc(cta)+' ya tiene proceso 3904 '+
    L.map(y=>'<b>'+esc(y.p.numero)+'</b> ('+dFmt(y.p.fCre||y.p.fSolP)+')').join(', ')+
    '. Verifica si corresponde al expediente de este recurso.</span></span>';
}
/* ================= DUPLICADOS =================
   ⛔ POSIBLE DUPLICADO (cualquiera de estas):
     · mismo ID de Mercurio (p. ej. «ID 49755»)
     · párrafo idéntico + misma cuenta, o contenido completo idéntico
     · misma cuenta y radicados con 8 días o menos de diferencia
     · mismo correo y misma cuenta, 8 días o menos
     · mismo solicitante y misma cuenta, 8 días o menos
   ⚠ CON COINCIDENCIAS: misma cuenta con más de 8 días de diferencia.
   Solo se comparan radicados cuyos responsables pertenecen a alguna ruta. */
const VENT_DUP=8;
/* cuentas genéricas: solo cuentan si el contenido es exactamente igual */
const CTAS_GENERICAS=new Set(['1234','12345','1434245','1434248']);
const normTxt=s=>sinTilde(s).replace(/^(\s*(rv|re|fw|fwd|rta|reenvio)\s*[:.]?\s+)+/,'').replace(/[^a-z0-9]+/g,' ').trim();
function parrafos(t){
  t=String(t||'').replace(/^Correo Remitente\s+\S+\s+-\s+(Asunto\s+)?/i,'').replace(/-\s*ID\s+\d+\s*-/ig,'\n').replace(/Observacion PQRs:/ig,'\n');
  return t.replace(/([.;!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9])/g,'$1\n').split(/\n+/).map(normTxt).filter(p=>p.split(' ').length>=8);
}
function clavesDup(d){
  const t=String(d.contenido||''), basura=n=>/^(\d)\1+$/.test(n)||/^0+$/.test(n);
  const ids=new Set(), pars=new Set(), ctas=new Set(), mails=new Set();
  (t.match(/\bID\s+(\d{3,})/ig)||[]).forEach(m=>ids.add(m.replace(/\D/g,'')));
  parrafos(t).forEach(p=>pars.add(p));
  (d.cuentas||[]).forEach(x=>{ const n=soloNum(x); if(n.length>=3&&!basura(n)) ctas.add(n); });
  (t.toLowerCase().match(/[\w.+-]+@[\w-]+\.[\w.]+/g)||[]).forEach(e=>{ if(!/essa\.com\.co$/.test(e)) mails.add(e); });
  const sol=canonNombre(d.solicitante||''), solOk=sol.split(' ').length>=2 && !/^(essa|api|atencion)/.test(sol);
  return {ids,pars,ctas,mails,sol:solOk?sol:''};
}
function relacionarDup(d,o,kd,ko){
  const F=new Set(), W=new Set();
  const dias=d.fSol&&o.fSol?Math.abs(difDias(d.fSol,o.fSol)):0, cerca=dias<=VENT_DUP;
  kd.ids.forEach(i=>{ if(ko.ids.has(i)) F.add('Mismo ID '+i); });
  const ctas=[...kd.ctas].filter(c=>ko.ctas.has(c));
  const mismoTxt=()=>{ const a=normTxt(d.contenido), b=normTxt(o.contenido); return a.length>=10 && a===b; };
  /* párrafo idéntico: solo cuenta si además comparten cuenta o si TODO el contenido es igual */
  let np=0; kd.pars.forEach(p=>{ if(ko.pars.has(p)) np++; });
  if(np && (mismoTxt() || ctas.some(c=>!CTAS_GENERICAS.has(c))))
    F.add(mismoTxt()?'Contenido idéntico':(np>1?np+' párrafos idénticos y misma cuenta':'Párrafo idéntico y misma cuenta'));
  ctas.forEach(c=>{
    if(CTAS_GENERICAS.has(c)){ if(mismoTxt()) F.add('Cuenta '+c+' con contenido idéntico'); return; }
    if(cerca) F.add('Misma cuenta '+c+' · '+dias+' día(s)'); else W.add('Misma cuenta '+c+' · '+dias+' días');
    if(cerca && [...kd.mails].some(m=>ko.mails.has(m))) F.add('Mismo correo y cuenta');
    if(cerca && kd.sol && kd.sol===ko.sol) F.add('Mismo solicitante y cuenta'); });
  return {F,W};
}
const usuariosRutas=()=>new Set(Object.values(RUTAS).flat());
let DUP_IDX=null;
function indiceDup(){
  if(DUP_IDX) return DUP_IDX;
  const U=usuariosRutas(), R=ALLRAD.filter(d=>!d.relleno && d.respEq && U.has(d.respEq));
  const ix=new Map(), keys=new Map(), put=(z,d)=>{ if(!ix.has(z)) ix.set(z,[]); ix.get(z).push(d); };
  R.forEach(d=>{ const k=clavesDup(d); keys.set(d,k);
    k.ids.forEach(v=>put('i:'+v,d)); k.pars.forEach(v=>put('p:'+v,d)); k.ctas.forEach(v=>put('c:'+v,d)); });
  return DUP_IDX={R,ix,keys};
}
function relacionesDe(d){
  const {ix,keys}=indiceDup(), k=keys.get(d); if(!k) return [];
  const cand=new Set();
  [...k.ids].map(v=>'i:'+v).concat([...k.pars].map(v=>'p:'+v),[...k.ctas].map(v=>'c:'+v)).forEach(z=>{
    const L=ix.get(z)||[]; if(z.startsWith('p:')&&L.length>15) return;   /* párrafos plantilla */
    L.forEach(o=>{ if(o!==d && soloNum(o.radicado)!==soloNum(d.radicado)) cand.add(o); }); });
  const out=[];
  cand.forEach(o=>{ const r=relacionarDup(d,o,k,keys.get(o)); if(r.F.size||r.W.size) out.push({o,F:r.F,W:r.W}); });
  return out;
}
/* Búsqueda manual: recorre la columna «Referencia del Documento» de todo Mercurio Trámite
   (sin filtros de ruta, usuario ni fecha) y muestra cada radicado con los mismos datos de
   Duplicados. Ignora mayúsculas y tildes. */
function pintaBusq(u){
  const th=$('tRec').querySelector('thead'), tb=$('tRec').querySelector('tbody'), q=$('dupQ').value.trim(), qn=sinTilde(q);
  const por=new Map(); ALLRAD.forEach(d=>por.set(soloNum(d.radicado),d));
  const vistos=new Set(), L=[];
  CRUDO.mer.forEach(r=>{ const ref=txt(r['Refencia del Documento']??r['Referencia del Documento']); if(!ref||!sinTilde(ref).includes(qn)) return;
    const k=soloNum(r['No. Radicado']); if(!k||vistos.has(k)) return; vistos.add(k);
    const d=por.get(k);
    L.push({rad:k, f:d&&d.fSol?d.fSol:parseFecha(r['Fecha  Radicacion']??r['Fecha Radicacion']??r['Fecha de Entrada']),
      ctas:d?(d.cuentas||[]).filter(c=>c&&c!=='0'):[], proc:d?d.procesos.map(p=>p.numero):[],
      resp:d?(d.respEq||d.responsable||''):'', gestor:txt(r['Nombre del Gestor']), ruta:txt(r['Nombre de la Ruta']),
      estado:txt(r['Estado']), ref, mio:d?d.respEq===u:equipoDe(r['Nombre del Gestor'])===u}); });
  L.sort((a,b)=>(b.f||0)-(a.f||0));
  const marca=t=>{ const i=sinTilde(t).indexOf(qn); if(i<0) return esc(t);
    const a=esc(t.slice(0,i)), b=esc(t.slice(i,i+q.length)), c=esc(t.slice(i+q.length)); return a+'<mark>'+b+'</mark>'+c; };
  $('recInfo').innerHTML='<b>'+L.length+'</b> radicado(s) de Mercurio contienen «'+esc(q)+'» · búsqueda en todos los radicados, sin importar ruta ni usuario';
  th.innerHTML='<tr><th></th><th>Radicado</th><th>Fecha</th><th>Cuenta</th><th>Proceso(s)</th><th>Responsable</th><th>Gestor Mercurio</th><th>Contenido (Mercurio)</th></tr>';
  tb.innerHTML=L.length?L.map(x=>'<tr class="'+(x.mio?'propio':'')+'"><td>'+(x.mio?'<span class="tuyoTag">'+m2i('star')+'TUYO</span>':'')+'</td>'+
    '<td class="rad">'+esc(x.rad)+'</td><td>'+dFmt(x.f)+'</td><td>'+esc(x.ctas.join(', ')||'—')+'</td>'+
    '<td>'+(x.proc.length?x.proc.map(p=>'<span class="procHL">'+esc(p)+'</span>').join(' '):'<span class="sp">Sin proceso</span>')+'</td>'+
    '<td>'+esc(x.resp||'—')+(x.resp&&!x.mio?' <span class="otroAs">otro asesor</span>':'')+'</td>'+
    '<td>'+esc(x.gestor||'—')+(x.ruta?'<div class="sp">'+esc(x.ruta)+'</div>':'')+'</td>'+
    '<td><div class="cont">'+marca(x.ref)+'</div></td></tr>').join('')
    :'<tr><td colspan="8" class="vacio">Ningún radicado de Mercurio contiene «'+esc(q)+'».</td></tr>';
  ordenable($('tRec'));
}
function pintaDup(u){
  const th=$('tRec').querySelector('thead'), tb=$('tRec').querySelector('tbody');
  th.innerHTML='';
  const mios=DATOS.filter(d=>d.respEq===u && (d.enVentana||d.vencida) && !evacuado(d));
  const L=mios.map(d=>({d,rel:relacionesDe(d)})).filter(x=>x.rel.length)
    .sort((a,b)=>(b.rel.some(r=>r.F.size)-a.rel.some(r=>r.F.size))||((a.d.fSol||0)-(b.d.fSol||0)));
  const nDup=L.filter(x=>x.rel.some(r=>r.F.size)).length;
  $('recInfo').innerHTML='<b>'+L.length+'</b> radicado(s) de '+esc(u)+' con relación a otros · <span class="estSin">'+nDup+
    ' posible(s) duplicado(s)</span> · <span class="estAlg">'+(L.length-nDup)+' con coincidencias</span>';
  const fila=(d,extra)=>'<td class="rad">'+esc(d.radicado)+'</td><td>'+dFmt(d.fSol)+'</td><td>'+esc((d.cuentas||[]).join(', ')||'—')+'</td>'+
    '<td>'+(d.nProc?d.procesos.map(p=>'<span class="procHL">'+esc(p.numero)+'</span>').join(' '):'<span class="sp">Sin proceso</span>')+'</td>'+
    '<td>'+esc(d.respEq||'—')+extra+'</td><td><div class="cont">'+esc(d.contenido||'—')+'</div></td>';
  tb.innerHTML='<tr><td style="padding:0;border:0">'+(L.length?L.map(x=>{ const dup=x.rel.some(r=>r.F.size);
    return '<div class="dupG'+(dup?' fuerte':'')+'"><div class="dupH">'+
      (dup?'<b class="nivDup">'+m2i('ban')+'Posible duplicado</b>':'<b class="nivCoi">'+m2i('warn')+'Radicado con coincidencias, valida si se encuentra duplicado</b>')+'</div>'+
      '<table><thead><tr><th></th><th>Radicado</th><th>Fecha</th><th>Cuenta</th><th>Proceso(s)</th><th>Responsable</th><th>Contenido (Mercurio)</th><th>Coincide en</th></tr></thead><tbody>'+
      '<tr class="propio"><td><span class="tuyoTag">'+m2i('star')+'TUYO</span></td>'+fila(x.d,'')+'<td></td></tr>'+
      x.rel.sort((a,b)=>b.F.size-a.F.size).map(r=>'<tr><td></td>'+fila(r.o,r.o.respEq!==u?' <span class="otroAs">otro asesor</span>':'')+
        '<td class="coinc">'+[...r.F].map(z=>'<span class="ch chF">'+esc(z)+'</span>').join('')+[...r.W].map(z=>'<span class="ch">'+esc(z)+'</span>').join('')+'</td></tr>').join('')+
      '</tbody></table></div>'; }).join(''):'<div class="vacio">No se encontraron posibles duplicados para este usuario.</div>')+'</td></tr>';
}

/* ================= REASIGNAR =================
   Sugiere la ruta correcta según tipologías (palabras clave) editables por el usuario. */
const TIPO_DEF={
  rc:['factura','facturacion','consumo','alto consumo','desviacion significativa','cobro','cobran','cobraron','solidaridad',
      'rompimiento de solidaridad','silencio administrativo','reliquidacion','refacturacion','lectura','ajuste','tarifa',
      'doble cobro','pago doble','valor facturado','consumo promedio','estrato','recuperacion de consumo'],
  rs:['recurso','reposicion','apelacion','en subsidio de apelacion','inconformidad con la respuesta','no estoy de acuerdo con la respuesta',
      'respuesta al radicado','revocar','revoque','recurso de reposicion','contra la decision','contra decision','impugno'],
  sp:['superintendencia de servicios publicos','sspd','superservicios','tutela','accion de tutela','cumplimiento sspd','juzgado','fallo de tutela','auto sspd','requerimiento sspd'],
  so:['credito somos','tarjeta somos','financiacion somos','programa somos','somos essa'],
  pq:['falla','sin servicio','interrupcion','reubicacion','traslado de poste','poste','poda','arbol','aseo','alumbrado','copia',
      'copias','certificado','certificacion','solicitud de informacion','informacion','disponibilidad','conexion','reconexion',
      'otros creditos','paz y salvo','cambio de datos','titular','solicitud de factura','copia de factura','duplicado de factura']};
const PESO={rs:3,sp:3,so:4,rc:1.5,pq:1};
const LS_TIPO='essa_tipologias';
let TIPO=lsGet(LS_TIPO,null); if(!TIPO) TIPO=JSON.parse(JSON.stringify(TIPO_DEF));
if(typeof TIPO!=='object'||!TIPO) TIPO={};
Object.keys(TIPO_DEF).forEach(k=>{ if(!Array.isArray(TIPO[k])) TIPO[k]=TIPO_DEF[k].slice(); });
TIPO=SANEA.listas(TIPO,TIPO_DEF);
const guardaTipo=()=>lsSet(LS_TIPO,TIPO);
function rutaDeUsuario(u){ const r=Object.keys(RUTAS).find(k=>RUTAS[k].includes(u))||''; return SUB_PQ.includes(r)?'pq':r; }
function clasificar(d){
  const txtD=' '+normTxt([d.contenido,(d.tramites||[]).join(' '),d.tipo].join(' '))+' ';
  const sc={}, hit={};
  Object.keys(TIPO).forEach(r=>{ sc[r]=0; hit[r]=[];
    (TIPO[r]||[]).forEach(w=>{ const n=normTxt(w); if(n && txtD.includes(' '+n+' ')){ sc[r]+=(PESO[r]||1)*(n.includes(' ')?1.5:1); hit[r].push(w); } }); });
  if(d.procesos.some(p=>String(p.codTram)==='2753')){ sc.so+=10; hit.so.push('proceso 2753'); }
  /* "aseo" u "otros créditos" dentro de una inconformidad por cobro → peticiones, no reclamos */
  if(/ aseo | otros creditos /.test(txtD)) sc.pq+=3;
  const orden=Object.keys(sc).sort((a,b)=>sc[b]-sc[a]);
  return {mejor:orden[0], sc, hit};
}
function pintaRea(u){
  const th=$('tRec').querySelector('thead'), tb=$('tRec').querySelector('tbody');
  const us=new Set([u]);
  const L=[];
  DATOS.filter(d=>us.has(d.respEq) && (d.enVentana||d.vencida) && !evacuado(d)).forEach(d=>{
    const actual=rutaDeUsuario(d.respEq), c=clasificar(d), b=c.mejor;
    if(!actual || b===actual || c.sc[b]<2.5 || c.sc[b]<=c.sc[actual]*2) return;
    if(actual==='rs' && c.sc.rs>0) return;   /* un recurso habla del tema de fondo (consumo, cobro…): sigue siendo recurso */
    L.push({d,actual,sug:b,c}); });
  L.sort((a,b)=>b.c.sc[b.sug]-a.c.sc[a.sug]);
  th.innerHTML='<tr><th>Radicado</th><th>Fecha</th><th>Cuenta</th><th>Proceso(s)</th><th>Responsable</th><th>Ruta actual</th><th>Ruta sugerida</th><th>Palabras encontradas</th><th>Contenido (Mercurio)</th></tr>';
  tb.innerHTML=L.length?L.map(x=>'<tr><td class="rad">'+esc(x.d.radicado)+'</td><td>'+dFmt(x.d.fSol)+'</td>'+
    '<td>'+esc((x.d.cuentas||[]).filter(c=>c&&c!=='0').join(', ')||x.d.cuenta||'—')+'</td>'+
    '<td>'+(x.d.nProc?x.d.procesos.map(p=>'<span class="procHL">'+esc(p.codTram+' · '+p.numero)+'</span>').join(' '):'<span class="sp">Sin proceso</span>')+'</td>'+
    '<td>'+esc(x.d.respEq)+'</td><td>'+esc(RUTAS_NOM[x.actual]||x.actual)+'</td>'+
    '<td><b class="sugR">→ '+esc(RUTAS_NOM[x.sug]||x.sug)+'</b></td>'+
    '<td>'+(x.c.hit[x.sug]||[]).slice(0,6).map(w=>'<span class="ch">'+esc(w)+'</span>').join(' ')+'</td>'+
    '<td><div class="cont">'+esc(x.d.contenido||'—')+'</div></td></tr>').join('')
    :'<tr><td colspan="9" class="vacio">No se encontraron radicados que parezcan de otra ruta.</td></tr>';
  $('recInfo').innerHTML='<b>'+L.length+'</b> radicado(s) que podrían pertenecer a otra ruta · '+esc(u)+
    ' · es una sugerencia por palabras clave, valida antes de reasignar';
  ordenable($('tRec'));
}
function pintaTip(){
  $('tipCuerpo').innerHTML='<div style="font-size:12px;color:#5C6B7D;margin-bottom:8px">Palabras o frases que identifican cada ruta. Agrega o quita para afinar las sugerencias (se guardan en este equipo).</div>'+
    '<div class="tipGrid">'+Object.keys(TIPO_DEF).map(r=>'<div class="tipCol" data-r="'+r+'"><b>'+esc(RUTAS_NOM[r]||r)+'</b><div>'+
      (TIPO[r]||[]).map((w,i)=>'<span class="rolChip">'+esc(w)+' <b data-tr="'+r+'|'+i+'">×</b></span>').join('')+'</div>'+
      '<div style="display:flex;gap:4px;margin-top:4px"><input data-ti="'+r+'" placeholder="Nueva tipología…" style="flex:1;padding:4px 7px;font-size:12px">'+
      '<button class="btn mini" data-ta="'+r+'">+</button></div></div>').join('')+'</div>'+
    '<button class="btn sec mini" id="tipReset" style="margin-top:8px">Restablecer tipologías</button>';
  const add=r=>{ const i=document.querySelector('[data-ti="'+r+'"]'), v=i.value.trim(); if(!v||TIPO[r].includes(v)) return;
    TIPO[r].push(v); guardaTipo(); pintaTip(); pintaRec(); };
  document.querySelectorAll('[data-ta]').forEach(b=>b.onclick=()=>add(b.dataset.ta));
  document.querySelectorAll('[data-ti]').forEach(i=>i.onkeydown=e=>{ if(e.key==='Enter') add(i.dataset.ti); });
  document.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{ const [r,i]=b.dataset.tr.split('|'); TIPO[r].splice(+i,1); guardaTipo(); pintaTip(); pintaRec(); });
  $('tipReset').onclick=()=>{ TIPO=JSON.parse(JSON.stringify(TIPO_DEF)); guardaTipo(); pintaTip(); pintaRec(); };
}
/* ---- Ruta especializada: plazo de 10 días hábiles ---- */
function venceEn(recibo,n){ if(!recibo) return null; let d=aDiaHabil(recibo),k=1; while(k<n){ d=addD(d,1); if(esHabil(d)) k++; } return d; }
function habilesEntre(a,b){ let n=0,s=a<=b?1:-1,x=new Date(a); while(clave(x)!==clave(b)){ x=addD(x,s); if(esHabil(x)) n+=s; } return n; }
function pintaVen(u){
  const th=$('tRec').querySelector('thead'), tb=$('tRec').querySelector('tbody');
  const L=DATOS.filter(d=>d.respEq===u && d.dia!==null && !evacuado(d))
    .map(d=>{ const v=venceEn(d.fEfe,PLAZO_ES); return {d,v,r:v?habilesEntre(HOY,v):null}; })
    .sort((a,b)=>(a.r??99)-(b.r??99));
  const nv=L.filter(x=>x.r!==null&&x.r<0).length, nh=L.filter(x=>x.r===0).length;
  th.innerHTML='<tr><th>Radicado</th><th>Cuenta</th><th>Proceso(s)</th><th>F. recibo</th><th>Día</th><th>Vence (10 días háb.)</th><th>Días háb. restantes</th><th>Estado</th></tr>';
  tb.innerHTML=L.length?L.map(x=>{ const est=x.r<0?'<span class="badge b-r">Vencido</span>':x.r===0?'<span class="badge b-n">Vence hoy</span>':x.r<=2?'<span class="badge b-a">Próximo</span>':'<span class="badge b-v">En plazo</span>';
    return '<tr><td class="rad">'+esc(x.d.radicado)+'</td><td>'+esc(x.d.cuenta||'—')+'</td>'+
      '<td>'+(x.d.nProc?x.d.procesos.map(p=>'<span class="procHL">'+esc(p.numero)+'</span>').join(' '):'<span class="sp">Sin proceso</span>')+'</td>'+
      '<td>'+dFmt(x.d.fEfe)+'</td><td>Día '+x.d.dia+'</td><td><b>'+dFmt(x.v)+'</b></td><td class="num">'+(x.r??'—')+'</td><td>'+est+'</td></tr>'; }).join('')
    :'<tr><td colspan="8" class="vacio">Sin radicados para este usuario.</td></tr>';
  $('recInfo').innerHTML='Plazo de respuesta de la ruta especializada: <b>'+PLAZO_ES+' días hábiles</b> · '+L.length+' radicado(s) · '+
    '<span class="estSin">'+nv+' vencido(s)</span> · <span class="estAlg">'+nh+' vence(n) hoy</span>';
  ordenable($('tRec'));
}
/* El botón de tipologías solo lo ve JAIRO CHAVES MALAVER y solo en la pestaña Reasignar */
const ADMIN_TIPOLOGIAS='JAIRO CHAVES MALAVER';
function usuarioActivo(){ return equipoDe(USUARIO_FIJO||valorResp()||NOMBRE_FIRMANTE||'')||''; }
function visibilidadTipologias(){
  const ok = SUBREC==='rea' && canonNombre(usuarioActivo())===canonNombre(ADMIN_TIPOLOGIAS);
  $('tipBtn').style.display = ok ? '' : 'none';
  if(!ok) $('tipBox').classList.remove('on');
}
function pintaRec(){
  const u=$('recUsr').value, th=$('tRec').querySelector('thead'), tb=$('tRec').querySelector('tbody');
  visibilidadTipologias();          /* antes de cualquier salida temprana */
  $('expBar').style.display = SUBREC==='exp'?'':'none';
  if(!ALLPROC.length){ th.innerHTML=''; tb.innerHTML='<tr><td class="vacio">Carga SAC Trámite y Mercurio Trámite en Recursos.</td></tr>'; $('recInfo').textContent=''; return; }
  if(!u){ th.innerHTML=''; $('recInfo').textContent='';
    tb.innerHTML='<tr><td class="vacio">La ruta <b>'+esc(RUTAS_NOM[RUTA])+'</b> está creada pero aún no tiene usuarios. Usa «✎ Editar ruta» para agregarlos.</td></tr>'; return; }
  $('dupBar').style.display = SUBREC==='dup'?'':'none';      /* antes se actualizaba después de la vista «Vencimientos» y la búsqueda manual quedaba visible sin servir */
  if(SUBREC==='ven'){ pintaVen(u); return; }
  if(SUBREC==='dup'){ if(sinTilde($('dupQ').value).length>=3) pintaBusq(u); else pintaDup(u); return; }
  if(SUBREC==='rea'){ pintaRea(u); return; }
  let L=procesosDe(u);
  if(SUBREC==='band'){
    L.sort((a,b)=>(a.p.fVto||0)-(b.p.fVto||0));
    th.innerHTML='<tr><th>Proceso</th><th>Radicado</th><th>Trámite</th><th>F. creación</th><th>F. vencimiento</th><th>Última acción</th><th>Tipo respuesta</th><th>Origen</th></tr>';
    tb.innerHTML=L.length?L.map(x=>{ const dd=x.p.fVto?difDias(x.p.fVto,HOY):null;
      const vc=dd==null?'':dd<0?' class="vtoPas"':dd===0?' class="vtoHoy"':'';
      return '<tr><td class="rad">'+esc(x.p.numero)+'</td><td>'+esc(x.d.radicado)+'</td><td>'+esc(x.p.codTram||'—')+'</td>'+
        '<td>'+dFmt(x.p.fCre||x.p.fSolP)+'</td><td><span'+vc+'>'+dFmt(x.p.fVto)+'</span></td>'+
        '<td>'+esc(x.p.ultimaAccion||'—')+'</td><td>'+esc(x.p.tipoResp||'—')+'</td>'+
        '<td>'+(x.cre===u?'Creado por el usuario':'')+(x.cre!==u&&x.ges===u?'Bandeja Mercurio':'')+
          (x.cre===u&&x.ges&&x.ges!==u?' <span class="notaMer">En Mercurio: '+esc(x.ges)+'</span>':'')+'</td></tr>'; }).join('')
      :'<tr><td colspan="8" class="vacio">Sin procesos en la bandeja de este usuario.</td></tr>';
    $('recInfo').innerHTML='<b>'+nfmt(L.length)+'</b> proceso(s) en SAC para '+esc(u)+' · clic en un encabezado para ordenar';
    ordenable($('tRec')); return;
  }
  /* ---- expedientes: 39xx con cierre Confirma o Modifica ---- */
  const cz=$('expCierre').value, fe=$('expEst').value;
  L=L.filter(x=>/^39/.test(x.p.codTram||''));
  /* opciones de cierre: todos los TIPO_RESPUESTA presentes en los 39xx */
  const tipos=[...new Set(ALLPROC.filter(x=>/^39/.test(x.p.codTram||'')).map(x=>x.p.tipoResp||'Sin respuesta'))].sort((a,b)=>a.localeCompare(b,'es'));
  $('expCierre').innerHTML='<option value="">Confirma y Modifica</option><option value="__todos">Todos los cierres</option>'+
    tipos.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');
  $('expCierre').value=[...$('expCierre').options].some(o=>o.value===cz)?cz:'';
  const cz2=$('expCierre').value;
  if(!cz2) L=L.filter(x=>/^(confirma|modifica)/.test(sinTilde(x.p.tipoResp)));
  else if(cz2!=='__todos') L=L.filter(x=>(x.p.tipoResp||'Sin respuesta')===cz2);
  if(fe) L=L.filter(x=>{ const e=(EXP[x.p.numero]||{}).est||''; return fe==='__n'?!e:e===fe; });
  /* evacuados: salen de la lista; con el enlace se ven aparte, con opción de restaurar */
  const nEv=procesosDe(u).filter(x=>/^39/.test(x.p.codTram||'')&&(EXP[x.p.numero]||{}).ev).length;
  $('expEvLnk').textContent=EXP_VER_EV?'← Volver a los expedientes':'Expedientes evacuados ('+nEv+')';
  $('expEvLnk').classList.toggle('on',EXP_VER_EV);
  if(EXP_VER_EV){ L=procesosDe(u).filter(x=>/^39/.test(x.p.codTram||'')&&(EXP[x.p.numero]||{}).ev); }
  else L=L.filter(x=>!(EXP[x.p.numero]||{}).ev);
  th.innerHTML='<tr><th style="width:30px"></th><th>Proceso</th><th>Recurso No.</th><th>Trámite</th><th>Medio</th><th>F. creación</th><th>F. vencim.</th><th>Fecha estimada aviso</th><th>Cierre</th><th>Estado expediente</th><th>¿Hace falta algo?</th><th>'+(EXP_VER_EV?'Evacuado el':'Evacuar')+'</th></tr>';
  tb.innerHTML=L.length?L.map(x=>{ const e=EXP[x.p.numero]||{}, col=e.c||'';
    const cls=e.est==='Completo'?'estCom':e.est==='Con algunos documentos'?'estAlg':e.est==='Sin documentos'?'estSin':'';
    return '<tr class="'+(col?'marcada':'')+'"'+(col?' style="--mk:'+col+';--mkbg:'+rgba(col,.13)+';--mkbg2:'+rgba(col,.22)+'"':'')+'>'+
      '<td><span class="dot'+(col?'':' vacio')+'" data-xc="'+esc(x.p.numero)+'"'+(col?' style="background:'+col+';border-color:'+col+'"':'')+'></span></td>'+
      '<td class="rad">'+esc(x.p.numero)+'</td><td>'+esc(x.d.radicado)+'</td><td>'+esc(x.p.codTram||'—')+'</td>'+
      '<td>'+medioRec(x)+'</td><td>'+dFmt(x.p.fCre||x.p.fSolP)+'</td><td>'+dFmt(x.p.fVto)+'</td><td>'+fechaAviso(x)+'</td><td><b>'+esc(x.p.tipoResp||'—')+'</b>'+aviso3904(x)+'</td>'+
      '<td><select data-xe="'+esc(x.p.numero)+'" class="'+cls+'"><option value="">— Seleccionar —</option>'+
        ['Sin documentos','Con algunos documentos','Completo'].map(o=>'<option'+(e.est===o?' selected':'')+'>'+o+'</option>').join('')+'</select></td>'+
      '<td data-xcel="'+esc(x.p.numero)+'">'+celdaNota(x.p.numero,e.n||'',false)+'</td>'+
      (EXP_VER_EV?'<td style="white-space:nowrap">'+(e.ev?e.ev.split('-').reverse().join('/'):'—')+'<br><button class="btnFila" data-xr="'+esc(x.p.numero)+'" type="button">'+m2i('undo')+'Restaurar</button></td>'
                 :'<td style="text-align:center"><label class="chkEvLbl"><input type="checkbox" class="chkEv" data-xv="'+esc(x.p.numero)+'"> Evacuar</label></td>')+'</tr>'; }).join('')
    :'<tr><td colspan="13" class="vacio">'+(EXP_VER_EV?'No hay expedientes evacuados.':'Sin expedientes 39xx con ese cierre para este usuario.')+'</td></tr>';

  const cnt=k=>L.filter(x=>(EXP[x.p.numero]||{}).est===k).length;
  $('recInfo').innerHTML='<b>'+nfmt(L.length)+'</b> expediente(s) · <span class="estCom">'+cnt('Completo')+' completos</span> · <span class="estAlg">'+
    cnt('Con algunos documentos')+' con algunos</span> · <span class="estSin">'+cnt('Sin documentos')+' sin documentos</span>';
  ordenable($('tRec'));
  const guarda=(k,f)=>{ EXP[k]=Object.assign(EXP[k]||{},f); lsSet(LS_EXP,EXP); };
  tb.querySelectorAll('[data-xe]').forEach(s=>s.onchange=()=>{ guarda(s.dataset.xe,{est:s.value}); pintaRec(); });
  tb.querySelectorAll('.chkEvLbl').forEach(l=>l.onclick=e=>e.stopPropagation());
  tb.querySelectorAll('[data-xv]').forEach(ch=>ch.onchange=()=>{ const k=ch.dataset.xv;
    confirmar('Evacuar expediente','¿Confirmas que el expediente del proceso <b>'+esc(k)+'</b> ya fue gestionado y quieres sacarlo de la lista? '+
      'Conserva su estado, notas y color. Podrás restaurarlo desde «Expedientes evacuados».',
      ()=>{ guarda(k,{ev:clave(HOY)}); pintaRec(); },()=>{ ch.checked=false; }); });
  tb.querySelectorAll('[data-xr]').forEach(b=>b.onclick=()=>{ const k=b.dataset.xr; if(EXP[k]){ delete EXP[k].ev; lsSet(LS_EXP,EXP); } pintaRec(); });
  /* nota: modo lectura (fija) <-> modo edición (cajón que crece) */
  const activar=td=>{
    const k=td.dataset.xcel;
    td.querySelectorAll('[data-xed]').forEach(b=>b.onclick=()=>{ td.innerHTML=celdaNota(k,(EXP[k]||{}).n||'',true); activar(td);
      const ta=td.querySelector('textarea'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); });
    const ta=td.querySelector('textarea'); if(!ta) return;
    const crece=()=>{ ta.style.height='auto'; ta.style.height=(ta.scrollHeight+2)+'px'; };
    ta.addEventListener('input',crece); crece();
    td.querySelector('[data-xg]').onclick=()=>{ guarda(k,{n:ta.value.trim()}); td.innerHTML=celdaNota(k,ta.value.trim(),false); activar(td); };
    const c=td.querySelector('[data-xcan]'); if(c) c.onclick=()=>{ td.innerHTML=celdaNota(k,(EXP[k]||{}).n||'',false); activar(td); };
  };
  tb.querySelectorAll('[data-xcel]').forEach(activar);
  tb.querySelectorAll('[data-xc]').forEach(el=>el.onclick=ev=>{ ev.stopPropagation();
    document.querySelectorAll('.pal').forEach(p=>p.remove());
    const p=document.createElement('div'); p.className='pal';
    p.innerHTML=CFG.colores.map(c=>'<span class="dot" data-c="'+c+'" style="background:'+c+';border-color:'+c+'"></span>').join('')+
      '<span class="dot vacio" data-c=""></span>';
    document.body.appendChild(p); const r=el.getBoundingClientRect();
    p.style.left=(r.left+window.scrollX)+'px'; p.style.top=(r.bottom+window.scrollY+5)+'px';
    p.querySelectorAll('.dot').forEach(o=>o.onclick=e2=>{ e2.stopPropagation(); guarda(el.dataset.xc,{c:o.dataset.c}); p.remove(); pintaRec(); });
    setTimeout(()=>document.addEventListener('click',()=>p.remove(),{once:true}),0);
  });
}
document.querySelectorAll('#mRec .tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('#mRec .tab').forEach(x=>x.classList.toggle('on',x===t));
  cambiaRuta(t.dataset.t);
});
function cambiaRuta(r){
  RUTA=r; ROL=RUTAS[RUTA];
  if((SUBREC==='exp'&&RUTA!=='rs')||(SUBREC==='ven'&&RUTA!=='es')){ SUBREC=RUTA==='es'?'ven':'dup';
    document.querySelectorAll('#mRec .subtab button').forEach(x=>x.classList.toggle('on',x.dataset.s===SUBREC)); }
  pintaRol(); pintaRec();
}
$('subRuta').querySelectorAll('button').forEach(b=>b.onclick=()=>cambiaRuta(b.dataset.r));
document.querySelectorAll('#mRec .subtab button').forEach(b=>b.onclick=()=>{
  SUBREC=b.dataset.s; document.querySelectorAll('#mRec .subtab button').forEach(x=>{ x.classList.toggle('on',x===b); x.setAttribute('aria-pressed',String(x===b)); }); pintaRec(); });
['recUsr','expCierre','expEst'].forEach(i=>$(i).addEventListener('change',pintaRec));
let _tDupQ=null;
$('dupQ').addEventListener('input',()=>{ clearTimeout(_tDupQ); _tDupQ=setTimeout(()=>pintaRec(),250); });
$('dupQLimp').onclick=()=>{ $('dupQ').value=''; pintaRec(); };
$('expEvLnk').onclick=()=>{ EXP_VER_EV=!EXP_VER_EV; pintaRec(); };
$('tipBtn').onclick=()=>{ const b=$('tipBox'); b.classList.toggle('on'); if(b.classList.contains('on')) pintaTip(); };
$('lnkRec').onclick=e=>{ e.preventDefault(); pintaRol(); pintaRec(); $('mRec').classList.add('on'); };
$('recX').onclick=()=>$('mRec').classList.remove('on');
$('mRec').onclick=e=>{ if(e.target===$('mRec')) $('mRec').classList.remove('on'); };


/* Solo presentación («Rutas»): la tabla ocupa el alto que le queda en la ventana (mínimo 300 px); si no cabe, se desplaza la ventana completa. */
(function(){
  const m=document.getElementById('mRec'), bd=m.querySelector('.mbody'), pn=m.querySelector('.rtPanel'), rs=m.querySelector('.recScroll');
  let raf=0;
  function ajusta(){
    raf=0; if(!m.classList.contains('on')) return;
    rs.style.maxHeight='none';
    const top=rs.getBoundingClientRect().top-bd.getBoundingClientRect().top+bd.scrollTop;
    const pie=parseFloat(getComputedStyle(rs).marginBottom)+parseFloat(getComputedStyle(pn).borderBottomWidth)+parseFloat(getComputedStyle(bd).paddingBottom);
    rs.style.maxHeight=Math.max(300,Math.floor(bd.clientHeight-top-pie))+'px';
  }
  const agenda=()=>{ if(!raf) raf=requestAnimationFrame(ajusta); };
  new MutationObserver(r=>{ if(r.every(x=>x.target===rs&&x.attributeName==='style')) return; agenda(); })
    .observe(m,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  addEventListener('resize',agenda);
})();
/* ================= VENCEN HOY ================= */
/* procesos que vencen hoy para un usuario (o todo el equipo si u='') */
function procHoy(u){
  const hoyK=clave(HOY), vistos=new Set();
  return ALLPROC.filter(x=>(u?(x.cre===u||x.ges===u):(x.cre||x.ges)) && x.p.fVto && clave(x.p.fVto)===hoyK &&
    !vistos.has(x.p.numero) && vistos.add(x.p.numero));
}
function usuarioHoyDef(estricto){
  const eq=claveResponsable(USUARIO_FIJO||valorResp());
  const u=CFG.equipo.find(x=>canonNombre(x)===eq);
  return u || (estricto?'':($('hoyUsr').value||CFG.equipo[0]));
}
function pintaHoy(){
  const u=$('hoyUsr').value, hoyK=clave(HOY), tb=$('tHoy').querySelector('tbody'), ver=$('hoyVer').value;
  if(!ALLPROC.length){ tb.innerHTML='<tr><td colspan="9" class="vacio">Carga SAC Trámite y Mercurio Trámite en Recursos.</td></tr>'; return; }
  const vistos=new Set();
  let L=ALLPROC.filter(x=>(x.cre===u||x.ges===u) && x.p.fVto && clave(x.p.fVto)===hoyK && !vistos.has(x.p.numero) && vistos.add(x.p.numero));
  const hecho=x=>!!CHK[hoyK+'|'+x.p.numero];
  const n=L.length, g=L.filter(hecho).length;
  $('hoyProg').textContent=g+' de '+n+' gestionados'+(n?' · '+Math.round(g/n*100)+'%':'');
  $('hoyBar').style.width=(n?g/n*100:0)+'%';
  $('hoySub').textContent='Vencen el '+dFmt(HOY)+' · creados en SAC por '+u+' o a su cargo en Mercurio';
  if(ver) L=L.filter(x=>ver==='h'?hecho(x):!hecho(x));
  L.sort((a,b)=>hecho(a)-hecho(b));
  tb.innerHTML=L.length?L.map(x=>{ const ok=hecho(x), otra=x.ges && x.ges!==u;
    return '<tr class="'+(ok?'hecho':'')+'"><td style="text-align:center"><input type="checkbox" class="chkEv" data-h="'+esc(x.p.numero)+'"'+(ok?' checked':'')+'></td>'+
      '<td><span class="procHL">'+esc(x.p.numero)+'</span></td><td>'+esc(x.d.radicado)+'</td><td>'+esc(x.p.cuenta||x.d.cuenta||'—')+'</td><td>'+esc(x.p.codTram||'—')+'</td>'+
      '<td>'+dFmt(x.p.fCre||x.p.fSolP)+'</td><td><span class="vtoHoy">'+dFmt(x.p.fVto)+'</span></td>'+
      '<td>'+esc(x.p.ultimaAccion||'—')+'</td><td>'+esc(x.cre||x.p.creador||'—')+'</td>'+
      '<td>'+(x.ges?esc(x.ges):'<span class="sp">Sin radicado en Mercurio</span>')+
      (otra?'<br><span class="notaMer">'+m2i('warn')+'En Mercurio de otra persona</span>':'')+'</td></tr>'; }).join('')
    :'<tr><td colspan="10" class="vacio">'+(n?'Sin procesos en esta vista.':'No hay procesos de este usuario que venzan hoy.')+'</td></tr>';
  tb.querySelectorAll('[data-h]').forEach(c=>c.onchange=()=>{ const k=hoyK+'|'+c.dataset.h;
    if(c.checked) CHK[k]=1; else delete CHK[k];
    Object.keys(CHK).forEach(x=>{ if(!x.startsWith(hoyK)) delete CHK[x]; }); lsSet(LS_HOY,CHK); pintaHoy(); render(); });
  ordenable($('tHoy'));
}
function abrirHoy(){
  const def=usuarioHoyDef(false);
  $('hoyUsr').innerHTML=CFG.equipo.map(u=>'<option>'+esc(u)+'</option>').join(''); $('hoyUsr').value=def;
  pintaHoy(); $('mHoy').classList.add('on'); }
['hoyUsr','hoyVer'].forEach(i=>$(i).addEventListener('change',pintaHoy));
$('hoyX').onclick=()=>$('mHoy').classList.remove('on');
$('mHoy').onclick=e=>{ if(e.target===$('mHoy')) $('mHoy').classList.remove('on'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ $('mRec').classList.remove('on'); $('mHoy').classList.remove('on'); } });
/* ================= CONSULTAS ================= */
/* "Consulta a realizar" = nota del radicado (la misma de «Notas» en Radicados del día).
   "Observaciones del profesional" y la evacuación son propias de este módulo:
   evacuar aquí NO saca el radicado del cuadro de mando. */
const LS_CONS='essa_consultas';
let CONS=SANEA.cons(lsGet(LS_CONS,{}));
const guardaCons=()=>lsSet(LS_CONS,CONS);
/* migración única: antes toda nota era consulta. Se marcan como activas las que existían,
   para que no desaparezca nada de la ventana Consultas al actualizar. */
if(!appDataGet('essa_mig_cons_act')){
  Object.keys(MARCAS).forEach(k=>{ if(MARCAS[k]&&MARCAS[k].nota){ CONS[k]=CONS[k]||{}; if(!CONS[k].ev) CONS[k].act=1; } });
  Object.keys(CONS).forEach(k=>{ if(CONS[k]&&CONS[k].obs&&!CONS[k].ev) CONS[k].act=1; });
  lsSet(LS_CONS,CONS); try{ appDataSet('essa_mig_cons_act','1'); }catch(e){}
}
function fotoCons(d){
  return {r:d.radicado, fr:d.fSol?clave(d.fSol):'', fv:d.fVto?clave(d.fVto):'', cta:d.cuenta||'', pr:d.procesos.map(p=>p.numero),
    cont:d.contenido||'', dia:d.dia||null, sol:d.solicitante||'', tram:(d.tramites||[]).join(' · '), resp:d.respEq||d.responsable||''};
}
/* Garantiza la forma completa de una foto (datos guardados de versiones anteriores o incompletos). */
function normFoto(f,k){
  f=(f&&typeof f==='object'&&!Array.isArray(f))?f:{};
  const s=v=>v==null?'':String(v);
  return {r:s(f.r||k), fr:s(f.fr), fv:s(f.fv), cta:s(f.cta), pr:Array.isArray(f.pr)?f.pr.map(s).filter(Boolean):[],
    cont:s(f.cont), dia:f.dia==null?null:f.dia, sol:s(f.sol), tram:s(f.tram), resp:s(f.resp)};
}
/* Une una foto nueva con la guardada sin perder datos: un campo vacío nunca reemplaza uno con valor. */
function mezclaFoto(vieja,nueva){
  const o=Object.assign({},vieja||{});
  Object.keys(nueva||{}).forEach(k=>{ const v=nueva[k]; if(v!==''&&v!=null&&!(Array.isArray(v)&&!v.length)) o[k]=v; });
  return o;
}
/* Mientras el radicado siga en los Excel, refresca la foto de toda consulta (activa o anterior),
   para que conserve sus datos cuando el SAC deje de traerlo. Recupera fechas faltantes del Histórico. */
function refrescaFotosCons(){
  const por=new Map(); (ALLRAD.length?ALLRAD:DATOS).forEach(d=>por.set(claveR(d),d));
  const histPorRad={}; Object.values(typeof HIST==='object'&&HIST?HIST:{}).forEach(e=>{ if(e&&e.r) histPorRad[soloNum(e.r)]=e; });
  let cambio=false;
  Object.keys(CONS).forEach(k=>{ const c=CONS[k]; if(!c||typeof c!=='object') return;
    const d=por.get(k); let f=normFoto(c.f,k);
    if(d) f=mezclaFoto(f,fotoCons(d));
    const he=histPorRad[soloNum(f.r||k)]||(f.pr||[]).map(p=>HIST&&HIST[p]).find(Boolean);
    if(he) f=mezclaFoto({fr:he.fr,fv:he.fv,cta:he.c,pr:[he.p],r:he.r},f);
    f=normFoto(f,k);
    if(JSON.stringify(f)!==JSON.stringify(c.f||{})){ c.f=f; cambio=true; } });
  if(cambio) guardaCons();
}
function listaCons(){
  const out=[], vistos=new Set();
  DATOS.forEach(d=>{ const k=claveR(d), c=CONS[k]||{};
    if(c.act && !c.ev){ vistos.add(k); out.push({k,d,f:normFoto(mezclaFoto(c.f,fotoCons(d)),k)}); } });
  /* consultas cuyo radicado ya no viene en los Excel: se muestran con la última foto guardada */
  Object.keys(CONS).forEach(k=>{ const c=CONS[k]; if(!c||typeof c!=='object'||vistos.has(k)||c.ev||!c.act) return;
    out.push({k,d:null,f:normFoto(c.f,k)}); });
  return out;
}
function pintaCons(){
  const tb=$('tCons').querySelector('tbody'), L=listaCons();
  $('consSub').textContent=L.length+' consulta(s) activa(s) · se guardan en este equipo';
  tb.innerHTML=L.length?L.map((x,i)=>{ const mk=MARCAS[x.k]||{}, col=mk.color||'', c=CONS[x.k]||{}, f=x.f;
    return '<tr class="'+(col?'marcada':'')+'"'+(col?' style="--mk:'+col+';--mkbg:'+rgba(col,.13)+';--mkbg2:'+rgba(col,.22)+'"':'')+'>'+
      '<td>'+(x.d?'<span class="dot'+(col?'':' vacio')+'" data-cc="'+i+'"'+(col?' style="background:'+col+';border-color:'+col+'"':'')+'></span>':'')+'</td>'+
      '<td class="rad">'+esc(f.r)+'</td><td>'+esc(f.cta||'—')+'</td>'+
      '<td>'+((f.pr||[]).length?f.pr.map(p=>'<span class="procHL">'+esc(p)+'</span>').join(' '):'<span class="sp">Sin proceso en SAC</span>')+'</td>'+
      '<td>'+(x.d&&x.d.dia?'Día '+x.d.dia:'<span class="sp">—</span>')+'</td>'+
      '<td><div class="txtLargo">'+(f.cont?esc(f.cont):'<span class="sp">Sin contenido en Mercurio</span>')+'</div></td>'+
      '<td data-cx="'+i+'|n">'+celdaTxt(mk.nota||'',false,'Qué se debe consultar…')+'</td>'+
      '<td data-cx="'+i+'|o">'+celdaTxt(c.obs||'',false,'Respuesta u observación del profesional…')+'</td>'+
      '<td style="text-align:center"><label class="chkEvLbl"><input type="checkbox" class="chkEv" data-ce="'+i+'"> Evacuar</label><br>'+
        '<button class="btnQuitar" data-cq="'+i+'" title="Advertencia: la consulta y las observaciones del profesional se eliminarán completamente y ya no las volverás a ver (no pasan a Consultas anteriores).">'+
        '<span class="icoAdv">'+M2I(M2P.warn)+'</span> Quitar</button></td></tr>'; }).join('')
    :'<tr><td colspan="9" class="vacio">No hay consultas activas. En «Radicados del día» abre la nota de un radicado y pulsa «Agregar a consultas».</td></tr>';
  const valor=(k,t)=>t==='n'?((MARCAS[k]||{}).nota||''):((CONS[k]||{}).obs||'');
  const guardaVal=(x,t,v)=>{ const k=x.k;
    if(t==='n'){ MARCAS[k]=MARCAS[k]||{}; if(v) MARCAS[k].nota=v; else delete MARCAS[k].nota;
      if(!MARCAS[k].color&&!MARCAS[k].nota) delete MARCAS[k]; guardaMarcas(); pintaRadicados(); }
    else { CONS[k]=CONS[k]||{}; if(v) CONS[k].obs=v; else delete CONS[k].obs; CONS[k].f=x.f; guardaCons(); } };
  const ph={n:'Qué se debe consultar…',o:'Respuesta u observación del profesional…'};
  const activar=td=>{ const [i,t]=td.dataset.cx.split('|'), x=L[+i];
    td.querySelectorAll('[data-xed]').forEach(b=>b.onclick=()=>{ td.innerHTML=celdaTxt(valor(x.k,t),true,ph[t]); activar(td);
      const ta=td.querySelector('textarea'); ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); });
    const ta=td.querySelector('textarea'); if(!ta) return;
    const crece=()=>{ ta.style.height='auto'; ta.style.height=(ta.scrollHeight+2)+'px'; };
    ta.addEventListener('input',crece); crece();
    td.querySelector('[data-xg]').onclick=()=>{ const v=ta.value.trim(); guardaVal(x,t,v);
      if(!valor(x.k,'n')&&!valor(x.k,'o')){ pintaCons(); return; }
      td.innerHTML=celdaTxt(v,false,ph[t]); activar(td); };
    td.querySelector('[data-xcan]').onclick=()=>{ td.innerHTML=celdaTxt(valor(x.k,t),false,ph[t]); activar(td); };
  };
  tb.querySelectorAll('[data-cx]').forEach(activar);
  tb.querySelectorAll('[data-cq]').forEach(b=>b.onclick=()=>{ const x=L[+b.dataset.cq];
    confirmar('Quitar consulta','¿Quitar el radicado <b>'+esc(x.f.r)+'</b> de la lista de consultas? Se borran las observaciones del profesional '+
      'y <b>no</b> pasa a «Consultas anteriores». Su nota se conserva como recordatorio en «Radicados del día».',
      ()=>{ delete CONS[x.k]; guardaCons(); pintaRadicados(); pintaCons(); },
      ()=>{}); });
  tb.querySelectorAll('[data-cc]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); paleta(el,L[+el.dataset.cc].d); });
  tb.querySelectorAll('.chkEvLbl').forEach(l=>l.onclick=e=>e.stopPropagation());
  tb.querySelectorAll('[data-ce]').forEach(ch=>ch.onchange=()=>{ const x=L[+ch.dataset.ce];
    confirmar('Evacuar consulta','¿Confirmas que la consulta del radicado <b>'+esc(x.f.r)+'</b> ya fue atendida? '+
      'Pasará a «Consultas anteriores». El radicado <b>sigue</b> en el cuadro de mando.',
      ()=>{ const k=x.k, n=(MARCAS[k]||{}).nota||'', o=(CONS[k]||{}).obs||'';
        CONS[k]=Object.assign(CONS[k]||{},{ev:clave(HOY),f:mezclaFoto((CONS[k]||{}).f,x.f),cons:n,obs:o}); guardaCons(); pintaCons(); },
      ()=>{ ch.checked=false; }); });
}
/* confirmación genérica reutilizando la ventana de evacuar */
function confirmar(tit,html,si,no){
  $('confTit').textContent=tit; $('confTxt').innerHTML=html;
  confPersonaliza({tone:'warn',icon:'warn'});
  CONF_NO=no; CONF_OK=si; abreConf('no');
}
function pintaConsAnt(){
  const tb=$('tConsAnt').querySelector('tbody');
  const ks=Object.keys(CONS).filter(k=>CONS[k]&&typeof CONS[k]==='object'&&CONS[k].ev).sort((a,b)=>String(CONS[b].ev).localeCompare(String(CONS[a].ev)));
  $('consAntSub').textContent=ks.length+' consulta(s) atendida(s) · solo lectura';
  tb.innerHTML=ks.length?ks.map(k=>{ const c=CONS[k], f=normFoto(c.f,k);
    const d=DATOS.find(x=>claveR(x)===k), fr=f.fr||(d&&d.fSol?clave(d.fSol):''), cons=c.cons||(MARCAS[k]||{}).nota||'';
    return '<tr><td class="rad">'+esc(f.r)+'</td><td>'+(fr?fr.split('-').reverse().join('/'):'—')+'</td><td>'+esc(f.cta||'—')+'</td>'+
      '<td>'+((f.pr||[]).length?f.pr.map(p=>'<span class="procHL">'+esc(p)+'</span>').join(' '):'<span class="sp">Sin proceso</span>')+'</td>'+
      '<td><div class="txtLargo">'+(f.cont?esc(f.cont):'<span class="sp">—</span>')+'</div></td>'+
      '<td><div class="roTxt">'+esc(cons||'—')+'</div></td>'+
      '<td><div class="roTxt">'+esc(c.obs||'—')+'</div></td>'+
      '<td>'+String(c.ev).split('-').reverse().join('/')+'</td>'+
      '<td class="accAnt"><button class="btnFila" data-back="'+esc(k)+'" type="button">'+m2i('undo')+'Reactivar consulta</button>'+
        '<button class="btnElim" data-del="'+esc(k)+'" title="Advertencia: la consulta se eliminará completamente y ya no la volverás a ver.">'+
        '<span class="icoAdv">'+M2I(M2P.warn)+'</span> Eliminar</button></td></tr>'; }).join('')
    :'<tr><td colspan="9" class="vacio">No hay consultas anteriores.</td></tr>';
  tb.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ const k=b.dataset.del, f=(CONS[k]||{}).f||{};
    confirmar('Eliminar consulta','<span class="icoAdv">'+M2I(M2P.warn)+'</span> La consulta del radicado <b>'+esc(f.r||k)+'</b> se <b>eliminará completamente</b> '+
      'de Consultas anteriores y ya no la volverás a ver. Esta acción no se puede deshacer.',
      ()=>{ delete CONS[k]; guardaCons(); pintaConsAnt(); },()=>{}); });
  tb.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{ const k=b.dataset.back, c=CONS[k];
    if(c.cons && !(MARCAS[k]||{}).nota){ MARCAS[k]=MARCAS[k]||{}; MARCAS[k].nota=c.cons; guardaMarcas(); }
    delete c.ev; delete c.cons; c.act=1; guardaCons(); pintaConsAnt(); pintaRadicados(); });
}
$('btnCons').onclick=()=>{ if(!DATOS.length&&!Object.keys(CONS).length){ alert('Primero carga los archivos.'); return; } pintaCons(); $('mCons').classList.add('on'); };
$('consIrAnt').onclick=()=>{ $('mCons').classList.remove('on'); pintaConsAnt(); $('mConsAnt').classList.add('on'); };
$('consX').onclick=()=>$('mCons').classList.remove('on');
$('consAntX').onclick=()=>$('mConsAnt').classList.remove('on');
$('consVolver').onclick=()=>{ $('mConsAnt').classList.remove('on'); pintaCons(); $('mCons').classList.add('on'); };
['mCons','mConsAnt'].forEach(id=>$(id).onclick=e=>{ if(e.target===$(id)) $(id).classList.remove('on'); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ $('mCons').classList.remove('on'); $('mConsAnt').classList.remove('on'); } });
/* ================= MANTENIMIENTO =================
   Con el uso diario se acumulan registros de radicados que ya no vienen en los
   Excel (cerrados). Para que la herramienta no se vuelva lenta ni llene el
   almacenamiento del navegador:
   · cada registro guarda la fecha en que se vio por última vez (vis);
   · solo se depura cuando están cargados AMBOS archivos (si falta uno, la
     ausencia de un radicado no significa que esté cerrado);
   · nunca se borran notas de consulta activas ni consultas anteriores recientes. */
const RETENER={evac:45, marcaColor:45, expediente:120, ajuste:60, consAnt:365, cal:730};
function edadDias(f){ if(!f) return 0; const p=String(f).split('-'); return difDias(HOY,new Date(+p[0],+p[1]-1,+p[2])); }
function mantenimiento(manual){
  if(!CRUDO.sac.length || !CRUDO.mer.length){ if(manual) alert('Carga los dos archivos (SAC y Mercurio) antes de ejecutar el mantenimiento.'); return null; }
  const hoy=clave(HOY), rad=new Set(ALLRAD.map(claveR)), proc=new Set(ALLPROC.map(x=>x.p.numero));
  const r={evac:0,marcas:0,exp:0,aju:0,cons:0,cal:0};
  const pasa=(obj,presente,dias,cont,proteger)=>{ Object.keys(obj).forEach(k=>{ const e=obj[k];
    if(e===null||typeof e!=='object'){ if(!presente(k)){ delete obj[k]; r[cont]++; } return; }
    if(presente(k)){ e.vis=hoy; return; }
    if(!e.vis){ e.vis=hoy; return; }                       /* registros antiguos: periodo de gracia */
    if(proteger&&proteger(k,e)) return;
    if(edadDias(e.vis)>dias){ delete obj[k]; r[cont]++; } }); };
  pasa(EVAC,k=>rad.has(k),RETENER.evac,'evac');
  pasa(MARCAS,k=>rad.has(k),RETENER.marcaColor,'marcas',(k,e)=>!!e.nota);          /* las notas son consultas: se conservan */
  pasa(EXP,k=>proc.has(k),RETENER.expediente,'exp',(k,e)=>!!e.n||!!e.ev);
  Object.keys(AJUSTES).forEach(k=>{ if(!rad.has(k) && edadDias(AJUSTES[k])>RETENER.ajuste){ delete AJUSTES[k]; r.aju++; } });
  /* Consultas anteriores: se conservan siempre; solo se eliminan con el botón «Eliminar». */
  [CAL].concat(Object.values(CAL.u||{})).forEach(b=>{ if(!b||!b.notas) return;
    Object.keys(b.notas).forEach(k=>{ if(edadDias(k)>RETENER.cal){ delete b.notas[k]; r.cal++; } }); });
  guardaEvac(); guardaMarcas(); lsSet(LS_EXP,EXP); guardaAjustes(); guardaCons(); guardaCal();
  try{ appDataSet('essa_mant',hoy); }catch(e){}
  return r;
}
/* tamaño ocupado por los datos del tablero (el navegador permite ~5 MB) */
function usoAlmacen(){ if(APPDATA) return APPDATA.getStats().bytes; let n=0; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith('essa_')) n+=(localStorage.getItem(k)||'').length*2; } return n; }
function revisaAlmacen(){
  const mb=usoAlmacen()/1048576;
  if(mb>3.5) reportaError('Los datos guardados ocupan '+mb.toFixed(1)+' MB de ~5 MB. Exporta un respaldo y ejecuta el mantenimiento');
}
/* ================= CALENDARIO ================= */
/* Calendario PERSONAL: cada usuario (firmante configurado en Recursos) tiene su propio
   cuaderno de notas y cumpleaños dentro de CAL.u[usuario]. Se sigue guardando en el
   repositorio compartido (IndexedDB y carpeta de datos), pero cada uno solo ve lo suyo.
   Las notas creadas antes de este cambio (sin dueño) pasan al primer usuario que abra el
   calendario en este equipo. */
const LS_CAL='essa_calendario';
let CAL=SANEA.cal(lsGet(LS_CAL,{notas:{},cumple:{}}));
if(typeof CAL.u!=='object'||!CAL.u||Array.isArray(CAL.u)) CAL.u={};
const guardaCal=()=>lsSet(LS_CAL,CAL);
const calDueno=()=>canonNombre(NOMBRE_FIRMANTE||'')||'__sin_perfil';
const calNombre=()=>NOMBRE_FIRMANTE||'Sin perfil configurado';
function calU(){
  const k=calDueno();
  if(!_esObj(CAL.u[k])) CAL.u[k]={notas:{},cumple:{}};
  const b=CAL.u[k]; b.notas=b.notas||{}; b.cumple=b.cumple||{};
  /* migración única: lo anterior (compartido) queda para el primer usuario con perfil */
  if(k!=='__sin_perfil' && (Object.keys(CAL.notas).length||Object.keys(CAL.cumple).length)){
    Object.entries(CAL.notas).forEach(([d,L])=>{ b.notas[d]=(b.notas[d]||[]).concat(L||[]); });
    Object.entries(CAL.cumple).forEach(([d,L])=>{ b.cumple[d]=(b.cumple[d]||[]).concat(L||[]); });
    CAL.notas={}; CAL.cumple={}; guardaCal();
  }
  return b;
}
function nombresFestivos(y){
  const P=pascua(y), L=[[new Date(y,0,1),'Año Nuevo'],[aLunes(new Date(y,0,6)),'Reyes Magos'],[aLunes(new Date(y,2,19)),'San José'],
    [addD(P,-3),'Jueves Santo'],[addD(P,-2),'Viernes Santo'],[new Date(y,4,1),'Día del Trabajo'],[aLunes(addD(P,39)),'Ascensión'],
    [aLunes(addD(P,60)),'Corpus Christi'],[aLunes(addD(P,68)),'Sagrado Corazón'],[aLunes(new Date(y,5,29)),'San Pedro y San Pablo'],
    [new Date(y,6,20),'Independencia'],[new Date(y,7,7),'Batalla de Boyacá'],[aLunes(new Date(y,7,15)),'Asunción'],
    [aLunes(new Date(y,9,12)),'Día de la Raza'],[aLunes(new Date(y,10,1)),'Todos los Santos'],[aLunes(new Date(y,10,11)),'Indep. de Cartagena'],
    [new Date(y,11,8),'Inmaculada Concepción'],[new Date(y,11,25),'Navidad']];
  const m={}; L.forEach(([d,n])=>m[clave(d)]=(m[clave(d)]?m[clave(d)]+' · ':'')+n); return m;
}
let CAL_MES=new Date(HOY.getFullYear(),HOY.getMonth(),1), CAL_SEL=new Date(HOY);
function pintaCal(){
  const y=CAL_MES.getFullYear(), mo=CAL_MES.getMonth(), fn=Object.assign({},nombresFestivos(y-1),nombresFestivos(y),nombresFestivos(y+1));
  $('calMes').textContent=CAL_MES.toLocaleDateString('es-CO',{month:'long',year:'numeric'});
  const ini=addD(CAL_MES,-((CAL_MES.getDay()+6)%7));
  let html=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d,i)=>'<div class="calH'+(i===6?' dom':'')+'">'+d+'</div>').join('');
  for(let i=0;i<42;i++){ const d=addD(ini,i), k=clave(d), md=k.slice(5), w=d.getDay();
    if(i>=35 && d.getMonth()!==mo) break;
    const cls=['calD']; if(d.getMonth()!==mo) cls.push('otro'); if(w===0) cls.push('dom'); if(w===6) cls.push('sab');
    if(fn[k]) cls.push('fes'); if(k===clave(HOY)) cls.push('hoy'); if(k===clave(CAL_SEL)) cls.push('sel');
    const U=calU(), ns=U.notas[k]||[], cs=U.cumple[md]||[];
    html+='<div class="'+cls.join(' ')+'" data-k="'+k+'"><span class="n">'+d.getDate()+'</span>'+
      (fn[k]?'<span class="fesN">'+esc(fn[k])+'</span>':'')+
      cs.map(c=>'<span class="it">'+m2i('cake')+esc(c)+'</span>').join('')+
      ns.map(n=>'<span class="it">'+m2i('edit')+esc(n)+'</span>').join('')+'</div>'; }
  $('calGrid').innerHTML=html;
  $('calGrid').querySelectorAll('.calD').forEach(el=>el.onclick=()=>{ const p=el.dataset.k.split('-');
    CAL_SEL=new Date(+p[0],+p[1]-1,+p[2]); if(CAL_SEL.getMonth()!==mo) CAL_MES=new Date(CAL_SEL.getFullYear(),CAL_SEL.getMonth(),1); pintaCal(); });
  pintaCalPanel(fn);
}
function pintaCalPanel(fn){
  const d=CAL_SEL, k=clave(d), md=k.slice(5), w=d.getDay();
  const tipo=fn[k]?['Festivo: '+fn[k],'#FBE7E8','#A01119']:w===0?['Domingo','#FBE7E8','#A01119']:w===6?['Sábado','#E7ECF1','#5C6B7D']:['Día hábil','#EAF2FC','#1664B0'];
  const U=calU(), ns=U.notas[k]||[], cs=U.cumple[md]||[];
  $('calPanel').innerHTML='<div class="calDueno">'+m2i('lock')+' Notas personales de <b>'+esc(calNombre())+'</b></div><h5>'+d.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</h5>'+
    '<span class="tag" style="background:'+tipo[1]+';color:'+tipo[2]+'">'+esc(tipo[0])+'</span>'+
    '<ul>'+cs.map((c,i)=>'<li>'+m2i('cake')+'<span>'+esc(c)+' <i class="sp">(cada año)</i></span><b data-dc="'+i+'" title="Eliminar">×</b></li>').join('')+
    ns.map((n,i)=>'<li>'+m2i('edit')+'<span>'+esc(n)+'</span><b data-dn="'+i+'" title="Eliminar">×</b></li>').join('')+
    (!cs.length&&!ns.length?'<li style="background:none;border:0;color:#93A1B0">Sin notas para este día.</li>':'')+'</ul>'+
    '<textarea id="calTxt" placeholder="Escribe una nota o el nombre de quien cumple años…"></textarea>'+
    '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn mini" id="calAddN" type="button">'+m2i('edit')+'Agregar nota</button>'+
    '<button class="btn sec mini" id="calAddC" type="button">'+m2i('cake')+'Agregar cumpleaños</button></div>';
  const add=t=>{ const v=$('calTxt').value.trim(); if(!v) return;
    if(t==='n'){ (U.notas[k]=U.notas[k]||[]).push(v); } else { (U.cumple[md]=U.cumple[md]||[]).push(v); }
    guardaCal(); pintaCal(); };
  $('calAddN').onclick=()=>add('n'); $('calAddC').onclick=()=>add('c');
  $('calPanel').querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>{ ns.splice(+b.dataset.dn,1); if(!ns.length) delete U.notas[k]; guardaCal(); pintaCal(); });
  $('calPanel').querySelectorAll('[data-dc]').forEach(b=>b.onclick=()=>{ cs.splice(+b.dataset.dc,1); if(!cs.length) delete U.cumple[md]; guardaCal(); pintaCal(); });
}
$('btnCal').onclick=()=>{ pintaCal(); $('mCal').classList.add('on'); };
$('calPrev').onclick=()=>{ CAL_MES=new Date(CAL_MES.getFullYear(),CAL_MES.getMonth()-1,1); pintaCal(); };
$('calNext').onclick=()=>{ CAL_MES=new Date(CAL_MES.getFullYear(),CAL_MES.getMonth()+1,1); pintaCal(); };
$('calHoy').onclick=()=>{ CAL_MES=new Date(HOY.getFullYear(),HOY.getMonth(),1); CAL_SEL=new Date(HOY); pintaCal(); };
$('calX').onclick=()=>$('mCal').classList.remove('on');
$('mCal').onclick=e=>{ if(e.target===$('mCal')) $('mCal').classList.remove('on'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') $('mCal').classList.remove('on'); });

/* ---------- mantenimiento manual ----------
   El botón vive ahora en la tarjeta "Carpeta de datos" de Recursos (Módulo 1); aquí solo
   se registra la acción (esta función sigue siendo el único lugar que sabe depurar los
   datos del Cuadro de Mando, nada se duplica). */
function ejecutarMantenimientoManual(){
  const antes=usoAlmacen(), r=mantenimiento(true);
  if(!r) return {ok:false, reason:'sin-datos'};
  poblarColores(); refrescaEvac();
  return {ok:true, r, antes, despues:usoAlmacen()};
}
if(window.AD && AD.registerMaintenance) AD.registerMaintenance(ejecutarMantenimientoManual);
/* ---------- si la herramienta queda abierta y cambia el día, pedir recargar ---------- */
function revisaDia(){ const h=new Date(); h.setHours(0,0,0,0);
  if(clave(h)!==clave(HOY)) reportaError('Cambió el día ('+h.toLocaleDateString('es-CO')+'). Recarga el Asistente Documental para recalcular los días hábiles'); }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) revisaDia(); });
setInterval(revisaDia,10*60*1000);
/* ---------- funciones de pintado protegidas: un fallo en un panel no afecta los demás ---------- */
render=seguro(render,'Cuadro principal');
pintaRadicados=seguro(pintaRadicados,'Radicados del día');
verDetalle=seguro(verDetalle,'Detalle del radicado');
pintaRec=seguro(pintaRec,'Rutas');
pintaRol=seguro(pintaRol,'Usuarios de la ruta');
pintaTip=seguro(pintaTip,'Tipologías');
pintaCons=seguro(pintaCons,'Consultas');
pintaConsAnt=seguro(pintaConsAnt,'Consultas anteriores');
pintaHoy=seguro(pintaHoy,'Procesos a cerrar hoy');
pintaCal=seguro(pintaCal,'Calendario');
pintaHist=seguro(pintaHist,'Histórico');
pintaCuenta=seguro(pintaCuenta,'Detalles de la cuenta');
resumenGeneral=seguro(resumenGeneral,'Resumen general');
listaEvac=seguro(listaEvac,'Evacuados');
poblarFiltros=seguro(poblarFiltros,'Filtros');
/* ================= HISTÓRICO =================
   Guarda, por usuario, los procesos ya gestionados: los que en SAC tienen RADICADO_SALIDA
   y estado «Finalizado» en ESTADO_FIN_INICIAL, ESTADO_PROCESO o SUBESTADO (deben cumplirse
   las dos condiciones). Se acumula en el repositorio (clave essa_historico → IndexedDB y
   carpeta de datos), así que se conserva aunque el radicado deje de venir en el SAC.
   El mantenimiento automático no lo depura. */
const LS_HIST='essa_historico';
let HIST=SANEA.hist(lsGet(LS_HIST,{}));
const esFinalizado=r=>['ESTADO_FIN_INICIAL','ESTADO_PROCESO','SUBESTADO'].some(c=>sinTilde(r[c])==='finalizado');
function actualizaHistorico(){
  if(!CRUDO.sac.length) return 0;
  const porRad=new Map(); ALLRAD.forEach(d=>{ const k=soloNum(d.radicado); if(k) porRad.set(k,d); });
  const hoy=clave(HOY); let nuevos=0, cambios=0;
  CRUDO.sac.forEach(r=>{
    const sal=soloNum(r.RADICADO_SALIDA), proc=num(r.NUMERO_PROCESO);
    if(!sal || !proc || !esFinalizado(r)) return;
    const radTxt=num(r.RADICADO_ENTRADA)||'', kR=soloNum(radTxt), d=kR?porRad.get(kR):null;
    const resp=equipoDe(r.NOMBRE_USUARIO_INICIAL_PROCESO)||(d?equipoDe(d.gestor):'');
    if(!resp) return;                                   /* solo usuarios del equipo */
    const kM=d?claveR(d):(kR||radTxt), mk=MARCAS[kM]||{}, cs=CONS[kM]||{};
    const fr=parseFecha(r.FECHA_SOLICITUD), fv=parseFecha(r.FECHA_VENCIMIENTO);
    const prev=HIST[proc];
    const e={u:resp, r:radTxt||'—', p:proc, c:num(r.NUMERO_CUENTA)||'', t:num(r.PROCESO)||'',
      fr:fr?clave(fr):'', fv:fv?clave(fv):'', s:sal,
      cl:txt(r.DESCRIPCION_CLASIFICACION), tr:txt(r.TIPO_RESPUESTA),
      n:mk.nota||(prev&&prev.n)||'', o:cs.obs||cs.cons||(prev&&prev.o)||'',
      g:(prev&&prev.g)||hoy};
    if(!prev){ nuevos++; HIST[proc]=e; return; }
    if(JSON.stringify(prev)!==JSON.stringify(e)){ HIST[proc]=e; cambios++; }
  });
  /* ---- radicados de la bandeja y evacuados (nivel radicado, clave «R:radicado») ----
     · Bandeja: todo radicado que aparece a nombre del usuario activo queda registrado
       con su última foto; así se conserva aunque deje de venir en los Excel.
     · Evacuados: los que el usuario sacó del tablero (también los evacuados antes de
       esta versión, si el radicado aún viene en los Excel o ya estaba en bandeja). */
  const uAct=usuarioActivo();
  const reg=(d,u,extra)=>{ if(!d||!u) return; const k='R:'+claveR(d), prev=HIST[k]||{}, mk=MARCAS[claveR(d)]||{}, cs=CONS[claveR(d)]||{};
    const e={u, r:d.radicado||'—', p:(d.procesos||[]).map(p=>p.numero).join(', '), c:(d.cuentas||[]).filter(c=>c&&c!=='0').join(', ')||d.cuenta||'',
      t:(d.procesos||[]).map(p=>p.codTram).filter(Boolean).join(', '), tram:(d.tramites||[]).join(' · '),
      fr:d.fSol?clave(d.fSol):(prev.fr||''), fv:d.fVto?clave(d.fVto):(d.fEfe&&fechaVence(d.fEfe)?clave(fechaVence(d.fEfe)):(prev.fv||'')),
      s:'', cl:'', tr:'', n:mk.nota||prev.n||'', o:cs.obs||cs.cons||prev.o||'', g:prev.g||hoy, vb:hoy, ev:prev.ev||''};
    Object.assign(e,extra||{});
    Object.keys(e).forEach(x=>{ if(e[x]===''&&prev[x]) e[x]=prev[x]; });
    if(JSON.stringify(prev)!==JSON.stringify(e)){ if(!HIST[k]) nuevos++; else cambios++; HIST[k]=e; } };
  if(uAct) DATOS.forEach(d=>{ if(d.respEq===uAct && (d.enVentana||d.vencida)) reg(d,uAct); });
  const porClave=new Map(); ALLRAD.forEach(d=>porClave.set(claveR(d),d));
  Object.keys(EVAC).forEach(k=>{ const ev=EVAC[k]; if(!ev) return; const d=porClave.get(k);
    const u=equipoDe(ev.u)||(d&&d.respEq)||''; const f=_fecha(ev.f)||hoy;
    if(d) reg(d,u,{ev:f});
    else if(HIST['R:'+k]&&!HIST['R:'+k].ev){ HIST['R:'+k].ev=f; cambios++; } });
  if(nuevos||cambios) lsSet(LS_HIST,HIST);
  return nuevos;
}
/* registro inmediato al evacuar (no espera a la próxima carga de los Excel) */
function histEvacuar(regs){ try{ const hoy=clave(HOY), uAct=usuarioActivo();
  regs.forEach(d=>{ if(!d) return; const u=d.respEq||uAct; if(!u) return; const k='R:'+claveR(d), mk=MARCAS[claveR(d)]||{}, cs=CONS[claveR(d)]||{}, prev=HIST[k]||{};
    HIST[k]=Object.assign({},prev,{u, r:d.radicado||'—', p:(d.procesos||[]).map(p=>p.numero).join(', '),
      c:(d.cuentas||[]).filter(c=>c&&c!=='0').join(', ')||d.cuenta||prev.c||'', t:(d.procesos||[]).map(p=>p.codTram).filter(Boolean).join(', '),
      tram:(d.tramites||[]).join(' · '), fr:d.fSol?clave(d.fSol):(prev.fr||''),
      fv:d.fVto?clave(d.fVto):(d.fEfe&&fechaVence(d.fEfe)?clave(fechaVence(d.fEfe)):(prev.fv||'')),
      s:prev.s||'', cl:prev.cl||'', tr:prev.tr||'', n:mk.nota||prev.n||'', o:cs.obs||cs.cons||prev.o||'', g:prev.g||hoy, vb:hoy, ev:hoy}); });
  lsSet(LS_HIST,HIST); }catch(e){ reportaError('Histórico',e); } }
let HIST_VISTA=[];
function filasHist(){
  const proc=[], rad=[];
  Object.keys(HIST).forEach(k=>{ const e=HIST[k]; if(!e) return; (k.indexOf('R:')===0?rad:proc).push(e); });
  const evPorRad={}; rad.forEach(e=>{ if(e.ev) evPorRad[soloNum(e.r)]=e.ev; });
  const conGest=new Set(proc.map(e=>soloNum(e.r)).filter(Boolean));
  const vigentes=new Set(ALLRAD.map(d=>soloNum(d.radicado)));
  return proc.map(e=>Object.assign({},e,{est:'g',ev:e.ev||evPorRad[soloNum(e.r)]||''}))
    .concat(rad.filter(e=>!conGest.has(soloNum(e.r))).map(e=>Object.assign({},e,{est:e.ev?'e':(vigentes.size&&!vigentes.has(soloNum(e.r))?'f':'b')})));
}
const EST_HIST={g:['Gestionado (SAC)','b-v'],e:['Evacuado','b-b'],b:['En bandeja','b-g'],f:['Ya no aparece en los informes','b-a']};
function pintaHist(){
  const uAct=usuarioActivo(), todos=!uAct;           /* sin usuario fijo (Atención clientes) se ve todo el equipo */
  const q=sinTilde($('histQ').value), qn=q.replace(/\D/g,'');
  let L=filasHist().filter(e=>e&&(todos||canonNombre(e.u)===canonNombre(uAct)));
  if(q) L=L.filter(e=>sinTilde([e.r,e.p,e.c,e.cl,e.tr,e.n,e.o,e.u,e.s,e.tram,EST_HIST[e.est][0]].join(' ')).includes(q)||(qn.length>=4&&[e.r,e.p,e.c,e.s].some(x=>String(x).includes(qn))));
  L.sort((a,b)=>((b.ev||b.fv||'').localeCompare(a.ev||a.fv||''))||(b.fr||'').localeCompare(a.fr||''));
  HIST_VISTA=L;
  const f=s=>s?s.split('-').reverse().join('/'):'—', n=x=>L.filter(e=>e.est===x).length;
  $('histSub').textContent=nfmt(L.length)+' radicado(s) · '+n('g')+' gestionados en SAC · '+n('e')+' evacuados · '+(n('b')+n('f'))+' de bandeja · '+
    (todos?'todo el equipo':uAct)+' · se conservan aunque ya no vengan en los informes';
  $('tHist').querySelector('thead').innerHTML='<tr><th>Radicado</th><th>Proceso</th><th>Cuenta</th><th>F. radicación</th><th>F. vencimiento</th>'+
    '<th>Estado</th><th>Evacuado el</th><th>Radicado salida</th><th>Cierre</th><th>Notas</th>'+(todos?'<th>Responsable</th>':'')+'</tr>';
  $('tHist').querySelector('tbody').innerHTML=L.length?L.map(e=>'<tr><td class="rad">'+esc(e.r)+'</td>'+
    '<td>'+(e.p?String(e.p).split(', ').map(p=>'<span class="procHL">'+esc(p)+'</span>').join(' '):'<span class="sp">Sin proceso</span>')+(e.t?' <span class="sp">'+esc(e.t)+'</span>':'')+'</td>'+
    '<td>'+esc(e.c||'—')+'</td><td>'+f(e.fr)+'</td><td>'+f(e.fv)+'</td>'+
    '<td><span class="badge '+EST_HIST[e.est][1]+'">'+EST_HIST[e.est][0]+'</span></td><td>'+f(e.ev)+'</td><td>'+esc(e.s||'—')+'</td>'+
    '<td><div class="cierreH"><b>'+esc(e.cl||'—')+'</b><span>'+esc(e.tr||'')+'</span></div></td>'+
    '<td>'+(e.n||e.o?'<div class="roTxt">'+(e.n?esc(e.n):'')+(e.o?(e.n?'<hr>':'')+'<i>'+esc(e.o)+'</i>':'')+'</div>':'<span class="sp">—</span>')+'</td>'+
    (todos?'<td>'+esc(e.u)+'</td>':'')+'</tr>').join('')
    :'<tr><td colspan="11" class="vacio">Aún no hay radicados registrados para este usuario.</td></tr>';
  ordenable($('tHist'));
}
$('btnHist').onclick=()=>{ pintaHist(); $('mHist').classList.add('on'); };
$('histQ').addEventListener('input',()=>pintaHist());
$('histX').onclick=()=>$('mHist').classList.remove('on');
$('mHist').onclick=e=>{ if(e.target===$('mHist')) $('mHist').classList.remove('on'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') $('mHist').classList.remove('on'); });
$('histExp').onclick=()=>{ if(!HIST_VISTA.length) return alert('No hay datos para exportar.');
  const f=s=>s?s.split('-').reverse().join('/'):'';
  XLSXW.descargar('historico_pqrs.xlsx',[{nombre:'Histórico',filas:[['Radicado','Proceso','Trámite','Cuenta','F. radicación','F. vencimiento','Estado','Evacuado el','Radicado salida',
    'Clasificación','Tipo respuesta','Nota','Observación profesional','Responsable']].concat(HIST_VISTA.map(e=>[e.r,e.p,e.t,e.c,f(e.fr),f(e.fv),EST_HIST[e.est][0],f(e.ev),e.s,e.cl,e.tr,e.n,e.o,e.u]))}]); };
/* ================= DETALLES DE LA CUENTA =================
   Toma de SAC Trámite la fila más reciente de la cuenta (por FECHA_REGISTRO_PROCESO) y
   completa los campos vacíos con las demás filas de la misma cuenta. */
const CTA_FICHAS=[
  {t:'Datos básicos del suscriptor',d:'Identificación, contacto y ubicación',ic:M2I(M2P.user),c:[['Número de cuenta','NUMERO_CUENTA'],['Suscriptor','NOMBRE_SUSCRIPTOR'],['Cédula o NIT','CEDULA_SUSCRIPTOR'],
    ['Teléfono','TELEFONO_SUSCRIPTOR'],['Celular','CELULAR_SUSCRIPTOR'],['Dirección de la cuenta','DIRECCION_SUSCRIPTOR'],
    ['Municipio','MUNICIPIO_SUSCRIPTOR'],['Barrio','BARRIO_SUSCRIPTOR'],['Departamento','DEPTO_SUSCRIPTOR'],['Zona','ZONA_SUSCRIPTOR']]},
  {t:'Datos de facturación',d:'Tarifa, servicio y valores de la cuenta',ic:M2I(M2P.receipt),c:[['Tarifa','TARIFA'],['Ciclo','CICLO'],['Área','AREA'],['Clase de servicio','CLASE_SERVICIO'],
    ['Estrato','ESTRATO'],['Estado del cliente','ESTADO_CLIENTE'],['Medida de tensión','MEDIDA_TENSION'],['Última factura','NUMERO_FACTURA'],
    ['Periodo de factura','PERIODO_FACTURA'],['Valor congelado (cuenta)','VALOR_CONGELADO_CUENTA'],['Valor reclamado (cuenta)','VALOR_RECLAMADO_CUENTA']]},
  {t:'Datos técnicos',d:'Circuito, transformador y medidor',ic:M2I(M2P.bolt),c:[['Circuito','CIRCUITO'],['Nombre del circuito','NOMBRE_CIRCUITO'],['Transformador','ID_TRAFO'],
    ['Propiedad del transformador','PROPIEDAD_TRAFO'],['Número de medidor','NUMERO_MEDIDOR'],['Marca de medidor','MARCA_MEDIDOR'],
    ['Tipo de medidor','TIPO_MEDIDOR'],['Factor de multiplicación','FACTOR_MULTIPLICACION'],['Estado del medidor','ESTADO_MEDIDOR']]}];
const MONEDA=new Set(['VALOR_CONGELADO_CUENTA','VALOR_RECLAMADO_CUENTA']);
/* solo presentación: niveles visuales de algunos datos (identidad, número de cuenta) */
const CTA_NIVEL={NOMBRE_SUSCRIPTOR:' t1',NUMERO_CUENTA:' acc'};
function datosCuenta(cta){
  const L=CRUDO.sac.filter(r=>num(r.NUMERO_CUENTA)===cta);
  if(!L.length) return null;
  L.sort((a,b)=>((parseFecha(b.FECHA_REGISTRO_PROCESO)||0)-(parseFecha(a.FECHA_REGISTRO_PROCESO)||0)));
  const o={};
  CTA_FICHAS.forEach(f=>f.c.forEach(([,col])=>{ for(const r of L){ const v=txt(r[col]); if(v!==''&&v!=='0'||col==='ESTRATO'&&v==='0'){ o[col]=r[col]; break; } } }));
  o.__n=L.length; return o;
}
function valCta(col,v){
  if(v==null||txt(v)==='') return '<span class="sp">Sin dato</span>';
  if(MONEDA.has(col)){ const n=Number(v); return isFinite(n)?'$ '+n.toLocaleString('es-CO'):esc(v); }
  if(col==='ESTRATO' && (txt(v)==='0')) return '<span class="sp">No aplica</span>';
  return esc(num(v));
}
let CTA_D=null;
function pintaCuenta(cta){
  const o=datosCuenta(cta);
  $('ctaTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.c===cta));
  $('ctaTit').innerHTML='Detalles de la cuenta <span class="ctaNum">'+esc(cta)+'</span>';
  if(!o){ $('ctaSub').innerHTML='';
    $('ctaBody').innerHTML='<div class="vacio">La cuenta '+esc(cta)+' no aparece en el SAC Trámite cargado actualmente.</div>'; return; }
  $('ctaSub').innerHTML='<span class="ctaChip">'+o.__n+' proceso(s) de esta cuenta en el informe</span>';
  $('ctaBody').innerHTML='<div class="ctaGrid">'+CTA_FICHAS.map(f=>'<div class="ctaCard"><div class="ctaCardH"><span aria-hidden="true">'+f.ic+'</span><div class="ctaHT"><b>'+esc(f.t)+'</b><small>'+esc(f.d)+'</small></div></div>'+
    f.c.map(([l,col])=>'<div class="ctaF'+(MONEDA.has(col)?' money':(CTA_NIVEL[col]||''))+'"><span class="k">'+esc(l)+'</span><span class="w">'+valCta(col,o[col])+'</span></div>').join('')+'</div>').join('')+'</div>';
}
function abrirCuenta(d){
  const ctas=[...new Set((d.cuentas||[]).map(c=>num(c)).filter(c=>c&&c!=='0'))];
  if(!ctas.length) return;
  CTA_D=d;
  $('ctaTabs').innerHTML=ctas.length>1?ctas.map(c=>'<button data-c="'+esc(c)+'">Cuenta '+esc(c)+'</button>').join(''):'';
  $('ctaTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>pintaCuenta(b.dataset.c));
  pintaCuenta(ctas[0]); $('mCta').classList.add('on');
}
$('ctaX').onclick=()=>$('mCta').classList.remove('on');
$('mCta').onclick=e=>{ if(e.target===$('mCta')) $('mCta').classList.remove('on'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') $('mCta').classList.remove('on'); });
/* ventanas modales: nombre accesible, botón de cierre etiquetado y foco al abrir/cerrar (solo presentación) */
(function(){
  document.querySelectorAll('.modal').forEach(m=>{
    const h=m.querySelector('h3'); if(h){ if(!h.id) h.id='mh-'+m.id; m.setAttribute('aria-labelledby',h.id); }
    m.querySelectorAll('.cerrar').forEach(c=>{ c.setAttribute('aria-label','Cerrar'); c.setAttribute('type','button'); });
    let previo=null;
    new MutationObserver(()=>{
      if(m.classList.contains('on')){ if(m.id==='mConf') return; previo=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
        setTimeout(()=>{ const c=m.querySelector('.cerrar'); if(c&&m.classList.contains('on')) c.focus({preventScroll:true}); },60); }
      else if(previo){ const p=previo; previo=null; if(document.contains(p)&&p.focus) p.focus({preventScroll:true}); }
    }).observe(m,{attributes:true,attributeFilter:['class']});
  });
})();
render();

/* ================= FUENTES COMPARTIDAS · ASISTENTE DOCUMENTAL =================
   Única fuente de verdad: el DocStore. Este tablero no vuelve a pedir ni a procesar
   archivos; consume las filas ya procesadas y reacciona a cada cambio de estado. */
const FUENTES=[{c:'sac',k:'sac'},{c:'mer',k:'mercurio'}];
const APLICADAS={sac:null,mer:null};
const ocupada=r=>r.status==='loading'||r.status==='processing';
const ICO_F={ok:'<path d="M20 6 9 17l-5-5"/>',err:'<path d="M12 7v6M12 17v.01"/>',pend:'<path d="M12 5v14M5 12h14"/>'};
const icoF=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
function textoFuente(r){
  if(r.status==='ready') return esc(r.file.name)+' · '+nfmt(r.rowCount)+' registros';
  if(r.status==='processing') return 'Procesando '+esc(r.file?r.file.name:'')+'…';
  if(r.status==='loading') return 'Recibiendo '+esc(r.file?r.file.name:'')+'…';
  if(r.status==='error') return esc(r.error||'No se pudo procesar');
  return 'Pendiente · cárgalo en Recursos';
}
function pintaFuentes(snap){ /* lista del estado vacío (sin datos aún) */
  const cfg=AD.store.config.resources;
  $('sfList').innerHTML=FUENTES.map(({k})=>{ const r=snap.resources[k];
    const cls=r.status==='ready'?'ok':ocupada(r)?'busy':r.status==='error'?'err':'pend';
    const ic=cls==='busy'?'<i class="fzSpin"></i>':icoF(cls==='ok'?ICO_F.ok:cls==='err'?ICO_F.err:ICO_F.pend);
    return '<li class="'+cls+'"><span class="sfIc">'+ic+'</span><div><b>'+esc(cfg[k].label)+'</b><small>'+textoFuente(r)+'</small></div></li>'; }).join('');
}
function estadoVista(snap){
  const R=snap.resources, rs=FUENTES.map(f=>R[f.k]);
  const sin=!rs.some(r=>r.status==='ready');
  document.body.classList.toggle('cm-sin-datos',sin);
  if(!sin) return;
  const busy=rs.some(ocupada), err=rs.some(r=>r.status==='error');
  const b=$('sfBadge'); b.className='sf-badge'+(busy?' busy':err?' err':'');
  b.querySelector('span').textContent=busy?'Procesando':err?'Requiere atención':'Esperando datos';
  $('sfTit').textContent=busy?'Preparando la información del Cuadro de Mando…':err?'No se pudo procesar la información':'El Cuadro de Mando aún no tiene información';
}
function aplicarFuentes(snap){
  const cambioAcceso=aplicarAccesoResponsable(snap.profile,false);
  let cambio=false;
  FUENTES.forEach(({c,k})=>{ const r=snap.resources[k];
    if(ocupada(r)) return;                 /* mientras se procesa un reemplazo se conservan los datos vigentes */
    const filas=r.status==='ready'?AD.store.getRows(k):null;
    if(filas!==APLICADAS[c]){ APLICADAS[c]=filas; CRUDO[c]=filas||[]; cambio=true; } });
  if(cambio){
    unificar(); poblarFiltros(); render();
    try{ actualizaHistorico(); }catch(e){ reportaError('Histórico',e); }
    try{ refrescaFotosCons(); }catch(e){ reportaError('Consultas anteriores',e); }
    $('aviso').style.display='none';
    if(CRUDO.sac.length && CRUDO.mer.length && appDataGet('essa_mant')!==clave(HOY)){
      setTimeout(()=>{ try{ mantenimiento(false); revisaAlmacen(); }catch(e){ reportaError('Mantenimiento',e); } },500); }
  }
  if(cambioAcceso&&!cambio){poblarFiltros();render();}
  pintaFuentes(snap); estadoVista(snap);
}
if(window.AD && AD.store){
  const quitar=AD.store.subscribe(seguro(aplicarFuentes,'Fuentes de datos'));
  window.addEventListener('pagehide',()=>quitar());
}else{
  document.body.classList.add('cm-sin-datos');
}

/* ================= GUÍA RÁPIDA =================
   El motor (overlay, posicionamiento, navegación) vive en el componente compartido
   GuidedTour (guided-tour.js); aquí solo se define el contenido de esta guía. */
(function(){
  const ICN=GuidedTour.ICN;
  /* Varios paneles (filtros, bandeja, rutas) solo existen en pantalla cuando ya hay datos
     cargados (body.cm-sin-datos los oculta). Si el usuario abre la guía ANTES de cargar nada
     en Recursos, esta función evita que el paso "desaparezca": resalta el panel real cuando
     está visible, o el aviso de "sin datos" como anclaje de respaldo, sin saltarse la explicación. */
  const visible=el=>!!el&&getComputedStyle(el).display!=='none'&&!!el.getClientRects().length;
  const anchor=sel=>()=>{ const el=document.querySelector(sel); if(visible(el))return el;
    const sf=document.querySelector('.sinFuentes'); return visible(sf)?sf:document.querySelector('.hdr2'); };
  const steps=[
    {sel:'.hdr2', ic:ICN.wave,
     title:'¡Hola! Bienvenido 👋',
     text:'Este es el Cuadro de Mando: aquí revisas y gestionas tus PQRs en trámite. Te muestro rápidamente cómo funciona.'},
    {resolve:anchor('.sinFuentes'), ic:ICN.folder,
     title:'Los documentos se cargan en Recursos',
     text:'SAC Trámite y Mercurio Trámite se cargan una sola vez en el Módulo 1 (Recursos). Aquí no encontrarás ningún botón para cargarlos: en cuanto estén procesados allá, aparecen automáticamente en este tablero. No necesitas volver a seleccionarlos.'},
    {resolve:anchor('.filtrosBar'), ic:ICN.search,
     title:'Filtra lo que necesitas ver',
     get text(){ return (RESPONSABLE_VISIBLE?'Filtra por responsable, tipo de trámite o busca por radicado, cuenta o solicitante.':'Filtra por tipo de trámite o busca por radicado, cuenta o solicitante.')+' El botón "Exportar" descarga a Excel lo que estás viendo. (Esta barra aparece apenas haya datos cargados en Recursos.)'; }},
    {resolve:anchor('.gridCarga'), ic:ICN.board,
     title:'Tu bandeja de trabajo',
     text:'Aquí ves la carga por día hábil y los radicados vencidos. Haz clic en una barra o en un radicado para ver el detalle completo. (También aparece en cuanto cargues SAC y Mercurio.)'},
    {resolve:anchor('.panelPQR'), ic:ICN.list,
     title:'Rutas y seguimiento',
     text:'Desde aquí gestionas las rutas de Mercurio, tipologías, duplicados y los vencimientos próximos de cada equipo.'},
    {sel:'#btnCal', ic:ICN.calendar,
     title:'Calendario de gestión',
     text:'Consulta los días hábiles y festivos, y agrega notas o cumpleaños del equipo para no perderte nada.'},
    {sel:'.btn-guide', ic:ICN.check,
     title:'¡Listo, ya sabes lo esencial! 🎉',
     text:'Puedes volver a ver esta guía cuando quieras dándole clic a este mismo botón.'}
  ];
  GuidedTour.mount(steps);
})();
