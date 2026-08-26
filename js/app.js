/* ==================== bloque_0 ==================== */
const BASE=['NUMERO_CUENTA','NUMERO_PROCESO','TIPO_PROCESO','NOMBRE_SOLICITANTE','CEDULA_SOLICITANTE','RADICADO_ENTRADA','RADICADO_SALIDA','FECHA_SOLICITUD','FECHA_VENCIMIENTO','ESTADO_PROCESO','DIRECCION_SOLICITANTE','CORREO_SOLICITANTE','TELEFONO_SOLICITANTE','CELULAR_SOLICITANTE','NOMBRE_SUSCRIPTOR','OBSERVACION_PROCESO','FIRMA_USUARIO','FIRMA_DOCUMENTO'];var app = window.app = {modo:'excel',datos:[],columnas:[...BASE],plantillas:{peticiones:[],reclamos:[],agpe:[],quejas:[]},seleccion:null,visibles:[],marcados:new Set(),variables:[],manual:{},camposManual:[...BASE],loteManual:[],firmaDataUrl:'',profiles:{},currentProfile:'Perfil Principal',previewRow:null};const CLAVE=['NUMERO_CUENTA','NUMERO_PROCESO','NOMBRE_SOLICITANTE','RADICADO_ENTRADA','RADICADO_SALIDA','FECHA_SOLICITUD','ESTADO_PROCESO','TIPO_PROCESO'];
function $(id){return document.getElementById(id)}function toast(t){const x=$('toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2300)}function norm(v){return String(v??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'')}function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

/* COPILOT FIX M4_NUMEROS_PLANOS_V1
   Normaliza identificadores/códigos numéricos para que la tabla, edición manual
   y combinación Word no muestren notación científica ni separadores. */
function expandirNotacionCientificaCopilot(valor){
  let s=String(valor??'').trim();
  if(!/^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i.test(s))return s;
  let sign='';
  if(s[0]==='-'||s[0]==='+'){sign=s[0]==='-'?'-':'';s=s.slice(1);}
  let [mant,expTxt]=s.toLowerCase().split('e');
  let exp=parseInt(expTxt,10);
  let [ent,dec='']=mant.split('.');
  let digits=(ent+dec).replace(/^0+(?=\d)/,'');
  let point=ent.length+exp;
  if(point<=0)return sign+'0.'+'0'.repeat(Math.abs(point))+digits;
  if(point>=digits.length)return sign+digits+'0'.repeat(point-digits.length);
  return sign+digits.slice(0,point)+'.'+digits.slice(point);
}
function formatoNumeroPlanoCopilot(v,campo){
  if(v===undefined||v===null)return '';
  const campoNorm=typeof norm==='function'?norm(campo||''):String(campo||'').toUpperCase();
  const fechaPlanoCopilot=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
  if(v instanceof Date&&!isNaN(v))return fechaPlanoCopilot(v);
  if(typeof v==='number'){
    if(!isFinite(v))return '';
    if(/FECHA|FEC_|_FEC/.test(campoNorm)&&v>25569&&v<60000){let d=new Date(Math.round((v-25569)*86400*1000));if(!isNaN(d))return fechaPlanoCopilot(d);}
    if(Number.isInteger(v))return expandirNotacionCientificaCopilot(v.toString()).replace(/\.0+$/,'');
    return expandirNotacionCientificaCopilot(String(v)).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
  }
  let s=String(v).trim();
  if(!s)return '';
  s=expandirNotacionCientificaCopilot(s);
  /* Si quedó como entero con .000..., dejarlo completamente plano. */
  if(/^[+-]?\d+\.0+$/.test(s))s=s.replace(/\.0+$/,'');
  /* Para cadenas claramente numéricas largas, quitar separadores comunes sin tocar textos mixtos. */
  if(/^[+-]?[\d.,\s]+$/.test(s) && /\d/.test(s)){
    let limpio=s.replace(/[\s,]/g,'');
    if(/^[+-]?\d+\.0+$/.test(limpio))limpio=limpio.replace(/\.0+$/,'');
    if(/^[+-]?\d+$/.test(limpio))s=limpio;
  }
  return s;
}
function estado(t,c=''){$('estado').className='status '+c;$('estado').textContent=t}function progreso(p){$('bar').style.width=Math.max(0,Math.min(100,p))+'%'}let docZoom=1;function setSidebarCollapsedCopilot(collapsed){
  const side=document.getElementById('sidebar');
  const btn=side?side.querySelector('.sidebar-toggler'):null;
  collapsed=!!collapsed;
  document.body.classList.toggle('menu-mini',collapsed);
  if(side) side.classList.toggle('collapsed',collapsed);
  if(btn){
    btn.setAttribute('aria-expanded',String(!collapsed));
    btn.title=collapsed?'Expandir menú':'Contraer menú';
    btn.setAttribute('aria-label',collapsed?'Expandir menú lateral':'Contraer menú lateral');
  }
  localStorage.setItem('premiumMenuMini',collapsed?'1':'0');
}
function toggleMenu(){
  const side=document.getElementById('sidebar');
  const collapsed=side?side.classList.contains('collapsed'):document.body.classList.contains('menu-mini');
  setSidebarCollapsedCopilot(!collapsed);
}function toggleFocusMode(){document.body.classList.toggle('focus-mode');setTimeout(()=>actualizarPreviewDebounced(true),260)}function zoomDoc(d){docZoom=Math.max(.55,Math.min(1.55,docZoom+d));document.documentElement.style.setProperty('--doc-zoom',docZoom.toFixed(2))}
function revisarLibs(){let f=[];if(!window.XLSX)f.push('xlsx.full.min.js');if(!window.PizZip)f.push('pizzip.min.js');if(!window.easyTemplateXLegacyRemoved&&!window.EasyTemplateXLegacyRemoved)f.push('easyTemplateXLegacyRemoved.js');if(!window.saveAs)f.push('FileSaver.min.js');if(!window.JSZip)f.push('jszip.min.js');if(!window.docx)f.push('docx-preview.min.js');$('libStatus').innerHTML=f.length?`<div class="danger"><b>Faltan librerías:</b> ${f.join(', ')}. Ejecute 01_DESCARGAR_COMPONENTES_V7_3.bat.</div>`:`<div class="help"><b>Librerías cargadas correctamente.</b> Menú fijo por hamburguesa aplicado.</div>`}
function cfg(){return{perfilNombre:$('perfilNombre')?.value||app.currentProfile,rutaExcel:$('rutaExcel')?.value||'',rutaDestino:$('rutaDestino')?.value||'',tipoProceso:$('tipoProceso')?.value||'peticiones',nombreArchivo:$('nombreArchivo')?.value||'Documento_[RADICADO_ENTRADA]_[NUMERO_CUENTA]',manual:app.manual,firmaDataUrl:app.firmaDataUrl,plantillaNombre:app.seleccion?app.plantillas[app.seleccion.tipo][app.seleccion.i]?.name:''}}function saveProfiles(){localStorage.setItem('genWordProfilesV73',JSON.stringify(app.profiles));localStorage.setItem('genWordCurrentProfileV73',app.currentProfile)}function guardarPerfilActual(){if(!$('guardarPrefs')?.checked)return;app.profiles[app.currentProfile]=cfg();saveProfiles();try{renderProfiles()}catch(e){}}function loadProfiles(){try{app.profiles=JSON.parse(localStorage.getItem('genWordProfilesV73')||'{}')}catch(e){}if(!Object.keys(app.profiles).length)app.profiles['Perfil Principal']={perfilNombre:'Perfil Principal',tipoProceso:'peticiones',nombreArchivo:'Documento_[RADICADO_ENTRADA]_[NUMERO_CUENTA]',manual:{},firmaDataUrl:''};app.currentProfile=localStorage.getItem('genWordCurrentProfileV73')||Object.keys(app.profiles)[0];applyProfile(app.currentProfile,false)}function applyProfile(n,msg=true){let c=app.profiles[n];if(!c)return;app.currentProfile=n;if($('perfilNombre'))$('perfilNombre').value=c.perfilNombre||n;if($('rutaExcel'))$('rutaExcel').value=c.rutaExcel||'';if($('rutaDestino'))$('rutaDestino').value=c.rutaDestino||'';if($('tipoProceso'))$('tipoProceso').value=c.tipoProceso||'peticiones';if($('nombreArchivo'))$('nombreArchivo').value=c.nombreArchivo||'Documento_[RADICADO_ENTRADA]_[NUMERO_CUENTA]';app.manual=c.manual||{};app.firmaDataUrl=c.firmaDataUrl||'';try{renderProfiles()}catch(e){};renderFormularioManual();renderPlantillas();actualizarPreviewDebounced(true);if(msg)toast('Perfil cargado')}function guardarComoPerfil(){let n=$('perfilNombre')?.value?.trim()||app.currentProfile||('Perfil '+new Date().toLocaleString());app.currentProfile=n;app.profiles[n]=cfg();app.profiles[n].perfilNombre=n;saveProfiles();try{renderProfiles()}catch(e){};toast('Perfil guardado')}function eliminarPerfilActual(){if(Object.keys(app.profiles).length<=1){toast('Debe existir al menos un perfil');return}delete app.profiles[app.currentProfile];app.currentProfile=Object.keys(app.profiles)[0];saveProfiles();applyProfile(app.currentProfile,false);toast('Perfil eliminado')}function renderProfiles(){let c=$('profileList');c.innerHTML=Object.keys(app.profiles).map(n=>`<div class="profileItem ${n===app.currentProfile?'active':''}"><div><b>${esc(n)}</b><div class="mini">${esc(app.profiles[n].plantillaNombre||'Sin plantilla')}</div></div><button class="ghost" onclick="applyProfile('${esc(n).replace(/'/g,"\\'")}')">Usar</button></div>`).join('')}function exportarPerfil(){saveAs(new Blob([JSON.stringify(app.profiles[app.currentProfile]||cfg(),null,2)],{type:'application/json'}),(app.currentProfile||'perfil')+'.json')}$('importPerfil').addEventListener('change',async e=>{let f=e.target.files[0];if(!f)return;let c=JSON.parse(await f.text());let n=c.perfilNombre||f.name.replace(/\.json$/i,'');app.profiles[n]=c;app.currentProfile=n;saveProfiles();applyProfile(n);});
function kpis(){app.plantillas=app.plantillas||{peticiones:[],reclamos:[],agpe:[],quejas:[]};app.plantillas.peticiones=app.plantillas.peticiones||[];app.plantillas.reclamos=app.plantillas.reclamos||[];app.plantillas.agpe=app.plantillas.agpe||[];app.plantillas.quejas=app.plantillas.quejas||[];let e;$('kpiExcel').textContent=app.datos.length;if(e=$('kpiPet'))e.textContent=app.plantillas.peticiones.length;if(e=$('kpiRec'))e.textContent=app.plantillas.reclamos.length;$('kpiMarcados').textContent=app.marcados.size;if(e=$('kpiManual'))e.textContent=app.loteManual.length;let fs=$('folderStatus');if(fs){let firma=app.firmaDataUrl?'cargada':'pendiente';fs.classList.add('folderStatusPro');fs.innerHTML=`<div class="folderStatusGridCopilot"><div class="folderStatusItemCopilot"><span class="folderStatusLabelCopilot">Excel:</span><span class="folderStatusValueCopilot">${app.datos.length} registros</span></div><div class="folderStatusItemCopilot"><span class="folderStatusLabelCopilot">Peticiones:</span><span class="folderStatusValueCopilot">${app.plantillas.peticiones.length} plantillas</span></div><div class="folderStatusItemCopilot"><span class="folderStatusLabelCopilot">Reclamos:</span><span class="folderStatusValueCopilot">${app.plantillas.reclamos.length} plantillas</span></div><div class="folderStatusItemCopilot"><span class="folderStatusLabelCopilot">AGPE:</span><span class="folderStatusValueCopilot">${app.plantillas.agpe.length} plantillas</span></div><div class="folderStatusItemCopilot"><span class="folderStatusLabelCopilot">Quejas:</span><span class="folderStatusValueCopilot">${app.plantillas.quejas.length} plantillas</span></div><div class="folderStatusItemCopilot"><span class="folderStatusLabelCopilot">Firma:</span><span class="folderStatusValueCopilot">${firma}</span></div></div>`;}}
async function leerExcel(file){$('rutaExcel').value=file.name;$('excelFileName').textContent=file.name;let data=await file.arrayBuffer();let wb=XLSX.read(data,{type:'array',cellDates:true});let sheetName=wb.SheetNames.find(n=>norm(n)==='GENERAL')||wb.SheetNames[0];let ws=wb.Sheets[sheetName];let rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true,blankrows:false});app.datos=rows.map((r,i)=>{let o={__idx:i};Object.keys(r).forEach(k=>o[norm(k)]=formatoNumeroPlanoCopilot(r[k],norm(k)));return o});app.columnas=[...new Set([...BASE,...Object.keys(app.datos[0]||{}).filter(x=>x!='__idx')])];app.marcados.clear();renderTabla();renderFormularioManual();kpis();guardarPerfilActual();actualizarPreviewDebounced(true);estado(`Excel cargado: ${app.datos.length} registros.`,'ok');toast('Excel cargado')}$('excelInput').addEventListener('change',e=>e.target.files[0]&&leerExcel(e.target.files[0]));$('firmaInput').addEventListener('change',e=>e.target.files[0]&&leerFirma(e.target.files[0]));function leerFirma(file){if(!file.type.startsWith('image/'))return alert('Seleccione una imagen');$('firmaFileName').textContent=file.name;let r=new FileReader();r.onload=()=>{app.firmaDataUrl=r.result;app.manual.FIRMA_USUARIO='[imagen cargada]';guardarPerfilActual();renderFormularioManual();actualizarPreviewDebounced(true);kpis();toast('Firma vinculada')};r.readAsDataURL(file)}function setupDrop(id,cb){let el=$(id);['dragenter','dragover'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();el.classList.add('drag')}));['dragleave','drop'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();el.classList.remove('drag')}));el.addEventListener('drop',e=>{let f=e.dataTransfer.files[0];if(f)cb(f)})}setupDrop('dropExcel',leerExcel);setupDrop('dropFirma',leerFirma);
async function seleccionarCarpeta(tipo){if(!window.showDirectoryPicker)return alert('Use Chrome o Edge actualizado.');const labels={peticiones:'Peticiones',reclamos:'Reclamos',agpe:'AGPE',quejas:'Quejas'};const btns={peticiones:'folderBtnPeticiones',reclamos:'folderBtnReclamos',agpe:'folderBtnAGPE',quejas:'folderBtnQuejas'};try{let dir=await showDirectoryPicker();let arr=[];for await(const [name,h] of dir.entries())if(h.kind==='file'&&name.toLowerCase().endsWith('.docx'))arr.push({name,handle:h,categoria:cat(name),vars:[]});app.plantillas=app.plantillas||{peticiones:[],reclamos:[],agpe:[],quejas:[]};app.plantillas.peticiones=app.plantillas.peticiones||[];app.plantillas.reclamos=app.plantillas.reclamos||[];app.plantillas.agpe=app.plantillas.agpe||[];app.plantillas.quejas=app.plantillas.quejas||[];app.plantillas[tipo]=arr.sort((a,b)=>a.name.localeCompare(b.name));let btn=$(btns[tipo]);if(btn)btn.classList.add('loaded');renderCategorias();renderPlantillas();kpis();if(typeof guardarPerfilActual==='function')guardarPerfilActual();toast('Carpeta '+(labels[tipo]||tipo)+' cargada: '+arr.length+' plantillas');setTimeout(()=>miniaturas(tipo),200)}catch(e){if(e&&e.name==='AbortError')return;console.error(e);alert('No se pudo cargar la carpeta.\n\n'+(e.message||e));}}function cat(n){let s=norm(n);if(s.includes('CONTRATO'))return 'Contratos';if(s.includes('INFORME'))return 'Informes';if(s.includes('ACTA'))return 'Actas';if(s.includes('BLOQUEO'))return 'Bloqueos';if(s.includes('CAMBIO'))return 'Cambios';if(s.includes('RECLAM'))return 'Reclamos';return 'General'}function renderCategorias(){app.plantillas=app.plantillas||{peticiones:[],reclamos:[],agpe:[],quejas:[]};let todas=Object.values(app.plantillas).flat();let cats=[...new Set(todas.map(x=>x.categoria))].filter(Boolean).sort();$('categoriaFiltro').innerHTML='<option value="todas">Todas las categorías</option>'+cats.map(c=>`<option>${c}</option>`).join('')}function renderPlantillas(){let tipo=$('tipoProceso').value,q=norm($('buscarPlantilla')?.value||''),cf=$('categoriaFiltro')?.value||'todas',cont=$('listaPlantillas');let list=app.plantillas[tipo].filter(t=>(cf==='todas'||t.categoria===cf)&&(!q||norm(t.name).includes(q)||norm(t.categoria).includes(q)||(t.vars||[]).some(v=>norm(v).includes(q))));cont.innerHTML=list.map(t=>{let i=app.plantillas[tipo].indexOf(t),req=(t.vars?.length?t.vars.slice(0,8):['Detectar al usar']).join(', ');return `<div class="templateCard ${app.seleccion?.tipo===tipo&&app.seleccion?.i===i?'active':''}"><div class="thumbDocx" id="thumb_${tipo}_${i}"><div class="thumbLoader">Miniatura DOCX</div></div><div><div class="templateName">${esc(t.name)}</div><span class="badge">${esc(t.categoria)}</span><span class="badge">DOCX</span></div><div class="reqs"><b>Requiere:</b> ${esc(req)}</div><button onclick="seleccionarPlantilla('${tipo}',${i})">Usar plantilla</button></div>`}).join('')||'<p class="muted">Seleccione carpeta o ajuste la búsqueda.</p>';setTimeout(()=>miniaturas(tipo),50)}async function getBuf(t){return await (await t.handle.getFile()).arrayBuffer()}async function miniaturas(tipo){if(!window.docx)return;let arr=app.plantillas[tipo]||[],idx=0;async function next(){while(idx<arr.length){let i=idx++,el=$(`thumb_${tipo}_${i}`);if(!el||el.dataset.rendered)continue;try{el.innerHTML='<div class="thumbLoader">Renderizando...</div>';let buf=await getBuf(arr[i]);el.innerHTML='';await docx.renderAsync(buf,el,null,{className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,renderHeaders:true,renderFooters:true});el.dataset.rendered='1'}catch(e){el.innerHTML='<div class="thumbLoader">Sin miniatura</div>'}next();return}}for(let c=0;c<4;c++)next()}
async function seleccionarPlantilla(tipo,i){app.seleccion={tipo,i};await detectarVars(app.plantillas[tipo][i]);guardarPerfilActual();renderPlantillas();cargarVariablesEnFormulario(false);actualizarPreviewDebounced(true);toast('Plantilla seleccionada')}async function detectarVars(t){let zip=new PizZip(await getBuf(t));let set=new Set(),re=/\[[A-Z\u00C0-\u00FF0-9_\- ]+\]/gi;Object.keys(zip.files).forEach(k=>{if(!k.startsWith('word/')||!k.endsWith('.xml'))return;let txt=zip.files[k].asText(),m;while((m=re.exec(txt))){let v=norm(m[0].slice(1,-1));if(v)set.add(v)}});let vars=[...set].sort();t.vars=vars;app.variables=vars;$('variablesDetectadas').innerHTML=vars.map(v=>{let ok=variableDisponibleCopilot(v);let eq=(esPlantillaAgpeCopilot()&&columnaEquivalenteAgpeCopilot(v)!==v)?' → '+columnaEquivalenteAgpeCopilot(v):'';return `<span class="var ${ok?'':'missing'}" title="${esc(eq?('Equivale a '+columnaEquivalenteAgpeCopilot(v)):'')}">[${v}]${eq}${ok?'':' ⚠'}</span>`}).join('')||'<span class="muted">No se detectaron variables.</span>'}async function archivoPlantilla(){return await app.plantillas[app.seleccion.tipo][app.seleccion.i].handle.getFile()}function cambiarModo(m){app.modo=m;$('previewMode').textContent=m==='excel'?'Excel':'Manual';$('tabExcel').classList.toggle('active',m==='excel');$('tabManual').classList.toggle('active',m==='manual');$('panelExcel').classList.toggle('hidden',m!=='excel');$('panelManual').classList.toggle('hidden',m!=='manual');actualizarPreviewDebounced(true)}function precargarManualDesdeFilaCopilot(row,render=true){if(!row)return;app.manual={};Object.keys(row).forEach(c=>{if(c&&c!=='__idx'&&c!=='FIRMA_USUARIO')app.manual[c]=row[c]??''});let camposBase=Array.isArray(app.camposManual)&&app.camposManual.length?app.camposManual:[...BASE];app.camposManual=[...new Set([...camposBase,...CLAVE,...(app.columnas||[]),...Object.keys(row).filter(c=>c&&c!=='__idx'&&c!=='FIRMA_USUARIO'),'FIRMA_USUARIO'])];if(render)renderFormularioManual();if(typeof guardarPerfilActual==='function')guardarPerfilActual()}function limpiarSeleccionTablaCopilot(render=true){app.previewRow=null;app.filaManualSeleccionada=null;app.manual={};if(render)renderFormularioManual();actualizarFilaSeleccionadaCopilot(null);if(typeof guardarPerfilActual==='function')guardarPerfilActual()}function actualizarFilaSeleccionadaCopilot(i){requestAnimationFrame(()=>{document.querySelectorAll('#tablaDatos tbody tr.filaDatoCopilot').forEach(tr=>{let on=i!==null&&i!==undefined&&Number(tr.dataset.rowIndex)===Number(i);tr.classList.toggle('filaDatoSeleccionadaCopilot',on);tr.setAttribute('aria-selected',on?'true':'false')})})}function renderTabla(){let q=norm($('buscar')?.value||''),cols=CLAVE.filter(c=>app.columnas.includes(c)).concat(app.columnas.filter(c=>!CLAVE.includes(c)&&c!='FIRMA_USUARIO').slice(0,6));app.visibles=app.datos.filter(r=>!q||Object.values(r).some(v=>norm(v).includes(q))).slice(0,500);let visibleIds=new Set(app.visibles.map(r=>r.__idx));if(app.filaManualSeleccionada!==null&&app.filaManualSeleccionada!==undefined&&!visibleIds.has(app.filaManualSeleccionada))limpiarSeleccionTablaCopilot(false);let html='<thead><tr><th></th><th>#</th>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';let activo=app.filaManualSeleccionada!==undefined&&app.filaManualSeleccionada!==null?app.filaManualSeleccionada:(app.previewRow&&app.previewRow.__idx!==undefined?app.previewRow.__idx:null);app.visibles.forEach(r=>{let sel=Number(activo)===Number(r.__idx);html+=`<tr class="filaDatoCopilot ${sel?'filaDatoSeleccionadaCopilot':''}" data-row-index="${r.__idx}" tabindex="0" role="row" aria-selected="${sel?'true':'false'}" title="Seleccionar registro y precargar en edición manual" onclick="previsualizarFila(${r.__idx})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();previsualizarFila(${r.__idx})}"><td><input class="check" type="checkbox" aria-label="Marcar registro ${r.__idx+1}" onclick="event.stopPropagation()" ${app.marcados.has(r.__idx)?'checked':''} onchange="toggleMarcado(${r.__idx},this.checked)"></td><td>${r.__idx+1}</td>`+cols.map(c=>`<td class="numeroPlanoCopilot">${esc(formatoNumeroPlanoCopilot(r[c],c))}</td>`).join('')+'</tr>'});$('tablaDatos').innerHTML=app.datos.length?html+'</tbody>':'<tbody><tr><td>Cargue el Excel para visualizar registros.</td></tr></tbody>';kpis();if(!app.filaManualSeleccionada&&app.filaManualSeleccionada!==0&&app.modo==='manual')renderFormularioManual()}function previsualizarFila(i){let row=app.datos.find(r=>r.__idx===i);if(!row)return;if(app.filaManualSeleccionada===i){limpiarSeleccionTablaCopilot(true);actualizarPreviewDebounced(true);return}app.previewRow=row;app.filaManualSeleccionada=i;actualizarFilaSeleccionadaCopilot(i);precargarManualDesdeFilaCopilot(row,true);actualizarPreviewDebounced(true)}function toggleMarcado(i,on){on?app.marcados.add(i):app.marcados.delete(i);kpis();if(on)previsualizarFila(i);else if(app.filaManualSeleccionada===i){limpiarSeleccionTablaCopilot(true);actualizarPreviewDebounced(true)}}function seleccionarVisibles(on){app.visibles.forEach(r=>on?app.marcados.add(r.__idx):app.marcados.delete(r.__idx));renderTabla();actualizarPreviewDebounced(true)}function cargarVariablesEnFormulario(render=true){app.camposManual=[...new Set([...(app.variables.length?app.variables:CLAVE),...CLAVE,'FIRMA_USUARIO'])];if(render)renderFormularioManual()}function cargarColumnasEnFormulario(){app.camposManual=[...app.columnas];renderFormularioManual();}const CAMPOS_FORM_MANUAL_FIJOS=['CORREO_SOLICITANTE','FECHA_SOLICITUD','NOMBRE_SOLICITANTE','NUMERO_CUENTA','RADICADO_ENTRADA','NUMERO_PROCESO','DESCRIPCION_PROCESO','CELULAR_SOLICITANTE','OBSERVACION_PROCESO','DIRECCION_SOLICITANTE'];
function renderFormularioManual(){
  let q=norm($('buscarCampo')?.value||''),cont=$('formManual');
  if(!cont)return;
  let campos=CAMPOS_FORM_MANUAL_FIJOS.filter(c=>!q||norm(c).includes(q));
  cont.innerHTML=campos.map(c=>{
    const valor=esc(formatoNumeroPlanoCopilot(app.manual[c]||'',c));
    const control=(c.includes('OBSERVACION')||c.includes('DESCRIPCION'))
      ? `<textarea data-campo="${c}" oninput="editarCampoManual('${c}',this.value)">${valor}</textarea>`
      : `<input data-campo="${c}" value="${valor}" oninput="editarCampoManual('${c}',this.value)">`;
    return `<div class="field"><label>${c}</label>${control}</div>`;
  }).join('');
}
window.editarCampoManual=function(campo,valor){
  app.manual[campo]=valor;
  const idx=app.filaManualSeleccionada;
  if(idx!=null&&Array.isArray(app.datos)){
    const row=app.datos.find(r=>r.__idx===idx);
    if(row){row[campo]=valor;if(row.__ns!==undefined){try{delete row.__ns}catch(e){row.__ns=undefined}}if(typeof renderTablaDebounced==='function')renderTablaDebounced();}
  }
  guardarPerfilActual();actualizarPreviewDebounced();
};
function leerManual(){document.querySelectorAll('[data-campo]').forEach(el=>app.manual[el.dataset.campo]=el.value);let row={};[...new Set([...BASE,...app.columnas,...app.variables])].forEach(c=>row[c]=app.manual[c]||'');row.FIRMA_USUARIO=app.firmaDataUrl?'[imagen cargada]':'';return row}function limpiarFormularioManual(){app.manual={};app.previewRow=null;app.filaManualSeleccionada=null;actualizarFilaSeleccionadaCopilot(null);renderFormularioManual();guardarPerfilActual();actualizarPreviewDebounced(true)}function agregarManualALista(){app.loteManual.push({...leerManual()});kpis();toast('Registro manual agregado')}/* =========================================================
   COPILOT V16.3 - Reglas Excel -> Word
   Correo: blindaje antes y limpieza después del render para eliminar [object Promise].
   ========================================================= */
