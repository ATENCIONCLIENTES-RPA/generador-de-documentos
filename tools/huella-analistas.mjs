import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const SAL = 'essa-sc-v1';
const canon = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  .replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const h = n => createHash('sha256').update(SAL + '|' + canon(n)).digest('hex').slice(0, 24);
const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const lines = [
  `export const SAL_ANALISTAS='${SAL}';`, 'export const HUELLAS_RUTAS: Record<string,string[]> = {'];
for (const [k, v] of Object.entries(src.rutas)) lines.push(`  ${k}: [${v.map(h).sort().map(x => `'${x}'`).join(', ')}],`);
lines.push('};');
writeFileSync('src/modules/cuadro/analistas.huellas.ts', lines.join('\n') + '\n');
console.log('Huellas generadas:', Object.values(src.rutas).flat().length);
