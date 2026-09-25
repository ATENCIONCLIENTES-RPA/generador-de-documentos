import { isBusinessDay, parseDateOnly } from './businessDays';
import { parseIsoDate } from './dashboardAjustes';
import type { Record as EssaRecord } from '@/types/record';

/**
 * Motor del Cuadro de Mando.
 * Replica la lógica del tablero de referencia (Cuadro de Mando.html):
 * agrupación por radicado, ventana de 20 días hábiles, semáforo Vencido /
 * Crítico / Próximo / En plazo / Sin fecha, vencidas (día > 15 + Estado P en
 * Mercurio), cruce SAC ↔ Mercurio, agrupación de variantes de responsable y
 * filtro de trámites admitidos.
 */

/** Umbrales del semáforo (días restantes, como el tablero de referencia). */
export const DIAS_HABILES = 15;
export const DIAS_VENTANA = 20;
export const CRITICO_DIAS = 2;
export const PROXIMO_DIAS = 5;

/** Solo estos prefijos de código alimentan el filtro "Tipo de trámite". */
export const PREFIJOS_TRAMITE = /^(27|28|29|30|31|39|4153|4101|4115)/;
/** Radicados "de relleno": terminan en 5 o más ceros, no se agrupan. */
export const PATRON_RELLENO = /0{5,}$/;
/** Rutas de Mercurio excluidas del informe. */
const RUTAS_EXCLUIDAS = [
  'essa-distribucion y alistamiento de correspondencia',
  'gestion documental',
  'sgepm - novedades venta de facturas',
];

const MEDIOS_OK = ['escrito', 'página web', 'e-mail'];

export type EstadoV = 'Vencido' | 'Crítico' | 'Próximo' | 'En plazo' | 'Sin fecha';
export type FuenteGrupo = 'SAC + Mercurio' | 'Solo SAC' | 'Solo Mercurio';

export interface DaySlot {
  dia: number;
  fecha: Date;
  key: string;
}

export interface ProcesoInfo {
  numero: string;
  cuenta: string;
  codTram: string;
  tramite: string;
  responsableRevision: string;
  observacion: string;
  estadoRevision: string;
  numeroRevision: string;
  fechaRevision: string;
  motivo: string;
  ultimaAccion: string;
  accionFinalizada: string;
  fechaVencimiento: string;
}

export interface RadicadoGroup {
  key: string;
  radicado: string;
  fSol: Date | null;
  fVto: Date | null;
  /** Fecha real de recepción (solo correos con ajuste manual). */
  ajuste: Date | null;
  /** Fecha efectiva para contar días: ajuste ?? fSol. */
  fEfe: Date | null;
  /** Posición en la ventana de días hábiles (1 = más reciente). null fuera de ventana. */
  dia: number | null;
  enVentana: boolean;
  /** Día > 15 con Estado P en Mercurio (plazo superado fuera de la ventana). */
  vencida: boolean;
  /** Días calendario restantes al vencimiento (negativo = vencido). */
  restan: number | null;
  estadoV: EstadoV;
  procesos: ProcesoInfo[];
  nProc: number;
  cuenta: string;
  nCuentas: number;
  tramite: string;
  tramites: string[];
  tipo: string;
  medio: string;
  responsable: string;
  /** Claves canónicas del responsable (variantes agrupadas). */
  respCanon: string[];
  /** Nombre tal como figura en el archivo de origen (si difiere del grupo). */
  respVariante: string;
  solicitante: string;
  municipio: string;
  estadoMer: string;
  fuente: FuenteGrupo;
  searchText: string;
}

export interface GroupFilters {
  responsable: string;
  tipo: string;
  q: string;
  incluirFuera: boolean;
  soloMedios: boolean;
}

export const TODOS = 'todos';

