import { MODEL } from './calc/model.js';

export const INV_KEYS = ['clase', 'dias', 'periodo', 'desde', 'hasta', 'consumo', 'cu'];
export const INV_DEF = {
  clase: { cell: 'C5', type: 'text', label: 'Clase de servicio' },
  dias: { cell: 'C7', type: 'int', label: 'Número de Ciclos/Días Facturados' },
  consumo: { cell: 'F5', type: 'int', label: 'Consumo Registrado kWh' },
  cu: { cell: 'F6', type: 'decimal', label: 'CU (Costo)' },
  periodo: { cell: null, type: 'period', label: 'Periodo', optional: true },
  desde: { cell: null, type: 'date', label: 'Periodo Desde', optional: true },
  hasta: { cell: null, type: 'date', label: 'Periodo Hasta', optional: true }
};
export function getPeriodData() {
  const g = k => (S.inv[k] && S.inv[k].value !== null && S.inv[k].value !== undefined && S.inv[k].value !== '') ? S.inv[k].value : null;
  return { periodo: g('periodo'), periodoDesde: g('desde'), periodoHasta: g('hasta') };
}
export const blankField = () => ({ value: null, text: '', source: null, status: null, conf: null, note: '', notes: [], region: null, ocrValue: null, ocrText: '' });
export const S = {
  data: null, model: MODEL,
  img: null, work: null, ocr: null, ex: null, val: null, ocrState: 'idle', running: null,
  inv: Object.fromEntries(INV_KEYS.map(k => [k, blankField()])),
  ocrCuenta: null, confirmed: false,
  account: null, dupChoices: null, claseChoice: null, lastQuery: '',
  metaUnit: 'ciclo', prevOcrCuenta: null,
  autoCuenta: null,
  invHad: false,
  obsEdit: null,
  metaFor: null
};
