
/* ===================== SELECTOR DE CONSULTAS (lista desplegable propia) =====================
   Mejora progresiva: el <select id="otras"> / <select id="otrasD"> original se conserva oculto como
   fuente de verdad. Al elegir se asigna su valor y se dispara el mismo evento "change", así que
   ejecutar(), Limpiar, las palabras clave y la recarga del Excel siguen funcionando igual.
   Si el script falla, el <select> nativo sigue visible y operativo. */
(function(){
'use strict';
const SVG=(d,x)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${x||''}>${d}</svg>`;
const I={
  doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h4"/>',
  book:'<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3C14.1 8.5 13.2 8 12 8c-1.4 0-2.5.7-2.5 1.8 0 2.6 5 1.2 5 3.9 0 1.1-1.1 1.8-2.5 1.8-1.2 0-2.1-.5-2.6-1.3M12 6.5V8M12 15.5V17"/>',
  pin:'<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  bolt:'<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  mega:'<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M17.5 9.5a4 4 0 0 1 0 5"/>',
  pct:'<path d="M18 6 6 18"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>',
  rcpt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/>',
  gauge:'<path d="M4.5 16a7.5 7.5 0 1 1 15 0"/><path d="m12 16 3.5-4.5"/><circle cx="12" cy="16" r="1"/>',
  bld:'<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-5h6v5M9 10h.01M12 10h.01M15 10h.01"/>',
  lay:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.6a3 3 0 0 1 0 5.8M18 14.8c1.8.7 3 2.4 3 5.2"/>',
  id:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6.2 16c.5-1.4 1.6-2 2.8-2s2.3.6 2.8 2M14.5 10h4M14.5 13.5h3"/>',
  flow:'<rect x="3.5" y="3.5" width="6" height="6" rx="1.5"/><rect x="14.5" y="14.5" width="6" height="6" rx="1.5"/><path d="M9.5 6.5H15a3 3 0 0 1 3 3v5"/>',
  split:'<circle cx="12" cy="4.5" r="1.6"/><path d="M12 6v3M12 9l-6 5.5M12 9l6 5.5"/><circle cx="6" cy="17.5" r="2.5"/><circle cx="18" cy="17.5" r="2.5"/>',
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  find:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  chev:'<path d="m6 9 6 6 6-6"/>',
  ck:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  undo:'<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"/>'
};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const descN=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
const tactil=()=>!window.matchMedia('(hover:hover) and (pointer:fine)').matches;
const hoja=()=>window.matchMedia('(max-width:600px)').matches;

function clasif(t){
  let titulo=t,tag='',ic='doc',grupo=null;
  const g=t.split(/\s[–—-]\s/);
  if(g.length>1){
    const pre=norm(g[0]);titulo=g.slice(1).join(' – ');tag=g[0];grupo=g[0];
    ic=/^responsables/.test(pre)?'users':'flow';
    return {ic,tag,titulo,grupo,color:titulo};
  }
  let m=t.match(/^(Anexo\s+\d+)\s*:\s*(.+)$/i);
  if(m)return {ic:'doc',tag:m[1],titulo:m[2],grupo:'Anexos',color:t};
  const n=norm(t);
  const R=[[/^asentamientos/,'pin','Asentamientos'],[/alumbrado/,'bolt','Base de datos'],[/^comunicado/,'mega','Comunicado'],[/^condiciones/,'pct','Financiación'],
    [/^costo/,'coin','Costos'],[/^directorio/,'book','Directorio'],[/^facturacion/,'rcpt','Facturación'],[/^medidores/,'gauge','Medidores'],
    [/^otras comercializadoras/,'bld','Base de datos'],[/^planos/,'lay','Planos'],[/^relacionamiento/,'users','Relacionamiento'],[/^rut/,'id','Documento'],
    [/^sitios/,'pin','Referencia'],[/^tipos de respuesta/,'book','Definiciones'],[/^subprocesos/,'split','Subprocesos']];
  for(const [re,i,tg] of R)if(re.test(n)){ic=i;tag=tg;break;}
  return {ic,tag:tag||'Consulta',titulo,grupo:null,color:t};
}
function colorDe(c){
  try{if(window.colorHoja){const [a,b]=window.colorHoja(c);return {hc:a,hcs:b};}}catch(e){}
  return null;
}
function resaltar(host,texto,q){
  host.textContent='';
  if(!q){host.textContent=texto;return;}
  const nt=norm(texto),i=nt.indexOf(q);
  if(i<0||nt.length!==texto.length){host.textContent=texto;return;}
  host.append(texto.slice(0,i));
  const mk=document.createElement('mark');mk.textContent=texto.slice(i,i+q.length);host.append(mk,texto.slice(i+q.length));
}

function mejorar(sel){
  if(!sel||sel.dataset.dd)return;sel.dataset.dd='1';
  const id=sel.id,lab=document.querySelector('label[for="'+id+'"]');
  const campo=(lab&&lab.textContent.trim())||'Otras consultas';
  const mitad=sel.closest('.mitad')||document.body,barra=sel.closest('.barra')||sel.parentElement;
  const pid=id+'-panel',lid=id+'-lista';

  const wrap=el('div','dd');
  const btn=el('button','dd-btn');btn.type='button';btn.id=id+'-dd';
  btn.setAttribute('role','combobox');btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls',lid);
  const ico=el('span','dd-ico'),eb=el('span','dd-eb'),val=el('span','dd-val'),chev=el('span','dd-chev',SVG(I.chev));
  const tx=el('span','dd-txt');tx.append(eb,val);btn.append(ico,tx,chev);wrap.append(btn);
  sel.before(wrap);
  sel.classList.add('dd-nativa');sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');
  if(lab)lab.htmlFor=btn.id;

  const panel=el('div','dd-panel');panel.id=pid;panel.hidden=true;
  const hd=el('div','dd-hd');
  const hdT=el('div','dd-hd-t');const hb=el('b');hb.textContent=campo;const hs=el('small');hdT.append(hb,hs);
  const cnt=el('span','dd-n');
  hd.append(el('span','dd-hd-ico',SVG(I.grid)),hdT,cnt);
  const sr=el('label','dd-sr',SVG(I.find));
  const inp=el('input');inp.type='text';inp.placeholder='Filtrar consultas…';inp.autocomplete='off';inp.spellcheck=false;inp.setAttribute('aria-label','Filtrar '+campo.toLowerCase());
  inp.setAttribute('role','combobox');inp.setAttribute('aria-controls',lid);inp.setAttribute('aria-expanded','true');inp.setAttribute('aria-autocomplete','list');
  const bx=el('button','dd-x',SVG(I.x));bx.type='button';bx.hidden=true;bx.setAttribute('aria-label','Borrar filtro');bx.tabIndex=-1;
  sr.append(inp,bx);
  const list=el('div','dd-list');list.id=lid;list.setAttribute('role','listbox');list.setAttribute('aria-label',campo);list.tabIndex=-1;
  const ft=el('div','dd-ft','<span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> elegir</span><span><kbd>esc</kbd> cerrar</span>');
  panel.append(hd,sr,list,ft);document.body.append(panel);
  let bk=document.querySelector('.dd-bk');if(!bk){bk=el('div','dd-bk');document.body.append(bk);}

  let abierto=false,vis=[],act=-1,q='',tCierre=0;

  const datos=()=>[...sel.options].map((o,i)=>{const t=o.textContent.trim();return {i,v:o.value,t,...clasif(t)};});
  const actual=()=>datos()[sel.selectedIndex]||null;

  function placeholderTxt(){return 'Elegir consulta';}
  function contexto(){
    const o=sel.options[0];const t=o?o.textContent.replace(/…|\.\.\./g,'').trim():'';
    const m=t.match(/^Otras consultas (?:de|del)\s+(.*)$/i);
    return cap((m?m[1]:t)||'');
  }
  function sync(){
    const c=actual(),ph=placeholderTxt();
    hs.textContent=contexto();
    if(c&&c.v!==''){
      const col=colorDe(c.color);
      btn.classList.add('tiene');
      if(col){btn.style.setProperty('--hc',col.hc);btn.style.setProperty('--hcs',col.hcs);}
      ico.innerHTML=SVG(I[c.ic]||I.doc);eb.textContent=c.tag||campo;val.textContent=c.titulo;btn.title=c.t;
    }else{
      btn.classList.remove('tiene');btn.style.removeProperty('--hc');btn.style.removeProperty('--hcs');
      ico.innerHTML=SVG(I.grid);eb.textContent=campo;val.textContent=ph;btn.title=sel.options[0]?sel.options[0].textContent.trim():'';
    }
    if(abierto)pintar(false);
  }
  Object.defineProperty(sel,'value',{configurable:true,get(){return descN.get.call(this);},set(v){descN.set.call(this,v);sync();}});
  new MutationObserver(sync).observe(sel,{childList:true,subtree:true,characterData:true});
  sel.addEventListener('change',sync);

  function pintar(entrada){
    const d=datos();
    const cur=sel.value;
    let items=d.filter(x=>x.v!=='');
    cnt.textContent=items.length;
    const nq=norm(q.trim());
    if(nq)items=items.filter(x=>norm(x.t).includes(nq));
    const fila=[];
    if(cur!==''&&!nq)fila.push({v:'',nada:true,titulo:'Quitar selección',tag:'Volver a la búsqueda',ic:'undo',t:'Quitar selección'});
    vis=fila.concat(items);
    list.textContent='';
    if(!vis.length){
      list.append(el('div','dd-vacio',SVG(I.find)+'<div>Sin coincidencias para <b></b></div>'));
      list.querySelector('b').textContent='«'+q.trim()+'»';
      act=-1;inp.removeAttribute('aria-activedescendant');return;
    }
    const cuenta={};vis.forEach(x=>{if(x.grupo)cuenta[x.grupo]=(cuenta[x.grupo]||0)+1;});
    let prev=null;
    vis.forEach((x,n)=>{
      if(x.grupo&&cuenta[x.grupo]>1&&x.grupo!==prev){const gh=el('div','dd-gh');gh.setAttribute('role','presentation');gh.textContent=x.grupo;list.append(gh);}
      prev=x.grupo||null;
      const o=el('div','dd-o'+(x.nada?' nada':''));o.id=lid+'-'+n;o.setAttribute('role','option');o.dataset.n=n;o.style.setProperty('--i',n);
      o.setAttribute('aria-selected',String(!x.nada&&x.v===cur));
      o.setAttribute('aria-label',x.t);
      const col=x.nada?null:colorDe(x.color);if(col){o.style.setProperty('--hc',col.hc);o.style.setProperty('--hcs',col.hcs);}
      const ti=el('span','dd-ti');resaltar(ti,x.titulo,nq);
      const tg=el('span','dd-tg');tg.textContent=x.tag;
      const tx2=el('span','dd-tx');tx2.append(ti,tg);
      o.append(el('span','dd-t',SVG(I[x.ic]||I.doc)),tx2,el('span','dd-ck',SVG(I.ck)));
      list.append(o);
    });
    if(entrada){list.classList.add('ent');setTimeout(()=>list.classList.remove('ent'),700);}
    const si=vis.findIndex(x=>!x.nada&&x.v===cur&&x.v!=='');
    marcar(nq?(vis.findIndex(x=>!x.nada)):(si>=0?si:((tactil()||hoja())&&entrada?-1:0)),entrada&&si>=0?'center':null);
    bordes();
  }
  function marcar(n,centrar){
    const prev=list.querySelector('.dd-o.act');if(prev)prev.classList.remove('act');
    act=n;const o=list.querySelector('.dd-o[data-n="'+n+'"]');
    if(!o){inp.removeAttribute('aria-activedescendant');return;}
    o.classList.add('act');inp.setAttribute('aria-activedescendant',o.id);list.setAttribute('aria-activedescendant',o.id);
    if(centrar==='center'){list.scrollTop=o.offsetTop-(list.clientHeight-o.offsetHeight)/2;}
    else{const top=o.offsetTop-34,bot=o.offsetTop+o.offsetHeight+10;
      if(top<list.scrollTop)list.scrollTop=Math.max(0,top-(o.previousElementSibling&&o.previousElementSibling.classList.contains('dd-gh')?30:0));
      else if(bot>list.scrollTop+list.clientHeight)list.scrollTop=bot-list.clientHeight;}
  }
  function bordes(){
    list.classList.toggle('s-top',list.scrollTop<=2);
    list.classList.toggle('s-bot',list.scrollTop+list.clientHeight>=list.scrollHeight-2);
  }
  list.addEventListener('scroll',bordes,{passive:true});

  function ubicar(){
    const sheet=hoja();panel.classList.toggle('hoja',sheet);
    bk.classList.toggle('on',sheet);
    if(sheet){['left','top','bottom','width','maxHeight'].forEach(k=>panel.style[k]='');return;}
    const b=barra.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight,mg=10;
    const w=Math.min(440,vw-2*mg);let left=b.right-w;if(left<mg)left=mg;if(left+w>vw-mg)left=vw-mg-w;
    const abajo=vh-b.bottom-mg-8,arriba=b.top-mg-8;
    const subir=abajo<340&&arriba>abajo;
    panel.classList.toggle('arriba',subir);
    panel.style.width=w+'px';panel.style.left=left+'px';
    const tr=btn.getBoundingClientRect();panel.style.setProperty('--ox',Math.max(24,Math.min(w-24,tr.left+tr.width/2-left))+'px');
    if(subir){panel.style.top='auto';panel.style.bottom=(vh-b.top+8)+'px';panel.style.maxHeight=Math.min(560,arriba)+'px';}
    else{panel.style.bottom='auto';panel.style.top=(b.bottom+8)+'px';panel.style.maxHeight=Math.min(560,abajo)+'px';}
  }
  const reubicar=()=>{if(abierto)ubicar();};

  function abrir(txt){
    if(abierto)return;
    clearTimeout(tCierre);
    document.querySelectorAll('.dd-btn[aria-expanded="true"]').forEach(b=>{if(b!==btn)b.dispatchEvent(new CustomEvent('dd:cerrar'));});
    abierto=true;q=txt||'';inp.value=q;bx.hidden=!q;
    const cs=getComputedStyle(mitad);['--m','--m2','--m3','--mt','--mg','--mf','--mf-a','--mf-b','--mac','--hc','--hcs','--on-hc','--rule','--rule-2','--ink','--ink-2','--mute','--paper-2','--card','--surface-2','--surface-3','--field','--glass-strong'].forEach(k=>{const v=cs.getPropertyValue(k);if(v)panel.style.setProperty(k,v.trim());});
    panel.hidden=false;panel.classList.remove('sale','abre');
    btn.setAttribute('aria-expanded','true');
    ubicar();pintar(true);
    void panel.offsetWidth;
    panel.classList.add('abre');bk.classList.add('v');
    if(tactil()||hoja())list.focus({preventScroll:true});else{inp.focus({preventScroll:true});inp.setSelectionRange(inp.value.length,inp.value.length);}
  }
  function cerrar(foco){
    if(!abierto)return;abierto=false;
    btn.setAttribute('aria-expanded','false');
    panel.classList.remove('abre');panel.classList.add('sale');bk.classList.remove('v');
    clearTimeout(tCierre);
    tCierre=setTimeout(()=>{if(!abierto){panel.hidden=true;panel.classList.remove('sale');if(!document.querySelector('.dd-btn[aria-expanded="true"]'))bk.classList.remove('on');}},hoja()?240:170);
    if(foco)btn.focus({preventScroll:true});
  }
  function elegir(n){
    const x=vis[n];if(!x)return;
    cerrar(true);
    if(x.v!==sel.value){descN.set.call(sel,x.v);sync();sel.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  btn.addEventListener('click',()=>abierto?cerrar(true):abrir());
  btn.addEventListener('dd:cerrar',()=>cerrar(false));
  btn.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Enter'||e.key===' '){e.preventDefault();abierto?cerrar(true):abrir();}
    else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();abrir(e.key);}
  });
  panel.addEventListener('keydown',e=>{
    const k=e.key,max=vis.length-1;
    if(k==='ArrowDown'){e.preventDefault();if(max>=0)marcar(act<max?act+1:0);}
    else if(k==='ArrowUp'){e.preventDefault();if(max>=0)marcar(act>0?act-1:max);}
    else if(k==='Home'&&(e.target!==inp||e.ctrlKey)){e.preventDefault();marcar(0);list.scrollTop=0;}
    else if(k==='End'&&(e.target!==inp||e.ctrlKey)){e.preventDefault();marcar(max);}
    else if(k==='PageDown'){e.preventDefault();marcar(Math.min(max,act+6));}
    else if(k==='PageUp'){e.preventDefault();marcar(Math.max(0,act-6));}
    else if(k==='Enter'){e.preventDefault();if(act>=0)elegir(act);}
    else if(k==='Escape'){e.preventDefault();e.stopPropagation();cerrar(true);}
    else if(k==='Tab'){cerrar(true);}
    else if(e.target===list&&k.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){inp.focus();}
  });
  inp.addEventListener('input',()=>{q=inp.value;bx.hidden=!q;list.scrollTop=0;pintar(false);});
  bx.addEventListener('click',()=>{q='';inp.value='';bx.hidden=true;pintar(false);inp.focus();});
  let lx=-1,ly=-1;
  list.addEventListener('pointermove',e=>{
    if(e.clientX===lx&&e.clientY===ly)return;lx=e.clientX;ly=e.clientY;
    const o=e.target.closest('.dd-o');if(o&&+o.dataset.n!==act)marcar(+o.dataset.n);
  });
  list.addEventListener('click',e=>{const o=e.target.closest('.dd-o');if(o)elegir(+o.dataset.n);});
  panel.addEventListener('mousedown',e=>{if(!e.target.closest('input'))e.preventDefault();});
  document.addEventListener('pointerdown',e=>{if(abierto&&!panel.contains(e.target)&&!btn.contains(e.target))cerrar(false);},true);
  bk.addEventListener('click',()=>{if(abierto)cerrar(true);});
  window.addEventListener('resize',reubicar);
  window.addEventListener('scroll',e=>{if(abierto&&!panel.contains(e.target))reubicar();},true);
  sync();
}
function iniciar(){['otras','otrasD'].forEach(id=>{try{mejorar(document.getElementById(id));}catch(e){const s=document.getElementById(id);if(s){s.classList.remove('dd-nativa');s.removeAttribute('aria-hidden');}console.error('Selector de consultas:',e);}});}
if(document.readyState==='loading'&&!(document.getElementById('otras')&&document.getElementById('otrasD')))document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();

export {};
