import nspell from 'nspell';

/**
 * Diccionario base en español con reglas morfológicas y afijos comunes
 * compatible con nspell y optimizado para ejecución en navegador y Node/Vitest.
 */
const ES_AFF = `
SET UTF-8
TRY aiosrncltdumpbvzgféhóíqáuxñyèjçwüAIEOSRNTCLDUMPBVZGQHXYJFW

PFX A Y 1
PFX A 0 des .

SFX B Y 2
SFX B 0 s [aeiouáéíóú]
SFX B 0 es [^aeiouáéíóú]
`;

const ES_DIC = `
100
cliente/B
usuario/B
solicitud/B
revisión/B
reclamación/B
facturación/B
factura/B
medidor/B
consumo/B
cobro/B
proceso/B
trámite/B
petición/B
queja/B
recurso/B
reposición/B
apelación/B
subsidio/B
estrato/B
lectura/B
instalación/B
suspensión/B
reconnexión/B
daño/B
perjuicio/B
servicio/B
energía/B
eléctrica/B
cuenta/B
radicado/B
respuesta/B
documento/B
solicita/B
manifiesta/B
informa/B
indica/B
presenta/B
requiere/B
acuerdo/B
conforme/B
inconforme/B
correcto/B
incorrecto/B
normal/B
elevado/B
injustificado/B
`;

let spellChecker: ReturnType<typeof nspell> | null = null;

try {
  spellChecker = nspell(ES_AFF, ES_DIC);
} catch {
  spellChecker = null;
}

const COMMON_TYPOS: Record<string, string> = {
  revision: 'revisión',
  reclamacion: 'reclamación',
  facturacion: 'facturación',
  instalacion: 'instalación',
  suspension: 'suspensión',
  reconexion: 'reconnexión',
  atencion: 'atención',
  peticion: 'petición',
  devolucion: 'devolución',
  reposicion: 'reposición',
  apelacion: 'apelación',
  informacion: 'información',
  descripcion: 'descripción',
  direccion: 'dirección',
  tramite: 'trámite',
  tramites: 'trámites',
  electrica: 'eléctrica',
  electricas: 'eléctricas',
  electrico: 'eléctrico',
  electricos: 'eléctricos',
  energia: 'energía',
  medicion: 'medición',
  liquidacion: 'liquidación',
  conexion: 'conexión',
  desconexion: 'desconexión',
  anomalia: 'anomalía',
  inspeccion: 'inspección',
  ubicacion: 'ubicación',
  verificacion: 'verificación',
  autorizacion: 'autorización',
  cancelacion: 'cancelación',
  danos: 'daños',
  dano: 'daño',
  despues: 'después',
  tambien: 'también',
  mas: 'más',
  dia: 'día',
  dias: 'días',
  ano: 'año',
  anos: 'años',
  esta: 'está',
  estara: 'estará',
  estan: 'están',
  solicito: 'solicitó',
  presento: 'presentó',
  realizo: 'realizó',
  envio: 'envió',
  tecnica: 'técnica',
  tecnico: 'técnico',
  tecnicos: 'técnicos',
  tecnicas: 'técnicas',
  oracion: 'oración',
  oraciones: 'oraciones',
  radicacion: 'radicación',
  cliante: 'cliente',
  clinte: 'cliente',
  usuaro: 'usuario',
  solisita: 'solicita',
  solisitud: 'solicitud',
  solicidud: 'solicitud',
  medidro: 'medidor',
  fatura: 'factura',
  servico: 'servicio',
  recivido: 'recibido',
};

const ACRONYMS = [
  'ESSA',
  'SAC',
  'PQR',
  'PQRS',
  'NIT',
  'CC',
  'TI',
  'CE',
  'ID',
  'DOC',
  'XLSX',
  'PDF',
  'S.A.',
  'E.S.P.',
  'ESP',
  'SA',
  'kWh',
  'kW',
  'kV',
  'kVA',
  'V',
  'OR',
  'UPME',
  'CREG',
  'SSPD',
];

// --- Optimizaciones: Sets, Map y cache para evitar trabajo repetido ---