export const DEFAULT_GROUP_FILTERS: GroupFilters = {
  responsable: TODOS,
  tipo: TODOS,
  q: '',
  incluirFuera: false,
  soloMedios: true,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDMY(d: Date | null): string {
  if (!d) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function digitsOf(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

/** Caracteres invisibles / de formato que no deben distinguir responsables. */
const INVISIBLES = new RegExp('[\\p{Cc}\\p{Cf}\u180E]+', 'gu');
/** Separadores equivalentes (incluye variantes Unicode que se ven igual). */
const SEPARADORES = new RegExp(
  '[._\\-/\u2010-\u2015\u2212\uFE58\uFE63\uFF0D\uFF3F\uFE33\uFE34\u02CD\u2017\u00AF]+',
  'g'
);

function txt(value: unknown): string {
  return String(value ?? '')
    .replace(/_x000D_/g, ' ')
    .replace(INVISIBLES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normText(value: unknown): string {
  return txt(value);
}

/** Minúsculas sin tildes (para comparaciones). */
function sinTilde(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function midnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Últimos `size` días hábiles hasta `ref` (día 1 = el más reciente). */
export function buildBusinessWindow(ref: Date, size: number = DIAS_VENTANA): DaySlot[] {
  const out: DaySlot[] = [];
  const cur = midnight(ref);
  let guard = 0;
  while (out.length < size && guard < size * 10) {
    guard += 1;
    if (isBusinessDay(cur)) {
      out.push({ dia: out.length + 1, fecha: new Date(cur), key: dayKeyOf(cur) });
    }
    cur.setDate(cur.getDate() - 1);
  }
  return out;
}

/** Avanza hasta el siguiente día hábil (para fechas que caen en fin de semana/festivo). */
export function snapToBusinessDay(d: Date): Date {
  const x = new Date(d);
  let guard = 0;
  while (!isBusinessDay(x) && guard < 15) {
    x.setDate(x.getDate() + 1);
    guard += 1;
  }
  return x;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function rawOf(row: EssaRecord, ...keys: string[]): string {
  const rec = row as unknown as Record<string, unknown>;
  for (const k of keys) {
    const v = normText(rec[k]);
    if (v) return v;
  }
  return '';
}

/* ── Unificación de nombres de responsable (port del tablero de referencia) ── */

const PALABRAS_OMIT = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

export function canonNombre(n: string): string {
  return sinTilde(
    String(n ?? '')
      .normalize('NFKC')
      .replace(INVISIBLES, ' ')
      .replace(/^.*\\/, '')
      .replace(/\(.*?\)/g, '')
  )
    .replace(SEPARADORES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensNombre(n: string): string[] {
  return canonNombre(n)
    .replace(/[.,;_]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !PALABRAS_OMIT.has(t));
}

/** Dos nombres son compatibles si, token a token, coinciden o uno es inicial del otro. */
function compatiblesTok(a: string[], b: string[]): boolean {
  const n = Math.min(a.length, b.length);
  if (n < 2) return false;
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x === y) continue;
    if (x.length === 1 && y[0] === x) continue;
    if (y.length === 1 && x[0] === y) continue;
    return false;
  }
  return true;
}

/** Comprueba si el nombre corresponde a la cuenta genérica / administrador "Atención Clientes". */
export function isAtencionClientes(name: string): boolean {
  const c = canonNombre(name);
  return c === 'atencion clientes' || c === 'atencion cliente' || c === 'atencion al cliente';
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  // Inicial
  if ((a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))) {
    return 0.7;
  }
  // Substring / prefijo
  if (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a))) {
    return 0.85;
  }
  // Levenshtein para variaciones leves / tipográficas
  const maxLen = Math.max(a.length, b.length);
  if (maxLen >= 4) {
    const dist = levenshteinDistance(a, b);
    if (dist === 1) return 0.85;
    if (dist === 2 && maxLen >= 7) return 0.65;
  }
  return 0;
}

/**
 * Dado un nombre de perfil y la lista de opciones de responsable,
 * devuelve la `key` de la opción más similar (fuzzy matching).
 * Retorna `null` si el perfil es "Atención Clientes" o si no hay coincidencia suficiente.
 */
export function fuzzyMatchResponsable(
  profileName: string,
  options: { key: string; nombre: string }[]
): string | null {
  if (!profileName || !profileName.trim() || options.length === 0) return null;
  if (isAtencionClientes(profileName)) return null;

  const profCanon = canonNombre(profileName);

  // 1) Coincidencia canónica exacta (tildes, mayúsculas, caracteres especiales)
  const exact = options.find((o) => o.key === profCanon || canonNombre(o.nombre) === profCanon);
  if (exact) return exact.key;

  // 2) Token overlap y similitud
  const profTokens = tokensNombre(profileName);
  if (profTokens.length === 0) return null;

  let bestKey: string | null = null;
  let bestScore = 0;

  for (const opt of options) {
    const optTokens = tokensNombre(opt.nombre);
    if (optTokens.length === 0) continue;

    let matchedScore = 0;
    for (const pt of profTokens) {
      let maxTokSim = 0;
      for (const ot of optTokens) {
        const sim = tokenSimilarity(pt, ot);
        if (sim > maxTokSim) maxTokSim = sim;
      }
      matchedScore += maxTokSim;
    }

    const ratioProf = matchedScore / profTokens.length;

    let optMatchedScore = 0;
    for (const ot of optTokens) {
      let maxTokSim = 0;
      for (const pt of profTokens) {
        const sim = tokenSimilarity(ot, pt);
        if (sim > maxTokSim) maxTokSim = sim;
      }
      optMatchedScore += maxTokSim;
    }
    const ratioOpt = optMatchedScore / optTokens.length;

    const f1 = ratioProf + ratioOpt > 0 ? (2 * ratioProf * ratioOpt) / (ratioProf + ratioOpt) : 0;
    const combinedScore = Math.max(f1, ratioProf * 0.9);

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestKey = opt.key;
    }
  }

  // Requiere al menos 50% de similitud ponderada
  return bestScore >= 0.5 ? bestKey : null;
}

export interface ResponsableCluster {
  key: string;
  nombre: string;
  n: number;
}

/** Agrupa variantes del mismo usuario; el más completo define el nombre del grupo. */
export function agrupaResponsables(nombres: string[]): Map<string, ResponsableCluster> {
  const info = [...new Set(nombres.filter(Boolean).map((n) => txt(n)))]
    .map((n) => ({ n, t: tokensNombre(n) }))
    .filter((x) => x.t.length);
  info.sort(
    (a, b) => b.t.length - a.t.length || b.n.length - a.n.length || a.n.localeCompare(b.n, 'es')
  );
  const clusters: { t: string[]; nombre: string; vars: string[] }[] = [];
  for (const x of info) {
    const cand = clusters.filter((c) => compatiblesTok(c.t, x.t));
    if (cand.length === 1) cand[0]!.vars.push(x.n);
    else clusters.push({ t: x.t, nombre: x.n, vars: [x.n] });
  }
  const mapa = new Map<string, ResponsableCluster>();
  for (const c of clusters) {
    const key = canonNombre(c.nombre);
    for (const v of c.vars) {
      mapa.set(canonNombre(v), { key, nombre: c.nombre, n: c.vars.length });
    }
  }
  return mapa;
}

function grupoDe(mapa: Map<string, ResponsableCluster>, n: string): ResponsableCluster | null {
  const c = canonNombre(n);
  if (!c) return null;
  return mapa.get(c) ?? { key: c, nombre: txt(n), n: 1 };
}

/* ── Reglas de admisión (port del tablero de referencia) ── */

/** Trámites admitidos en el desplegable (por prefijo del código). */
export function tramiteAdmitido(cod: string): boolean {
  return PREFIJOS_TRAMITE.test(String(cod ?? ''));
}

/** Proceso cancelado: no entra al informe aunque comparta radicado. */
export function esCanceladoRow(row: EssaRecord): boolean {
  const sub = sinTilde(rawOf(row, 'SUBESTADO', 'Subestado'));
  const fin = sinTilde(rawOf(row, 'ESTADO_FIN_INICIAL', 'ESTADO FIN INICIAL'));
  return /^(c|cancelad)/.test(sub) || /^(c|cancelad)/.test(fin);
}

/** Rutas de Mercurio excluidas del informe. */
export function rutaExcluida(ruta: string): boolean {
  const s = sinTilde(ruta);
  return !!s && RUTAS_EXCLUIDAS.some((x) => s === x || s.indexOf(x) === 0);
}

/** Solo medios Escrito, Página Web y E-Mail (Mercurio cuenta como Escrito). */
export function medioValido(medio: string): boolean {
  const s = sinTilde(medio);
  if (!s || s === 'sin medio') return false;
  return (
    MEDIOS_OK.some((x) => s === x) ||
    /correo|e-?mail/.test(s) ||
    /pagina web|portal web/.test(s) ||
    /^escrito/.test(s)
  );
}

/* ── Lecturas por columna (SAC crudo + Mercurio crudo + canónicos) ── */

function respSacOf(row: EssaRecord): string {
  return (
    rawOf(row, 'NOMBRE_USUARIO_INICIAL_PROCESO', 'NOMBRE USUARIO INICIAL PROCESO') ||
    normText(row.usuarioResponsableInsumo) ||
    normText(row.responsableInsumo)
  );
}

function limpiaUsuario(v: string): string {
  return txt(v).replace(/^.*\\/, '').trim();
}

interface TramiteParts {
  cod: string;
  tramite: string;
}

function tramiteOf(row: EssaRecord): TramiteParts {
  const numProc = normText(row.numeroProceso);
  let cod = rawOf(row, 'PROCESO');
  if (cod && cod === numProc) cod = '';
  const desc =
    rawOf(row, 'DESCRIPCION_PROCESO', 'DESCRIPCION PROCESO') ||
    rawOf(row, 'DESCRIPCION_TIPO_PROCESO', 'DESCRIPCION TIPO PROCESO') ||
    normText(row.descripcionTipoProceso) ||
    normText(row.tipoProceso);
  return {
    cod,
    tramite: cod && desc ? `${cod} - ${desc}` : desc || 'Sin clasificar',
  };
}

function procesoOf(row: EssaRecord): ProcesoInfo {
  const { cod, tramite } = tramiteOf(row);
  return {
    numero: normText(row.numeroProceso),
    cuenta: normText(row.numeroCuenta) || normText(row.cuenta),
    codTram: cod,
    tramite,
    responsableRevision:
      limpiaUsuario(rawOf(row, 'USUARIO_RESPONSABLE_REVISION', 'USUARIO RESPONSABLE REVISION')) ||
      normText(row.usuarioResponsableInsumo),
    observacion:
      rawOf(row, 'OBSERVACION_REVISION', 'OBSERVACION REVISION') ||
      normText(row.observacionRevision) ||
      normText(row.observacionProceso),
    estadoRevision: rawOf(row, 'ESTADO_REVISION', 'ESTADO REVISION'),
    numeroRevision: rawOf(row, 'NUMERO_REVISION', 'NUMERO REVISION'),
    fechaRevision: rawOf(row, 'FECHA_REVISION', 'FECHA REVISION'),
    motivo: rawOf(row, 'DESCRIPCION_MOTIVO', 'DESCRIPCION MOTIVO'),
    ultimaAccion: rawOf(row, 'ULTIMA_ACCION_TRAMITE', 'ULTIMA ACCION TRAMITE'),
    accionFinalizada: rawOf(row, 'ULTIMA_ACCION_FINALIZADA', 'ULTIMA ACCION FINALIZADA'),
    fechaVencimiento: rawOf(row, 'FECHA_VENCIMIENTO', 'FECHA VENCIMIENTO'),
  };
}

interface MercurioInfo {
  gestor: string;
  ruta: string;
  entidad: string;
  referencia: string;
  estadoMer: string;
  fRad: Date | null;
}

function mercurioInfo(row: EssaRecord): MercurioInfo {
  return {
    gestor: rawOf(row, 'Nombre del Gestor', 'NOMBRE DEL GESTOR', 'NOMBRE_GESTOR'),
    ruta: rawOf(row, 'Nombre de la Ruta', 'NOMBRE DE LA RUTA', 'NOMBRE_RUTA'),
    entidad: rawOf(
      row,
      'Nombre de la Entidad Remitente',
      'NOMBRE DE LA ENTIDAD REMITENTE',
      'ENTIDAD_REMITENTE'
    ),
    referencia: rawOf(row, 'Refencia del Documento', 'Referencia del Documento', 'REFERENCIA'),
    estadoMer: rawOf(row, 'Estado', 'ESTADO'),
    fRad: parseDateOnly(
      rawOf(row, 'Fecha  Radicacion', 'Fecha Radicacion', 'Fecha de Entrada', 'FECHA_RADICACION') ||
        row.fechaSolicitud
    ),
  };
}

/** Medio de correo electrónico (admite ajuste manual de fecha). */
export function esCorreoMedio(medio: string): boolean {
  return /correo|e-?mail/.test(sinTilde(medio));
}

/**
 * Agrupa filas SAC + Mercurio por radicado (un radicado = un caso),
 * con el cruce del tablero de referencia.
 */
export function groupRadicados(
  sacRows: EssaRecord[],
  mercurioRows: EssaRecord[],
  ref: Date = new Date(),
  ajustes: Record<string, string> = {}
): RadicadoGroup[] {
  const today = midnight(ref);
  const window = buildBusinessWindow(today, DIAS_VENTANA);
  const diaByKey = new Map(window.map((s) => [s.key, s.dia]));

  /* Mercurio por radicado (dígitos ≥ 5, sin rutas excluidas) */
  const merPorRad = new Map<string, MercurioInfo>();
  for (const r of mercurioRows) {
    const k = digitsOf(
      rawOf(r, 'No. Radicado', 'No Radicado', 'NO_RADICADO', 'RADICADO') || r.radicadoEntrada
    );
    if (k.length < 5) continue;
    const info = mercurioInfo(r);
    if (rutaExcluida(info.ruta)) continue;
    if (!merPorRad.has(k)) merPorRad.set(k, info);
  }

  interface Acc {
    rows: EssaRecord[];
    radicado: string;
    digits: string;
    relleno: boolean;
  }
  const accs = new Map<string, Acc>();
  for (const row of sacRows) {
    if (esCanceladoRow(row)) continue;
    const radTxt =
      rawOf(row, 'RADICADO_ENTRADA', 'RADICADO ENTRADA') ||
      rawOf(row, 'RADICADO_SALIDA', 'RADICADO SALIDA') ||
      normText(row.radicadoEntrada);
    const digits = digitsOf(radTxt);
    const proc = normText(row.numeroProceso);
    const relleno = digits.length > 0 && PATRON_RELLENO.test(digits);
    const key =
      digits.length >= 5 && !relleno
        ? `R:${digits}`
        : `P:${proc || normText((row as { rowId?: unknown }).rowId) || Math.random()}`;
    let acc = accs.get(key);
    if (!acc) {
      acc = { rows: [], radicado: radTxt, digits, relleno };
      accs.set(key, acc);
    }
    acc.rows.push(row);
    if (!acc.radicado && radTxt) acc.radicado = radTxt;
  }

  /* Nombres para agrupar variantes de responsable (SAC + gestores). */
  const todosNombres: string[] = [];
  for (const acc of accs.values()) {
    for (const r of acc.rows) {
      const s = respSacOf(r);
      if (s) todosNombres.push(s);
    }
  }
  for (const m of merPorRad.values()) {
    if (m.gestor) todosNombres.push(m.gestor);
  }
  const clusters = agrupaResponsables(todosNombres);

  const groups: RadicadoGroup[] = [];
  const usados = new Set<string>();

  for (const [key, acc] of accs) {
    const { rows } = acc;
    let fSol: Date | null = null;
    let fVto: Date | null = null;
    const cuentas = new Set<string>();
    let medio = '';
    let respSac = '';
    let solicitante = '';
    let municipio = '';
    let tipo = '';
    let minDias: number | null = null;

    for (const r of rows) {
      const fs =
        parseDateOnly(rawOf(r, 'FECHA_SOLICITUD', 'FECHA SOLICITUD', 'FECHA_REGISTRO_PROCESO')) ??
        parseDateOnly(r.fechaSolicitud);
      if (fs && (!fSol || fs < fSol)) fSol = fs;
      const fv =
        parseDateOnly(rawOf(r, 'FECHA_VENCIMIENTO', 'FECHA VENCIMIENTO')) ??
        parseDateOnly(r.fechaVencimiento);
      if (fv && (!fVto || fv < fVto)) fVto = fv;
      const cta = normText(r.numeroCuenta) || normText(r.cuenta);
      if (cta) cuentas.add(cta);
      if (!medio)
        medio = rawOf(r, 'MEDIO_SOLICITUD', 'MEDIO SOLICITUD') || normText(r.medioSolicitud);
      if (!respSac) respSac = respSacOf(r);
      if (!solicitante)
        solicitante =
          rawOf(r, 'NOMBRE_SOLICITANTE', 'NOMBRE SOLICITANTE', 'NOMBRE_SUSCRIPTOR') ||
          normText(r.nombreSolicitante);
      if (!municipio)
        municipio =
          rawOf(
            r,
            'MUNICIPIO_SUSCRIPTOR',
            'MUNICIPIO SUSCRIPTOR',
            'MUNICIPIO_SOLICITANTE',
            'MUNICIPIO SOLICITANTE'
          ) || normText(r.municipioSolicitante);
      if (!tipo) tipo = rawOf(r, 'TIPO_TRAMITE', 'TIPO TRAMITE') || normText(r.tipoProceso);
      // Respaldo para el plazo: días hábiles restantes ya calculados por el sistema
      // (solo filas con fecha de solicitud válida).
      if (fs !== null || parseDateOnly(r.fechaSolicitud) !== null) {
        const rem = toNumber(r.diasPqr);
        if (rem !== null && (minDias === null || rem < minDias)) minDias = rem;
      }
    }

    const m = acc.digits.length >= 5 ? (merPorRad.get(acc.digits) ?? null) : null;
    if (m) usados.add(acc.digits);

    const g1 = respSac ? grupoDe(clusters, respSac) : null;
    const g2 = m?.gestor ? grupoDe(clusters, m.gestor) : null;
    const g = g1 ?? g2;
    const responsable = g ? g.nombre : 'Sin responsable';
    const respCanon = [g1?.key, g2?.key].filter((k): k is string => Boolean(k));
    const respVariante = respSac || m?.gestor || '';

    let dia: number | null = null;
    // Fecha real de recepción (solo correos con ajuste manual registrado)
    const medioFinal = medio || 'Sin medio';
    const ajuste =
      esCorreoMedio(medioFinal) && ajustes[key] ? (parseIsoDate(ajustes[key]!) ?? null) : null;
    const fEfe = ajuste ?? fSol;
    if (fEfe) dia = diaByKey.get(dayKeyOf(snapToBusinessDay(fEfe))) ?? null;
    const enVentana = dia !== null && dia <= DIAS_HABILES;

    let restan: number | null = null;
    if (fVto) {
      restan = Math.round((midnight(fVto).getTime() - today.getTime()) / 86400000);
    } else if (minDias !== null) {
      restan = minDias;
    }
    const estadoV: EstadoV =
      restan === null
        ? 'Sin fecha'
        : restan < 0
          ? 'Vencido'
          : restan <= CRITICO_DIAS
            ? 'Crítico'
            : restan <= PROXIMO_DIAS
              ? 'Próximo'
              : 'En plazo';

    const vencida =
      dia !== null && dia > DIAS_HABILES && dia <= DIAS_VENTANA && sinTilde(m?.estadoMer) === 'p';

    const procesos = rows.map(procesoOf);
    const tramites = [...new Set(procesos.map((p) => p.tramite))];
    // Como en la referencia: cada fila SAC cuenta como proceso del grupo
    const nProc = rows.length;

    const searchText = [
      acc.radicado,
      ...cuentas,
      tramites.join(' '),
      solicitante,
      responsable,
      respVariante,
      m?.gestor ?? '',
      municipio,
      procesos.map((p) => p.numero).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    groups.push({
      key,
      radicado: acc.radicado || procesos[0]?.numero || '—',
      fSol,
      fVto,
      ajuste,
      fEfe,
      dia,
      enVentana,
      vencida,
      restan,
      estadoV,
      procesos,
      nProc,
      cuenta: [...cuentas][0] ?? '',
      nCuentas: cuentas.size,
      tramite: tramites[0] ?? 'Sin clasificar',
      tramites,
      tipo: tipo || 'Sin tipo',
      medio: medioFinal,
      responsable,
      respCanon,
      respVariante,
      solicitante,
      municipio: municipio || '—',
      estadoMer: m?.estadoMer ?? '',
      fuente: m ? (nProc > 0 ? 'SAC + Mercurio' : 'Solo Mercurio') : 'Solo SAC',
      searchText,
    });
  }

  /* Mercurio sin contraparte en SAC */
  for (const [k, m] of merPorRad) {
    if (usados.has(k)) continue;
    let dia: number | null = null;
    if (m.fRad) dia = diaByKey.get(dayKeyOf(snapToBusinessDay(m.fRad))) ?? null;
    const g1 = m.gestor ? grupoDe(clusters, m.gestor) : null;
    groups.push({
      key: `M:${k}`,
      radicado: k,
      fSol: m.fRad,
      fVto: null,
      ajuste: null,
      fEfe: m.fRad,
      dia,
      enVentana: dia !== null && dia <= DIAS_HABILES,
      vencida:
        dia !== null && dia > DIAS_HABILES && dia <= DIAS_VENTANA && sinTilde(m.estadoMer) === 'p',
      restan: null,
      estadoV: 'Sin fecha',
      procesos: [],
      nProc: 0,
      cuenta: '',
      nCuentas: 0,
      tramite: m.ruta || 'Mercurio',
      tramites: [m.ruta || 'Mercurio'],
      tipo: m.ruta || 'Mercurio',
      medio: 'Escrito (Mercurio)',
      responsable: g1 ? g1.nombre : 'Sin responsable',
      respCanon: g1?.key ? [g1.key] : [],
      respVariante: m.gestor,
      solicitante: m.entidad,
      municipio: '—',
      estadoMer: m.estadoMer,
      fuente: 'Solo Mercurio',
      searchText: [k, m.ruta, m.entidad, m.gestor, m.referencia].join(' ').toLowerCase(),
    });
  }

  return groups;
}

export function applyGroupFilters(groups: RadicadoGroup[], f: GroupFilters): RadicadoGroup[] {
  const q = f.q.trim().toLowerCase();
  const qn = q.replace(/\D/g, '');
  return groups.filter((g) => {
    if (!f.incluirFuera && !g.enVentana && !g.vencida) return false;
    if (f.soloMedios && !medioValido(g.medio)) return false;
    if (f.responsable !== TODOS) {
      const target = f.responsable;
      const targetCanon = canonNombre(target);
      const match =
        g.respCanon.includes(target) ||
        (targetCanon !== '' && g.respCanon.includes(targetCanon)) ||
        g.responsable === target ||
        (targetCanon !== '' && canonNombre(g.responsable) === targetCanon);
      if (!match) return false;
    }
    if (f.tipo !== TODOS && !g.tramites.includes(f.tipo)) return false;
    if (q) {
      const okText = g.searchText.includes(q);
      const okNum =
        qn.length >= 4 &&
        (digitsOf(g.radicado).includes(qn) ||
          digitsOf(g.cuenta).includes(qn) ||
          g.procesos.some((p) => digitsOf(p.numero).includes(qn)));
      if (!okText && !okNum) return false;
    }
    return true;
  });
}

export interface ResponsableOption {
  key: string;
  nombre: string;
  n: number;
}

export interface GroupFilterOptions {
  responsables: ResponsableOption[];
  tipos: string[];
}

/**
 * Opciones para los desplegables. Como en la referencia, el universo se
 * restringe a los canales principales; los trámites, a códigos admitidos
 * (con red de seguridad: si ninguno admite, se listan todos).
 * Se deduplican estrictamente los responsables para no mostrar opciones duplicadas.
 */
export function groupFilterOptions(
  groups: RadicadoGroup[],
  incluirFuera: boolean
): GroupFilterOptions {
  const pool = groups.filter((g) => (incluirFuera || g.enVentana) && medioValido(g.medio));
  const respMap = new Map<string, { key: string; nombre: string; n: number }>();
  for (const g of pool) {
    const raw = (g.responsable || '').trim();
    const nombre = raw || 'Sin responsable';
    const canon = canonNombre(nombre) || '__sin__';
    const prev = respMap.get(canon);
    if (prev) {
      prev.n += 1;
    } else {
      respMap.set(canon, { key: canon, nombre, n: 1 });
    }
  }
  const tramites = new Set<string>();
  for (const g of pool) {
    for (const t of g.tramites) {
      const cod = g.procesos.find((p) => p.tramite === t)?.codTram ?? '';
      if (!cod || tramiteAdmitido(cod)) tramites.add(t);
    }
  }
  let tipos = [...tramites].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), 'es');
  });
  if (tipos.length === 0) {
    const todos = new Set<string>();
    for (const g of pool) for (const t of g.tramites) todos.add(t);
    tipos = [...todos].sort((a, b) => String(a).localeCompare(String(b), 'es'));
  }
  return {
    responsables: [...respMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    tipos,
  };
}

export interface GrupoKpis {
  total: number;
  vencidos: number;
  criticos: number;
  proximos: number;
  enPlazo: number;
  sinProceso: number;
}

export function computeGrupoKpis(groups: RadicadoGroup[]): GrupoKpis {
  const k: GrupoKpis = {
    total: groups.length,
    vencidos: 0,
    criticos: 0,
    proximos: 0,
    enPlazo: 0,
    sinProceso: 0,
  };
  for (const g of groups) {
    if (g.estadoV === 'Vencido') k.vencidos += 1;
    else if (g.estadoV === 'Crítico') k.criticos += 1;
    else if (g.estadoV === 'Próximo') k.proximos += 1;
    else if (g.estadoV === 'En plazo') k.enPlazo += 1;
    if (g.nProc === 0) k.sinProceso += 1;
  }
  return k;
}

/** Conteo por día hábil (15..1) sobre grupos filtrados en ventana. */
export function perDiaCounts(groups: RadicadoGroup[]): { dia: number; value: number }[] {
  const map = new Map<number, number>();
  for (const g of groups) {
    if (g.dia !== null && g.dia <= DIAS_HABILES) {
      map.set(g.dia, (map.get(g.dia) ?? 0) + 1);
    }
  }
  const out: { dia: number; value: number }[] = [];
  for (let dia = 1; dia <= DIAS_HABILES; dia++) out.push({ dia, value: map.get(dia) ?? 0 });
  return out;
}

/** Vencidas ordenadas por día descendente. */
export function vencidasList(groups: RadicadoGroup[]): RadicadoGroup[] {
  return groups.filter((g) => g.vencida).sort((a, b) => (b.dia ?? 0) - (a.dia ?? 0));
}

export interface EstadoCount {
  estado: EstadoV;
  value: number;
}

export function estadoCounts(groups: RadicadoGroup[]): EstadoCount[] {
  const order: EstadoV[] = ['Vencido', 'Crítico', 'Próximo', 'En plazo', 'Sin fecha'];
  return order.map((estado) => ({
    estado,
    value: groups.filter((g) => g.estadoV === estado).length,
  }));
}

export interface NombreConteo {
  name: string;
  value: number;
}

function topCounts(values: string[], limit: number): NombreConteo[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit);
}