const CONECTORES_TITULO_COPILOT=new Set(['de','del','la','las','los','y','e','el','en','a','al','por','para','con','sin','o','u']);
function valorExactoCopilot(v){return formatoNumeroPlanoCopilot(v);}
function limpiarEspaciosCopilot(v){return valorExactoCopilot(v).replace(/\s+/g,' ').trim();}
function palabraTituloCopilot(w){w=String(w||'').toLocaleLowerCase('es-CO');return w?w.charAt(0).toLocaleUpperCase('es-CO')+w.slice(1):'';}
function formatoTituloCopilot(v,opts={}){let s=limpiarEspaciosCopilot(v);if(opts.quitarNoDefinido)s=s.replace(/NO\s+DEFINIDO/gi,'').replace(/\s+/g,' ').trim();return s.split(' ').filter(Boolean).map((w,i)=>{let lw=w.toLocaleLowerCase('es-CO');if(i>0&&CONECTORES_TITULO_COPILOT.has(lw))return lw;return w.split('-').map(p=>palabraTituloCopilot(p)).join('-');}).join(' ');}
function primerNombreCopilot(nombre){let partes=formatoTituloCopilot(nombre).split(' ').filter(Boolean);if(partes.length>=3)return partes[2];if(partes.length>=2)return partes[1];return partes[0]||'';}
function correoCopilot(v){return limpiarEspaciosCopilot(v).toLocaleLowerCase('es-CO');}
function buscarCorreoFilaCopilot(row){row=row||{};let directos=[row.CORREO_SOLICITANTE,row['CORREO SOLICITANTE'],row.EMAIL,row.E_MAIL,row.MAIL,row.CORREO,row.CORREO_ELECTRONICO,row['CORREO ELECTRONICO'],row.EMAIL_SOLICITANTE,row['EMAIL SOLICITANTE']];for(let v of directos){let s=correoCopilot(v);if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))return s;}for(let k of Object.keys(row)){let s=correoCopilot(row[k]);let m=s.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);if(m)return m[0].toLocaleLowerCase('es-CO');}return '';}

function valorCampoFilaCopilot(row,campo){row=row||{};if(!campo)return '';if(Object.prototype.hasOwnProperty.call(row,campo))return row[campo];let alt=String(campo).replace(/_/g,' ');if(Object.prototype.hasOwnProperty.call(row,alt))return row[alt];let objetivo=norm(String(campo));for(let k of Object.keys(row||{})){if(norm(k)===objetivo)return row[k];}return '';}
function esPlantillaAgpeCopilot(){return !!(app&&app.seleccion&&String(app.seleccion.tipo||'').toLowerCase()==='agpe');}
function fechaMesSlashCopilot(v){let meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];let d=null;if(v instanceof Date&&!isNaN(v))d=v;else{let s=limpiarEspaciosCopilot(v);let m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;d=new Date(y,+m[2]-1,+m[1]);}else{let n=Number(s);if(isFinite(n)&&n>25569&&n<60000)d=new Date(Math.round((n-25569)*86400*1000));else{let t=Date.parse(s);if(!isNaN(t))d=new Date(t);}}}if(!d||isNaN(d))return valorExactoCopilot(v);return String(d.getDate()).padStart(2,'0')+'/'+meses[d.getMonth()]+'/'+d.getFullYear();}
function fechaActualLargaCopilot(){let meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];let d=new Date();return String(d.getDate()).padStart(2,'0')+' de '+meses[d.getMonth()]+' de '+d.getFullYear();}
function columnaEquivalenteAgpeCopilot(variable){let mapa={NOMBRE_SOLICITANTE:'NOMBRE_SUSCRIPTOR',DIRECCION_SOLICITANTE:'DIRECCION_SUSCRIPTOR',MUNICIPIO_SUSCRIPTOR:'MUNICIPIO_SUSCRIPTOR',DEPARTAMENTO_SOLICITANTE:'DEPTO_SUSCRIPTOR',CORREO_ELECTRONICO:'CORREO_SOLICITANTE',CELULAR:'CELULAR_SUSCRIPTOR',NUMERO_PROCESO:'NUMERO_PROCESO',NUMERO_CUENTA:'NUMERO_CUENTA',FECHA_ACTUAL:'Fecha del sistema',FECHA_RECIBIDO:'FECHA_SOLICITUD',CIRCUITO:'CIRCUITO',TRANSFORMADOR:'ID_TRAFO'};return mapa[norm(variable)]||variable;}
function variableDisponibleCopilot(variable){let v=norm(variable);if(app.columnas.includes(v))return true;if(esPlantillaAgpeCopilot()){let col=columnaEquivalenteAgpeCopilot(v);if(col==='Fecha del sistema')return true;let n=norm(col);return app.columnas.some(c=>norm(c)===n);}return false;}

