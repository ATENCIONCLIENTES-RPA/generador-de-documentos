/* Flujo de imagen y OCR (interfaz). */
import { numStr } from '../lib/format.js';
import { $, AppError, clamp, fmtBytes, tick } from '../lib/utils.js';
import { OCR } from '../ocr/engine.js';
import { FIELDS, extractTargetFields, rereadFields, runOCR } from '../ocr/extract.js';
import { handleImageUpload, preprocessImage } from '../ocr/image.js';
import { validateExtractedData } from '../ocr/validate.js';
import { INV_DEF, INV_KEYS, S, blankField } from '../state.js';
import { applyOcrCuenta, clearAutoCuenta } from './account.js';
import { errorMsg, msgHTML, setMsgs, setPill, toast } from './feedback.js';
import { renderAll } from './render.js';
import { VW, closeViewer } from './viewer.js';

/* ==========================================================================
   16. FLUJO OCR (interfaz)
   ========================================================================== */
function setProgress(text, frac) {
  $('#prog').classList.remove('hidden'); $('#progTx').textContent = text;
  const p = Math.round(clamp(frac, 0, 1) * 100); $('#progPct').textContent = p + '%'; $('#progFill').style.width = p + '%';
}
export async function onImageChosen(file) {
  setMsgs('#imgMsgs', '');
  try {
    const img = await handleImageUpload(file);
    if (S.img && S.img.url) URL.revokeObjectURL(S.img.url);
    // Una imagen nueva puede ser de OTRO caso: se descartan las lecturas OCR anteriores para no mezclarlas con las de la imagen nueva.
    S.prevOcrCuenta = S.ocrCuenta || S.prevOcrCuenta || null; S.ocrCuenta = null;
      clearAutoCuenta();   // la cuenta de la imagen anterior no debe seguir visible mientras se procesa la nueva
    for (const k of INV_KEYS) if (S.inv[k].source === 'ocr') S.inv[k] = blankField(); else { S.inv[k].region = null; S.inv[k].ocrValue = null; S.inv[k].conflict = false; }
    S.img = img; S.work = null; S.ocr = null; S.ex = null; S.val = null; S.ocrState = 'idle'; S.confirmed = false;
    $('#prevImg').src = img.url; $('#ov').setAttribute('viewBox', `0 0 ${img.w} ${img.h}`); $('#ov').innerHTML = '';
    $('#imgName').textContent = file.name; $('#imgSize').textContent = `${img.w}×${img.h}px · ${fmtBytes(file.size)}`;
    $('#drop').classList.add('hidden'); $('#imgBox').classList.remove('hidden'); $('#prog').classList.add('hidden');
    toast('info', 'Imagen cargada', 'Pulsa «Extraer datos» para procesarla.');
  } catch (e) {
    const er = errorMsg(e); setMsgs('#imgMsgs', msgHTML('err', er.t, er.h)); toast('err', 'Imagen no válida', er.t);
  }
  renderAll();
}
export function removeImage() {
  if (VW.open) closeViewer();
  if (S.img && S.img.url) URL.revokeObjectURL(S.img.url);
  S.prevOcrCuenta = S.ocrCuenta || S.prevOcrCuenta || null;
  clearAutoCuenta();
  S.img = null; S.work = null; S.ocr = null; S.ex = null; S.val = null; S.ocrState = 'idle'; S.confirmed = false; S.ocrCuenta = null;
  for (const k of INV_KEYS) if (S.inv[k].source === 'ocr') S.inv[k] = blankField(); else { S.inv[k].region = null; S.inv[k].ocrValue = null; }
  $('#imgBox').classList.add('hidden'); $('#drop').classList.remove('hidden'); $('#prog').classList.add('hidden'); $('#fileImg').value = '';
  setMsgs('#imgMsgs', ''); renderAll();
}
export async function processImage() {
  if (!S.img || S.running) return;
  setMsgs('#imgMsgs', ''); S.ocrState = 'running'; S.ocr = null; S.ex = null; S.val = null; $('#btnOcr').disabled = true; $('#btnRerun').disabled = true;
  const msgs = [];
  try {
    setProgress('Preparando la imagen…', 0.02); await tick();
    S.work = preprocessImage(S.img);
    S.running = 'ocr';
    setProgress('Cargando motor OCR…', 0.05);
    await OCR.ensure(m => {
      if (m.status && typeof m.progress === 'number') setProgress(/load|download|initializ/i.test(m.status) ? 'Descargando motor y modelo «spa»…' : 'Preparando OCR…', 0.05 + m.progress * 0.15);
    });
    setPill('#pillOcr', 'ok', 'OCR listo');
    setProgress('Leyendo la página completa…', 0.22);
    S.ocr = await runOCR(S.img, S.work, () => { });
    if (!S.ocr.words.length) throw new AppError('No se reconoció texto en la imagen.', 'Verifica que sea una captura de la consulta de facturas, nítida y sin recortar.');
    setProgress('Ubicando etiquetas y valores…', 0.6); await tick();
    S.ex = extractTargetFields(S.ocr.words);
    S.running = 'verify';
    await rereadFields(S.work, S.ex, (t, f) => setProgress(t + '…', 0.62 + f * 0.36));
    revalidateOcr(true);
    // Avisos de calidad
    const hs = S.ocr.words.map(w => w.y1 - w.y0).sort((a, b) => a - b); const med = hs[Math.floor(hs.length / 2)] || 0;
    if (med && med < 8) msgs.push(msgHTML('warn', `Texto muy pequeño (≈${Math.round(med)} px de alto).`, 'Usa una captura sin reducir (pantalla completa al 100 %).'));
    const target = FIELDS.filter(f => f.cell && f.key !== 'total');
    const bad = target.filter(f => ['ilegible', 'faltante'].includes(S.val[f.key].status));
    const rev = target.filter(f => S.val[f.key].status === 'revisar');
    const pBad = FIELDS.filter(f => ['periodo', 'desde', 'hasta'].includes(f.key) && (!S.val[f.key] || ['ilegible', 'faltante'].includes(S.val[f.key].status)));
    if (pBad.length) msgs.push(msgHTML('warn', `${pBad.length} dato(s) del periodo sin lectura fiable:`, pBad.map(f => f.label).join(', ') + '. Complétalos o corrígelos en «Datos de la factura»; no se inventa ningún valor.'));
    if (!Object.keys(S.ex.fields).length) msgs.push(msgHTML('err', 'No se encontraron los campos esperados.', 'La imagen no parece la pantalla de consulta de facturas (Código, Cl Servicio, Costo, Días F., Consumo Activa). Ingresa los datos manualmente.'));
    else if (bad.length) msgs.push(msgHTML('warn', `${bad.length} campo(s) sin lectura fiable:`, bad.map(f => f.label).join(', ') + '. Complétalos manualmente.'));
    if (rev.length) msgs.push(msgHTML('info', `${rev.length} campo(s) por revisar:`, rev.map(f => f.label).join(', ') + '. Compáralos con la miniatura antes de confirmar.'));
    if (S.work.redPx > 0.004 * S.img.w * S.img.h) msgs.push(msgHTML('info', 'Se ignoraron marcas rojas de la imagen.', 'No son necesarias: los campos se ubican por su etiqueta.'));
    setMsgs('#imgMsgs', msgs.join(''));
    setProgress('Extracción terminada', 1); S.ocrState = 'done';
    const okN = target.filter(f => S.val[f.key].status === 'ok').length;
    toast(bad.length ? 'warn' : 'ok', 'OCR terminado', `${okN} de ${target.length} campos leídos con seguridad · revisa y confirma.`);
  } catch (e) {
    S.ocrState = 'error'; const er = errorMsg(e);
    setMsgs('#imgMsgs', msgHTML('err', er.t, er.h)); setProgress('Proceso detenido', 0);
    if (/OCR|internet|conexión/i.test(er.t)) setPill('#pillOcr', 'err', 'OCR no disponible');
    toast('err', 'Error en el procesamiento', er.t);
  } finally {
    S.running = null; $('#btnOcr').disabled = false; renderAll();
  }
}
/** Aplica (o reaplica) los valores validados del OCR a los datos de factura, sin pisar datos manuales. */
function revalidateOcr(fresh = false) {
  if (!S.ex) return;
  S.val = validateExtractedData(S.ex, S.model);
  if (fresh) S.confirmed = false;
  // ¿La imagen es de otra cuenta que la del caso anterior? Entonces los valores digitados/corregidos pertenecen al caso anterior.
  const nuevaCta = S.val.cuenta && S.val.cuenta.value ? String(S.val.cuenta.value) : null;
  if (fresh && nuevaCta && S.prevOcrCuenta && S.prevOcrCuenta.replace(/^0+(?=\d)/, '') !== nuevaCta.replace(/^0+(?=\d)/, '')) {
    const viejos = INV_KEYS.filter(k => S.inv[k].source === 'manual' || S.inv[k].source === 'corregido');
    for (const k of viejos) S.inv[k] = blankField();
    if (viejos.length) toast('warn', 'Cambió la cuenta de la imagen', `Se descartaron ${viejos.length} valor(es) digitados del caso anterior (cuenta ${S.prevOcrCuenta}).`);
  }
  if (fresh) S.prevOcrCuenta = null;
  const conflicts = [];
  for (const [vk, k] of [['clase', 'clase'], ['dias', 'dias'], ['periodo', 'periodo'], ['desde', 'desde'], ['hasta', 'hasta'], ['consumo', 'consumo'], ['cu', 'cu']]) {
    const v = S.val[vk]; const cur = S.inv[k];
    const ocrPart = { ocrValue: v.value ?? null, ocrText: v.raw || '', region: v.region || null, conf: v.conf ?? null, votes: v.votes || null, note: v.note || '', notes: v.notes || [], suggest: v.suggest };
    if (cur.source === 'manual' || cur.source === 'corregido') {
      Object.assign(cur, ocrPart);
      if (v.value !== undefined && cur.value !== null && String(v.value) !== String(cur.value)) { cur.conflict = true; conflicts.push(INV_DEF[k].label); } else cur.conflict = false;
      continue;
    }
    const has = v.value !== undefined && v.value !== null;
    S.inv[k] = { ...blankField(), ...ocrPart, value: has ? v.value : null, text: has ? displayInput(k, v.value) : '', source: has ? 'ocr' : null, status: has && S.confirmed ? 'confirmado' : v.status };
  }
  const c = S.val.cuenta;
  S.ocrCuenta = c && c.value ? c.value : null;
  applyOcrCuenta();
  if (conflicts.length && fresh) toast('warn', 'Diferencias con datos ingresados', conflicts.join(', ') + ': se conserva tu valor; revisa la sugerencia del OCR.');
}
export function displayInput(k, v) {
  if (v === null || v === undefined || v === '') return '';
  if (k === 'clase') return String(v);
  if (k === 'cobro' || k === 'total') return Number.isInteger(v) ? numStr(v, 0, true) : String(v).replace('.', ',');
  if (k === 'cu') return String(v).replace('.', ',');
  return String(v);
}
export function confirmData() {
  const pend = INV_KEYS.filter(k => S.inv[k].source === 'ocr' && S.inv[k].status === 'revisar');
  S.confirmed = true;
  for (const k of INV_KEYS) if (S.inv[k].source === 'ocr') S.inv[k].status = 'confirmado';
  const missing = INV_KEYS.filter(k => !INV_DEF[k].optional && (S.inv[k].value === null || S.inv[k].value === undefined));
  toast(missing.length ? 'warn' : 'ok', 'Datos confirmados', missing.length ? `Aún faltan: ${missing.map(k => INV_DEF[k].label).join(', ')}.` : (pend.length ? `Aceptaste ${pend.length} valor(es) marcados para revisión.` : 'Se usarán en el cálculo.'));
  if (S.ocrCuenta && !$('#qInput').value) applyOcrCuenta();
  renderAll();
}
export function drawOverlay(hlKey) {
  if (!S.val || !S.img) { $('#ov').innerHTML = ''; return; }
  const sw = Math.max(1, S.img.w / 600);
  $('#ov').innerHTML = FIELDS.map(f => {
    const v = S.val[f.key]; if (!v || !v.region) return '';
    const r = v.region, p = 3 * sw, cls = (v.status === 'ok' ? '' : 'un') + (hlKey === f.key ? ' hl' : '');
    return `<rect class="${cls}" x="${r.x0 - p}" y="${r.y0 - p}" width="${r.w + 2 * p}" height="${r.h + 2 * p}" rx="${2 * sw}"/>`;
  }).join('');
}
