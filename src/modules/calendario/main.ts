// @ts-nocheck — lógica del calendario v40 trasladada desde calendario.html (mismo diseño y comportamiento).
import './calendario.css';

/* ==========================================================================
   Puente con el Asistente Documental
   - Integrado: se abre dentro de una ventana flotante del Cuadro de Mando
     (iframe). Toma el repositorio local (AD.data / AD.backup), el usuario
     (?u=Nombre) y el tema del Cuadro.
   - Suelto (npm run dev → /modules/calendario.html): funciona con localStorage.
   ========================================================================== */
const INTEGRADO = window.parent !== window;
function buscaRepo(){
  for(const w of [window,window.parent,window.top]){
    try{
      const ad=w&&(w.AD||w.AsistenteDocumental);
      if(ad&&(ad.data||ad.backup))return ad.data||ad.backup;
    }catch(e){/* otro origen */}
  }
  return null;
}
const REPO=buscaRepo();
const repoGet=k=>REPO?REPO.getItem(k):localStorage.getItem(k);
const repoSet=(k,v)=>{if(REPO){if(REPO.setItem(k,v)===false)throw new Error('repositorio');return}localStorage.setItem(k,v)};
/* Mismo criterio de nombre que el Cuadro de Mando (canonNombre). */
const canonNombre=s=>String(s==null?'':s).replace(/\(.*?\)/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const USUARIO=(()=>{const n=new URLSearchParams(location.search).get('u')||'';return {nombre:n,clave:canonNombre(n)}})();

/* Tema: sigue al Cuadro de Mando y cambia en vivo si allá se cambia. */
function copiaTema(){try{const t=window.parent.document.documentElement.getAttribute('data-theme');
  if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}}
if(INTEGRADO){
  document.documentElement.classList.add('ad-embedded');
  copiaTema();
  try{new MutationObserver(copiaTema).observe(window.parent.document.documentElement,{attributes:true,attributeFilter:['data-theme']})}catch(e){}
}

(function(){
'use strict';
/* ===================== Íconos (trazo minimalista) ===================== */
const P={
  chevL:'<path d="M15 18l-6-6 6-6"/>',chevR:'<path d="M9 18l6-6-6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',check:'<path d="M20 6L9 17l-5-5"/>',
  cal:'<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  note:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  alert:'<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/>',
  cake:'<path d="M4 21h16v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M12 11V7M12 4.5v.01"/>',
  lock:'<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.3"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'
};
const ic=n=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[n]||'')+'</svg>';
document.querySelectorAll('#mCal [data-i]').forEach(e=>{e.insertAdjacentHTML('afterbegin',ic(e.dataset.i))});

/* ===================== Tipos de evento ===================== */
const TIPOS={
  nota:{lb:'Nota',i:'note'},
  reunion:{lb:'Reunión',i:'users'},
  vence:{lb:'Vencimiento',i:'alert'},
  cumple:{lb:'Cumpleaños',i:'cake'}
};

/* ===================== Persistencia =====================
   Usa el repositorio local del Asistente Documental (el mismo de los demás
   módulos, vía AD.data/AD.backup) y, si no está disponible, localStorage.
   Cada usuario (firmante configurado en Recursos) tiene su propia agenda. */
const CalStore={
  key:'essa_calendario_v2',
  dueno:USUARIO.clave||'__sin_perfil',
  leeTodo(){try{const v=JSON.parse(repoGet(this.key)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return {}}},
  load(){const t=this.leeTodo(),a=t[this.dueno];return Array.isArray(a)?a:[]},
  save(l){try{const t=this.leeTodo();t[this.dueno]=l;repoSet(this.key,JSON.stringify(t))}catch(e){toast('No fue posible guardar la agenda')}}
};
/* ===================== Utilidades de fecha ===================== */
const pad=n=>String(n).padStart(2,'0');
const K=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const D=k=>{const[a,m,d]=k.split('-').map(Number);return new Date(a,m-1,d)};
const add=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r};
const lunes=d=>{const r=new Date(d.getFullYear(),d.getMonth(),d.getDate());return add(r,-((r.getDay()+6)%7))};
const hoyK=()=>K(new Date());
const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIA=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DC=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const hm=t=>{if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m};
const fmtH=t=>{if(!t)return'';const[h,m]=t.split(':').map(Number);const ap=h>=12?'p. m.':'a. m.';return((h%12)||12)+':'+pad(m)+' '+ap};

/* Festivos de Colombia (Ley 51 de 1983 · traslado a lunes) */
const fesCache={};
function festivos(y){
  if(fesCache[y])return fesCache[y];
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
    mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1,pas=new Date(y,mes-1,dia);
  const lun=dt=>{const w=dt.getDay();return w===1?dt:add(dt,(8-w)%7)};
  const r={},s=(dt,n)=>{r[K(dt)]=n};
  s(new Date(y,0,1),'Año Nuevo');s(new Date(y,4,1),'Día del Trabajo');s(new Date(y,6,20),'Día de la Independencia');
  s(new Date(y,7,7),'Batalla de Boyacá');s(new Date(y,11,8),'Inmaculada Concepción');s(new Date(y,11,25),'Navidad');
  s(lun(new Date(y,0,6)),'Reyes Magos');s(lun(new Date(y,2,19)),'San José');s(lun(new Date(y,5,29)),'San Pedro y San Pablo');
  s(lun(new Date(y,7,15)),'Asunción de la Virgen');s(lun(new Date(y,9,12)),'Día de la Raza');
  s(lun(new Date(y,10,1)),'Todos los Santos');s(lun(new Date(y,10,11)),'Independencia de Cartagena');
  s(add(pas,-3),'Jueves Santo');s(add(pas,-2),'Viernes Santo');
  s(add(pas,43),'Ascensión del Señor');s(add(pas,64),'Corpus Christi');s(add(pas,71),'Sagrado Corazón');
  return fesCache[y]=r;
}
const fes=k=>festivos(+k.slice(0,4))[k]||null;

/* ===================== Estado ===================== */
const $=id=>document.getElementById(id);
const S={view:'mes',sel:hoyK(),eventos:CalStore.load(),filtro:new Set(Object.keys(TIPOS)),qTipo:'nota',edit:null};
const persist=()=>CalStore.save(S.eventos);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
/* Migración única desde el calendario anterior del Cuadro (clave «essa_calendario»):
   notas → eventos tipo «Nota»; cumpleaños (MM-DD) → «Cumpleaños» que se repite cada año.
   No borra nada del calendario anterior. */
function migrarCalendarioAnterior(){
  const marca='essa_calendario_v2_mig:'+CalStore.dueno;
  try{if(repoGet(marca))return}catch(e){return}
  let viejo=null;try{viejo=JSON.parse(repoGet('essa_calendario')||'null')}catch(e){}
  const b=viejo&&viejo.u&&viejo.u[CalStore.dueno];
  let n=0;
  if(b){
    Object.entries(b.notas||{}).forEach(([k,L])=>(L||[]).forEach(t=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||!t)return;
      S.eventos.push({id:uid(),creado:Date.now(),titulo:String(t),fecha:k,tipo:'nota',ini:null,fin:null,desc:'',mig:1});n++}));
    const y=new Date().getFullYear();
    Object.entries(b.cumple||{}).forEach(([md,L])=>(L||[]).forEach(t=>{if(!/^\d{2}-\d{2}$/.test(md)||!t)return;
      S.eventos.push({id:uid(),creado:Date.now(),titulo:String(t),fecha:(y-1)+'-'+md,tipo:'cumple',anual:true,ini:null,fin:null,desc:'',mig:1});n++}));
    if(n){persist();render()}
  }
  try{repoSet(marca,'1')}catch(e){}
  if(n)setTimeout(()=>toast(n+' nota(s) y cumpleaños traídos del calendario anterior'),400);
}
const orden=(a,b)=>(a.ini?1:0)-(b.ini?1:0)||(hm(a.ini)||0)-(hm(b.ini)||0)||a.titulo.localeCompare(b.titulo);
/* Los cumpleaños se repiten cada año (como en el calendario anterior del Cuadro). */
const ocurre=(e,k)=>e.fecha===k||(e.tipo==='cumple'&&e.anual!==false&&k>e.fecha&&e.fecha.slice(5)===k.slice(5));
const delDia=k=>S.eventos.filter(e=>ocurre(e,k)&&S.filtro.has(e.tipo)).sort(orden);
/* Ocurrencias entre dos fechas (incluidas): [{e,k}] */
function enRango(a,b,todos){const out=[];for(let d=D(a);K(d)<=b;d=add(d,1)){const k=K(d);
  S.eventos.forEach(e=>{if(ocurre(e,k)&&(todos||S.filtro.has(e.tipo)))out.push({e,k})})}return out}

