/* Estado global de la aplicación. */
import { MODEL } from './calc/model.js';

/* ==========================================================================
   12. ESTADO DE LA APLICACIÓN
   ========================================================================== */
export const INV_KEYS = ['clase', 'dias', 'periodo', 'desde', 'hasta', 'consumo', 'cu'];
export const INV_DEF = {
  clase: { cell: 'C5', type: 'text', label: 'Clase de servicio' },
  dias: { cell: 'C7', type: 'int', label: 'Número de Ciclos/Días Facturados' },
  consumo: { cell: 'F5', type: 'int', label: 'Consumo Registrado kWh' },
  cu: { cell: 'F6', type: 'decimal', label: 'CU (Costo)' },
  // Bloque «Meta del período»: opcionales (no entran en el cálculo del ajuste, así que su ausencia no bloquea nada)
  periodo: { cell: null, type: 'period', label: 'Periodo', optional: true },
  desde: { cell: null, type: 'date', label: 'Periodo Desde', optional: true },
  hasta: { cell: null, type: 'date', label: 'Periodo Hasta', optional: true }
};
/** Periodo, Periodo Desde y Periodo Hasta tal como quedaron en la app (OCR, corregidos o digitados). Disponible para procesos posteriores. */
export function getPeriodData() {
  const g = k => (S.inv[k] && S.inv[k].value !== null && S.inv[k].value !== undefined && S.inv[k].value !== '') ? S.inv[k].value : null;
  return { periodo: g('periodo'), periodoDesde: g('desde'), periodoHasta: g('hasta') };
}
export const blankField = () => ({ value: null, text: '', source: null, status: null, conf: null, note: '', notes: [], region: null, ocrValue: null, ocrText: '' });
export const S = {
  data: null, model: MODEL,          // la calculadora va integrada: no se carga ningún archivo de datos
  img: null, work: null, ocr: null, ex: null, val: null, ocrState: 'idle', running: null,
  inv: Object.fromEntries(INV_KEYS.map(k => [k, blankField()])),
  ocrCuenta: null, confirmed: false,
  account: null, dupChoices: null, claseChoice: null, lastQuery: '',
  metaUnit: 'ciclo', prevOcrCuenta: null,
  autoCuenta: null,   // cuenta que la app escribió sola en el campo «Cuenta» (a partir de la imagen)
  invHad: false,      // ¿«Datos de la factura» tenía datos en el último render? (para plegar/desplegar solo cuando cambia)
  obsEdit: null,      // borrador de «Observacion Creg» en edición: { key, draft }
  metaFor: null       // cuenta a la que pertenece la meta escrita, cuando el campo se vació al cargar otra imagen
};
