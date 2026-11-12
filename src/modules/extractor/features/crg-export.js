import { fmtExcel } from '../lib/format.js';
import { getPeriodData, S } from '../state.js';

export const CRG_LS = 'essa.extractor.creg.v1';

let lastJson = '';

function fmtCell(meta, v) {
  if (!meta || v === null || v === undefined || v === '') return '';
  return fmtExcel(v, meta.fmt).text;
}
const asText = v => (v === null || v === undefined ? '' : String(v));

const emptyPayload = () => ({ periodoDesde: '', periodoHasta: '', periodo: '', consumoRegistrado: '',
  numeroCiclos: '', metaIndividual: '', metaCicloLimite: '', consumoExcedente: '', observacionCreg: '' });

export function buildCrgPayload(calc, obs) {
  if (!calc) return emptyPayload();
  const m = S.model || {};
  const inputs = calc.inputs || {};
  const res = calc.res || {};
  const val = k => (res[k] && res[k].state === 'ok') ? res[k].value : null;
  const pd = calc.periodo || getPeriodData();
  return {
    periodoDesde: asText(pd.periodoDesde),
    periodoHasta: asText(pd.periodoHasta),
    periodo: asText(pd.periodo),
    consumoRegistrado: fmtCell(m.inputs && m.inputs.F5, inputs.F5),
    numeroCiclos: fmtCell(m.inputs && m.inputs.C7, inputs.C7),
    metaIndividual: fmtCell(m.formulas && m.formulas.C8, val('C8')),
    metaCicloLimite: fmtCell(m.formulas && m.formulas.C10, val('C10')),
    consumoExcedente: val('F8') === 0 ? '0' : fmtCell(m.formulas && m.formulas.F8, val('F8')),
    observacionCreg: (obs && obs.texto) || (S.lastObs && S.lastObs.texto) || ''
  };
}

export function publishCrg(calc, obs) {
  const json = JSON.stringify(buildCrgPayload(calc, obs));
  if (json === lastJson) return;
  if (!calc && !lastJson) return;
  lastJson = json;
  try { localStorage.setItem(CRG_LS, json); } catch (e) { }
}
