/* Render general y reinicio. */
import { $, esc } from '../lib/utils.js';
import { INV_KEYS, S, blankField } from '../state.js';
import { setMsgs, toast } from './feedback.js';
import { autoFoldInvoice } from './fold.js';
import { renderInvoice } from './invoice.js';
import { drawOverlay, removeImage } from './ocr-flow.js';
import { renderResults } from './results.js';
import { VW, renderViewerList, renderViewerOverlay } from './viewer.js';

/* ==========================================================================
   20. RENDER GENERAL Y REINICIO
   ========================================================================== */
function renderHint() {
  const h = [];
  if (S.ocrCuenta) h.push(`<span>Detectada en la imagen:</span><span class="chip ocr" data-usecta="1" role="button" tabindex="0">${esc(S.ocrCuenta)} · usar</span>`);
  h.push('<span>Ingresa la cuenta y la meta (kWh del ciclo o por día); se aplican al escribir.</span>');
  $('#qHint').innerHTML = h.join('<span style="color:var(--line-2)">·</span>');
}
export function renderAll() {
  const vb = $('#btnViewer'); vb.classList.toggle('hidden', !S.img);
  vb.lastChild.textContent = S.val ? 'Ver imagen y datos detectados' : 'Ver imagen ampliada';
  if (VW.open) { renderViewerList(); renderViewerOverlay(); }
  const typing = $('#invBody').contains(document.activeElement);   // el render recrea los campos: se mide el foco antes
  renderHint(); renderInvoice(); autoFoldInvoice(typing); renderResults(); drawOverlay();
}
export function resetApplication() {
  removeImage();
  for (const k of INV_KEYS) S.inv[k] = blankField();
  S.account = null; S.dupChoices = null; S.claseChoice = null; S.ocrCuenta = null; S.confirmed = false; S.lastQuery = '';
  S.prevOcrCuenta = null; S.autoCuenta = null; S.metaFor = null;
  $('#qInput').value = ''; $('#mInput').value = ''; $('#qField').classList.remove('invalid'); $('#mField').classList.remove('invalid'); setMsgs('#qMsgs', ''); setMsgs('#imgMsgs', '');
  renderAll(); toast('info', 'Aplicación reiniciada', 'Se limpiaron la cuenta, la meta, la imagen y los datos de la factura.');
}