function fechaLargaCopilot(v){let meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];let d=null;if(v instanceof Date&&!isNaN(v))d=v;else{let s=limpiarEspaciosCopilot(v);let m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;d=new Date(y,+m[2]-1,+m[1]);}else{let n=Number(s);if(isFinite(n)&&n>25569&&n<60000)d=new Date(Math.round((n-25569)*86400*1000));else{let t=Date.parse(s);if(!isNaN(t))d=new Date(t);}}}if(!d||isNaN(d))return valorExactoCopilot(v);return String(d.getDate()).padStart(2,'0')+' de '+meses[d.getMonth()]+' de '+d.getFullYear();}
function fechaActualCopilot(){let d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();}
function dataDoc(row){let d={};row=row||{};let firmante=(localStorage.getItem('genWordNombreFirmanteV12')||localStorage.getItem('genWordNombreFirmanteV11')||app.manual?.NOMBRE_FIRMANTE||row?.NOMBRE_FIRMANTE||'').trim();[...new Set([...BASE,...app.columnas,...app.variables,'FIRMA_DOCUMENTO','FIRMA_USUARIO','FIRMA','NOMBRE_FIRMANTE','PRIMER_NOMBRE','DEPARTAMENTO_SOLICITANTE','FECHA_RAD_SALIDA','FECHA_ACTUAL','FECHA_RECIBIDO','CORREO_ELECTRONICO','MUNICIPIO_SUSCRIPTOR','CELULAR','CIRCUITO','TRANSFORMADOR','COMENTARIOS_GESTOR_ANALISTA'])].forEach(c=>{if(['FIRMA_DOCUMENTO','FIRMA_USUARIO','FIRMA'].includes(c))d[c]='['+c+']';else if(c==='NOMBRE_FIRMANTE')d[c]=firmante;else d[c]=valorExactoCopilot(valorCampoFilaCopilot(row,c));});if(esPlantillaAgpeCopilot()){let correoAgpe=correoCopilot(valorCampoFilaCopilot(row,'CORREO_SOLICITANTE'));d.NOMBRE_SOLICITANTE=formatoTituloCopilot(valorCampoFilaCopilot(row,'NOMBRE_SUSCRIPTOR'));d.PRIMER_NOMBRE=primerNombreCopilot(valorCampoFilaCopilot(row,'NOMBRE_SUSCRIPTOR'));d.DIRECCION_SOLICITANTE=formatoTituloCopilot(valorCampoFilaCopilot(row,'DIRECCION_SUSCRIPTOR'),{quitarNoDefinido:true});d.MUNICIPIO_SUSCRIPTOR=formatoTituloCopilot(valorCampoFilaCopilot(row,'MUNICIPIO_SUSCRIPTOR'));d.DEPARTAMENTO_SOLICITANTE=formatoTituloCopilot(valorCampoFilaCopilot(row,'DEPTO_SUSCRIPTOR'));d.CORREO_ELECTRONICO=correoAgpe;d.CORREO_SOLICITANTE=correoAgpe;d.CELULAR=valorExactoCopilot(valorCampoFilaCopilot(row,'CELULAR_SUSCRIPTOR'));d.NUMERO_PROCESO=valorExactoCopilot(valorCampoFilaCopilot(row,'NUMERO_PROCESO'));d.NUMERO_CUENTA=valorExactoCopilot(valorCampoFilaCopilot(row,'NUMERO_CUENTA'));d.FECHA_ACTUAL=fechaActualLargaCopilot();d.FECHA_RECIBIDO=fechaMesSlashCopilot(valorCampoFilaCopilot(row,'FECHA_SOLICITUD'));d.CIRCUITO=valorExactoCopilot(valorCampoFilaCopilot(row,'CIRCUITO'));d.TRANSFORMADOR=valorExactoCopilot(valorCampoFilaCopilot(row,'ID_TRAFO'));d.FECHA_SOLICITUD=fechaMesSlashCopilot(valorCampoFilaCopilot(row,'FECHA_SOLICITUD'));d.FECHA_RAD_SALIDA=fechaActualCopilot();d.COMENTARIOS_GESTOR_ANALISTA='[COMENTARIOS_GESTOR_ANALISTA]';return d;}d.NOMBRE_SOLICITANTE=formatoTituloCopilot(valorCampoFilaCopilot(row,'NOMBRE_SOLICITANTE')||valorCampoFilaCopilot(row,'NOMBRE SOLICITANTE'));d.PRIMER_NOMBRE=primerNombreCopilot(valorCampoFilaCopilot(row,'NOMBRE_SOLICITANTE')||valorCampoFilaCopilot(row,'NOMBRE SOLICITANTE'));d.CORREO_SOLICITANTE=buscarCorreoFilaCopilot(row);d.FECHA_SOLICITUD=fechaLargaCopilot(valorCampoFilaCopilot(row,'FECHA_SOLICITUD')||valorCampoFilaCopilot(row,'FECHA SOLICITUD'));d.DIRECCION_SOLICITANTE=formatoTituloCopilot(valorCampoFilaCopilot(row,'DIRECCION_SOLICITANTE')||valorCampoFilaCopilot(row,'DIRECCION SOLICITANTE'),{quitarNoDefinido:true});d.MUNICIPIO_SOLICITANTE=formatoTituloCopilot(valorCampoFilaCopilot(row,'MUNICIPIO_SOLICITANTE')||valorCampoFilaCopilot(row,'MUNICIPIO SOLICITANTE'));d.DEPARTAMENTO_SOLICITANTE=formatoTituloCopilot(valorCampoFilaCopilot(row,'DEPARTAMENTO_SOLICITANTE')||valorCampoFilaCopilot(row,'DEPTO_SOLICITANTE')||valorCampoFilaCopilot(row,'DEPTO SOLICITANTE')||valorCampoFilaCopilot(row,'DEPARTAMENTO SOLICITANTE'));d.FECHA_RAD_SALIDA=fechaActualCopilot();d.COMENTARIOS_GESTOR_ANALISTA='[COMENTARIOS_GESTOR_ANALISTA]';return d;}

