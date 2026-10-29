/* Resultados calculados. */
import { INPUT_CELLS, calculateResults, refLabel, validateCalcInputs } from '../calc/engine.js';
import { fmtExcel, numStr } from '../lib/format.js';
import { $, cellIco, clamp, esc, icon } from '../lib/utils.js';
import { publishCrg } from '../features/crg-export.js';
import { ObsStore, obsAutosize, obsCaseKey, obsCount, observationHTML } from '../observation/editor.js';
import { observationFromCalc } from '../observation/logic.js';
import { INV_DEF, INV_KEYS, S, getPeriodData } from '../state.js';
import { helpTip, msgHTML, tipAttr } from './feedback.js';
import { sourceChip } from './invoice.js';

/* ==========================================================================
   19. RESULTADOS: renderResults()
   ========================================================================== */
function buildCalc() {
  const m = S.model, a = S.account; if (!m || !a) return null;
  const r = a.rec; const inv = S.inv;
  // Regla de negocio: la clase de servicio sale EXCLUSIVAMENTE de la imagen (o de la corrección del usuario).
    const clase = inv.clase.value || null, claseSrc = inv.clase.source, conflict = null, dc = null;
  // La meta se escribe por defecto como META DEL CICLO (kWh): la meta diaria que usa la calculadora = meta del ciclo ÷ días facturados.
  let metaDia = typeof r.meta === 'number' ? r.meta : null;
  if (metaDia !== null && S.metaUnit === 'ciclo') metaDia = (typeof inv.dias.value === 'number' && inv.dias.value > 0) ? metaDia / inv.dias.value : null;
  const inputs = { C5: clase, C6: metaDia, C7: inv.dias.value, F5: inv.consumo.value, F6: inv.cu.value, F17: '' };
  const invalid = validateCalcInputs(m, inputs);
  const res = calculateResults(m, inputs, invalid);
  const src = { C5: claseSrc, C6: 'manual', C7: inv.dias.source, F5: inv.consumo.source, F6: inv.cu.source, F17: null };
  // Estado global
  const reasons = [];
  let status = 'valido';
  const key = ['F14', 'F18', 'F19'];
  if (Object.keys(invalid).length || Object.values(m.formulas).some(f => !f.ok) || key.some(k => ['error', 'blocked', 'unsupported'].includes(res[k].state))) status = 'nocalc';
  else if (Object.values(res).some(x => x.state === 'pending')) status = 'incompleto';
  else {
    const unconf = INV_KEYS.filter(k => inv[k].source === 'ocr' && !S.confirmed);
    if (unconf.length) reasons.push(`Datos del OCR sin confirmar: ${unconf.map(k => INV_DEF[k].label).join(', ')}`);
    if (S.ocrCuenta && S.ocrCuenta.replace(/^0+/, '') !== a.rec.cuenta.replace(/^0+/, '')) reasons.push(`La imagen es de la cuenta ${S.ocrCuenta}`);
    if (reasons.length) status = 'preliminar';
  }
  return { inputs, invalid, res, src, status, reasons, conflict, dc, periodo: getPeriodData(), cuentaImagen: S.ocrCuenta || null };
}
function cellView(ref, calc) {
  const m = S.model; const isIn = INPUT_CELLS.includes(ref);
  const meta = isIn ? m.inputs[ref] : m.formulas[ref];
  const lbl = meta.label;
  let val, cls = '', why = '';
  if (isIn) {
    const v = calc.inputs[ref];
    if (calc.invalid[ref]) { val = v === null || v === undefined ? '—' : esc(fmtExcel(v, meta.fmt).text); cls = 'err'; why = calc.invalid[ref]; }
    else if (v === null || v === undefined || v === '') { val = ref === 'F17' ? 'Vacío' : 'Falta'; cls = 'pend'; }
    else { const f = fmtExcel(v, meta.fmt); val = esc(f.text); cls = typeof v === 'string' ? 'txt' : ''; }
  } else {
    const r = calc.res[ref];
    if (r.state === 'ok') { const f = fmtExcel(r.value, meta.fmt); val = r.value === '' ? '—' : (ref === 'F8' && r.value === 0 ? '0' : esc(f.text)); cls = (f.red ? 'err' : '') + (typeof r.value === 'string' ? ' txt' : ''); }
    else if (r.state === 'pending') { val = 'Pendiente'; cls = 'pend'; why = r.reason; }
    else if (r.state === 'error') { val = esc(r.code); cls = 'err'; why = r.reason; }
    else { val = 'No calculable'; cls = 'err'; why = r.by ? `Depende de ${refLabel(m, r.by)}` : r.reason; }
  }
  const chip = isIn ? (/^ocr/.test(calc.src[ref] || '') ? '' : sourceChip(calc.src[ref] || null)) : '<span class="chip calc">Calc.</span>';
  return `<div class="li ${isIn ? 'in' : ''}" data-ref="${ref}"><div class="l">${cellIco(ref, helpTip(ref))}<span class="t" ${helpTip(ref)}>${esc(lbl)}</span>${isIn ? chip : ''}</div><div class="v num ${cls}">${val}</div>
    ${why ? `<div class="why ${cls.includes('pend') ? 'm' : ''}">${esc(why)}</div>` : ''}</div>`;
}
/** Fila «Cuenta» (número de cuenta aplicado arriba) al inicio del bloque «Meta del período». */
function cuentaRow() {
  const cta = S.account && S.account.rec ? S.account.rec.cuenta : null;
  const tip = tipAttr('Cuenta', 'El número de cuenta del cliente. Es el mismo «Código» que aparece en la imagen de la factura.');
  return `<div class="li in" data-ref="cuenta"><div class="l"><span class="cico" ${tip}>${icon('i-user', 'i sm')}</span><span class="t" ${tip}>Cuenta</span>${sourceChip('manual')}</div><div class="v num">${cta ? esc(cta) : '—'}</div></div>`;
}
/** Filas «Periodo», «Periodo Desde» y «Periodo Hasta» dentro del bloque «Meta del período» (mismo estilo que las demás filas). */
function periodRows() {
  return [['periodo', 'Periodo', 'El periodo de facturación del documento (en la imagen aparece como «Facturación de»), p. ej. 2026-10.'],
          ['desde', 'Periodo Desde', 'La fecha en que empieza el periodo facturado, tal como aparece en la factura.'],
          ['hasta', 'Periodo Hasta', 'La fecha en que termina el periodo facturado, tal como aparece en la factura.']].map(([k, lbl, help]) => {
    const f = S.inv[k], has = f.value !== null && f.value !== undefined && f.value !== '';
    const tip = tipAttr(lbl, help);
    const chip = f.source === 'ocr' ? '' : sourceChip(f.source || null);
    return `<div class="li in" data-ref="${k}"><div class="l"><span class="cico" ${tip}>${icon('i-calendar', 'i sm')}</span><span class="t" ${tip}>${esc(lbl)}</span>${chip}</div><div class="v num ${has ? 'txt' : 'pend'}">${has ? esc(f.value) : 'Falta'}</div></div>`;
  }).join('');
}
export function renderResults() {
  const el = $('#resBody'); const m = S.model;
  if (!m || !S.account) {
    S.lastObs = null; S.obsEdit = null; $('#resStatus').innerHTML = '';
    publishCrg(null, null);   // sin cuenta/meta no hay datos: se limpia lo publicado al Módulo 3
        el.innerHTML = `<div class="empty"><div class="big">${icon('i-calc', 'i')}</div><div>Para calcular se necesita la cuenta y la meta.</div><div style="font-size:11.5px">Los datos de la factura pueden venir de la imagen o escribirse a mano.</div></div>`;
    return;
  }
  const c = buildCalc();
  const ST = { valido: ['valido', 'i-check', 'Resultado válido'], preliminar: ['preliminar', 'i-alert', 'Preliminar'], incompleto: ['incompleto', 'i-info', 'Datos incompletos'], nocalc: ['nocalc', 'i-err', 'No calculable'] }[c.status];
  $('#resStatus').innerHTML = c.status === 'preliminar' ? '' : `<span class="status ${ST[0]}">${icon(ST[1])}${ST[2]}</span>`;
  const msgs = [];
  if (c.status === 'nocalc') {
    const rs = [...new Set([...Object.values(c.invalid), ...['F12', 'F14', 'F18'].map(k => c.res[k]).filter(x => x.state !== 'ok' && x.state !== 'pending').map(x => x.reason)])];
    msgs.push(msgHTML('err', 'No se puede calcular el ajuste:', rs.join(' · ') + '. No se muestran resultados inventados.'));
  }
  if (c.status === 'incompleto') {
    const miss = INPUT_CELLS.filter(k => k !== 'F17' && (c.inputs[k] === null || c.inputs[k] === undefined)).map(k => m.inputs[k].label);
    msgs.push(msgHTML('info', 'Faltan datos:', miss.join(', ') + '. Extráelos de la imagen o ingrésalos en «Datos de la factura»; los valores dependientes quedan pendientes.'));
  }

  const R = c.res; const v = k => R[k] && R[k].state === 'ok' ? R[k].value : null;
  const f19 = v('F19'), f18 = v('F18'), f14 = v('F14'), f8 = v('F8');
  const tone = f19 === m.params.f19Neg ? 't-desc' : f19 === m.params.f19Pos ? 't-cobro' : 't-sin';
  const kText = (k) => { const r = R[k]; if (!r) return '—'; if (r.state === 'ok') return r.value === '' ? '—' : fmtExcel(r.value, m.formulas[k].fmt).text; if (r.state === 'pending') return 'Pendiente'; if (r.state === 'error') return r.code; return 'No calculable'; };
  const kpi = (k, sub, main) => `<div class="kpi ${main ? 'main ' + tone : ''}"><div class="k"><span>${esc(m.formulas[k].label)}</span>${cellIco(k, helpTip(k))}</div><div class="v num ${!main && typeof v(k) === 'number' && v(k) < 0 ? 'neg' : ''}">${esc(kText(k))}</div><div class="d">${sub}</div></div>`;
  const pend = c.status !== 'valido' ? ' (preliminar)' : '';
  // Banda de consumo
  let band = '';
  const C9 = v('C9'), C8 = v('C8'), C10 = v('C10'), F5 = c.inputs.F5;
  if ([C9, C8, C10].every(x => typeof x === 'number') && typeof F5 === 'number') {
    const max = Math.max(F5, C10) * 1.12 || 1; const pos = x => clamp(x / max * 100, 0, 100);
    const st = F5 > C10 ? 'over' : F5 < C9 ? 'under' : '';
    const nf = x => numStr(x, 1, true);
    band = `<div class="band"><div class="hd"><span>Consumo frente a la meta del período</span><span>Consumo <b class="num">${nf(F5)} kWh</b> · ${F5 > C10 ? 'por encima del máximo' : F5 < C9 ? 'por debajo del mínimo' : 'dentro de la banda'}</span></div>
      <div class="track"><div class="zone" style="left:${pos(C9)}%;width:${pos(C10) - pos(C9)}%" ${tipAttr('Franja tolerada', 'Si el consumo cae aquí, todo bien: no hay cobro adicional por exceso.')}></div><div class="tick" style="left:${pos(C9)}%" ${tipAttr('Mínimo de la meta', 'Por debajo de esta línea se considera que el cliente ahorró.')}></div><div class="tick meta" style="left:${pos(C8)}%" ${tipAttr('Meta del período', 'Lo que se esperaba que consumiera el cliente en estos días.')}></div><div class="tick" style="left:${pos(C10)}%" ${tipAttr('Máximo permitido', 'Si el consumo pasa esta línea, se cobra el exceso.')}></div><div class="cmark ${st}" style="left:${pos(F5)}%" ${tipAttr('Consumo del cliente: ' + nf(F5) + ' kWh', F5 > C10 ? 'Está por encima del máximo permitido: hay exceso y se cobra la diferencia.' : F5 < C9 ? 'Está por debajo del mínimo: el cliente ahorró frente a su meta.' : 'Está dentro de la franja verde: consumió lo esperado, sin exceso.')}></div></div>
      <div class="scale"><span style="left:${pos(C9)}%">Mín. 90%<b class="num">${nf(C9)}</b></span><span style="left:${pos(C8)}%">Meta<b class="num">${nf(C8)}</b></span><span style="left:${pos(C10)}%">Límite 110%<b class="num">${nf(C10)}</b></span></div></div>`;
  }
  const groups = `<div class="groups">
    <div class="grp"><h3>Meta del período</h3>${cuentaRow()}${['C5', 'C6', 'C7'].map(k => cellView(k, c)).join('')}${periodRows()}${['C8', 'C9', 'C10', 'C11'].map(k => cellView(k, c)).join('')}</div>
    <div class="grp"><h3>Consumo y tarifa</h3>${['F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14'].map(k => cellView(k, c)).join('')}</div>
  </div>`;
  const obs = observationFromCalc(c, S.account.rec.cuenta);
  obs.key = obsCaseKey(c, S.account.rec.cuenta); obs.textoAuto = obs.texto;
  const saved = ObsStore.get(obs.key); if (saved) { obs.texto = saved.texto; obs.editada = true; }   // la edición guardada reemplaza al texto automático
  if (S.obsEdit && S.obsEdit.key !== obs.key) S.obsEdit = null;                                     // cambió el caso: se descarta el borrador
  S.lastObs = obs;
  publishCrg(c, obs);   // publica los nueve campos hacia el Módulo 3 (localStorage compartido)
  // el render recrea el bloque: si el usuario está escribiendo, se conserva el foco, el cursor y el scroll del área de texto
  const fa = document.activeElement, keep = fa && fa.id === 'obsEdit' ? { s: fa.selectionStart, e: fa.selectionEnd, t: fa.scrollTop } : null;
  el.innerHTML = `<div class="rmsgs">${msgs.join('')}</div>${groups}${observationHTML(obs, c)}`;
  const ta = $('#obsEdit'); if (ta) { obsAutosize(ta); obsCount(ta); if (keep) { ta.focus({ preventScroll: true }); ta.setSelectionRange(keep.s, keep.e); ta.scrollTop = keep.t; } }
}
