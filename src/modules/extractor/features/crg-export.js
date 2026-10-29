/* ==========================================================================
   CRG · Publicación de resultados hacia el Módulo 3
   El extractor se abre en SU PROPIA PESTAÑA (no vive en un iframe del shell),
   por lo que no tiene acceso a window.AD. El puente con «Generación Documental»
   es el localStorage compartido (mismo origen). Aquí se publican SOLO los nueve
   campos con marcador Word definidos; los valores y su formato son exactamente
   los que ya calcula y muestra la tabla de resultados (fmtExcel del modelo),
   de modo que no se duplica lógica ni se alteran los cálculos.
   ========================================================================== */
import { fmtExcel } from '../lib/format.js';
import { getPeriodData, S } from '../state.js';

/** Clave compartida con el Módulo 3 (src/modules/documentos/main.ts). */
export const CRG_LS = 'essa.extractor.creg.v1';

let lastJson = '';

/** Texto de una celda con el MISMO formato que la tabla de resultados; vacío si no hay dato. */
function fmtCell(meta, v) {
  if (!meta || v === null || v === undefined || v === '') return '';
  return fmtExcel(v, meta.fmt).text;
}
const asText = v => (v === null || v === undefined ? '' : String(v));

/** Payload vacío: sin cálculo no hay datos que publicar (así se limpia lo anterior). */
const emptyPayload = () => ({ periodoDesde: '', periodoHasta: '', periodo: '', consumoRegistrado: '',
  numeroCiclos: '', metaIndividual: '', metaCicloLimite: '', consumoExcedente: '', observacionCreg: '' });

/** Los nueve campos mapeados a sus marcadores Word (ver CREG_MAP en el Módulo 3). */
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
    /* Igual que la tabla de resultados: el exceso en 0 se muestra «0» (no «0,00»). */
    consumoExcedente: val('F8') === 0 ? '0' : fmtCell(m.formulas && m.formulas.F8, val('F8')),
    observacionCreg: (obs && obs.texto) || (S.lastObs && S.lastObs.texto) || ''
  };
}

/** Publica (o limpia, con `calc` nulo) el resultado para el Módulo 3. */
export function publishCrg(calc, obs) {
  const json = JSON.stringify(buildCrgPayload(calc, obs));
  if (json === lastJson) return;
  /* Una pestaña recién abierta (sin datos todavía) NO borra lo que otra pestaña con datos ya publicó:
     sólo se limpia cuando esta misma sesión ya había publicado algo. */
  if (!calc && !lastJson) return;
  lastJson = json;
  try { localStorage.setItem(CRG_LS, json); } catch (e) { /* almacenamiento no disponible */ }
}
