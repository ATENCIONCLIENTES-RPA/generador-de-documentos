/**
 * Name parsing and normalization utility for ESSA documents.
 * Handles Colombian/Hispanic name patterns, extraction of [PRIMER_NOMBRE],
 * cleaning of special characters (/ and -), and Title Case formatting.
 */

// Common Spanish/Colombian Given Names (Uppercased & Normalized)
const COMMON_GIVEN_NAMES = new Set([
  'JUAN', 'CARLOS', 'JOSE', 'MARIA', 'LUIS', 'DIEGO', 'FERNANDO', 'SERGIO', 'JESUS', 'JESÚS',
  'JORGE', 'ANDRES', 'ANDRÉS', 'DANIEL', 'DAVID', 'ALEJANDRO', 'JAVIER', 'MANUEL', 'MIGUEL',
  'ALVARO', 'ÁLVARO', 'GABRIEL', 'CRISTIAN', 'CAMILO', 'FELIPE', 'SANTIAGO', 'SEBASTIAN', 'SEBASTIÁN',
  'OSCAR', 'ÓSCAR', 'CESAR', 'CÉSAR', 'RICARDO', 'HERNAN', 'HERNÁN', 'JAIME', 'ALEXANDER',
  'VICTOR', 'VÍCTOR', 'EDGAR', 'ÉDGAR', 'FABIAN', 'FABIÁN', 'GUSTAVO', 'HUGO', 'RODRIGO',
  'JULIO', 'HECTOR', 'HÉCTOR', 'NELSON', 'WILSON', 'FREDY', 'FREDDY', 'MAURICIO', 'PAOLA',
  'DIANA', 'SANDRA', 'CLAUDIA', 'LILIANA', 'MONICA', 'MÓNICA', 'PATRICIA', 'GLORIA', 'LUZ',
  'MARINA', 'ADRIANA', 'CAROLINA', 'LAURA', 'VALENTINA', 'ISABELLA', 'SOFIA', 'SOFÍA',
  'CATALINA', 'ANGELA', 'ÁNGELA', 'MARITZA', 'YOLANDA', 'ESPERANZA', 'BLANCA', 'ROSA',
  'ANA', 'NOHORA', 'SONIA', 'MARTHA', 'STELLA', 'YULIETH', 'JENNY', 'LADY', 'LEIDY',
  'EDWIN', 'JHON', 'JONATHAN', 'WILLIAM', 'ROBERTO', 'EDUARDO', 'MARIO', 'MARCOS',
  'ANTONIO', 'PEDRO', 'RAFAEL', 'RAMON', 'RAMÓN', 'ENRIQUE', 'FRANCISCO', 'GONZALO',
  'ALBERTO', 'BERNARDO', 'GUILLERMO', 'ERNESTO', 'GERMAN', 'GERMÁN', 'IVAN', 'IVÁN',
  'ORLANDO', 'RUBEN', 'RUBÉN', 'WALTER', 'HENRY', 'DARIO', 'DARÍO', 'RAUL', 'RAÚL',
  'ALFONSO', 'ARTURO', 'ELIECER', 'ELIÉCER', 'GIOVANNY', 'GIOVANNI', 'JAIRO', 'LEONARDO',
  'OMAR', 'ÓMAR', 'RIGOBERTO', 'SAMUEL', 'TITO', 'VICENTE', 'WILMER', 'YAMID', 'YEISON',
  'YERSON', 'CLAUDIO', 'FLOR', 'AIDA', 'AÍDA', 'ELIZABETH', 'ESTELA', 'MILENA', 'YADIRA',
  'NANCY', 'LILIAN', 'YENNY', 'KAREN', 'TATIANA', 'NATALIA', 'VIVIANA', 'LORENA', 'PILAR'
]);