/* ===================== Render principal ===================== */
function render(anim){
  renderBar();
  const g=$('calGrid');
  g.className='';g.removeAttribute('style');
  if(S.view==='mes')renderMes(g);else if(S.view==='semana')renderSemana(g);else renderDia(g);
  if(anim){void g.offsetWidth;g.classList.add('anim-'+anim)}
  renderPanel();renderMini();renderProx();renderLeyenda();renderStats();
}
function renderBar(){
  const d=D(S.sel);let t;
  if(S.view==='mes')t=MES[d.getMonth()]+' <span>'+d.getFullYear()+'</span>';
  else if(S.view==='semana'){const a=lunes(d),b=add(a,6);
    t=a.getMonth()===b.getMonth()?a.getDate()+' – '+b.getDate()+' de '+MES[b.getMonth()]+' <span>'+b.getFullYear()+'</span>'
      :a.getDate()+' '+MES[a.getMonth()].slice(0,3)+'. – '+b.getDate()+' '+MES[b.getMonth()].slice(0,3)+'. <span>'+b.getFullYear()+'</span>'}
  else t=DIA[d.getDay()]+' '+d.getDate()+' <span>de '+MES[d.getMonth()]+'</span>';
  $('calMes').innerHTML=cap(t);
  const lb={mes:['Mes anterior','Mes siguiente'],semana:['Semana anterior','Semana siguiente'],dia:['Día anterior','Día siguiente']}[S.view];
  $('calPrev').setAttribute('aria-label',lb[0]);$('calNext').setAttribute('aria-label',lb[1]);
  document.querySelectorAll('#mCal .seg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===S.view));
  moverThumb();
}
function moverThumb(){
  const b=document.querySelector('#mCal .seg button[aria-pressed="true"]'),t=document.querySelector('#mCal .seg .thumb');
  if(b&&t){t.style.left=b.offsetLeft+'px';t.style.width=b.offsetWidth+'px'}
}
function chip(e){return '<span class="it t-'+e.tipo+'" title="'+esc(e.titulo)+'">'+(e.ini?'<time>'+e.ini+'</time>':'')+'<span>'+esc(e.titulo)+'</span></span>'}

function renderMes(g){
  const s=D(S.sel),f=new Date(s.getFullYear(),s.getMonth(),1),ini=lunes(f),
    dim=new Date(s.getFullYear(),s.getMonth()+1,0).getDate(),filas=Math.ceil((((f.getDay()+6)%7)+dim)/7),hk=hoyK();
  let h=DC.map((d,i)=>'<div class="calH'+(i===6?' dom':'')+'" aria-hidden="true">'+d+'</div>').join('');
  for(let i=0;i<filas*7;i++){
    const d=add(ini,i),k=K(d),w=d.getDay(),fe=fes(k),ev=delDia(k),c=['calD'];
    if(d.getMonth()!==s.getMonth())c.push('otro');if(w===6)c.push('sab');if(w===0)c.push('dom');if(fe)c.push('fes');
    if(k===hk)c.push('hoy');if(k===S.sel)c.push('sel');
    const vis=fe?1:2;
    h+='<div class="'+c.join(' ')+'" role="button" tabindex="'+(k===S.sel?0:-1)+'" data-k="'+k+'" aria-label="'+DIA[w]+' '+d.getDate()+' de '+MES[d.getMonth()]+(fe?', festivo '+fe:'')+(ev.length?', '+ev.length+' evento(s)':'')+'">'
      +'<div class="top"><span class="n">'+d.getDate()+'</span>'+(ev.length>vis?'<span class="cnt">'+ev.length+'</span>':'')+'</div>'
      +(fe?'<span class="fesN" title="'+esc(fe)+'">'+ic('flag')+'<span>'+esc(fe)+'</span></span>':'')
      +ev.slice(0,vis).map(chip).join('')
      +(ev.length>vis?'<span class="more">+'+(ev.length-vis)+' más</span>':'')
      +'<span class="dots">'+ev.slice(0,4).map(e=>'<i class="t-'+e.tipo+'"></i>').join('')+'</span></div>';
  }
  g.innerHTML=h;
}
function renderSemana(g){
  g.style.display='block';
  const a=lunes(D(S.sel)),hk=hoyK();let h='<div class="wk">';
  for(let i=0;i<7;i++){
    const d=add(a,i),k=K(d),fe=fes(k),ev=delDia(k),c=['wkC'];
    if(k===hk)c.push('hoy');if(k===S.sel)c.push('sel');if(fe)c.push('fes');if(d.getDay()===0)c.push('dom');
    h+='<div class="'+c.join(' ')+'" data-k="'+k+'"><div class="wkH"><small>'+DC[i]+'</small><b>'+d.getDate()+'</b>'+(fe?'<em>'+esc(fe)+'</em>':'')+'</div><div class="wkB">'
      +(ev.length?ev.map(e=>'<div class="ev t-'+e.tipo+'" data-id="'+e.id+'"><time>'+(e.ini?fmtH(e.ini):'Todo el día')+'</time><b>'+esc(e.titulo)+'</b></div>').join('')
      :'<div class="libre">'+ic('plus')+'Sin eventos</div>')+'</div></div>';
  }
  g.innerHTML=h+'</div>';
}
const H0=6,H1=21,HP=40;
function renderDia(g){
  g.style.display='block';
  const k=S.sel,ev=delDia(k),todo=ev.filter(e=>!e.ini),hor=ev.filter(e=>e.ini);
  let h='<div class="dy"><div class="dyAll"><small>Todo el día</small>'+(fes(k)?'<span class="it t-vence">'+ic('flag')+'<span>'+esc(fes(k))+'</span></span>':'')
    +(todo.length?todo.map(e=>chip(e).replace('<span class="it','<span data-id="'+e.id+'" class="it')).join(''):(fes(k)?'':'<span style="font-size:12px;color:var(--c-tx3)">Sin eventos de día completo</span>'))+'</div>';
  h+='<div class="dyHrs">';for(let x=H0;x<H1;x++)h+='<div>'+((x%12)||12)+(x<12?' a. m.':' p. m.')+'</div>';h+='</div><div class="dyCol">';
  for(let x=H0;x<H1;x++)h+='<div class="dySlot" data-h="'+pad(x)+':00"></div>';
  // Distribución en columnas si hay solapamientos
  const it=hor.map(e=>{const s=Math.max(hm(e.ini),H0*60),f=Math.max(Math.min(hm(e.fin||e.ini)||s+60,H1*60),s+30);return{e,s,f}}).sort((a,b)=>a.s-b.s);
  const cols=[];it.forEach(o=>{let c=cols.findIndex(f=>f<=o.s);if(c<0){c=cols.length;cols.push(0)}cols[c]=o.f;o.c=c});
  const nc=Math.max(cols.length,1);
  it.forEach(o=>{const top=(o.s-H0*60)/60*HP,ht=Math.max((o.f-o.s)/60*HP-4,26),w=100/nc;
    h+='<div class="dyEv t-'+o.e.tipo+'" data-id="'+o.e.id+'" style="top:'+(top+2)+'px;height:'+ht+'px;left:calc('+(w*o.c)+'% + 8px);right:auto;width:calc('+w+'% - 12px)"><time>'+fmtH(o.e.ini)+(o.e.fin?' – '+fmtH(o.e.fin):'')+'</time><br><b>'+esc(o.e.titulo)+'</b></div>'});
  if(k===hoyK()){const n=new Date(),m=n.getHours()*60+n.getMinutes();if(m>=H0*60&&m<=H1*60)h+='<div class="now" style="top:'+((m-H0*60)/60*HP)+'px"></div>'}
  g.innerHTML=h+'</div></div>';
  const col=g.querySelector('.dyCol');if(col&&col.scrollIntoView){/* sin desplazamiento forzado */}
}

/* ===================== Panel del día ===================== */
function renderPanel(){
  const d=D(S.sel),k=S.sel,w=d.getDay(),fe=fes(k),ev=delDia(k);
  const tag=fe?'<span class="tag tagFes">'+ic('flag')+'Festivo · '+esc(fe)+'</span>':w===0?'<span class="tag tagDom">Domingo</span>':w===6?'<span class="tag tagSab">Sábado</span>':'<span class="tag tagHab">Día hábil</span>';
  const rel=relTxt(k);
  let h='<div class="pHead"><div class="calDueno">'+ic('lock')+'<span>'+(USUARIO.nombre?'Agenda personal de <b>'+esc(USUARIO.nombre)+'</b>':'Agenda personal · solo en este equipo')+'</span></div>'
    +'<div class="pDate"><span class="pNum grad">'+d.getDate()+'</span><div><h5>'+DIA[w]+'</h5><p>'+cap(MES[d.getMonth()])+' de '+d.getFullYear()+(rel?' · '+rel:'')+'</p></div></div>'+tag+'</div>';
  h+='<div class="pBody"><div class="pSub"><span>Eventos del día</span><span>'+ev.length+'</span></div>';
  h+=ev.length?'<ul class="pList">'+ev.map(e=>'<li class="t-'+e.tipo+'"><span class="eI">'+ic(TIPOS[e.tipo].i)+'</span><div class="eT" data-id="'+e.id+'" tabindex="0" role="button" aria-label="Editar '+esc(e.titulo)+'"><b>'+esc(e.titulo)+'</b><span>'+TIPOS[e.tipo].lb+' · '+(e.ini?fmtH(e.ini)+(e.fin?' – '+fmtH(e.fin):''):'Todo el día')+'</span>'+(e.desc?'<p>'+esc(e.desc)+'</p>':'')+'</div>'
      +'<div class="eA"><button class="icoBtn" data-ed="'+e.id+'" aria-label="Editar">'+ic('pen')+'</button><button class="icoBtn del" data-del="'+e.id+'" aria-label="Eliminar">'+ic('trash')+'</button></div></li>').join('')+'</ul>'
    :'<div class="vacio"><div class="vI">'+ic('cal')+'</div>Aún no hay eventos para este día.<br>Escribe una nota rápida abajo.</div>';
  h+='<div class="quick"><textarea id="calTxt" placeholder="Escribe una nota, vencimiento o el nombre de quien cumple años… (Enter para guardar)"></textarea>'
    +'<div class="qTypes">'+Object.keys(TIPOS).map(t=>'<button class="qT t-'+t+'" data-qt="'+t+'" aria-pressed="'+(S.qTipo===t)+'">'+ic(TIPOS[t].i)+TIPOS[t].lb+'</button>').join('')+'</div>'
    +'<div class="qAct"><button class="btnP" id="qAdd"><span class="ico">'+ic('plus')+'</span>Agregar</button><button class="btnG" id="qMas">Más detalles '+ic('chevR')+'</button></div></div></div>';
  $('calPanel').innerHTML=h;
}
function relTxt(k){const n=Math.round((D(k)-D(hoyK()))/864e5);if(n===0)return'hoy';if(n===1)return'mañana';if(n===-1)return'ayer';return n>0?'en '+n+' días':'hace '+(-n)+' días'}

/* ===================== Mini calendario ===================== */
let miniRef=null;
function renderMini(){
  const base=miniRef||D(S.sel),f=new Date(base.getFullYear(),base.getMonth(),1),ini=lunes(f),hk=hoyK(),
    con=new Set(enRango(K(ini),K(add(ini,41))).map(o=>o.k));
  let h='<div class="miniH"><button data-mm="-1" aria-label="Mes anterior">'+ic('chevL')+'</button><span>'+MES[f.getMonth()]+' '+f.getFullYear()+'</span><button data-mm="1" aria-label="Mes siguiente">'+ic('chevR')+'</button></div><div class="miniG">'
    +['L','M','M','J','V','S','D'].map(x=>'<small>'+x+'</small>').join('');
  for(let i=0;i<42;i++){const d=add(ini,i),k=K(d),c=[];
    if(d.getMonth()!==f.getMonth())c.push('o');if(fes(k)||d.getDay()===0)c.push('f');if(con.has(k))c.push('e');if(k===S.sel)c.push('s');if(k===hk)c.push('h');
    h+='<button class="'+c.join(' ')+'" data-k="'+k+'" aria-label="'+d.getDate()+' de '+MES[d.getMonth()]+'">'+d.getDate()+'</button>'}
  $('mini').innerHTML=h+'</div>';
}

/* ===================== Próximos eventos ===================== */
function proximos(dias){const a=hoyK(),b=K(add(new Date(),dias));
  return enRango(a,b).map(o=>Object.assign({},o.e,{fecha:o.k})).sort((x,y)=>x.fecha.localeCompare(y.fecha)||orden(x,y))}
function delMes(pre,todos){const a=pre+'-01',d=D(a),b=K(new Date(d.getFullYear(),d.getMonth()+1,0));return enRango(a,b,todos)}
function renderProx(){
  const l=proximos(30);$('upCount').textContent=l.length?l.length+' en 30 días':'';
  $('upList').innerHTML=l.length?l.slice(0,6).map(e=>{const d=D(e.fecha),r=relTxt(e.fecha),n=Math.round((d-D(hoyK()))/864e5);
    return '<li class="t-'+e.tipo+'" data-go="'+e.fecha+'" tabindex="0"><span class="upD"><b>'+d.getDate()+'</b><small>'+MES[d.getMonth()].slice(0,3)+'</small></span>'
      +'<span class="upT"><b>'+esc(e.titulo)+'</b><span>'+TIPOS[e.tipo].lb+(e.ini?' · '+fmtH(e.ini):'')+'</span></span><span class="rel'+(n<=2?' hot':'')+'">'+r+'</span></li>'}).join('')
    :'<li style="cursor:default"><div class="vacio" style="width:100%"><div class="vI">'+ic('clock')+'</div>No tienes eventos en los próximos 30 días.</div></li>';
}
function renderLeyenda(){
  const s=D(S.sel),pre=s.getFullYear()+'-'+pad(s.getMonth()+1);
  $('legend').innerHTML=Object.keys(TIPOS).map(t=>{const n=delMes(pre,true).filter(o=>o.e.tipo===t).length;
    return '<button class="chipF t-'+t+'" data-f="'+t+'" aria-pressed="'+S.filtro.has(t)+'" title="Mostrar u ocultar"><i></i>'+TIPOS[t].lb+'<b>'+n+'</b></button>'}).join('');
}
function renderStats(){
  const s=D(S.sel),pre=s.getFullYear()+'-'+pad(s.getMonth()+1);
  $('sMes').textContent=delMes(pre).length;
  $('sSem').textContent=proximos(7).length;
  $('sFes').textContent=Object.keys(festivos(s.getFullYear())).filter(k=>k.startsWith(pre)).length;
  const h=new Date();$('hMes').textContent=MES[h.getMonth()].slice(0,3).toUpperCase();$('hDia').textContent=h.getDate();
  const p=proximos(0).length;$('hPill').textContent=p?p+(p===1?' evento hoy':' eventos hoy'):'Agenda personal';
}

/* ===================== Navegación ===================== */
function irA(k,anim){const prev=D(S.sel);S.sel=k;miniRef=null;
  const d=D(k);const cambio=S.view==='mes'?(d.getMonth()!==prev.getMonth()||d.getFullYear()!==prev.getFullYear()):S.view==='semana'?K(lunes(d))!==K(lunes(prev)):k!==K(prev);
  render(cambio?(anim||(d>prev?'n':'p')):null);}
function paso(dir){const d=D(S.sel);let n;
  if(S.view==='mes'){n=new Date(d.getFullYear(),d.getMonth()+dir,1);const dim=new Date(n.getFullYear(),n.getMonth()+1,0).getDate();n.setDate(Math.min(d.getDate(),dim))}
  else n=add(d,S.view==='semana'?7*dir:dir);
  irA(K(n),dir>0?'n':'p');}
function enfocarSel(){const c=document.querySelector('#calGrid .calD.sel');if(c)c.focus({preventScroll:true})}

/* ===================== Modal ===================== */
function tSel(t){$('fTipo').innerHTML=Object.keys(TIPOS).map(x=>'<button type="button" class="t-'+x+'" data-t="'+x+'" aria-pressed="'+(x===t)+'">'+ic(TIPOS[x].i)+TIPOS[x].lb+'</button>').join('')}
let ultimoFoco=null;
function abrir(ev,pre){
  ultimoFoco=document.activeElement;S.edit=ev?ev.id:null;const e=ev||Object.assign({titulo:'',tipo:S.qTipo,fecha:S.sel,ini:null,fin:null,desc:''},pre||{});
  $('mTit').textContent=ev?'Editar evento':'Nuevo evento';
  const d=D(e.fecha);$('mSub').textContent=DIA[d.getDay()]+', '+d.getDate()+' de '+MES[d.getMonth()]+' de '+d.getFullYear();
  $('fTit').value=e.titulo;$('fFec').value=e.fecha;$('fDes').value=e.desc||'';
  const todo=ev?!e.ini:!(e.ini||e.tipo==='reunion');$('fTodo').checked=todo;$('fHrs').classList.toggle('off',todo);
  $('fIni').value=e.ini||'08:00';$('fFin').value=e.fin||(e.ini?K0(hm(e.ini)+60):'09:00');
  tSel(e.tipo);$('mDel').hidden=!ev;$('mErr').textContent='';$('fTit').classList.remove('err');
  $('ov').classList.add('on');$('ov').setAttribute('aria-hidden','false');setTimeout(()=>$('fTit').focus(),60);
}
const K0=m=>pad(Math.min(23,Math.floor(m/60)))+':'+pad(m%60);
function cerrar(){$('ov').classList.remove('on');$('ov').setAttribute('aria-hidden','true');S.edit=null;if(ultimoFoco&&ultimoFoco.focus)ultimoFoco.focus({preventScroll:true})}
function guardar(){
  const t=$('fTit').value.trim(),f=$('fFec').value,todo=$('fTodo').checked,ini=$('fIni').value,fin=$('fFin').value,
    tipo=($('fTipo').querySelector('[aria-pressed="true"]')||{}).dataset?.t||'nota';
  if(!t){$('fTit').classList.add('err');$('mErr').textContent='Escribe un título para el evento.';$('fTit').focus();return}
  if(!f){$('mErr').textContent='Selecciona una fecha válida.';return}
  if(!todo&&(!ini||(fin&&hm(fin)<=hm(ini)))){$('mErr').textContent='La hora de fin debe ser posterior a la hora de inicio.';return}
  const data={titulo:t,fecha:f,tipo,ini:todo?null:ini,fin:todo?null:(fin||null),desc:$('fDes').value.trim()};
  if(S.edit){const e=S.eventos.find(x=>x.id===S.edit);Object.assign(e,data,{mod:Date.now()});toast('Evento actualizado')}
  else{S.eventos.push(Object.assign({id:uid(),creado:Date.now()},data));toast('Evento creado')}
  persist();S.filtro.add(tipo);cerrar();irA(f);
}
let papelera=null;
function eliminar(id){
  const i=S.eventos.findIndex(e=>e.id===id);if(i<0)return;
  papelera={e:S.eventos[i],i};S.eventos.splice(i,1);persist();render();
  toast('Evento eliminado',()=>{if(papelera){S.eventos.splice(papelera.i,0,papelera.e);persist();papelera=null;render();toast('Evento restaurado')}});
}

/* ===================== Toast ===================== */
let tT;
function toast(m,undo){const t=$('toast');$('tMsg').textContent=m;const b=$('tBtn');b.hidden=!undo;b.onclick=()=>{t.classList.remove('on');undo&&undo()};
  t.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),undo?5000:2200)}

