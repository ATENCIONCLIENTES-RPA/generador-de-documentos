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
  const rawTrimmed = rawName.trim();
  if (!rawTrimmed) return '';

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

  const clean = cleanSpecialCharacters(rawTrimmed);
  const words = clean.split(/\s+/);
  if (words.length === 0 || !words[0]) return '';
  if (words.length === 1) return toTitleCase(words[0]);

  const upperWords = words.map((w) => w.toUpperCase());

  if (words.length === 4) {
    const [w0, w1, w2, w3] = upperWords as [string, string, string, string];
    const isW0Given = COMMON_GIVEN_NAMES.has(w0) && !COMMON_SURNAMES.has(w0);
    const isW2Given = COMMON_GIVEN_NAMES.has(w2);
    const isW0Surname = COMMON_SURNAMES.has(w0);
    void w1;
    void w3;
    if (isW0Given && !isW0Surname) return toTitleCase(words[0]!);
    if (isW2Given || isW0Surname) return toTitleCase(words[2]!);
    return toTitleCase(words[2]!);
  }

  if (words.length === 3) {
    const [w0, w1, w2] = upperWords as [string, string, string];
    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w0IsGiven = COMMON_GIVEN_NAMES.has(w0);
    const w1IsSurname = COMMON_SURNAMES.has(w1);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);
    const w2IsSurname = COMMON_SURNAMES.has(w2);
    const w2IsGiven = COMMON_GIVEN_NAMES.has(w2);
    if ((w0IsSurname && w1IsGiven) || (w0IsSurname && !w0IsGiven && !w1IsSurname))
      return toTitleCase(words[1]!);
    if (w0IsSurname && (w1IsSurname || w2IsGiven) && w2IsGiven) return toTitleCase(words[2]!);
    if (w0IsGiven && !w0IsSurname) return toTitleCase(words[0]!);
    if (w0IsSurname) return toTitleCase(words[1]!);
    return toTitleCase(words[0]!);
  }

  if (words.length === 2) {
    const [w0, w1] = upperWords as [string, string];
    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w0IsGiven = COMMON_GIVEN_NAMES.has(w0);
    const w1IsSurname = COMMON_SURNAMES.has(w1);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);
    if (w0IsSurname && w1IsGiven) return toTitleCase(words[1]!);
    if (w0IsGiven) return toTitleCase(words[0]!);
    if (w1IsGiven && !w0IsGiven) return toTitleCase(words[1]!);
    return toTitleCase(words[0]!);
  }

  for (let i = 0; i < words.length; i++) {
    const wUpper = upperWords[i]!;
    if (COMMON_GIVEN_NAMES.has(wUpper)) return toTitleCase(words[i]!);
  }
  return toTitleCase(words[0]!);
}

export function formatApplicantName(rawName: string | null | undefined): string {
  if (!rawName) return '';
  const rawTrimmed = rawName.trim();
  if (!rawTrimmed) return '';

  if (/[/\-\\_,|;]/.test(rawTrimmed)) {
    const cleaned = cleanSpecialCharacters(rawTrimmed);
    return toTitleCase(cleaned);
  }

  const clean = cleanSpecialCharacters(rawTrimmed);
  const words = clean.split(/\s+/);
  if (words.length <= 1) return toTitleCase(clean);

  const upperWords = words.map((w) => w.toUpperCase());

  if (words.length === 4) {
    const [w0, w1, w2, w3] = upperWords as [string, string, string, string];
    const isW0Given = COMMON_GIVEN_NAMES.has(w0) && !COMMON_SURNAMES.has(w0);
    const isW2Given = COMMON_GIVEN_NAMES.has(w2);
    const isW0Surname = COMMON_SURNAMES.has(w0);
    void w1;
    void w3;
    if (isW0Given && !isW0Surname) return toTitleCase(clean);
    if (isW2Given || isW0Surname) {
      const nombres = `${words[2]!} ${words[3]!}`;
      const apellidos = `${words[0]!} ${words[1]!}`;
      return `${toTitleCase(nombres)} ${toTitleCase(apellidos)}`;
    }
    return toTitleCase(clean);
  }

  if (words.length === 3) {
    const [w0, w1, w2] = upperWords as [string, string, string];
    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w0IsGiven = COMMON_GIVEN_NAMES.has(w0);
    const w1IsSurname = COMMON_SURNAMES.has(w1);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);
    const w2IsSurname = COMMON_SURNAMES.has(w2);
    const w2IsGiven = COMMON_GIVEN_NAMES.has(w2);
    if (w0IsSurname && w1IsGiven && w2IsGiven) {
      const nombres = `${words[1]!} ${words[2]!}`;
      const apellido = words[0]!;
      return `${toTitleCase(nombres)} ${toTitleCase(apellido)}`;
    }
    if (w0IsSurname && w1IsSurname && w2IsGiven) {
      const nombre = words[2]!;
      const apellidos = `${words[0]!} ${words[1]!}`;
      return `${toTitleCase(nombre)} ${toTitleCase(apellidos)}`;
    }
    if (w0IsSurname && !w1IsSurname && !w2IsSurname) return toTitleCase(clean);
    return toTitleCase(clean);
  }

  if (words.length === 2) {
    const [w0, w1] = upperWords as [string, string];
    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);
    if (w0IsSurname && w1IsGiven) return `${toTitleCase(words[1]!)} ${toTitleCase(words[0]!)}`;
    return toTitleCase(clean);
  }

  return toTitleCase(clean);
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
