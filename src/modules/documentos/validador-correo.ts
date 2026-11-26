/* eslint-disable @typescript-eslint/ban-ts-comment -- módulo heredado sin tipos; se valida en tiempo de ejecución */
// @ts-nocheck — v50 · Validador de correos + botón «D» del Módulo 3 (Generación documental).
/* ────────────────────────────────────────────────────────────────────────────
   Se integra con UNA línea en src/modules/documentos/main.ts:
       import './validador-correo';
   1. Campo «Correo» de «Información del solicitante»: valida en vivo (formato, errores
      de digitación como gmial/hotmial, correos de relleno y existencia del dominio por
      DNS). Indicador ✓ ! ✕ – y botón «Verificar buzón» (copia el correo y abre Site24x7).
      Todo va DENTRO del campo: no cambia el tamaño ni desplaza los demás campos.
      Privacidad: a la consulta DNS solo viaja el dominio (ej. «gmail.com»).
   2. Botón «Duplicados» del campo «Radicado»: se ubica DENTRO del campo como un botón
      cuadrado con «+» (mismo estilo de los íconos del encabezado), con el mismo
      comportamiento (abre la misma lista, mismo contador).
   La posición de los botones es 100 % CSS (sin cálculos por JavaScript), así se mueven
   junto con la ficha al minimizarla o expandirla, sin retardo.
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Validador de correos - Lógica (sin interfaz)
 * Asistente Documental ESSA
 *
 * Niveles:
 *  - valido:      formato correcto y dominio con servidor de correo (MX)
 *  - advertencia: posible error de digitación o no fue posible confirmar el dominio
 *  - invalido:    formato incorrecto o dominio inexistente / sin correo
 *  - sincorreo:   valor de relleno (notiene@notiene.com, N/A, etc.)
 *
 * Privacidad: a la consulta DNS solo viaja el DOMINIO (ej. "gmail.com"),
 * nunca la dirección completa del usuario.
 */
