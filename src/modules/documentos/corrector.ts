/* ────────────────────────────────────────────────────────────────────────────
   Corrector local del Módulo 3.

   Trabaja en español y en tres capas:
   1. Ortografía y tildes (ortografia.ts).
   2. Gramática: concordancia de número y género, auxiliares, conjugación y
      construcciones frecuentes de la lengua administrativa.
   3. Puntuación, mayúsculas y estructura de las oraciones.

   Todo el proceso es local. Las cifras, radicados, correos, enlaces, marcadores
   [TOKEN] y siglas con números se protegen antes de tocar el texto y se
   restauran al final, de modo que nunca se alteran.
   ──────────────────────────────────────────────────────────────────────────── */

export type ResultadoMejora = { texto: string; notas: string[]; cambiado: boolean };

/* Mismo patrón que usa el módulo para proteger datos sensibles. */
const RE_PROTEGIDO = /(\[[^\]\n]{1,160}\]|https?:\/\/[^\s]+|www\.[^\s]+|\b[\w.+-]+@[\w.-]+\.\w+\b|\b\d[\d.,/:+-]*\d\b|\b[A-ZÁÉÍÓÚÜÑ]{2,}\d[\w./-]*\b)/g;
const RE_MARCA = /\u0001(\d+)\u0001/g;