const ACRONYMS_SET = new Set(ACRONYMS.map((a) => a.toUpperCase()));
// Para siglas con puntos, también guardar versión sin puntos para comparación flexible
const ACRONYMS_NORMALIZED = new Set(ACRONYMS.map((a) => a.replace(/\./g, '').toUpperCase()));

const DICTIONARY_SET = new Set(
  ES_DIC.split('\n')
    .slice(1)
    .map((line) => line.split('/')[0]?.trim().toLowerCase())
    .filter(Boolean)
);

const correctWordCache = new Map<string, string>();

// Regex precompilado para acrónimos (una sola pasada en lugar de 26)
// Los bordes excluyen @ . / y guion para no tocar correos ni URLs, pero
// permiten punto final de oración (punto NO seguido de letra).
const ACRONYM_PATTERN = ACRONYMS.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const ACRONYM_REGEX = new RegExp(
  `(?<![\\w@./-])(${ACRONYM_PATTERN})(?![\\w@/-]|\\.[A-Za-z])`,
  'gi'
);

function normalizeFlat(s: string): string {
  return s
    .toUpperCase()
    .replace(/[ÁÀÂÄ]/g, 'A')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[ÓÒÔÖ]/g, 'O')
    .replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/Ñ/g, 'N')
    .toLowerCase();
}

/** Verdadero si la distancia Levenshtein entre a y b es <= 1. */
function withinEditDistanceOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (la === lb) {
      i++;
      j++;
    } else if (la > lb) {
      i++;
    } else {
      j++;
    }
  }
  edits += la - i + (lb - j);
  return edits <= 1;
}

function isCloseSuggestion(orig: string, sug: string): boolean {
  if (!orig || !sug) return false;
  const a = normalizeFlat(orig);
  const b = normalizeFlat(sug);
  if (a === b) return true;
  return withinEditDistanceOne(a, b);
}

// ---------------------------------------------------------------------------
// Diccionario general de español (carga perezosa, fuera del bundle inicial)
// Datos: dictionary-es (wooorm/dictionaries), servidos desde src/assets/dict
// para funcionar en navegador (dev/build) y en Vitest. Se carga bajo demanda
// al usar "Mejorar texto" para no penalizar la carga inicial.
// ---------------------------------------------------------------------------

type SpellChecker = {
  correct(word: string): boolean;
  suggest(word: string): string[];
};

let fullChecker: SpellChecker | null = null;
let fullDictPromise: Promise<void> | null = null;

export function isFullDictionaryLoaded(): boolean {
  return fullChecker !== null;
}

/** Carga el diccionario general. Si falla, se conserva el corrector base. */
export function ensureFullDictionary(): Promise<void> {
  if (fullChecker) return Promise.resolve();
  if (!fullDictPromise) {
    fullDictPromise = (async () => {
      try {
        const [affMod, dicMod] = await Promise.all([
          import('@/assets/dict/es.aff?raw'),
          import('@/assets/dict/es.dic?raw'),
        ]);
        const aff = (affMod as unknown as { default: string }).default;
        const dic = (dicMod as unknown as { default: string }).default;
        fullChecker = nspell(aff, dic) as unknown as SpellChecker;
      } catch (e) {
        console.error('[textEnhancer] full dictionary failed, using base checker', e);
        fullDictPromise = null;
      }
    })();
  }
  return fullDictPromise;
}

function activeChecker(): SpellChecker | null {
  return fullChecker ?? spellChecker;
}

function safeCorrect(checker: SpellChecker | null, word: string): boolean {
  if (!checker) return false;
  try {
    return checker.correct(word);
  } catch {
    return false;
  }
}

function safeSuggest(checker: SpellChecker | null, word: string): string[] {
  if (!checker) return [];
  try {
    return checker.suggest(word) ?? [];
  } catch {
    return [];
  }
}

function isCapitalized(word: string): boolean {
  const first = word.charAt(0);
  return first !== '' && first === first.toUpperCase() && first !== first.toLowerCase();
}

