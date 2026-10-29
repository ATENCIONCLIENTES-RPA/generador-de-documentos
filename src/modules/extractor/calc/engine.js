/* Motor de cálculo: reproduce la semántica de Excel y valida las entradas. */
import { excelRound } from '../lib/format.js';
import { eqi } from '../lib/utils.js';

export const INPUT_CELLS = ['C5', 'C6', 'C7', 'F5', 'F6', 'F17'];
/* ==========================================================================
   5. MOTOR DE CÁLCULO: calculateResults()
   Reproduce la semántica de Excel: IF perezoso, errores #N/A que se propagan,
   comparación de textos sin distinguir mayúsculas y ROUND con mitad alejada de cero.
   ========================================================================== */
class XlErr { constructor(code, reason) { this.code = code; this.reason = reason; } }
class Pending { constructor(reason) { this.reason = reason; } }
class Blocked { constructor(reason) { this.reason = reason; } }

const CALC = {
  C8: (g) => g('C6') * g('C7'),
  C9: (g, p) => g('C8') * p.pMin,
  C10: (g, p) => g('C8') * p.pMax,
  C11: (g, p) => g('C8') * p.pTope,
  F7: (g, p) => p.contrib.some(c => eqi(c, g('C5'))) ? p.f7Yes : p.f7No,
  // Excedió: kWh por encima del máximo permitido (F5 - C10); si no supera el límite, 0 (valor numérico, no texto).
  F8: (g) => g('F5') > g('C10') ? (g('F5') - g('C10')) : 0,
  F9: (g, p) => g('F5') < g('C9') ? Math.min((g('F5') - g('C9')) * -1, g('C11')) : p.noAhorro,
  F10: (g, p) => eqi(g('F7'), p.f10Test) ? p.f10Yes : p.f10No,
  F11: (g, p) => eqi(g('F7'), p.f11Test) ? g('F6') * p.pTarifa : g('F6'),
  F12: (g, p, m) => {
    const k = g('C5'); const row = (m.factor ? m.factor.rows : []).find(r => eqi(r.key, k));
    if (!row) throw new XlErr('#N/A', `«${k}» no está en la tabla ${p.factorName}`);
    if (typeof row.val !== 'number') throw new XlErr('#VALUE!', `El factor de «${k}» no es numérico`);
    return row.val;
  },
  F13: (g) => g('F11') * g('F12'),
  F14: (g) => typeof g('F8') === 'number' ? g('F8') * g('F13') : 0,
  F18: (g, p) => g('F17') === '' ? '' : excelRound(g('F14') - g('F17'), p.roundDigits),
  F19: (g, p) => g('F17') === '' ? '' : (g('F18') === 0 ? p.f19Cero : g('F18') > 0 ? p.f19Pos : p.f19Neg)
};
/** Nombre legible de una celda (entrada o fórmula) para mostrarlo al usuario en lugar de «C6», «F8»… */
export function refLabel(model, ref) {
  const m = (model.inputs && model.inputs[ref]) || (model.formulas && model.formulas[ref]);
  return m && m.label ? m.label : ref;
}
/** Dependencias estáticas (para bloquear dependientes de una entrada inválida). */
function staticDeps(model, cell, acc = new Set()) {
  const f = model.formulas[cell]; if (!f) return acc;
  for (const d of f.deps) { acc.add(d); staticDeps(model, d, acc); }
  return acc;
}
/**
 * inputs: { C5, C6, C7, F5, F6, F17 } → valores (null = falta; F17 '' = vacío permitido).
 * invalid: { C5: 'motivo' } → entradas que no superan la validación del Excel.
 */
