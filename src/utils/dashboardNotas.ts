/**
 * Notas y observaciones del trabajo diario (Módulo 2 · Cuadro de Mando).
 *
 * Son el espacio para registrar comentarios o información adicional relacionada
 * con la gestión del día. Se persisten en la caché del navegador (localStorage)
 * para que sobrevivan a recargas y cierres del navegador, hasta que el usuario
 * limpie los datos almacenados.
 */

const LS_KEY = 'essa-dashboard-notas';

export interface NotaTrabajo {
  /** Identificador estable (permite editar y eliminar). */
  id: string;
  /** Contenido de la observación. */
  texto: string;
  /** Radicado asociado ('' = nota general del trabajo diario). */
  radicado: string;
  /** Fecha/hora de creación (ISO). */
  creadaEn: string;
  /** Fecha/hora de la última edición (ISO). */
  actualizadaEn: string;
}

/** Entrada de usuario para crear o editar una nota. */
export interface NotaInput {
  id?: string;
  texto: string;
  radicado?: string;
}

function limpia(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function nuevoId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function persist(notas: NotaTrabajo[]): NotaTrabajo[] {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(notas));
  } catch {
    // Persistencia best-effort (modo privado, cuota llena, etc.)
  }
  return notas;
}

function porFechaDesc(a: NotaTrabajo, b: NotaTrabajo): number {
  return b.actualizadaEn.localeCompare(a.actualizadaEn);
}

/** Lee las notas guardadas; ignora entradas corruptas o incompletas. */
export function loadNotas(): NotaTrabajo[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: NotaTrabajo[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const rec = item as Record<string, unknown>;
      const texto = limpia(rec.texto);
      if (!texto) continue;
      const creadaEn = limpia(rec.creadaEn) || new Date().toISOString();
      out.push({
        id: limpia(rec.id) || nuevoId(),
        texto,
        radicado: limpia(rec.radicado),
        creadaEn,
        actualizadaEn: limpia(rec.actualizadaEn) || creadaEn,
      });
    }
    return out.sort(porFechaDesc);
  } catch {
    return [];
  }
}

/**
 * Crea una nota nueva o actualiza una existente (según `id`).
 * Devuelve la lista completa ya persistida. Un texto vacío no guarda nada.
 */
export function upsertNota(nota: NotaInput): NotaTrabajo[] {
  const texto = limpia(nota.texto);
  const notas = loadNotas();
  if (!texto) return notas;

  const ahora = new Date().toISOString();
  const radicado = limpia(nota.radicado);
  const idx = nota.id ? notas.findIndex((n) => n.id === nota.id) : -1;

  if (idx >= 0) {
    const prev = notas[idx]!;
    notas[idx] = { ...prev, texto, radicado, actualizadaEn: ahora };
  } else {
    notas.push({
      id: nota.id ?? nuevoId(),
      texto,
      radicado,
      creadaEn: ahora,
      actualizadaEn: ahora,
    });
  }
  return persist(notas.sort(porFechaDesc));
}

/** Elimina una nota por id y devuelve la lista restante. */
export function deleteNota(id: string): NotaTrabajo[] {
  return persist(
    loadNotas()
      .filter((n) => n.id !== id)
      .sort(porFechaDesc)
  );
}

/** Referencias que no identifican ningún radicado real. */
const SIN_RADICADO = new Set(['', '—', '-', '–', 'n/a', 'na', 's/r', 'sin radicado', 'no aplica']);

/** Normaliza una referencia de radicado para compararla con independencia de formato. */
function normRef(v: string): string {
  const s = limpia(v).toLowerCase().replace(/\s+/g, ' ');
  if (SIN_RADICADO.has(s)) return '';
  const digits = s.replace(/\D/g, '');
  return digits.length >= 5 ? digits : s;
}

/** ¿Dos referencias apuntan al mismo radicado? ('' o '—' nunca coinciden). */
export function mismaRadicado(a: string, b: string): boolean {
  const na = normRef(a);
  const nb = normRef(b);
  return Boolean(na) && Boolean(nb) && na === nb;
}

/** Notas asociadas a un radicado concreto (las generales quedan fuera). */
export function notasDe(notas: NotaTrabajo[], radicado: string): NotaTrabajo[] {
  return notas.filter((n) => n.radicado && mismaRadicado(n.radicado, radicado)).sort(porFechaDesc);
}

/** 'dd/mm/aaaa · hh:mm' para mostrar en la interfaz. */
export function formatNotaFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
