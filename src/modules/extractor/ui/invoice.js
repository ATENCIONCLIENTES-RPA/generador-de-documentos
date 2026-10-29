/* Datos de la factura (formulario editable). */
import { numStr } from '../lib/format.js';
import { $, esc, icon } from '../lib/utils.js';
import { classOptions, parseDateText, parseNumberText, parsePeriodText } from '../ocr/parse.js';
import { INV_DEF, INV_KEYS, S } from '../state.js';
import { ddEnhance } from './dropdown.js';
import { displayInput } from './ocr-flow.js';

/* ==========================================================================
   17. DATOS DE FACTURA (formulario editable)
   ========================================================================== */
export function sourceChip(src) {
  return { ocr: '<span class="chip ocr">OCR</span>', 'ocr-ctx': '<span class="chip ocr">OCR contexto</span>', corregido: '<span class="chip fix">Corregido</span>', manual: '<span class="chip manual">Manual</span>' }[src] || '<span class="chip mute">Vacío</span>';
}
export function statusChip(st) {
  return { ok: '<span class="chip ok">Leído</span>', revisar: '<span class="chip warn">Revisar</span>', ilegible: '<span class="chip err">Ilegible</span>', faltante: '<span class="chip err">No detectado</span>', confirmado: '<span class="chip ok">Confirmado</span>' }[st] || '';
}
export function renderInvoice() {
  const m = S.model; const list = classOptions(m);
  const rows = INV_KEYS.map(k => {
    const d = INV_DEF[k], f = S.inv[k];
    const lbl = k === 'cobro' ? 'Valor facturado (Total Facturado)' : (m && m.inputs[d.cell] ? m.inputs[d.cell].label : d.label);
    const st = f.conflict ? 'conflicto' : (f.source === 'ocr' || !f.source ? (f.status || '') : '');
    let input;
    if (k === 'clase') {
      input = `<select class="inp" data-k="${k}" aria-label="${esc(lbl)}"><option value="">${list.length ? '— Selecciona —' : 'Sin clases disponibles'}</option>${list.map(c => `<option ${f.value === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
    } else input = `<input class="inp num" data-k="${k}" inputmode="${['periodo', 'desde', 'hasta'].includes(k) ? 'text' : 'decimal'}" value="${esc(f.text)}" placeholder="${k === 'cobro' ? 'Ej.: 160.252' : (k === 'cu' ? 'Ej.: 1031,5922' : (k === 'periodo' ? 'Ej.: 2026-10' : (k === 'desde' || k === 'hasta' ? 'dd/mm/aaaa' : '—')))}" aria-label="${esc(lbl)}">`;
    const sub = [];
    if (f.note && f.source !== 'manual' && ['ilegible', 'faltante'].includes(f.status)) sub.push(`<span>${esc(f.note)}</span>`);
    if (f.conflict && f.ocrValue !== null) sub.push(`<span style="color:#9A5B05">Imagen: <b>${esc(displayInput(k, f.ocrValue))}</b></span><button class="linkbtn" data-useocr="${k}">Usar valor de la imagen</button>`);
    if (f.status === 'ilegible' && f.suggest !== undefined && f.suggest !== null && f.value === null && f.source !== 'manual' && f.source !== 'corregido')
      sub.push(`<span style="color:#9A5B05">Lectura dudosa: <b>${esc(displayInput(k, f.suggest))}</b></span><button class="linkbtn" data-usesug="${k}">Usar esta lectura</button>`);
    if (k === 'cobro' && ['ilegible', 'revisar'].includes(f.status) && f.source !== 'manual') for (const n of (f.notes || [])) sub.push(`<span>${esc(n)}</span>`);
    if (f.parseNote) sub.push(`<span style="color:var(--err)">${esc(f.parseNote)}</span>`);
    if (f.interp) sub.push(`<span>${esc(f.interp)}</span>`);
    return `<div class="frow st-${st || 'none'}" data-row="${k}" >
      <div class="lab">${esc(lbl)}</div>
      <div>${input}</div>
      <div class="meta">${f.source === 'ocr' ? '' : sourceChip(f.source)}${f.conflict ? '<span class="chip warn">Diferencia</span>' : statusChip(f.source === 'ocr' || !f.source ? (f.status === 'ok' ? '' : f.status) : '')}</div>
      <div class="sub">${sub.join('')}</div></div>`;
  }).join('');
  const un = '';
  let ocrAcc = '';
  if (S.val && S.val.cuenta) {
    const c = S.val.cuenta;
    ocrAcc = `<div class="frow st-${c.status === 'revisar' ? 'revisar' : 'none'}" data-row="cuenta"><div class="lab">Cuenta en la imagen</div><div class="num" style="font-weight:650">${c.value ? esc(c.value) : '<span style="color:var(--muted);font-weight:500">No detectada</span>'}</div><div class="meta">${c.value ? statusChip(c.status) : ''}</div>${!c.value && c.note ? `<div class="sub"><span>${esc(c.note)}</span></div>` : ''}</div>`;
  }
  $('#invBody').innerHTML = rows + ocrAcc + un; ddEnhance($('#invBody'));
  const ocrFields = INV_KEYS.filter(k => S.inv[k].source === 'ocr');
  const rev = ocrFields.filter(k => S.inv[k].status === 'revisar').length;
  const missing = INV_KEYS.filter(k => !INV_DEF[k].optional && (S.inv[k].value === null || S.inv[k].value === undefined));
  $('#btnConfirm').disabled = !S.val || S.confirmed;
  $('#btnRerun').disabled = !S.img || !!S.running;
  { const tg = S.val ? (S.confirmed ? ['Confirmado', 'Datos confirmados'] : ['Pendiente', 'Pendiente de confirmar']) : ['Imagen u otra fuente', 'Imagen u otra fuente']; $('#invTag').textContent = tg[0]; $('#invTag').title = tg[1]; }
  $('#invState').innerHTML = S.confirmed ? `${icon('i-check')} Datos confirmados${missing.length ? ` · faltan ${missing.length}` : ''}.` :
    ocrFields.length ? `${rev ? `<b style="color:#9A5B05">${rev} por revisar</b> · ` : ''}${missing.length ? `${missing.length} sin valor · ` : ''}Confirma antes de usar los resultados.` :
      missing.length ? `Faltan ${missing.length} dato(s) para calcular.` : 'Datos completos.';
}
export function onInvoiceInput(k, raw) {
  const f = S.inv[k]; const d = INV_DEF[k]; const vk = k === 'cobro' ? 'total' : k;
  f.text = raw; f.parseNote = ''; f.interp = '';
  if (k === 'clase') { f.value = raw || null; }
  else if (!String(raw).trim()) f.value = null;
  else if (d.type === 'period' || d.type === 'date') {
    const p = d.type === 'period' ? parsePeriodText(raw) : parseDateText(raw);
    if (!p.ok) { f.value = null; f.parseNote = p.reason; } else f.value = p.value;
  }
  else {
    const p = parseNumberText(raw, d.type === 'money' ? 'money' : d.type);
    if (!p.ok) { f.value = null; f.parseNote = 'Valor no numérico'; }
    else if (d.type === 'int' && !Number.isInteger(p.value)) { f.value = null; f.parseNote = 'Debe ser un número entero'; }
    else { f.value = p.value; if (p.ambiguous) f.interp = `Interpretado como ${numStr(p.value, (String(p.value).split('.')[1] || '').length, true)}`; }
  }
  const hasOcr = f.ocrValue !== null && f.ocrValue !== undefined;
  if (!String(raw).trim()) { f.source = null; f.status = ''; }
  else if (hasOcr && f.value !== null && String(f.value) === String(f.ocrValue)) { f.source = 'ocr'; f.status = S.confirmed ? 'confirmado' : (S.val && S.val[vk] ? S.val[vk].status : 'ok'); }
  else if (f.region || f.ocrText) { f.source = 'corregido'; f.status = ''; }
  else { f.source = 'manual'; f.status = ''; }
  f.conflict = false;
}