function sanitizarDatosFusionCopilot(datos,row){
  datos=datos||{};row=row||{};
  var correo=buscarCorreoFilaCopilot(row)||correoCopilot(datos.CORREO_SOLICITANTE)||'';
  Object.keys(datos).forEach(function(k){
    var v=datos[k];
    var esPromise=v&&typeof v==='object'&&typeof v.then==='function';
    if(esPromise || /^\[object Promise\]$/i.test(String(v))){
      datos[k]=(k==='CORREO_SOLICITANTE')?correo:'';
    }else{
      datos[k]=String(v==null?'':v).replace(/\[object Promise\]/gi,(k==='CORREO_SOLICITANTE'?correo:''));
    }
  });
  datos.CORREO_SOLICITANTE=correo;
  return datos;
}
function nombreSalida(row){let n=$('nombreArchivo').value||'Documento_[RADICADO_ENTRADA]';[...new Set([...BASE,...app.columnas,...app.variables])].forEach(c=>n=n.replaceAll('['+c+']',String(row[c]??'')));return n.replace(/[\\/:*?"<>|]/g,'_').slice(0,150)||'Documento'}function addFirma(zip){if(!app.firmaDataUrl)return;let xmlPath='word/document.xml';if(!zip.files[xmlPath])return;let xml=zip.files[xmlPath].asText();if(!xml.includes('[FIRMA_USUARIO]'))return;let ext=(app.firmaDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);/)||[])[1]||'png';if(ext==='jpeg')ext='jpg';let b64=app.firmaDataUrl.split(',')[1];zip.file('word/media/firma_usuario.'+ext,b64,{base64:true});let relPath='word/_rels/document.xml.rels',rels=zip.files[relPath]?zip.files[relPath].asText():'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';let rid='rIdFirma'+Date.now()+Math.floor(Math.random()*9999);rels=rels.replace('</Relationships>',`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/firma_usuario.${ext}"/></Relationships>`);zip.file(relPath,rels);let ct='[Content_Types].xml',cts=zip.files[ct].asText(),mime=ext==='jpg'?'image/jpeg':(ext==='webp'?'image/webp':'image/png');if(!cts.includes(`Extension="${ext}"`))cts=cts.replace('</Types>',`<Default Extension="${ext}" ContentType="${mime}"/></Types>`);zip.file(ct,cts);let drawing=`<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="1905000" cy="762000"/><wp:docPr id="1" name="FIRMA_USUARIO"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="firma_usuario.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1905000" cy="762000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;xml=xml.replace(/<w:r[^>]*>\s*<w:t[^>]*>\[FIRMA_USUARIO\]<\/w:t>\s*<\/w:r>/g,drawing).replace('[FIRMA_USUARIO]',drawing);zip.file(xmlPath,xml)}function xmlEscapeCopilot(s){return String(s==null?'':s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch];});}
function xmlUnescapeCopilot(s){return String(s==null?'':s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
function textoRunsCopilot(p){let textos=[];p.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g,function(_,t){textos.push(xmlUnescapeCopilot(t));return _;});return textos.join('');}
function runTextoNormalCopilot(txt){return '<w:r><w:t xml:space="preserve">'+xmlEscapeCopilot(txt)+'</w:t></w:r>';}
function runTextoCorreoAparienciaCopilot(email){let e=xmlEscapeCopilot(email);return '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr><w:t>'+e+'</w:t></w:r>';}
function pPrCopilot(p){return (p.match(/<w:pPr[\s\S]*?<\/w:pPr>/)||[''])[0];}
function blindarCorreoAntesRenderCopilot(zip,email){email=correoCopilot(email);let re=/\[\s*(?:CORREO[\s_\-]+SOLICITANTE|CORREO[\s_\-]+ELECTRONICO)\s*\]/i;Object.keys(zip.files).filter(k=>/^word\/(document|header\d+|footer\d+)\.xml$/i.test(k)).forEach(function(partPath){let xml=zip.files[partPath].asText(),changed=false;xml=xml.replace(/<w:p[\s\S]*?<\/w:p>/g,function(p){let plain=textoRunsCopilot(p);if(!re.test(plain))return p;let partes=plain.split(re);changed=true;return '<w:p>'+pPrCopilot(p)+(partes[0]?runTextoNormalCopilot(partes[0]):'')+(email?runTextoCorreoAparienciaCopilot(email):'')+(partes.slice(1).join('')?runTextoNormalCopilot(partes.slice(1).join('')):'')+'</w:p>';});if(changed)zip.file(partPath,xml);});}
function textoPlanoParteCopilot(zip,partPath){if(!zip.files[partPath])return '';let xml=zip.files[partPath].asText(),arr=[];xml.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g,function(_,t){arr.push(xmlUnescapeCopilot(t));return _;});return arr.join('');}
function limpiarObjectPromiseCopilot(zip,email){email=correoCopilot(email);Object.keys(zip.files).filter(k=>/^word\/(document|header\d+|footer\d+)\.xml$/i.test(k)).forEach(function(partPath){let xml=zip.files[partPath].asText(),changed=false;xml=xml.replace(/<w:p[\s\S]*?<\/w:p>/g,function(p){let plain=textoRunsCopilot(p);if(!/\[object Promise\]/i.test(plain))return p;let limpio=plain.replace(/(?:\[object Promise\])+/gi,email||'').replace(/\s+$/,'');changed=true;return '<w:p>'+pPrCopilot(p)+(email&&limpio.toLowerCase().includes(email)?runTextoCorreoAparienciaCopilot(email):(limpio?runTextoNormalCopilot(limpio):''))+'</w:p>';});if(changed)zip.file(partPath,xml);});}
function aplicarAparienciaCorreoCopilot(zip,email){email=correoCopilot(email);if(!email||!email.includes('@'))return;Object.keys(zip.files).filter(k=>/^word\/(document|header\d+|footer\d+)\.xml$/i.test(k)).forEach(function(partPath){let xml=zip.files[partPath].asText(),emailLc=email.toLocaleLowerCase('es-CO'),changed=false;xml=xml.replace(/<w:p[\s\S]*?<\/w:p>/g,function(p){let plain=textoRunsCopilot(p);let idx=plain.toLocaleLowerCase('es-CO').indexOf(emailLc);if(idx<0)return p;if(p.indexOf('w:val="Hyperlink"')>=0)return p;let antes=plain.slice(0,idx),despues=plain.slice(idx+email.length);changed=true;return '<w:p>'+pPrCopilot(p)+(antes?runTextoNormalCopilot(antes):'')+runTextoCorreoAparienciaCopilot(email)+(despues?runTextoNormalCopilot(despues):'')+'</w:p>';});if(changed)zip.file(partPath,xml);});}
function asegurarCorreoVisibleCopilot(zip,email,nombre){email=correoCopilot(email);if(!email||!email.includes('@')){if(typeof estado==='function')estado('Advertencia: no se encontró correo electrónico válido en el registro seleccionado.','danger');return;}let partPath='word/document.xml';if(!zip.files[partPath])return;if(textoPlanoParteCopilot(zip,partPath).toLocaleLowerCase('es-CO').includes(email))return;let xml=zip.files[partPath].asText();let nombreLc=limpiarEspaciosCopilot(nombre).toLocaleLowerCase('es-CO');let inserted=false;xml=xml.replace(/<w:p[\s\S]*?<\/w:p>/g,function(p){if(inserted)return p;let plain=textoRunsCopilot(p).toLocaleLowerCase('es-CO');if(nombreLc&&plain.includes(nombreLc)){inserted=true;return p+'<w:p>'+runTextoCorreoAparienciaCopilot(email)+'</w:p>';}return p;});if(!inserted){xml=xml.replace(/<w:body[^>]*>/,m=>m+'<w:p>'+runTextoCorreoAparienciaCopilot(email)+'</w:p>');}zip.file(partPath,xml);}
function resolverValorDatoCopilot(datos,clave){if(!clave)return null;if(Object.prototype.hasOwnProperty.call(datos,clave))return String(datos[clave]==null?'':datos[clave]);let objetivo=norm(clave);for(let k of Object.keys(datos||{})){if(norm(k)===objetivo)return String(datos[k]==null?'':datos[k]);}return null;}
function reemplazarPlaceholdersRestantesCopilot(zip,datos){datos=datos||{};let omitir={FIRMA_DOCUMENTO:1,FIRMA_USUARIO:1,FIRMA:1};let tokenFuente=/[\[\{]([A-Za-z0-9_\u00C0-\u017F .\-]+?)[\]\}]/.source;Object.keys(zip.files).filter(function(k){return /^word\/(document|header\d+|footer\d+)\.xml$/i.test(k);}).forEach(function(partPath){let xml=zip.files[partPath].asText(),cambio=false;xml=xml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g,function(m,attrs,t){let texto=xmlUnescapeCopilot(t);let re=new RegExp(tokenFuente,'g');if(!re.test(texto))return m;let nuevo=texto.replace(re,function(tok,clave){clave=clave.trim();if(omitir[clave.toUpperCase()])return tok;let val=resolverValorDatoCopilot(datos,clave);if(val===null)return tok;cambio=true;return val;});return nuevo===texto?m:('<w:t'+attrs+'>'+xmlEscapeCopilot(nuevo)+'</w:t>');});xml=xml.replace(/<w:p[\s\S]*?<\/w:p>/g,function(p){let plain=textoRunsCopilot(p);let reTest=new RegExp(tokenFuente,'g');if(!reTest.test(plain))return p;let necesita=false;let reScan=new RegExp(tokenFuente,'g');plain.replace(reScan,function(tok,clave){clave=clave.trim();if(omitir[clave.toUpperCase()])return tok;if(resolverValorDatoCopilot(datos,clave)!==null)necesita=true;return tok;});if(!necesita)return p;let pPr=pPrCopilot(p);let salida='',ultimo=0;let re3=new RegExp(tokenFuente,'g');plain.replace(re3,function(tok,clave,offset){clave=clave.trim();let val=resolverValorDatoCopilot(datos,clave);if(val===null)return tok;if(offset>ultimo)salida+=runTextoNormalCopilot(plain.slice(ultimo,offset));if(val)salida+=runTextoNormalCopilot(val);ultimo=offset+tok.length;return tok;});if(ultimo<plain.length)salida+=runTextoNormalCopilot(plain.slice(ultimo));cambio=true;return '<w:p>'+pPr+salida+'</w:p>';});if(cambio)zip.file(partPath,xml);});}
async function renderDocx(row){
  function firmaDataFinal(){if(!app||!app.firmaDataUrl)return null;var m=String(app.firmaDataUrl).match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);if(!m)return null;var ext=m[1].toLowerCase();if(ext==='jpeg')ext='jpg';var mime=ext==='jpg'?'image/jpeg':(ext==='webp'?'image/webp':'image/png');return{ext:ext,mime:mime,b64:m[2]};}
  function ensureTypesFinal(zip,ext,mime){var p='[Content_Types].xml';if(!zip.files[p])return;var xml=zip.files[p].asText();if(xml.toLowerCase().indexOf('extension="'+ext+'"')<0){xml=xml.replace('</Types>','<Default Extension="'+ext+'" ContentType="'+mime+'"/></Types>');zip.file(p,xml);}}
  function ensureRelFinal(zip,target){var p='word/_rels/document.xml.rels';var xml=zip.files[p]?zip.files[p].asText():'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';var rid='rIdFirmaFinal'+Date.now()+Math.floor(Math.random()*99999);xml=xml.replace('</Relationships>','<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="'+target+'"/></Relationships>');zip.file(p,xml);return rid;}
  function drawingFinal(rid,ext){var cx=2468880,cy=777240;return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+Math.floor(Math.random()*999999)+'" name="FIRMA_CARGADA"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="firma_cargada.'+ext+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';}
  function injectFirmaFinal(zip){var f=firmaDataFinal();if(!f){if(typeof estado==='function')estado('Cargue una firma antes de generar el documento.','bad');return false;}ensureTypesFinal(zip,f.ext,f.mime);var img='firma_cargada_'+Date.now()+'.'+f.ext;zip.file('word/media/'+img,f.b64,{base64:true});var run=drawingFinal(ensureRelFinal(zip,'media/'+img),f.ext);var path='word/document.xml';if(!zip.files[path])return false;var xml=zip.files[path].asText(),changed=false;var firmaRe='FIRMA_DOCUMENTO|FIRMA_USUARIO|FIRMA';xml=xml.replace(new RegExp('<w:r[^>]*>\\s*<w:t[^>]*>\\[('+firmaRe+')\\]<\\/w:t>\\s*<\\/w:r>','g'),function(){changed=true;return run;});xml=xml.replace(/\[(FIRMA_DOCUMENTO|FIRMA_USUARIO|FIRMA)\]/g,function(){changed=true;return '</w:t></w:r>'+run+'<w:r><w:t>';});if(!changed){xml=xml.replace(/<w:p[\s\S]*?<\/w:p>/g,function(p){var plain=p.replace(/<[^>]+>/g,'').replace(/\s+/g,'');if(!/\[(FIRMA_DOCUMENTO|FIRMA_USUARIO|FIRMA)\]/.test(plain))return p;changed=true;var pPr=(p.match(/<w:pPr[\s\S]*?<\/w:pPr>/)||[''])[0];return '<w:p>'+pPr+run+'</w:p>';});}if(!changed){if(typeof estado==='function')estado('No se encontró el marcador [FIRMA_DOCUMENTO] en la plantilla.','danger');return false;}zip.file(path,xml);return true;}
  let datosFusion=sanitizarDatosFusionCopilot(dataDoc(row),row);let zip=new PizZip(await(await archivoPlantilla()).arrayBuffer());blindarCorreoAntesRenderCopilot(zip,datosFusion.CORREO_SOLICITANTE);let Docx=window.easyTemplateXLegacyRemoved||window.EasyTemplateXLegacyRemoved;let doc=new Docx(zip,{paragraphLoop:true,linebreaks:true,delimiters:{start:'[',end:']'},nullGetter:()=>''});doc.render(datosFusion);let outZip=doc.getZip();reemplazarPlaceholdersRestantesCopilot(outZip,datosFusion);limpiarObjectPromiseCopilot(outZip,datosFusion.CORREO_SOLICITANTE);aplicarAparienciaCorreoCopilot(outZip,datosFusion.CORREO_SOLICITANTE);asegurarCorreoVisibleCopilot(outZip,datosFusion.CORREO_SOLICITANTE,datosFusion.NOMBRE_SOLICITANTE);injectFirmaFinal(outZip);return outZip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}let pvTimer=null;function actualizarPreviewDebounced(force=false){clearTimeout(pvTimer);pvTimer=setTimeout(actualizarPreviewReal,force?10:500)}async function actualizarPreviewReal(){let cont=$('wysiwyg');try{if(!app.seleccion){cont.innerHTML='<div class="loader">Seleccione una plantilla para ver el Word real.</div>';return}if(!window.docx){cont.innerHTML='<div class="loader">Falta docx-preview.min.js en DATOS/COMPONENTES.</div>';return}let row=app.modo==='manual'?leerManual():(app.previewRow||app.datos.find(r=>app.marcados.has(r.__idx))||{});cont.innerHTML='<div class="loader">Fusionando datos y renderizando Word real...</div>';let blob=await renderDocx(row);cont.innerHTML='';await docx.renderAsync(blob,cont,null,{className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,renderHeaders:true,renderFooters:true,breakPages:true})}catch(e){cont.innerHTML='<div class="loader">No se pudo renderizar la vista real.<br>'+esc(e.message)+'</div>'}}async function generarManual(){try{if(!app.seleccion)throw Error('Seleccione una plantilla.');let row=leerManual(),blob=await renderDocx(row);saveAs(blob,nombreSalida(row)+'.docx');progreso(100);estado('Documento generado con formulario manual.','ok')}catch(e){estado('Error: '+e.message,'bad')}}async function generarLoteManual(){try{if(!app.seleccion)throw Error('Seleccione una plantilla.');if(!app.loteManual.length)throw Error('Agregue registros al lote manual.');let zip=new JSZip();for(let i=0;i<app.loteManual.length;i++){let blob=await renderDocx(app.loteManual[i]);zip.file(nombreSalida(app.loteManual[i])+'.docx',blob);progreso((i+1)/app.loteManual.length*80)}saveAs(await zip.generateAsync({type:'blob'},m=>progreso(80+m.percent*.2)),'Documentos_manuales.zip');estado('ZIP manual generado.','ok')}catch(e){estado('Error: '+e.message,'bad')}}async function generarSeleccionado(masivo){try{if(!app.seleccion)throw Error('Seleccione una plantilla.');let ids=[...app.marcados];if(!ids.length)throw Error('Marque al menos un registro.');let rows=ids.map(id=>app.datos.find(r=>r.__idx===id)).filter(Boolean);progreso(0);if(!masivo){let blob=await renderDocx(rows[0]);saveAs(blob,nombreSalida(rows[0])+'.docx');progreso(100);estado('Documento generado.','ok');return}let zip=new JSZip();for(let i=0;i<rows.length;i++){let blob=await renderDocx(rows[i]);zip.file(nombreSalida(rows[i])+'.docx',blob);progreso((i+1)/rows.length*80)}saveAs(await zip.generateAsync({type:'blob'},m=>progreso(80+m.percent*.2)),'Documentos_generados.zip');estado('Generación masiva finalizada.','ok')}catch(e){estado('Error: '+e.message,'bad')}}function limpiarSeleccion(){app.marcados.clear();renderTabla();progreso(0);estado('Selección limpiada.','ok');actualizarPreviewDebounced(true)}function initUI(){if(localStorage.getItem('premiumMenuMini')==='1')document.body.classList.add('menu-mini');else document.body.classList.remove('menu-mini');$('guardarPrefs').checked=false;document.querySelectorAll('.accordionHeader').forEach(h=>{h.title='Doble clic para abrir/cerrar';h.addEventListener('dblclick',()=>h.closest('.card').classList.toggle('accordion-collapsed'))});document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')}))}window.addEventListener('load',()=>{initUI();revisarLibs();loadProfiles();renderCategorias();renderPlantillas();renderTabla();renderFormularioManual();kpis();actualizarPreviewDebounced(true)});

/* ==================== copilot-preview-transform-follow-js ==================== */
(function(){'use strict';
function byId(id){return document.getElementById(id)}function qs(s,r){return (r||document).querySelector(s)}function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}function norm2(v){return String(v==null?'':v).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'')}function escHtml(x){return String(x==null?'':x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
let loadingCount=0,hideTimer=null;window.showLoadingCopilot=function(t,m){loadingCount++;clearTimeout(hideTimer);let el=byId('globalLoadingCopilot');if(!el)return;let tt=byId('loadingTitleCopilot'),mm=byId('loadingMsgCopilot');if(tt)tt.textContent=t||'Procesando información';if(mm)mm.textContent=m||'Validando y preparando el documento.';el.classList.add('show');el.setAttribute('aria-hidden','false')};window.hideLoadingCopilot=function(force){if(force)loadingCount=0;else loadingCount=Math.max(0,loadingCount-1);if(loadingCount>0)return;hideTimer=setTimeout(()=>{let el=byId('globalLoadingCopilot');if(el){el.classList.remove('show');el.setAttribute('aria-hidden','true')}},180)};async function withLoading(t,m,fn){window.showLoadingCopilot(t,m);try{await new Promise(r=>setTimeout(r,90));return await fn()}finally{window.hideLoadingCopilot()}}
function refinePreviewText(){let p=byId('preview');if(!p)return;let mode=byId('previewMode');if(mode)mode.textContent='Plantilla';let subtitle=qs('.previewTop .muted.small',p);if(subtitle)subtitle.textContent='Visualización en tiempo real';qsa('p.muted.small',p).forEach(el=>{if((el.textContent||'').includes('menú lateral')||(el.textContent||'').includes('hamburguesa'))el.remove()})}
function bindPreviewFollowTransform(){let p=byId('preview');if(!p)return;let start=0;function measure(){p.style.setProperty('--preview-follow-y','0px');let r=p.getBoundingClientRect();start=window.scrollY+r.top-18;run()}function run(){if(window.innerWidth<=1180){p.style.setProperty('--preview-follow-y','0px');p.classList.remove('is-stuck');return}let y=Math.max(0,window.scrollY-start);p.style.setProperty('--preview-follow-y',y+'px');p.classList.toggle('is-stuck',y>0)}setTimeout(measure,100);window.addEventListener('scroll',run,{passive:true});window.addEventListener('resize',()=>setTimeout(measure,80),{passive:true});window.addEventListener('load',()=>setTimeout(measure,120),{passive:true})}
function iconSvg(type){let d=type==='search'?'<circle cx="11" cy="11" r="7.5"/><path d="M20.8 20.8 16.2 16.2"/>':type==='tag'?'<path d="M20 10v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9"/><path d="M9 21V9h6v12"/><path d="M4 10l8-7 8 7"/>':'<path d="M4 7h16"/><path d="M7 12h10"/><path d="M10 17h4"/>';return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'}
function wrapCard(card,h){if(!card||card.closest('#preview')||qs(':scope>.accordionBodyCopilot',card))return;let body=document.createElement('div');body.className='accordionBodyCopilot';let kids=qsa(':scope>*',card);let start=-1;kids.forEach((ch,i)=>{if(ch===h||ch.contains(h))start=i});if(start<0)return;kids.forEach((ch,i)=>{if(i>start)body.appendChild(ch)});card.appendChild(body)}function setCollapsed(card,col){card.classList.toggle('accordion-collapsed',!!col);let btn=qs(':scope>.accordionHeader .copilotToggleBtn',card)||qs('.sectionHead .copilotToggleBtn',card);if(btn){btn.setAttribute('aria-expanded',String(!col));btn.title=col?'Expandir sección':'Contraer sección'}}function bindAccordions(){qsa('.card .accordionHeader').forEach(h=>{let card=h.closest('.card');if(!card||card.closest('#preview'))return;wrapCard(card,h);let btn=qs('.copilotToggleBtn',h);if(!btn){btn=document.createElement('button');btn.type='button';btn.className='copilotToggleBtn';btn.setAttribute('aria-label','Contraer o expandir sección');btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';h.appendChild(btn);btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setCollapsed(card,!card.classList.contains('accordion-collapsed'))},true)}if(!h.dataset.accBoundFinal){h.dataset.accBoundFinal='1';h.addEventListener('click',e=>{if(e.target.closest('button,input,select,textarea,a,label'))return;setCollapsed(card,!card.classList.contains('accordion-collapsed'))});h.tabIndex=0}setCollapsed(card,card.classList.contains('accordion-collapsed'))})}window.copilotRebindAccordions=bindAccordions;


function buildSelect(select){if(!select||select.dataset.customReady==='1')return;select.dataset.customReady='1';let box=document.createElement('div');box.className='customSelectCopilot';let btn=document.createElement('button');btn.type='button';btn.className='customSelectBtnCopilot';btn.innerHTML='<span class="customSelectTextCopilot"></span><span class="customSelectChevronCopilot"></span>';let menu=document.createElement('div');menu.className='customSelectMenuCopilot';select.parentNode.insertBefore(box,select);box.appendChild(select);box.appendChild(btn);box.appendChild(menu);function sync(){let opt=select.options[select.selectedIndex]||select.options[0];btn.querySelector('.customSelectTextCopilot').textContent=opt?opt.textContent:'';menu.innerHTML=Array.from(select.options).map(o=>'<button type="button" class="customSelectOptionCopilot '+(o.value===select.value?'active':'')+'" data-value="'+escHtml(o.value)+'">'+escHtml(o.textContent)+'</button>').join('');qsa('.customSelectOptionCopilot',menu).forEach(o=>o.onclick=e=>{e.preventDefault();select.value=o.dataset.value;select.dispatchEvent(new Event('change',{bubbles:true}));box.classList.remove('open');sync()})}btn.onclick=e=>{e.preventDefault();e.stopPropagation();qsa('.customSelectCopilot.open').forEach(x=>{if(x!==box)x.classList.remove('open')});sync();box.classList.toggle('open')};select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{childList:true,subtree:true,attributes:true});sync()}document.addEventListener('click',e=>{if(!e.target.closest('.customSelectCopilot'))qsa('.customSelectCopilot.open').forEach(x=>x.classList.remove('open'))});
function wrapFilter(el,label,type){if(!el||el.closest('.filterWrapCopilot'))return;let wrap=document.createElement('div');let extra=el.id==='tipoProceso'?' tipoWrapCopilot':(el.id==='categoriaFiltro'?' categoriaWrapCopilot':' searchWrapCopilot');wrap.className='filterWrapCopilot '+(el.tagName==='SELECT'?'selectWrapCopilot':'searchWrapCopilot')+extra;let lab=document.createElement('div');lab.className='filterLabelCopilot';lab.textContent=label;let control=document.createElement('div');control.className='filterControlCopilot';let ico=document.createElement('span');ico.className='filterIconCopilot';ico.innerHTML=iconSvg(type);el.parentNode.insertBefore(wrap,el);wrap.appendChild(lab);wrap.appendChild(control);control.appendChild(ico);control.appendChild(el);if(el.tagName==='SELECT'){buildSelect(el);el.addEventListener('change',()=>{window.renderPlantillas();if(el.id==='tipoProceso'&&typeof guardarPerfilActual==='function')guardarPerfilActual()})}else{el.placeholder='Buscar por nombre, categoría o variable...';let btn=document.createElement('button');btn.type='button';btn.className='searchBtnCopilot';btn.title='Buscar plantilla';btn.setAttribute('aria-label','Buscar plantilla');btn.innerHTML=iconSvg('search');control.appendChild(btn);btn.onclick=()=>{window.renderPlantillas();el.focus()};el.addEventListener('input',()=>window.renderPlantillas());el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window.renderPlantillas()}})}}function enhanceFilters(){wrapFilter(byId('tipoProceso'),'Proceso','type');wrapFilter(byId('categoriaFiltro'),'Categoría','tag');wrapFilter(byId('buscarPlantilla'),'Buscar plantilla','search')}
function wordIcon(){return '<div class="wordIconBox"><svg class="wordIconSvg" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="wdDocGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0f6ff"/><stop offset="100%" stop-color="#dce8f8"/></linearGradient><linearGradient id="wdBlueGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2b7de9"/><stop offset="100%" stop-color="#185abc"/></linearGradient><filter id="wdShadow" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#185abc" flood-opacity=".25"/></filter></defs><rect x="10" y="4" width="44" height="56" rx="4" fill="url(#wdDocGrad)" stroke="#b8d0ea" stroke-width=".8"/><path d="M36 4h14a4 4 0 0 1 4 4v12H36V4z" fill="#e4eef8" stroke="#b8d0ea" stroke-width=".6"/><path d="M36 4l18 18V8a4 4 0 0 0-4-4H36z" fill="#c7ddf0"/><rect x="10" y="4" width="44" height="56" rx="4" fill="none" stroke="#9bbde0" stroke-width=".5"/><rect x="18" y="30" width="28" height="18" rx="3.5" fill="url(#wdBlueGrad)" filter="url(#wdShadow)"/><text x="32" y="43.5" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="800" fill="#fff" letter-spacing="-.3">W</text><line x1="18" y1="14" x2="32" y2="14" stroke="#9bbde0" stroke-width=".8" stroke-linecap="round"/><line x1="18" y1="18" x2="28" y2="18" stroke="#c2d6eb" stroke-width=".6" stroke-linecap="round"/><line x1="18" y1="22" x2="24" y2="22" stroke="#d5e4f2" stroke-width=".5" stroke-linecap="round"/></svg></div>'}window.miniaturas=function(){};window.renderPlantillas=function(){let tipo=byId('tipoProceso')?.value||'peticiones',q=norm2(byId('buscarPlantilla')?.value||''),cf=byId('categoriaFiltro')?.value||'todas',cont=byId('listaPlantillas');if(!cont||!window.app)return;let base=app.plantillas?.[tipo]||[];let list=base.filter(t=>(cf==='todas'||t.categoria===cf)&&(!q||norm2(t.name).includes(q)||norm2(t.categoria).includes(q)||(t.vars||[]).some(v=>norm2(v).includes(q))));cont.innerHTML=list.map(t=>{let i=base.indexOf(t);return '<div class="templateCard '+(app.seleccion?.tipo===tipo&&app.seleccion?.i===i?'active':'')+'">'+wordIcon()+'<div class="templateContentPro"><div class="templateTitleBlock"><div class="templateName">'+escHtml(t.name)+'</div><div class="templateBadges"><span class="badge">'+escHtml(t.categoria||'General')+'</span><span class="badge">DOCX</span></div></div><div class="templateDivider"></div><button onclick="seleccionarPlantilla(\''+tipo+'\','+i+')">Usar plantilla</button></div></div>'}).join('')||'<p class="muted">No se encontraron plantillas con los filtros aplicados.</p>';enhanceFilters()};
function ensureApp(){window.app=window.app||{};app.manual=app.manual||{};app.datos=Array.isArray(app.datos)?app.datos:[];app.columnas=Array.isArray(app.columnas)?app.columnas:[];app.marcados=app.marcados instanceof Set?app.marcados:new Set()}function status(m,c){let e=byId('estado');if(e){e.className='status '+(c||'');e.textContent=m}let f=byId('folderStatus');if(f)f.textContent=m}function mark(card,name,file){let c=byId(card),n=byId(name);if(c)c.classList.add('loaded');if(n)n.textContent=file&&file.name?file.name:'Archivo cargado'}
window.leerExcel=async function(file){return withLoading('Cargando Excel','Leyendo hojas, normalizando columnas y preparando registros...',async()=>{try{ensureApp();if(!file)return;if(!window.XLSX)throw Error('No se encontró la librería XLSX. Verifique DATOS/COMPONENTES/xlsx.full.min.js');if(!/\.(xlsx|xls|xlsm|xlsb|csv)$/i.test(file.name||''))throw Error('Formato no soportado. Seleccione .xlsx, .xls, .xlsm, .xlsb o .csv.');mark('dropExcel','excelFileName',file);let wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,raw:false,dateNF:'dd/mm/yyyy'});let sh=wb.SheetNames.find(n=>norm2(n)==='GENERAL')||wb.SheetNames[0];let rows=XLSX.utils.sheet_to_json(wb.Sheets[sh],{defval:'',raw:true,blankrows:false});if(!rows.length)throw Error('La hoja '+sh+' no tiene registros.');app.datos=rows.map((row,i)=>{let o={__idx:i};Object.keys(row).forEach(k=>{let nk=norm2(k);if(nk)o[nk]=formatoNumeroPlanoCopilot(row[k],nk)});return o});let dyn=[];app.datos.forEach(row=>Object.keys(row).forEach(k=>{if(k!=='__idx')dyn.push(k)}));app.columnas=Array.from(new Set((window.BASE||[]).concat(dyn,'FIRMA_DOCUMENTO')));app.marcados.clear();app.previewRow=app.datos[0]||null;if(typeof renderTabla==='function')renderTabla();if(typeof renderFormularioManual==='function')renderFormularioManual();if(typeof kpis==='function')kpis();if(typeof guardarPerfilActual==='function')guardarPerfilActual();if(typeof actualizarPreviewDebounced==='function')actualizarPreviewDebounced(true);status('Excel cargado correctamente: '+app.datos.length+' registros desde hoja "'+sh+'".','help');if(typeof toast==='function')toast('Excel cargado: '+app.datos.length+' registros')}catch(e){console.error(e);status('Error al cargar Excel: '+(e.message||e),'danger');alert('No se pudo cargar el archivo.\n\n'+(e.message||e))}})};window.leerFirma=function(file){try{ensureApp();if(!file)return;mark('dropFirma','firmaFileName',file);let fr=new FileReader();fr.onload=()=>{app.firmaDataUrl=fr.result;app.manual.FIRMA_DOCUMENTO='[imagen cargada]';app.manual.FIRMA_USUARIO='[imagen cargada]';if(typeof renderFormularioManual==='function')renderFormularioManual();if(typeof actualizarPreviewDebounced==='function')actualizarPreviewDebounced(true)};fr.readAsDataURL(file)}catch(e){alert('No se pudo cargar la firma.\n\n'+(e.message||e))}};
function bindInput(id,handler){let old=byId(id);if(!old)return;let clone=old.cloneNode(true);old.parentNode.replaceChild(clone,old);clone.addEventListener('change',e=>{let f=e.target.files&&e.target.files[0];if(f)handler(f)},true)}function bindDrop(cardId,handler){let el=byId(cardId);if(!el)return;['dragenter','dragover'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();el.classList.add('drag')},true));['dragleave','drop'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();el.classList.remove('drag')},true));el.addEventListener('drop',e=>{let f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)handler(f)},true)}function bindFiles(){bindInput('excelInput',window.leerExcel);bindInput('firmaInput',window.leerFirma);qsa('#dropExcel .fileBtn,#dropExcel label[for="excelInput"]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();byId('excelInput')?.click()});qsa('#dropFirma .fileBtn,#dropFirma label[for="firmaInput"]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();byId('firmaInput')?.click()});bindDrop('dropExcel',window.leerExcel);bindDrop('dropFirma',window.leerFirma)}
function boot(){qsa('#rutaExcel,#rutaDestino').forEach(el=>{let c=el.closest('.c6')||el.closest('.field');if(c)c.classList.add('configPathHidden')});bindFiles();bindAccordions();enhanceFilters();refinePreviewText();bindPreviewFollowTransform();if(byId('listaPlantillas'))window.renderPlantillas()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();window.addEventListener('load',boot);
})();

/* ==================== copilot-login-profile-persistence-js ==================== */
(function(){'use strict';const DB='GenWordProPerfilPersistenteV14',STORE='estado',KEY='principal',NAME_KEY='genWordNombreFirmanteV12',OLD_NAME_KEY='genWordNombreFirmanteV11';function $(id){return document.getElementById(id)}function msgPreview(t){let w=$('wysiwyg');if(w)w.innerHTML='<div class="loader">'+t+'</div>'}function openDB(){return new Promise((res,rej)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}async function put(v){try{let db=await openDB();await new Promise((res,rej)=>{let tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,KEY);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}catch(e){console.warn(e)}}async function get(){try{let db=await openDB();let v=await new Promise((res,rej)=>{let tx=db.transaction(STORE,'readonly');let q=tx.objectStore(STORE).get(KEY);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});db.close();return v}catch(e){return null}}function bindAvatar(input){if(!input||input.dataset.avatarBound)return;input.dataset.avatarBound='1';let overlay=input.closest('.nameLoginOverlay');let avatar=overlay?overlay.querySelector('.avatarInteractive'):null;if(!avatar)return;let mouthBG=avatar.querySelector('.mouthBG'),mouthOutline=avatar.querySelector('.mouthOutline'),tooth=avatar.querySelector('.tooth'),small=avatar.querySelector('.mouthSmallBG'),medium=avatar.querySelector('.mouthMediumBG'),large=avatar.querySelector('.mouthLargeBG');let mouthStatus='small';function mouthPath(which){let el=which==='large'?large:(which==='medium'?medium:small);return el?el.getAttribute('d'):''}function setMouth(which){if(which===mouthStatus)return;mouthStatus=which;let d=mouthPath(which);if(d){if(mouthBG)mouthBG.setAttribute('d',d);if(mouthOutline)mouthOutline.setAttribute('d',d)}if(tooth){if(which==='small'){tooth.style.opacity='1';tooth.style.transform='translate(0px,0px)'}else if(which==='medium'){tooth.style.opacity='.95';tooth.style.transform='translate(0px,0px)'}else{tooth.style.opacity='.95';tooth.style.transform='translate(3px,-2px)'}}}function set(x,y,typing){avatar.style.setProperty('--lookX',x+'px');avatar.style.setProperty('--lookY',y+'px');avatar.classList.toggle('avatar-typing',!!typing)}function update(){let len=input.value.length,max=Math.max(input.maxLength||90,20);let p=Math.min(1,len/max);let x=3+Math.min(10,p*10);let y=input.value?-6:-4;set(x,y,!!input.value);setMouth(len===0?'small':(len>22?'large':'medium'))}input.addEventListener('focus',()=>{avatar.classList.add('avatar-active');update()});input.addEventListener('input',update);input.addEventListener('keyup',update);input.addEventListener('blur',()=>{avatar.classList.remove('avatar-active','avatar-typing');set(0,0,false);setMouth('small')});}function getFirmante(){let n=(localStorage.getItem(NAME_KEY)||localStorage.getItem(OLD_NAME_KEY)||'').trim();if(n&&!localStorage.getItem(NAME_KEY))localStorage.setItem(NAME_KEY,n);return n}function updateFirmanteHint(){let h=$('firmanteHintCopilot'),n=getFirmante();if(h)h.textContent=n?'Firmante: '+n:'Firmante: pendiente'}function setFirmante(n){n=String(n||'').trim();if(!n)return false;localStorage.setItem(NAME_KEY,n);try{app.manual=app.manual||{};app.manual.NOMBRE_FIRMANTE=n}catch(e){}updateFirmanteHint();return true}window.abrirModalFirmante=function(){let o=$('firmanteModalOverlay'),i=$('firmanteEditInput');if(!o)return;document.body.classList.add('login-active');o.classList.add('show');o.setAttribute('aria-hidden','false');if(i){i.value=getFirmante();bindAvatar(i)}setTimeout(()=>i&&i.focus(),150)};window.cerrarModalFirmante=function(){let o=$('firmanteModalOverlay');document.body.classList.remove('login-active');if(o){o.classList.remove('show');o.setAttribute('aria-hidden','true')}};function showLogin(){let o=$('nameLoginOverlay'),i=$('nameLoginInput');if(!o)return;document.body.classList.add('login-active');o.classList.add('show');o.setAttribute('aria-hidden','false');if(i)bindAvatar(i);setTimeout(()=>i&&i.focus(),180)}function hideLogin(){let o=$('nameLoginOverlay');document.body.classList.remove('login-active');if(o){o.classList.remove('show');o.setAttribute('aria-hidden','true')}}function bindNameForms(){let form=$('nameLoginForm'),input=$('nameLoginInput'),editForm=$('firmanteEditForm'),editInput=$('firmanteEditInput');bindAvatar(input);bindAvatar(editInput);if(form&&!form.dataset.bound){form.dataset.bound='1';form.addEventListener('submit',e=>{e.preventDefault();let name=(input&&input.value||'').trim();if(!name){input&&input.focus();return}setFirmante(name);hideLogin();save();try{toast('Nombre guardado')}catch(x){}try{renderFormularioManual()}catch(x){}try{actualizarPreviewDebounced(true)}catch(x){}})}if(editForm&&!editForm.dataset.bound){editForm.dataset.bound='1';editForm.addEventListener('submit',e=>{e.preventDefault();let name=(editInput&&editInput.value||'').trim();if(!name){editInput&&editInput.focus();return}setFirmante(name);window.cerrarModalFirmante();save();try{toast('Nombre del firmante actualizado')}catch(x){}try{renderFormularioManual()}catch(x){}try{actualizarPreviewDebounced(true)}catch(x){}})}document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('firmanteModalOverlay')?.classList.contains('show'))window.cerrarModalFirmante()})}function initLogin(){bindNameForms();let saved=getFirmante();if(saved){try{app.manual=app.manual||{};app.manual.NOMBRE_FIRMANTE=saved}catch(e){}hideLogin();updateFirmanteHint();return}showLogin();updateFirmanteHint()}function safeCfg(){try{let c=typeof cfg==='function'?cfg():{};delete c.rutaExcel;c.nombreFirmante=getFirmante();return c}catch(e){return {nombreFirmante:getFirmante()}}}function stripExcelState(){if(!window.app)return;app.datos=[];app.visibles=[];app.previewRow=null;app.marcados=new Set();if($('excelInput'))$('excelInput').value='';if($('excelFileName'))$('excelFileName').textContent='Ningún archivo';$('dropExcel')?.classList.remove('loaded','drag')}async function save(){if(!window.app)return;await put({savedAt:Date.now(),currentProfile:app.currentProfile,profiles:app.profiles,cfg:safeCfg(),firmaDataUrl:app.firmaDataUrl||'',manual:app.manual||{},camposManual:app.camposManual||[],loteManual:app.loteManual||[],nombreFirma:$('firmaFileName')?.textContent||'',plantillas:app.plantillas||{peticiones:[],reclamos:[]},nombreArchivo:$('nombreArchivo')?.value||'',nombreFirmante:getFirmante()})}async function hasReadPermission(handle){try{if(!handle||typeof handle.queryPermission!=='function')return false;return await handle.queryPermission({mode:'read'})==='granted'}catch(e){return false}}async function ensureReadPermission(handle){try{if(!handle)return false;let q=typeof handle.queryPermission==='function'?await handle.queryPermission({mode:'read'}):'granted';if(q==='granted')return true;if(typeof handle.requestPermission==='function'){let r=await handle.requestPermission({mode:'read'});return r==='granted'}return false}catch(e){return false}}async function restore(){stripExcelState();let s=await get();if(!window.app){initLogin();return}if(!s){try{kpis();renderTabla()}catch(e){}msgPreview('Seleccione una plantilla y cargue el Excel manualmente.');initLogin();return}if(s.nombreFirmante&&!getFirmante())setFirmante(s.nombreFirmante);app.currentProfile=s.currentProfile||app.currentProfile;app.profiles=s.profiles||app.profiles||{};app.firmaDataUrl=s.firmaDataUrl||'';app.manual=s.manual||{};app.manual.NOMBRE_FIRMANTE=getFirmante()||s.nombreFirmante||app.manual.NOMBRE_FIRMANTE||'';app.camposManual=Array.isArray(s.camposManual)?s.camposManual:app.camposManual;app.loteManual=Array.isArray(s.loteManual)?s.loteManual:[];app.plantillas=s.plantillas||app.plantillas;app.seleccion=null;if(s.cfg){if($('perfilNombre'))$('perfilNombre').value=s.cfg.perfilNombre||app.currentProfile||'Perfil Principal';if($('tipoProceso'))$('tipoProceso').value=s.cfg.tipoProceso||'peticiones';if($('nombreArchivo'))$('nombreArchivo').value=s.cfg.nombreArchivo||s.nombreArchivo||$('nombreArchivo').value}if($('firmaFileName')&&s.nombreFirma)$('firmaFileName').textContent=s.nombreFirma;if(app.firmaDataUrl)$('dropFirma')?.classList.add('loaded');if(app.plantillas?.peticiones?.length)$('folderBtnPeticiones')?.classList.add('loaded');if(app.plantillas?.reclamos?.length)$('folderBtnReclamos')?.classList.add('loaded');['renderProfiles','renderCategorias','renderPlantillas','renderTabla','renderFormularioManual','kpis'].forEach(fn=>{try{if(typeof window[fn]==='function')window[fn]()}catch(e){}});msgPreview('Configuración restaurada. Cargue el Excel manualmente y seleccione una plantilla para habilitar la vista previa.');initLogin();try{if(getFirmante())toast('Configuración restaurada. Cargue el Excel manualmente.')}catch(e){}}function patch(){let g=$('guardarPrefs');if(g){g.checked=false;g.title='Auto-guardar activo permanentemente, excepto Excel'}window.guardarPerfilActual=function(){try{app.currentProfile=($('perfilNombre')?.value||app.currentProfile||'Perfil Principal').trim()||'Perfil Principal';app.profiles=app.profiles||{};app.profiles[app.currentProfile]=safeCfg();localStorage.setItem('genWordProfilesV73',JSON.stringify(app.profiles));localStorage.setItem('genWordCurrentProfileV73',app.currentProfile);if(typeof renderProfiles==='function')renderProfiles()}catch(e){}save()};let oldGetBuf=window.getBuf;if(typeof oldGetBuf==='function'){window.getBuf=async function(t){if(!t||!t.handle)throw Error('La plantilla no tiene una referencia de archivo válida. Cargue nuevamente la carpeta.');let ok=await ensureReadPermission(t.handle);if(!ok)throw Error('Permiso requerido para leer la plantilla. Seleccione nuevamente la carpeta o autorice el acceso.');try{return await (await t.handle.getFile()).arrayBuffer()}catch(e){throw Error('No se pudo acceder a la plantilla. Cargue nuevamente la carpeta.')}}}let oldPreview=window.actualizarPreviewReal;if(typeof oldPreview==='function'){window.actualizarPreviewReal=async function(){try{if(!app.seleccion){msgPreview('Seleccione una plantilla y cargue el Excel manualmente.');return}let t=app.plantillas?.[app.seleccion.tipo]?.[app.seleccion.i];if(t&&t.handle&&!(await hasReadPermission(t.handle))){msgPreview('La plantilla fue restaurada, pero el navegador requiere autorización. Seleccione la plantilla o cargue nuevamente la carpeta.');return}return await oldPreview.apply(this,arguments)}catch(e){msgPreview('No se pudo renderizar la vista real.<br>'+String(e.message||e))}}}['leerFirma','seleccionarCarpeta','guardarComoPerfil','eliminarPerfilActual','cambiarModo','seleccionarPlantilla','agregarManualALista','limpiarFormularioManual'].forEach(fn=>{let old=window[fn];if(typeof old==='function'&&!old.__persistWrap){let w=async function(){let r=await old.apply(this,arguments);setTimeout(save,250);return r};w.__persistWrap=true;window[fn]=w}});document.addEventListener('input',e=>{if(e.target&&e.target.closest('#perfiles,#config,#generar,#datos')&&e.target.id!=='excelInput'){clearTimeout(window.__persistTimer);window.__persistTimer=setTimeout(save,500)}},true);document.addEventListener('change',e=>{if(e.target&&e.target.id!=='excelInput'&&e.target.closest('#perfiles,#config,#generar,#datos'))setTimeout(save,300)},true)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{patch();setTimeout(restore,700)});else{patch();setTimeout(restore,700)}window.addEventListener('beforeunload',()=>{try{save()}catch(e){}})})();

