const COMMON_GIVEN_NAMES: ReadonlySet<string> = new Set<string>([
  'JUAN',
  'CARLOS',
  'JOSE',
  'MARIA',
  'LUIS',
  'DIEGO',
  'FERNANDO',
  'SERGIO',
  'JESUS',
  'JESÚS',
  'JORGE',
  'ANDRES',
  'ANDRÉS',
  'DANIEL',
  'DAVID',
  'ALEJANDRO',
  'JAVIER',
  'MANUEL',
  'MIGUEL',
  'ALVARO',
  'ÁLVARO',
  'GABRIEL',
  'CRISTIAN',
  'CAMILO',
  'FELIPE',
  'SANTIAGO',
  'SEBASTIAN',
  'SEBASTIÁN',
  'OSCAR',
  'ÓSCAR',
  'CESAR',
  'CÉSAR',
  'RICARDO',
  'HERNAN',
  'HERNÁN',
  'JAIME',
  'ALEXANDER',
  'VICTOR',
  'VÍCTOR',
  'EDGAR',
  'ÉDGAR',
  'FABIAN',
  'FABIÁN',
  'GUSTAVO',
  'HUGO',
  'RODRIGO',
  'JULIO',
  'HECTOR',
  'HÉCTOR',
  'NELSON',
  'WILSON',
  'FREDY',
  'FREDDY',
  'MAURICIO',
  'PAOLA',
  'DIANA',
  'SANDRA',
  'CLAUDIA',
  'LILIANA',
  'MONICA',
  'MÓNICA',
  'PATRICIA',
  'GLORIA',
  'LUZ',
  'MARINA',
  'ADRIANA',
  'CAROLINA',
  'LAURA',
  'VALENTINA',
  'ISABELLA',
  'SOFIA',
  'SOFÍA',
  'CATALINA',
  'ANGELA',
  'ÁNGELA',
  'MARITZA',
  'YOLANDA',
  'ESPERANZA',
  'BLANCA',
  'ROSA',
  'ANA',
  'NOHORA',
  'SONIA',
  'MARTHA',
  'STELLA',
  'YULIETH',
  'JENNY',
  'LADY',
  'LEIDY',
  'EDWIN',
  'JHON',
  'JONATHAN',
  'WILLIAM',
  'ROBERTO',
  'EDUARDO',
  'MARIO',
  'MARCOS',
  'ANTONIO',
  'PEDRO',
  'RAFAEL',
  'RAMON',
  'RAMÓN',
  'ENRIQUE',
  'FRANCISCO',
  'GONZALO',
  'ALBERTO',
  'BERNARDO',
  'GUILLERMO',
  'ERNESTO',
  'GERMAN',
  'GERMÁN',
  'IVAN',
  'IVÁN',
  'ORLANDO',
  'RUBEN',
  'RUBÉN',
  'WALTER',
  'HENRY',
  'DARIO',
  'DARÍO',
  'RAUL',
  'RAÚL',
  'ALFONSO',
  'ARTURO',
  'ELIECER',
  'ELIÉCER',
  'GIOVANNY',
  'GIOVANNI',
  'JAIRO',
  'LEONARDO',
  'OMAR',
  'ÓMAR',
  'RIGOBERTO',
  'SAMUEL',
  'TITO',
  'VICENTE',
  'WILMER',
  'YAMID',
  'YEISON',
  'YERSON',
  'CLAUDIO',
  'FLOR',
  'AIDA',
  'AÍDA',
  'ELIZABETH',
  'ESTELA',
  'MILENA',
  'YADIRA',
  'NANCY',
  'LILIAN',
  'YENNY',
  'KAREN',
  'TATIANA',
  'NATALIA',
  'VIVIANA',
  'LORENA',
  'PILAR',
  'ROSMIRA',
  'CARMEN',
  'LUCIA',
  'LUCÍA',
  'ELENA',
]);