/* ===================== Eventos de interfaz ===================== */
$('calPrev').onclick=()=>paso(-1);$('calNext').onclick=()=>paso(1);
$('calHoy').onclick=()=>irA(hoyK(),'f');
$('btnNuevo').onclick=()=>abrir();$('fab').onclick=()=>abrir();
if(INTEGRADO)$('btnTema').hidden=true;   /* integrado: el tema lo manda el Cuadro de Mando */
$('btnTema').onclick=()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('essa.tema',r.dataset.theme)}catch(e){}};
document.querySelector('#mCal .seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.view=b.dataset.v;render('f')});

$('calGrid').addEventListener('click',e=>{
  const ev=e.target.closest('[data-id]');if(ev){const o=S.eventos.find(x=>x.id===ev.dataset.id);if(o){abrir(o);return}}
  const sl=e.target.closest('.dySlot');if(sl){const m=hm(sl.dataset.h);abrir(null,{fecha:S.sel,ini:sl.dataset.h,fin:K0(m+60)});return}
  const c=e.target.closest('[data-k]');if(!c)return;
  if(e.target.closest('.libre')&&c.dataset.k===S.sel){abrir(null,{fecha:c.dataset.k});return}
  irA(c.dataset.k);if(window.innerWidth<=1024&&S.view==='mes')$('calPanel').scrollIntoView({behavior:'smooth',block:'start'});
});
$('calGrid').addEventListener('dblclick',e=>{const c=e.target.closest('.calD');if(c)abrir(null,{fecha:c.dataset.k})});
$('calGrid').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('calD')){e.preventDefault();abrir(null,{fecha:e.target.dataset.k})}});