/* ==================== copilot-v44-sidebar-cleanup-js ==================== */
/* COPILOT_V44 - Limpieza final de sidebar y botones */
(function(){
  function cleanSidebarHeader(){
    var header=document.querySelector('.sidebar-header');
    if(!header)return;
    Array.prototype.slice.call(header.children).forEach(function(el){
      if(el.classList && el.classList.contains('header-logo'))return;
      if(el.classList && el.classList.contains('sidebar-toggler'))return;
      if(el.classList && el.classList.contains('menu-toggler'))return;
      el.remove();
    });
  }
  function cleanProfileButton(){
    var btn=document.querySelector('.perfilToggleBtnCopilot');
    if(btn){btn.classList.remove('good','primary','secondary','blue','hambBtn','hambBtnMini');btn.style.background='';btn.style.color='';}
  }
  function boot(){cleanSidebarHeader();cleanProfileButton();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();


/* ==================== copilot-v52-template-docx-safe-render-js ==================== */
(function(){
  'use strict';
  if(window.__copilotV52SafeRenderInstalled) return;
  window.__copilotV52SafeRenderInstalled = true;

  const SUCCESS = 'La plantilla está lista para usar.';
  const FRIENDLY_XML = 'El documento contiene elementos de Word que no se pudieron interpretar en la vista previa. Intenta abrirlo en Word, guardar una copia nueva y volver a cargarlo.';
  const FRIENDLY_GENERIC = 'No fue posible preparar la plantilla. Verifica que sea un archivo Word válido (.docx) y vuelve a intentarlo.';
  const FRIENDLY_PERMISSION = 'No se pudo leer el archivo. Autoriza nuevamente la carpeta o selecciona otra plantilla.';

  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const byId = id => document.getElementById(id);
  const escSafe = s => String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function normErr(err){
    const msg = String((err && (err.message || err)) || '');
    if(/permission|denied|notallowed|security|autori|lectura/i.test(msg)) return FRIENDLY_PERMISSION;
    if(/xml|sdtPr|sdtContent|tag mismatch|opening and ending|parsererror|malformed|w:id|databinding|content control/i.test(msg)) return FRIENDLY_XML;
    return FRIENDLY_GENERIC;
  }
  function showGlobal(msg){
    if(typeof window.showLoadingCopilot === 'function') return window.showLoadingCopilot(msg || 'Cargando plantilla...');
    let el = byId('globalLoadingCopilot');
    if(el){
      const m = el.querySelector('.loadingMsgCopilot'); if(m) m.textContent = msg || 'Cargando plantilla...';
      el.classList.add('show');
    }
  }
  function hideGlobal(){
    if(typeof window.hideLoadingCopilot === 'function') return window.hideLoadingCopilot();
    const el = byId('globalLoadingCopilot'); if(el) el.classList.remove('show');
  }
  function loaderHtml(title,msg){
    return `<div class="safeDocxLoaderCopilot"><div class="safeDocxPanelCopilot"><div class="safeDocxSpinnerCopilot" aria-hidden="true"></div><div class="safeDocxTitleCopilot">${escSafe(title)}</div><div class="safeDocxTextCopilot">${escSafe(msg)}</div></div></div>`;
  }
  function errorHtml(msg, retry){
    return `<div class="safeDocxErrorCopilot"><div class="safeDocxPanelCopilot"><div class="safeDocxWarnCopilot" aria-hidden="true">!</div><div class="safeDocxTitleCopilot">No se pudo mostrar la vista previa</div><div class="safeDocxTextCopilot">${escSafe(msg || FRIENDLY_GENERIC)}</div>${retry?'<button type="button" class="ghost" onclick="actualizarPreviewDebounced && actualizarPreviewDebounced(true)">Reintentar vista previa</button>':''}</div></div>`;
  }
  function ensureTemplateState(card){
    if(!card || card.querySelector('.templateStateCopilot')) return;
    const div=document.createElement('div');
    div.className='templateStateCopilot';
    div.innerHTML='<span class="templateStateDotCopilot"></span><span class="templateStateTextCopilot">Pendiente de validación</span>';
    const target=card.querySelector('.templateTitleBlock') || card.querySelector('.templateName')?.parentElement || card;
    target.appendChild(div);
  }
  function setTemplateState(tipo,i,state,text){
    const card = byId(`thumb_${tipo}_${i}`)?.closest('.templateCard') || Array.from(document.querySelectorAll('#listaPlantillas .templateCard'))[i];
    if(!card) return;
    ensureTemplateState(card);
    card.classList.remove('template-loading','template-ready','template-error');
    if(state) card.classList.add('template-'+state);
    const tx=card.querySelector('.templateStateTextCopilot'); if(tx) tx.textContent=text || '';
    const btn=card.querySelector('button');
    if(btn){ btn.disabled = state==='loading'; btn.setAttribute('aria-busy', state==='loading'?'true':'false'); }
  }
  function addTemplateStates(){ document.querySelectorAll('#listaPlantillas .templateCard').forEach(ensureTemplateState); }
  async function toArrayBuffer(input){
    if(!input) throw new Error('Archivo no disponible');
    if(input instanceof ArrayBuffer) return input;
    if(input instanceof Uint8Array) return input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength);
    if(input instanceof Blob) return await input.arrayBuffer();
    return input;
  }
  function parseXmlStrict(xml, name){
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if(doc.querySelector('parsererror')) throw new Error('XML mal formado en '+(name||'documento'));
    return doc;
  }
  async function validateDocxPayload(input, label){
    const ab = await toArrayBuffer(input);
    if(!window.PizZip) return {ok:true, warning:'PizZip no disponible para validación profunda.'};
    let zip;
    try{ zip = new PizZip(ab); }catch(e){ throw new Error('Archivo DOCX inválido'); }
    if(!zip.files || !zip.files['word/document.xml']) throw new Error('DOCX sin word/document.xml');
    const names = Object.keys(zip.files).filter(k => /^word\/.*\.xml$/i.test(k) || /\[Content_Types\]\.xml$/i.test(k));
    let hasControls = false;
    for(const n of names){
      const xml = zip.files[n].asText();
      if(/<w:sdt\b|<w:dataBinding\b|<w:sdtPr\b|<w:sdtContent\b/i.test(xml)) hasControls = true;
      parseXmlStrict(xml, n);
    }
    return {ok:true, hasControls, label:label||''};
  }
  window.validarDocxCopilot = validateDocxPayload;

  const originalGetBuf = window.getBuf;
  if(typeof originalGetBuf === 'function'){
    window.getBuf = async function(t){
      const buf = await originalGetBuf.apply(this, arguments);
      try{ await validateDocxPayload(buf, t && t.name); }catch(e){ throw new Error(normErr(e)); }
      return buf;
    };
  }

  const originalRenderPlantillas = window.renderPlantillas;
  if(typeof originalRenderPlantillas === 'function'){
    window.renderPlantillas = function(){ const r = originalRenderPlantillas.apply(this, arguments); setTimeout(addTemplateStates,0); return r; };
    setTimeout(addTemplateStates,0);
  }

  const originalSeleccionar = window.seleccionarPlantilla;
  if(typeof originalSeleccionar === 'function'){
    window.seleccionarPlantilla = async function(tipo,i){
      setTemplateState(tipo,i,'loading','Validando y leyendo plantilla...');
      showGlobal('Validando plantilla antes de usarla...');
      try{
        const t = window.app && window.app.plantillas && window.app.plantillas[tipo] && window.app.plantillas[tipo][i];
        if(t && typeof window.getBuf === 'function') await window.getBuf(t);
        let lastErr;
        for(let attempt=1; attempt<=2; attempt++){
          try{ const r = await originalSeleccionar.apply(this, arguments); setTemplateState(tipo,i,'ready',SUCCESS); return r; }
          catch(e){ lastErr=e; if(attempt<2) await sleep(250); }
        }
        throw lastErr;
      }catch(e){
        const msg = normErr(e);
        setTemplateState(tipo,i,'error','No se pudo validar la plantilla');
        const cont = byId('wysiwyg'); if(cont) cont.innerHTML = errorHtml(msg,true);
        if(typeof window.toast === 'function') window.toast(msg);
      }finally{ hideGlobal(); }
    };
  }

  if(typeof window.actualizarPreviewReal === 'function'){
    window.actualizarPreviewReal = async function(){
      const cont = byId('wysiwyg');
      if(!cont) return;
      try{
        if(!window.app || !window.app.seleccion){ cont.innerHTML = '<div class="loader">Seleccione una plantilla para ver el Word real.</div>'; return; }
        if(!window.docx || typeof window.docx.renderAsync !== 'function'){ cont.innerHTML = errorHtml('Falta el componente de vista previa de Word. Verifica la carpeta DATOS/COMPONENTES.', false); return; }
        cont.classList.add('rendering-safe-copilot');
        cont.innerHTML = loaderHtml('Procesando documento Word','Validando estructura, controles de contenido y datos antes de mostrar la vista previa.');
        showGlobal('Procesando y renderizando documento Word...');
        const row = window.app.modo === 'manual' ? (typeof window.leerManual==='function'?window.leerManual():{}) : (window.app.previewRow || Array.from(window.app.datos||[]).find(r => window.app.marcados && window.app.marcados.has(r.__idx)) || {});
        if(typeof window.renderDocx !== 'function') throw new Error('Renderizador no disponible');
        let blob;
        let lastErr;
        for(let attempt=1; attempt<=2; attempt++){
          try{ blob = await window.renderDocx(row); await validateDocxPayload(blob, 'documento generado'); break; }
          catch(e){ lastErr=e; if(attempt<2) await sleep(300); }
        }
        if(!blob) throw lastErr || new Error('No se generó el documento');
        const stage = document.createElement('div');
        stage.style.position='absolute'; stage.style.left='-100000px'; stage.style.top='0'; stage.style.width='900px'; stage.style.opacity='0';
        document.body.appendChild(stage);
        try{
          await window.docx.renderAsync(blob, stage, null, {className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,renderHeaders:true,renderFooters:true,breakPages:true});
          const raw = stage.textContent || '';
          if(/<w:[a-zA-Z]+\b|Opening and ending tag mismatch|parsererror|This page contains the following errors/i.test(raw)) throw new Error('XML expuesto en renderizado');
          cont.classList.remove('rendering-safe-copilot');
          cont.innerHTML = '';
          while(stage.firstChild) cont.appendChild(stage.firstChild);
          if(typeof window.toast === 'function') window.toast('Vista previa lista');
        }finally{ stage.remove(); }
      }catch(e){
        cont.classList.remove('rendering-safe-copilot');
        cont.innerHTML = errorHtml(normErr(e), true);
      }finally{ hideGlobal(); }
    };
  }

  const observer = new MutationObserver(()=>addTemplateStates());
  observer.observe(byId('listaPlantillas') || document.documentElement,{childList:true,subtree:true});
})();

/* ==================== copilot-v69-svg-inline-table-js ==================== */
(function(){
'use strict'; if(window.__copilotV69Installed) return; window.__copilotV69Installed=true;
const byId=id=>document.getElementById(id); const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/_/g,' ').replace(/\s+/g,' ').trim(); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); const fmt=n=>new Intl.NumberFormat('es-CO').format(Number(String(n).replace(/\./g,''))||0);
function svg(type){const common="xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'";const map={
excel:`<svg ${common}><path d='M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z'/><path d='M3 9h18M3 15h18M9 3v18M15 3v18'/></svg>`,
peticiones:`<svg ${common}><path d='M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z'/><path d='M10 13h8M10 17h5'/></svg>`,
reclamos:`<svg ${common}><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/><path d='M8 10h.01M12 10h.01M16 10h.01'/></svg>`,
agpe:`<svg ${common}><rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/><rect x='3' y='14' width='7' height='7' rx='1'/><rect x='14' y='14' width='7' height='7' rx='1'/></svg>`,
quejas:`<svg ${common}><circle cx='12' cy='12' r='10'/><path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/><path d='M12 17h.01'/></svg>`,
firma:`<svg ${common}><path d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'/><path d='m15 5 4 4'/></svg>`};return map[type]||map.quejas;}
function folderType(t){t=norm(t);if(t.includes('PETIC'))return 'peticiones';if(t.includes('RECLAM'))return 'reclamos';if(t.includes('AGPE'))return 'agpe';if(t.includes('QUEJ'))return 'quejas';return ''}
function statusType(t){t=norm(t);if(t.includes('EXCEL'))return 'excel';if(t.includes('PETIC'))return 'peticiones';if(t.includes('RECLAM'))return 'reclamos';if(t.includes('AGPE'))return 'agpe';if(t.includes('QUEJ'))return 'quejas';if(t.includes('FIRMA'))return 'firma';return 'excel'}
function applySvg(){document.querySelectorAll('#config .folderBtnCopilot').forEach(btn=>{const type=folderType(btn.textContent);if(!type)return;btn.dataset.folder=type;const box=btn.querySelector('.folderBtnIconCopilot');if(box && !box.querySelector('.folderSvgIconCopilot')){box.innerHTML='<span class="folderSvgIconCopilot">'+svg(type)+'</span>';}});document.querySelectorAll('.folderStatusItemCopilot').forEach(item=>{const type=statusType(item.textContent);const box=item.querySelector('.folderStatusIconCopilot');if(box && !box.querySelector('.statusSvgIconCopilot')){box.innerHTML='<span class="statusSvgIconCopilot">'+svg(type)+'</span>';}})}
const PRI=['NUMERO_PROCESO','NUMERO_CUENTA','NOMBRE_SOLICITANTE','RADICADO_ENTRADA'];const CLS={NUMERO_PROCESO:'col-numero-proceso',NUMERO_CUENTA:'col-numero-cuenta',NOMBRE_SOLICITANTE:'col-nombre-solicitante',RADICADO_ENTRADA:'col-radicado-entrada'};const CG='<colgroup><col class="colCheckCopilot"><col class="colIndexCopilot"><col class="colProcesoCopilot"><col class="colCuentaCopilot"><col class="colNombreCopilot"><col class="colRadicadoCopilot"></colgroup>';function anon(r){return /\bANONI[MN]O\s+ANONI[MN]O\b/.test(norm(r&&r.NOMBRE_SOLICITANTE));}window.esRegistroAnonimoCopilot=anon;window.esCuentaVaciaCopilot=function(r){let c=String(r&&r.NUMERO_CUENTA==null?"":r.NUMERO_CUENTA).trim();return !c||/^0+([.,]0+)?$/.test(c);};function val(r,c){return typeof window.formatoNumeroPlanoCopilot==='function'?formatoNumeroPlanoCopilot(r?.[c],c):(r?.[c]??'');}
window.renderTabla=function(){const tabla=byId('tablaDatos');if(!tabla||!window.app)return;const q=norm(byId('buscar')?.value||'');const filtrados=(app.datos||[]).filter(r=>{if(anon(r))return false;if(window.esCuentaVaciaCopilot(r))return false;if(!q)return true;let s=r.__ns;if(s===undefined){let vals=[];for(const k in r){if(k==='__idx')continue;let v=norm(r[k]);if(v)vals.push(v)}s=vals.join(' ');Object.defineProperty(r,'__ns',{value:s,enumerable:false,configurable:true})}return s.includes(q)});app.visibles=filtrados.slice(0,500);const ids=new Set(app.visibles.map(r=>r.__idx));if(app.filaManualSeleccionada!=null&&!ids.has(app.filaManualSeleccionada)){if(typeof limpiarSeleccionTablaCopilot==='function')limpiarSeleccionTablaCopilot(false);else{app.previewRow=null;app.filaManualSeleccionada=null;}}const activo=app.filaManualSeleccionada!=null?app.filaManualSeleccionada:(app.previewRow?.__idx??null);let html=CG+'<thead><tr><th></th><th>#</th>'+PRI.map(c=>'<th title="'+esc(c)+'">'+esc(c)+'</th>').join('')+'</tr></thead><tbody>';app.visibles.forEach((r,i)=>{const n=i+1,sel=Number(activo)===Number(r.__idx);html+='<tr class="filaDatoCopilot '+(sel?'filaDatoSeleccionadaCopilot':'')+'" data-row-index="'+r.__idx+'" tabindex="0" role="row" aria-selected="'+(sel?'true':'false')+'" onclick="previsualizarFila('+r.__idx+')"><td><input class="check" type="checkbox" onclick="event.stopPropagation()" '+(app.marcados?.has(r.__idx)?'checked':'')+' onchange="toggleMarcado('+r.__idx+',this.checked)"></td><td title="Registro original Excel: '+(r.__idx+1)+'">'+n+'</td>'+PRI.map(c=>'<td class="numeroPlanoCopilot '+(CLS[c]||'')+'" title="'+esc(val(r,c))+'">'+esc(val(r,c))+'</td>').join('')+'</tr>';});tabla.innerHTML=!(app.datos||[]).length?CG+'<tbody><tr><td colspan="6">Cargue el Excel para visualizar registros.</td></tr></tbody>':(!app.visibles.length?html+'<tr><td colspan="6">No hay registros visibles. Se ocultan ANONIMO ANONIMO.</td></tr></tbody>':html+'</tbody>');if(typeof kpis==='function')kpis();};
window.seleccionarVisibles=function(on){(app.visibles||[]).filter(r=>!anon(r)).forEach(r=>on?app.marcados.add(r.__idx):app.marcados.delete(r.__idx));renderTabla();if(typeof actualizarPreviewDebounced==='function')actualizarPreviewDebounced(true);};
function refresh(){document.querySelectorAll('.kpi b,#kpiExcel,#kpiPet,#kpiRec,#kpiMarcados,#kpiManual,.folderStatusValueCopilot').forEach(el=>{if(!el||el.dataset.v69fmt)return;const old=el.textContent||'',neu=old.replace(/\b\d{4,}\b/g,m=>fmt(m));if(old!==neu){el.dataset.v69fmt='1';el.textContent=neu;setTimeout(()=>delete el.dataset.v69fmt,0);}});['peticiones','reclamos','agpe','quejas'].forEach(t=>{const b=[...document.querySelectorAll('#config .folderBtnCopilot')].find(x=>folderType(x.textContent)===t);if(b)b.classList.toggle('loaded',(app?.plantillas?.[t]||[]).length>0);});}
const oldK=window.kpis;if(typeof oldK==='function'){window.kpis=function(){(app?.datos||[]).forEach(r=>{if(anon(r))app.marcados?.delete(r.__idx)});const out=oldK.apply(this,arguments);setTimeout(refresh,0);return out;};}
setTimeout(()=>{try{renderTabla();refresh()}catch(e){}},600);function refreshThrottledV69(){if(!document.hidden)refresh();}setInterval(refreshThrottledV69,4000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});})();