const COMMON_SURNAMES: ReadonlySet<string> = new Set<string>([
  'RODRIGUEZ',
  'RODRÍGUEZ',
  'GOMEZ',
  'GÓMEZ',
  'GONZALEZ',
  'GONZÁLEZ',
  'MARTINEZ',
  'MARTÍNEZ',
  'GARCIA',
  'GARCÍA',
  'LOPEZ',
  'LÓPEZ',
  'HERNANDEZ',
  'HERNÁNDEZ',
  'SANCHEZ',
  'SÁNCHEZ',
  'RAMIREZ',
  'RAMÍREZ',
  'PEREZ',
  'PÉREZ',
  'DIAZ',
  'DÍAZ',
  'MUNOZ',
  'MUÑOZ',
  'ROJAS',
  'MORENO',
  'ORTIZ',
  'ORTÍZ',
  'JIMENEZ',
  'JIMÉNEZ',
  'CASTRO',
  'VARGAS',
  'ALVAREZ',
  'ÁLVAREZ',
  'ROMERO',
  'GUTIERREZ',
  'GUTIÉRREZ',
  'SUAREZ',
  'SUÁREZ',
  'TORRES',
  'RUIZ',
  'RUÍZ',
  'FLOREZ',
  'FLÓREZ',
  'FLORES',
  'MORALES',
  'VALENCIA',
  'RAMOS',
  'MENDOZA',
  'QUINTERO',
  'HERRERA',
  'MEDINA',
  'AGUILAR',
  'GUZMAN',
  'GUZMÁN',
  'CARRILLO',
  'PALACIO',
  'PALACIOS',
  'ZAPATA',
  'VELASQUEZ',
  'VELÁSQUEZ',
  'PINZON',
  'PINZÓN',
  'CORREA',
  'SERRANO',
  'OSPINA',
  'CARDONA',
  'MONTOYA',
  'OSORIO',
  'RESTREPO',
  'SALAZAR',
  'CARDENAS',
  'CÁRDENAS',
  'ACOSTA',
  'DUARTE',
  'PARRA',
  'RIOS',
  'RÍOS',
  'SALGADO',
  'MEJIA',
  'MEJÍA',
  'ARIAS',
  'TRUJILLO',
  'VEGA',
  'PARDO',
  'FORERO',
  'RINCON',
  'RINCÓN',
  'AVILA',
  'ÁVILA',
  'CAMARGO',
  'BUITRAGO',
  'BAUTISTA',
  'CACERES',
  'CÁCERES',
  'JAIMES',
  'RANGEL',
  'CALDERON',
  'CALDERÓN',
  'SOTO',
  'BARRIOS',
  'PEÑA',
  'VERA',
  'GELVES',
  'SANDOVAL',
  'VILLAMIZAR',
  'ORDONEZ',
  'ORDOÑEZ',
  'ORDOÑEZ',
  'ORDÓÑEZ',
  'CAICEDO',
  'BOHORQUEZ',
  'BOHÓRQUEZ',
  'BECERRA',
  'MONROY',
  'PATINO',
  'PATIÑO',
  'ARDILA',
  'CHACON',
  'CHACÓN',
  'PLATA',
  'RUEDA',
  'BAEZ',
  'BÁEZ',
  'VILLALOBOS',
  'CAMACHO',
  'REYES',
  'LOZANO',
  'GUERRERO',
  'ROA',
  'BELTRAN',
  'BELTRÁN',
  'CIFUENTES',
  'PINEDA',
  'OCHOA',
  'CORTES',
  'CORTÉS',
  'CORDOBA',
  'CÓRDOBA',
  'HURTADO',
  'AGUDELO',
  'LONDONO',
  'LONDOÑO',
  'GAVIRIA',
  'ZULUAGA',
  'JARAMILLO',
  'BEDOYA',
  'TANGARIFE',
  'TELLEZ',
  'TÉLLEZ',
  'PEÑALOZA',
  'CEPEDA',
  'MONCADA',
  'HIGUERA',
  'ACEVEDO',
  'ANGARITA',
  'BARRERA',
  'BERNAL',
  'CANO',
  'CARVAJAL',
  'CORDERO',
  'DELGADO',
  'ESPINOSA',
  'FAJARDO',
  'GALVIS',
  'GIRON',
  'GIRÓN',
  'HENAO',
  'IBARRA',
  'LADINO',
  'LLANO',
  'MACIAS',
  'MACÍAS',
  'NAVARRO',
  'NIETO',
  'OCAMPO',
  'OVIEDO',
  'PABON',
  'PABÓN',
  'PACHECO',
  'PADILLA',
  'POLO',
  'POSADA',
  'PUERTA',
  'QUEVEDO',
  'QUIROGA',
  'RENDON',
  'RENDÓN',
  'REPOLL',
  'REY',
  'ROCHA',
  'SALAMANCA',
  'SANABRIA',
  'SIERRA',
  'SILVA',
  'SOLANO',
  'TAVERA',
  'TOBON',
  'TOBÓN',
  'TRIANA',
  'URBINA',
  'URIBE',
  'VALDERRAMA',
  'VALLEJO',
  'VANEGAS',
  'VASQUEZ',
  'VÁSQUEZ',
  'VILLAMIL',
  'ZAMBRANO',
]);

