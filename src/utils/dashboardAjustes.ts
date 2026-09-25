/**
 * Ajustes manuales de fecha real de recepción para radicados recibidos por
 * correo electrónico (como el tablero de referencia): si el correo llegó
 * antes de la fecha oficial del sistema, los días en bandeja se cuentan
 * desde la fecha real. Persiste en este equipo (localStorage).
 */

const LS_KEY = 'essa-dashboard-ajustes-correo';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Clave yyyy-mm-dd para <input type="date">. */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Interpreta yyyy-mm-dd como fecha local (mediodía evitado: medianoche local). */
export function parseIsoDate(v: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec((v ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function loadAjustes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && parseIsoDate(v) !== null) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function persist(map: Record<string, string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // Persistencia best-effort (modo privado, cuota llena, etc.)
  }
}

export function saveAjuste(key: string, iso: string): Record<string, string> {
  const map = loadAjustes();
  map[key] = iso;
  persist(map);
  return map;
}

export function removeAjuste(key: string): Record<string, string> {
  const map = loadAjustes();
  delete map[key];
  persist(map);
  return map;
}
