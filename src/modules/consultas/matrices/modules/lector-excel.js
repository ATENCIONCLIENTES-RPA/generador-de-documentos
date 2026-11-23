
/* ===================== LECTOR DE EXCEL (.xlsx) SIN LIBRERÍAS ===================== */
const XL=(()=>{
const td=new TextDecoder('utf-8');
async function inflar(u8){
  const ds=new DecompressionStream('deflate-raw');
  const s=new Blob([u8]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function unzip(buf){
  const dv=new DataView(buf), u8=new Uint8Array(buf);
  let e=buf.byteLength-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50) e--;
  if(e<0) throw new Error('El archivo no es un Excel válido (.xlsx).');
  const n=dv.getUint16(e+10,true); let p=dv.getUint32(e+16,true);
  const Z=new Map();
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const met=dv.getUint16(p+10,true), cs=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=td.decode(u8.subarray(p+46,p+46+nl));
    Z.set(name,{met,cs,off});
    p+=46+nl+xl+cl;
  }
  const cache=new Map();
  Z.leer=async name=>{
    const f=Z.get(name); if(!f) return null;
    if(cache.has(name)) return cache.get(name);
    const ln=dv.getUint16(f.off+26,true), lx=dv.getUint16(f.off+28,true), ini=f.off+30+ln+lx;
    const raw=u8.subarray(ini,ini+f.cs);
    const out=f.met===0?raw.slice():await inflar(raw);
    cache.set(name,out); return out;
  };
  Z.texto=async name=>{const b=await Z.leer(name);return b?td.decode(b):null;};
  return Z;
}
const parser=new DOMParser();
const xml=s=>parser.parseFromString(s,'application/xml');
const ls=(el,n)=>Array.from(el.getElementsByTagNameNS('*',n));
const hijos=(el,n)=>Array.from(el.children).filter(x=>x.localName===n);
function ref(a){const m=/^([A-Z]+)(\d+)$/.exec(a);let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;return [+m[2],c];}
function col(c){let s='';while(c){const r=(c-1)%26;s=String.fromCharCode(65+r)+s;c=(c-1-r)/26;}return s;}
function resolver(base,t){
  if(t.startsWith('/')) return t.slice(1);
  const p=base.split('/');p.pop();
  for(const x of t.split('/')){if(x==='..')p.pop();else if(x!=='.')p.push(x);}
  return p.join('/');
}
async function rels(Z,path){
  const s=await Z.texto(path); const M={}; if(!s) return M;
  for(const r of ls(xml(s),'Relationship')) M[r.getAttribute('Id')]={t:r.getAttribute('Target'),type:r.getAttribute('Type')||'',mode:r.getAttribute('TargetMode')};
  return M;
}
const BUILTIN={9:'0%',10:'0.00%',3:'#,##0',4:'#,##0.00',5:'$#,##0',6:'$#,##0',7:'$#,##0.00',8:'$#,##0.00'};
/* Lee el libro: hojas con celdas, combinadas, comentarios e imágenes */
async function leerLibro(buf,opc={}){
  const Z=await unzip(buf);
  const ss=[]; const sst=await Z.texto('xl/sharedStrings.xml');
  if(sst) for(const si of hijos(xml(sst).documentElement,'si')) ss.push(ls(si,'t').map(t=>t.textContent).join(''));
  const fm={},xf=[]; const sty=await Z.texto('xl/styles.xml');
  if(sty){const d=xml(sty);for(const n of ls(d,'numFmt'))fm[+n.getAttribute('numFmtId')]=n.getAttribute('formatCode');
    const cx=ls(d,'cellXfs')[0]; if(cx) for(const x of hijos(cx,'xf')) xf.push(+(x.getAttribute('numFmtId')||0));}
  const fmt=s=>{if(s==null)return '';const i=xf[+s];return fm[i]||BUILTIN[i]||'';};
  const wbx=xml(await Z.texto('xl/workbook.xml')); const wr=await rels(Z,'xl/_rels/workbook.xml.rels');
  /* Imágenes colocadas DENTRO de una celda (Excel 365 "Colocar en celda"): vm -> metadata -> richValue -> imagen */
  const VMIMG=[];
  try{const md=await Z.texto('xl/metadata.xml'),rv=await Z.texto('xl/richData/rdrichvalue.xml'),rr=await Z.texto('xl/richData/richValueRel.xml');
    if(md&&rv&&rr){const rrel=await rels(Z,'xl/richData/_rels/richValueRel.xml.rels');
      const relIds=ls(xml(rr),'rel').map(e=>e.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||e.getAttribute('r:id'));
      const rvs=ls(xml(rv),'rv').map(e=>{const v=hijos(e,'v')[0];return v?+v.textContent:-1;});
      const mdx=xml(md),fut=ls(mdx,'rvb').map(e=>+e.getAttribute('i'));
      const vmb=ls(mdx,'valueMetadata')[0];
      if(vmb)hijos(vmb,'bk').forEach(bk=>{const rc=ls(bk,'rc')[0];const ri=rc?fut[+rc.getAttribute('v')]:-1;const li=ri>=0?rvs[ri]:-1;const id=li>=0?relIds[li]:null;
        VMIMG.push(id&&rrel[id]?resolver('xl/richData/richValueRel.xml',rrel[id].t):null);});}}catch(e){}
  const hojas=[];
  for(const s of ls(wbx,'sheet')){
    const rid=s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||s.getAttribute('r:id');
    const path=resolver('xl/workbook.xml',wr[rid].t);
    const txt=await Z.texto(path); if(!txt) continue;
    const d=xml(txt);
    const H={nombre:s.getAttribute('name'),celdas:new Map(),comb:[],com:new Map(),hidc:new Set(),imgs:[]};
    for(const c of ls(d,'col')) if(c.getAttribute('hidden')==='1'||c.getAttribute('hidden')==='true') for(let i=+c.getAttribute('min');i<=+c.getAttribute('max');i++) H.hidc.add(i);
    for(const c of ls(d,'c')){
      const t=c.getAttribute('t'); const v=hijos(c,'v')[0]; let val=null;
      const vm=c.getAttribute('vm');
      if(vm&&VMIMG[+vm-1]){const [r0,c0]=ref(c.getAttribute('r'));H.imgs.push({fila:r0-1,columna:c0-1,off:0,ruta:VMIMG[+vm-1],enCelda:true});continue;}
      if(t==='s'&&v) val=ss[+v.textContent];
      else if(t==='inlineStr') val=ls(c,'t').map(x=>x.textContent).join('');
      else if(v) val=v.textContent;
      if(val==null) continue;
      const [r,cc]=ref(c.getAttribute('r'));
      H.celdas.set(r+','+cc,{r,c:cc,v:val,num:!(t==='s'||t==='inlineStr'||t==='str'||t==='b'||t==='e'),fmt:fmt(c.getAttribute('s'))});
    }
    for(const m of ls(d,'mergeCell')){const [a,b]=m.getAttribute('ref').split(':');if(!b)continue;const [r1,c1]=ref(a),[r2,c2]=ref(b);H.comb.push([r1,c1,r2,c2]);}
    const relPath=path.replace(/worksheets\/([^/]+)$/,'worksheets/_rels/$1.rels');
    const sr=await rels(Z,relPath);
    const legacy=[],thr=[],dib=[];
    for(const k in sr){const x=sr[k];if(/\/comments$/.test(x.type))legacy.push(x.t);else if(/threadedComment$/.test(x.type))thr.push(x.t);else if(/\/drawing$/.test(x.type))dib.push(x.t);}
    for(const t of legacy){const s2=await Z.texto(resolver(path,t));if(!s2)continue;
      for(const cm of ls(xml(s2),'comment')){const k=ref(cm.getAttribute('ref')).join(',');const tx=ls(cm,'t').map(x=>x.textContent).join('').trim();
        if(tx.startsWith('[Comentario encadenado]')&&H.com.has(k))continue;H.com.set(k,tx);}}
    for(const t of thr){const s2=await Z.texto(resolver(path,t));if(!s2)continue;
      for(const tc of hijos(xml(s2).documentElement,'threadedComment')){if(tc.getAttribute('parentId'))continue;
        H.com.set(ref(tc.getAttribute('ref')).join(','),tc.textContent.trim());}}
    if(opc.imagenes) for(const t of dib){
      const dp=resolver(path,t); const s2=await Z.texto(dp); if(!s2) continue;
      const dr=await rels(Z,dp.replace(/drawings\/([^/]+)$/,'drawings/_rels/$1.rels'));
      for(const an of [...ls(xml(s2),'twoCellAnchor'),...ls(xml(s2),'oneCellAnchor'),...ls(xml(s2),'absoluteAnchor')]){
        const fr=ls(an,'from')[0]; const fila=fr?+ls(fr,'row')[0].textContent:999, columna=fr?+ls(fr,'col')[0].textContent:0, off=fr&&ls(fr,'rowOff')[0]?+ls(fr,'rowOff')[0].textContent:0;
        for(const bl of ls(an,'blip')){const id=bl.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');
          if(id&&dr[id]) H.imgs.push({fila,columna,off,ruta:resolver(dp,dr[id].t)});}
      }
    }
    /* Objetos incrustados (PDF, Word, etc.) */
    H.objs=[];
    if(opc.imagenes){const vistos=new Set();
      for(const o of ls(d,'oleObject')){
        const rid=o.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||o.getAttribute('r:id');
        if(!rid||vistos.has(rid)||!sr[rid])continue;vistos.add(rid);
        const fr=ls(o,'from')[0];const fila=fr&&ls(fr,'row')[0]?+ls(fr,'row')[0].textContent:999,columna=fr&&ls(fr,'col')[0]?+ls(fr,'col')[0].textContent:0;
        const op=ls(o,'objectPr')[0];const pid=op&&(op.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||op.getAttribute('r:id'));
        H.objs.push({fila,columna,ruta:resolver(path,sr[rid].t),prog:o.getAttribute('progId')||'',prev:pid&&sr[pid]?resolver(path,sr[pid].t):''});
      }
      if(H.objs.length){const prevs=new Set(H.objs.map(x=>x.prev));const pos=new Set(H.objs.map(x=>x.fila+','+x.columna));
        H.imgs=H.imgs.filter(i=>!prevs.has(i.ruta)&&!pos.has(i.fila+','+i.columna));}
    }
    hojas.push(H);
  }
  return {hojas,Z,hoja:n=>hojas.find(h=>h.nombre===n)};
}
const b64=b=>{let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));return btoa(s);};
const u32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0, u16=(b,o)=>b[o]|b[o+1]<<8, i32=(b,o)=>b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24;
/* DIB (mapa de bits de Windows) → archivo BMP o PNG/JPG embebido */
function dibAArchivo(dib){
  if(dib.length<40)return null;
  const hs=u32(dib,0),comp=u32(dib,16);
  if(hs>=40&&(comp===4||comp===5)){const off=hs;return {mime:comp===4?'image/jpeg':'image/png',bytes:dib.subarray(off)};}
  const bits=hs>=40?u16(dib,14):u16(dib,10);let col=hs>=40?u32(dib,32):0;if(!col&&bits<=8)col=1<<bits;
  const masks=(hs===40&&(comp===3||comp===6))?(comp===3?12:16):0;
  const off=14+hs+masks+col*(hs===12?3:4);
  const out=new Uint8Array(14+dib.length);out[0]=66;out[1]=77;
  const dv=new DataView(out.buffer);dv.setUint32(2,out.length,true);dv.setUint32(10,off,true);out.set(dib,14);
  return {mime:'image/bmp',bytes:out};
}
/* Imágenes EMF / WMF: se extrae el mapa de bits que contienen (capturas pegadas en Excel) */
function metaArchivoABitmap(b,ext){
  const dibs=[];
  if(ext==='emf'||u32(b,0)===1&&u32(b,40)===0x464D4520){
    let p=0;while(p+8<=b.length){const t=u32(b,p),n=u32(b,p+4);if(n<8||p+n>b.length)break;
      let ob=0,cb=0,obits=0,cbits=0;
      if(t===81||t===80){ob=u32(b,p+48);cb=u32(b,p+52);obits=u32(b,p+56);cbits=u32(b,p+60);}
      else if(t===76||t===77){ob=u32(b,p+84);cb=u32(b,p+88);obits=u32(b,p+92);cbits=u32(b,p+96);}
      if(cb&&cbits&&ob+cb<=n&&obits+cbits<=n){const d=new Uint8Array(cb+cbits);d.set(b.subarray(p+ob,p+ob+cb));d.set(b.subarray(p+obits,p+obits+cbits),cb);dibs.push(d);}
      if(t===14)break;p+=n;}
  }else{
    let p=u32(b,0)===0x9AC6CDD7?22:0;p+=u16(b,p+2)*2;
    while(p+6<=b.length){const n=u32(b,p)*2,f=u16(b,p+4);if(n<6||p+n>b.length)break;
      const at={0x0F43:28,0x0B41:26,0x0940:22}[f];if(at&&n>at+40)dibs.push(b.subarray(p+at,p+n));
      if(f===0)break;p+=n;}
  }
  if(!dibs.length)return null;
  dibs.sort((a,c)=>c.length-a.length);return dibAArchivo(dibs[0]);
}
async function aPNG(arch){
  if(arch.mime!=='image/bmp')return `data:${arch.mime};base64,`+b64(arch.bytes);
  try{const bmp=await createImageBitmap(new Blob([arch.bytes],{type:'image/bmp'}));const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;c.getContext('2d').drawImage(bmp,0,0);return c.toDataURL('image/png');}
  catch(e){return 'data:image/bmp;base64,'+b64(arch.bytes);}
}
async function imagenDataURL(Z,ruta){
  const ext=(ruta.split('.').pop()||'').toLowerCase();
  const b=await Z.leer(ruta); if(!b) return null;
  const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',webp:'image/webp',svg:'image/svg+xml'}[ext];
  if(mime) return `data:${mime};base64,`+b64(b);
  if(ext==='emf'||ext==='wmf'){const a=metaArchivoABitmap(b,ext);return a?await aPNG(a):null;}
  return null;
}
/* Archivos compuestos OLE (así guarda Excel los PDF y documentos incrustados) */
function leerCFB(b){
  const ss=1<<u16(b,30),ms=1<<u16(b,32),nFat=u32(b,44),dirIni=u32(b,48),corte=u32(b,56),mfIni=u32(b,60),difIni=u32(b,68);
  const sec=i=>512+i*ss;const difat=[];for(let i=0;i<109;i++){const v=u32(b,76+i*4);if(v<0xFFFFFFFA)difat.push(v);}
  let d=difIni,g=0;while(d<0xFFFFFFFA&&g++<1000){for(let i=0;i<ss/4-1;i++){const v=u32(b,sec(d)+i*4);if(v<0xFFFFFFFA)difat.push(v);}d=u32(b,sec(d)+ss-4);}
  const fat=[];for(const f of difat.slice(0,nFat||difat.length))for(let i=0;i<ss/4;i++)fat.push(u32(b,sec(f)+i*4));
  const cadena=(ini,tab)=>{const r=[];let x=ini,g2=0;while(x<0xFFFFFFFA&&g2++<1e6){r.push(x);x=tab[x];}return r;};
  const leerReg=(ini,tam)=>{const out=new Uint8Array(tam);let o=0;for(const s2 of cadena(ini,fat)){const n=Math.min(ss,tam-o);if(n<=0)break;out.set(b.subarray(sec(s2),sec(s2)+n),o);o+=n;}return out;};
  const dirs=[];for(const s2 of cadena(dirIni,fat))for(let i=0;i<ss/128;i++){const o=sec(s2)+i*128;const nl=u16(b,o+64);
    const nombre=String.fromCharCode(...Array.from({length:Math.max(0,nl/2-1)},(_,k)=>u16(b,o+k*2)));dirs.push({nombre,tipo:b[o+66],ini:u32(b,o+116),tam:u32(b,o+120)});}
  const raiz=dirs[0];const mini=raiz?leerReg(raiz.ini,raiz.tam):new Uint8Array(0);
  const mfat=[];if(mfIni<0xFFFFFFFA)for(const s2 of cadena(mfIni,fat))for(let i=0;i<ss/4;i++)mfat.push(u32(b,sec(s2)+i*4));
  const leerMini=(ini,tam)=>{const out=new Uint8Array(tam);let o=0;for(const s2 of cadena(ini,mfat)){const n=Math.min(ms,tam-o);if(n<=0)break;out.set(mini.subarray(s2*ms,s2*ms+n),o);o+=n;}return out;};
  return dirs.filter(x=>x.tipo===2).map(x=>({nombre:x.nombre,datos:x.tam<corte?leerMini(x.ini,x.tam):leerReg(x.ini,x.tam)}));
}
const FIRMAS=[[[0x25,0x50,0x44,0x46],'application/pdf','pdf'],[[0x50,0x4B,3,4],'application/zip','zip'],[[0x89,0x50,0x4E,0x47],'image/png','png'],[[0xFF,0xD8,0xFF],'image/jpeg','jpg'],[[0xD0,0xCF,0x11,0xE0],'application/octet-stream','bin']];
const tipoDe=b=>{for(const [f,m,e] of FIRMAS)if(f.every((x,i)=>b[i]===x))return [m,e];return ['application/octet-stream','bin'];};
const MIMEXT={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',doc:'application/msword',xls:'application/vnd.ms-excel',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
function recortarPDF(b){let ini=-1;for(let i=0;i+4<b.length&&i<4096;i++)if(b[i]===0x25&&b[i+1]===0x50&&b[i+2]===0x44&&b[i+3]===0x46){ini=i;break;}
  if(ini<0){for(let i=0;i+4<b.length;i++)if(b[i]===0x25&&b[i+1]===0x50&&b[i+2]===0x44&&b[i+3]===0x46){ini=i;break;}}
  if(ini<0)return null;let fin=b.length;for(let i=b.length-5;i>ini;i--)if(b[i]===0x25&&b[i+1]===0x25&&b[i+2]===0x45&&b[i+3]===0x4F&&b[i+4]===0x46){fin=i+5;while(fin<b.length&&(b[fin]===10||b[fin]===13))fin++;break;}
  return b.subarray(ini,fin);}
async function objetoIncrustado(Z,obj){
  const b=await Z.leer(obj.ruta);if(!b)return null;
  const ext=(obj.ruta.split('.').pop()||'').toLowerCase();let nombre='',datos=null;
  if(u32(b,0)===0xE011CFD0){
    let st=[];try{st=leerCFB(b);}catch(e){}
    for(const s2 of st){const nm=s2.nombre.replace(/[\x00-\x1f]/g,'').toLowerCase();
      if(nm==='ole10native'&&s2.datos.length>8){const q=s2.datos;let p=6;const cad=()=>{let r='';while(p<q.length&&q[p]){r+=String.fromCharCode(q[p]);p++;}p++;return r;};
        nombre=cad();cad();p+=8;cad();const n=u32(q,p);p+=4;if(n&&p+n<=q.length){datos=q.subarray(p,p+n);break;}}
      if(nm==='contents'||nm==='package'||(s2.datos[0]===0x25&&s2.datos[1]===0x50&&s2.datos[2]===0x44)){datos=s2.datos;break;}}
    if(!datos)datos=recortarPDF(b);
  }else datos=b;
  if(!datos||!datos.length)return null;
  let [mime,e]=tipoDe(datos);const en=(nombre.split('.').pop()||'').toLowerCase();
  if(MIMEXT[en])mime=MIMEXT[en];else if(e==='zip'&&MIMEXT[ext]){mime=MIMEXT[ext];e=ext;}
  if(/acro|pdf/i.test(obj.prog)&&mime!=='application/pdf'){const p=recortarPDF(datos);if(p){datos=p;mime='application/pdf';}}
  if(!nombre)nombre=(mime==='application/pdf'?'documento.pdf':'documento.'+(Object.keys(MIMEXT).find(k=>MIMEXT[k]===mime)||e));
  return {t:mime==='application/pdf'?'pdf':(mime.startsWith('image/')?'img':'arch'),n:nombre.split(/[\\/]/).pop(),m:mime,d:`data:${mime};base64,`+b64(datos)};
}
return {leerLibro,imagenDataURL,objetoIncrustado,col,ref};
})();