export function rankResponsables(groups: RadicadoGroup[]): NombreConteo[] {
  return topCounts(
    groups.map((g) => g.responsable),
    10
  );
}

export function rankTramites(groups: RadicadoGroup[]): NombreConteo[] {
  return topCounts(
    groups.flatMap((g) => g.tramites),
    10
  );
}

export interface MatrizFila {
  name: string;
  total: number;
  segmentos: { estado: EstadoV; value: number }[];
}

export function matrizRiesgo(groups: RadicadoGroup[], limit = 12): MatrizFila[] {
  const order: EstadoV[] = ['Vencido', 'Crítico', 'Próximo', 'En plazo', 'Sin fecha'];
  const byResp = new Map<string, RadicadoGroup[]>();
  for (const g of groups) {
    const arr = byResp.get(g.responsable) ?? [];
    arr.push(g);
    byResp.set(g.responsable, arr);
  }
  return [...byResp.entries()]
    .map(([name, regs]) => ({
      name,
      total: regs.length,
      segmentos: order
        .map((estado) => ({ estado, value: regs.filter((r) => r.estadoV === estado).length }))
        .filter((s) => s.value > 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export interface MedioMeta {
  etiqueta: string;
  color: string;
}

/** Clasificación visual del medio de solicitud (adaptada del tablero de referencia). */
export function medioInfo(medio: string): MedioMeta {
  const s = sinTilde(medio);
  if (!s || s === 'sin medio') return { etiqueta: 'Sin medio', color: '#9aa6b8' };
  if (/correo|e-?mail/.test(s)) return { etiqueta: 'Correo', color: '#1565d8' };
  if (/pagina web|portal web/.test(s)) return { etiqueta: 'Página Web', color: '#2e9e5b' };
  if (/telefon|call ?center|linea/.test(s)) return { etiqueta: 'Telefónico', color: '#7b61d8' };
  if (/ventanilla|presencial|oficina/.test(s)) return { etiqueta: 'Presencial', color: '#b9721a' };
  if (/mercurio/.test(s)) return { etiqueta: 'Escrito (Mercurio)', color: '#61708a' };
  if (/^escrito/.test(s)) return { etiqueta: 'Escrito', color: '#0b3c8a' };
  return { etiqueta: medio.trim(), color: '#61708a' };
}