export function protegerTexto(texto: string): { texto: string; restaurar: (s: string) => string } {
  const guardados: string[] = [];
  const protegido = String(texto == null ? '' : texto).replace(RE_PROTEGIDO, m => {
    guardados.push(m);
    return '\u0001' + (guardados.length - 1) + '\u0001';
  });
  return {
    texto: protegido,
    restaurar: (s: string) => s.replace(RE_MARCA, (_, i) => guardados[+i] ?? ''),
  };
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const casa = (original: string, rep: string): string => {
  if (!original) return rep;
  if (original.length > 1 && original === original.toUpperCase()) return rep.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return rep[0].toUpperCase() + rep.slice(1);
  return rep;
};

/* ── Concordancia de determinante y sustantivo ─────────────────────────────── */

const DET_PL_F: Record<string, string> = {
  la: 'las', una: 'unas', esta: 'estas', esa: 'esas', aquella: 'aquellas',
  mucha: 'muchas', poca: 'pocas', toda: 'todas', otra: 'otras', ninguna: 'ningunas',
};
const DET_PL_M: Record<string, string> = {
  la: 'los', una: 'unos', esta: 'estos', esa: 'esos', aquella: 'aquellos',
  mucha: 'muchos', poca: 'pocos', toda: 'todos', otra: 'otros', ninguna: 'ningunos',
};

/* Sustantivos (o formas) terminados en -s que son singulares. */
const SINGULAR_EN_S = new Set([
  'crisis', 'tesis', 'hipotesis', 'sintesis', 'dosis', 'res', 'diabetes', 'analisis',
  'enfasis', 'paralisis', 'fibrosis', 'neurosis', 'prognosis', 'atis', 'itis', 'osis',
  'mas', 'menos', 'demas', 'ademas', 'despues', 'antes', 'entonces', 'mientras',
  'siempre', 'nunca', 'jamas', 'quiza', 'quizas', 'aqui', 'alli', 'alla', 'atras',
  'detras', 'arriba', 'abajo', 'cerca', 'lejos', 'dentro', 'fuera', 'tampoco',
  'tambien', 'asi', 'aun', 'pues', 'aparte', 'encima', 'debajo', 'delante',
]);

/* ── Conjugación: singular ↔ plural (3.ª persona) ──────────────────────────── */

const PARES = `
  presenta:presentan solicita:solicitan requiere:requieren informa:informan
  comunica:comunican remite:remiten envia:envían recibe:reciben revisa:revisan
  verifica:verifican aprueba:aprueban niega:niegan rechaza:rechazan acepta:aceptan
  responde:responden senala:señalan indica:indican establece:establecen
  determina:determinan concluye:concluyen considera:consideran manifiesta:manifiestan
  expone:exponen argumenta:argumentan allega:allegan aporta:aportan adjunta:adjuntan
  acredita:acreditan certifica:certifican autoriza:autorizan ordena:ordenan
  dispone:disponen cumple:cumplen incumple:incumplen genera:generan causa:causan
  afecta:afectan perjudica:perjudican exige:exigen corresponde:corresponden
  aplica:aplican procede:proceden reconoce:reconocen confirma:confirman
  demuestra:demuestran
  ratifica:ratifican modifica:modifican amplia:amplían prorroga:prorrogan
  suspende:suspenden termina:terminan finaliza:finalizan inicia:inician radica:radican
  registra:registran asigna:asignan traslada:trasladan resuelve:resuelven decide:deciden
  declara:declaran precisa:precisan aclara:aclaran corrige:corrigen subsana:subsanan
  actualiza:actualizan tramita:tramitan gestiona:gestionan objeta:objetan apela:apelan
  revoca:revocan sanciona:sancionan ocurre:ocurren sucede:suceden existe:existen
  falta:faltan sobra:sobran consta:constan figura:figuran rige:rigen
  es:son está:están estaba:estaban era:eran fue:fueron ha:han tiene:tienen hace:hacen
  dice:dicen puede:pueden debe:deben va:van da:dan será:serán tendrá:tendrán
  deberá:deberán podrá:podrán
`;
const V_PL: Record<string, string> = {};
const V_SG: Record<string, string> = {};
PARES.split(/\s+/).filter(Boolean).forEach(par => {
  const [s, p] = par.split(':');
  if (!s || !p) return;
  V_PL[norm(s)] = p;
  V_SG[norm(p)] = s;
});
/* Irregulares frecuentes que no siguen la regla general. */
Object.assign(V_SG, {
  hicieron: 'hizo', dijeron: 'dijo', trajeron: 'trajo', pusieron: 'puso',
  supieron: 'supo', vieron: 'vio', dieron: 'dio', estuvieron: 'estuvo',
  tuvieron: 'tuvo', anduvieron: 'anduvo', hubieron: 'hubo',
});

function pluralizaVerbo(k: string): string {
  if (V_PL[k]) return V_PL[k];
  /* Pretéritos regulares: -ó → -aron; -ió → -ieron. */
  if (/ió$/.test(k) && k.length >= 5) return k.slice(0, -3) + 'ieron';
  if (/ó$/.test(k) && k.length >= 4) return k.slice(0, -1) + 'aron';
  return '';
}

function singularizaVerbo(k: string): string {
  if (V_SG[k]) return V_SG[k];
  /* Pretéritos regulares: -aron → -ó; -ieron → -ió. */
  if (/aron$/.test(k) && k.length >= 6) return k.slice(0, -4) + 'ó';
  if (/ieron$/.test(k) && k.length >= 7) return k.slice(0, -5) + 'ió';
  /* Presentes: -an → -a; -en → -e. */
  if (/an$/.test(k) && k.length >= 4) return k.slice(0, -1);
  if (/en$/.test(k) && k.length >= 4) return k.slice(0, -1);
  return '';
}

function pluralizaParticipio(p: string, fem: boolean): string {
  if (/o$/.test(p)) return fem ? p.slice(0, -1) + 'as' : p + 's';
  if (/a$/.test(p)) return p + 's';
  return p;
}

/* ── Artículos + palabras ambiguas (sustantivo vs. verbo) ──────────────────── */

const AMBIGUAS: Record<string, string> = {
  publico: 'público', publica: 'pública', publicas: 'públicas',
  practico: 'práctico', practica: 'práctica', practicas: 'prácticas',
  critico: 'crítico', critica: 'crítica', criticas: 'críticas',
  termino: 'término', terminos: 'términos', genero: 'género', generos: 'géneros',
  calculo: 'cálculo', calculos: 'cálculos', titulo: 'título', titulos: 'títulos',
  diagnostico: 'diagnóstico', diagnosticos: 'diagnósticos',
};

/* ── Verbos en pretérito tras «se» impersonal ──────────────────────────────── */

const PRET: Record<string, string> = {
  verifico: 'verificó', realizo: 'realizó', solicito: 'solicitó', presento: 'presentó',
  informo: 'informó', comunico: 'comunicó', remitio: 'remitió', envio: 'envió',
  recibio: 'recibió', reviso: 'revisó', aprobo: 'aprobó', nego: 'negó',
  rechazo: 'rechazó', acepto: 'aceptó', respondio: 'respondió', indico: 'indicó',
  establecio: 'estableció', determino: 'determinó', concluyo: 'concluyó',
  considero: 'consideró', manifesto: 'manifestó', argumento: 'argumentó',
  adjunto: 'adjuntó', genero: 'generó', causo: 'causó', afecto: 'afectó',
  exigio: 'exigió', aplico: 'aplicó', procedio: 'procedió', confirmo: 'confirmó',
  modifico: 'modificó', amplio: 'amplió', suspendio: 'suspendió', termino: 'terminó',
  finalizo: 'finalizó', inicio: 'inició', radico: 'radicó', registro: 'registró',
  asigno: 'asignó', traslado: 'trasladó', resolvio: 'resolvió', decidio: 'decidió',
  declaro: 'declaró', aclaro: 'aclaró', corrigio: 'corrigió', subsano: 'subsanó',
  actualizo: 'actualizó', tramito: 'tramitó', gestiono: 'gestionó', ordeno: 'ordenó',
  expidio: 'expidió', emitio: 'emitió', publico: 'publicó', practico: 'practicó',
  critico: 'criticó', calculo: 'calculó',
};

const PARTICIPIO = '[a-záéíóúüñ]{2,}(?:ado|ada|ados|adas|ido|ida|idos|idas)';
const PARTICIPIO_IRREG = 'hecho|dicho|visto|puesto|vuelto|abierto|escrito|muerto|roto|resuelto|devuelto|cubierto|impuesto|supuesto|expuesto|propuesto|compuesto|dispuesto';
const PARTICIPIO_TOTAL = '(' + PARTICIPIO + '|' + PARTICIPIO_IRREG + ')';

const DET_PL = 'Las|Los|Estas|Estos|Esas|Esos|Aquellas|Aquellos|Muchas|Muchos|Varias|Varios|Algunas|Algunos';
const DET_SG = 'El|La|Un|Una|Este|Esta|Ese|Esa|Aquel|Aquella|Mi|Tu|Su|Nuestro|Nuestra';

const RE_PL_PART = new RegExp('\\b(' + DET_PL + ')\\s+([a-záéíóúüñ]+)((?:\\s+[a-záéíóúüñ]+){0,1})\\s+(fue|es|está|era)\\s+([a-záéíóúüñ]+)\\b', 'gi');
const RE_PL_VERB = new RegExp('\\b(' + DET_PL + ')\\s+([a-záéíóúüñ]+)((?:\\s+[a-záéíóúüñ]+){0,1})\\s+([a-záéíóúüñ]+)\\b', 'gi');
const RE_SG_VERB = new RegExp('\\b(' + DET_SG + ')\\s+([a-záéíóúüñ]+)((?:\\s+[a-záéíóúüñ]+){0,1})\\s+([a-záéíóúüñ]+)\\b', 'gi');

function corrigeGramatica(t: string): string {
  /* «no a presentado» → «no ha presentado» (auxiliar haber). */
  t = t.replace(new RegExp('\\b(a)\\s+(' + PARTICIPIO_TOTAL + ')\\b', 'gi'),
    (m, a, p) => casa(a, 'ha') + ' ' + p);

  /* «la pruebas» → «las pruebas»; «una documentos» → «unos documentos». */
  t = t.replace(/\b(la|una|esta|esa|aquella|mucha|poca|toda|otra)\s+([a-záéíóúüñ]{4,}s)\b/gi, (m, det, sust) => {
    const k = norm(sust);
    if (SINGULAR_EN_S.has(k)) return m;
    const masc = /os$/.test(k);
    const rep = (masc ? DET_PL_M : DET_PL_F)[norm(det)];
    return rep ? casa(det, rep) + ' ' + sust : m;
  });

  /* «pruebas aportados» → «pruebas aportadas» (participio adjetivo). */
  t = t.replace(/\b([a-záéíóúüñ]{3,}as)\s+([a-záéíóúüñ]{3,})(ados|idos)\b/gi, (m, sust, raiz, suf) => {
    if (!/as$/.test(norm(sust))) return m;
    const rep = raiz + (suf === 'ados' ? 'adas' : 'idas');
    return sust + ' ' + casa(raiz + suf, rep);
  });

  /* «Los documentos fue enviado» → «Los documentos fueron enviados». */
  t = t.replace(RE_PL_PART, (m, det, sust, mid, verbo, part) => {
    if (/\b(que|quien|quienes|cual|cuales|donde|cuando|como|porque|se|y)\b/i.test(mid)) return m;
    const v = V_PL[norm(verbo)];
    if (!v) return m;
    const fem = /as$/.test(norm(sust)) || /^las$|^estas$|^esas$|^aquellas$|^muchas$|^varias$|^algunas$/i.test(det);
    return det + ' ' + sust + mid + ' ' + casa(verbo, v) + ' ' + pluralizaParticipio(part, fem);
  });

  /* «Las pruebas demuestra» → «Las pruebas demuestran». */
  t = t.replace(RE_PL_VERB, (m, det, sust, mid, verbo) => {
    if (/\b(que|quien|quienes|cual|cuales|donde|cuando|como|porque|se|y)\b/i.test(mid)) return m;
    const v = pluralizaVerbo(norm(verbo));
    if (!v) return m;
    return det + ' ' + sust + mid + ' ' + casa(verbo, v);
  });

  /* «El funcionario no revisaron» → «El funcionario no revisó». */
  t = t.replace(RE_SG_VERB, (m, det, sust, mid, verbo) => {
    if (/\b(que|quien|quienes|cual|cuales|donde|cuando|como|porque|se|y)\b/i.test(mid)) return m;
    const v = singularizaVerbo(norm(verbo));
    if (!v) return m;
    return det + ' ' + sust + mid + ' ' + casa(verbo, v);
  });

  /* «el publico» → «el público» (sustantivo, no verbo). */
  t = t.replace(/\b(el|un|este|ese|aquel|del|al|la|una|esta|esa|aquella)\s+([a-záéíóúüñ]+)\b/gi,
    (m, art, w) => {
      const rep = AMBIGUAS[norm(w)];
      return rep ? art + ' ' + casa(w, rep) : m;
    });

  /* «se verifico» → «se verificó». */
  t = t.replace(/\b(se\s+)([a-záéíóúüñ]+)\b/gi, (m, a, w) => {
    const r = PRET[norm(w)];
    return r ? a + casa(w, r) : m;
  });

  /* Impersonales: «hubieron problemas» → «hubo problemas». */
  t = t.replace(/\bhubieron\b/gi, m => casa(m, 'hubo'));
  t = t.replace(/\bhabían\s+(muchos|muchas|varios|varias|algunos|algunas|dos|tres)\b/gi,
    (m, n) => 'había ' + n);

  return t;
}

/* ── Puntuación ─────────────────────────────────────────────────────────────── */

function puntua(t: string, notas: string[]): string {
  const antes = t;
  t = t.replace(/[ \t]+([,.;:!?…])/g, '$1');
  t = t.replace(/([¿¡([«"'])[ \t]+/g, '$1');
  t = t.replace(/([,;:])(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9¿¡"«(])/g, '$1 ');
  t = t.replace(/([a-záéíóúüñ])([.!?])(?=[A-ZÁÉÍÓÚÜÑ])/g, '$1$2 ');
  t = t.replace(/\.{2,}/g, '.').replace(/,{2,}/g, ',').replace(/;{2,}/g, ';').replace(/:{2,}/g, ':');
  t = t.replace(/([!?])\1+/g, '$1');
  t = t.replace(/\s+([)\]»"])/g, '$1');
  /* Coma antes de «pero», «sin embargo» y «no obstante» cuando unen oraciones. */
  t = t.replace(/([a-záéíóúüñ0-9])\s+(pero)\s+/gi, (m, a, b) => a + ', ' + b + ' ');
  t = t.replace(/([a-záéíóúüñ0-9])\s+(sin embargo|no obstante)\s+/gi, (m, a, b) => a + ', ' + b + ' ');
  if (t !== antes) notas.push('Puntuación');
  return t;
}

/* ── Mayúsculas, preguntas y estructura de la oración ─────────────────────── */

function capitalizaOraciones(t: string, notas: string[]): string {
  const antes = t;
  const INTERROG: Record<string, string> = {
    que: 'qué', como: 'cómo', cuando: 'cuándo', donde: 'dónde', quien: 'quién',
    quienes: 'quiénes', cual: 'cuál', cuales: 'cuáles', cuanto: 'cuánto',
    cuanta: 'cuánta', cuantos: 'cuántos', cuantas: 'cuántas',
  };
  const capitaliza = (s: string) => s.replace(/^([¿¡\s]*)([a-záéíóúüñ])/, (m, a, b) => a + b.toUpperCase());
  const VOCATIVO = /^((?:Señor|Señora|Sr\.|Sra\.|Doctor|Doctora|Dr\.|Dra\.|Juez|Jueza|Magistrado|Magistrada|Honorable)\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.]+)(?:\s*,\s*|\s+)/;
  const CONECTOR = /^((?:Sin embargo|No obstante|Además|Asimismo|Por lo tanto|En consecuencia|Por consiguiente|En primer lugar|En segundo lugar|Finalmente|Igualmente|De igual manera|Por el contrario|En cambio|Por otra parte))(\s+)(?!de\b|que\b|del\b)/i;

  const tiOracion = (p: string): string => {
    let s = p;
    if (/\?$/.test(s) && !s.includes('¿')) s = '¿' + s;
    if (/!$/.test(s) && !s.includes('¡')) s = '¡' + s;
    if (/^¿/.test(s) && /[.!]$/.test(s)) s = s.slice(0, -1) + '?';
    if (/^¡/.test(s) && /[.!]$/.test(s)) s = s.slice(0, -1) + '!';
    s = capitaliza(s);
    s = s.replace(VOCATIVO, (m, cab) => cab.replace(/\s*,\s*$/, '') + ', ');
    s = s.replace(CONECTOR, (m, con) => con + ', ');
    if (!/^[¿¡]/.test(s)) return s;
    s = s.replace(/^([¿¡]\s*)(que|como|cuando|donde|quien|quienes|cual|cuales|cuanto|cuanta|cuantos|cuantas)\b/i,
      (m, a, w) => {
        const r = INTERROG[w.toLowerCase()];
        return a + (w[0] === w[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r);
      });
    s = s.replace(/^([¿¡]\s*)por que\b/i, (m, a) => a + 'por qué');
    return s;
  };

  const lineas = t.split('\n').map(linea => {
    const s = linea.trim();
    if (!s) return '';
    return s.split(/(?<=[.!?])\s+/).filter(Boolean).map(tiOracion).join(' ');
  });
  t = lineas.join('\n');
  for (let i = lineas.length - 1; i >= 0; i--) {
    if (!lineas[i]) continue;
    if (/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9)\]"»]$/.test(lineas[i])) {
      lineas[i] += '.';
      notas.push('Cierre de la última oración');
    }
    break;
  }
  t = lineas.join('\n').trim();
  if (t !== antes) notas.push('Mayúsculas y apertura de oraciones');
  return t;
}

/* ── Ortografía bajo demanda ─────────────────────────────────────────────────
   El diccionario (ortografia.ts) pesa varios MB. El módulo lo carga aparte y
   lo inyecta aquí cuando está listo, para no bloquear la apertura del módulo. */
export type OrtografiaFn = (texto: string) => string;
let ortografia: OrtografiaFn | null = null;
export function setOrtografia(fn: OrtografiaFn | null): void { ortografia = fn; }
export function tieneOrtografia(): boolean { return ortografia !== null; }

/* ── Proceso completo ──────────────────────────────────────────────────────── */

export function mejorarTextoLocal(raw: string): ResultadoMejora {
  const original = String(raw == null ? '' : raw).replace(/\r\n?/g, '\n');
  const notas: string[] = [];
  const p = protegerTexto(original);
  let t = p.texto;

  const antesEsp = t;
  t = t.replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/[ \t]+/g, ' ');
  t = t.replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (t !== antesEsp) notas.push('Espacios y saltos de línea');

  const antesRep = t;
  t = t.replace(/\b(que|el|la|los|las|un|una|de|en|por|para|con|y|a)\s+\1\b/gi, '$1');
  if (t !== antesRep) notas.push('Palabras repetidas');

  const antesOrt = t;
  if (ortografia) t = ortografia(t);
  if (t !== antesOrt) notas.push('Ortografía, tildes y erratas');

  const antesGram = t;
  t = corrigeGramatica(t);
  if (t !== antesGram) notas.push('Gramática y concordancia');

  t = puntua(t, notas);
  t = capitalizaOraciones(t, notas);
  t = p.restaurar(t);
  return { texto: t, notas: [...new Set(notas)], cambiado: t !== original.trim() };
}