/* ===================== CONVERTIDOR: MATRIZ DE REQUISITOS ===================== */
const CONV_REQ=(()=>{
const gfmt=x=>{if(!isFinite(x))return String(x);if(Number.isInteger(x))return String(x);return String(parseFloat(x.toPrecision(6)));};
const clean=s=>s==null?'':String(s).replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/\u200b/g,'').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{2,}/g,'\n').trim();
const nk=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const miles=n=>String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
function disp(c){
  if(!c||c.v==null) return '';
  if(!c.num) return clean(c.v);
  const x=parseFloat(c.v); if(isNaN(x)) return clean(c.v);
  const f=c.fmt||'';
  if(f.includes('%')) return gfmt(parseFloat((x*100).toPrecision(12)))+'%';
  if(f.includes('$')) return '$ '+(x<0?'-':'')+miles(x);
  if(f.includes('#,##0')) return (x<0?'-':'')+miles(x);
  return gfmt(x);
}
const SECS=['Descripción','Canal de atención','Tipo de solicitante','Requisitos','Registro','Observaciones'];
const SEC={'DESCRIPCION':0,'CANAL DE ATENCION':1,'TIPO DE SOLICITANTE':2,'REQUISITOS':3,'REGISTRO':4,'OBSERVACIONES':5,'OBSERVACION':5};
const secDe=v=>{const k=v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/:+$/,'').trim();return k in SEC?SEC[k]:-1;};
const SKIP=/^(MACROPROCESO|PROCESO ATENCI|MATRIZ DE REQUISITOS|VERSI[OÓ]N NO|P[AÁ]GINA \d|C[OÓ]DIGO: ZPSAC)/i;
function filas(H,min){
  const R=new Map();
  for(const c of H.celdas.values()){if(c.r<min)continue;const v=disp(c);if(!v)continue;if(!R.has(c.r))R.set(c.r,[]);R.get(c.r).push({c:c.c,v,com:H.com.get(c.r+','+c.c)});}
  for(const [k,v] of H.com){const [r,c]=k.split(',').map(Number);if(r<min)continue;if(!R.has(r))R.set(r,[]);const L=R.get(r);const x=L.find(y=>y.c===c);if(!x)L.push({c,v:'',com:v});}
  return [...R.entries()].sort((a,b)=>a[0]-b[0]).map(([r,L])=>[r,L.sort((a,b)=>a.c-b.c)]);
}
function indice(H){
  const d={};if(!H)return d;
  for(const [r,L] of filas(H,8)){const v=L.filter(x=>x.v&&!SKIP.test(x.v));if(v.length>=2&&v[0].v.length<=4&&!/\s/.test(v[0].v))d[v[0].v]=v[1].v;}
  return d;
}
/* ---------- Tablas con encabezados ---------- */
function mapaComb(H){const M=new Map();H.comb.forEach(m=>{for(let r=m[0];r<=m[2];r++)for(let c=m[1];c<=m[3];c++)M.set(r+','+c,m);});return M;}
function encabezados(H,spec,minHits){
  /* devuelve [{fila, cols:{clave:[columnas]}}] para cada fila de encabezado encontrada */
  const M=mapaComb(H), out=[];
  const porFila=new Map();
  for(const c of H.celdas.values()){const v=nk(disp(c));if(!v)continue;if(!porFila.has(c.r))porFila.set(c.r,[]);porFila.get(c.r).push([c.c,v]);}
  for(const [r,L] of [...porFila.entries()].sort((a,b)=>a[0]-b[0])){
    const cols={};let hits=0;
    for(const [c,v] of L)for(const [k,kws] of Object.entries(spec)){
      if(kws.some(kw=>kw instanceof RegExp?kw.test(v):v===kw||v.startsWith(kw+' ')||v===kw+'.')){
        if(!cols[k]){hits++;cols[k]=[];}
        const m=M.get(r+','+c);const c2=m?m[3]:c;for(let x=c;x<=c2;x++)if(!cols[k].includes(x))cols[k].push(x);
        break;}}
    if(hits>=minHits) out.push({fila:r,cols});
  }
  return out;
}
function leerTabla(H,spec,minHits,req,cond){
  const EA=encabezados(H,spec,Math.min(minHits,3));
  const E=encabezados(H,spec,minHits).filter(e=>!cond||cond(e));
  const res=[];
  E.forEach(e=>{
    const sig=EA.find(x=>x.fila>e.fila);const fin=sig?sig.fila:Infinity;const T=[];
    const F=new Map();for(const c of H.celdas.values())if(c.r>e.fila&&c.r<fin)F.set(c.r+','+c.c,disp(c));
    const rows=[...new Set([...F.keys()].map(k=>+k.split(',')[0]))].sort((a,b)=>a-b);
    for(const r of rows){const o={_r:r};let n=0;
      for(const k of Object.keys(spec)){const cs=e.cols[k]||[];o[k]=cs.map(c=>F.get(r+','+c)||'').filter(Boolean).join(' | ');if(o[k])n++;}
      if(o[req]&&n>=2)T.push(o);}
    res.push({fila:e.fila,cols:e.cols,filas:T});
  });
  return res;
}
const sinR=o=>{const x={...o};delete x._r;return x;};
function lineas(H){
  const out=[];if(!H)return out;
  for(const [r,L] of filas(H,6)){const v=L.map(x=>x.v).filter(x=>x&&!SKIP.test(x));if(v.length)out.push(v.join(' '));}
  return out;
}
function grilla(H){
  if(!H)return [];
  const cel=[...H.celdas.values()].filter(c=>c.r>=6&&disp(c)&&!SKIP.test(disp(c)));
  if(!cel.length)return [];
  const r1=Math.min(...cel.map(c=>c.r)),r2=Math.max(...cel.map(c=>c.r));
  const cols=[...new Set(cel.map(c=>c.c))].sort((a,b)=>a-b);
  const M=mapaComb(H);const val=new Map(cel.map(c=>[c.r+','+c.c,disp(c)]));
  const G=[];
  for(let r=r1;r<=r2;r++){const fila=[];
    for(const c of cols){const m=M.get(r+','+c);
      if(m&&(m[0]!==r||m[1]!==c)){if(m[0]<r1&&r===r1&&m[1]===c){}else continue;}
      if(m){const rs=Math.min(m[2],r2)-r+1,cs=cols.filter(x=>x>=m[1]&&x<=m[3]).length;fila.push([val.get(m[0]+','+m[1])||'',rs,cs]);}
      else fila.push([val.get(r+','+c)||'',1,1]);}
    G.push(fila);}
  return G;
}
async function convertir(buf,nombreArchivo,prog){
  prog&&prog('Leyendo el archivo…');
  const L=await XL.leerLibro(buf,{imagenes:true});
  const avisos=[];
  const porNombre=n=>L.hojas.find(h=>nk(h.nombre).replace(/\s/g,'')===n.replace(/\s/g,''));
  if(!porNombre('pedidos')||!porNombre('peticiones')||!L.hojas.some(h=>[...h.celdas.values()].slice(0,40).some(c=>/ZPSAC001/.test(c.v))))
    throw new Error('Este archivo no parece ser la Matriz de requisitos (ZPSAC001). Verifique que eligió el archivo correcto.');
  let version='';for(const h of L.hojas){for(const c of h.celdas.values())if(/^Versi[oó]n No/i.test(String(c.v).trim())){version=disp(c);break;}if(version)break;}
  prog&&prog('Organizando los trámites…');
  const NP=indice(porNombre('pedidos')),NT=indice(porNombre('peticiones'));
  const tieneDesc=H=>[...H.celdas.values()].some(c=>!c.num&&secDe(clean(c.v))===0);
  const TR=[],IMGTR={};
  for(const H of L.hojas){
    const esQRR=['Queja','Reclamo','Recurso'].includes(H.nombre);
    if(!(H.nombre in NP||H.nombre in NT||esQRR)||!tieneDesc(H))continue;
    const t=H.nombre in NP?'Pedido':H.nombre in NT?'Petición':H.nombre;
    const n=NP[H.nombre]||NT[H.nombre]||H.nombre;
    let p='';for(const c of [...H.celdas.values()].sort((a,b)=>a.r-b.r||a.c-b.c))if(String(c.v).startsWith('Página')){p=disp(c);break;}
    const s=SECS.map(()=>[]);let sec=-1;
    /* Imágenes de contenido (columna E en adelante; las de columnas A-D son íconos decorativos) en su posición original */
    const ci=esQRR?[]:H.imgs.filter(i=>i.columna>=4&&i.fila>=7).sort((a,b)=>a.fila-b.fila||(a.off||0)-(b.off||0));let ii=0;const rutas=[];
    const pon=i=>{s[sec<0?0:sec].push('\u0001IMG:'+rutas.length);rutas.push(i.ruta);};
    for(const [r,Lr] of filas(H,8)){
      const vals=Lr.map(x=>x.v).filter(v=>v&&!SKIP.test(v));
      const txt=vals.join(' ');
      while(ii<ci.length&&(ci[ii].fila+1<r||(ci[ii].fila+1===r&&vals.length&&(ci[ii].off||0)<76200&&!/:\s*$/.test(txt))))pon(ci[ii++]);
      if(vals.length){
        const tit=vals.map(secDe);
        if(vals.length===1&&tit[0]>=0)sec=tit[0];
        else if(!(vals.length>=2&&tit.every(x=>x>=0))){if(sec<0)sec=0;s[sec].push(txt);} // omite filas de títulos horizontales
      }
      while(ii<ci.length&&ci[ii].fila+1<=r)pon(ci[ii++]);
    }
    while(ii<ci.length)pon(ci[ii++]);
    if(rutas.length){const U=[];for(const ru of rutas){let u=null;try{u=await XL.imagenDataURL(L.Z,ru);}catch(e){}U.push(u||'');}
      for(const arr of s)for(let j=arr.length-1;j>=0;j--){const m=/^\u0001IMG:(\d+)$/.exec(arr[j]);if(m&&!U[+m[1]])arr.splice(j,1);}
      if(U.some(Boolean))IMGTR['REQ '+H.nombre]=U;}
    TR.push({c:H.nombre,t,n,p,s});
  }
  for(const k of Object.keys(NP).concat(Object.keys(NT)))if(!TR.some(x=>x.c===k)&&!/^(AA|BB|CC)$/.test(k))avisos.push(`El índice menciona el trámite ${k} pero no se encontró su hoja con secciones.`);
  if(TR.length<10) throw new Error('No se pudieron leer los trámites del archivo (se encontraron '+TR.length+').');
  const MATRIZ={version:version||'Versión no identificada',origen:nombreArchivo||'',fecha:new Date().toISOString().slice(0,10),secciones:SECS,tramites:TR};
  /* ---------- Información general ---------- */
  prog&&prog('Organizando la información general…');
  const G={};const otras=L.hojas.filter(h=>!TR.some(t=>t.c===h.nombre));
  const busca=(spec,min,req,cond)=>{for(const H of otras){const T=leerTabla(H,spec,min,req,cond);if(T.length&&T.some(x=>x.filas.length))return {H,T};}return null;};
  let x=busca({dep:['departamento'],zona:['zona'],mun:['municipio'],prest:['prestador del servicio'],nom:['nombre'],dir:['direccion'],tel:['telefono'],cel:['celular'],mail:['correo institucional','correo']},6,'mun');
  if(x){const T=x.T[0];G.ap=T.filas.map(sinR);G.apNotas={};for(const o of T.filas)for(const [k,v] of x.H.com){const [r]=k.split(',').map(Number);if(r===o._r)G.apNotas[o.mun]=clean(v);}}
  x=busca({emp:['empresa'],dir:['direccion'],tel:['telefono'],cont:['contacto'],mail:['correo electronico','correo'],port:['portafolio']},5,'emp',e=>e.cols.port);
  if(x)G.essaCasa=x.T.filter(t=>t.cols.port).flatMap(t=>t.filas).map(sinR);
  x=busca({emp:['empresa'],dir:['direccion'],tel:['telefono'],cont:['contacto'],mail:['correo electronico','correo'],mun:['municipio',/^municipio/]},5,'emp',e=>e.cols.mun&&!e.cols.port);
  if(x)G.aseo=x.T.filter(t=>t.cols.mun&&!t.cols.port).flatMap(t=>t.filas).map(sinR);
  x=busca({zona:['zona'],mun:['municipio'],ejec:['ejecutivo']},3,'mun');
  if(x)G.rel=x.T[0].filas.map(sinR);
  x=busca({cta:['cuenta padre ap',/^cuenta padre/],mun:['municipio'],dpto:['dpto','departamento'],dir:['direccion'],tel:['telefono']},4,'mun',e=>e.cols.cta);
  if(x)G.adm=x.T[0].filas.map(sinR);
  x=busca({cta:['cuenta'],nit:['nit'],otc:['otc'],tel:['telefono'],dir:['direccion'],ciu:['ciudad'],dep:['departamento']},4,'otc',e=>e.cols.otc&&e.cols.cta);
  if(x)G.otc=x.T[0].filas.map(sinR);
  for(const H of otras){const E=encabezados(H,{marca:['marca'],modelo:['modelo']},2);if(!E.length)continue;
    const r0=E[0].fila;const ms=[],mo=[];for(const c of H.celdas.values())if(c.r===r0){const v=nk(disp(c));if(v==='marca')ms.push(c.c);if(v==='modelo')mo.push(c.c);}
    ms.sort((a,b)=>a-b);mo.sort((a,b)=>a-b);const F=new Map();for(const c of H.celdas.values())if(c.r>r0)F.set(c.r+','+c.c,disp(c));
    const rows=[...new Set([...F.keys()].map(k=>+k.split(',')[0]))].sort((a,b)=>a-b);G.medidores=[];
    for(const r of rows)ms.forEach((c,i)=>{const a=F.get(r+','+c)||'',b=F.get(r+','+(mo[i]||c+1))||'';if(a||b)G.medidores.push({marca:a,modelo:b});});break;}
  x=busca({desc:['descripcion'],und:['unidad'],val:['valor unitario']},3,'desc');
  if(x){G.costos=[];let cat='';
    const T=x.T[0],F=new Map();for(const c of x.H.celdas.values())if(c.r>T.fila)F.set(c.r+','+c.c,disp(c));
    const rows=[...new Set([...F.keys()].map(k=>+k.split(',')[0]))].sort((a,b)=>a-b);
    const g=(r,k)=>(T.cols[k]||[]).map(c=>F.get(r+','+c)||'').filter(Boolean).join(' | ');
    for(const r of rows){const d=g(r,'desc'),u=g(r,'und'),v=g(r,'val');if(!d)continue;if(!u){cat=d;continue;}G.costos.push({cat,desc:d,und:u,val:v});}}
  const hojaN=re=>otras.find(h=>re.test(nk(h.nombre)));
  const sit=lineas(hojaN(/^sitios de menor/));if(sit.length)G.sitios=sit.slice(1);
  const a1=lineas(hojaN(/^anexo 1$/));if(a1.length)G.anexo1=a1;
  const a3=lineas(hojaN(/^anexo 3$/));if(a3.length)G.anexo3=a3;
  const fi=grilla(hojaN(/^condiciones ?financiacion/));if(fi.length)G.financ=fi;
  const as=grilla(hojaN(/^asentamientosbga/));if(as.length)G.asent=as;
  G.version=MATRIZ.version;
  /* ---------- Imágenes ---------- */
  prog&&prog('Extrayendo imágenes y documentos de las hojas de apoyo…');
  const IMG={};let noSoportadas=0,docs=0;
  const conDatos=['ap','essaCasa','aseo','rel','adm','otc','medidores','costos'];
  for(const H of otras){
    if(/^(inicio|pedidos|peticiones|aa|bb|cc|informacion general)$/.test(nk(H.nombre)))continue;
    const elem=[...H.imgs.filter(i=>i.fila>=6).map(i=>({...i,k:'i'})),...(H.objs||[]).filter(o=>o.fila>=5).map(o=>({...o,k:'o'}))]
      .sort((a,b)=>a.fila-b.fila||a.columna-b.columna);
    const L2=[];const vistos=new Set();
    for(const i of elem){
      if(i.k==='i'){const u=await XL.imagenDataURL(L.Z,i.ruta);if(u){if(!vistos.has(u)){vistos.add(u);L2.push(u);}}else noSoportadas++;}
      else{let o=null;try{o=await XL.objetoIncrustado(L.Z,i);}catch(e){}if(o){L2.push(o);docs++;}else noSoportadas++;}
    }
    if(L2.length)IMG[H.nombre]=L2;
  }
  Object.assign(IMG,IMGTR);
  if(Object.keys(IMGTR).length)avisos.push(Object.values(IMGTR).reduce((a,v)=>a+v.filter(Boolean).length,0)+' imagen(es) dentro de los requisitos de los trámites, en su posición original.');
  if(docs)avisos.push(docs+' documento(s) incrustado(s) (PDF u otros) incluidos en el aplicativo.');
  if(noSoportadas)avisos.push(noSoportadas+' imagen(es) u objeto(s) no se pudieron convertir (formato vectorial sin imagen interna); consúltelos en el Excel original.');
  return {MATRIZ,INFOGEN:G,IMGGEN:IMG,avisos};
}
return {convertir};
})();

