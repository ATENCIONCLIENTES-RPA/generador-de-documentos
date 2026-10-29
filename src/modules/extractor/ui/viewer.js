/* Visor «Imagen y datos detectados» (sólo lectura). */
import { $, $$, clamp, esc } from '../lib/utils.js';
import { FIELDS } from '../ocr/extract.js';
import { S } from '../state.js';
import { sourceChip, statusChip } from './invoice.js';
import { displayInput } from './ocr-flow.js';

/** Recorte en color (para la miniatura que ve el usuario). */
function cropThumb(img, r, scale = 3) {
  const c = document.createElement('canvas'); const p = 2;
  const x0 = Math.max(0, r.x0 - p), y0 = Math.max(0, r.y0 - p), w = Math.min(img.w - x0, r.w + 2 * p), h = Math.min(img.h - y0, r.h + 2 * p);
  const s = clamp(Math.round(64 / h), 1, scale);
  c.width = w * s; c.height = h * s; const x = c.getContext('2d'); x.imageSmoothingEnabled = s <= 2; x.drawImage(img.canvas, x0, y0, w, h, 0, 0, w * s, h * s);
  return c.toDataURL('image/png');
}


/* ==========================================================================
   20b. VISOR «Imagen y datos detectados» (sólo lectura)
   ========================================================================== */
