/* Bloque plegable «Datos de la factura». */
import { $ } from '../lib/utils.js';
import { INV_KEYS, S } from '../state.js';
import { DD, ddClose } from './dropdown.js';

/** Plegado de «Datos de la factura» (sólo presentación; el contenido sigue en el DOM y conserva su estado). */
export function setInvOpen(open) {
  const card = $('#cardInv'), btn = $('#btnFold'), body = $('#invCollapse');
  card.classList.toggle('collapsed', !open); body.inert = !open;
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', (open ? 'Contraer' : 'Expandir') + ' «Datos de la factura»'); btn.title = open ? 'Contraer' : 'Expandir';
  if (!open && DD.cur && body.contains(DD.cur.w)) ddClose(false);
}
/** ¿Hay algo en «Datos de la factura»? Sí si ya se ejecutó la extracción (S.val) o si algún campo tiene valor/texto (OCR o digitado). */
function hasInvData() {
  return !!S.val || INV_KEYS.some(k => { const f = S.inv[k]; return (f.value !== null && f.value !== undefined && f.value !== '') || String(f.text || '').trim() !== ''; });
}
/** Sin datos → bloque contraído; cuando aparecen datos → se expande. Sólo actúa cuando cambia el estado «con/sin datos»,
    así la decisión manual del usuario (plegar/desplegar) se respeta mientras no cambie. No pliega si el usuario está escribiendo dentro del bloque. */
export function autoFoldInvoice(typing) {
  const has = hasInvData(); if (has === S.invHad) return;
  if (has) { S.invHad = true; setInvOpen(true); }
  else if (!typing) { S.invHad = false; setInvOpen(false); }
}
export const invIsOpen = () => !$('#cardInv').classList.contains('collapsed');