/* ===================== CONVERTIDOR: MATRIZ ÁRBOL DE TRANSACCIONES ===================== */
const CONV_ARBOL=(()=>{
const gfmt=x=>{if(!isFinite(x))return String(x);if(x===0)return '0';const e=Math.floor(Math.log10(Math.abs(x)));
  if(e<-4||e>=6){let m=(x/Math.pow(10,e)).toPrecision(6).replace(/\.?0+$/,'');return m+'e'+(e<0?'-':'+')+String(Math.abs(e)).padStart(2,'0');}
  return String(parseFloat(x.toPrecision(6)));};
const clean=s=>s==null?'':String(s).replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/\t/g,' ').replace(/ +/g,' ').replace(/ *\n */g,'\n').replace(/\n{2,}/g,'\n').trim();
const nk=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
function valor(c){
  if(!c.num) return c.v;
  const x=parseFloat(c.v); if(isNaN(x)) return c.v;
  if(c.fmt.includes('%')) return gfmt(x*100)+'%';
  return Number.isInteger(x)?String(x):gfmt(x);
}
/* Hoja "rellenada": el valor de cada celda combinada se repite en todo su rango */
function rellenar(H){
  const G=new Map(),F=new Map(),O=new Map();let mr=0,mc=0;
  for(const c of H.celdas.values()){const v=clean(valor(c));if(v===''&&String(c.v).trim()==='')continue;G.set(c.r+','+c.c,v);F.set(c.r+','+c.c,v);if(c.r>mr)mr=c.r;if(c.c>mc)mc=c.c;}
  H.comb.forEach((m,i)=>{const [r1,c1,r2,c2]=m;const v=G.get(r1+','+c1)||'';for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++){F.set(r+','+c,v);O.set(r+','+c,i);}});
  return {G:(r,c)=>G.get(r+','+c)||'',F:(r,c)=>F.get(r+','+c)||'',O:(r,c)=>O.has(r+','+c)?O.get(r+','+c):null,mr,mc,com:H.com,H};
}
const uniq=a=>{const o=[];for(const x of a)if(x&&!o.includes(x))o.push(x);return o;};
const jn=(a,s='\n')=>uniq(a).join(s);
const nombre=d=>(d.slice(0,120).includes(':')?d.split(':')[0].trim():d);
function filaNota(S,ini){for(let r=ini;r<=S.mr;r++)if(S.F(r,2).startsWith('Nota:'))return r;return S.mr+1;}
function notasFila(S,r){const o=[];for(const [k,t] of S.com){const [rr,c]=k.split(',').map(Number);if(rr===r)o.push(XL.col(c)+': '+clean(t));}return o.join('\n');}
const MODOS={'accede':'Accede','no accede':'No accede','archiva':'Archiva','accede imputable':'Accede imputable','accede no imputable':'Accede no imputable',
 'accede parcialmente imputable':'Accede parcialmente imputable','accede parcialmente no imputable':'Accede parcialmente no imputable','no accede no imputable':'No accede no imputable',
 'archiva no imputable':'Archiva no imputable','modifica - revoca':'Modifica - Revoca','rechaza':'Rechaza','confirma (causa final del reclamo inicial)':'Confirma (causa final del reclamo inicial)'};
