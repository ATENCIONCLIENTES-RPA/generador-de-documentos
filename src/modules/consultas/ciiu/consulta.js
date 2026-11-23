/* Lógica de búsqueda, índice, vistas y capa de interacción (sin cambios de lógica). */
import DATA from './data/ciiu.json';

export function initCiiu(rootEl) {
'use strict';
/* ==========================================================================
   LÓGICA (búsqueda, índice y vistas) + capa de interacción
   ========================================================================== */
const root = rootEl || document.getElementById('viewCiiu') || document;
const $ = s => root.querySelector(s);
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => mq.matches;
const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const MAX = 200;

const $q = $('#qCiiu') || $('#q'), $rlist = $('#rlist'), $det = $('#detail'), $dock = $('#dock'), $stage = $('#stage');
const $cnt = $('#cnt'), $csub = $('#csub'), $live = $('#live');

/* ---------- Datos e índice ---------- */
let BY = {};
try {
  if (!Array.isArray(DATA) || !DATA.length) throw new Error('vacío');
  DATA.forEach(r => BY[r.c] = r);
} catch (e) {
  $det.innerHTML = `<div class="err" role="alert"><b>No se pudo cargar la base de datos.</b> Verifica que el archivo esté completo e intenta abrirlo de nuevo.</div>`;
  throw e;
}
const norm = s => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const esc = s => (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const STOP = new Set(['de','la','el','los','las','y','e','en','del','al','a','o','u','con','por','para','sus','su','un','una']);
DATA.forEach(r => {
  r._d = norm(r.d); r._p = norm(r.p.join(' \n ')); r._n = norm(r.n.join(' \n '));
  r._w = new Set((r._d + ' ' + r._p).split(/[^a-z0-9ñ]+/).filter(w => w.length > 3));
  r._dw = new Set(r._d.split(/[^a-z0-9ñ]+/).filter(w => w.length > 3));
});

/* ---------- Filtros ---------- */
const FLT = { all: () => true, b: r => r.b, n: r => !r.b, rev: r => r.b && r.r === 'SI', h6: r => r.b && r.h === 'SI' };
const FLT_LABEL = { all: 'Todos', b: 'Beneficiarios', n: 'No beneficiarios', rev: 'Requieren revisión', h6: 'Exigen Hoja 6 RUT' };
const COUNT = {}; Object.keys(FLT).forEach(k => COUNT[k] = DATA.filter(FLT[k]).length);
let flt = 'all', browse = false;

function lev1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
}
function fuzzyIn(tok, set) {
  if (tok.length < 5) return false;
  for (const w of set) { if (lev1(tok, w.slice(0, tok.length)) || lev1(tok, w)) return true; }
  return false;
}
function search(qraw) {
  const q = norm(qraw).trim();
  if (!q) {
    if (flt === 'all' && !browse) return { list: [], toks: [] };
    return { list: DATA.filter(FLT[flt]).map(r => ({ r, s: 0, f: true, src: r.b ? `Revisión ${r.r === 'SI' ? 'sí' : 'no'} · Hoja 6 ${r.h === 'SI' ? 'sí' : 'no'}` : 'Fuera del Decreto 2860' })), toks: [] };
  }
  const digits = q.replace(/\s/g, '');
  if (/^\d+$/.test(digits)) {
    let list = DATA.filter(r => r.c.startsWith(digits) || (digits.length <= 4 && r.c === digits.padStart(4, '0')))
      .map(r => ({ r, s: r.c === digits.padStart(4, '0') ? 1000 : 500, src: 'Código' }));
    list.sort((a, b) => b.s - a.s || a.r.c.localeCompare(b.r.c));
    list = list.filter(x => FLT[flt](x.r));
    return { list, toks: [], exact: digits.length >= 4 ? list.find(x => x.r.c === digits.padStart(4, '0')) : undefined };
  }
  const toks = q.split(/\s+/).filter(t => t && !STOP.has(t));
  if (!toks.length) return { list: [], toks: [] };
  const out = [];
  for (const r of DATA) {
    if (!FLT[flt](r)) continue;
    let s = 0, inD = 0, inP = 0, inN = 0, ok = true;
    for (const t of toks) {
      const d = r._d.includes(t), p = r._p.includes(t), n = r._n.includes(t);
      if (d) { s += 120; inD++; if (r._d.startsWith(t)) s += 40; }
      if (p) { s += 25; inP++; }
      if (n) { s += 4; inN++; }
      if (!d && !p && !n) { if (fuzzyIn(t, r._dw)) { s += 100; inD++; } else if (fuzzyIn(t, r._w)) { s += 15; } else { ok = false; break; } }
    }
    if (!ok) continue;
    if (inD === toks.length) s += 300;
    const src = [];
    if (inD) src.push('Descripción'); if (inP) src.push('Aplica para'); if (inN) src.push('No aplica para');
    if (!src.length) src.push('Coincidencia aproximada');
    out.push({ r, s, src: src.join(' · '), onlyNeg: !inD && !inP && inN });
  }
  out.sort((a, b) => b.s - a.s || a.r.c.localeCompare(b.r.c));
  return { list: out, toks };
}
function hl(text, toks) {
  let h = esc(text);
  if (!toks || !toks.length) return h;
  const nt = norm(h), ranges = [];
  toks.forEach(t => { if (t.length < 2) return; let i = 0; while ((i = nt.indexOf(t, i)) !== -1) { ranges.push([i, i + t.length]); i += t.length; } });
  if (!ranges.length) return h;
  ranges.sort((a, b) => a[0] - b[0]);
  const m = [];
  for (const rg of ranges) { if (m.length && rg[0] <= m[m.length - 1][1]) m[m.length - 1][1] = Math.max(m[m.length - 1][1], rg[1]); else m.push(rg.slice()); }
  let o = '', last = 0;
  for (const [a, b] of m) { if (/[&;]/.test(h.slice(a, b))) continue; o += h.slice(last, a) + '<mark>' + h.slice(a, b) + '</mark>'; last = b; }
  return o + h.slice(last);
}
function xref(html, self) {
  return html.replace(/(^|[^\d<>\/="])(\d{4})(?!\d)/g, (m, pre, c) => (BY[c] && c !== self) ? `${pre}<a class="xref" data-go="${c}" title="${esc(BY[c].d)}">${c}</a>` : m);
}

/* ---------- Utilidades de animación ---------- */
function countUp(el, to, dur = 1000) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (reduced() || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  (function f(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
let toastT;
function toast(msg) {
  const t = $('#toast'); t.innerHTML = ic('check') + esc(msg); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}
function rollCode(el, code) {
  el.innerHTML = [...code].map((ch, i) => /\d/.test(ch)
    ? `<span class="dg" style="--i:${i}" aria-hidden="true"><span class="col" data-d="${ch}">${[0,1,2,3,4,5,6,7,8,9].map(n => `<i>${n}</i>`).join('')}</span></span>`
    : `<span class="dg" aria-hidden="true"><span class="col"><i>${esc(ch)}</i></span></span>`).join('');
  const go = () => el.querySelectorAll('.col[data-d]').forEach(c => c.style.setProperty('--to', c.dataset.d));
  if (reduced()) go(); else requestAnimationFrame(() => requestAnimationFrame(go));
}
function focusList() { if (matchMedia('(max-width:1023px)').matches) $('.list-panel').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); }

/* ---------- Filtros UI ---------- */
const $fwrap = $('#fwrap'), $fbtn = $('#fbtn'), $fchips = $('#fchips');
$fchips.innerHTML = ['all', 'b', 'n', 'rev', 'h6'].map((k, i) =>
  `<button type="button" class="chip${(k === 'n' || k === 'rev' || k === 'h6') ? ' neg' : (k === 'b' ? ' yes' : '')}" data-f="${k}" data-ripple style="--i:${i}">${FLT_LABEL[k]}<i>${COUNT[k]}</i></button>`).join('');
function setFilterOpen(o) { $fwrap.classList.toggle('open', o); $fbtn.setAttribute('aria-expanded', o); }
function syncFilterUI(open) {
  $fchips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.f === flt && (flt !== 'all' || browse)));
  $fbtn.classList.toggle('on', flt !== 'all');
  if (open) setFilterOpen(true);
}
function applyFilter(k) {
  if (k === 'all') { browse = flt === 'all' ? !browse : true; flt = 'all'; }
  else { flt = flt === k ? 'all' : k; browse = false; }
  syncFilterUI(false); run();
  if (browse && flt === 'all') toast(`Toda la base · ${COUNT.all} códigos`);
  else if (flt !== 'all') toast(`${FLT_LABEL[flt]} · ${COUNT[flt]} códigos`);
}
$fbtn.onclick = () => setFilterOpen(!$fwrap.classList.contains('open'));

/* ---------- Estado de la vista ---------- */
let cur = { list: [], toks: [] }, act = 0, hist = [], openCode = null, lastToks = [], stageMode = null, verified = false, vt;
const noQuery = () => !$q.value.trim() && flt === 'all' && !browse;

function renderList() {
  const n = cur.list.length;
  $dock.classList.toggle('has', !!$q.value);
  if (noQuery()) {
    $rlist.innerHTML = `<div class="empty"><div class="etile">${ic('search')}</div><h4>Aún no hay búsqueda</h4><p>Escribe un código o una palabra de la actividad para ver coincidencias aquí.</p></div>`;
    setCount(0, 'Selecciona la actividad económica principal'); return;
  }
  if (!n) {
    $rlist.innerHTML = `<div class="empty bad"><div class="etile">${ic('search')}</div><h4>Sin coincidencias</h4>
      <p>No encontramos resultados para «<b>${esc($q.value)}</b>»${flt !== 'all' ? ` con el filtro «${FLT_LABEL[flt]}»` : ''}. Prueba otra palabra o el código de 4 dígitos.</p>
      <div class="egs light-rip">${flt !== 'all' ? `<button type="button" class="eg r" data-nof="1" data-ripple>Quitar filtro</button>` : ''}${['1523', 'café', 'confección'].map(x => `<button type="button" class="eg" data-q="${x}" data-ripple>${x}</button>`).join('')}</div></div>`;
    setCount(0, 'Sin resultados'); return;
  }
  const shown = cur.list.slice(0, MAX);
  $rlist.innerHTML = shown.map((x, i) => `<div class="ritem${x.r.b ? '' : ' neg'}${i === act ? ' act' : ''}" role="option" id="opt${i}" data-i="${i}" aria-selected="${i === act}" style="--d:${Math.min(i, 10) * 30}ms">
      <div class="code">${x.r.c}</div>
      <div><div class="rdesc">${hl(x.r.d, cur.toks)}</div>
      <div class="rmeta"><span class="pill ${x.r.b ? 'ok' : 'no'}">${ic(x.r.b ? 'check' : 'x')}${x.r.b ? 'Beneficiario' : 'No beneficiario'}</span>
      <span class="rsrc">${x.f ? x.src : (x.onlyNeg ? 'Aparece en lo que <b>NO aplica</b>' : 'Coincide en: ' + x.src)}</span></div></div></div>`).join('')
    + (n > MAX ? `<div class="more">Se muestran los ${MAX} más relevantes de ${n}. Afina tu búsqueda para ver el resto.</div>` : '');
  setCount(n, `${n} resultado${n === 1 ? '' : 's'}${flt !== 'all' ? ' · ' + FLT_LABEL[flt] : ''}`);
  $rlist.scrollTop = 0;
  $rlist.setAttribute('aria-activedescendant', 'opt' + act);
}
function setCount(n, sub) {
  $cnt.classList.toggle('zero', !n); countUp($cnt, n, 500); $csub.textContent = sub;
  $live.textContent = n ? `${n} resultados disponibles` : sub;
}
function setAct(i, scroll) {
  const items = $rlist.querySelectorAll('.ritem'); if (!items.length) return;
  act = i;
  items.forEach((el, k) => { el.classList.toggle('act', k === i); el.setAttribute('aria-selected', k === i); });
  $rlist.setAttribute('aria-activedescendant', 'opt' + i);
  if (scroll) {
    const it = items[i], top = it.offsetTop, bot = top + it.offsetHeight;
    if (top < $rlist.scrollTop) $rlist.scrollTop = top - 8;
    else if (bot > $rlist.scrollTop + $rlist.clientHeight) $rlist.scrollTop = bot - $rlist.clientHeight + 8;
  }
}

/* ---------- Progreso (stepper) ---------- */
function updateStepper() {
  const s1 = (!noQuery()) ? 'done' : 'active';
  const s2 = openCode ? 'done' : (s1 === 'done' ? 'active' : 'pending');
  const s3 = openCode ? (verified ? 'done' : 'active') : 'pending';
  const T = { pending: 'PENDIENTE', active: 'EN CURSO', done: 'LISTO' };
  [s1, s2, s3].forEach((st, i) => {
    const li = $('#stepper').children[i]; li.className = st; li.querySelector('em').textContent = T[st];
  });
}

/* ---------- Escenario: bienvenida / selección ---------- */
const PAPER = `<svg class="paper-svg" viewBox="0 0 120 156" aria-hidden="true"><defs><linearGradient id="pp" x1="0" y1="0" x2="1" y2="1"><stop class="pp-a" offset="0"/><stop class="pp-b" offset="1"/></linearGradient></defs>
  <path d="M10 14a10 10 0 0 1 10-10h58l32 32v106a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10z" class="pp-edge" fill="url(#pp)" stroke-width="3"/>
  <path class="pp-fold" d="M78 4v22a10 10 0 0 0 10 10h22" stroke-width="3" stroke-linejoin="round"/>
  <rect class="pp-line" x="26" y="52" width="68" height="7" rx="3.5"/><rect class="pp-line" x="26" y="68" width="68" height="7" rx="3.5"/><rect class="pp-line" x="26" y="84" width="44" height="7" rx="3.5"/>
  <path class="tick" pathLength="1" d="M34 118l14 14 32-34" fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function stageHTML(mode, n) {
  const none = mode === 'pick' && !n;
  const eyebrow = mode === 'idle' ? 'Esperando búsqueda' : (none ? 'Sin coincidencias' : `${n} coincidencia${n === 1 ? '' : 's'}`);
  const title = mode === 'idle' ? `Consulta si tu actividad es <span class="grad">beneficiaria</span>`
    : (none ? `No encontramos esa <span class="grad">actividad</span>` : `Elige una <span class="grad">actividad</span> de la lista`);
  const lead = mode === 'idle' ? 'Busca por código o por palabras de la actividad económica. Al abrir un resultado verás si es beneficiario del descuento, si requiere revisión y si debe presentar la Hoja 6 del RUT.'
    : (none ? 'Prueba con otra palabra, revisa la ortografía o usa el código de 4 dígitos.' : 'Selecciona un resultado en el panel izquierdo (o usa ↑ ↓ y Enter) para ver el detalle completo.');
  return `<div class="wel spot light-rip" id="wel">
    <div class="ill" id="ill">
      <div class="halo"></div>
      <div class="layer l-paper"><div>${PAPER}</div></div>
      <div class="layer l-doc"><div class="badge-ico">${ic('doccheck')}</div></div>
      <div class="layer l-mag"><div class="badge-ico r">${ic('search')}</div></div>
      <div class="ill-cap">CONSULTA CIIU · DECRETO 2860</div>
    </div>
    <div>
      <span class="eyebrow${none ? ' r' : ''}"><span class="dot"></span><span id="eb">${eyebrow}</span></span>
      <h2>${title}</h2>
      <p class="lead">${lead}</p>
      <div class="rows">
        <button type="button" class="row first" data-q="1523" data-ripple style="--i:0"><span class="rt">${ic('hash')}</span><span><strong>Por código</strong><span class="s">Escribe los 4 dígitos y el resultado se abre al instante.</span></span><span class="tag">Ej. 1523</span></button>
        <button type="button" class="row" data-q="panadería" data-ripple style="--i:1"><span class="rt">${ic('text')}</span><span><strong>Por palabras</strong><span class="s">Sin tildes, sin mayúsculas y tolera un error de digitación.</span></span><span class="tag">Ej. panadería</span></button>
        <div class="row" style="--i:2"><span class="rt">${ic('kbd')}</span><span><strong>Con el teclado</strong><span class="s"><kbd>/</kbd> buscar · <kbd>↑</kbd><kbd>↓</kbd> moverte · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> limpiar</span></span><span class="tag">Atajos</span></div>
      </div>
    </div></div>`;
}
function showStage(mode, n) {
  if (stageMode === mode && mode === 'idle') return;
  if (stageMode === 'pick' && mode === 'pick' && n && $('#eb') && $('.wel .eyebrow.r') === null) { $('#eb').textContent = `${n} coincidencia${n === 1 ? '' : 's'}`; return; }
  stageMode = mode;
  $det.innerHTML = stageHTML(mode, n);
  if (!reduced()) $det.firstElementChild.animate([{ opacity: 0, transform: 'translateY(14px) scale(.985)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

/* ---------- Detalle ---------- */
function openRec(code, push, origin) {
  const r = BY[code]; if (!r) return;
  if (openCode === code && stageMode === 'detail') return;
  if (push && openCode && openCode !== code) hist.push(openCode);
  openCode = code; stageMode = 'detail';
  verified = false; clearTimeout(vt); vt = setTimeout(() => { verified = true; updateStepper(); }, reduced() ? 0 : 900);
  const toks = lastToks, k = r.k || {};
  const crumbs = [];
  if (k.s) crumbs.push(`<span class="crumb" style="--i:0">${ic('layers')}<span><b>${esc(k.s[0])}</b> · ${esc(k.s[1])}</span></span>`);
  if (k.v) crumbs.push(`<span class="crumb" style="--i:1">${ic('layers')}<span><b>División ${esc(k.v[0])}</b>${k.v[1] ? ' · ' + esc(k.v[1]) : ''}</span></span>`);
  if (k.g) crumbs.push(`<span class="crumb" style="--i:2">${ic('layers')}<span><b>Grupo ${esc(k.g[0])}</b>${k.g[1] ? ' · ' + esc(k.g[1]) : ''}</span></span>`);
  const list = arr => arr.length ? `<ul class="items">${arr.map((l, i) => `<li style="--n:${Math.min(i, 12)}">${xref(esc(l), r.c)}</li>`).join('')}</ul>` : `<span class="na">Sin información en la base.</span>`;
  const back = hist.length ? `<button class="back" id="back" type="button" data-ripple>${ic('back')}Volver a ${hist[hist.length - 1]}</button>` : '';
  const flag = (icon, t, sub, v, i) => `<div class="flag ${v === 'SI' ? 'yes' : (v === 'NO' ? 'no' : '')}" style="--i:${i}"><span class="ft">${ic(icon)}</span><span class="fl"><b>${t}</b>${sub}</span><span class="fv">${v === 'SI' ? ic('check') + 'SÍ' : (v === 'NO' ? ic('x') + 'NO' : '—')}</span></div>`;
  const seal = r.b
    ? `<svg class="seal" viewBox="0 0 96 96" aria-hidden="true"><circle class="fillc" cx="48" cy="48" r="42"/><circle class="ring" pathLength="1" cx="48" cy="48" r="42"/><path class="mark" pathLength="1" d="M30 50l12 12 24-26"/></svg>`
    : `<svg class="seal" viewBox="0 0 96 96" aria-hidden="true"><circle class="fillc" cx="48" cy="48" r="42"/><circle class="ring" pathLength="1" cx="48" cy="48" r="42"/><path class="mark" pathLength="1" d="M34 34l28 28M62 34L34 62"/></svg>`;
  $det.innerHTML = `<div class="view" id="view">
    ${back ? `<div class="navrow">${back}</div>` : ''}
    <article class="hero spot light-rip ${r.b ? 'is-ok' : 'is-no'}">
      <div>
        <span class="eyebrow${r.b ? '' : ' r'}"><span class="dot"></span>Código CIIU</span>
        <div class="bigcode" id="bigcode" role="img" aria-label="Código CIIU ${r.c}"></div>
        <h2 class="hdesc">${esc(r.d)}</h2>
        <div class="crumbs">${crumbs.join('')}</div>
        ${k.o ? `<div class="note">${ic('pin')}<span>${esc(k.o)}</span></div>` : ''}
      </div>
      <aside class="verdict" aria-label="Resultado">
        ${seal}
        <div class="vlabel">${r.b ? 'Beneficiario del descuento' : 'No es beneficiario'}</div>
        <div class="vsub">Decreto 2860 de diciembre de 2013</div>
        ${r.b ? `<div class="flags">${flag('clip', 'Requiere revisión', 'Validación previa', r.r, 0)}${flag('doc', 'Hoja 6 del RUT', 'Presentación del soporte', r.h, 1)}</div>` : ''}
      </aside>
    </article>
    ${(r.b || r.p.length || r.n.length) ? `<div class="cols">
      <section class="box pos"><div class="bhead"><span class="bt">${ic('check')}</span><h3>Aplica para</h3><span class="cntb" data-to="${r.p.length}">0</span></div><div class="bbody">${list(r.p)}</div></section>
      <section class="box neg"><div class="bhead"><span class="bt">${ic('x')}</span><h3>No aplica para</h3><span class="cntb" data-to="${r.n.length}">0</span></div><div class="bbody">${list(r.n)}</div></section>
    </div>` : ''}
  </div>`;
  rollCode($('#bigcode'), r.c);
  $det.querySelectorAll('.cntb[data-to]').forEach(el => countUp(el, +el.dataset.to, 800));
  const b = $('#back'); if (b) b.onclick = () => { const c = hist.pop(); openRec(c, false); };
  // Transición: revelado circular desde el punto de interacción
  if (!reduced()) {
    const rc = $det.getBoundingClientRect();
    const o = origin || { x: rc.left + rc.width * .3, y: rc.top + 90 };
    const x = Math.max(0, o.x - rc.left), y = Math.max(0, o.y - rc.top), R = Math.hypot(Math.max(x, rc.width - x), Math.max(y, rc.height - y)) + 40;
    $('#view').animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] }, { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  const idx = cur.list.findIndex(x => x.r.c === code); if (idx >= 0) setAct(idx, true);
  updateStepper();
  if (matchMedia('(max-width:1023px)').matches) $stage.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
}

/* ---------- Ciclo principal ---------- */
let tmr, busyT;
function setBusy(on) { $dock.classList.toggle('busy', on); document.body.classList.toggle('busy', on); }
function run() {
  cur = search($q.value); act = 0; lastToks = cur.toks;
  renderList();
  if (noQuery()) { openCode = null; hist = []; showStage('idle'); }
  else if (cur.exact) { hist = []; openRec(cur.exact.r.c, false); }
  else if ($q.value.trim() && cur.list.length === 1) { hist = []; openRec(cur.list[0].r.c, false); }
  else { openCode = null; hist = []; showStage('pick', cur.list.length); }
  updateStepper();
  clearTimeout(busyT); busyT = setTimeout(() => setBusy(false), reduced() ? 0 : 380);
}
function clearAll() { $q.value = ''; flt = 'all'; browse = false; syncFilterUI(false); run(); }

$q.addEventListener('input', () => { setBusy(true); clearTimeout(tmr); tmr = setTimeout(run, 130); });
$q.addEventListener('keydown', e => {
  const n = Math.min(cur.list.length, MAX);
  if (e.key === 'ArrowDown' && n) { e.preventDefault(); setAct((act + 1) % n, true); }
  else if (e.key === 'ArrowUp' && n) { e.preventDefault(); setAct((act - 1 + n) % n, true); }
  else if (e.key === 'Enter' && n) {
    hist = []; const el = $rlist.querySelector('.ritem.act'), rc = el && el.getBoundingClientRect();
    openRec(cur.list[act].r.c, false, rc ? { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 } : null);
  }
  else if (e.key === 'Escape') { clearAll(); }
});
$('#clear').onclick = () => { clearAll(); $q.focus(); };
document.addEventListener('keydown', e => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { e.preventDefault(); $q.focus(); $q.select(); }
});

/* ---------- Clics delegados ---------- */
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { openRec(g.dataset.go, true, { x: e.clientX, y: e.clientY }); return; }
  const it = e.target.closest('.ritem');
  if (it) { hist = []; setAct(+it.dataset.i, false); openRec(cur.list[+it.dataset.i].r.c, false, { x: e.clientX, y: e.clientY }); return; }
  const f = e.target.closest('.chip[data-f]');
  if (f) { applyFilter(f.dataset.f); return; }
  const qd = e.target.closest('[data-q]');
  if (qd) { $q.value = qd.dataset.q; setBusy(true); run(); $q.focus(); return; }
  if (e.target.closest('[data-nof]')) { flt = 'all'; browse = false; syncFilterUI(false); run(); }
});

/* ---------- Capa de interacción: ripple, luz de cursor y paralaje ---------- */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-ripple]'); if (!b || reduced()) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span');
  s.className = 'rip'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
  b.style.overflow = 'hidden'; b.appendChild(s); s.addEventListener('animationend', () => s.remove());
});
let raf = 0, lastEv = null;
document.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  lastEv = e; if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0; const ev = lastEv, t = ev.target; if (!t.closest) return;
    const sp = t.closest('.spot');
    if (sp) { const r = sp.getBoundingClientRect(); sp.style.setProperty('--sx', (ev.clientX - r.left) + 'px'); sp.style.setProperty('--sy', (ev.clientY - r.top) + 'px'); }
    if (reduced()) return;
    const il = t.closest('.wel');
    if (il) { const r = il.getBoundingClientRect(); const ill = il.querySelector('.ill'); if (ill) { ill.style.setProperty('--px', ((ev.clientX - r.left) / r.width - .5).toFixed(3)); ill.style.setProperty('--py', ((ev.clientY - r.top) / r.height - .5).toFixed(3)); } }
  });
});

/* ---------- Dock pegajoso: sombra al fijarse + alto dinámico ---------- */
const dw = $('#dockwrap'), sentinel = document.createElement('div');
sentinel.style.cssText = 'height:1px;margin-top:-1px'; dw.parentNode.insertBefore(sentinel, dw);
if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => dw.classList.toggle('stuck', !en.isIntersecting), { rootMargin: '-12px 0px 0px 0px' }).observe(sentinel);
if ('ResizeObserver' in window) {
  new ResizeObserver(() => document.documentElement.style.setProperty('--dockH', dw.offsetHeight + 'px')).observe(dw);
  new ResizeObserver(() => document.documentElement.style.setProperty('--stageH', $stage.offsetHeight + 'px')).observe($stage);
}

/* ---------- Placeholder que "escribe" ejemplos ---------- */
const PH0 = $q.placeholder, EX = ['1523', 'panadería', 'confección de prendas', 'café', 'calzado', '2011', 'plásticos', 'cemento'];
let exI = 0, typeT;
function typeEx() {
  clearTimeout(typeT);
  if (reduced() || document.activeElement === $q || $q.value) { $q.placeholder = PH0; typeT = setTimeout(typeEx, 2000); return; }
  const t = EX[exI++ % EX.length]; let n = 0;
  (function step() {
    if (document.activeElement === $q || $q.value) { $q.placeholder = PH0; typeT = setTimeout(typeEx, 2000); return; }
    if (n <= t.length) { $q.placeholder = 'Busca por código o actividad · ej. ' + t.slice(0, n) + (n % 2 ? '▏' : ' '); n++; typeT = setTimeout(step, 75); }
    else typeT = setTimeout(typeEx, 1900);
  })();
}
$q.addEventListener('focus', () => { $q.placeholder = PH0; });
$q.addEventListener('blur', () => { clearTimeout(typeT); typeT = setTimeout(typeEx, 800); });

/* ---------- Arranque ---------- */
syncFilterUI(false); run(); typeEx();
if ($q) $q.focus({ preventScroll: true });

return {
  focus: () => { if ($q) $q.focus({ preventScroll: true }); },
  clear: clearAll
};
}