$('calPanel').addEventListener('click',e=>{
  const qt=e.target.closest('[data-qt]');if(qt){S.qTipo=qt.dataset.qt;document.querySelectorAll('#calPanel [data-qt]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.qt===S.qTipo));return}
  const ed=e.target.closest('[data-ed]');if(ed){abrir(S.eventos.find(x=>x.id===ed.dataset.ed));return}
  const dl=e.target.closest('[data-del]');if(dl){eliminar(dl.dataset.del);return}
  const et=e.target.closest('.eT');if(et){abrir(S.eventos.find(x=>x.id===et.dataset.id));return}
  if(e.target.closest('#qAdd'))rapida();
  if(e.target.closest('#qMas'))abrir(null,{titulo:$('calTxt').value.trim(),fecha:S.sel,tipo:S.qTipo});
});
$('calPanel').addEventListener('keydown',e=>{
  if(e.target.id==='calTxt'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();rapida()}
  if(e.target.classList.contains('eT')&&e.key==='Enter')abrir(S.eventos.find(x=>x.id===e.target.dataset.id));
});
function rapida(){const v=$('calTxt').value.trim();if(!v){$('calTxt').focus();return}
  S.eventos.push({id:uid(),creado:Date.now(),titulo:v,fecha:S.sel,tipo:S.qTipo,ini:null,fin:null,desc:''});persist();S.filtro.add(S.qTipo);render();
  toast(TIPOS[S.qTipo].lb+' agregada');setTimeout(()=>$('calTxt')&&$('calTxt').focus(),0)}

$('mini').addEventListener('click',e=>{const m=e.target.closest('[data-mm]');
  if(m){const b=miniRef||D(S.sel);miniRef=new Date(b.getFullYear(),b.getMonth()+Number(m.dataset.mm),1);renderMini();return}
  const b=e.target.closest('[data-k]');if(b)irA(b.dataset.k)});
$('upList').addEventListener('click',e=>{const l=e.target.closest('[data-go]');if(l)irA(l.dataset.go,'f')});
$('upList').addEventListener('keydown',e=>{const l=e.target.closest('[data-go]');if(l&&e.key==='Enter')irA(l.dataset.go,'f')});
$('legend').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;const t=b.dataset.f;
  if(S.filtro.has(t)){if(S.filtro.size>1)S.filtro.delete(t)}else S.filtro.add(t);render()});

