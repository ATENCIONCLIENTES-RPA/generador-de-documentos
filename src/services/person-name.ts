// @ts-nocheck — lógica legada sin cambios (tests de caracterización en tests/person-name.test.ts).
/* =====================================================================
   Asistente Documental · PersonName
   Fuente única para interpretar nombres de personas (p. ej. [PRIMER_NOMBRE]).
   Prioridad: 1) PRIMER_NOMBRE  2) NOMBRES  3) nombre completo sin las columnas de apellidos
   4) "Apellidos, Nombres"  5) convención de la organización "Nombres Apellidos" (1.ª palabra).
   ===================================================================== */
export const PersonName = (function () {
  'use strict';
  const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'di', 'du', 'van', 'von', 'der', 'den']);
  const TRATAMIENTOS = new Set(['sr', 'sra', 'srta', 'senor', 'senora', 'senorita', 'don', 'dona', 'dr', 'dra', 'doctor', 'doctora', 'ing', 'lic', 'abg', 'abog', 'prof', 'mg']);
  const RELLENO = new Set(['anonimo', 'anonima', 'nn', 'na', 'sin', 'nombre', 'desconocido', 'desconocida', 'ninguno', 'null', 'undefined', 'xx', 'xxx']);
  const clave = w => String(w || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ]/g, '');
  const tieneLetra = w => /\p{L}/u.test(w);
  function palabras(texto) {
    return String(texto == null ? '' : texto).normalize('NFC').replace(/\([^)]*\)/g, ' ')
      .replace(/[^\p{L}\p{M}'’\-.\s]/gu, ' ').split(/\s+/)
      .map(w => w.replace(/^[-'’.]+|[-'’]+$/g, '')).filter(w => w && tieneLetra(w));
  }
  function formatoPalabra(w) {
    return String(w || '').toLocaleLowerCase('es-CO').replace(/(^|[-'’])(\p{L})/gu, (m, sep, ch) => sep + ch.toLocaleUpperCase('es-CO'));
  }
  const esInicial = w => clave(w).length === 1;
  const esRelleno = ws => ws.length > 0 && ws.every(w => RELLENO.has(clave(w)));
  function primeroDe(ws) {
    let i = 0;
    while (i < ws.length - 1 && TRATAMIENTOS.has(clave(ws[i]))) i++;
    const resto = ws.slice(i).filter(w => !PARTICULAS.has(clave(w)));
    const pleno = resto.find(w => !esInicial(w));
    return pleno ? formatoPalabra(pleno.replace(/\.+$/, '')) : '';
  }
  function sinApellidos(ws, apellidos) {
    const ks = ws.map(clave), a = apellidos.map(palabras).filter(x => x.length);
    if (!a.length) return null;
    const todos = a.flat().map(clave);
    if (todos.length === ks.length && todos.every((x, j) => ks[j] === x)) return [];
    const candidatos = [a.flat()].concat(a.length > 1 ? a : []);
    for (const sec of candidatos) {
      const s = sec.map(clave), n = s.length;
      if (!n || n >= ks.length) continue;
      if (s.every((x, j) => ks[ks.length - n + j] === x)) return ws.slice(0, ks.length - n);
      if (s.every((x, j) => ks[j] === x)) return ws.slice(n);
    }
    return null;
  }
  function parse(input) {
    const o = input || {};
    const directo = palabras(o.firstName);
    if (directo.length && !esRelleno(directo)) { const f = primeroDe(directo); if (f) return { firstName: f, source: 'firstName' }; }
    const pila = palabras(o.givenNames);
    if (pila.length && !esRelleno(pila)) { const f = primeroDe(pila); if (f) return { firstName: f, source: 'givenNames' }; }
    const bruto = String(o.fullName == null ? '' : o.fullName), ws = palabras(bruto.replace(/,/g, ' '));
    if (!ws.length || esRelleno(ws)) return { firstName: '', source: 'empty' };
    const restante = sinApellidos(ws, Array.isArray(o.surnames) ? o.surnames : []);
    if (restante && !restante.length) return { firstName: '', source: 'surnamesOnly' };
    if (restante && restante.length) { const f = primeroDe(restante); if (f) return { firstName: f, source: 'surnames' }; }
    const partes = bruto.split(',').map(x => x.trim()).filter(Boolean);
    if (partes.length === 2) { const f = primeroDe(palabras(partes[1])); if (f) return { firstName: f, source: 'comma' }; }
    return { firstName: primeroDe(ws), source: 'convention' };
  }
  return Object.freeze({ parse, firstGivenName: input => parse(input).firstName, words: palabras, formatWord: formatoPalabra });
})();
