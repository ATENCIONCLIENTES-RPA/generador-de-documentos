import { numStr } from '../lib/format.js';
import { FIELDS } from './extract.js';
import { CONF_MIN, CONF_OK, dateMs, lookupCuenta, parseFor } from './parse.js';
import { S } from '../state.js';

export function validateExtractedData(ex, model) {
  const out = {};
  for (const f of FIELDS) {
    const e = ex.fields[f.key];
    if (!e) { out[f.key] = { key: f.key, status: 'faltante', note: f.key === 'total' ? (ex.seen && ex.seen.total ? 'Se encontró «Total Facturado», pero no un importe legible a su derecha' : 'No se encontró la etiqueta «Total Facturado» en la imagen') : 'No se encontró la etiqueta o su valor en la imagen', source: null, notes: [] }; continue; }
    const v = { key: f.key, raw: e.raw, conf: Math.round(e.conf || 0), region: e.region, valueBox: e.valueBox, labelBoxes: e.labelBoxes || [], cross: e.cross || null, reads: e.reads || [], how: e.how, source: 'ocr', notes: [] };
    const reads = [{ text: e.raw, conf: e.conf, src: 'general' }, ...(e.reads || []).map(r => ({ ...r, src: 'recorte ' + r.variant }))];
    const parsed = reads.map(r => ({ r, p: parseFor(f, r.text, model) }));
    const okp = parsed.filter(x => x.p.ok);
    if (!okp.length) { v.status = 'ilegible'; v.note = parsed[0].p.reason || 'No se pudo leer'; out[f.key] = v; continue; }
    const votes = new Map(); for (const x of okp) { const k = String(x.p.value); votes.set(k, (votes.get(k) || []).concat(x)); }
    const ranked = [...votes.entries()].sort((a, b) => b[1].length - a[1].length || (b[1].some(x => x.r.src === 'general') ? 1 : 0) - (a[1].some(x => x.r.src === 'general') ? 1 : 0));
    let [wk, wv] = ranked[0];
    if (f.type === 'id') {
      const inBase = ranked.find(([k]) => lookupCuenta(k));
      const gen = ranked.find(([, xs]) => xs.some(x => x.r.src === 'general'));
      [wk, wv] = inBase || gen || ranked[0];
      if (!inBase) {
        if (S.data && !S.data.maxLen) { let mx = 0; for (const k of S.data.index.keys()) if (k.length > mx) mx = k.length; S.data.maxLen = mx; }
        const maxLen = S.data ? S.data.maxLen : 7;
        const cands = new Set([...okp.map(x => String(x.p.value)), ...okp.flatMap(x => x.p.alts || [])]);
        const longer = '1' + wk;
        if (cands.has(longer) && longer.length <= maxLen) { const short = wk; wv = okp.filter(x => [short, longer].includes(String(x.p.value))).map(x => ({ ...x, p: { ...x.p, value: longer } })); wk = longer; v.caretFix = true; }
      }
    }
    const win = wv[0].p;
    v.value = win.value; v.votes = `${wv.length}/${reads.length}`;
    v.conf = Math.round(Math.max(...wv.map(x => x.r.conf || 0)));
    const others = ranked.filter(([k]) => k !== wk).map(([k]) => k);
    let doubt = false;
    if (others.length) { doubt = true; v.notes.push(`Otras lecturas: ${others.map(o => f.type === 'decimal' ? o.replace('.', ',') : o).join(' / ')}`); }
    if (wv.length < 2 && reads.length > 1) doubt = true;
    if (wv.some(x => x.p.fixed)) { doubt = true; v.notes.push('Se corrigieron caracteres parecidos (O→0, l→1, S→5…)'); }
    if (win.ambiguous) { doubt = true; v.notes.push(f.type === 'text' ? 'Clase aproximada: verifica' : 'Separador decimal/miles ambiguo'); }
    if (win.normalized) v.notes.push(`«${e.raw}» → «${win.value}» (lista del calculador)`);
    if (f.type === 'id') {
      if (win.cursor || v.caretFix) { v.notes.push('Había un cursor de texto delante del número: confirma el primer dígito'); doubt = true; }
      if (S.data) {
        const hit = lookupCuenta(String(win.value));
        const altHit = !hit && (win.alts || []).map(lookupCuenta).find(Boolean);
        if (hit) v.notes.push('Existe en la base de cuentas');
        else if (altHit) { v.value = altHit; v.notes.push(`Ajustada a ${altHit}, que sí existe en la base`); doubt = true; }
        else { v.notes.push('No existe en la base de cuentas cargada'); doubt = true; }
      }
    }
    const rule = f.cell ? model.inputs[f.cell].rule : null;
    if (rule && rule.type === 'list' && f.type !== 'text' && !rule.values.map(Number).includes(v.value)) v.parseError = `Fuera de la lista permitida (${rule.values[0]}–${rule.values[rule.values.length - 1]})`;
    if (rule && rule.type === 'decimal' && rule.operator === 'greaterThanOrEqual' && v.value < rule.min) v.parseError = `Debe ser ≥ ${rule.min}`;
      if (f.key === 'total') {
        const peso = x => '$' + numStr(x, 0, true);
        if (!(v.value > 0)) v.parseError = 'El Total Facturado debe ser mayor que $0';
        else if (String(Math.round(v.value)).length > 12) v.parseError = 'Importe fuera de rango';
        const dist = (e.alts || []).map(a => parseFor(f, a.text, model)).filter(p => p.ok && String(p.value) !== String(v.value));
        if (dist.length) v.parseError = `Hay varios «Total Facturado» con valores distintos (${[v.value, ...dist.map(d => d.value)].map(peso).join(' / ')})`;
      }
    if (e.cross) {
      const pc = parseFor(f, e.cross.text, model);
      if (pc.ok && String(pc.value) === String(v.value)) { v.notes.push(`Coincide con ${e.cross.from}`); if (wv.length >= 2 && !win.ambiguous && !wv.some(x => x.p.fixed)) doubt = false; }
      else if (pc.ok) { doubt = true; v.notes.push(`${e.cross.from} indica «${e.cross.text}»`); }
    }
    if (v.parseError) { v.status = 'ilegible'; v.note = v.parseError; v.suggest = v.value; v.value = undefined; }
    else if (v.conf < CONF_MIN && wv.length < 2) { v.status = 'ilegible'; v.note = `Confianza baja (${v.conf}%): «${e.raw}»`; v.suggest = v.value; v.value = undefined; }
    else if (f.key === 'total' && (others.length || win.ambiguous)) {
      v.status = 'ilegible'; v.note = 'Lectura ambigua del Total Facturado: valídalo manualmente'; v.suggest = v.value; v.value = undefined;
    }
    else if (doubt || (v.conf < CONF_OK && wv.length < 3)) { v.status = 'revisar'; v.note = v.conf < CONF_OK ? `Confianza ${v.conf}%` : 'Verifica el valor'; }
    else v.status = 'ok';
    out[f.key] = v;
  }
  const dd = out.desde, hh = out.hasta;
  if (dd && hh && dd.value && hh.value) {
    const a = dateMs(dd.value), b = dateMs(hh.value);
    if (a !== null && b !== null && a > b) for (const x of [dd, hh]) { if (x.status === 'ok') x.status = 'revisar'; x.note = 'Periodo Desde es posterior a Periodo Hasta'; x.notes = [...(x.notes || []), 'Periodo Desde es posterior a Periodo Hasta: verifica que no estén cruzados']; }
  }
  return out;
}