// Common Spanish/Colombian Surnames (Uppercased & Normalized)
const COMMON_SURNAMES = new Set([
  'RODRIGUEZ', 'RODRÍGUEZ', 'GOMEZ', 'GÓMEZ', 'GONZALEZ', 'GONZÁLEZ', 'MARTINEZ', 'MARTÍNEZ',
  'GARCIA', 'GARCÍA', 'LOPEZ', 'LÓPEZ', 'HERNANDEZ', 'HERNÁNDEZ', 'SANCHEZ', 'SÁNCHEZ',
  'RAMIREZ', 'RAMÍREZ', 'PEREZ', 'PÉREZ', 'DIAZ', 'DÍAZ', 'MUNOZ', 'MUÑOZ', 'ROJAS',
  'MORENO', 'ORTIZ', 'ORTÍZ', 'JIMENEZ', 'JIMÉNEZ', 'CASTRO', 'VARGAS', 'ALVAREZ', 'ÁLVAREZ',
  'ROMERO', 'GUTIERREZ', 'GUTIÉRREZ', 'SUAREZ', 'SUÁREZ', 'TORRES', 'RUIZ', 'RUÍZ',
  'FLOREZ', 'FLÓREZ', 'FLORES', 'MORALES', 'VALENCIA', 'RAMOS', 'MENDOZA', 'QUINTERO',
  'HERRERA', 'MEDINA', 'AGUILAR', 'GUZMAN', 'GUZMÁN', 'CARRILLO', 'PALACIO', 'PALACIOS',
  'ZAPATA', 'VELASQUEZ', 'VELÁSQUEZ', 'PINZON', 'PINZÓN', 'CORREA', 'SERRANO', 'OSPINA',
  'CARDONA', 'MONTOYA', 'OSORIO', 'RESTREPO', 'SALAZAR', 'CARDENAS', 'CÁRDENAS', 'ACOSTA',
  'DUARTE', 'PARRA', 'RIOS', 'RÍOS', 'SALGADO', 'MEJIA', 'MEJÍA', 'ARIAS', 'TRUJILLO',
  'VEGA', 'PARDO', 'FORERO', 'RINCON', 'RINCÓN', 'AVILA', 'ÁVILA', 'CAMARGO', 'BUITRAGO',
  'BAUTISTA', 'CACERES', 'CÁCERES', 'JAIMES', 'RANGEL', 'CALDERON', 'CALDERÓN', 'SOTO',
  'BARRIOS', 'PEÑA', 'VERA', 'GELVES', 'SANDOVAL', 'VILLAMIZAR', 'ORDONEZ', 'ORDOÑEZ',
  'ORDOÑEZ', 'ORDÓÑEZ', 'CAICEDO', 'BOHORQUEZ', 'BOHÓRQUEZ', 'BECERRA', 'MONROY',
  'PATINO', 'PATIÑO', 'ARDILA', 'CHACON', 'CHACÓN', 'PLATA', 'RUEDA', 'BAEZ', 'BÁEZ',
  'VILLALOBOS', 'CAMACHO', 'REYES', 'LOZANO', 'GUERRERO', 'ROA', 'BELTRAN', 'BELTRÁN',
  'CIFUENTES', 'PINEDA', 'OCHOA', 'CORTES', 'CORTÉS', 'CORDOBA', 'CÓRDOBA', 'HURTADO',
  'AGUDELO', 'LONDONO', 'LONDOÑO', 'GAVIRIA', 'ZULUAGA', 'JARAMILLO', 'BEDOYA',
  'TANGARIFE', 'TELLEZ', 'TÉLLEZ', 'PEÑALOZA', 'CEPEDA', 'MONCADA', 'HIGUERA', 'ACEVEDO',
  'ANGARITA', 'BARRERA', 'BERNAL', 'CANO', 'CARVAJAL', 'CORDERO', 'DELGADO', 'ESPINOSA',
  'FAJARDO', 'GALVIS', 'GIRON', 'GIRÓN', 'HENAO', 'IBARRA', 'LADINO', 'LLANO', 'MACIAS',
  'MACÍAS', 'NAVARRO', 'NIETO', 'OCAMPO', 'OVIEDO', 'PABON', 'PABÓN', 'PACHECO', 'PADILLA',
  'POLO', 'POSADA', 'PUERTA', 'QUEVEDO', 'QUIROGA', 'RENDON', 'RENDÓN', 'REPOLL', 'REY',
  'ROCHA', 'SALAMANCA', 'SANABRIA', 'SIERRA', 'SILVA', 'SOLANO', 'TAVERA', 'TOBON', 'TOBÓN',
  'TRIANA', 'URBINA', 'URIBE', 'VALDERRAMA', 'VALLEJO', 'VANEGAS', 'VASQUEZ', 'VÁSQUEZ',
  'VILLAMIL', 'ZAMBRANO'
]);

