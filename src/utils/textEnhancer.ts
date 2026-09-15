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
const ACRONYM_PATTERN = ACRONYMS.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const ACRONYM_REGEX = new RegExp(`\\b(${ACRONYM_PATTERN})\\b`, 'gi');

function isCloseSuggestion(orig: string, sug: string): boolean {
  if (Math.abs(orig.length - sug.length) > 1) return false;
  const normOrig = orig
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const normSug = sug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normOrig === normSug) return true;
  let diffs = 0;
  const maxLen = Math.max(normOrig.length, normSug.length);
  for (let i = 0; i < maxLen; i++) {
    if (normOrig[i] !== normSug[i]) diffs++;
    if (diffs > 1) return false;
  }
  return diffs <= 1;
}

/**
 * Corrige una palabra individual utilizando el mapa de errores y nspell
 * Optimizado con cache y early exits para evitar llamadas costosas a nspell
 */
export function correctWord(word: string): string {
  if (!word) return word;

  const cached = correctWordCache.get(word);
  if (cached !== undefined) return cached;

  let result = word;
  const lower = word.toLowerCase();
  const upper = word.toUpperCase();

  // 1. Siglas: retorno inmediato (O(1) con Set)
  if (ACRONYMS_SET.has(upper) || ACRONYMS_NORMALIZED.has(upper.replace(/\./g, ''))) {
    correctWordCache.set(word, word);
    return word;
  }

  // 2. Palabras muy cortas, números o con caracteres no alfabéticos: no corregir
  if (word.length <= 2 || /^[\W\d]+$/.test(word)) {
    correctWordCache.set(word, word);
    return word;
  }

  // 3. Mapa de errores comunes (typos) - O(1)
  if (COMMON_TYPOS[lower]) {
    const replacement = COMMON_TYPOS[lower]!;
    result =
      word[0] === word[0]?.toUpperCase() && word[0] !== word[0]?.toLowerCase()
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement;
    correctWordCache.set(word, result);
    return result;
  }

  // 4. Si la palabra ya está en el diccionario (correcta), no llamar a nspell
  if (DICTIONARY_SET.has(lower)) {
    correctWordCache.set(word, word);
    return word;
  }

  // 5. Solo consultar nspell para palabras de longitud razonable y que no sean siglas
  //    Evitar nspell para palabras muy comunes que no están en el diccionario pequeño
  //    pero que son correctas en español (ej: "radica", "ante", "para")
  //    Heurística: si la palabra no está en COMMON_TYPOS y es corta, la consideramos correcta
  //    para evitar suggest() costoso
  if (!spellChecker) {
    correctWordCache.set(word, word);
    return word;
  }

  // 6. nspell: verificar ortografía y sugerencia solo si es probable que sea un error
  //    Usamos correct() que es más barato que suggest(), y solo si es incorrecta pedimos sugerencia
  if (!spellChecker.correct(word)) {
    const suggestions = spellChecker.suggest(word);
    if (suggestions.length > 0 && suggestions[0]) {
      const sug = suggestions[0];
      if (isCloseSuggestion(word, sug)) {
        result =
          word[0] === word[0]?.toUpperCase() && word[0] !== word[0]?.toLowerCase()
            ? sug.charAt(0).toUpperCase() + sug.slice(1)
            : sug;
      }
    }
  }

  correctWordCache.set(word, result);
  return result;
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

  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;:])(?=[^\s\d\n])/g, '$1 ')
    .replace(/([.!?])(?=[a-zA-ZáéíóúÁÉÍÓÚñÑ])/g, '$1 ')
    .replace(/\.{4,}/g, '...')
    .trim();

  if (!cleaned) return cleaned;

  // 5. Detección de MAYÚSCULAS: usar test sin crear copia completa si es corto
  if (cleaned.length > 15 && cleaned === cleaned.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(cleaned)) {
    cleaned = cleaned.toLowerCase();
  }

  // 6. Corrección de palabras: procesar por tokens con cache
  // Usar replace con función que aprovecha el cache interno de correctWord
  cleaned = cleaned.replace(/\b[a-zA-ZáéíóúÁÉÍÓÚñÑ]+\b/g, (w) => {
    // Fast path para siglas sin pasar por correctWord
    if (ACRONYMS_SET.has(w.toUpperCase())) return w;
    return correctWord(w);
  });

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

  return cleaned;
}

export default improveText;
