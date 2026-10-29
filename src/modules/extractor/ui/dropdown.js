/* Listas desplegables personalizadas. */
import { $, $$, clamp, esc, icon, norm } from '../lib/utils.js';

/* ==========================================================================
   20a. LISTAS DESPLEGABLES PERSONALIZADAS (ddEnhance) Y BLOQUE PLEGABLE
   ========================================================================== */
export const DD = { pop: null, cur: null, uid: 0, buf: '', bufT: 0 };
function ddPop() {
  if (DD.pop) return DD.pop;
  const p = document.createElement('div'); p.className = 'dd-pop'; p.id = 'ddPop'; p.setAttribute('role', 'listbox'); document.body.appendChild(p);
  p.addEventListener('mousedown', e => e.preventDefault());                       // el foco se queda en el botón
  p.addEventListener('mousemove', e => { const o = e.target.closest('.dd-opt'); if (o && o.getAttribute('aria-disabled') !== 'true') ddActive(+o.dataset.i, false); });
  p.addEventListener('click', e => { const o = e.target.closest('.dd-opt'); if (o) ddCommit(+o.dataset.i); });
  return (DD.pop = p);
}
export function ddEnhance(root = document) {
  if (DD.cur && !DD.cur.w.isConnected) ddClose(false);                            // el componente abierto fue reemplazado por un nuevo render
  $$('select', root).forEach(sel => {
    if (sel.dataset.dd) return; sel.dataset.dd = '1';
    const id = 'dd' + (++DD.uid), w = document.createElement('span');
    w.className = 'dd' + (sel.closest('.field') ? ' pill' : '');
    w.dataset.ddk = sel.dataset.k || sel.id || id;
    sel.parentNode.insertBefore(w, sel); w.appendChild(sel);
    sel.classList.add('dd-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    w.insertAdjacentHTML('beforeend',
      `<span class="sr-only" id="${id}-l">${esc(sel.getAttribute('aria-label') || '')}</span>` +
      `<button type="button" class="dd-btn" id="${id}-b" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="ddPop" aria-labelledby="${id}-l ${id}-v"${sel.title ? ` title="${esc(sel.title)}"` : ''}${sel.dataset.k ? ` data-k="${esc(sel.dataset.k)}"` : ''}>` +
      `<span class="dd-val" id="${id}-v"></span><span class="dd-car">${icon('i-chevd')}</span></button>`);
    const btn = $('.dd-btn', w), val = $('.dd-val', w);
    const sync = () => { const o = sel.options[sel.selectedIndex]; val.textContent = o ? o.textContent : ''; val.classList.toggle('ph', !sel.value); btn.disabled = sel.disabled; };
    sel.addEventListener('change', sync); sync();
    btn.addEventListener('click', () => (DD.cur && DD.cur.w === w) ? ddClose(true) : ddOpen(w));
    btn.addEventListener('keydown', e => ddKey(e, w));
  });
}
function ddEnabled(sel, from, step) { for (let i = from; i >= 0 && i < sel.options.length; i += step) if (!sel.options[i].disabled) return i; return -1; }
function ddOpen(w) {
  const sel = $('select', w), btn = $('.dd-btn', w); if (btn.disabled) return;
  if (DD.cur) ddClose(false);
  const pop = ddPop(); DD.cur = { w, sel, btn }; clearTimeout(DD.hideT);
  pop.innerHTML = [...sel.options].map((o, i) =>
    `<div class="dd-opt${o.value === '' ? ' ph' : ''}" role="option" id="${btn.id}-o${i}" data-i="${i}" aria-selected="${i === sel.selectedIndex}"${o.disabled ? ' aria-disabled="true"' : ''}><span>${esc(o.textContent)}</span><span class="ck">${icon('i-check')}</span></div>`).join('');
  pop.setAttribute('aria-labelledby', btn.getAttribute('aria-labelledby').split(' ')[0]);
  pop.style.display = 'block'; pop.classList.remove('on'); w.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
  ddPlace(); void pop.offsetWidth; pop.classList.add('on');
  ddActive(sel.selectedIndex >= 0 && !sel.options[sel.selectedIndex].disabled ? sel.selectedIndex : ddEnabled(sel, 0, 1), true);
}
function ddPlace() {
  if (!DD.cur) return; const { w, btn } = DD.cur, pop = DD.pop, r = btn.getBoundingClientRect();
  pop.style.minWidth = Math.max(r.width, w.classList.contains('pill') ? 176 : 0) + 'px'; pop.style.maxHeight = '300px';
  const below = innerHeight - r.bottom - 12, above = r.top - 12, h = pop.offsetHeight, up = h > below && above > below;
  pop.style.maxHeight = Math.max(120, Math.min(300, up ? above : below)) + 'px';
  const H = pop.offsetHeight, Wd = pop.offsetWidth;
  pop.classList.toggle('up', up);
  pop.style.top = Math.max(8, up ? r.top - H - 6 : r.bottom + 6) + 'px';
  pop.style.left = clamp(w.classList.contains('pill') ? r.right - Wd : r.left, 8, Math.max(8, innerWidth - Wd - 8)) + 'px';
}
function ddActive(i, scroll) {
  if (!DD.cur || i < 0) return; const { btn } = DD.cur;
  $$('.dd-opt.act', DD.pop).forEach(o => o.classList.remove('act'));
  const o = DD.pop.children[i]; if (!o) return; o.classList.add('act'); btn.setAttribute('aria-activedescendant', o.id);
  if (scroll) o.scrollIntoView({ block: 'nearest' });
}
export function ddClose(refocus) {
  if (!DD.cur) return; const { w, btn } = DD.cur, pop = DD.pop; DD.cur = null;
  pop.classList.remove('on'); w.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.removeAttribute('aria-activedescendant');
  clearTimeout(DD.hideT); DD.hideT = setTimeout(() => { if (!DD.cur) pop.style.display = 'none'; }, 170);
  if (refocus && w.isConnected) btn.focus({ preventScroll: true });
}
function ddCommit(i) {
  if (!DD.cur) return; const { w, sel } = DD.cur, o = sel.options[i]; if (!o || o.disabled) return;
  const key = w.dataset.ddk; ddClose(true);
  if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  // los manejadores de «change» vuelven a dibujar la factura: se devuelve el foco al componente nuevo
  const b = w.isConnected ? $('.dd-btn', w) : $(`.dd[data-ddk="${key}"] .dd-btn`); if (b) b.focus({ preventScroll: true });
}
function ddKey(e, w) {
  const sel = $('select', w), open = !!(DD.cur && DD.cur.w === w), n = sel.options.length;
  const cur = () => { const a = $('.dd-opt.act', DD.pop); return a ? +a.dataset.i : sel.selectedIndex; };
  const go = (from, step) => { const j = ddEnabled(sel, clamp(from, 0, n - 1), step); return j; };
  const k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End' || k === 'PageDown' || k === 'PageUp') {
    e.preventDefault(); if (!open) { ddOpen(w); if (k === 'ArrowDown' || k === 'ArrowUp') return; }
    const c = cur(); let j;
    if (k === 'ArrowDown') j = go(c + 1, 1); else if (k === 'ArrowUp') j = go(c - 1, -1);
    else if (k === 'Home') j = go(0, 1); else if (k === 'End') j = go(n - 1, -1);
    else j = k === 'PageDown' ? (go(c + 5, -1) < 0 ? -1 : go(Math.min(c + 5, n - 1), -1)) : go(Math.max(c - 5, 0), 1);
    if (j >= 0) ddActive(j, true);
  } else if (k === 'Enter' || k === ' ') {
    e.preventDefault(); if (!open) ddOpen(w); else ddCommit(cur());
  } else if (k === 'Escape') {
    if (open) { e.preventDefault(); e.stopPropagation(); ddClose(true); }
  } else if (k === 'Tab') {
    if (open) ddClose(false);
  } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {          // escribir para saltar a una opción
    clearTimeout(DD.bufT); DD.buf += norm(k); DD.bufT = setTimeout(() => { DD.buf = ''; }, 650);
    const opts = [...sel.options]; const from = open ? cur() : sel.selectedIndex;
    const order = opts.map((_, i) => (from + (DD.buf.length > 1 ? 0 : 1) + i) % n);
    const hit = order.find(i => !opts[i].disabled && norm(opts[i].textContent).startsWith(DD.buf));
    if (hit !== undefined) { e.preventDefault(); if (!open) ddOpen(w); ddActive(hit, true); }
  }
}
document.addEventListener('pointerdown', e => { if (DD.cur && !DD.cur.w.contains(e.target) && !DD.pop.contains(e.target)) ddClose(false); });
addEventListener('resize', () => { if (DD.cur) ddPlace(); });
document.addEventListener('scroll', e => { if (DD.cur && e.target !== DD.pop) ddPlace(); }, true);