$('fTipo').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;tSel(b.dataset.t);
  if(!S.edit){const td=b.dataset.t!=='reunion';$('fTodo').checked=td;$('fHrs').classList.toggle('off',td)}});
$('fTodo').onchange=e=>$('fHrs').classList.toggle('off',e.target.checked);
$('fIni').onchange=()=>{const i=hm($('fIni').value),f=hm($('fFin').value);if(i!=null&&(f==null||f<=i))$('fFin').value=K0(Math.min(i+60,23*60+59))};
$('fTit').oninput=()=>{$('fTit').classList.remove('err');$('mErr').textContent=''};
$('mOk').onclick=guardar;$('mCan').onclick=cerrar;$('mX').onclick=cerrar;
$('mDel').onclick=()=>{const id=S.edit;cerrar();eliminar(id)};
$('mForm').onsubmit=e=>{e.preventDefault();guardar()};
$('ov').addEventListener('mousedown',e=>{if(e.target===$('ov'))cerrar()});

document.addEventListener('keydown',e=>{
  if($('ov').classList.contains('on')){
    if(e.key==='Escape')cerrar();
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))guardar();
    if(e.key==='Tab'){const f=[...document.querySelectorAll('#ov button:not([hidden]),#ov input,#ov textarea')].filter(x=>x.offsetParent);
      const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
    return}
  if(e.key==='Escape'&&INTEGRADO){try{window.parent.postMessage({tipo:'essa-cal-cerrar'},'*')}catch(x){}return}
  const tg=e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||e.ctrlKey||e.metaKey||e.altKey)return;
  const mv={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
  if(mv!==undefined&&document.getElementById('mCal').contains(e.target)||mv!==undefined&&e.target===document.body){
    e.preventDefault();irA(K(add(D(S.sel),S.view==='dia'&&Math.abs(mv)===7?Math.sign(mv):mv)));enfocarSel();return}
  if(e.key==='PageUp'){e.preventDefault();paso(-1)}
  else if(e.key==='PageDown'){e.preventDefault();paso(1)}
  else if(e.key==='t'||e.key==='T')irA(hoyK(),'f');
  else if(e.key==='n'||e.key==='N'){e.preventDefault();abrir()}
  else if(e.key==='m'||e.key==='M'){S.view='mes';render('f')}
  else if(e.key==='s'||e.key==='S'){S.view='semana';render('f')}
  else if(e.key==='d'||e.key==='D'){S.view='dia';render('f')}
});
window.addEventListener('resize',moverThumb);
window.addEventListener('storage',e=>{if(e.key===CalStore.key){S.eventos=CalStore.load();render()}});
/* Al volver a abrir la ventana flotante se releen los eventos por si cambiaron. */
window.addEventListener('focus',()=>{const l=CalStore.load();if(JSON.stringify(l)!==JSON.stringify(S.eventos)){S.eventos=l;render()}});
/* Mantiene “hoy” y la línea de hora actualizados si la vista queda abierta */
setInterval(()=>{if(!$('ov').classList.contains('on'))render()},60000);

if(!INTEGRADO){try{const t=localStorage.getItem('essa.tema');if(t)document.documentElement.dataset.theme=t}catch(e){}}
migrarCalendarioAnterior();
render();
})();