export function cleanSpecialCharacters(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/[/\\_-]+/g, ' ')
    .replace(/[;,.:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Clasificación persona natural vs empresa / razón social
// ---------------------------------------------------------------------------

/** Normaliza una palabra para búsquedas en diccionario: mayúsculas sin tildes
 *  (conserva la Ñ para no generar falsos positivos). */
function normKey(word: string): string {
  return word
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u0302\u0304-\u036f]/g, '');
}

/** Formas societarias (canónicas: sin puntos, sin espacios, en mayúsculas). */
const LEGAL_SUFFIX_FORMS: ReadonlySet<string> = new Set<string>([
  'SAS',
  'SA',
  'LTDA',
  'LIMITADA',
  'SENC',
  'SCA',
  'EU',
  'ESP',
  'BIC',
  'SASBIC',
]);

/** Palabras que delatan una razón social o nombre comercial. Se excluyen
 *  deliberadamente apellidos y nombres comunes para evitar falsos positivos. */
const COMPANY_KEYWORDS: ReadonlySet<string> = new Set<string>([
  'ALCALDIA',
  'GOBERNACION',
  'MUNICIPIO',
  'MINISTERIO',
  'SUPERINTENDENCIA',
  'CONTRALORIA',
  'PROCURADURIA',
  'FISCALIA',
  'JUZGADO',
  'TRIBUNAL',
  'NOTARIA',
  'REGISTRADURIA',
  'DEFENSORIA',
  'PERSONERIA',
  'CONCEJO',
  'ASAMBLEA',
  'EMBAJADA',
  'CONSULADO',
  'POLICIA',
  'EJERCITO',
  'ARMADA',
  'BOMBEROS',
  'IGLESIA',
  'PARROQUIA',
  'DIOCESIS',
  'COMUNIDAD',
  'ASOCIACION',
  'SINDICATO',
  'FEDERACION',
  'CONFEDERACION',
  'CAMARA',
  'LIGA',
  'CLUB',
  'FUNDACION',
  'CORPORACION',
  'COOPERATIVA',
  'FONDO',
  'CAJA',
  'BANCO',
  'SEGUROS',
  'ASEGURADORA',
  'TRANSPORTES',
  'TRANSPORTE',
  'TRANSPORTADORA',
  'CONSTRUCTORA',
  'CONSTRUCTOR',
  'CONSTRUCCIONES',
  'CONSTRUCCION',
  'INDUSTRIA',
  'INDUSTRIAS',
  'INDUSTRIAL',
  'INVERSIONES',
  'INVERSION',
  'COMERCIALIZADORA',
  'COMERCIAL',
  'COMERCIO',
  'EMPRESA',
  'SERVICIOS',
  'SERVICIO',
  'GRUPO',
  'ALIMENTOS',
  'SNACKS',
  'DROGUERIA',
  'FARMACIA',
  'HOTEL',
  'HOTELES',
  'RESTAURANTE',
  'CLINICA',
  'HOSPITAL',
  'COLEGIO',
  'UNIVERSIDAD',
  'INSTITUTO',
  'ACADEMIA',
  'JARDIN',
  'FUNERARIA',
  'CONSULTORIA',
  'CONSULTORES',
  'ASESORES',
  'INGENIERIA',
  'ARQUITECTURA',
  'LOGISTICA',
  'DISTRIBUIDORA',
  'MAYORISTA',
  'FERRETERIA',
  'PANADERIA',
  'TIENDA',
  'SUPERMERCADO',
  'SUPERMERCADOS',
  'CALZADO',
  'TEXTILES',
  'CONFECCIONES',
  'MUEBLES',
  'OPTICA',
  'VETERINARIA',
  'AGROPECUARIA',
  'EDITORIAL',
  'IMPRENTA',
  'PAPELERIA',
  'JOYERIA',
  'TALLER',
  'LAVANDERIA',
  'PELUQUERIA',
  'CAFETERIA',
  'HELADERIA',
  'PIZZERIA',
  'CARNICERIA',
  'LICORERA',
  'GIMNASIO',
  'TURISMO',
  'VIAJES',
  'PARQUEADERO',
  'LAVADERO',
  'MONTAJES',
  'SOLDADURA',
  'CARPINTERIA',
  'PLOMERIA',
  'ELECTRICOS',
  'ELECTRONICA',
  'PUBLICIDAD',
  'MARKETING',
  'EVENTOS',
  'COMUNICACIONES',
  'TELECOMUNICACIONES',
  'ENERGIA',
  'MINERA',
  'PETROLERA',
  'AGRICOLA',
  'GANADERA',
  'HOLDING',
  'CONSORCIO',
  'UNION',
  'ALIANZA',
  'PROYECTO',
  'OBRA',
  'CONDOMINIO',
  'CONJUNTO',
  'EDIFICIO',
  'CENTRO',
  'PLAZA',
  'TERMINAL',
  'AEROPUERTO',
  'ZONA',
  'PARQUE',
  'FINCA',
  'HACIENDA',
  'COMPANIA',
  'COMPAÑIA',
  'CIA',
  'SOCIEDAD',
  'SUCURSAL',
  'BODEGA',
  'DEPOSITO',
  'MERCADO',
  'GALERIA',
]);

