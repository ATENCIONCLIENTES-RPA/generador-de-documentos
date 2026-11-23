/* Pruebas reales del botón «Mejorar texto» (Módulo 3).
   Compila src/modules/documentos/corrector.ts con esbuild y ejecuta el mismo
   código que corre en el navegador, sin simular resultados.

   Uso: node tools/test-corrector.mjs
*/
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'corrector-'));
const outfile = join(dir, 'corrector.mjs');
const outfileOrt = join(dir, 'ortografia.mjs');

await build({
  entryPoints: ['src/modules/documentos/corrector.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile,
  logLevel: 'error',
});

await build({
  entryPoints: ['src/modules/documentos/ortografia.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: outfileOrt,
  logLevel: 'error',
});

const { mejorarTextoLocal, setOrtografia } = await import(pathToFileURL(outfile).href);
const { corregirOrtografia } = await import(pathToFileURL(outfileOrt).href);
setOrtografia(corregirOrtografia);

let fallos = 0;
let total = 0;
const revisar = (nombre, ok, detalle) => {
  total++;
  if (ok) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.log(`  FALLA ${nombre}`);
    if (detalle) console.log(`        ${detalle}`);
  }
};
const incluye = (r, ...trozos) => trozos.every(t => r.includes(t));
const excluye = (r, ...trozos) => trozos.every(t => !r.includes(t));
const ver = s => JSON.stringify(s);

/* ── 1. Casos obligatorios ─────────────────────────────────────────────────── */
console.log('\nCasos obligatorios');

const c1 = mejorarTextoLocal('El usuario no a presentado la documentacion solicitada.').texto;
revisar('tildes y auxiliar: «no a presentado la documentacion»',
  incluye(c1, 'no ha presentado', 'documentación', 'solicitada.') && excluye(c1, ' no a ', 'documentacion'),
  ver(c1));

const c2 = mejorarTextoLocal('Los documentos fue enviado ayer.').texto;
revisar('concordancia: «Los documentos fue enviado»',
  incluye(c2, 'Los documentos fueron enviados ayer'), ver(c2));

const c3 = mejorarTextoLocal('Señor juez solicito que se revise el expediente y se emita una respuesta.').texto;
revisar('puntuación: coma tras el vocativo y texto completo',
  incluye(c3, 'Señor juez, solicito que se revise el expediente y se emita una respuesta.') &&
  excluye(c3, 'solicitó'), ver(c3));

const c4 = mejorarTextoLocal('La pruebas aportados demuestra que el demandante tiene razón.').texto;
revisar('concordancia de género y número: «La pruebas aportados demuestra»',
  incluye(c4, 'Las pruebas aportadas demuestran que el demandante tiene razón'), ver(c4));

const c5 = mejorarTextoLocal('El funcionario no revisaron los documentos.').texto;
revisar('conjugación: «El funcionario no revisaron»',
  incluye(c5, 'El funcionario no revisó los documentos'), ver(c5));

const c6 = mejorarTextoLocal('Se verifico que el tramite se realizo sin novedad.').texto;
revisar('pretéritos tras «se» y tildes',
  incluye(c6, 'Se verificó', 'trámite', 'se realizó', 'sin novedad'), ver(c6));

/* ── 2. Párrafo combinado ──────────────────────────────────────────────────── */
console.log('\nPárrafo con errores combinados');
const combinado = mejorarTextoLocal(
  'Señor juez el usuario no a presentado la documentacion solicitada. ' +
  'Los documentos fue enviado ayer y la pruebas aportados demuestra que el funcionario no revisaron el expediente.'
).texto;
revisar('corrige todos los errores del párrafo',
  incluye(combinado,
    'Señor juez, el usuario no ha presentado la documentación solicitada.',
    'Los documentos fueron enviados ayer',
    'las pruebas aportadas demuestran',
    'el funcionario no revisó el expediente'),
  ver(combinado));

/* ── 3. Integridad de datos jurídicos ──────────────────────────────────────── */
console.log('\nIntegridad de nombres, cifras y referencias');
const juridico =
  'Mediante el radicado 73409007 (2728), la señora Alba Yaneth Leal solicitó el 12 de octubre de 2026 ' +
  'la revisión de la actuación. El artículo 29 de la Constitución Política y el Decreto 2591 de 1991 ' +
  'regulan la materia; el expediente 2026-00451 se encuentra en el Juzgado Primero Administrativo.';
const rJuridico = mejorarTextoLocal(juridico).texto;
for (const dato of [
  '73409007 (2728)', 'Alba Yaneth Leal', '12 de octubre de 2026', 'artículo 29',
  'Constitución Política', 'Decreto 2591 de 1991', '2026-00451',
  'Juzgado Primero Administrativo',
]) {
  revisar(`conserva «${dato}»`, rJuridico.includes(dato), ver(rJuridico));
}

const correo = 'Escriba a soporte@essa.com.co o consulte https://www.essa.com.co/radicados antes del 30/11/2026.';
const rCorreo = mejorarTextoLocal(correo).texto;
revisar('conserva correo, enlace y fecha',
  incluye(rCorreo, 'soporte@essa.com.co', 'https://www.essa.com.co/radicados', '30/11/2026'), ver(rCorreo));

const marcador = 'Se radica [RADICADO] con [NOMBRE_SOLICITANTE] el [FECHA] en la oficina.';
const rMarcador = mejorarTextoLocal(marcador).texto;
revisar('conserva marcadores de plantilla',
  incluye(rMarcador, '[RADICADO]', '[NOMBRE_SOLICITANTE]', '[FECHA]'), ver(rMarcador));

/* ── 4. Textos correctos: no se deben alterar ──────────────────────────────── */
console.log('\nTextos ya correctos');
const correctos = [
  'Los documentos fueron enviados ayer.',
  'El funcionario revisó los documentos y emitió una respuesta.',
  'Las pruebas aportadas demuestran que el demandante tiene razón.',
  'El usuario ha presentado la documentación solicitada.',
  'Señor juez, solicito que se revise el expediente y se emita una respuesta.',
  'La solicitud fue radicada el 15 de octubre de 2026 y se encuentra en estudio.',
];
for (const texto of correctos) {
  const r = mejorarTextoLocal(texto).texto;
  revisar(`sin cambios: ${texto.slice(0, 44)}…`, r === texto, ver(r));
}

/* ── 5. Idempotencia ──────────────────────────────────────────────────────── */
console.log('\nIdempotencia');
const fuentes = [
  'El usuario no a presentado la documentacion solicitada.',
  'Los documentos fue enviado ayer.',
  'La pruebas aportados demuestra que el demandante tiene razón.',
  'El funcionario no revisaron los documentos.',
  combinado,
];
for (const fuente of fuentes) {
  const una = mejorarTextoLocal(fuente).texto;
  const dos = mejorarTextoLocal(una).texto;
  revisar(`segunda pasada estable: ${una.slice(0, 40)}…`, una === dos, ver(dos));
}

/* ── 6. Párrafos y estructura ─────────────────────────────────────────────── */
console.log('\nEstructura');
const parrafos = mejorarTextoLocal(
  'PRIMERO. El usuario no a presentado la documentacion.\n\nSEGUNDO. Los documentos fue enviado ayer.'
).texto;
revisar('mantiene los dos párrafos', parrafos.split('\n\n').length === 2, ver(parrafos));

const pregunta = mejorarTextoLocal('que documentos se anexaron al expediente?').texto;
revisar('pregunta sin apertura: agrega «¿» y tilde',
  pregunta.startsWith('¿Qué documentos'), ver(pregunta));

const vacio = mejorarTextoLocal('').texto;
revisar('texto vacío permanece vacío', vacio === '', ver(vacio));

rmSync(dir, { recursive: true, force: true });

console.log(`\n${total - fallos}/${total} pruebas correctas`);
if (fallos) {
  console.error(`${fallos} prueba(s) fallaron`);
  process.exit(1);
}