/**
 * Cleans special characters from names (/ and -), replacing them with spaces
 * and removing unwanted double spaces or punctuation.
 */
export const cleanSpecialCharacters = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/[/\\_-]+/g, ' ')
    .replace(/[;,.:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Converts a single word or full string to proper Title Case (Sentence style).
 * Keeps lowercase for connecting prepositions when appropriate.
 */
export const toTitleCase = (text: string): string => {
  if (!text) return '';
  const clean = cleanSpecialCharacters(text);
  const words = clean.split(/\s+/);
  
  const lowerParticles = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'von', 'van']);

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowerParticles.has(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Extracts the first given name ([PRIMER_NOMBRE]) from a full name string,
 * taking into account typical Colombian format APELLIDOS + NOMBRES,
 * slash/hyphen separation, and standard heuristics.
 */
export const extractFirstName = (rawName: string): string => {
  if (!rawName) return '';

  const rawTrimmed = rawName.trim();
  if (!rawTrimmed) return '';

  // 1. Explicit Slash Separation (e.g., "ZAPATA JESUS/SERGIO", "CARRILLO PALACIO / JUAN CARLOS")
  // The part after the slash corresponds to the given name(s).
  if (rawTrimmed.includes('/') || rawTrimmed.includes('\\')) {
    const parts = rawTrimmed.split(/[/|\\]/);
    if (parts.length >= 2) {
      const afterSlash = cleanSpecialCharacters(parts[1]);
      if (afterSlash) {
        const afterWords = afterSlash.split(/\s+/);
        if (afterWords.length > 0 && afterWords[0]) {
          return toTitleCase(afterWords[0]);
        }
      }
    }
  }

  // 2. Hyphen separation if used as surname-name separator (e.g., "ZAPATA JESUS-SERGIO")
  // Check if hyphen separates a known given name at the end
  if (rawTrimmed.includes('-')) {
    const parts = rawTrimmed.split('-');
    if (parts.length >= 2) {
      const afterHyphen = cleanSpecialCharacters(parts[parts.length - 1]);
      const afterUpper = afterHyphen.toUpperCase();
      if (COMMON_GIVEN_NAMES.has(afterUpper) || !COMMON_SURNAMES.has(afterUpper)) {
        const words = afterHyphen.split(/\s+/);
        if (words.length > 0 && words[0]) {
          return toTitleCase(words[0]);
        }
      }
    }
  }

  // 3. Clean all special characters to analyze token sequence
  const clean = cleanSpecialCharacters(rawTrimmed);
  const words = clean.split(/\s+/);
  if (words.length === 0 || !words[0]) return '';
  if (words.length === 1) return toTitleCase(words[0]);

  const upperWords = words.map((w) => w.toUpperCase());

  // 4. Case: 4 Words (e.g. "CARRILLO PALACIO JUAN CARLOS")
  // Structure in Excel: [APELLIDO1] [APELLIDO2] [NOMBRE1] [NOMBRE2]
  if (words.length === 4) {
    const [w0, w1, w2, w3] = upperWords;
    
    // If w0 is a surname or w2 is a given name, format is APELLIDOS + NOMBRES
    const isW0Given = COMMON_GIVEN_NAMES.has(w0) && !COMMON_SURNAMES.has(w0);
    const isW2Given = COMMON_GIVEN_NAMES.has(w2);
    const isW0Surname = COMMON_SURNAMES.has(w0);

    if (isW0Given && !isW0Surname) {
      // Format is NOMBRES + APELLIDOS (e.g., "JUAN CARLOS CARRILLO PALACIO")
      return toTitleCase(words[0]);
    }

    if (isW2Given || isW0Surname) {
      // Format is APELLIDOS + NOMBRES (e.g., "CARRILLO PALACIO JUAN CARLOS")
      return toTitleCase(words[2]); // JUAN
    }

    // Default for 4 words in administrative records: 3rd word is first given name
    return toTitleCase(words[2]);
  }

  // 5. Case: 3 Words
  // Examples:
  // - "HERNANDEZ DIEGO FERNANDO" (1 Apellido + 2 Nombres) -> DIEGO (word 1)
  // - "GARCIA LOPEZ JUAN" (2 Apellidos + 1 Nombre) -> JUAN (word 2)
  // - "DIEGO FERNANDO HERNANDEZ" (2 Nombres + 1 Apellido) -> DIEGO (word 0)
  // - "JUAN PEREZ GOMEZ" (1 Nombre + 2 Apellidos) -> JUAN (word 0)
  if (words.length === 3) {
    const [w0, w1, w2] = upperWords;

    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w0IsGiven = COMMON_GIVEN_NAMES.has(w0);
    const w1IsSurname = COMMON_SURNAMES.has(w1);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);
    const w2IsSurname = COMMON_SURNAMES.has(w2);
    const w2IsGiven = COMMON_GIVEN_NAMES.has(w2);

    // If w0 is clearly a surname and w1 is a given name ("HERNANDEZ DIEGO FERNANDO")
    if ((w0IsSurname && w1IsGiven) || (w0IsSurname && !w0IsGiven && !w1IsSurname)) {
      return toTitleCase(words[1]); // DIEGO
    }

    // If w0 and w1 are surnames and w2 is given name ("GARCIA LOPEZ JUAN" or "ZAPATA JESUS SERGIO")
    if (w0IsSurname && (w1IsSurname || w2IsGiven) && w2IsGiven) {
      return toTitleCase(words[2]); // JUAN / SERGIO
    }

    // If w0 is given name ("DIEGO FERNANDO HERNANDEZ" or "JUAN PEREZ GOMEZ")
    if (w0IsGiven && !w0IsSurname) {
      return toTitleCase(words[0]); // DIEGO / JUAN
    }

    // In administrative records with 3 words starting with a surname, word 1 is typically the first given name
    if (w0IsSurname) {
      return toTitleCase(words[1]);
    }

    // Default fallback
    return toTitleCase(words[0]);
  }

  // 6. Case: 2 Words
  // - "HERNANDEZ DIEGO" (Apellido + Nombre) -> DIEGO
  // - "DIEGO HERNANDEZ" (Nombre + Apellido) -> DIEGO
  if (words.length === 2) {
    const [w0, w1] = upperWords;
    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w0IsGiven = COMMON_GIVEN_NAMES.has(w0);
    const w1IsSurname = COMMON_SURNAMES.has(w1);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);

    if (w0IsSurname && w1IsGiven) {
      return toTitleCase(words[1]); // DIEGO
    }
    if (w0IsGiven) {
      return toTitleCase(words[0]); // DIEGO
    }
    if (w1IsGiven && !w0IsGiven) {
      return toTitleCase(words[1]);
    }
    return toTitleCase(words[0]);
  }

  // Case: 5+ Words (handles compound names/surnames e.g. "DE LA ROSA JUAN CARLOS")
  // Search for the first recognized given name
  for (let i = 0; i < words.length; i++) {
    const wUpper = upperWords[i];
    if (COMMON_GIVEN_NAMES.has(wUpper)) {
      return toTitleCase(words[i]);
    }
  }

  return toTitleCase(words[0]);
};