const modo=t=>{const k=nk(t);return MODOS[k]||(t.charAt(0).toUpperCase()+t.slice(1));};
/* Identifica el campo según el título del encabezado */
function campo(t){
  const n=nk(t);
  if(n.startsWith('tipo de proceso'))return 'Tipo proceso';
  if(n==='proceso'||n.startsWith('proceso homologado'))return 'Proceso';
  if(n.startsWith('proceso antiguo'))return 'Proceso antiguo (columna oculta en el original)';
  if(n.startsWith('causa inicial')||n==='descripcion')return 'Descripción';
  if(n.startsWith('canal o equipo'))return 'Canal o equipo de trabajo';
  if(n.startsWith('canal de atencion'))return 'Canal de atención';
  if(n.startsWith('canal'))return 'Canal';
  if(n.startsWith('observacion'))return 'Observación';
  if(n.startsWith('clasificacion'))return 'Clasificación';
  if(n.startsWith('tipo de respuesta')||n.startsWith('tipo respuesta'))return 'Tipo de respuesta';
  if(n.startsWith('formatos'))return 'Formatos';
  if(n.startsWith('exento de suspension'))return 'Exento de suspensión';
  if(n.startsWith('reporte al sui'))return 'Reporte al SUI';
  if(n.startsWith('aplica recurso'))return 'Aplica recurso de Ley';
  if(n.startsWith('ans para la solicitud'))return 'ANS solicitud insumo';
  if(n.startsWith('ans para la entrega'))return 'ANS entrega insumo';
  if(n.startsWith('ans'))return 'ANS';
  if(n.startsWith('revision (retiro'))return 'Revisión (retiro de medidor y/o sellos)';
  if(n.startsWith('revision (atc'))return 'Revisión (ATC y/o F>1)';
  if(n.startsWith('prioridad'))return 'Prioridad o responsable de insumos';
  if(n.startsWith('tipo de dano'))return 'Tipo de daño';
  return null;
}
/* Analiza los encabezados de una hoja de procesos */
function esquema(S){
  let h=0;for(let r=1;r<=Math.min(S.mr,15)&&!h;r++)for(let c=1;c<=4;c++)if(nk(S.F(r,c)).startsWith('tipo de proceso')||nk(S.F(r,c)).startsWith('tipo de dano')){h=r;break;}
  if(!h) throw new Error('No se encontró el encabezado "Tipo de Proceso" en la hoja '+S.H.nombre);
  const campos={},causas=[],subs=[],resp=[];let pc=0;
  // columna del código de proceso
  for(let c=1;c<=S.mc;c++){const f=campo(S.F(h,c));if(f==='Proceso'||(f==='Tipo de daño'&&!pc)){pc=c;break;}}
  let ini=h+1;while(ini<=S.mr&&!/^\d+$/.test(S.F(ini,pc)))ini++;
  for(let c=2;c<=S.mc;c++){
    const top=S.F(h,c), n=nk(top);
    // subprocesos: columnas con código numérico en la zona de encabezados
    let cr=0;for(let r=h;r<ini;r++)if(/^\d{3,5}$/.test(S.F(r,c))&&S.O(r,c)===null){cr=r;break;}
    if(cr&&!campo(top)){subs.push({c,cr,nr:cr-1});continue;}
    if(n.startsWith('causa final')||(!top&&causas.length&&causas[causas.length-1].c===c-1&&MODOS[nk(clean(S.F(h+1,c)).replace(/\n/g,' '))])){causas.push({c,k:modo(clean(S.F(h+1,c)).replace(/\n/g,' ').replace(/ +/g,' '))});continue;}
    if(n.startsWith('responsable')){
      const sub=nk(S.F(h+1,c));
      if(S.O(h,c)!==null&&sub&&sub!==n){const zona=/norte/.test(sub)?' Norte':/sur/.test(sub)?' Sur':'';
        if(sub.startsWith('nombre'))resp.push({c,k:'Responsable'+zona});else if(sub.startsWith('usuario'))resp.push({c,k:'Usuario SAC'+zona});}
      else campos['Responsable']=campos['Responsable']||c;
      continue;
    }
    let f=campo(top); if(!f&&!top) f=campo(S.F(h+1,c));
    if(f==='Tipo de daño'){if(!campos[f])campos[f]=c;else if(!campos['Nombre tipo de daño'])campos['Nombre tipo de daño']=c;continue;}
    if(f&&!campos[f])campos[f]=c;
  }
  return {h,ini,pc,campos,causas,subs,resp};
}
function hojaProcesos(S,tipo,SUB,huerfanas){
  const E=esquema(S), fin=filaNota(S,E.ini), filas=[];
  const nomSub={};
  for(const s of E.subs){const code=S.F(s.cr,s.c),nm=S.F(s.nr,s.c);nomSub[s.c]=[code,nm];
    const cm=S.com.get(s.nr+','+s.c)||S.com.get(s.cr+','+s.c);SUB.push([S.H.nombre,code,nm,clean(cm||'')]);}
  const pares=[];for(const r of E.resp)if(r.k.startsWith('Responsable')){const u=E.resp.find(x=>x.k==='Usuario SAC'+r.k.slice(11));pares.push([r.k,u?u.k:null,r.c,u?u.c:null]);}
  for(let r=E.ini;r<fin;r++){
    let algo=false;for(let c=2;c<=S.mc;c++)if(S.F(r,c)){algo=true;break;}
    if(!algo)continue;
    const rec={'Hoja':S.H.nombre,'Tipo PQR':tipo,'Fila origen':r};
    for(const [k,c] of Object.entries(E.campos))rec[k]=S.F(r,c);
    for(const x of E.causas)rec['§'+x.k]=S.F(r,x.c);
    if(E.subs.length){const L=[];for(const s of E.subs){const v=S.F(r,s.c);if(!v)continue;const [code,nm]=nomSub[s.c];let ex=v;if(ex.startsWith(code))ex=ex.slice(code.length).trim();L.push(`${code} - ${nm}`+(ex?` (${ex})`:''));}rec['Subprocesos SAC']=L.join('\n');}
    for(const [kn,ku,cn,cu] of pares){let n=S.F(r,cn),u=cu?S.F(r,cu):'';if(cu&&S.O(r,cn)!==null&&S.O(r,cn)===S.O(r,cu))u='';rec[kn]=n;if(ku)rec[ku]=u;}
    rec['Notas (comentarios de celda)']=notasFila(S,r);
    if(huerfanas&&!rec['Proceso']&&filas.length){const prev=filas[filas.length-1];
      for(const [k,v] of Object.entries(prev))if(!k.startsWith('§')&&k!=='Fila origen'&&k!=='Notas (comentarios de celda)'&&!rec[k])rec[k]=v;
      rec['Notas (comentarios de celda)']=(rec['Notas (comentarios de celda)']?rec['Notas (comentarios de celda)']+'\n':'')+`Fila ${r}: en el original está fuera de la celda combinada del proceso; se asigna al proceso de la fila anterior (${prev['Proceso']}).`;}
    filas.push(rec);
  }
  return filas;
}
function splitc(t){const o=[];for(let ln of t.split('\n')){ln=ln.trim();if(!ln)continue;
  if(o.length&&!/^\d+\s*[.\-]/.test(ln)&&!ln.toLowerCase().startsWith('no aplica'))o[o.length-1]+=' '+ln;else o.push(ln);}return o;}
