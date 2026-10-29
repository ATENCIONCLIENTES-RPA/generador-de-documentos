/* Cuenta y meta; sincronización con la cuenta detectada en la imagen. */
import { numStr } from '../lib/format.js';
import { $ } from '../lib/utils.js';
import { parseNumberText } from '../ocr/parse.js';
import { S } from '../state.js';
import { msgHTML, setMsgs, toast } from './feedback.js';
import { renderAll } from './render.js';

/* ==========================================================================
   15. CUENTA Y META: syncAccount()
   ========================================================================== */
function validateAccountInput(q) {
  const t = String(q || '').replace(/\s+/g, '');
  if (!t) return { ok: false, msg: 'Escribe un número de cuenta.' };
  if (!/^\d+$/.test(t)) return { ok: false, msg: 'El número de cuenta sólo admite dígitos.' };
  if (t.length > 15) return { ok: false, msg: 'El número es demasiado largo (máx. 15 dígitos).' };
  return { ok: true, value: t };
}
/** Lee la cuenta y la meta diaria escritas a mano. */
function readManualAccount() {
  const cv = validateAccountInput($('#qInput').value);
  const mt = String($('#mInput').value || '').trim();
  let mv = null, mErr = '';
  if (!mt) mErr = 'Escribe la meta (kWh).';
  else {
    const p = parseNumberText(mt, 'decimal');
    if (!p.ok) mErr = 'La meta debe ser un número, p. ej. 294.';
    else if (!(p.value > 0)) mErr = 'La meta debe ser mayor que 0.';
    else mv = p.value;
  }
  return { cv, mv, mErr, mText: mt };
}
/** Aplica la cuenta y la meta escritas a mano. strict=true muestra avisos de lo que falte. */
export function syncAccount({ strict = false, render = true } = {}) {
  const { cv, mv, mErr, mText } = readManualAccount();
  const qText = String($('#qInput').value || '').trim();
  $('#qField').classList.toggle('invalid', !cv.ok && (strict || !!qText));
  $('#mField').classList.toggle('invalid', !!mErr && (strict || !!mText));
  const msgs = [];
  if (strict) {
    if (!cv.ok) msgs.push(msgHTML('warn', cv.msg));
    if (mErr) msgs.push(msgHTML('warn', mErr));
  }
  S.dupChoices = null; S.claseChoice = null;
  if (cv.ok && mv !== null) {
    S.lastQuery = cv.value;
    S.account = { query: cv.value, rec: { row: null, cuenta: cv.value, meta: mv, cuentaNumeric: false }, how: 'manual' };
    if (S.ocrCuenta && S.ocrCuenta.replace(/^0+/, '') !== cv.value.replace(/^0+/, '')) msgs.push(msgHTML('warn', 'La imagen corresponde a otra cuenta', `(${S.ocrCuenta}). Verifica que los datos de factura sean de la cuenta ${cv.value}.`));
    if (strict) toast('ok', 'Datos aplicados', `Cuenta ${cv.value} · meta ${numStr(mv, 4, true)} kWh ${S.metaUnit === 'ciclo' ? 'del ciclo' : 'por día'}`);
  } else { S.account = null; S.lastQuery = ''; }
  setMsgs('#qMsgs', msgs.join(''));
  if (render) renderAll();
}
export function clearQuery() {
  S.account = null; S.dupChoices = null; S.lastQuery = ''; S.autoCuenta = null; S.metaFor = null;
  $('#qInput').value = ''; $('#mInput').value = '';
  $('#qField').classList.remove('invalid'); $('#mField').classList.remove('invalid');
  setMsgs('#qMsgs', ''); renderAll(); $('#qInput').focus();
}

/* ==========================================================================
   15b. CAMPO «CUENTA» ↔ CUENTA DETECTADA EN LA IMAGEN
   Causa del error original: la cuenta detectada sólo se escribía si el campo estaba VACÍO. Tras la primera imagen el campo ya tenía
   valor, así que en las cargas siguientes la cuenta nueva nunca llegaba al campo (ni a S.account) y los resultados se calculaban con
   la cuenta anterior. Ahora la extracción es la fuente del campo: al terminar se escribe la cuenta detectada y se sincroniza el estado.
   ========================================================================== */
export const normCta = s => String(s ?? '').replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
/** Escribe en «Cuenta» la cuenta detectada por la extracción (S.ocrCuenta) y sincroniza el estado con syncAccount(). */
export function applyOcrCuenta() {
  const input = $('#qInput'), cur = input.value.trim(), det = S.ocrCuenta;
  if (det) {
    if (normCta(cur) !== normCta(det)) {
      // La meta pertenece a la cuenta anterior: no se arrastra a la cuenta nueva (mismo criterio que «usar» en la sugerencia).
      const previa = cur || S.metaFor;
      if (previa && normCta(previa) !== normCta(det) && $('#mInput').value) {
        $('#mInput').value = ''; $('#mField').classList.remove('invalid');
        toast('warn', 'Ingresa la meta de la cuenta ' + det, 'La meta anterior pertenecía a la cuenta ' + previa + '.');
      }
      input.value = det;
      const f = $('#qField'); f.classList.remove('invalid', 'filled'); void f.offsetWidth; f.classList.add('filled'); setTimeout(() => f.classList.remove('filled'), 1000);
      syncAccount({ render: false });
    }
    S.autoCuenta = det; S.metaFor = null;
  } else if (S.autoCuenta) clearAutoCuenta();   // no se detectó cuenta en esta imagen: no se deja la anterior
}
/** Quita del campo la cuenta que la app puso sola (una escrita a mano por el usuario no se toca). */
export function clearAutoCuenta() {
  const input = $('#qInput');
  if (S.autoCuenta && normCta(input.value) === normCta(S.autoCuenta)) {
    if ($('#mInput').value) S.metaFor = S.autoCuenta;
    input.value = ''; syncAccount({ render: false });
  }
  S.autoCuenta = null;
}
