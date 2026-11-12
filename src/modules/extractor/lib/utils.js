
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const tick = () => new Promise(r => setTimeout(r, 0));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const compact = s => norm(s).replace(/[^a-z0-9]/g, '');
export const eqi = (a, b) => String(a).toLocaleLowerCase('es') === String(b).toLocaleLowerCase('es');
export const icon = (id, cls = 'i sm') => `<svg class="${cls}"><use href="#${id}"/></svg>`;
const CELL_ICON = { C5: 'i-tag', C6: 'i-target', C7: 'i-calendar', C8: 'i-flag', C9: 'i-down', C10: 'i-up', C11: 'i-shield', F5: 'i-bolt', F6: 'i-coin', F7: 'i-okcircle', F8: 'i-alert', F9: 'i-leaf', F10: 'i-swap', F11: 'i-receipt', F12: 'i-percent', F13: 'i-calc', F14: 'i-wallet', F17: 'i-card', F18: 'i-plusminus', F19: 'i-scale' };
export const cellIco = (ref, extra = '') => `<span class="cico" ${extra}>${icon(CELL_ICON[ref] || 'i-info', 'i sm')}</span>`;
export const fmtBytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';

export class AppError extends Error { constructor(msg, hint) { super(msg); this.hint = hint || ''; } }

function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i), cur = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}
export const similarity = (a, b) => { a = compact(a); b = compact(b); if (!a || !b) return 0; return 1 - lev(a, b) / Math.max(a.length, b.length); };
