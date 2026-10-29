/* Interpretación de números, importes, clases, periodos y fechas. */
import { compact, norm, similarity } from '../lib/utils.js';
import { S } from '../state.js';

const AMBIG = { O: '0', o: '0', D: '0', Q: '0', I: '1', l: '1', '|': '1', i: '1', S: '5', s: '5', B: '8', Z: '2', z: '2', G: '6', g: '9' };
function fixDigits(s) { let changed = false; const out = s.replace(/[OoDQIl|iSsBZzGg]/g, c => { changed = true; return AMBIG[c]; }); return { out, changed }; }
/**
 * Interpreta un número reconocido. El sistema de origen muestra «1031.5922» (punto decimal) y
 * «997,935» (coma de miles); se respeta esa convención, pero los casos dudosos se marcan.
 */
/**
 * Importe en pesos. Acepta «160,252», «160.252», «3.153.849», «$ 160,252», «£160,252» (símbolo mal leído) y «160252».
 * Un único separador seguido de 3 dígitos (o varios con grupos de 3) es de MILES, tanto con punto como con coma.
 * Con 1–2 decimales (centavos) se interpreta, pero se marca como ambiguo. Todo lo demás se rechaza:
 * p. ej. «5160,252» (un «$» leído como «5») no es un importe válido y nunca se acepta en silencio.
 */