const NAME_PARTICLES: ReadonlySet<string> = new Set<string>([
  'DE',
  'DEL',
  'LA',
  'LAS',
  'LOS',
  'Y',
  'E',
  'VON',
  'VAN',
]);

function isGivenName(word: string): boolean {
  return COMMON_GIVEN_NAMES.has(normKey(word));
}

function isSurname(word: string): boolean {
  return COMMON_SURNAMES.has(normKey(word));
}

/** Remueve siglas societarias al final del texto (SAS, S.A.S., LTDA, ...).
 *  Retorna si se removió algo y el texto restante. */
function stripLegalSuffix(raw: string): { stripped: boolean; text: string } {
  const tokens = raw.split(/\s+/).filter(Boolean);
  let end = tokens.length;
  let stripped = false;
  for (;;) {
    let take = 0;
    for (const n of [3, 2, 1]) {
      if (end - n < 0) continue;
      const candidate = tokens
        .slice(end - n, end)
        .map((t) => t.replace(/[.,;:]+/g, '').toUpperCase())
        .join('');
      if (LEGAL_SUFFIX_FORMS.has(candidate)) {
        take = n;
        break;
      }
    }
    if (take === 0 || end - take === 0) break;
    end -= take;
    stripped = true;
  }
  const text = tokens
    .slice(0, end)
    .join(' ')
    .replace(/[.,;:\s]+$/g, '')
    .trim();
  return { stripped, text };
}

interface ApplicantClass {
  kind: 'person' | 'company';
  /** Texto limpio (separadores normalizados, caso original conservado). */
  text: string;
}

/** Determina si el registro es persona natural o empresa/razón social.
 *  No depende del número de palabras: usa siglas, palabras clave y patrones. */
function classifyApplicant(rawName: string): ApplicantClass {
  const collapsed = rawName.trim().replace(/\s+/g, ' ');
  const { stripped, text } = stripLegalSuffix(collapsed);
  if (stripped && text) return { kind: 'company', text: cleanSpecialCharacters(text) };

  const probe = text || collapsed;
  const tokens = probe.split(/\s+/).filter(Boolean);
  const keys = tokens.map(normKey);

  if (tokens.some((t) => t.includes('&'))) {
    return { kind: 'company', text: cleanSpecialCharacters(probe) };
  }
  if (tokens.some((t) => /\d/.test(t))) {
    return { kind: 'company', text: cleanSpecialCharacters(probe) };
  }
  if (keys.some((k) => COMPANY_KEYWORDS.has(k))) {
    return { kind: 'company', text: cleanSpecialCharacters(probe) };
  }
  const significant = tokens.filter((t) => !NAME_PARTICLES.has(normKey(t)));
  if (significant.length >= 4 && !significant.some((t) => COMMON_GIVEN_NAMES.has(normKey(t)))) {
    return { kind: 'company', text: cleanSpecialCharacters(probe) };
  }
  return { kind: 'person', text: probe };
}

