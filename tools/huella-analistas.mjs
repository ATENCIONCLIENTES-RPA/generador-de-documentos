import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const SAL = 'essa-sc-v1';
const canon = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  .replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const h = n => createHash('sha256').update(SAL + '|' + canon(n)).digest('hex').slice(0, 24);
const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const FILE = 'src/modules/cuadro/analistas.huellas.ts';
// Las huellas de plazo no vienen del archivo de rutas: si el JSON no las trae,
// se conservan las que ya estaban generadas para no revocar accesos por error.
let prevPlazo = [];
try {
  const prev = readFileSync(FILE, 'utf8');
  const m = prev.match(/HUELLAS_PLAZO[^=]*=\s*\[([\s\S]*?)\]/);
  if (m) prevPlazo = [...m[1].matchAll(/'([0-9a-f]{24})'/g)].map(x => x[1]);
} catch (e) { prevPlazo = []; }
const plazo = (Array.isArray(src.plazo) && src.plazo.length ? src.plazo.map(h) : prevPlazo)
  .filter((v, i, a) => a.indexOf(v) === i).sort();
const lines = [
  `export const SAL_ANALISTAS='${SAL}';`,
  `export const HUELLAS_PLAZO: string[] = [${plazo.map(x => `'${x}'`).join(', ')}];`,
  'export const HUELLAS_RUTAS: Record<string,string[]> = {'];
for (const [k, v] of Object.entries(src.rutas)) lines.push(`  ${k}: [${v.map(h).sort().map(x => `'${x}'`).join(', ')}],`);
lines.push('};');
writeFileSync(FILE, lines.join('\n') + '\n');
console.log('Huellas generadas:', Object.values(src.rutas).flat().length, '· plazo:', plazo.length);