export function calculateResults(model, inputs, invalid = {}) {
  const out = {}; const p = model.params;
  const invalidCells = Object.keys(invalid);
  const get = (ref) => {
    if (INPUT_CELLS.includes(ref)) {
      if (invalid[ref]) throw new Blocked(invalid[ref]);
      const v = inputs[ref];
      if (ref === 'F17') return v === null || v === undefined ? '' : v;
      if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) throw new Pending(`Falta ${model.inputs[ref].label}`);
      return v;
    }
    if (!(ref in out)) evaluate(ref);
    const r = out[ref];
    if (r.state === 'ok') return r.value;
    if (r.state === 'error') throw new XlErr(r.code, r.reason);
    if (r.state === 'blocked') throw new Blocked(r.reason);
    if (r.state === 'unsupported') throw new Blocked(`Depende de «${refLabel(model, ref)}», cuya fórmula no es compatible`);
    throw new Pending(r.reason);
  };
  const evaluate = (ref) => {
    const f = model.formulas[ref];
    if (!f.ok) { out[ref] = { state: 'unsupported', reason: 'Fórmula no compatible: no se reproduce para no inventar resultados' }; return; }
    const deps = staticDeps(model, ref);
    const inv = invalidCells.find(c => deps.has(c));
    if (inv) { out[ref] = { state: 'blocked', reason: invalid[inv], by: inv }; return; }
    try {
      const v = CALC[ref](get, p, model);
      if (typeof v === 'number' && !isFinite(v)) throw new XlErr('#DIV/0!', 'Resultado no finito');
      out[ref] = { state: 'ok', value: v };
    } catch (e) {
      if (e instanceof XlErr) out[ref] = { state: 'error', code: e.code, reason: e.reason };
      else if (e instanceof Pending) out[ref] = { state: 'pending', reason: e.reason };
      else if (e instanceof Blocked) out[ref] = { state: 'blocked', reason: e.reason };
      else out[ref] = { state: 'error', code: '#ERR', reason: e.message };
    }
  };
  for (const ref of Object.keys(model.formulas)) if (!(ref in out)) evaluate(ref);
  return out;
}
/** Autoverificación: recalcula con las entradas guardadas en el Excel y compara con los resultados guardados. */
export function selfTest(model) {
  const inputs = {}; for (const r of INPUT_CELLS) inputs[r] = model.inputs[r].value;
  if (inputs.F17 === null) inputs.F17 = '';
  const res = calculateResults(model, inputs);
  const rows = []; let pass = 0, total = 0;
  for (const [ref, f] of Object.entries(model.formulas)) {
    if (f.cached === null || f.cached === undefined) continue;
    total++;
    const r = res[ref]; let ok = false;
    if (r.state === 'ok') {
      if (typeof r.value === 'number' && typeof f.cached === 'number') ok = Math.abs(r.value - f.cached) <= 1e-9 * Math.max(1, Math.abs(f.cached));
      else ok = String(r.value) === String(f.cached);
    }
    if (ok) pass++;
    rows.push({ ref, expected: f.cached, got: r.state === 'ok' ? r.value : (r.code || r.state), ok });
  }
  return { pass, total, rows, inputs };
}
/** Reglas de validación de las entradas del calculador (las mismas del Excel). Se reutiliza en la pantalla y en la observación. */
export function validateCalcInputs(m, inputs) {
  const clase = inputs.C5;
  const invalid = {};
  if (clase && m.rules.C5 && !m.rules.C5.values.some(v => eqi(v, clase))) invalid.C5 = `«${clase}» no es una clase de servicio válida`;
  if (inputs.C7 !== null && m.rules.C7 && !m.rules.C7.values.map(Number).includes(inputs.C7)) invalid.C7 = `Días fuera de la lista permitida (${m.rules.C7.values[0]}–${m.rules.C7.values[m.rules.C7.values.length - 1]})`;
  for (const c of ['F5', 'F6']) { const ru = m.rules[c]; if (inputs[c] !== null && ru && ru.operator === 'greaterThanOrEqual' && inputs[c] < ru.min) invalid[c] = `${m.inputs[c].label} debe ser ≥ ${ru.min}`; }
  if (inputs.C6 === null) invalid.C6 = 'Falta la meta (o los días facturados para convertir la meta del ciclo en meta diaria)';
  else if (inputs.C6 <= 0) invalid.C6 = 'META DIARIA no válida (debe ser mayor que 0)';
  return invalid;
}
