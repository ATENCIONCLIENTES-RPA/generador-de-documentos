import { clamp, compact, similarity } from '../lib/utils.js';
import { OCR, mapWords, meanConf } from './engine.js';
import { enhanceCrop, pageScale } from './image.js';
import { looksDate, looksPeriod } from './parse.js';

export const FIELDS = [
  { key: 'cuenta', label: 'Número de cuenta', cell: null, type: 'id' },
  { key: 'clase', label: 'Clase de servicio', cell: 'C5', type: 'text' },
  { key: 'dias', label: 'Número de Ciclos/Días Facturados', cell: 'C7', type: 'int' },
  { key: 'consumo', label: 'Consumo Registrado kWh', cell: 'F5', type: 'int' },
  { key: 'cu', label: 'CU (Costo)', cell: 'F6', type: 'decimal' },
  { key: 'periodo', label: 'Periodo', cell: null, type: 'period' },
  { key: 'desde', label: 'Periodo Desde', cell: null, type: 'date' },
  { key: 'hasta', label: 'Periodo Hasta', cell: null, type: 'date' }
];
const FIELD = Object.fromEntries(FIELDS.map(f => [f.key, f]));
const LABELS = [
  { id: 'codigo', alias: ['codigo'] },
  { id: 'clServicio', alias: ['cl servicio', 'cl. servicio'] },
  { id: 'claseServicio', alias: ['clase servicio'] },
  { id: 'costo', alias: ['costo'] },
  { id: 'diasF', alias: ['dias f', 'dias f.', 'dias facturados'] },
  { id: 'consumoActiva', alias: ['consumo activa'] },
  { id: 'consumoReactiva', alias: ['consumo reactiva'] },
  { id: 'consumoComun', alias: ['consumo comun'] },
  { id: 'cantidad', alias: ['cantidad'] },
  { id: 'valor', alias: ['valor'] },
  { id: 'concepto', alias: ['concepto'] },
  { id: 'nombre', alias: ['nombre'] },
  { id: 'consecutivo', alias: ['consecutivo'] },
  { id: 'totalFacturado', alias: ['total facturado'] },
  { id: 'totalPagar', alias: ['total pagar', 'total a pagar', 'valor a pagar'] },
  { id: 'saldoAnterior', alias: ['saldo anterior'] },
  { id: 'subtotal', alias: ['subtotal', 'sub total'] },
  { id: 'nroFactura', alias: ['nro. factura', 'nro factura'] },
  { id: 'estado', alias: ['estado'] },
  { id: 'grupoCU', alias: ['grupo cu'] },
  { id: 'facturacionDe', alias: ['facturacion de', 'facturacion de:'] },
  { id: 'periodoDesde', alias: ['periodo desde'] },
  { id: 'periodoHasta', alias: ['periodo hasta'] },
  { id: 'fFacturacion', alias: ['f. facturacion', 'f facturacion'] },
  { id: 'fVencimiento', alias: ['f. vencimiento', 'f vencimiento'] },
  { id: 'fSuspension', alias: ['f. suspension', 'f suspension'] }
];
const simThreshold = n => n <= 3 ? 1 : n <= 6 ? 0.8 : 0.88;