/* ---------- Dominios conocidos (no requieren consulta DNS) ---------- */
const DOMINIOS_CONOCIDOS = [
    'gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es',
    'yahoo.com', 'yahoo.es', 'yahoo.com.co', 'live.com', 'msn.com',
    'icloud.com', 'me.com', 'protonmail.com', 'proton.me', 'aol.com',
    'essa.com.co', 'epm.com.co', 'une.net.co', 'unal.edu.co', 'uis.edu.co',
    'unab.edu.co', 'upb.edu.co', 'udes.edu.co', 'santander.gov.co',
    'bucaramanga.gov.co', 'superservicios.gov.co', 'cdmb.gov.co', 'claro.com.co',
    'tigo.com.co', 'etb.com.co', 'etb.net.co',
];
/* ---------- Errores frecuentes escritos a mano ---------- */
const ERRORES_DOMINIO = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
    'gmal.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com',
    'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
    'gmail.om': 'gmail.com', 'gmail.cmo': 'gmail.com', 'gmail.es': 'gmail.com',
    'gmail.com.co': 'gmail.com', 'gimail.com': 'gmail.com', 'gemail.com': 'gmail.com',
    'g.mail.com': 'gmail.com', 'gmail': 'gmail.com', 'gmailcom': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
    'hotamil.com': 'hotmail.com', 'homail.com': 'hotmail.com', 'hormail.com': 'hotmail.com',
    'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmil.com': 'hotmail.com',
    'jotmail.com': 'hotmail.com', 'otmail.com': 'hotmail.com', 'hotmail': 'hotmail.com',
    'hotmail.com.co': 'hotmail.com', 'hotmaill.com': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com',
    'outlook.con': 'outlook.com', 'otlook.com': 'outlook.com', 'outllok.com': 'outlook.com',
    'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
    'yahoo.con': 'yahoo.com', 'yhoo.com': 'yahoo.com',
    'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com',
    'essa.com': 'essa.com.co', 'essa.co': 'essa.com.co', 'esa.com.co': 'essa.com.co',
};
/* ---------- Valores de relleno usados cuando no hay correo ---------- */
const RELLENOS = [
    /^notiene@/, /^no\.?tiene/, /^sincorreo/, /^sin\.?correo/, /^noaplica/,
    /^n\.?a\.?@/, /^na@/, /^ninguno@/, /^no@/, /^xx+@/, /^correo@correo/,
    /^prueba@/, /^test@/, /^ejemplo@/, /@notiene\./, /@sincorreo\./,
];
const TEXTOS_SIN_CORREO = ['n/a', 'na', 'no tiene', 'notiene', 'sin correo', 'no registra', 'ninguno', '-', '0'];
/* ---------- Utilidades ---------- */
function normalizar(valor) {
    return (valor || '')
        .normalize('NFKC')
        .replace(/^mailto:/i, '')
        .replace(/[\s\u200B<>"';,]+/g, '')
        .replace(/\.+$/, '')
        .toLowerCase();
}
function distancia(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++)
        d[0][j] = j;
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
}
function sugerirDominio(dominio) {
    if (ERRORES_DOMINIO[dominio])
        return ERRORES_DOMINIO[dominio];
    if (DOMINIOS_CONOCIDOS.includes(dominio))
        return undefined;
    let mejor, min = 3;
    for (const c of DOMINIOS_CONOCIDOS) {
        const dist = distancia(dominio, c);
        // Solo sugerir si es muy parecido (evita confundir dominios legítimos)
        if (dist > 0 && dist < min && dist <= Math.max(1, Math.floor(c.length / 6))) {
            min = dist;
            mejor = c;
        }
    }
    return mejor;
}
const REGEX_LOCAL = /^[a-z0-9!#$%&*+\/=?^_`{|}~-]+(\.[a-z0-9!#$%&*+\/=?^_`{|}~-]+)*$/;
const REGEX_DOMINIO = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
function validarFormato(correo) {
    const partes = correo.split('@');
    if (partes.length !== 2)
        return partes.length > 2 ? 'Contiene más de un símbolo @' : 'Falta el símbolo @';
    const [local, dominio] = partes;
    if (!local)
        return 'Falta el nombre de usuario antes de @';
    if (!dominio)
        return 'Falta el dominio después de @';
    if (local.length > 64)
        return 'El nombre de usuario es demasiado largo';
    if (/[^\x00-\x7f]/.test(local))
        return 'Contiene tildes, ñ u otros caracteres no permitidos';
    if (!REGEX_LOCAL.test(local))
        return 'El nombre de usuario tiene caracteres o puntos no válidos';
    if (!dominio.includes('.'))
        return 'El dominio está incompleto (falta .com, .co, etc.)';
    if (!REGEX_DOMINIO.test(dominio))
        return 'El dominio no tiene un formato válido';
    return null;
}
const CLAVE_CACHE = 'validadorCorreo.dns.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const memoria = new Map();
function leerCache() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_CACHE) || '{}');
    }
    catch {
        return {};
    }
}
function guardarCache(dominio, e) {
    if (e === 'desconocido')
        return;
    try {
        const c = leerCache();
        c[dominio] = { e, t: Date.now() };
        localStorage.setItem(CLAVE_CACHE, JSON.stringify(c));
    }
    catch { /* sin almacenamiento */ }
}
async function consultarDoH(dominio, tipo) {
    const servidores = [
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(dominio)}&type=${tipo}`,
        `https://dns.google/resolve?name=${encodeURIComponent(dominio)}&type=${tipo}`,
    ];
    for (const url of servidores) {
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 4000);
            const r = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: ctrl.signal });
            clearTimeout(t);
            if (!r.ok)
                continue;
            const j = await r.json();
            const tipoNum = tipo === 'MX' ? 15 : 1;
            const answers = (j.Answer || []).filter((a) => a.type === tipoNum).length;
            return { status: j.Status, answers };
        }
        catch { /* probar siguiente servidor */ }
    }
    return null;
}
function verificarDominio(dominio) {
    if (DOMINIOS_CONOCIDOS.includes(dominio))
        return Promise.resolve('ok');
    const c = leerCache()[dominio];
    if (c && Date.now() - c.t < TTL_MS)
        return Promise.resolve(c.e);
    if (memoria.has(dominio))
        return memoria.get(dominio);
    const p = (async () => {
        const mx = await consultarDoH(dominio, 'MX');
        if (!mx)
            return 'desconocido'; // sin internet o bloqueado
        if (mx.status === 3)
            return 'noexiste'; // NXDOMAIN
        if (mx.answers > 0)
            return 'ok';
        const a = await consultarDoH(dominio, 'A'); // sin MX: algunos reciben por registro A
        return a && a.answers > 0 ? 'sinmx' : 'noexiste';
    })().then(e => { guardarCache(dominio, e); memoria.delete(dominio); return e; });
    memoria.set(dominio, p);
    return p;
}
/* ---------- Función principal ---------- */
function validarCorreoRapido(valor) {
    const bruto = (valor || '').trim().toLowerCase();
    if (!bruto)
        return { estado: 'vacio', correo: '', mensaje: 'Sin correo' };
    if (TEXTOS_SIN_CORREO.includes(bruto))
        return { estado: 'sincorreo', correo: bruto, mensaje: 'El usuario no registró correo electrónico' };
    const correo = normalizar(valor);
    if (RELLENOS.some(r => r.test(correo)))
        return { estado: 'sincorreo', correo, mensaje: 'Correo de relleno: el usuario no registró correo electrónico' };
    // Corrección de dominios sin punto o mal escritos antes de evaluar formato
    const [local, dominio = ''] = correo.split('@');
    const sugeridoDom = correo.split('@').length === 2 ? sugerirDominio(dominio) : undefined;
    const sugerencia = sugeridoDom ? `${local}@${sugeridoDom}` : undefined;
    const error = validarFormato(correo);
    if (error)
        return { estado: 'invalido', correo, mensaje: error, sugerencia };
    if (sugerencia)
        return { estado: 'advertencia', correo, mensaje: `Posible error de digitación. ¿Quiso decir ${sugerencia}?`, sugerencia };
    return { pendienteDominio: dominio, correo };
}
async function validarCorreo(valor) {
    const r = validarCorreoRapido(valor);
    if (!('pendienteDominio' in r))
        return r;
    const e = await verificarDominio(r.pendienteDominio);
    switch (e) {
        case 'ok': return { estado: 'valido', correo: r.correo, mensaje: 'Formato correcto y dominio con servidor de correo activo' };
        case 'sinmx': return { estado: 'advertencia', correo: r.correo, mensaje: 'El dominio existe, pero no tiene servidor de correo configurado' };
        case 'noexiste': return { estado: 'invalido', correo: r.correo, mensaje: `El dominio "${r.pendienteDominio}" no existe` };
        default: return { estado: 'advertencia', correo: r.correo, mensaje: 'Formato correcto. No fue posible verificar el dominio (sin conexión)' };
    }
}