/**
 * Formats the full applicant name into proper Title Case and reorders
 * from APELLIDOS NOMBRES to NOMBRES APELLIDOS when applicable for formal documents.
 * 
 * Examples:
 * - "CARRILLO PALACIO JUAN CARLOS" -> "Juan Carlos Carrillo Palacio"
 * - "HERNANDEZ DIEGO FERNANDO"     -> "Diego Fernando Hernandez"
 * - "ZAPATA JESUS/SERGIO"          -> "Zapata Jesus Sergio"
 * - "ZAPATA JESUS-SERGIO"          -> "Zapata Jesus Sergio"
 */
export const formatApplicantName = (rawName: string): string => {
  if (!rawName) return '';
  const rawTrimmed = rawName.trim();
  if (!rawTrimmed) return '';

  // 1. If separated by special characters (/ , \ , - , _ , | , etc.):
  // e.g. "ZAPATA JESUS/SERGIO" -> "Zapata Jesus Sergio"
  // e.g. "ZAPATA JESUS-SERGIO" -> "Zapata Jesus Sergio"
  if (/[\/\-\\_\,|;]/.test(rawTrimmed)) {
    const cleaned = cleanSpecialCharacters(rawTrimmed);
    return toTitleCase(cleaned);
  }

  const clean = cleanSpecialCharacters(rawTrimmed);
  const words = clean.split(/\s+/);
  if (words.length <= 1) return toTitleCase(clean);

  const upperWords = words.map((w) => w.toUpperCase());

  // 2. Format 4 words: "CARRILLO PALACIO JUAN CARLOS" -> "Juan Carlos Carrillo Palacio"
  if (words.length === 4) {
    const [w0, w1, w2, w3] = upperWords;
    const isW0Given = COMMON_GIVEN_NAMES.has(w0) && !COMMON_SURNAMES.has(w0);
    const isW2Given = COMMON_GIVEN_NAMES.has(w2);
    const isW0Surname = COMMON_SURNAMES.has(w0);

    if (isW0Given && !isW0Surname) {
      // Already Nombres + Apellidos
      return toTitleCase(clean);
    }

    if (isW2Given || isW0Surname) {
      // Convert "CARRILLO PALACIO JUAN CARLOS" -> "Juan Carlos Carrillo Palacio"
      const nombres = `${words[2]} ${words[3]}`;
      const apellidos = `${words[0]} ${words[1]}`;
      return `${toTitleCase(nombres)} ${toTitleCase(apellidos)}`;
    }

    return toTitleCase(clean);
  }

  // 3. Format 3 words:
  // "HERNANDEZ DIEGO FERNANDO" -> "Diego Fernando Hernandez"
  // "GARCIA LOPEZ JUAN" -> "Juan Garcia Lopez"
  // "ZAPATA JESUS SERGIO" -> "Zapata Jesus Sergio"
  if (words.length === 3) {
    const [w0, w1, w2] = upperWords;
    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w0IsGiven = COMMON_GIVEN_NAMES.has(w0);
    const w1IsSurname = COMMON_SURNAMES.has(w1);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);
    const w2IsSurname = COMMON_SURNAMES.has(w2);
    const w2IsGiven = COMMON_GIVEN_NAMES.has(w2);

    // "HERNANDEZ DIEGO FERNANDO" (1 Apellido + 2 Nombres) -> "Diego Fernando Hernandez"
    if (w0IsSurname && w1IsGiven && w2IsGiven) {
      const nombres = `${words[1]} ${words[2]}`;
      const apellido = words[0];
      return `${toTitleCase(nombres)} ${toTitleCase(apellido)}`;
    }

    // "GARCIA LOPEZ JUAN" (2 Apellidos + 1 Nombre) -> "Juan Garcia Lopez"
    if (w0IsSurname && w1IsSurname && w2IsGiven) {
      const nombre = words[2];
      const apellidos = `${words[0]} ${words[1]}`;
      return `${toTitleCase(nombre)} ${toTitleCase(apellidos)}`;
    }

    // "ZAPATA JESUS SERGIO"
    if (w0IsSurname && !w1IsSurname && !w2IsSurname) {
      // If it originated from ZAPATA JESUS/SERGIO or similar, keep Title Case sequence
      return toTitleCase(clean);
    }

    return toTitleCase(clean);
  }

  // 4. Format 2 words: "HERNANDEZ DIEGO" -> "Diego Hernandez"
  if (words.length === 2) {
    const [w0, w1] = upperWords;
    const w0IsSurname = COMMON_SURNAMES.has(w0);
    const w1IsGiven = COMMON_GIVEN_NAMES.has(w1);

    if (w0IsSurname && w1IsGiven) {
      return `${toTitleCase(words[1])} ${toTitleCase(words[0])}`;
    }
    return toTitleCase(clean);
  }

  return toTitleCase(clean);
};

