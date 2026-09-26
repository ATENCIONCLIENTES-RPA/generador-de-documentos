import { describe, it, expect } from 'vitest';
import {
  agrupaResponsables,
  applyGroupFilters,
  buildBusinessWindow,
  computeGrupoKpis,
  DEFAULT_GROUP_FILTERS,
  dayKeyOf,
  esCanceladoRow,
  esCorreoMedio,
  estadoCounts,
  fuzzyMatchResponsable,
  formatDMY,
  groupFilterOptions,
  groupRadicados,
  isAtencionClientes,
  matrizRiesgo,
  medioInfo,
  medioValido,
  perDiaCounts,
  rankResponsables,
  rankTramites,
  rutaExcluida,
  snapToBusinessDay,
  tramiteAdmitido,
  vencidasList,
  type GroupFilters,
} from '../dashboardGroups';
import { isBusinessDay } from '../businessDays';
import type { Record as EssaRecord } from '@/types/record';

const REF = new Date(2026, 8, 25); // viernes 25/09/2026
const WIN = buildBusinessWindow(REF, 20);

function fechaDe(dia: number): string {
  const s = WIN.find((x) => x.dia === dia)!;
  const d = s.fecha;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function sac(overrides: Record<string, unknown> & { rowId: string }): EssaRecord {
  return {
    id: overrides.rowId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: '24/09/2026',
    fechaVencimiento: '',
    numeroProceso: '72552537',
    radicadoEntrada: '20260320045635',
    nombreSolicitante: 'Juan Pérez',
    numeroCuenta: '100',
    estadoSemaforo: 'verde',
    diasPqr: 10,
    diasPqrLabel: '10 días hábiles',
    tipoProceso: 'PQR',
    usuarioResponsableInsumo: '',
    responsableInsumo: '',
    medioSolicitud: 'Escrito',
    ...overrides,
  } as unknown as EssaRecord;
}

function mer(overrides: Record<string, unknown> & { rowId: string }): EssaRecord {
  return {
    id: overrides.rowId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: '',
    radicadoEntrada: '',
    ...overrides,
  } as unknown as EssaRecord;
}

const SAC: EssaRecord[] = [
  sac({
    rowId: 'a',
    PROCESO: '2931',
    DESCRIPCION_PROCESO: 'Inconformidad consumo',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'API_PROCESOS_PQR',
    FECHA_VENCIMIENTO: '30/10/2026',
    TIPO_TRAMITE: 'PQR',
  }),
  sac({
    rowId: 'b',
    numeroProceso: '72552538',
    PROCESO: '2931',
    DESCRIPCION_PROCESO: 'Inconformidad consumo',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'API_PROCESOS_PQR',
    FECHA_VENCIMIENTO: '30/10/2026',
    TIPO_TRAMITE: 'PQR',
  }),
  // Vencida: día 18 + Estado P en Mercurio
  sac({
    rowId: 'c',
    radicadoEntrada: '20260320045636',
    numeroProceso: '',
    FECHA_SOLICITUD: '02/09/2026',
    fechaSolicitud: '02/09/2026',
    FECHA_VENCIMIENTO: '05/09/2026',
    fechaVencimiento: '05/09/2026',
    NOMBRE_USUARIO_INICIAL_PROCESO: '',
    usuarioResponsableInsumo: '',
  }),
  // Sin radicado: grupo propio por proceso (crítico por diasPqr)
  sac({
    rowId: 'd',
    RADICADO_ENTRADA: '',
    radicadoEntrada: '',
    numeroProceso: 'PROC-9',
    FECHA_SOLICITUD: '25/09/2026',
    fechaSolicitud: '25/09/2026',
    diasPqr: 1,
    diasPqrLabel: '1 día hábil',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Jairo Rizo',
  }),
  // Cancelada: no entra al informe
  sac({
    rowId: 'e',
    radicadoEntrada: '20260320049999',
    SUBESTADO: 'Cancelado por duplicidad',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Nadie',
  }),
  // Relleno: no se agrupa (aunque comparta dígitos)
  sac({
    rowId: 'f',
    radicadoEntrada: '20260300000000',
    numeroProceso: 'PROC-R1',
    PROCESO: '2727',
    DESCRIPCION_PROCESO: 'Terminación del contrato',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Pedro',
  }),
  sac({
    rowId: 'g',
    radicadoEntrada: '20260300000000',
    numeroProceso: '',
    PROCESO: '2727',
    DESCRIPCION_PROCESO: 'Terminación del contrato',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Lucia',
  }),
];

const MER: EssaRecord[] = [
  mer({
    rowId: 'm1',
    'No. Radicado': '20260320045636',
    'Nombre del Gestor': 'YURLEY SANDOVAL',
    Estado: 'P',
    'Fecha  Radicacion': '02/09/2026',
  }),
  mer({
    rowId: 'm2',
    'No. Radicado': '20260320047777',
    'Nombre del Gestor': 'Gestor Solo',
    Estado: 'P',
    'Fecha  Radicacion': '24/09/2026',
  }),
  // Ruta excluida: no entra
  mer({
    rowId: 'm3',
    'No. Radicado': '20260320048888',
    'Nombre del Gestor': 'Gestor X',
    'Nombre de la Ruta': 'GESTION DOCUMENTAL',
    Estado: 'P',
  }),
];

describe('dashboardGroups (lógica del tablero de referencia)', () => {
  it('buildBusinessWindow genera 20 días hábiles hacia atrás', () => {
    const w = buildBusinessWindow(REF, 20);
    expect(w).toHaveLength(20);
    expect(w[0]!.dia).toBe(1);
    for (const s of w) expect(isBusinessDay(s.fecha)).toBe(true);
  });

  it('snapToBusinessDay avanza fines de semana', () => {
    const snapped = snapToBusinessDay(new Date(2026, 8, 26));
    expect(isBusinessDay(snapped)).toBe(true);
  });

  it('agrupa por radicado, separa relleno y excluye cancelados', () => {
    const groups = groupRadicados(SAC, MER, REF);
    // 20260320045635, 20260320045636, PROC-9, 2×relleno, Solo-Mercurio 47777 (48888 excluido, cancelado fuera)
    expect(groups.map((g) => g.key).sort()).toEqual(
      [
        'M:20260320047777',
        'P:PROC-9',
        'P:PROC-R1',
        'P:g',
        'R:20260320045635',
        'R:20260320045636',
      ].sort()
    );
    const g1 = groups.find((g) => g.key === 'R:20260320045635')!;
    expect(g1.nProc).toBe(2);
    expect(g1.tramites).toEqual(['2931 - Inconformidad consumo']);
    expect(g1.fuente).toBe('Solo SAC');
  });

  it('responsable prioriza SAC y agrupa variantes con el gestor', () => {
    const groups = groupRadicados(SAC, MER, REF);
    const g1 = groups.find((g) => g.key === 'R:20260320045635')!;
    expect(g1.responsable).toBe('API_PROCESOS_PQR');
    const solo = groups.find((g) => g.key === 'M:20260320047777')!;
    expect(solo.responsable).toBe('Gestor Solo');
    expect(solo.fuente).toBe('Solo Mercurio');
    expect(solo.medio).toBe('Escrito (Mercurio)');
  });

  it('agrupaResponsables unifica variantes del mismo usuario', () => {
    const mapa = agrupaResponsables([
      'NORA LILIANA VILLAMIZAR JAIMES',
      'NORA LILIANA VILLAMIZAR',
      'OTRO UNO DOS',
    ]);
    const a = mapa.get('nora liliana villamizar jaimes')!;
    const b = mapa.get('nora liliana villamizar')!;
    expect(a.key).toBe(b.key);
    expect(a.nombre).toBe('NORA LILIANA VILLAMIZAR JAIMES');
    expect(mapa.get('otro uno dos')!.key).not.toBe(a.key);
  });

  it('agrupaResponsables unifica separadores distintos (_ espacio - punto)', () => {
    const mapa = agrupaResponsables([
      'API_PROCESOS_PQR',
      'API PROCESOS PQR',
      'API-PROCESOS-PQR',
      'API.PROCESOS.PQR',
      '  API__PROCESOS_PQR  ',
      '_API_PROCESOS_PQR_',
    ]);
    const keys = new Set([...mapa.values()].map((c) => c.key));
    expect(keys.size).toBe(1);
    expect(mapa.get('api procesos pqr')!.n).toBe(6);
  });

  it('agrupaResponsables ignora mayúsculas, tildes, dominio e invisibles', () => {
    const mapa = agrupaResponsables([
      'José María Pérez',
      'JOSE MARIA PEREZ',
      'ESSA\\JOSE MARIA PEREZ',
      'José\u200BMaria\uFEFF Perez',
    ]);
    const keys = new Set([...mapa.values()].map((c) => c.key));
    expect(keys.size).toBe(1);
  });

  it('agrupaResponsables unifica invisibles, lookalikes y fullwidth', () => {
    const zwsp = String.fromCharCode(0x200b);
    const shy = String.fromCharCode(0x00ad);
    const lrm = String.fromCharCode(0x200e);
    const endash = String.fromCharCode(0x2013);
    const fw = (s: string): string =>
      [...s]
        .map((c) => {
          const code = c.codePointAt(0)!;
          if (code >= 0x21 && code <= 0x7e) return String.fromCharCode(code + 0xfee0);
          if (c === ' ') return String.fromCharCode(0x3000);
          return c;
        })
        .join('');
    const mapa = agrupaResponsables([
      'API_PROCESOS_PQR',
      `API${shy}PROCESOS_PQR`,
      `API${lrm}PROCESOS_PQR`,
      `API${zwsp}PROCESOS_PQR`,
      fw('API_PROCESOS_PQR'),
      `API${endash}PROCESOS${endash}PQR`,
      'API_PROCESOS_PQR ',
    ]);
    const keys = new Set([...mapa.values()].map((c) => c.key));
    expect(keys.size).toBe(1);
    // 5 formas unicas (los invisibles colapsan a la misma): una sola opcion
    expect(mapa.get('api procesos pqr')!.n).toBe(4);
  });

  it('agrupaResponsables no fusiona personas distintas ni tokens únicos', () => {
    const mapa = agrupaResponsables(['NORA LILIANA VILLAMIZAR', 'NORA ANDREA VILLAMIZAR', 'SOLO']);
    expect(mapa.get('nora liliana villamizar')!.key).not.toBe(
      mapa.get('nora andrea villamizar')!.key
    );
    expect(mapa.get('solo')!.n).toBe(1);
  });

  it('calcula día, estado y vencida con regla Estado P', () => {
    const groups = groupRadicados(SAC, MER, REF);
    const g1 = groups.find((g) => g.key === 'R:20260320045635')!;
    expect(g1.dia).toBe(2);
    expect(g1.enVentana).toBe(true);
    expect(g1.estadoV).toBe('En plazo');
    expect(g1.vencida).toBe(false);

    const g2 = groups.find((g) => g.key === 'R:20260320045636')!;
    expect(g2.dia).toBe(18);
    expect(g2.estadoV).toBe('Vencido');
    expect(g2.vencida).toBe(true);
    expect(g2.estadoMer).toBe('P');
    expect(g2.nProc).toBe(1);
    expect(g2.fuente).toBe('SAC + Mercurio');

    const g3 = groups.find((g) => g.key === 'P:PROC-9')!;
    expect(g3.dia).toBe(1);
  });

  it('esCanceladoRow, rutaExcluida, tramiteAdmitido y medioValido', () => {
    expect(esCanceladoRow(sac({ rowId: 'x', SUBESTADO: 'Cancelado' }))).toBe(true);
    expect(esCanceladoRow(sac({ rowId: 'y', SUBESTADO: 'Activo' }))).toBe(false);
    expect(rutaExcluida('GESTION DOCUMENTAL')).toBe(true);
    expect(rutaExcluida('GESTION DOCUMENTAL Y ALGO')).toBe(true);
    expect(rutaExcluida('OTRA RUTA')).toBe(false);
    expect(tramiteAdmitido('2931')).toBe(true);
    expect(tramiteAdmitido('9999')).toBe(false);
    expect(medioValido('Escrito')).toBe(true);
    expect(medioValido('Escrito (Mercurio)')).toBe(true);
    expect(medioValido('Página Web')).toBe(true);
    expect(medioValido('Sin medio')).toBe(false);
    expect(medioValido('Verbal')).toBe(false);
  });

  it('applyGroupFilters: ventana, medios, responsable por clave, trámite y texto', () => {
    const groups = groupRadicados(SAC, MER, REF);
    const only = (f: Partial<GroupFilters>): number =>
      applyGroupFilters(groups, { ...DEFAULT_GROUP_FILTERS, ...f }).length;
    // Todos en ventana o vencidas, y con medio válido
    expect(only({})).toBe(6);
    expect(only({ incluirFuera: true })).toBe(6);
    const anaKey = groups
      .find((g) => g.key === 'R:20260320045635')!
      .respCanon.find((k) => k.includes('api'))!;
    expect(only({ responsable: anaKey })).toBe(1);
    expect(only({ tipo: '2931 - Inconformidad consumo' })).toBe(1);
    expect(only({ q: '0320045636' })).toBe(1);
    expect(only({ q: 'proc-9' })).toBe(1);
    expect(only({ q: 'zzz' })).toBe(0);
    expect(only({ soloMedios: false })).toBe(6);
  });

  it('computeGrupoKpis, vencidasList y estadoCounts', () => {
    const groups = groupRadicados(SAC, MER, REF);
    const all = applyGroupFilters(groups, { ...DEFAULT_GROUP_FILTERS, incluirFuera: true });
    expect(computeGrupoKpis(all)).toEqual({
      total: 6,
      vencidos: 1,
      criticos: 1,
      proximos: 0,
      enPlazo: 3,
      sinProceso: 1,
    });
    expect(vencidasList(all).map((g) => g.key)).toEqual(['R:20260320045636']);
    expect(estadoCounts(all)).toEqual([
      { estado: 'Vencido', value: 1 },
      { estado: 'Crítico', value: 1 },
      { estado: 'Próximo', value: 0 },
      { estado: 'En plazo', value: 3 },
      { estado: 'Sin fecha', value: 1 },
    ]);
  });

  it('opciones de filtro: responsables agrupados y trámites admitidos', () => {
    const groups = groupRadicados(SAC, MER, REF);
    const opts = groupFilterOptions(groups, false);
    expect(opts.responsables.map((r) => r.nombre)).toContain('API_PROCESOS_PQR');
    expect(opts.tipos).toEqual([
      '2727 - Terminación del contrato',
      '2931 - Inconformidad consumo',
      'Mercurio',
      'PQR',
    ]);
    expect(perDiaCounts(groups).find((p) => p.dia === 2)?.value).toBe(4);
    expect(rankResponsables(groups)).toHaveLength(6);
    expect(rankTramites(groups)[0]).toEqual({
      name: '2727 - Terminación del contrato',
      value: 2,
    });
    expect(matrizRiesgo(groups)[0]!.name).toBe('API_PROCESOS_PQR');
  });

  it('conserva filas SAC sin cuenta (paridad con la referencia)', () => {
    const groups = groupRadicados(
      [
        sac({
          rowId: 's1',
          radicadoEntrada: '20260320041111',
          numeroCuenta: '',
          PROCESO: '2931',
          DESCRIPCION_PROCESO: 'X',
        }),
      ],
      [],
      REF
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.cuenta).toBe('');
    expect(groups[0]!.key).toBe('R:20260320041111');
  });

  it('medioInfo clasifica medios', () => {
    expect(medioInfo('E-Mail')).toEqual({ etiqueta: 'Correo', color: '#1565d8' });
    expect(medioInfo('Escrito (Mercurio)')).toEqual({
      etiqueta: 'Escrito (Mercurio)',
      color: '#61708a',
    });
    expect(medioInfo('')).toEqual({ etiqueta: 'Sin medio', color: '#9aa6b8' });
  });

  it('ajuste de fecha real solo aplica en correos y mueve el día', () => {
    expect(esCorreoMedio('E-Mail')).toBe(true);
    expect(esCorreoMedio('Escrito')).toBe(false);
    const email = sac({
      rowId: 'aj1',
      radicadoEntrada: '20260320041111',
      FECHA_SOLICITUD: fechaDe(2),
      fechaSolicitud: fechaDe(2),
      MEDIO_SOLICITUD: 'E-Mail',
      medioSolicitud: 'E-Mail',
      NOMBRE_USUARIO_INICIAL_PROCESO: 'Ana',
    });
    const base = groupRadicados([email], [], REF);
    expect(base[0]!.dia).toBe(2);
    expect(base[0]!.ajuste).toBeNull();

    const iso10 = dayKeyOf(WIN.find((s) => s.dia === 10)!.fecha);
    const movido = groupRadicados([email], [], REF, { [base[0]!.key]: iso10 });
    expect(movido[0]!.dia).toBe(10);
    expect(movido[0]!.ajuste).not.toBeNull();

    // En medios no-correo el ajuste se ignora
    const escrito = sac({
      rowId: 'aj2',
      radicadoEntrada: '20260320042222',
      FECHA_SOLICITUD: fechaDe(2),
      fechaSolicitud: fechaDe(2),
      MEDIO_SOLICITUD: 'Escrito',
      medioSolicitud: 'Escrito',
    });
    const gEsc = groupRadicados([escrito], [], REF, { 'R:20260320042222': iso10 });
    expect(gEsc[0]!.dia).toBe(2);
    expect(gEsc[0]!.ajuste).toBeNull();

    // ISO inválido se ignora
    const gBad = groupRadicados([email], [], REF, { [base[0]!.key]: 'no-fecha' });
    expect(gBad[0]!.dia).toBe(2);
  });

  it('recalcula vencimiento y días restantes al corregir la fecha de radicación', () => {
    const key = 'R:20260320047777';
    const email = sac({
      rowId: 'vto1',
      radicadoEntrada: '20260320047777',
      FECHA_SOLICITUD: fechaDe(15), // 07/09/2026 — día 15 de la ventana
      fechaSolicitud: fechaDe(15),
      FECHA_VENCIMIENTO: '25/09/2026', // = REF (hoy)
      fechaVencimiento: '25/09/2026',
      MEDIO_SOLICITUD: 'E-Mail',
      medioSolicitud: 'E-Mail',
      NOMBRE_USUARIO_INICIAL_PROCESO: 'Ana',
    });

    // Sin corrección: manda el vencimiento oficial (0 días → Crítico)
    const base = groupRadicados([email], [], REF);
    expect(base[0]!.dia).toBe(15);
    expect(formatDMY(base[0]!.fVto)).toBe('25/09/2026');
    expect(base[0]!.fVtoEfe).toEqual(base[0]!.fVto);
    expect(base[0]!.restan).toBe(0);
    expect(base[0]!.estadoV).toBe('Crítico');

    // Corrección a un día hábil después (día 14 = 08/09/2026) → vence 28/09/2026
    const iso14 = dayKeyOf(WIN.find((s) => s.dia === 14)!.fecha);
    const despues = groupRadicados([email], [], REF, { [key]: iso14 });
    expect(despues[0]!.dia).toBe(14);
    expect(formatDMY(despues[0]!.fVto)).toBe('25/09/2026'); // oficial intacta
    expect(formatDMY(despues[0]!.fVtoEfe!)).toBe('28/09/2026'); // +1 día hábil
    expect(despues[0]!.restan).toBe(3);
    expect(despues[0]!.estadoV).toBe('Próximo');

    // Corrección a un día hábil antes (día 16 = 04/09/2026) → vence 24/09/2026
    const iso16 = dayKeyOf(WIN.find((s) => s.dia === 16)!.fecha);
    const antes = groupRadicados([email], [], REF, { [key]: iso16 });
    expect(antes[0]!.dia).toBe(16);
    expect(formatDMY(antes[0]!.fVtoEfe!)).toBe('24/09/2026'); // −1 día hábil
    expect(antes[0]!.restan).toBe(-1);
    expect(antes[0]!.estadoV).toBe('Vencido');

    // Fecha corregida en fin de semana → se cuenta desde el lunes siguiente
    const finde = groupRadicados([email], [], REF, { [key]: '2026-09-12' });
    expect(finde[0]!.dia).toBe(10); // lunes 14/09/2026
    expect(formatDMY(finde[0]!.fVtoEfe!)).toBe('02/10/2026');
    expect(finde[0]!.restan).toBe(7);

    // Medio no-correo: la corrección se ignora y el vencimiento no se mueve
    const escrito = sac({
      rowId: 'vto3',
      radicadoEntrada: '20260320049888',
      FECHA_SOLICITUD: fechaDe(15),
      fechaSolicitud: fechaDe(15),
      FECHA_VENCIMIENTO: '25/09/2026',
      fechaVencimiento: '25/09/2026',
      MEDIO_SOLICITUD: 'Escrito',
      medioSolicitud: 'Escrito',
    });
    const gEsc = groupRadicados([escrito], [], REF, { 'R:20260320049888': iso14 });
    expect(gEsc[0]!.ajuste).toBeNull();
    expect(formatDMY(gEsc[0]!.fVtoEfe!)).toBe('25/09/2026');
    expect(gEsc[0]!.restan).toBe(0);
  });

  it('corrige el respaldo de días hábiles (diasPqr) cuando no hay fecha de vencimiento', () => {
    const sinVto = sac({
      rowId: 'vto2',
      radicadoEntrada: '20260320048888',
      FECHA_SOLICITUD: fechaDe(2), // 24/09/2026
      fechaSolicitud: fechaDe(2),
      fechaVencimiento: '',
      MEDIO_SOLICITUD: 'E-Mail',
      medioSolicitud: 'E-Mail',
      diasPqr: 10,
      diasPqrLabel: '10 días hábiles',
      NOMBRE_USUARIO_INICIAL_PROCESO: 'Ana',
    });

    const base = groupRadicados([sinVto], [], REF);
    expect(base[0]!.fVto).toBeNull();
    expect(base[0]!.fVtoEfe).toBeNull();
    expect(base[0]!.restan).toBe(10);

    // Corrección dos días hábiles antes → quedan 8
    const iso4 = dayKeyOf(WIN.find((s) => s.dia === 4)!.fecha);
    const movido = groupRadicados([sinVto], [], REF, { 'R:20260320048888': iso4 });
    expect(movido[0]!.dia).toBe(4);
    expect(movido[0]!.fVtoEfe).toBeNull();
    expect(movido[0]!.restan).toBe(8);
    expect(movido[0]!.estadoV).toBe('En plazo');
  });

  describe('Relacionamiento Perfil (M2) ↔ Responsable (M3) & Fuzzy Matching', () => {
    const opcionesResp = [
      { key: 'juan perez gomez', nombre: 'Juan Pérez Gómez' },
      { key: 'laura martinez rojas', nombre: 'Laura Martínez Rojas' },
      { key: 'carlos gonzalez silva', nombre: 'Carlos González Silva' },
      { key: 'maria jose rodriguez', nombre: 'María José Rodríguez' },
    ];

    it('reconoce la regla especial de Atención Clientes', () => {
      expect(isAtencionClientes('Atención Clientes')).toBe(true);
      expect(isAtencionClientes('atencion clientes')).toBe(true);
      expect(isAtencionClientes('ATENCIÓN CLIENTES')).toBe(true);
      expect(isAtencionClientes('Atencion Cliente')).toBe(true);
      expect(isAtencionClientes('Atención al Cliente')).toBe(true);
      expect(isAtencionClientes('Juan Perez')).toBe(false);

      // Si es Atención Clientes, fuzzyMatchResponsable retorna null (no filtra)
      expect(fuzzyMatchResponsable('Atención Clientes', opcionesResp)).toBeNull();
      expect(fuzzyMatchResponsable('atencion clientes', opcionesResp)).toBeNull();
    });

    it('coincide exactamente ignorando tildes y mayúsculas', () => {
      expect(fuzzyMatchResponsable('JUAN PÉREZ GÓMEZ', opcionesResp)).toBe('juan perez gomez');
      expect(fuzzyMatchResponsable('juan perez gomez', opcionesResp)).toBe('juan perez gomez');
      expect(fuzzyMatchResponsable('Laura Martinez Rojas', opcionesResp)).toBe(
        'laura martinez rojas'
      );
    });

    it('coincide con guiones, espacios extras y caracteres especiales', () => {
      expect(fuzzyMatchResponsable('Laura Martinez-Rojas', opcionesResp)).toBe(
        'laura martinez rojas'
      );
      expect(fuzzyMatchResponsable('  Juan   Perez   Gomez  ', opcionesResp)).toBe(
        'juan perez gomez'
      );
      expect(fuzzyMatchResponsable('Maria_Jose_Rodriguez', opcionesResp)).toBe(
        'maria jose rodriguez'
      );
    });

    it('coincide con orden invertido de nombres o apellidos', () => {
      expect(fuzzyMatchResponsable('Pérez Gómez Juan', opcionesResp)).toBe('juan perez gomez');
      expect(fuzzyMatchResponsable('Martínez Rojas Laura', opcionesResp)).toBe(
        'laura martinez rojas'
      );
    });

    it('coincide con pequeñas diferencias tipográficas o variaciones leves', () => {
      // Carlos Gonzales vs Carlos Gonzalez
      expect(fuzzyMatchResponsable('Carlos Gonzales Silva', opcionesResp)).toBe(
        'carlos gonzalez silva'
      );
      // Nombre sin segundo apellido
      expect(fuzzyMatchResponsable('Laura Martínez', opcionesResp)).toBe('laura martinez rojas');
      // Nombre sin segundo nombre
      expect(fuzzyMatchResponsable('María Rodríguez', opcionesResp)).toBe('maria jose rodriguez');
    });

    it('retorna null cuando no hay nombre o no hay opciones', () => {
      expect(fuzzyMatchResponsable('', opcionesResp)).toBeNull();
      expect(fuzzyMatchResponsable('   ', opcionesResp)).toBeNull();
      expect(fuzzyMatchResponsable('Juan Pérez', [])).toBeNull();
      expect(
        fuzzyMatchResponsable('Persona Totalmente Desconocida XYZ 999', opcionesResp)
      ).toBeNull();
    });
  });
});