function definiciones(S){
  const D=[];if(!S)return D;
  for(let h=1;h<=Math.min(S.mr,12);h++)for(let c=1;c<=S.mc;c++){
    if(!nk(S.F(h,c)).startsWith('definicion de causa final'))continue;
    const cc=c-1,cs=c-3,m=/no imput/.test(nk(S.F(h-1,c)))?'Accede no imputable':'Accede imputable';
    for(let r=h+1;r<=S.mr;r++){const cau=S.F(r,cc);if(!cau||!S.F(r,cs))continue;
      D.push({Proceso:S.F(r,cs),Causa:cau,Def:S.F(r,c),Modo:m,Fila:r,Nota:clean(S.com.get(r+','+cc)||'')});}
  }
  return D;
}
/* Listas por región (hojas ATC y Mantenimiento terceros Sur) */
function lista(S,obs){
  const cols=[];for(let c=1;c<=S.mc;c++){for(let r=3;r<=8;r++)if(/^(Región|Metropolitana)/.test(S.G(r,c))){cols.push(c);break;}}
  let oc=0;if(obs)for(let c=1;c<=S.mc;c++)for(let r=3;r<=6;r++)if(nk(S.G(r,c)).startsWith('observaciones'))oc=c;
  const out=[];
  for(const cB of cols){let reg='',resp='',usr='',sec='',tabla=false;const cC=cB+1;
    for(let r=4;r<=S.mr;r++){
      const t=clean(S.G(r,cB));if(!t)continue;
      if(/^(Región|Metropolitana)/.test(t)){reg=t;resp=usr='';sec='';tabla=false;continue;}
      if(reg&&!resp&&t.includes(':')){const i=t.lastIndexOf(':');resp=t.slice(0,i).trim();usr=t.slice(i+1).trim().replace(/^[()]+|[()]+$/g,'').trim();continue;}
      if(/^(CORREGIMIENTOS|LIMITROFES|LIMÍTROFES|ALGUNOS CICLOS)/i.test(t)){sec=t;tabla=false;continue;}
      if(['LUGAR','MUNICIPIO'].includes(t.toUpperCase().trim())){tabla=true;continue;}
      let cic='';if((tabla&&S.O(r,cB)!==S.O(r,cC))||(tabla&&S.O(r,cB)===null))cic=S.F(r,cC);
      out.push([S.H.nombre,reg,resp,usr,sec,t,cic,oc?S.F(r,oc):'',r]);
    }}
  return {out,cols};
}
function tabla(S,clave){
  let hr=0;for(let r=1;r<=Math.min(S.mr,15)&&!hr;r++)for(let c=1;c<=S.mc;c++)if(clave.includes(nk(S.F(r,c)))){hr=r;break;}
  if(!hr)return [];
  const hdr=[];for(let c=2;c<=S.mc;c++)if(S.F(hr,c))hdr.push([c,S.F(hr,c)]);
  const rows=[];for(let r=hr+1;r<=S.mr;r++){const rec={};let algo=false;for(const [c,h] of hdr){rec[h]=S.F(r,c);if(rec[h])algo=true;}if(algo){rec['Fila origen']=r;rows.push(rec);}}
  return rows;
}
const ORDER=['Tipo proceso','Proceso antiguo (columna oculta en el original)','Canal','Canal de atención','Canal o equipo de trabajo','Clasificación','Observación','Tipo de respuesta','Formatos','Exento de suspensión','Reporte al SUI','Aplica recurso de Ley','Revisión (retiro de medidor y/o sellos)','Revisión (ATC y/o F>1)','ANS','ANS solicitud insumo','ANS entrega insumo','Subprocesos SAC','Prioridad o responsable de insumos','Responsable','Usuario SAC','Responsable Norte','Usuario SAC Norte','Responsable Sur','Usuario SAC Sur','Notas (comentarios de celda)'];
const LBL={'Proceso antiguo (columna oculta en el original)':'Proceso antiguo','Notas (comentarios de celda)':'Notas del Excel','Revisión (retiro de medidor y/o sellos)':'Revisión retiro de medidor y/o sellos','Revisión (ATC y/o F>1)':'Revisión ATC y/o F>1','ANS solicitud insumo':'ANS solicitud del insumo','ANS entrega insumo':'ANS entrega del insumo'};
const lbl=c=>LBL[c]||c;