/**
 * Full name parsing outcome helper.
 */
export const parsePersonName = (rawName: string) => {
  return {
    rawClean: cleanSpecialCharacters(rawName),
    firstName: extractFirstName(rawName),
    fullName: formatApplicantName(rawName),
  };
};

/**
 * Replaces all known template variables in a text with real normalized values from record and user profile.
 */
export const replaceTemplateVariables = (
  content: string,
  record?: {
    nombreSolicitante?: string;
    radicadoEntrada?: string;
    fechaSolicitud?: string;
    numeroCuenta?: string;
    cuenta?: string;
    numeroProceso?: string;
    correoSolicitante?: string;
    direccionSolicitante?: string;
    cedulaSolicitante?: string;
    departamentoSolicitante?: string;
    municipioSolicitante?: string;
  } | null,
  profile?: {
    name?: string;
    position?: string;
    email?: string;
    signatureUrl?: string;
  } | null
): string => {
  if (!content) return '';

  const rawName = record?.nombreSolicitante || '';
  const primerNombre = extractFirstName(rawName);
  const nombreNormalizado = formatApplicantName(rawName);
  const cuenta = record?.numeroCuenta || record?.cuenta || '';

  return content
    .replace(/\[NOMBRE_SOLICITANTE\]/g, nombreNormalizado || '—')
    .replace(/\[PRIMER_NOMBRE\]/g, primerNombre || '—')
    .replace(/\[RADICADO_ENTRADA\]/g, record?.radicadoEntrada || '—')
    .replace(/\[NUMERO_PROCESO\]/g, record?.numeroProceso || '—')
    .replace(/\[FECHA_SOLICITUD\]/g, record?.fechaSolicitud || '—')
    .replace(/\[NUMERO_CUENTA\]/g, cuenta || '—')
    .replace(/\[CORREO_SOLICITANTE\]/g, record?.correoSolicitante || '—')
    .replace(/\[DIRECCION_SOLICITANTE\]/g, record?.direccionSolicitante || '—')
    .replace(/\[CEDULA_SOLICITANTE\]/g, record?.cedulaSolicitante || '—')
    .replace(/\[NOMBRE_FIRMANTE\]/g, profile?.name || 'Funcionario ESSA')
    .replace(/\[CARGO_FIRMANTE\]/g, profile?.position || 'Gestor ESSA')
    .replace(/\[CORREO_FIRMANTE\]/g, profile?.email || 'notificaciones@essa.com.co')
    .replace(/\[FIRMA_DOCUMENTO\]/g, '[Firma Digital ESSA]');
};

