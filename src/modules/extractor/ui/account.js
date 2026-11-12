import { numStr } from '../lib/format.js';
import { $ } from '../lib/utils.js';
import { parseNumberText } from '../ocr/parse.js';
import { S } from '../state.js';
import { msgHTML, setMsgs, toast } from './feedback.js';
import { renderAll } from './render.js';

function validateAccountInput(q) {
  const t = String(q || '').replace(/\s+/g, '');
  if (!t) return { ok: false, msg: 'Escribe un número de cuenta.' };
  if (!/^\d+$/.test(t)) return { ok: false, msg: 'El número de cuenta sólo admite dígitos.' };
  if (t.length > 15) return { ok: false, msg: 'El número es demasiado largo (máx. 15 dígitos).' };
  return { ok: true, value: t };
}
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

export const normCta = s => String(s ?? '').replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
export function applyOcrCuenta() {
  const input = $('#qInput'), cur = input.value.trim(), det = S.ocrCuenta;
  if (det) {
    if (normCta(cur) !== normCta(det)) {
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
  } else if (S.autoCuenta) clearAutoCuenta();
}
export function clearAutoCuenta() {
  const input = $('#qInput');
  if (S.autoCuenta && normCta(input.value) === normCta(S.autoCuenta)) {
    if ($('#mInput').value) S.metaFor = S.autoCuenta;
    input.value = ''; syncAccount({ render: false });
  }
  S.autoCuenta = null;
}
