/**
 * Colores personalizados por registro (Módulo 2 · Cuadro de Mando).
 *
 * Cada radicado del trabajo diario puede marcarse con uno de los cinco colores
 * de la paleta para identificarlo de un vistazo en el listado. La asignación se
 * guarda en la caché del navegador (localStorage) y sobrevive a recargas y
 * cierres del navegador hasta que el usuario limpie los datos almacenados.
 */

const LS_KEY = 'essa-dashboard-colores';

export interface ColorRegistro {
  /** Identificador estable (se usa en la interfaz de prueba y en el DOM). */
  id: string;
  /** Color en hexadecimal (#rrggbb). */
  hex: string;
  /** Nombre legible para el tooltip y la etiqueta accesible. */
  nombre: string;
}

/** Paleta fija de cinco colores disponibles para marcar registros. */
export const PALETA_COLORES: readonly ColorRegistro[] = [
  { id: 'azul', hex: '#1565d8', nombre: 'Azul' },
  { id: 'violeta', hex: '#7b61d8', nombre: 'Violeta' },
  { id: 'teal', hex: '#0d9488', nombre: 'Verde azulado' },
  { id: 'rosa', hex: '#e0508f', nombre: 'Rosa' },
  { id: 'naranja', hex: '#f2801d', nombre: 'Naranja' },
];

const PALETA_SET = new Set(PALETA_COLORES.map((c) => c.hex.toLowerCase()));

/** ¿El valor pertenece a la paleta oficial? (filtra datos externos o corruptos) */
export function esColorPaleta(hex: unknown): hex is string {
  return typeof hex === 'string' && PALETA_SET.has(hex.toLowerCase());
}

/** Devuelve el hex tal como está en la paleta (respetando mayúsculas/minúsculas oficiales). */
function canonico(hex: string): string {
  return PALETA_COLORES.find((c) => c.hex.toLowerCase() === hex.toLowerCase())!.hex;
}

function persist(colores: Record<string, string>): Record<string, string> {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(colores));
  } catch {
    // Persistencia best-effort (modo privado, cuota llena, etc.)
  }
  return colores;
}

/** Lee los colores guardados; descarta claves vacías y colores fuera de la paleta. */
export function loadColores(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!k.trim() || !esColorPaleta(v)) continue;
      out[k] = canonico(v);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Asigna (o quita con `hex = null`) el color de un registro.
 * Devuelve el mapa completo ya persistido.
 */
export function saveColor(key: string, hex: string | null): Record<string, string> {
  const colores = loadColores();
  const k = key.trim();
  if (!k) return colores;
  if (hex === null || !esColorPaleta(hex)) delete colores[k];
  else colores[k] = canonico(hex);
  return persist(colores);
}