export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';
  const clean = cleanSpecialCharacters(text);
  if (!clean) return '';
  const words = clean.split(/\s+/);
  const lowerParticles = new Set<string>(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'von', 'van']);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowerParticles.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function extractFirstName(rawName: string | null | undefined): string {
  if (!rawName) return '';
  const rawTrimmed = rawName.trim().replace(/\s+/g, ' ');
  if (!rawTrimmed) return '';

  // Empresas: se conserva la razón social completa (sin siglas jurídicas).
  const applicant = classifyApplicant(rawTrimmed);
  if (applicant.kind === 'company') return applicant.text;

  if (rawTrimmed.includes('/') || rawTrimmed.includes('\\')) {
    const parts = rawTrimmed.split(/[/|\\]/);
    if (parts.length >= 2) {
      const afterSlash = cleanSpecialCharacters(parts[1] ?? '');
      if (afterSlash) {
        const afterWords = afterSlash.split(/\s+/);
        if (afterWords.length > 0 && afterWords[0]) return toTitleCase(afterWords[0]);
      }
    }
  }

  if (rawTrimmed.includes('-')) {
    const parts = rawTrimmed.split('-');
    if (parts.length >= 2) {
      const afterHyphen = cleanSpecialCharacters(parts[parts.length - 1] ?? '');
      const afterUpper = afterHyphen.toUpperCase();
      if (COMMON_GIVEN_NAMES.has(afterUpper) || !COMMON_SURNAMES.has(afterUpper)) {
        const words = afterHyphen.split(/\s+/);
        if (words.length > 0 && words[0]) return toTitleCase(words[0]);
      }
    }
  }

  return extractPersonFirstName(rawTrimmed);
}

/** Extrae el primer nombre de una persona natural por estructura:
 *  detecta el bloque de apellidos y toma el primer nombre posterior,
 *  sin asumir posiciones fijas. Cuando el diccionario no reconoce el
 *  nombre (p. ej. ROSMIRA), usa la estructura posicional apellidos-primero
 *  en vez de devolver un apellido. */
function extractPersonFirstName(rawTrimmed: string): string {
  const clean = cleanSpecialCharacters(rawTrimmed);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0 || !words[0]) return '';
  if (words.length === 1) return toTitleCase(words[0]);

  // Orden nombres-antes-que-apellidos: el primer token ya es el nombre.
  if (isGivenName(words[0]!) && !isSurname(words[0]!)) {
    return toTitleCase(words[0]!);
  }

  // Orden apellidos-primero (convención colombiana): el primer nombre es
  // la primera palabra de nombre que aparezca después de los apellidos,
  // ignorando partículas (de/del/la/los/y/...).
  for (let i = 1; i < words.length; i++) {
    if (NAME_PARTICLES.has(normKey(words[i]!))) continue;
    if (isGivenName(words[i]!)) return toTitleCase(words[i]!);
  }

  // Respaldo estructural (el nombre no está en el diccionario):
  // nunca devolver un apellido como primer nombre. Si el candidato
  // también es un apellido conocido (entrada sin nombres), se conserva
  // el comportamiento anterior.
  const splitAt = findGivenStart(words);
  if (splitAt > 0 && splitAt < words.length) {
    const candidate = words[splitAt]!;
    if (isSurname(candidate) && !isGivenName(candidate)) return toTitleCase(words[0]!);
    return toTitleCase(candidate);
  }
  if (splitAt === 0) return toTitleCase(words[0]!);

  return toTitleCase(words[0]!);
}

/** Entradas significativas (sin partículas como de/del/la/los/y). */
function significantEntries(words: string[]): { word: string; index: number }[] {
  const out: { word: string; index: number }[] = [];
  for (let i = 0; i < words.length; i++) {
    if (NAME_PARTICLES.has(normKey(words[i]!))) continue;
    out.push({ word: words[i]!, index: i });
  }
  return out;
}