/* ================= Interfaz ================= */
const URL_VERIFICADOR='https://www.site24x7.com/es/tools/email-validator.html';
const ICONO={valido:'✓',advertencia:'!',invalido:'✕',sincorreo:'–'};
const CSS=`
/* Envoltura del input: los controles se posicionan respecto al propio input (solo CSS). */
.vcWrap{position:relative;display:block;width:100%;min-width:0}
.vcWrap>input{width:100%}
.vcWrap.vcCorreo>input{padding-right:58px!important}
.vcWrap.vcRad>input{padding-right:36px!important}
.vcWrap>input.vc-invalido{border-color:#dc2626!important;background:#fff7f7!important}
.vcWrap>input.vc-advertencia{border-color:#f59e0b!important;background:#fffbf2!important}
html[data-theme="dark"] .vcWrap>input.vc-invalido{background:rgba(220,38,38,.10)!important}
html[data-theme="dark"] .vcWrap>input.vc-advertencia{background:rgba(245,158,11,.10)!important}
.vcCtl{position:absolute;right:5px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:4px;z-index:3}
.vc-badge{width:17px;height:17px;border-radius:50%;display:none;align-items:center;justify-content:center;font:700 10.5px/1 system-ui,sans-serif;color:#fff}
.vc-badge[data-e]{display:flex}
.vc-badge[data-e=valido]{background:#16a34a}
.vc-badge[data-e=advertencia]{background:#f59e0b;cursor:pointer}
.vc-badge[data-e=invalido]{background:#dc2626;cursor:pointer}
.vc-badge[data-e=sincorreo]{background:#94a3b8}
.vc-badge[data-e=cargando]{background:transparent;border:2px solid #cbd5e1;border-top-color:#64748b;animation:vcGiro .8s linear infinite}
@keyframes vcGiro{to{transform:rotate(360deg)}}
/* Botones cuadrados con el estilo de los íconos del encabezado */
.vc-buzon,.vcWrap .dupBtnSol{width:24px;height:24px;border-radius:8px;padding:0;cursor:pointer;
  display:grid;place-items:center;position:relative;color:#2563eb;
  border:1.5px solid #A9C2F5;background:linear-gradient(180deg,#FFFFFF 0%,#F1F5FF 100%);
  box-shadow:inset 0 0 0 1.5px #fff,0 2px 6px -2px rgba(29,78,216,.28);
  transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease,background .18s ease}
.vc-buzon svg{width:13px;height:13px}
.vc-buzon:hover:not(:disabled),.vcWrap .dupBtnSol:hover{border-color:#5B8DEF;transform:translateY(-1px);
  box-shadow:inset 0 0 0 1.5px #fff,0 0 0 3px rgba(37,99,235,.14),0 5px 10px -4px rgba(29,78,216,.45)}
.vc-buzon:focus-visible,.vcWrap .dupBtnSol:focus-visible{outline:none;box-shadow:inset 0 0 0 1.5px #fff,0 0 0 3px rgba(37,99,235,.35)}
.vc-buzon:disabled{opacity:.45;cursor:not-allowed;color:#94a3b8;border-color:#dbe3ef;background:#f6f8fb;box-shadow:none}
/* Botón de duplicados dentro del campo Radicado: «+» centrado (dibujado con CSS) */
.vcWrap .dupBtnSol{position:absolute!important;right:5px!important;top:50%!important;left:auto!important;
  transform:translateY(-50%)!important;margin:0!important;font-size:0!important;line-height:0!important;gap:0!important;z-index:3}
.vcWrap .dupBtnSol:hover{transform:translateY(calc(-50% - 1px))!important}
.vcWrap .dupBtnSol::before,.vcWrap .dupBtnSol::after{content:"";position:absolute;left:50%;top:50%;background:currentColor;border-radius:2px;
  transform:translate(-50%,-50%)}
.vcWrap .dupBtnSol::before{width:11px;height:2.2px}
.vcWrap .dupBtnSol::after{width:2.2px;height:11px}
.vcWrap .dupBtnSol.tiene{color:#D9670E;border-color:#F3B57A;background:linear-gradient(180deg,#FFFFFF 0%,#FFF3E6 100%);
  box-shadow:inset 0 0 0 1.5px #fff,0 2px 6px -2px rgba(217,103,14,.35)}
.vcWrap .dupBtnSol.tiene:hover{border-color:#E38A3A;box-shadow:inset 0 0 0 1.5px #fff,0 0 0 3px rgba(217,103,14,.15),0 5px 10px -4px rgba(217,103,14,.5)}
.vcWrap .dupBtnSol b{position:absolute!important;top:-7px!important;right:-7px!important;left:auto!important;min-width:15px!important;height:15px!important;
  padding:0 3px!important;border-radius:99px!important;display:inline-flex!important;align-items:center;justify-content:center;
  background:#C8102E!important;color:#fff!important;font:800 9px/1 "Segoe UI",system-ui,sans-serif!important;box-shadow:0 0 0 1.5px #fff}
.vcWrap .dupBtnSol b span{color:#fff;font-size:9px!important;line-height:1}
html[data-theme="dark"] .vc-buzon,html[data-theme="dark"] .vcWrap .dupBtnSol{background:linear-gradient(180deg,#1E2A3D 0%,#172131 100%);
  border-color:#3B5B95;color:#8DB4FF;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.04)}
html[data-theme="dark"] .vcWrap .dupBtnSol.tiene{border-color:#8A5A2B;color:#FFB36B}
html[data-theme="dark"] .vcWrap .dupBtnSol b{box-shadow:0 0 0 1.5px #172131}
.vc-tip{position:fixed;width:max-content;max-width:290px;background:#1e293b;color:#f8fafc;font:12px/1.4 "Segoe UI",system-ui,sans-serif;padding:7px 10px;border-radius:7px;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:9800;display:none}
.vc-tip.ver{display:block}
.vc-tip b{color:#fde68a;cursor:pointer;text-decoration:underline}
.vc-aviso{position:fixed;bottom:22px;left:50%;transform:translate(-50%,10px);background:#1e293b;color:#fff;font:13px "Segoe UI",system-ui,sans-serif;padding:10px 16px;border-radius:9px;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:9900;opacity:0;transition:.25s;pointer-events:none}
.vc-aviso.ver{opacity:1;transform:translate(-50%,0)}.vc-aviso b{color:#fde68a}
@media (prefers-reduced-motion:reduce){.vc-buzon,.vcWrap .dupBtnSol{transition:none}}
`;
function inyectaCss(){ if(document.getElementById('vcCss')) return; const st=document.createElement('style'); st.id='vcCss'; st.textContent=CSS; document.head.appendChild(st); }
const escH=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
/* Envuelve el input en un contenedor relativo (una sola vez). */
function envolver(input,clase){
  let w=input.parentElement;
  if(!w||!w.classList.contains('vcWrap')){ w=document.createElement('span'); w.className='vcWrap'; input.parentNode.insertBefore(w,input); w.appendChild(input); }
  w.classList.add(clase); return w;
}
function buscaCampoCorreo(){
  const raiz=document.getElementById('panelSolicitante')||document;
  return raiz.querySelector('input[data-k="correo"]')||raiz.querySelector('input[data-k*="correo" i]')||
    raiz.querySelector('input[type="email"]')||[...raiz.querySelectorAll('input')].find(i=>/correo|e-?mail/i.test((i.placeholder||'')+(i.id||'')+(i.name||'')));
}
/* Mueve el botón de duplicados dentro del campo Radicado. */
function montarDuplicados(){
  const raiz=document.getElementById('panelSolicitante')||document;
  const inp=raiz.querySelector('input[data-k="radicado_entrada"]'), btn=raiz.querySelector('.dupBtnSol');
  if(!inp||!btn) return false;
  const w=envolver(inp,'vcRad');
  if(btn.parentElement!==w) w.appendChild(btn);
  btn.setAttribute('aria-label','Radicados duplicados del asunto'); btn.title='Radicados duplicados que se agregan al asunto del documento';
  return true;
}
function montar(campo){
  if(!campo||campo.dataset.vcMontado) return; campo.dataset.vcMontado='1';
  const host=envolver(campo,'vcCorreo'); campo.setAttribute('autocomplete','off');
  const ctl=document.createElement('span'); ctl.className='vcCtl';
  ctl.innerHTML='<span class="vc-badge" role="img"></span><button type="button" class="vc-buzon" disabled aria-label="Verificar buzón">'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/><path d="M16 3h5v5M21 3l-6 6" stroke-width="1.8"/></svg></button>';
  host.appendChild(ctl);
  const badge=ctl.querySelector('.vc-badge'), boton=ctl.querySelector('.vc-buzon');
  const tip=document.createElement('div'); tip.className='vc-tip'; tip.setAttribute('role','tooltip'); document.body.appendChild(tip);
  let aviso=document.querySelector('.vc-aviso'); if(!aviso){ aviso=document.createElement('div'); aviso.className='vc-aviso'; aviso.setAttribute('role','status'); document.body.appendChild(aviso); }
  let tipTxt='', tTip=0;
  const verTip=(el)=>{ if(!tip.innerHTML) return; clearTimeout(tTip); tip.classList.add('ver');
    const r=el.getBoundingClientRect(), w=tip.offsetWidth; tip.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'; tip.style.top=(r.bottom+6)+'px'; };
  const ocultaTip=()=>{ tTip=setTimeout(()=>tip.classList.remove('ver'),180); };
  badge.addEventListener('mouseenter',()=>verTip(badge)); badge.addEventListener('mouseleave',ocultaTip);
  boton.addEventListener('mouseenter',()=>{ tip.textContent=boton.dataset.tip||''; verTip(boton); }); boton.addEventListener('mouseleave',()=>{ ocultaTip(); setTimeout(()=>{ tip.innerHTML=tipTxt; },200); });
  tip.addEventListener('mouseenter',()=>clearTimeout(tTip)); tip.addEventListener('mouseleave',ocultaTip);
  window.addEventListener('scroll',()=>tip.classList.remove('ver'),true);
  const mostrarAviso=html=>{ aviso.innerHTML=html; aviso.classList.add('ver'); clearTimeout(aviso._t); aviso._t=setTimeout(()=>aviso.classList.remove('ver'),4500); };
  async function copiar(t){ try{ await navigator.clipboard.writeText(t); return true; }catch{ try{ const a=document.createElement('textarea'); a.value=t; a.style.cssText='position:fixed;opacity:0'; document.body.appendChild(a); a.select(); const ok=document.execCommand('copy'); a.remove(); return ok; }catch{ return false; } } }
  const habilitar=(on,t)=>{ boton.disabled=!on; boton.dataset.tip=t; boton.title=t; };
  habilitar(false,'Escriba un correo válido para verificar el buzón');
  let ultimo='\u0000', timer=0;
  async function revisar(){
    const valor=campo.value; if(valor===ultimo) return; ultimo=valor;
    campo.classList.remove('vc-invalido','vc-advertencia'); badge.onclick=null;
    if(!valor.trim()){ badge.removeAttribute('data-e'); badge.textContent=''; tip.innerHTML=tipTxt=''; delete campo.dataset.vcEstado; habilitar(false,'Escriba un correo válido para verificar el buzón'); return; }
    badge.dataset.e='cargando'; badge.textContent=''; habilitar(false,'Validando correo…');
    const r=await validarCorreo(valor);
    if(campo.value!==valor) return;
    badge.dataset.e=r.estado; badge.textContent=ICONO[r.estado]||''; badge.setAttribute('aria-label',r.mensaje||'');
    if(r.estado==='invalido'||r.estado==='advertencia') campo.classList.add('vc-'+r.estado);
    campo.dataset.vcEstado=r.estado;
    tip.textContent=r.mensaje||'';
    if(r.sugerencia){
      tip.textContent=''; tip.append((r.mensaje||'').replace(/¿Quiso decir.*$/,''),' ');
      const b=document.createElement('b'); b.textContent='Usar '+r.sugerencia;
      const aplicar=()=>{ campo.value=r.sugerencia; campo.dispatchEvent(new Event('input',{bubbles:true})); campo.dispatchEvent(new Event('change',{bubbles:true})); tip.classList.remove('ver'); revisar(); };
      b.onclick=aplicar; badge.onclick=aplicar; tip.append(b);
    }
    tipTxt=tip.innerHTML;
    const ok=r.estado==='valido'||(r.estado==='advertencia'&&!r.sugerencia);
    habilitar(ok, ok?'Verificar buzón en Site24x7 (copia el correo y abre la página)':
      r.estado==='sincorreo'?'El usuario no registró correo':'Corrija el correo antes de verificar el buzón');
  }
  boton.addEventListener('click',async()=>{
    const c=normalizar(campo.value); if(!c) return;
    const ok=await copiar(c); window.open(URL_VERIFICADOR,'_blank','noopener');
    mostrarAviso(ok?'Correo <b>'+escH(c)+'</b> copiado. Péguelo en Site24x7 con <b>Ctrl+V</b>.':'No se pudo copiar automáticamente. Copie el correo: <b>'+escH(c)+'</b>');
  });
  campo.addEventListener('input',()=>{ clearTimeout(timer); timer=setTimeout(revisar,500); });
  campo.addEventListener('blur',revisar);
  setInterval(()=>{ if(campo.value!==ultimo) revisar(); },700);   /* valores cargados desde SAC TRÁMITE */
  revisar();
}
function iniciar(){
  inyectaCss();
  let correoOk=false, dupOk=false;
  const intenta=()=>{ if(!correoOk){ const c=buscaCampoCorreo(); if(c){ montar(c); correoOk=true; } }
    dupOk=montarDuplicados()||dupOk; return correoOk&&dupOk; };
  intenta();
  /* Sigue vigilando: si el módulo vuelve a pintar el botón de duplicados, se reubica al instante. */
  const obs=new MutationObserver(()=>{ const b=document.querySelector('.dupBtnSol'); if(b&&!b.parentElement.classList.contains('vcWrap')) montarDuplicados(); if(!correoOk) intenta(); });
  obs.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar); else iniciar();
export { validarCorreo, validarCorreoRapido };