function matchFirstLetterCase(original: string, candidate: string): string {
  if (!candidate || !isCapitalized(original)) return candidate;
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

/**
 * Sugiere una corrección con política de preservación: las palabras
 * capitalizadas (posibles nombres propios) solo aceptan correcciones de
 * tildes/mayúsculas; las minúsculas aceptan distancia de edición <= 1.
 */
function suggestCorrection(word: string): string | null {
  const checker = activeChecker();
  if (!checker || safeCorrect(checker, word)) return null;
  const capitalized = isCapitalized(word);
  const suggestions = safeSuggest(checker, word);
  for (const sug of suggestions.slice(0, 5)) {
    if (!sug || sug === word) continue;
    if (normalizeFlat(word) === normalizeFlat(sug)) return sug;
    if (!capitalized && isCloseSuggestion(word, sug)) return sug;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reparación de errores de codificación (mojibake y caracteres corruptos)
// ---------------------------------------------------------------------------

/** Pares de mojibake a nivel de bytes (generales del español, no por palabra). */
const MOJIBAKE_PAIRS: Array<[RegExp, string]> = [
  [/Ã¡/g, 'á'],
  [/Ã©/g, 'é'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ãú/g, 'ú'],
  [/Ã¼/g, 'ü'],
  [/Ã±/g, 'ñ'],
  [/ÃÁ/g, 'Á'],
  [/ÃÉ/g, 'É'],
  [/ÃÍ/g, 'Í'],
  [/ÃÓ/g, 'Ó'],
  [/ÃÚ/g, 'Ú'],
  [/ÃÑ/g, 'Ñ'],
  [/Â/g, ''],
];

function applyMojibakePairs(text: string): string {
  let out = text;
  for (const [re, replacement] of MOJIBAKE_PAIRS) {
    out = out.replace(re, replacement);
  }
  return out;
}

/** Caracteres que pueden ocupar el lugar de una letra dentro de una palabra. */
const CORRUPT_CHARS = new Set(['¿', '?', '�', '¡', '!', 'Ã', 'Â', '©', 'ª', 'º']);

function isCorruptChar(ch: string): boolean {
  return CORRUPT_CHARS.has(ch);
}

const WORD_LETTER_CLASS = 'A-Za-záéíóúÁÉÍÓÚñÑüÜ';
const CORRUPT_TOKEN_RE = new RegExp(
  `[${WORD_LETTER_CLASS}]*[¿?�¡!ÃÂ©ªº][${WORD_LETTER_CLASS}¿?�¡!ÃÂ©ªº]*`,
  'g'
);

const CORRUPT_SUBSTITUTES = 'aeiouáéíóúüñAEIOUÁÉÍÓÚÜÑ';

/**
 * Repara un token con caracteres corruptos usando el diccionario:
 * prueba sustituciones de un solo carácter y, si no hay coincidencia,
 * sugerencias por distancia de edición. Retorna null si no es reparable
 * (se conserva el token original para no perder información).
 */
export function repairCorruptToken(token: string): string | null {
  const chars = Array.from(token);
  const spots: number[] = [];
  chars.forEach((ch, i) => {
    if (isCorruptChar(ch) && i > 0 && i < chars.length - 1) spots.push(i);
  });
  if (spots.length === 0) return token;
  const checker = activeChecker();
  if (spots.length === 1 && checker) {
    const at = spots[0] as number;
    for (const sub of CORRUPT_SUBSTITUTES) {
      const candidate = `${chars.slice(0, at).join('')}${sub}${chars.slice(at + 1).join('')}`;
      if (safeCorrect(checker, candidate)) return matchFirstLetterCase(token, candidate);
    }
  }
  const stripped = chars.filter((_, i) => !spots.includes(i)).join('');
  if (stripped.length >= 3 && checker) {
    if (safeCorrect(checker, stripped)) return matchFirstLetterCase(token, stripped);
    const flatStripped = normalizeFlat(stripped);
    const suggestions = safeSuggest(checker, stripped);
    for (const sug of suggestions.slice(0, 5)) {
      if (sug && withinEditDistanceOne(flatStripped, normalizeFlat(sug))) {
        return matchFirstLetterCase(token, sug);
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Protección de segmentos sensibles (correos, URLs, códigos con dígitos)
// ---------------------------------------------------------------------------

const PROT_OPEN = String.fromCharCode(1);
const PROT_CLOSE = String.fromCharCode(2);

const PROTECT_RE =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|https?:\/\/[^\s]+|www\.[^\s]+|[A-Za-z0-9_.#/-]*[0-9][A-Za-z0-9_.#/-]*/g;

function protectSegments(text: string): { text: string; kept: string[] } {
  const kept: string[] = [];
  const out = text.replace(PROTECT_RE, (match) => {
    kept.push(match);
    return `${PROT_OPEN}${kept.length - 1}${PROT_CLOSE}`;
  });
  return { text: out, kept };
}

function restoreSegments(text: string, kept: string[]): string {
  if (kept.length === 0) return text;
  const pattern = new RegExp(`${PROT_OPEN}([0-9]+)${PROT_CLOSE}`, 'g');
  return text.replace(pattern, (_m, index: string) => {
    const original = kept[Number(index)];
    return original ?? _m;
  });
}

// ---------------------------------------------------------------------------
// Segmentación de oraciones (saludos de apertura y fórmulas de cierre)
// ---------------------------------------------------------------------------

const GREETING_RE =
  /^(buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|buen\s+d[ií]a|cordial\s+saludo)(?![.!?…])(\s+)/i;

const CLOSER_END_RES = [
  /(\s+)(muchas\s+gracias|muchísimas\s+gracias|mil\s+gracias|atentamente|quedo\s+atento|quedo\s+atenta|quedamos\s+atentos|agradezco\s+su\s+atención|agradezco\s+de\s+antemano)([.!?…]?\s*)$/i,
];

function splitGreeting(text: string): string {
  return text.replace(GREETING_RE, '$1. ');
}

function splitClosing(text: string): string {
  let out = text;
  for (const re of CLOSER_END_RES) {
    out = out.replace(re, (_m, _sp: string, phrase: string, end: string) => `. ${phrase}${end}`);
  }
  return out;
}

const FRONTED_ADVERB_RE =
  /(^|[.!?…]\s+)(muy\s+)?(cordialmente|atentamente|respetuosamente|amablemente|igualmente)(\s+)(?=[A-Za-záéíóúÁÉÍÓÚñÑüÜ0-9])/gim;

function splitFrontedAdverbials(text: string): string {
  return text.replace(
    FRONTED_ADVERB_RE,
    (_m: string, pre: string, muy: string | undefined, adv: string, sp: string) =>
      `${pre}${muy ?? ''}${adv},${sp}`
  );
}

/**
 * Corrige una palabra individual utilizando el mapa de errores y nspell
 * Optimizado con cache y early exits para evitar llamadas costosas a nspell
 */
export function correctWord(word: string): string {
  if (!word) return word;

  const cached = correctWordCache.get(word);
  if (cached !== undefined) return cached;
  const setCached = (value: string): string => {
    correctWordCache.set(word, value);
    return value;
  };

  const lower = word.toLowerCase();
  const upper = word.toUpperCase();

  // 1. Siglas: retorno inmediato (O(1) con Set)
  if (ACRONYMS_SET.has(upper) || ACRONYMS_NORMALIZED.has(upper.replace(/\./g, ''))) {
    return setCached(word);
  }

  // 2. Códigos, fechas y números (contienen dígitos): se preservan tal cual
  if (/[0-9]/.test(word)) return setCached(word);

  // 3. Palabras muy cortas o sin letras: no corregir
  if (word.length <= 2 || /^[^A-Za-záéíóúÁÉÍÓÚñÑüÜ]+$/.test(word)) {
    return setCached(word);
  }

  // 4. Mapa de errores comunes (typos) - O(1)
  if (COMMON_TYPOS[lower]) {
    const replacement = COMMON_TYPOS[lower]!;
    return setCached(matchFirstLetterCase(word, replacement));
  }

  // 5. Si el diccionario base la reconoce, se conserva sin consultar nspell
  if (DICTIONARY_SET.has(lower)) return setCached(word);

  // 6. Si el diccionario activo la reconoce (incluye formas con afijos), se conserva
  if (safeCorrect(activeChecker(), word)) return setCached(word);

  // 6. Sugerencia con política de preservación (ver suggestCorrection)
  const suggestion = suggestCorrection(word);
  if (suggestion) return setCached(matchFirstLetterCase(word, suggestion));

  return setCached(word);
}

/**
 * Limpia la cache de correctWord (útil para tests)
 */
export function clearCorrectWordCache(): void {
  correctWordCache.clear();
}

/**
 * Función principal para mejorar la redacción, gramática, ortografía,
 * puntuación y formato de textos de solicitudes PQR potenciada con nspell.
 * Optimizada para ejecución fluida con early exits y procesamiento por lotes.
 */
export function improveText(text: string): string {
  if (!text || !text.trim()) return text;

  // Early exit para textos muy cortos (no necesitan procesamiento completo)
  const trimmed = text.trim();
  if (trimmed.length < 3) return text;

  // 1. Normalización base de espacios (sin tocar puntuación todavía para
  //    no romper correos/URLs antes de protegerlos)
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  if (!cleaned) return cleaned;

  // 2. Protección de segmentos sensibles (correos, URLs, códigos con dígitos)
  const { text: protectedText, kept } = protectSegments(cleaned);
  cleaned = protectedText;

  // 3. Reparación de errores de codificación (mojibake + caracteres corruptos)
  cleaned = applyMojibakePairs(cleaned);
  cleaned = cleaned.replace(CORRUPT_TOKEN_RE, (tok) => repairCorruptToken(tok) ?? tok);

  // 4. Espaciado de puntuación (tras reparar, para no partir tokens corruptos)
  cleaned = cleaned
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([¿¡])\s+/g, '$1')
    .replace(/([^\s¿¡])([¿¡])/g, '$1 $2')
    .replace(/([,;:])(?=[^\s\d\n])/g, '$1 ')
    .replace(/([.!?])(?=[a-zA-ZáéíóúÁÉÍÓÚñÑ])/g, '$1 ')
    .replace(/\.{4,}/g, '...')
    .trim();

  if (!cleaned) return cleaned;

  // 5. Detección de MAYÚSCULAS sostenidas: pasar a minúsculas para corregir
  if (cleaned.length > 15 && cleaned === cleaned.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(cleaned)) {
    cleaned = cleaned.toLowerCase();
  }

  // 5. Corrección de palabras: procesar por tokens con cache
  // Usar replace con función que aprovecha el cache interno de correctWord
  cleaned = cleaned.replace(/[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+/g, (w) => {
    // Fast path para siglas sin pasar por correctWord
    if (ACRONYMS_SET.has(w.toUpperCase())) return w;
    return correctWord(w);
  });

  // 6. Restaurar segmentos protegidos antes de puntuar
  cleaned = restoreSegments(cleaned, kept);

  // 7. Capitalizar inicio de oraciones
  cleaned = cleaned.replace(/(^|[.!?]\s+|\n\s*)([a-záéíóúñ])/g, (_match, prefix, char) => {
    return prefix + (char as string).toUpperCase();
  });

  // 8. Mantener siglas en mayúsculas - una sola pasada con regex combinado
  cleaned = cleaned.replace(ACRONYM_REGEX, (match) => {
    // Buscar la forma canónica en ACRONYMS (preservando casing original como "kWh")
    const upper = match.toUpperCase();
    const found = ACRONYMS.find((a) => a.toUpperCase() === upper);
    return found ?? match;
  });

  // 9. Segmentación de oraciones: saludo inicial y fórmula de cierre
  cleaned = splitGreeting(cleaned);
  cleaned = splitClosing(cleaned);
  if (/[A-Za-záéíóúÁÉÍÓÚñÑüÜ0-9)"']$/.test(cleaned)) cleaned += '.';

  // 10. Coma tras adverbios frontales ("Muy cordialmente, ...")
  cleaned = splitFrontedAdverbials(cleaned);

  // 11. Re-capitalizar inicios (la segmentación pudo crear nuevas oraciones)
  cleaned = cleaned.replace(/(^|[.!?]\s+|\n\s*)([a-záéíóúñ])/g, (_match, prefix, char) => {
    return prefix + (char as string).toUpperCase();
  });

  return cleaned.trim();
}

export default improveText;