function parseMoney(s) {
  let t = String(s || '').replace(/\s+/g, ''), guess = false;
  t = t.replace(/^[$£€§¢]+/, '');
  if (/^[Ss]\d/.test(t)) { t = t.slice(1); guess = true; }          // «$» leído como «S»: se descarta, pero se marca para revisar
  const fx = fixDigits(t); t = fx.out;
  if (!/^\d[\d.,]*$/.test(t)) return { ok: false, reason: 'No es un importe' };
  const seps = t.match(/[.,]/g) || [];
  let value, ambiguous = guess;
  if (!seps.length) value = +t;
  else {
    const last = Math.max(t.lastIndexOf('.'), t.lastIndexOf(',')), tail = t.slice(last + 1), head = t.slice(0, last), sepLast = t[last];
    const other = sepLast === '.' ? ',' : '.', esc2 = c => '\\' + c;
    const sameSep = new Set(seps).size === 1;
    if (sameSep && /^\d{3}$/.test(tail) && new RegExp('^\\d{1,3}(' + esc2(sepLast) + '\\d{3})*$').test(head)) value = +t.replace(/[.,]/g, '');       // miles
    else if (/^\d{1,2}$/.test(tail) && (sameSep ? /^\d{1,3}$/.test(head) : new RegExp('^\\d{1,3}(' + esc2(other) + '\\d{3})+$').test(head))) {   // centavos
      value = +(head.replace(/[.,]/g, '') + '.' + tail); if (!Number.isInteger(value)) ambiguous = true;
    } else return { ok: false, reason: 'Separadores no válidos' };
  }
  if (!isFinite(value)) return { ok: false, reason: 'No es un importe' };
  return { ok: true, value, ambiguous, fixed: fx.changed, text: t };
}
export function parseNumberText(s, kind) {
  if (kind === 'money') return parseMoney(s);
  let t = String(s || '').replace(/[$\s]/g, '');
  const fx = fixDigits(t); t = fx.out;
  if (!/^\d[\d.,]*$/.test(t)) return { ok: false, reason: 'No es un número' };
  let ambiguous = false, value;
  const hasDot = t.includes('.'), hasComma = t.includes(',');
  if (hasDot && hasComma) { const dec = t.lastIndexOf('.') > t.lastIndexOf(',') ? '.' : ','; const th = dec === '.' ? ',' : '.'; value = +t.split(th).join('').replace(dec, '.'); }
  else if (hasComma) { if (/^\d{1,3}(,\d{3})+$/.test(t)) { value = +t.replace(/,/g, ''); ambiguous = kind === 'decimal'; } else if ((t.match(/,/g) || []).length === 1) value = +t.replace(',', '.'); else return { ok: false, reason: 'Separadores no válidos' }; }
  else if (hasDot) { if (/^\d{1,3}(\.\d{3}){2,}$/.test(t)) value = +t.replace(/\./g, ''); else if ((t.match(/\./g) || []).length === 1) { value = +t; if (kind !== 'decimal' || /^\d{1,3}\.\d{3}$/.test(t)) ambiguous = true; if (kind !== 'decimal' && /^\d{1,3}\.\d{3}$/.test(t)) value = +t.replace('.', ''); } else return { ok: false, reason: 'Separadores no válidos' }; }
  else value = +t;
  if (!isFinite(value)) return { ok: false, reason: 'No es un número' };
  return { ok: true, value, ambiguous, fixed: fx.changed, text: t };
}
/** Normaliza el texto de la clase a la lista de clases del calculador (Hoja1 / FACTOR). */
function mapClase(text, classList) {
  const n = norm(text); if (!n) return null;
  const exact = classList.find(c => norm(c) === n); if (exact) return { value: exact, exact: true };
  const res = n.match(/residencial\D*(\d)/);
  if (res) { const c = classList.find(x => norm(x) === 'residencial ' + res[1]); if (c) return { value: c, exact: false }; }
  const hits = classList.filter(c => !/\d/.test(c) && n.includes(norm(c)));
  if (hits.length === 1) return { value: hits[0], exact: false };
  const fuzzy = classList.map(c => ({ c, s: Math.max(...n.split(/[-–]/).map(p => similarity(p, c))) })).sort((a, b) => b.s - a.s)[0];
  if (fuzzy && fuzzy.s >= 0.75) return { value: fuzzy.c, exact: false, fuzzy: true };
  return null;
}
export const CONF_OK = 80, CONF_MIN = 50;
/** Corrige palabras de la clase leídas con errores («Resicencial» → «Residencial», «Est-ato» → «Estrato»). */
const CLASE_WORDS = ['residencial', 'comercial', 'industrial', 'oficial', 'provisionales', 'estrato', 'tension'];
function canonClase(t) {
  return String(t).split(/\s+/).map(w => {
    const c = compact(w); if (c.length < 5) return w;
    const best = CLASE_WORDS.map(k => ({ k, s: similarity(c, k) })).sort((a, b) => b.s - a.s)[0];
    return best.s >= 0.75 ? best.k : w;
  }).join(' ');
}
/* ---------- Periodo y fechas del documento (se conserva el formato tal como aparece) ---------- */
const DIG = '[0-9OoIlSBZ]';                                    // dígitos y caracteres que el OCR suele confundir con ellos
const RE_PERIOD = new RegExp('^(' + DIG + '{4})([-/.]?)(' + DIG + '{1,2})$');
const RE_PERIOD_INV = new RegExp('^(' + DIG + '{1,2})([-/.])(' + DIG + '{4})$');
const RE_DATE = new RegExp('^(' + DIG + '{1,2})([-/.])(' + DIG + '{1,2})\\2(' + DIG + '{4})$');
const cleanTok = s => String(s || '').replace(/\s+/g, '').replace(/^[\[\]|(]+/, '').replace(/[\])|]+$/, '');
export const looksPeriod = s => { const t = cleanTok(s); return /\d/.test(t) && (RE_PERIOD.test(t) || RE_PERIOD_INV.test(t)) && (/[-/.]/.test(t) || t.length === 6); };
export const looksDate = s => RE_DATE.test(cleanTok(s)) && /\d/.test(cleanTok(s));
/** «2026-10» (también «10-2026» o «202610»). El mes debe estar entre 1 y 12. Devuelve el texto tal como aparece. */
export function parsePeriodText(s) {
  const t = cleanTok(s); let y, mo, fixed = false;
  let m = t.match(RE_PERIOD), inv = false;
  if (!m) { m = t.match(RE_PERIOD_INV); inv = !!m; }
  if (!m) return { ok: false, reason: 'No parece un periodo (se espera, p. ej., 2026-10)' };
  const fx = x => { const r = fixDigits(x); if (r.changed) fixed = true; return r.out; };
  let out;
  if (inv) { mo = fx(m[1]); y = fx(m[3]); out = mo + m[2] + y; } else { y = fx(m[1]); mo = fx(m[3]); out = y + m[2] + mo; }
  if (!/^\d+$/.test(y + mo)) return { ok: false, reason: 'No parece un periodo' };
  if (+mo < 1 || +mo > 12) return { ok: false, reason: `Mes fuera de rango en «${out}»` };
  if (+y < 2000 || +y > 2100) return { ok: false, reason: `Año fuera de rango en «${out}»` };
  return { ok: true, value: out, fixed };
}
/** Fecha dd/mm/aaaa (se respeta el separador y el orden del documento). Valida que sea una fecha real. */
export function parseDateText(s) {
  const t = cleanTok(s); const m = t.match(RE_DATE);
  if (!m) return { ok: false, reason: 'No parece una fecha (se espera dd/mm/aaaa)' };
  let fixed = false; const fx = x => { const r = fixDigits(x); if (r.changed) fixed = true; return r.out; };
  const d = fx(m[1]), mo = fx(m[3]), y = fx(m[4]);
  if (!/^\d+$/.test(d + mo + y)) return { ok: false, reason: 'No parece una fecha' };
  const dt = new Date(Date.UTC(+y, +mo - 1, +d));
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d) return { ok: false, reason: `«${d}${m[2]}${mo}${m[2]}${y}» no es una fecha válida` };
  return { ok: true, value: d + m[2] + mo + m[2] + y, fixed };
}
/** dd/mm/aaaa → milisegundos UTC (null si no es una fecha válida). Sólo para comparar Desde/Hasta y contar días. */
export function dateMs(s) { const p = parseDateText(s); if (!p.ok) return null; const [d, mo, y] = p.value.split(/[-/.]/).map(Number); return Date.UTC(y, mo - 1, d); }
/** Interpreta una lectura según el tipo del campo. */
export function parseFor(f, text, model) {
  const t = String(text || '').trim(); if (!t) return { ok: false, reason: 'Vacío' };
  if (f.type === 'period') return parsePeriodText(t);
  if (f.type === 'date') return parseDateText(t);
  if (f.type === 'id') {
    // Un cursor de texto delante del número («|1237525», «[1237525») no es un dígito.
    const m = t.replace(/\s/g, '').match(/^([^0-9]{0,2})([0-9OoIlSBZ]{1,15})$/);
    if (!m) return { ok: false, reason: 'No parece un número de cuenta' };
    const fx = fixDigits(m[2]); if (!/^\d+$/.test(fx.out)) return { ok: false, reason: 'No parece un número de cuenta' };
    const alts = m[1] ? ['1' + fx.out] : [];   // el cursor puede tapar un «1» inicial
    return { ok: true, value: fx.out, fixed: fx.changed, alts, cursor: !!m[1] };
  }
  if (f.type === 'text') {
    const list = classOptions(model); const mc = mapClase(canonClase(t), list);
    if (!mc) return { ok: false, reason: `«${t}» no corresponde a ninguna clase del calculador` };
    return { ok: true, value: mc.value, ambiguous: !!mc.fuzzy, normalized: !mc.exact };
  }
  const p = parseNumberText(t.replace(/^[\[\]|(]+/, ''), f.type);
  if (!p.ok) return p;
  if (f.type === 'int' && !Number.isInteger(p.value)) return { ok: false, reason: 'Se esperaba un número entero' };
  return p;
}
export function lookupCuenta(v) {
  if (!S.data || !v) return null;
  if (S.data.index.has(v)) return v;
  const nz = S.data.indexNoZeros.get(v.replace(/^0+(?=\d)/, '')); return nz ? S.data.records[nz[0]].cuenta : null;
}
export function classOptions(model) {
  if (!model) return [];
  const rule = model.inputs.C5 && model.inputs.C5.rule;
  if (rule && rule.type === 'list') return rule.values.map(String);
  return model.factor ? model.factor.rows.map(r => r.key) : [];
}