const VW_COLORS = { cuenta: '#1E40AF', clase: '#D11624', dias: '#2D6FD0', consumo: '#7E0A15', cu: '#334155', total: '#A50E1B', periodo: '#3F6FC4', desde: '#5B6B86', hasta: '#C2434F' };
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
export const VW = { zoom: 1, fit: true, hl: null, open: false };
function viewerFields() {
  if (!S.val) return [];
  return FIELDS.map((f, i) => {
    const v = S.val[f.key] || {}; const inv = S.inv[f.key === 'total' ? 'cobro' : f.key];
    let value, source;
    if (f.key === 'cuenta') { value = v.value ?? v.suggest ?? null; source = value ? 'ocr' : null; }
    else { value = inv ? inv.value : null; source = inv ? inv.source : null; }
    return { n: i + 1, f, v, value, source, color: VW_COLORS[f.key] };
  });
}
export function openViewer(focusKey) {
  if (!S.img) return;
  VW.open = true; VW.fit = true; VW.hl = focusKey || null;
  $('#vwImg').src = S.img.url;
  const vf = viewerFields(); const found = vf.filter(x => x.v.valueBox).length;
  $('#vwSub').textContent = `${S.img.file.name} · ${S.img.w}×${S.img.h}px · ${S.val ? `${found} de ${FIELDS.length} datos ubicados` : 'aún sin procesar con OCR'}`;
  $('#vwAll').disabled = !(S.ocr && S.ocr.words);
  $('#vw').classList.add('on'); document.body.style.overflow = 'hidden';
  renderViewerList();
  requestAnimationFrame(() => { applyZoom(); if (focusKey) scrollToField(focusKey); });
  $('#vwClose').focus();
}
export function closeViewer() { VW.open = false; $('#vw').classList.remove('on'); document.body.style.overflow = ''; }
function fitZoom() { const st = $('#vwStage'); return clamp(Math.min((st.clientWidth - 32) / S.img.w, (st.clientHeight - 32) / S.img.h), 0.1, 4); }
function applyZoom(z) {
  if (!S.img) return;
  if (z !== undefined) { VW.zoom = clamp(z, 0.1, 6); VW.fit = false; } else if (VW.fit) VW.zoom = fitZoom();
  $('#vwImg').style.width = Math.round(S.img.w * VW.zoom) + 'px'; $('#vwImg').style.height = Math.round(S.img.h * VW.zoom) + 'px';
  $('#vwZoom').textContent = Math.round(VW.zoom * 100) + '%';
  $$('#vw .seg button').forEach(b => b.classList.toggle('on', (b.dataset.z === 'fit' && VW.fit) || (b.dataset.z === '100' && !VW.fit && Math.abs(VW.zoom - 1) < 1e-6)));
  renderViewerOverlay();
}
export function renderViewerOverlay() {
  const z = VW.zoom, svg = $('#vwSvg'); svg.setAttribute('viewBox', `0 0 ${S.img.w} ${S.img.h}`);
  const showL = $('#vwLabels').checked, showX = $('#vwCross').checked, showAll = $('#vwAll').checked;
  const pad = 2 / z; let g = '', tags = '';
  if (showAll && S.ocr) g += `<g>${S.ocr.words.map(w => `<rect class="bx-w" x="${w.x0}" y="${w.y0}" width="${w.x1 - w.x0}" height="${w.y1 - w.y0}"><title>${esc(w.text)} · ${Math.round(w.conf)}%</title></rect>`).join('')}</g>`;
  for (const it of viewerFields()) {
    const b = it.v.valueBox; if (!b) continue;
    const dim = VW.hl && VW.hl !== it.f.key ? ' dim' : '', hl = VW.hl === it.f.key ? ' hl' : '';
    const st = `--c:${it.color};--c-fill:${hexA(it.color, .12)};--c-fill-hl:${hexA(it.color, .28)}`;
    let inner = '';
    if (showL) for (const lb of it.v.labelBoxes || []) {
      inner += `<rect class="bx-l" x="${lb.x0 - pad}" y="${lb.y0 - pad}" width="${lb.x1 - lb.x0 + 2 * pad}" height="${lb.y1 - lb.y0 + 2 * pad}" rx="${2 / z}"/>`;
      const lx = (lb.x0 + lb.x1) / 2, ly = (lb.y0 + lb.y1) / 2, vx = (b.x0 + b.x1) / 2, vy = (b.y0 + b.y1) / 2;
      inner += `<line class="bx-link" x1="${lx}" y1="${ly}" x2="${vx}" y2="${vy}"/>`;
    }
    if (showX && it.v.cross && it.v.cross.box) { const c = it.v.cross.box; inner += `<rect class="bx-x" x="${c.x0 - pad}" y="${c.y0 - pad}" width="${c.x1 - c.x0 + 2 * pad}" height="${c.y1 - c.y0 + 2 * pad}" rx="${2 / z}"><title>Contraste: ${esc(it.v.cross.from)} «${esc(it.v.cross.text)}»</title></rect>`; }
    inner += `<rect class="bx-v" x="${b.x0 - 2 * pad}" y="${b.y0 - 2 * pad}" width="${b.x1 - b.x0 + 4 * pad}" height="${b.y1 - b.y0 + 4 * pad}" rx="${2 / z}"><title>${esc(it.f.label)}: ${esc(it.v.raw || '')}</title></rect>`;
    g += `<g class="fg${dim}${hl}" data-vk="${it.f.key}" style="${st}">${inner}</g>`;
    const shown = it.value !== null && it.value !== undefined ? displayInput(it.f.key, it.value) : '¿?';
    tags += `<span class="tagl${dim}" data-vk="${it.f.key}" style="--c:${it.color};background:${it.color};left:${(b.x0 - 2 * pad) * z}px;top:${(b.y0 - 2 * pad) * z - 2}px"><b>${it.n}</b>${z < 0.45 ? '' : `${esc(it.f.label)}: ${esc(shown)}`}</span>`;   // con poco zoom sólo el número
  }
  svg.innerHTML = g; $('#vwTags').innerHTML = tags;
}
export function renderViewerList() {
  const items = viewerFields();
  if (!items.length) { $('#vwList').innerHTML = `<div class="empty"><div>Pulsa «Extraer datos» para ver las áreas detectadas.</div></div>`; return; }
  $('#vwList').innerHTML = items.map(it => {
    const v = it.v, hasBox = !!v.valueBox;
    const shown = it.value !== null && it.value !== undefined ? displayInput(it.f.key, it.value) : null;
    const reads = [v.raw ? `general <code>${esc(v.raw)}</code>` : '', ...(v.reads || []).map(r => `recorte ${r.variant} <code>${esc(r.text)}</code>`)].filter(Boolean).join(' · ');
    const corrected = it.source && it.source !== 'ocr' && it.f.key !== 'cuenta';
    return `<div class="fi${VW.hl === it.f.key ? ' hl' : ''}" data-vk="${it.f.key}" style="--c:${it.color}" tabindex="0">
      <div class="t"><span class="n">${it.n}</span>${esc(it.f.label)}${it.f.cell ? ` <span class="chip ref">${it.f.cell}</span>` : ''}<span class="grow"></span>${sourceChip(it.source)}${statusChip(v.status)}</div>
      <div class="val ${shown ? '' : 'miss'}">${shown ? esc(shown) : (hasBox ? 'Sin valor válido' : 'No ubicado en la imagen')}</div>
      ${hasBox ? `<img class="crop" src="${cropThumb(S.img, { x0: v.valueBox.x0 - 6, y0: v.valueBox.y0 - 4, x1: v.valueBox.x1 + 6, y1: v.valueBox.y1 + 4, w: v.valueBox.x1 - v.valueBox.x0 + 12, h: v.valueBox.y1 - v.valueBox.y0 + 8 })}" alt="Recorte del valor">` : ''}
      <div class="rd">${v.how ? esc(v.how) + '<br>' : ''}${reads ? 'Lecturas: ' + reads + (v.votes ? ` (${esc(v.votes)} coinciden)` : '') + '<br>' : ''}${v.conf ? `Confianza ${v.conf}%<br>` : ''}${hasBox ? `Posición: x ${Math.round(v.valueBox.x0)}, y ${Math.round(v.valueBox.y0)} · ${Math.round(v.valueBox.x1 - v.valueBox.x0)}×${Math.round(v.valueBox.y1 - v.valueBox.y0)} px<br>` : ''}${corrected ? `<span class="x">Valor modificado en la app (OCR leyó «${esc(v.raw || '—')}»)</span><br>` : ''}${(v.notes || []).map(n => `<span class="${/Otras|indica|cursor|No existe/.test(n) ? 'x' : ''}">${esc(n)}</span>`).join('<br>')}${!hasBox && v.note ? esc(v.note) : ''}</div></div>`;
  }).join('');
}
function setViewerHl(key) {
  if (VW.hl === key) return; VW.hl = key;
  $$('#vwList .fi').forEach(e => e.classList.toggle('hl', e.dataset.vk === key));
  renderViewerOverlay();
}
function scrollToField(key) {
  const b = S.val && S.val[key] && S.val[key].valueBox; if (!b) return;
  const st = $('#vwStage'), wrap = $('#vwWrap');
  st.scrollTo({ left: wrap.offsetLeft + ((b.x0 + b.x1) / 2) * VW.zoom - st.clientWidth / 2, top: wrap.offsetTop + ((b.y0 + b.y1) / 2) * VW.zoom - st.clientHeight / 2, behavior: 'smooth' });
}
export function bindViewer() {
  $('#btnViewer').onclick = () => openViewer();
  $('#prev').addEventListener('click', () => openViewer());
  $('#prev').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(); } });
  $('#vwClose').onclick = closeViewer;
  $('#vw').addEventListener('click', e => { if (e.target.id === 'vw') closeViewer(); });
  document.addEventListener('keydown', e => {
    if (!VW.open) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeViewer(); }
    if (e.key === '+' || e.key === '=') applyZoom(VW.zoom * 1.25);
    if (e.key === '-') applyZoom(VW.zoom / 1.25);
    if (e.key === '0') { VW.fit = true; applyZoom(); }
  });
  $$('#vw .seg button').forEach(b => b.onclick = () => {
    const z = b.dataset.z;
    if (z === 'fit') { VW.fit = true; applyZoom(); } else if (z === '100') applyZoom(1); else applyZoom(VW.zoom * (z === 'in' ? 1.25 : 0.8));
    if (VW.hl) requestAnimationFrame(() => scrollToField(VW.hl));   // mantener visible el dato seleccionado
  });
  ['#vwLabels', '#vwCross', '#vwAll'].forEach(id => $(id).onchange = renderViewerOverlay);
  const st = $('#vwStage');
  st.addEventListener('wheel', e => {
    if (!e.ctrlKey) return; e.preventDefault();
    const r = st.getBoundingClientRect(), wrap = $('#vwWrap');
    const ix = (st.scrollLeft + e.clientX - r.left - wrap.offsetLeft) / VW.zoom, iy = (st.scrollTop + e.clientY - r.top - wrap.offsetTop) / VW.zoom;
    applyZoom(VW.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    st.scrollLeft = wrap.offsetLeft + ix * VW.zoom - (e.clientX - r.left); st.scrollTop = wrap.offsetTop + iy * VW.zoom - (e.clientY - r.top);
  }, { passive: false });
  let drag = null;   // arrastrar para desplazarse
  st.addEventListener('pointerdown', e => { if (e.target.closest('.tagl,.fg')) return; drag = { x: e.clientX, y: e.clientY, l: st.scrollLeft, t: st.scrollTop }; st.classList.add('grabbing'); st.setPointerCapture(e.pointerId); });
  st.addEventListener('pointermove', e => { if (!drag) return; st.scrollLeft = drag.l - (e.clientX - drag.x); st.scrollTop = drag.t - (e.clientY - drag.y); });
  const end = () => { drag = null; st.classList.remove('grabbing'); };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  // Sincronizar lista ↔ imagen
  const keyOf = e => { const t = e.target.closest('[data-vk]'); return t ? t.dataset.vk : null; };
  $('#vwList').addEventListener('mouseover', e => { const k = keyOf(e); if (k) setViewerHl(k); });
  $('#vwList').addEventListener('mouseleave', () => setViewerHl(null));
  $('#vwList').addEventListener('click', e => { const k = keyOf(e); if (k) { setViewerHl(k); scrollToField(k); } });
  $('#vwList').addEventListener('keydown', e => { if (e.key === 'Enter') { const k = keyOf(e); if (k) { setViewerHl(k); scrollToField(k); } } });
  st.addEventListener('mouseover', e => { const k = keyOf(e); if (k) setViewerHl(k); });
  st.addEventListener('mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('[data-vk]')) { if (keyOf(e)) setViewerHl(null); } });
  st.addEventListener('click', e => { const k = keyOf(e); if (k) { const el = $(`#vwList .fi[data-vk="${k}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
  addEventListener('resize', () => { if (VW.open && VW.fit) applyZoom(); });
}