function groupLines(words) {
  const ws = [...words].sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1)); const lines = [];
  for (const w of ws) {
    const hgt = w.y1 - w.y0;
    const L = lines.find(l => Math.min(l.y1, w.y1) - Math.max(l.y0, w.y0) >= 0.5 * Math.min(l.y1 - l.y0, hgt));
    if (L) { L.items.push(w); L.y0 = Math.min(L.y0, w.y0); L.y1 = Math.max(L.y1, w.y1); } else lines.push({ y0: w.y0, y1: w.y1, items: [w] });
  }
  return lines.map(l => { l.items.sort((a, b) => a.x0 - b.x0); return l.items; });
}
function findLabels(lines) {
  const out = [];
  lines.forEach((line, li) => {
    const used = new Set(); const cands = [];
    for (let i = 0; i < line.length; i++) for (let k = 1; k <= 3 && i + k <= line.length; k++) {
      const toks = line.slice(i, i + k);
      if (k > 1 && toks.some((t, j) => j > 0 && t.x0 - toks[j - 1].x1 > 1.8 * (t.y1 - t.y0))) continue;
      const txt = toks.map(t => t.text).join(' ');
      for (const L of LABELS) for (const al of L.alias) {
        const sc = similarity(txt, al); if (sc >= simThreshold(compact(al).length)) cands.push({ id: L.id, score: sc + k * 0.001, i, k });
      }
    }
    cands.sort((a, b) => b.score - a.score);
    for (const c of cands) {
      let clash = false; for (let j = c.i; j < c.i + c.k; j++) if (used.has(j)) clash = true; if (clash) continue;
      for (let j = c.i; j < c.i + c.k; j++) used.add(j);
      const ws = line.slice(c.i, c.i + c.k);
      out.push({ id: c.id, score: c.score, line: li, start: c.i, end: c.i + c.k, words: ws, x0: ws[0].x0, x1: ws[ws.length - 1].x1, y0: Math.min(...ws.map(w => w.y0)), y1: Math.max(...ws.map(w => w.y1)) });
    }
  });
  return out;
}
const hasDigits = t => /\d/.test(t);
const numericTok = t => /^[\[\]|(]?[$]?[0-9OoIlSB][0-9OoIlSB.,]*$/.test(t) && hasDigits(t);
const unionBox = ws => ({ x0: Math.min(...ws.map(w => w.x0)), y0: Math.min(...ws.map(w => w.y0)), x1: Math.max(...ws.map(w => w.x1)), y1: Math.max(...ws.map(w => w.y1)) });
function valueRight(lab, lines, labels, { maxFirstGap = 14, maxGap = 3, accept = () => true } = {}) {
  const line = lines[lab.line]; const h = Math.max(6, lab.y1 - lab.y0);
  const labelIdx = new Set(labels.filter(l => l.line === lab.line).flatMap(l => Array.from({ length: l.end - l.start }, (_, j) => l.start + j)));
  const out = []; let prev = lab.x1;
  for (let i = lab.end; i < line.length; i++) {
    if (labelIdx.has(i)) break;
    const w = line[i]; const gap = w.x0 - prev;
    if (!out.length) { if (gap > maxFirstGap * h) break; if (!accept(w, true)) { prev = w.x1; continue; } }
    else if (gap > maxGap * h) break;
    out.push(w); prev = w.x1;
  }
  return out;
}

export async function runOCR(img, work, onProgress) {
  const S = pageScale(img.w);
  onProgress('Leyendo la página completa', 0);
  const page = enhanceCrop(work, { x0: 0, y0: 0, x1: img.w, y1: img.h }, S, 'A', 0);
  const res = await OCR.recognize(page, { psm: 11 });
  const words = cleanWords(mapWords(res.words, page._map));
  return { words, scale: S };
}
const cleanWords = ws => ws.filter(w => /[\p{L}\p{N}]/u.test(w.text));
async function rereadValue(work, box, kind) {
  const h = Math.max(6, box.y1 - box.y0);
  const S = clamp(Math.round(40 / h), 3, 8);
  const p = 0.4 * h;
  const bx = { x0: box.x0 - p, y0: box.y0 - p, x1: box.x1 + p, y1: box.y1 + p };
  const wl = kind === 'id' ? '0123456789' : kind === 'text' ? '' : kind === 'money' ? '0123456789.,$' : (kind === 'period' || kind === 'date') ? '0123456789-/.' : '0123456789.,';
  const reads = [];
  for (const [v, sc] of [['A', S], ['M', Math.max(3, S - 1)]]) {
    const cv = enhanceCrop(work, bx, sc, v, 24);
    const r = await OCR.recognize(cv, { psm: 7, whitelist: wl });
    const t = (r.text || '').replace(/\s+/g, kind === 'text' ? ' ' : '').trim();
    if (t) reads.push({ text: t, conf: Math.round(r.confidence || 0), variant: v });
  }
  return reads;
}

export function extractTargetFields(words) {
  const lines = groupLines(words);
  const labels = findLabels(lines);
  const byId = id => labels.filter(l => l.id === id).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const fields = {}; const found = {};
  const mk = (key, lab, ws, how, extra = {}) => {
    const box = unionBox(ws); const all = unionBox([...lab.words, ...ws]);
    fields[key] = { key, raw: ws.map(w => w.text).join(' '), conf: meanConf(ws), valueBox: box, labelBoxes: [{ ...unionBox(lab.words), text: lab.words.map(w => w.text).join(' ') }], region: { ...all, w: all.x1 - all.x0, h: all.y1 - all.y0 }, how, source: 'ocr', words: ws, ...extra };
  };
  for (const lab of byId('codigo')) {
    const ws = valueRight(lab, lines, labels, { maxFirstGap: 10, accept: w => hasDigits(w.text) && /^[^\w]{0,2}[0-9OoIlSBZ]{1,15}$/.test(w.text) });
    if (ws.length) { mk('cuenta', lab, [ws[0]], 'A la derecha de «Código»'); break; }
  }
  const claseFrom = lab => valueRight(lab, lines, labels, { maxFirstGap: 14, maxGap: 2.2, accept: (w, first) => !(first && /^\d{1,2}$/.test(w.text)) && /[a-záéíóúñ]/i.test(w.text) });
  for (const id of ['clServicio', 'claseServicio']) {
    for (const lab of byId(id)) {
      const ws = claseFrom(lab); if (!ws.length) continue;
      if (!fields.clase) mk('clase', lab, ws, id === 'clServicio' ? 'A la derecha de «Cl Servicio»' : 'A la derecha de «Clase Servicio» (panel Facturas)');
      else if (!fields.clase.cross) fields.clase.cross = { text: ws.map(w => w.text).join(' '), from: 'Clase Servicio (panel Facturas)', box: unionBox(ws), labelBox: unionBox(lab.words) };
      break;
    }
  }
  for (const [key, id, name] of [['cu', 'costo', 'Costo'], ['dias', 'diasF', 'Días F.']]) {
    for (const lab of byId(id)) {
      const ws = valueRight(lab, lines, labels, { maxFirstGap: 12 });
      if (ws.length) { mk(key, lab, [ws[0]], `A la derecha de «${name}»`); break; }
    }
  }
  const head = byId('cantidad')[0];
  const panel = byId('consumoActiva').filter(l => !head || l.y1 <= head.y0).map(l => ({ l, ws: valueRight(l, lines, labels, { maxFirstGap: 10, accept: w => numericTok(w.text) }) })).find(o => o.ws.length);
  if (panel) mk('consumo', panel.l, [panel.ws[0]], 'A la derecha de «Consumo Activa» (panel Facturas)');
  for (const [key, id, name, shape] of [['periodo', 'facturacionDe', 'Facturación de', looksPeriod], ['desde', 'periodoDesde', 'Periodo Desde', looksDate], ['hasta', 'periodoHasta', 'Periodo Hasta', looksDate]]) {
    for (const lab of byId(id).filter(l => !head || l.y1 <= head.y0)) {
      let ws = valueRight(lab, lines, labels, { maxFirstGap: 14, maxGap: 1.2, accept: w => shape(w.text) });
      if (!(ws.length && shape(ws[0].text))) {
        ws = valueRight(lab, lines, labels, { maxFirstGap: 14, maxGap: 1.2, accept: w => hasDigits(w.text) && w.text.length >= 6 });
        if (!ws.length) continue;
      }
      mk(key, lab, [ws[0]], `A la derecha de «${name}»`); break;
    }
  }
  return { fields, labels, lines, unassigned: [], seen: {} };
}
export async function rereadFields(work, ex, onProgress) {
  const keys = FIELDS.map(f => f.key).filter(k => ex.fields[k]);
  for (let i = 0; i < keys.length; i++) {
    const e = ex.fields[keys[i]]; onProgress(`Verificando ${FIELD[keys[i]].label.toLowerCase()}`, i / keys.length);
    e.reads = await rereadValue(work, e.valueBox, FIELD[keys[i]].type);
  }
}