/** Localiza el índice del primer nombre en orden apellidos-primero.
 *  Retorna el índice en `words`, 0 si el orden es nombres-primero,
 *  o -1 si no se puede determinar. */
function findGivenStart(words: string[]): number {
  const sig = significantEntries(words);
  if (sig.length === 0) return -1;
  if (sig.length === 1) return sig[0]!.index;

  const norm = (w: string): string => normKey(w);

  // Apellidos duplicados al inicio ("SERRANO SERRANO ROSMIRA"):
  // el nombre empieza en el tercer bloque.
  if (sig.length >= 3 && norm(sig[0]!.word) === norm(sig[1]!.word)) {
    return sig[2]!.index;
  }

  // Bloque de apellidos conocidos al inicio ("CASTRO MURILLO ...").
  let lead = 0;
  while (lead < sig.length && isSurname(sig[lead]!.word)) lead++;

  // Sin apellidos conocidos al inicio pero con apellidos al final
  // ("ROSMIRA SERRANO SERRANO"): orden nombres-primero.
  if (lead === 0) {
    let trail = 0;
    let j = sig.length - 1;
    while (j >= 0 && isSurname(sig[j]!.word)) {
      trail++;
      j--;
    }
    if (trail >= 1 && trail < sig.length) return sig[0]!.index;
  }

  if (lead >= 2 && lead < sig.length) return sig[lead]!.index;

  // Posicional por defecto (convención apellidos-primero):
  // 2 bloques -> el segundo; 3+ bloques -> el tercero.
  if (sig.length === 2) return sig[1]!.index;
  if (sig.length >= 3) {
    if (lead > 2 && lead < sig.length) return sig[lead]!.index;
    return sig[2]!.index;
  }

  return -1;
}

export function formatApplicantName(rawName: string | null | undefined): string {
  if (!rawName) return '';
  const rawTrimmed = rawName.trim().replace(/\s+/g, ' ');
  if (!rawTrimmed) return '';

  if (/[/\-\\_,|;]/.test(rawTrimmed)) {
    const cleaned = cleanSpecialCharacters(rawTrimmed);
    return toTitleCase(cleaned);
  }

  // Empresas: se conserva la razón social completa, sin reordenar.
  const applicant = classifyApplicant(rawTrimmed);
  if (applicant.kind === 'company') return applicant.text;

  const clean = cleanSpecialCharacters(rawTrimmed);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return toTitleCase(clean);

  // Orden nombres-antes-que-apellidos: se conserva el orden original.
  if (isGivenName(words[0]!) && !isSurname(words[0]!)) {
    return toTitleCase(clean);
  }

  // Orden apellidos-primero: se rotan los nombres detectados al inicio,
  // ignorando partículas al buscar el límite entre bloques. Si el nombre
  // no está en el diccionario, se usa la estructura posicional.
  let splitAt = -1;
  for (let i = 1; i < words.length; i++) {
    if (NAME_PARTICLES.has(normKey(words[i]!))) continue;
    if (isGivenName(words[i]!)) {
      splitAt = i;
      break;
    }
  }
  if (splitAt === -1) splitAt = findGivenStart(words);
  if (splitAt <= 0) return toTitleCase(clean);
  // No rotar si el candidato es solo un apellido conocido
  // (entrada de solo apellidos, sin nombres).
  if (isSurname(words[splitAt]!) && !isGivenName(words[splitAt]!)) {
    return toTitleCase(clean);
  }
  const nombres = words.slice(splitAt).join(' ');
  const apellidos = words.slice(0, splitAt).join(' ');
  return `${toTitleCase(nombres)} ${toTitleCase(apellidos)}`;
}

export function getInitials(rawName: string | null | undefined): string {
  if (!rawName) return '';
  const clean = cleanSpecialCharacters(rawName);
  if (!clean) return '';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return (words[0]![0] ?? '').toUpperCase();
  const first = words[0]![0] ?? '';
  const last = words[words.length - 1]![0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function parsePersonName(rawName: string | null | undefined): {
  rawClean: string;
  firstName: string;
  fullName: string;
} {
  return {
    rawClean: cleanSpecialCharacters(rawName ?? ''),
    firstName: extractFirstName(rawName ?? ''),
    fullName: formatApplicantName(rawName ?? ''),
  };
}
