/* Asistente Documental · runtime DOCX local/offline
   Puente común para los bundles clásicos de src/. No usa red, import(), CDN ni backend. */
(function (g) {
  'use strict';
  const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const norm=k=>String(k==null?'':k).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const zipCtor=()=>g.JSZip||null;
  async function bufferOf(input){
    if(input instanceof ArrayBuffer)return input;
    if(ArrayBuffer.isView(input))return input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength);
    if(input&&typeof input.arrayBuffer==='function')return input.arrayBuffer();
    throw new TypeError('Se esperaba Blob, ArrayBuffer o vista binaria.');
  }
  async function open(input){
    const Z=zipCtor();if(!Z||typeof Z.loadAsync!=='function')throw new Error('JSZip local no está disponible.');
    const buffer=await bufferOf(input),zip=await Z.loadAsync(buffer,{checkCRC32:false});
    if(!zip.file('word/document.xml'))throw new Error('El archivo no contiene word/document.xml.');
    return {buffer,zip};
  }
  function children(n,name){return Array.from(n&&n.childNodes||[]).filter(x=>x.nodeType===1&&(!name||x.localName===name));}
  function textOf(n){
    let out='';(function walk(x){if(x.nodeType===3){out+=x.nodeValue||'';return;}if(x.nodeType!==1)return;if(x.localName==='tab')out+='\t';else if(x.localName==='br'||x.localName==='cr')out+='\n';Array.from(x.childNodes||[]).forEach(walk);})(n);return out;
  }
  function nodeHtml(n){
    if(!n||n.nodeType!==1)return'';
    if(n.localName==='p')return '<p>'+esc(textOf(n)).replace(/\n/g,'<br>')+'</p>';
    if(n.localName==='tbl'){
      const rows=children(n,'tr').map(tr=>'<tr>'+children(tr,'tc').map(tc=>'<td>'+children(tc).map(nodeHtml).join('')+'</td>').join('')+'</tr>').join('');
      return '<table>'+rows+'</table>';
    }
    return children(n).map(nodeHtml).join('');
  }
  async function html(input){
    const pkg=await open(input),xml=await pkg.zip.file('word/document.xml').async('string');
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw new Error('word/document.xml no es XML válido.');
    const body=Array.from(doc.getElementsByTagNameNS(W,'body'))[0]||doc.documentElement;
    return children(body).map(nodeHtml).join('')||'<p></p>';
  }
  async function renderAsync(input,bodyContainer,styleContainer,options){
    const target=bodyContainer||document.body,section=document.createElement('section');
    section.className=((options&&options.className)||'docx')+' ad-local-docx-page';
    section.innerHTML=await html(input);target.appendChild(section);return section;
  }
  function lookupData(data,key){
    const n=norm(key);if(!data)return'';
    if(Object.prototype.hasOwnProperty.call(data,n))return data[n];
    if(Object.prototype.hasOwnProperty.call(data,key))return data[key];
    const actual=Object.keys(data).find(k=>norm(k)===n);return actual==null?'':data[actual];
  }
  function replaceAcrossRuns(paragraph,data,stats,syntax){
    const texts=Array.from(paragraph.getElementsByTagNameNS(W,'t'));if(!texts.length)return;
    let full=texts.map(t=>t.textContent||'').join(''),ranges=[];let re;
    if(syntax==='easy')re=/\{\{\s*([^{}]+?)\s*\}\}/g;
    else re=/\{\s*([^{}#\/]+?)\s*\}/g;
    let guard=0,m;
    while(guard++<200&&(m=re.exec(full))){
      const token=m[0],key=m[1],value=String(lookupData(data,key)??'');stats.tokens.add(norm(key));
      if(value==='')stats.missing.add(norm(key));
      let pos=0,si=-1,ei=-1,so=0,eo=0;ranges=[];
      const vals=texts.map(t=>t.textContent||'');
      for(let i=0;i<vals.length;i++){const next=pos+vals[i].length;ranges.push([pos,next]);if(si<0&&m.index>=pos&&m.index<=next){si=i;so=m.index-pos;}if(m.index+token.length>=pos&&m.index+token.length<=next){ei=i;eo=m.index+token.length-pos;break;}pos=next;}
      if(si<0||ei<0)break;const pre=vals[si].slice(0,so),post=vals[ei].slice(eo);
      for(let i=si;i<=ei;i++)texts[i].textContent='';texts[si].textContent=pre+value+(si===ei?post:'');if(ei!==si)texts[ei].textContent=post;
      full=texts.map(t=>t.textContent||'').join('');re.lastIndex=0;
    }
  }
  async function processTemplate(input,data,options){
    const pkg=await open(input),syntax=options&&options.syntax==='easy'?'easy':'docxtemplater';
    const parts=Object.keys(pkg.zip.files).filter(n=>/^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments\d*)\.xml$/.test(n));
    const stats={tokens:new Set(),missing:new Set()};
    for(const part of parts){
      const xml=await pkg.zip.file(part).async('string'),doc=new DOMParser().parseFromString(xml,'application/xml');
      if(doc.getElementsByTagName('parsererror').length)continue;
      Array.from(doc.getElementsByTagNameNS(W,'p')).forEach(p=>replaceAcrossRuns(p,data||{},stats,syntax));
      pkg.zip.file(part,new XMLSerializer().serializeToString(doc));
    }
    const type=(options&&options.type)||'blob';
    const output=await pkg.zip.generateAsync({type,mimeType:MIME,compression:'DEFLATE',compressionOptions:{level:6}});
    return {output,stats:{tokens:Array.from(stats.tokens),missing:Array.from(stats.missing)}};
  }
  g.ADDocxLocal=Object.freeze({version:'1.0.0',open,html,renderAsync,processTemplate,bufferOf,MIME});
})(typeof window!=='undefined'?window:globalThis);
