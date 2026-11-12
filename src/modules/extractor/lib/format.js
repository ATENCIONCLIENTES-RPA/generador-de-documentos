
export function excelRound(x, d = 0) {
  const m = Math.pow(10, d);
  const v = +(Math.abs(x) * m).toPrecision(15);
  return Math.sign(x) * Math.round(v) / m;
}
export function numStr(x, dec, group) {
  const r = excelRound(Math.abs(x), dec);
  let [i, f] = r.toFixed(dec).split('.');
  if (group) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return f ? i + ',' + f : i;
}
function fmtGeneral(v) {
  if (Number.isInteger(v)) return String(v);
  let s = String(+v.toPrecision(10));
  if (s.includes('e')) return v.toExponential(4).replace('.', ',');
  return s.replace('.', ',');
}
export function fmtExcel(v, code) {
  if (v === '' || v === null || v === undefined) return { text: '—', red: false };
  if (typeof v !== 'number') return { text: String(v), red: false };
  code = code || 'General';
  const sec = code.split(';');
  let c = (v < 0 && sec[1]) ? sec[1] : sec[0];
  const red = /\[red\]/i.test(c);
  c = c.replace(/\[[^\]]*\]/g, '');
  if (/general/i.test(c)) return { text: fmtGeneral(v), red };
  const pct = c.includes('%');
  const m = c.replace(/"[^"]*"/g, '').match(/0\.(0+)/);
  const dec = m ? m[1].length : 0;
  const group = /#,##0|#,#/.test(c);
  const cur = c.includes('$');
  const x = pct ? v * 100 : v;
  const sign = v < 0 ? '-' : '';
  return { text: sign + (cur ? '$ ' : '') + numStr(x, dec, group) + (pct ? '%' : ''), red };
}
