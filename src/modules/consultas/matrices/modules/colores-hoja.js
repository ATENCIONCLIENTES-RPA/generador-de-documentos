
/* ===================== COLORES POR HOJA Y FICHAS COMPACTAS (compartido) ===================== */
(function(){
const P={azul:['#2f6fe6','#e3eeff'],violeta:['#5742b6','#ece8fa'],turquesa:['#2b8fc9','#e2f1fb'],ambar:['#c77a0a','#fff1d6'],rosa:['#cf1d2b','#fde8ea'],
  indigo:['#3f4fc8','#e8eafc'],esmeralda:['#2a5db0','#e1eaf9'],naranja:['#d9532b','#fdebe3'],cian:['#2a8fb5','#e1f3f8'],fucsia:['#a23bb5','#f5e6f8'],
  pizarra:['#55648a','#e8eefa'],lima:['#6b5bd6','#eeebfc'],cielo:['#3a8fd6','#e2f1fb'],magenta:['#c2335f','#fbe5ec'],cafe:['#8a5a2b','#f6ece2'],
  tAzul:['#1d64d8','#e2ecfd'],tMorado:['#8b2fc9','#f3e6fb'],tVerde:['#14904a','#e1f5e9'],tNaranja:['#e06c00','#fff0e0'],tRojo:['#cc1f45','#fde6eb'],
  tTeal:['#00838a','#dff4f5'],tCafe:['#8d5524','#f6ebe0'],tOro:['#b38600','#fbf3d6'],tGris:['#4a5670','#e9edf4'],
  tFucsia:['#c2187a','#fce4f1'],tIndigo:['#3f3fbf','#e7e7fb'],tLima:['#5c8a00','#eef6dc']};
/* Clave compacta del nombre de la hoja → color fijo (se compara por el inicio del nombre) */
const FIJOS=[
 /* Árbol de transacciones: responsables */
 ['insumosatcpqr','tAzul'],['atcproyectoselectricos','tMorado'],['atcconexionsencilla','tVerde'],['atcconexioncompleja','tNaranja'],['atcfactibilidades','tRojo'],
 ['insumosrce','tTeal'],['mantenimientotrabajosaterceros','tCafe'],['insumosmantenimiento','tOro'],['contratointegral','tGris'],
 /* Árbol de transacciones: hojas de procesos */
 ['quejas','rosa'],['peticiones','ambar'],['reclamos','esmeralda'],['recursosreposicion','violeta'],['recursosapelacion','fucsia'],
 ['pedidoshomologado','cielo'],['pedidosinactivos','pizarra'],['sugerencias','lima'],['procesosinternos','cafe'],['danos','naranja'],['tiposrespuestas','indigo'],
 /* Matriz de requisitos: bases de información general */
 ['basededatosalumbrado','tOro'],['directoriodecontactosessa','tMorado'],['relacionamiento','tAzul'],['directorioadministraciones','tRojo'],
 ['facturacionconjunta','tVerde'],['sitiosdemenor','tGris'],['costomateriales','tNaranja'],['costosporconexion','cafe'],['condicionesparafinanciacion','cielo'],
 ['otrascomercializadoras','tTeal'],['medidoresparametrizables','tFucsia'],['asentamientosbga','tCafe'],['asentamientosflorida','rosa'],
 ['anexo1','azul'],['anexo2','violeta'],['anexo3','turquesa'],['anexo4','indigo'],['anexo5','cian'],['rut','pizarra'],['planos','cafe'],['comunicado','esmeralda'],['tramites','tIndigo']];
const clave=n=>String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9]/g,'');
const LISTA=Object.keys(P);
const baseHoja=n=>{
  const k=clave(n);
  for(const [p,c] of FIJOS)if(k.startsWith(p))return P[c];
  let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;
  return P[LISTA[h%LISTA.length]];
};
/* El color base se mantiene; el tono (claro/oscuro) y el tinte salen de los tokens del tema */
window.colorHoja=n=>{const c=baseHoja(n)[0];return [`color-mix(in srgb,${c} var(--hc-lift),white)`,`color-mix(in srgb,${c} var(--tint-pct),var(--card))`];};
window.estiloHoja=n=>{const [c,s]=window.colorHoja(n);return `--hc:${c};--hcs:${s}`;};

/* Fichas compactas: según el tamaño del contenido, varias fichas comparten una misma fila */
function medir(el){
  if(el.querySelector('table,.cierres,.imgs,.otros'))return 't3';
  const cuerpo=el.querySelector('.cuerpo');
  const txt=(cuerpo?cuerpo.innerText:el.innerText)||'';
  const lineas=txt.split('\n').filter(x=>x.trim()).length;
  const n=txt.length;
  if(n<=170&&lineas<=8)return 't1';
  if(n<=480&&lineas<=14)return 't2';
  return 't3';
}
function compactar(raiz){
  /* lecturas primero (un solo cálculo de layout) y escrituras después: evita un reflujo por cada ficha */
  const nuevas=[...raiz.querySelectorAll('.ic:not([data-tam])')];
  const tams=nuevas.map(medir);
  nuevas.forEach((el,i)=>{el.dataset.tam=tams[i];el.classList.add(tams[i]);});
  /* Un grupo con pocas fichas cortas no ocupa toda la fila: comparte espacio con los demás grupos */
  raiz.querySelectorAll('.grp:not([data-gm])').forEach(g=>{
    g.dataset.gm='1';
    if(g.querySelector('.encab,.otros,table,.imgs,.vacio'))return;
    const fichas=[...g.children].filter(x=>x.classList.contains('ic'));
    if(!fichas.length||fichas.length>2||fichas.some(f=>f.dataset.tam==='t3'))return;
    const ancho=fichas.reduce((s,f)=>s+(f.dataset.tam==='t1'?200:300),0)+(fichas.length-1)*10;
    g.classList.add('gm');g.style.setProperty('--gb',ancho+'px');
  });
}
let pend=false;
const obs=new MutationObserver(()=>{if(pend)return;pend=true;requestAnimationFrame(()=>{pend=false;['res','resD'].forEach(id=>{const r=document.getElementById(id);if(r)compactar(r);});});});
const iniciarCompacto=()=>{['res','resD'].forEach(id=>{const r=document.getElementById(id);if(r){obs.observe(r,{childList:true,subtree:true});compactar(r);}});};
/* los contenedores ya existen aquí: no hace falta esperar al final de la carga del documento */
if(document.getElementById('res')&&document.getElementById('resD'))iniciarCompacto();else window.addEventListener('DOMContentLoaded',iniciarCompacto);
})();

export {};
