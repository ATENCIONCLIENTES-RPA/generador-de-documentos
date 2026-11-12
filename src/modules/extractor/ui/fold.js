import { $ } from '../lib/utils.js';
import { INV_KEYS, S } from '../state.js';
import { DD, ddClose } from './dropdown.js';

export function setInvOpen(open) {
  const card = $('#cardInv'), btn = $('#btnFold'), body = $('#invCollapse');
  card.classList.toggle('collapsed', !open); body.inert = !open;
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', (open ? 'Contraer' : 'Expandir') + ' «Datos de la factura»'); btn.title = open ? 'Contraer' : 'Expandir';
  if (!open && DD.cur && body.contains(DD.cur.w)) ddClose(false);
}
function hasInvData() {
  return !!S.val || INV_KEYS.some(k => { const f = S.inv[k]; return (f.value !== null && f.value !== undefined && f.value !== '') || String(f.text || '').trim() !== ''; });
}
export function autoFoldInvoice(typing) {
  const has = hasInvData(); if (has === S.invHad) return;
  if (has) { S.invHad = true; setInvOpen(true); }
  else if (!typing) { S.invHad = false; setInvOpen(false); }
}
export const invIsOpen = () => !$('#cardInv').classList.contains('collapsed');
