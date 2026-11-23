
/* Imágenes y documentos incrustados (DATA_IMGGEN, ~11 MB): solo se necesitan al abrir un anexo. El bloque va al
   final del documento como texto inerte y se interpreta la primera vez que se lee window.IMGGEN. Las hojas
   disponibles (claves) se leen al instante desde DATA_IMGGEN_KEYS, sin interpretar los 11 MB al arrancar.
   Compatible con archivos antiguos (bloque ejecutable en medio del documento): el setter recibe el valor. */
(function(){
var d=null,k=null;
function cargar(){
  if(d)return d;
  var e=document.getElementById('DATA_IMGGEN');
  if(!e||e.type!=='text/plain')return d||undefined;
  var t=e.textContent,i=t.indexOf('{'),j=t.lastIndexOf('}');
  try{d=JSON.parse(t.slice(i,j+1));}catch(x){try{(0,eval)(t);}catch(y){}if(!d)d={};}
  var rq=cargarReq();for(var kk in rq)if(!(kk in d))d[kk]=rq[kk];
  return d;
}
/* Imágenes dentro de los requisitos de los trámites (bloque pequeño DATA_IMGREQ): se leen sin interpretar los anexos */
var rqd=null;
function cargarReq(){
  if(rqd)return rqd;
  var e=document.getElementById('DATA_IMGREQ');
  if(!e){/* archivo de una versión anterior: las imágenes de trámites venían dentro de DATA_IMGGEN */
    var g=d||cargarSinReq();rqd={};for(var k2 in g)if(/^REQ /.test(k2))rqd[k2]=g[k2];return rqd;}
  var t=e.textContent,i=t.indexOf('{'),j=t.lastIndexOf('}');
  try{rqd=JSON.parse(t.slice(i,j+1));}catch(x){rqd={};}
  return rqd;
}
function cargarSinReq(){var e=document.getElementById('DATA_IMGGEN');if(!e||e.type!=='text/plain')return {};var t=e.textContent;try{return JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));}catch(x){return {};}}
Object.defineProperty(window,'IMGREQ',{configurable:true,enumerable:true,get:cargarReq,set:function(v){rqd=v;}});
Object.defineProperty(window,'IMGGEN',{configurable:true,enumerable:true,get:cargar,set:function(v){d=v;}});
window.IMGGEN_CLAVES=function(){
  if(d)return Object.keys(d);
  if(k)return k;
  var e=document.getElementById('DATA_IMGGEN_KEYS');
  if(e){try{k=JSON.parse(e.textContent);return k;}catch(x){}}
  return Object.keys(cargar()||{});
};
})();

export {};