async function convertir(buf,nombreArchivo){
  const L=await XL.leerLibro(buf);
  const avisos=[];
  const porNombre=n=>L.hojas.find(h=>nk(h.nombre).replace(/\s/g,'')===n);
  const req=['quejas','peticiones','reclamos'];
  if(!req.every(porNombre)||!L.hojas.some(h=>[...h.celdas.values()].slice(0,60).some(c=>/ZPSAC003/.test(c.v))))
    throw new Error('Este archivo no parece ser la Matriz árbol de transacciones (ZPSAC003). Verifique que eligió el archivo correcto.');
  let version='';for(const h of L.hojas){for(const c of h.celdas.values())if(/^Versi[oó]n No/i.test(String(c.v).trim())){version=clean(c.v);break;}if(version)break;}
  const S={};for(const h of L.hojas)S[h.nombre]=rellenar(h);
  const hoja=n=>{const h=porNombre(n);return h?S[h.nombre]:null;};
  const SUB=[];const P={};
  const procs=[['Q','quejas','Queja'],['P','peticiones','Petición'],['R','reclamos','Reclamo'],['RRr','recursosreposicion','Recurso de reposición'],['RRa','recursosapelacion','Recurso de apelación']];
  for(const [k,n,t] of procs){const s=hoja(n);if(!s){avisos.push('No se encontró la hoja '+t);P[k]=[];continue;}
    try{P[k]=hojaProcesos(s,t,SUB,true);}catch(e){avisos.push(e.message);P[k]=[];}}
  P.RR=P.RRr.concat(P.RRa);
  const simples=[['PH','pedidoshomologado','Pedido (homologado)'],['PI','pedidosinactivos','Pedido (inactivo)'],['SG','sugerencias','Sugerencia'],['PIN','procesosinternos','Proceso interno'],['DA','danos','Daño']];
  for(const [k,n,t] of simples){const s=hoja(n);if(!s){avisos.push('No se encontró la hoja '+t);P[k]=[];continue;}
    try{const tmp=[];P[k]=hojaProcesos(s,t,tmp,false);}catch(e){avisos.push(e.message);P[k]=[];}}
  for(const r of P.DA){delete r['Subprocesos SAC'];}
  // Causas finales
  const DEF=definiciones(hoja('definicioncausasfinales'));
  const nkk=s=>s.toLowerCase().replace(/\s+/g,' ').trim(), nonum=s=>nkk(s).replace(/^\d+\s*\.\s*/,'');
  const FAV=['Accede imputable','Accede no imputable','Accede parcialmente imputable','Accede parcialmente no imputable'],UNF=['No accede no imputable'];
  const CA={};
  for(const rows of [P.P,P.R,P.RR]){
    const agg=new Map();
    for(const rec of rows){
      const esR=rec['Tipo PQR']==='Reclamo';
      const modos={};for(const k of Object.keys(rec))if(k.startsWith('§'))modos[k.slice(1)]=splitc(rec[k]);
      for(const [m,cs] of Object.entries(modos))for(const c of cs){
        const key=[rec['Tipo PQR'],rec['Proceso'],m,c].join('\u0001');
        if(!agg.has(key))agg.set(key,{t:rec['Tipo PQR'],p:rec['Proceso'],m,c,desc:rec['Descripción']||'',opp:[]});
        const a=agg.get(key);
        if(esR){const otros=FAV.includes(m)?UNF:(UNF.includes(m)?FAV:[]);for(const om of otros)a.opp.push(...(modos[om]||[]));}
      }
    }
    for(const a of agg.values()){
      let tr=a.m,imp='';const mm=/^(Accede parcialmente|Accede|No accede|Archiva)\s*(no imputable|imputable)?$/.exec(a.m);
      if(mm&&a.t==='Reclamo'){tr=mm[1];imp=mm[2]||'';}
      let d='',dn='';
      if(a.t==='Reclamo'&&(a.m==='Accede imputable'||a.m==='Accede no imputable')){
        let cand=DEF.filter(x=>x.Proceso===a.p&&x.Modo===a.m&&nkk(x.Causa)===nkk(a.c));
        if(!cand.length){cand=DEF.filter(x=>x.Proceso===a.p&&x.Modo===a.m&&nonum(x.Causa)===nonum(a.c));
          if(cand.length)dn=`Definición tomada de '${cand[0].Causa}' (mismo texto, número distinto en la hoja DefiniciónCausasFinales)`;}
        if(cand.length){d=cand[0].Def;dn=[dn,cand[0].Nota].filter(Boolean).join('\n');}
      }
      const k=a.t+'\u0001'+a.p;(CA[k]=CA[k]||[]).push([a.m,tr,a.t==='Reclamo'?imp:'',a.c,jn(a.opp),d,dn]);
    }
  }
  const subdesc={};for(const [h,c,n,d] of SUB)if(c&&!subdesc[c])subdesc[c]=[n,d];
  const PROC=[];
  for(const k of ['Q','P','R','RR','PH','PI','SG','PIN','DA']){
    const grupos=new Map();
    for(const r of P[k]){const key=r['Tipo PQR']+'\u0001'+(r['Proceso']||r['Tipo de daño']||'');if(!grupos.has(key))grupos.set(key,[]);grupos.get(key).push(r);}
    for(const [key,g] of grupos){
      const g0=g[0];const p=key.split('\u0001')[1];
      const keys=ORDER.filter(c=>g.some(r=>c in r));
      const cons=[];let vari=[];
      for(const c of keys){const vals=g.map(r=>r[c]||'');if(new Set(vals).size===1){if(vals[0])cons.push([lbl(c),vals[0]]);}else vari.push(c);}
      let rows=[];
      for(const r of g){const row=vari.map(c=>r[c]||'');if(row.some(Boolean)&&!rows.some(x=>x.join('\u0001')===row.join('\u0001')))rows.push(row);}
      const esD='Nombre tipo de daño' in g0;
      const nm=g0['Nombre tipo de daño']||nombre(g0['Descripción']||'');
      const desc=esD?'':(g0['Descripción']||'');
      let consF=cons;
      if(esD){vari=['Clasificación','Descripción'].concat(vari.filter(c=>c!=='Clasificación'&&c!=='Descripción'));rows=g.map(r=>vari.map(c=>r[c]||''));consF=cons.filter(x=>x[0]!=='Clasificación');}
      const subs=[...new Set(g.flatMap(r=>(r['Subprocesos SAC']||'').split('\n')).map(s=>(/^(\d+)/.exec(s)||[])[1]).filter(Boolean))].sort();
      PROC.push({t:g0['Tipo PQR'],c:p,n:nm,d:desc,g:consF,vc:vari.map(lbl),vr:rows,ca:CA[g0['Tipo PQR']+'\u0001'+p]||[],sd:subs.map(s=>[s].concat(subdesc[s]||['',''])),h:g0['Hoja']});
    }
  }
  // Responsables
  const R={ci:[],mto:[],atc:[],atcNotas:[],rce:[],mt:[],tr:[]};
  const ci=hoja('insumoscontratointegral');
  if(ci){let hh=0;for(let r=1;r<=15&&!hh;r++)for(let c=1;c<=ci.mc;c++)if(nk(ci.F(r,c))==='ciclo'){hh=r;break;}
    if(hh)for(let s=1;s<=ci.mc;s++){if(nk(ci.F(hh,s))!=='ciclo')continue;const resp=ci.F(hh-2,s),usr=ci.F(hh-1,s),zona=ci.F(hh,s+2);
      for(let r=hh+1;r<=ci.mr;r++){const cic=ci.F(r,s),cant=ci.F(r,s+1),sec=ci.F(r,s+2);if(cic||sec)R.ci.push([cic,cant,zona,sec,resp,usr,r]);}}}
  const mto=hoja('insumosmantenimiento');
  if(mto){let hh=0;for(let r=1;r<=15&&!hh;r++)for(let c=1;c<=mto.mc;c++)if(nk(mto.F(r,c)).startsWith('circuito o linea')){hh=r;break;}
    if(hh)for(let c=1;c<=mto.mc;c++){if(!nk(mto.F(hh,c)).startsWith('circuito o linea'))continue;
      const h=mto.F(hh-2,c),parts=h.split(/\s+-\s+|\n/);const nm=parts.length>1?parts[0].trim():h,us=parts.length>1?parts[parts.length-1].trim():'';const z=mto.F(hh-1,c);
      const pc=nk(mto.F(hh,c+1)).startsWith('profesional')?c+1:0;
      for(let r=hh+1;r<=mto.mr;r++){const v=mto.F(r,c);if(v)R.mto.push([v,z,nm,us,pc?mto.F(r,pc):'',r]);}}}
  const atcH=[porNombre('insumosatcpqr')].concat(L.hojas.filter(h=>/^atc/.test(nk(h.nombre)))).filter(Boolean);
  for(const h of atcH){const s=S[h.nombre];const {out,cols}=lista(s,false);R.atc.push(...out);
    if(nk(h.nombre).startsWith('atcproyectos')){const lim=Math.max(...cols,0)+3;
      const cs=[...s.H.celdas.values()].filter(c=>c.c>=lim&&c.r>3).sort((a,b)=>a.r-b.r||a.c-b.c);
      for(const c of cs){const v=clean(valor(c));if(v)R.atcNotas.push(v);}}}
  const rce=hoja('insumosrce');
  if(rce){let hh=0;for(let r=1;r<=15&&!hh;r++)for(let c=1;c<=rce.mc;c++)if(nk(rce.F(r,c)).startsWith('zona')){hh=r;break;}
    if(hh){const resp=rce.F(hh-1,2);for(let c=1;c<=rce.mc;c++){const z=rce.F(hh,c);if(!nk(z).startsWith('zona'))continue;for(let r=hh+1;r<=rce.mr;r++){const v=rce.F(r,c);if(v)R.rce.push([z,v,resp,r]);}}}}
  const mm=hoja('mtot.tercerosmagdalenam'), metro=hoja('mtot.tercerosmetro'), sur=hoja('mtot.tercerossur');
  if(mm)for(const x of tabla(mm,['profesional']))R.mt.push(['Magdalena Medio',x['REGION']||'',x['MUNICIPIO / LOCALIDAD']||'',x['CIRCUITO']||'',x['LINEA O SUBESTACIÓN']||'',x['PROFESIONAL']||'',x['PLANEADOR']||'',x['TÉCNICO']||'',x['USUARIO SAC']||'','']);
  if(metro)for(const x of tabla(metro,['localidad']))R.mt.push(['Metropolitana','',x['LOCALIDAD']||'',x['NOMBRE']||x['CIRCUITO']||'','','','',x['TECNICO']||'',x['USUARIO']||'','']);
  if(sur)for(const a of lista(sur,true).out)R.mt.push(['Sur',a[1],a[5],'','',a[2]+(a[3]?' - '+a[3]:''),'','','',a[7]]);
  const tr=hoja('tiposrespuestas');
  if(tr){let hh=0;for(let r=1;r<=12&&!hh;r++)if(nk(tr.F(r,2)).startsWith('tipo de respuesta'))hh=r;
    let cd=3,cp=6;cp=6;for(let c=1;c<=tr.mc;c++){const n=nk(tr.F(hh,c));if(n.startsWith('definicion'))cd=cd===3?c:cd;if(n.startsWith('pqr')&&cp===6)cp=c;}
    for(let r=hh+1;r<=tr.mr;r++)if(tr.F(r,2))R.tr.push([tr.F(r,2),tr.F(r,cd),tr.F(r,cp)]);}
  // Validaciones
  if(!PROC.length) throw new Error('No se pudo leer ningún proceso del archivo.');
  for(const [k,n] of [['ci','Contrato integral'],['mto','Mantenimiento'],['atc','ATC'],['rce','RCE'],['mt','Mantenimiento trabajos a terceros'],['tr','Tipos de respuesta']])if(!R[k].length)avisos.push('No se pudo leer la tabla de '+n+'.');
  const datos={version:version||'Versión no identificada',origen:nombreArchivo||'',fecha:new Date().toISOString().slice(0,10),procesos:PROC,
    tr:R.tr,subs:Object.keys(subdesc).sort().map(c=>[c,subdesc[c][0],subdesc[c][1]]),ci:R.ci.map(r=>r.slice(0,6)),mto:R.mto.map(r=>r.slice(0,5)),
    atc:R.atc.map(a=>a.slice(0,7)),atcNotas:R.atcNotas,rce:R.rce.map(r=>r.slice(0,3)),mt:R.mt};
  return {datos,avisos};
}
return {convertir};
})();


export { XL, CONV_REQ, CONV_ARBOL };