/* ==================== bloque_7 ==================== */
(function(){let rtTimer=null;window.renderTablaDebounced=function(){clearTimeout(rtTimer);rtTimer=setTimeout(function(){if(typeof window.renderTabla==='function')window.renderTabla()},120)}})();

/* ==================== copilot-easy-template-x-real-preview-js ==================== */
(function(){'use strict';if(window.__easyXRealPreviewInstalled)return;window.__easyXRealPreviewInstalled=true;const MODS=['./DATOS/COMPONENTES/easy-template-x.js','./DATOS/COMPONENTES/easy-template-x.mjs','./DATOS/COMPONENTES/easy-template-x.esm.js'];const CDN='https://cdn.jsdelivr.net/npm/easy-template-x@7.2.4/+esm';function asAB(b){return b instanceof ArrayBuffer?Promise.resolve(b):b.arrayBuffer()}async function getTH(){for(const g of [window.easyTemplateX,window.EasyTemplateX,window.TemplateHandler?{TemplateHandler:window.TemplateHandler}:null].filter(Boolean)){if(g.TemplateHandler)return g.TemplateHandler}for(const u of MODS){try{let m=await import(u);if(m.TemplateHandler)return m.TemplateHandler;if(m.default&&m.default.TemplateHandler)return m.default.TemplateHandler}catch(e){}}try{let m=await import(CDN);if(m.TemplateHandler)return m.TemplateHandler;if(m.default&&m.default.TemplateHandler)return m.default.TemplateHandler}catch(e){}throw Error('Easy-Template-X no esta instalado. Ejecute INSTALAR_EASY_TEMPLATE_X_LOCAL_CORREGIDO.cmd')}function unwrapSdtXml(xml){let prev;do{prev=xml;xml=xml.replace(/<w:sdt\b[\s\S]*?<w:sdtContent\b[^>]*>([\s\S]*?)<\/w:sdtContent>\s*<\/w:sdt>/gi,'$1');xml=xml.replace(/<w:sdt\b[\s\S]*?<w:dataBinding\b[^>]*w:xpath="[^"]*\/ns\d+:([A-Z\u00C0-\u00FF0-9_]+)\{1\}[^"]*"[\s\S]*?<\/w:sdt>/gi,function(_,name){return '<w:r><w:t>{'+name+'}</w:t></w:r>'});}while(xml!==prev);return xml}function prepTemplate(buf){let z=new PizZip(buf);let tag=/\[([A-Z\u00C0-\u00FF0-9_\- ]+)\]/g;Object.keys(z.files).filter(k=>/^word\/.*\.xml$/i.test(k)).forEach(k=>{let x=z.files[k].asText();x=unwrapSdtXml(x);x=x.replace(tag,(m,v)=>'{'+String(v).trim().replace(/\s+/g,'_')+'}');z.file(k,x)});return z.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}function fd(){if(!app||!app.firmaDataUrl)return null;let m=String(app.firmaDataUrl).match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);if(!m)return null;let ext=m[1].toLowerCase();if(ext==='jpeg')ext='jpg';let mime=ext==='jpg'?'image/jpeg':(ext==='webp'?'image/webp':'image/png');return{ext,mime,b64:m[2]}}function typ(z,e,m){let p='[Content_Types].xml';if(!z.files[p])return;let x=z.files[p].asText();if(x.toLowerCase().indexOf('extension="'+e+'"')<0)z.file(p,x.replace('</Types>','<Default Extension="'+e+'" ContentType="'+m+'"/></Types>'))}function rel(z,t){let p='word/_rels/document.xml.rels';let x=z.files[p]?z.files[p].asText():'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';let id='rIdFirmaEasyX'+Date.now()+Math.floor(Math.random()*99999);z.file(p,x.replace('</Relationships>','<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="'+t+'"/></Relationships>'));return id}function draw(id,e){let cx=2468880,cy=777240;return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+Math.floor(Math.random()*999999)+'" name="FIRMA_DOCUMENTO"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="firma_documento.'+e+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'}function plain(p){let a=[];p.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g,(_,t)=>{a.push(String(t).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));return _});return a.join('')}function injectFirma(z){let f=fd();if(!f)return;typ(z,f.ext,f.mime);let img='firma_easyx_'+Date.now()+'.'+f.ext;z.file('word/media/'+img,f.b64,{base64:true});let run=draw(rel(z,'media/'+img),f.ext);Object.keys(z.files).filter(k=>/^word\/(document|header\d+|footer\d+)\.xml$/i.test(k)).forEach(p=>{let x=unwrapSdtXml(z.files[p].asText());x=x.replace(/<w:r[^>]*>\s*<w:t[^>]*>\[(FIRMA_DOCUMENTO|FIRMA_USUARIO|FIRMA)\]<\/w:t>\s*<\/w:r>/g,run);x=x.replace(/<w:p[\s\S]*?<\/w:p>/g,q=>/\[(FIRMA_DOCUMENTO|FIRMA_USUARIO|FIRMA)\]/.test(plain(q))?'<w:p>'+((q.match(/<w:pPr[\s\S]*?<\/w:pPr>/)||[''])[0])+run+'</w:p>':q);z.file(p,x)})}function sanitizeGenerated(z){Object.keys(z.files).filter(k=>/^word\/.*\.xml$/i.test(k)).forEach(k=>z.file(k,unwrapSdtXml(z.files[k].asText())))}async function gen(row){let H=await getTH();let file=await archivoPlantilla();let datos=sanitizarDatosFusionCopilot(dataDoc(row),row);let out=await new H().process(prepTemplate(await file.arrayBuffer()),datos);if(out instanceof ArrayBuffer)out=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});let z=new PizZip(await asAB(out));sanitizeGenerated(z);reemplazarPlaceholdersRestantesCopilot(z,datos);let correo=datos.CORREO_ELECTRONICO||datos.CORREO_SOLICITANTE;limpiarObjectPromiseCopilot(z,correo);aplicarAparienciaCorreoCopilot(z,correo);asegurarCorreoVisibleCopilot(z,correo,datos.NOMBRE_SOLICITANTE);injectFirma(z);return z.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}window.renderDocxEasyTemplateXCopilot=gen;window.renderDocx=async row=>await gen(row);const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));window.actualizarPreviewReal=async function(){let c=document.getElementById('wysiwyg');try{if(!c)return;if(!app||!app.seleccion){c.innerHTML='<div class="loader">Seleccione una plantilla para ver el Word real.</div>';return}if(!window.docx||typeof docx.renderAsync!=='function'){c.innerHTML='<div class="loader">Falta docx-preview.min.js en DATOS/COMPONENTES.</div>';return}let row=app.modo==='manual'?(typeof leerManual==='function'?leerManual():{}):(app.previewRow||Array.from(app.datos||[]).find(r=>app.marcados&&app.marcados.has(r.__idx))||{});c.innerHTML='<div class="loader">Generando vista Word con Easy-Template-X...</div>';let blob=await gen(row);c.innerHTML='';await docx.renderAsync(blob,c,null,{className:'docx',inWrapper:true,ignoreWidth:false,ignoreHeight:false,renderHeaders:true,renderFooters:true,breakPages:true})}catch(e){if(c)c.innerHTML='<div class="previewErrorX"><div><b>No se pudo mostrar la vista Word</b><span>'+esc(e.message||e)+'</span><span>El documento no se mostrara como texto plano para evitar perder formato. Revise que la plantilla no tenga controles de contenido corruptos y genere el DOCX.</span></div></div>';if(typeof estado==='function')estado('Vista previa Word: '+(e.message||e),'bad')}}})();





/* ==================== pro-v10-perf-js ==================== */
(function(){
  'use strict';
  /* Cache del archivo de plantilla: evita re-leer el DOCX en cada render/vista previa. */
  var _origArchivo=window.archivoPlantilla;
  var _cache=null;
  if(typeof _origArchivo==='function'){
    window.archivoPlantilla=function(){
      try{
        var t=window.app&&window.app.seleccion?((window.app.plantillas||{})[window.app.seleccion.tipo]||[])[window.app.seleccion.i]:null;
        if(t&&t.handle){
          return t.handle.getFile().then(function(f){
            var sig=t.name+'|'+(f.lastModified||0)+'|'+(f.size||0);
            if(!_cache||_cache.sig!==sig){_cache={sig:sig,file:f};}
            return _cache.file;
          }).catch(function(){ return _origArchivo(); });
        }
      }catch(e){}
      return _origArchivo();
    };
  }
  /* Desactiva efectos visuales pesados de la vista previa cuando la pestana no es visible. */
  if('IntersectionObserver' in window){
    try{
      var _preview=document.getElementById('preview');
      if(_preview){
        var _previewDirty=false;
        var _io=new IntersectionObserver(function(entries){
          entries.forEach(function(en){
            if(en.isIntersecting){
              if(_previewDirty&&typeof window.actualizarPreviewDebounced==='function'){
                _previewDirty=false;
                window.actualizarPreviewDebounced(true);
              }
            }
          });
        },{root:null,rootMargin:'200px'});
        _io.observe(_preview);
        var _mark=window.actualizarPreviewDebounced;
        if(typeof _mark==='function'){
          window.actualizarPreviewDebounced=function(force){
            var vis=_preview;
            if(!force&&vis){
              var r=vis.getBoundingClientRect();
              var vh=window.innerHeight||document.documentElement.clientHeight;
              if(r.bottom< -200||r.top> vh+200){ _previewDirty=true; return; }
            }
            return _mark(force);
          };
        }
      }
    }catch(e){}
  }
})();

/* ==================== pro-v12-ux-status-icons-js ==================== */
(function(){
  'use strict';
  function kindOf(label){
    var s=String(label||'').toLowerCase();
    if(s.indexOf('excel')>-1)return 'excel';
    if(s.indexOf('pet')>-1)return 'peticiones';
    if(s.indexOf('recl')>-1)return 'reclamos';
    if(s.indexOf('agpe')>-1)return 'agpe';
    if(s.indexOf('quej')>-1)return 'quejas';
    if(s.indexOf('firma')>-1)return 'firma';
    return 'excel';
  }
  var PATHS={
    excel:'<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    peticiones:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13H8M16 13h-2M10 17H8M14 17h-2"/>',
    reclamos:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
    agpe:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    quejas:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    firma:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/>'
  };
  function inject(){
    var list=document.querySelectorAll('#folderStatus .folderStatusItemCopilot');
    for(var i=0;i<list.length;i++){
      var item=list[i];
      if(item.querySelector('.folderStatusIconCopilot'))continue;
      var label=((item.querySelector('.folderStatusLabelCopilot'))||{}).textContent||'';
      var kind=kindOf(label);
      item.setAttribute('data-kind',kind);
      var box=document.createElement('span');
      box.className='folderStatusIconCopilot';
      box.setAttribute('aria-hidden','true');
      box.innerHTML='<span class="statusSvgIconCopilot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(PATHS[kind]||PATHS.excel)+'</svg></span>';
      item.insertBefore(box,item.firstChild);
    }
  }
  var fs=document.getElementById('folderStatus');
  if(fs){
    inject();
    if(window.MutationObserver){
      var mo=new MutationObserver(function(){inject();});
      mo.observe(fs,{childList:true,subtree:true});
    }
  }
  document.addEventListener('DOMContentLoaded',inject);
  window.addEventListener('load',inject);
})();

/* ==================== copilot-redesign-accordion-head-js ==================== */
(function(){
  function byId(id){return document.getElementById(id)}
  window.modNav=function(btn){
    var group=btn.closest('.modGroup');
    if(!group)return;
    if(document.body.classList.contains('menu-mini')&&typeof window.toggleMenu==='function'){window.toggleMenu();group.classList.add('open');btn.setAttribute('aria-expanded','true');return;}
    var accordion=group.closest('.modAccordion');
    var open=group.classList.contains('open');
    if(accordion){Array.prototype.forEach.call(accordion.querySelectorAll('.modGroup.open'),function(g){if(g!==group){g.classList.remove('open');var h=g.querySelector('.modHead');if(h)h.setAttribute('aria-expanded','false');}});}
    group.classList.toggle('open',!open);
    btn.setAttribute('aria-expanded',String(!open));
  };
  window.seleccionarModulo=function(mod){
    var target=(mod==='vista')?byId('preview'):byId(mod);
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    Array.prototype.forEach.call(document.querySelectorAll('.modGroup'),function(g){g.classList.toggle('current',g.getAttribute('data-mod')===mod);});
    Array.prototype.forEach.call(document.querySelectorAll('.modAccordion .nav-link'),function(a){a.classList.toggle('active',a.getAttribute('href')==='#'+mod);});
    if(window.innerWidth<=1024){var side=byId('sidebar');if(side&&side.classList.contains('menu-active')&&typeof window.toggleMenuMobileCopilot==='function')window.toggleMenuMobileCopilot();}
  };
  window.toggleMenuMobileCopilot=function(){
    var side=byId('sidebar');
    if(!side)return;
    side.classList.toggle('menu-active');
    var btn=side.querySelector('.menu-toggler');
    if(btn){var open=side.classList.contains('menu-active');btn.setAttribute('aria-expanded',String(open));btn.title=open?'Cerrar menú':'Abrir menú';}
  };
  function syncAppHead(){
    var head=byId('appHead');
    if(!head)return;
    document.documentElement.style.setProperty('--apphead',head.offsetHeight+'px');
  }
  function init(){syncAppHead();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',syncAppHead);
  window.addEventListener('resize',syncAppHead);
})();

/* ==================== ESSA_MASTER_UI_V3_JS ==================== */
(function(){
try{document.title=document.title.replace(/ \[ESSA:[^\]]*\]/,'')+' [ESSA:RUNNING]'}catch(e){}
const cfg={
perfiles:{n:'01',t:'Perfil de trabajo',d:'Define la información general y el contexto del documento que se va a generar.',icon:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'},
config:{n:'02',t:'Configuración de firma y rutas',d:'Configura las firmas autorizadas y las rutas de almacenamiento del documento.',icon:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'},
plantillas:{n:'03',t:'Galería de plantillas',d:'Selecciona y administra las plantillas disponibles para tus documentos.',icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"/><path d="M14 2v6h6"/><rect x="12" y="12" width="9" height="8" rx="2"/><path d="M15 16h3"/>'},
datos:{n:'04',t:'Datos del documento',d:'Completa los datos que se insertarán en la plantilla seleccionada.',icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>'},
generar:{n:'05',t:'Generación',d:'Genera el documento individual o el paquete masivo con la información seleccionada.',icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>'}
};
function getDirect(card,sel){return Array.from(card.children).find(x=>x.matches&&x.matches(sel))||null}
function build(card,id,index){try{if(!card||card.dataset.essaBuilt==='1')return;const c=cfg[id];if(!c)return;const oldHead=getDirect(card,'.sectionHead')||getDirect(card,'.accordionHeader');const children=Array.from(card.children);const body=document.createElement('div');body.className='essaModuleBody';let after=false;children.forEach(el=>{if(el===oldHead){after=true;return}if(after)body.appendChild(el)});const head=document.createElement('div');head.className='essaModuleHead';head.tabIndex=0;head.setAttribute('role','button');head.innerHTML='<div class="essaModuleIcon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+c.icon+'</svg></div><div class="essaModuleText"><div class="essaModuleTitle"><span class="essaModuleNum">'+c.n+'</span><span>'+c.t+'</span></div><div class="essaModuleDesc">'+c.d+'</div></div><button type="button" class="essaModuleToggle" aria-label="Contraer módulo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>';
if(id==='perfiles'&&oldHead){const autos=oldHead.querySelector('.autoSaveWrap');if(autos){const extra=document.createElement('div');extra.className='essaHeadExtra';extra.appendChild(autos);head.insertBefore(extra,head.querySelector('.essaModuleToggle'))}}
if(oldHead)oldHead.remove();card.insertBefore(head,card.firstChild);card.appendChild(body);card.dataset.essaBuilt='1';
function state(collapsed){card.classList.toggle('essa-collapsed',collapsed);card.classList.remove('accordion-collapsed','perfil-collapsed');body.hidden=collapsed;const b=head.querySelector('.essaModuleToggle');if(b){b.setAttribute('aria-expanded',String(!collapsed));b.setAttribute('aria-label',collapsed?'Expandir módulo':'Contraer módulo');}body.setAttribute('aria-hidden',String(collapsed))}
const toggleBtn=head.querySelector('.essaModuleToggle');if(toggleBtn){toggleBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();state(!card.classList.contains('essa-collapsed'))},true);}head.addEventListener('click',e=>{if(e.target.closest('button,input,label,a,select,textarea'))return;state(!card.classList.contains('essa-collapsed'))});head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();state(!card.classList.contains('essa-collapsed'))}});state(true)}catch(e){console.error('ESSA build error for '+id,e)}}
function init(){try{['perfiles','config','plantillas','datos','generar'].forEach((id,i)=>{const el=document.getElementById(id);if(el)build(el,id,i);else console.warn('ESSA module not found:',id)});try{document.title=document.title.replace(/ \[ESSA:[^\]]*\]/,'')+' [ESSA:BUILT:'+document.querySelectorAll('.essaModuleHead').length+']'}catch(e){}}catch(e){console.error('ESSA init error',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();setTimeout(init,0);window.addEventListener('load',init,{once:true});
})();

/* ==================== ESSA_GALLERY_FIX_V8_JS ==================== */
(function(){
 function unwrapSelect(id){
   const select=document.getElementById(id);if(!select)return;
   const custom=select.closest('.customSelectCopilot,.customSelectV87');
   if(custom){const control=custom.closest('.filterControlCopilot')||custom.parentElement;control.insertBefore(select,custom);custom.remove()}
   select.style.cssText='';select.removeAttribute('aria-hidden');select.tabIndex=0;
 }
 function clean(){
   unwrapSelect('tipoProceso');unwrapSelect('categoriaFiltro');
   const tools=document.querySelector('#plantillas .templateTools');if(!tools)return;
   tools.querySelectorAll('.customSelectCopilot,.customSelectV87').forEach(x=>x.remove());
   const search=document.getElementById('buscarPlantilla');if(search){search.placeholder='Buscar por nombre, categoría o variable...'}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(clean,900),{once:true});else setTimeout(clean,900);
 window.addEventListener('load',()=>setTimeout(clean,1200),{once:true});
 window.corregirGaleriaESSA=clean;
})();

/* ==================== ESSA_AUTOSAVE_ALWAYS_ON_V9_JS ==================== */
(function(){
  function activate(){
    const checkbox=document.getElementById('guardarPrefs');
    if(checkbox){
      checkbox.checked=true;
      checkbox.defaultChecked=true;
      checkbox.setAttribute('checked','checked');
      checkbox.setAttribute('aria-hidden','true');
      checkbox.tabIndex=-1;
      checkbox.disabled=false;
    }
    try{localStorage.setItem('premiumAutoSave','1')}catch(e){}
    try{localStorage.setItem('guardarPrefs','1')}catch(e){}
    if(typeof window.guardarPerfilActual==='function'){
      try{window.guardarPerfilActual()}catch(e){}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(activate,1300)},{once:true});
  else setTimeout(activate,1300);
  window.addEventListener('load',function(){setTimeout(activate,1600)},{once:true});
  window.activarAutoguardadoESSA=activate;
})();

/* ==================== ESSA_PREVIEW_DESKTOP_HARD_FIX_V26_JS ==================== */
(function(){
  'use strict';
  function setImportant(el, property, value){
    if(el) el.style.setProperty(property,value,'important');
  }
  function forcePreviewLayout(){
    var workspace=document.querySelector('section.workspace');
    var main=document.querySelector('main.main');
    var left=workspace&&workspace.querySelector(':scope > .left');
    var preview=document.getElementById('preview');
    var card=preview&&preview.querySelector(':scope > .card');
    var shell=document.getElementById('wysiwyg');
    if(!workspace||!left||!preview||!card)return;
    [workspace,left,preview,card,shell].forEach(function(el){
      if(!el)return;
      el.removeAttribute('hidden');
      el.removeAttribute('aria-hidden');
      el.classList.remove('hidden');
    });
    if(window.innerWidth>=1121){
      var wide=window.innerWidth>=1600;
      var compact=window.innerWidth<=1380;
      var sidePadding=wide?44:36;
      var columns=compact?'minmax(500px,45%) minmax(0,55%)':(wide?'minmax(680px,45%) minmax(0,55%)':'minmax(540px,46%) minmax(0,54%)');
      var gap=compact?'14px':(wide?'18px':'16px');
      setImportant(main,'width','100vw');
      setImportant(main,'max-width','100vw');
      setImportant(main,'overflow','hidden');
      setImportant(workspace,'display','grid');
      setImportant(workspace,'grid-template-columns',columns);
      setImportant(workspace,'grid-template-areas','"modulos vista"');
      setImportant(workspace,'gap',gap);
      setImportant(workspace,'width','calc(100vw - '+sidePadding+'px)');
      setImportant(workspace,'max-width','calc(100vw - '+sidePadding+'px)');
      setImportant(workspace,'height','calc(100vh - 170px)');
      setImportant(workspace,'min-height','560px');
      setImportant(workspace,'overflow','hidden');
      setImportant(left,'grid-area','modulos');
      setImportant(left,'grid-column','1');
      setImportant(left,'width','100%');
      setImportant(left,'height','100%');
      setImportant(left,'max-height','100%');
      setImportant(left,'overflow-y','auto');
      setImportant(left,'overflow-x','hidden');
      setImportant(preview,'display','block');
      setImportant(preview,'grid-area','vista');
      setImportant(preview,'grid-column','2');
      setImportant(preview,'position','relative');
      setImportant(preview,'top','auto');
      setImportant(preview,'width','100%');
      setImportant(preview,'height','100%');
      setImportant(preview,'max-height','100%');
      setImportant(preview,'overflow','hidden');
      setImportant(preview,'transform','none');
      setImportant(card,'display','flex');
      setImportant(card,'width','100%');
      setImportant(card,'height','100%');
      setImportant(card,'min-height','0');
      setImportant(card,'max-height','100%');
      if(shell){
        setImportant(shell,'width','100%');
        setImportant(shell,'min-height','0');
        setImportant(shell,'height','auto');
        setImportant(shell,'max-height','none');
        setImportant(shell,'overflow','auto');
      }
    }else{
      setImportant(main,'width','100%');
      setImportant(main,'max-width','100%');
      setImportant(main,'overflow','visible');
      setImportant(workspace,'grid-template-columns','minmax(0,1fr)');
      setImportant(workspace,'grid-template-areas','"modulos" "vista"');
      setImportant(workspace,'width','100%');
      setImportant(workspace,'max-width','100%');
      setImportant(workspace,'height','auto');
      setImportant(workspace,'overflow','visible');
      setImportant(left,'height','auto');
      setImportant(left,'max-height','none');
      setImportant(left,'overflow','visible');
      setImportant(preview,'grid-area','vista');
      setImportant(preview,'grid-column','1');
      setImportant(preview,'position','relative');
      setImportant(preview,'top','auto');
      setImportant(preview,'height','auto');
      setImportant(preview,'max-height','none');
      setImportant(card,'height','760px');
      setImportant(card,'max-height','none');
    }
  }
  function run(){
    forcePreviewLayout();
    requestAnimationFrame(forcePreviewLayout);
    setTimeout(forcePreviewLayout,120);
    setTimeout(forcePreviewLayout,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',run,{once:true});
  window.addEventListener('resize',forcePreviewLayout,{passive:true});
  window.addEventListener('orientationchange',run,{passive:true});
  window.corregirVistaPreviaESSA=forcePreviewLayout;
})();

/* ==================== ESSA_ACCORDION_LAYOUT_AUDIT_V1_JS ==================== */
(function(){
  'use strict';
  const ids=['perfiles','config','plantillas','datos','generar'];
  function normalize(){
    const left=document.querySelector('section.workspace > .left');
    if(!left)return;
    left.style.removeProperty('height');
    left.style.removeProperty('max-height');
    ids.forEach(function(id){
      const card=document.getElementById(id);
      if(!card)return;
      card.style.removeProperty('height');
      card.style.removeProperty('min-height');
      card.style.removeProperty('max-height');
      card.style.removeProperty('transform');
      const body=card.querySelector(':scope > .essaModuleBody');
      const btn=card.querySelector(':scope > .essaModuleHead .essaModuleToggle');
      if(!body||!btn)return;
      const collapsed=card.classList.contains('essa-collapsed');
      body.hidden=collapsed;
      body.setAttribute('aria-hidden',String(collapsed));
      btn.setAttribute('aria-expanded',String(!collapsed));
      btn.setAttribute('aria-label',collapsed?'Expandir módulo':'Contraer módulo');
    });
    const preview=document.getElementById('preview');
    if(preview){
      preview.style.removeProperty('--preview-follow-y');
      preview.style.removeProperty('transform');
      preview.classList.remove('is-stuck');
    }
  }
  function init(){
    normalize();
    requestAnimationFrame(normalize);
    setTimeout(normalize,250);
    const left=document.querySelector('section.workspace > .left');
    if(left&&window.MutationObserver){
      new MutationObserver(function(mutations){
        if(mutations.some(m=>m.type==='attributes'&&(m.attributeName==='class'||m.attributeName==='hidden')))
          requestAnimationFrame(normalize);
      }).observe(left,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',normalize,{once:true});
  window.addEventListener('resize',normalize,{passive:true});
  window.auditarLayoutModulosESSA=normalize;
})();
