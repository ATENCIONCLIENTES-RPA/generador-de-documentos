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
reconexión/B
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

// Instancia de nspell para verificación ortográfica
let spellChecker: ReturnType<typeof nspell> | null = null;

try {
  spellChecker = nspell(ES_AFF, ES_DIC);
} catch {
  spellChecker = null;
}

// Diccionario de correcciones comunes en español para PQR y redacción
const COMMON_TYPOS: Record<string, string> = {
  // Acentos y tildes comunes
  revision: 'revisión',
  reclamacion: 'reclamación',
  facturacion: 'facturación',
  instalacion: 'instalación',
  suspension: 'suspensión',
  reconexion: 'reconexión',
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

  // Errores tipográficos comunes
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

// Siglas y términos técnicos que deben ir en mayúsculas
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

function isCloseSuggestion(orig: string, sug: string): boolean {
  if (Math.abs(orig.length - sug.length) > 1) return false;
  const normOrig = orig.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normSug = sug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
 */
export function correctWord(word: string): string {
  if (!word) return word;

  const lower = word.toLowerCase();

  // Si está en el mapa de errores comunes, aplicar corrección preservando mayúscula inicial si la tenía
  if (COMMON_TYPOS[lower]) {
    const replacement = COMMON_TYPOS[lower]!;
    if (word[0] === word[0]?.toUpperCase() && word[0] !== word[0]?.toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  // Si nspell tiene sugerencias y la palabra no es válida
  if (spellChecker && !spellChecker.correct(word)) {
    const suggestions = spellChecker.suggest(word);
    if (suggestions.length > 0 && suggestions[0]) {
      const sug = suggestions[0];
      if (isCloseSuggestion(word, sug)) {
        if (word[0] === word[0]?.toUpperCase() && word[0] !== word[0]?.toLowerCase()) {
          return sug.charAt(0).toUpperCase() + sug.slice(1);
        }
        return sug;
      }
    }
  }

  return word;
}

/**
 * Función principal para mejorar la redacción, gramática, ortografía,
 * puntuación y formato de textos de solicitudes PQR potenciada con nspell.
 */
export function improveText(text: string): string {
  if (!text || !text.trim()) return text;

  let cleaned = text
    // 1. Normalizar saltos de línea y espacios
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    // 2. Corregir espacios antes de signos de puntuación
    .replace(/\s+([,.;:!?])/g, '$1')
    // 3. Asegurar espacio después de signos de puntuación si va seguido de texto
    .replace(/([,;:])(?=[^\s\d\n])/g, '$1 ')
    .replace(/([.!?])(?=[a-zA-ZáéíóúÁÉÍÓÚñÑ])/g, '$1 ')
    // 4. Normalizar puntos suspensivos
    .replace(/\.{4,}/g, '...')
    .trim();

  // 5. Si todo el texto está en MAYÚSCULAS o todo en minúsculas, convertir a formato oración
  const isAllCaps = cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned) && cleaned.length > 15;
  if (isAllCaps) {
    cleaned = cleaned.toLowerCase();
  }

  // 6. Corregir palabras y faltas de ortografía comunes mediante tokens
  cleaned = cleaned.replace(/\b[a-zA-ZáéíóúÁÉÍÓÚñÑ]+\b/g, (w) => {
    // Si es sigla conocida, no modificar
    if (ACRONYMS.includes(w.toUpperCase())) return w;
    return correctWord(w);
  });

  // 7. Capitalizar inicio de oraciones (después de inicio de texto o punto + espacio o salto de línea)
  cleaned = cleaned.replace(/(^|[.!?]\s+|\n\s*)([a-záéíóúñ])/g, (_match, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  // 8. Mantener siglas y acrónimos oficiales en mayúsculas
  for (const acr of ACRONYMS) {
    const reg = new RegExp(`\\b${acr}\\b`, 'gi');
    cleaned = cleaned.replace(reg, acr);
  }

  return cleaned;
}

export default improveText;
