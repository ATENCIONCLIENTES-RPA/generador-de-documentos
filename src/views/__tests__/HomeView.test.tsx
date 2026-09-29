import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HomeView } from '@/views/HomeView';
import { useDataStore } from '@/store/dataStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useProfileStore } from '@/store/profileStore';
import { buildBusinessWindow, formatDMY } from '@/utils/dashboardGroups';
import { addBusinessDays, parseDateOnly } from '@/utils/businessDays';
import type { Record as EssaRecord } from '@/types/record';

const WIN = buildBusinessWindow(new Date(), 20);
function fechaDe(dia: number): string {
  const s = WIN.find((x) => x.dia === dia)!;
  const d = s.fecha;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function fechaFutura(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function sacRow(overrides: Record<string, unknown> & { rowId: string }): EssaRecord {
  return {
    id: overrides.rowId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: fechaDe(2),
    fechaVencimiento: fechaFutura(40),
    numeroProceso: 'PROC-1',
    radicadoEntrada: '900001',
    nombreSolicitante: 'Juan Pérez',
    numeroCuenta: '100',
    medioSolicitud: 'Escrito',
    ...overrides,
  } as unknown as EssaRecord;
}

function merRow(overrides: Record<string, unknown> & { rowId: string }): EssaRecord {
  return {
    id: overrides.rowId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: '',
    radicadoEntrada: '',
    ...overrides,
  } as unknown as EssaRecord;
}

const sacRows: EssaRecord[] = [
  sacRow({
    rowId: 'a',
    PROCESO: '2931',
    DESCRIPCION_PROCESO: 'Inconformidad consumo',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Ana Perez',
  }),
  sacRow({
    rowId: 'b',
    numeroProceso: 'PROC-2',
    PROCESO: '2931',
    DESCRIPCION_PROCESO: 'Inconformidad consumo',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Ana Perez',
  }),
  // Vencida: día 18 + Estado P en Mercurio, sin proceso en SAC
  sacRow({
    rowId: 'c',
    radicadoEntrada: '900002',
    numeroProceso: '',
    FECHA_SOLICITUD: fechaDe(18),
    fechaSolicitud: fechaDe(18),
    FECHA_VENCIMIENTO: '05/09/2020',
    fechaVencimiento: '05/09/2020',
  }),
  sacRow({
    rowId: 'd',
    radicadoEntrada: '',
    numeroProceso: 'PROC-9',
    FECHA_SOLICITUD: fechaDe(1),
    fechaSolicitud: fechaDe(1),
    fechaVencimiento: '',
    diasPqr: 1,
    diasPqrLabel: '1 día hábil',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Luis',
  }),
  sacRow({
    rowId: 'e',
    radicadoEntrada: '900004',
    fechaSolicitud: fechaDe(3),
    tipoProceso: 'Tutela',
    NOMBRE_USUARIO_INICIAL_PROCESO: 'Luis Gomez',
  }),
  sacRow({
    rowId: 'f',
    radicadoEntrada: '900005',
    fechaSolicitud: '',
    fechaVencimiento: '',
    diasPqr: 0,
    diasPqrLabel: '—',
  }),
];

const merRows: EssaRecord[] = [
  merRow({
    rowId: 'm1',
    'No. Radicado': '900002',
    'Nombre del Gestor': 'Yurley Sandoval',
    Estado: 'P',
    'Fecha  Radicacion': fechaDe(18),
  }),
  merRow({
    rowId: 'm2',
    'No. Radicado': '900009',
    'Nombre del Gestor': 'Gestor Solo',
    Estado: 'P',
    'Fecha  Radicacion': fechaDe(2),
  }),
];

function seed(sac: EssaRecord[], mer: EssaRecord[]) {
  useDataStore.setState({
    records: sac as unknown as EssaRecord[],
    sacRecords: sac as unknown as EssaRecord[],
    mercurioRecords: mer as unknown as EssaRecord[],
    selectedRows: new Set<string>(),
  });
  useNavigationStore.setState({ currentStep: 'inicio', completed: new Set() });
}

describe('HomeView — Cuadro de Mando', () => {
  beforeEach(() => {
    useProfileStore.getState().clearProfile();
    seed([], []);
  });

  it('muestra estado vacío informativo cuando no hay archivos cargados', () => {
    render(<HomeView />);
    expect(screen.getByTestId('dashboard-empty')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-empty')).toHaveTextContent(/Sin datos para mostrar/);
    expect(screen.getByTestId('dash-coverage-sac')).toHaveTextContent(/sin cargar/);
    fireEvent.click(screen.getByTestId('dash-empty-config'));
    expect(useNavigationStore.getState().currentStep).toBe('configuracion');
  });

  it('renderiza KPIs, bandeja, vencidas y listados con datos reales', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    expect(screen.queryByTestId('dashboard-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('dash-title')).toHaveTextContent('Cuadro de Mando');
    expect(screen.getByTestId('dash-coverage-sac')).toHaveTextContent('6');
    expect(screen.getByTestId('dash-coverage-mercurio')).toHaveTextContent('2');

    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5');
    expect(screen.getByTestId('kpi-vencidos')).toHaveTextContent('1');
    // Sin F. vencimiento el sistema calcula el plazo (15 días hábiles), así que
    // los registros sin fecha ya no quedan como "Críticos" por diasPqr.
    expect(screen.getByTestId('kpi-criticos')).toHaveTextContent('0');
    expect(screen.getByTestId('kpi-proximos')).toHaveTextContent('0');
    expect(screen.getByTestId('kpi-plazo')).toHaveTextContent('4');
    expect(screen.getByTestId('kpi-sinproceso')).toHaveTextContent('1');

    expect(screen.getByTestId('chart-carga')).toBeInTheDocument();
    expect(screen.getByTestId('dash-vencidas')).toBeInTheDocument();
    expect(screen.getByTestId('dash-dayrail')).toBeInTheDocument();
    expect(screen.getByTestId('dash-count')).toHaveTextContent('5 de 6');
  });

  it('sección 03: tarjeta de promedio por semana y tooltip explicativo en cada tarjeta', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    // Nueva tarjeta: promedio semanal = total del periodo ÷ 3 semanas (15 días hábiles / 5)
    const totalCard = screen.getByTestId('dash-gstat-total');
    const promSem = screen.getByTestId('dash-gstat-promsem');
    expect(promSem).toHaveTextContent('Promedio por semana');
    const n = (el: HTMLElement): number =>
      Number((el.querySelector('.v')?.textContent ?? '').replace(/\D/g, ''));
    expect(n(promSem)).toBe(Math.round(n(totalCard) / 3));
    expect(promSem.querySelector('.v')?.textContent).toMatch(/PQRS$/);

    // Cada una de las 6 tarjetas tiene su tooltip con explicación
    const tips = screen.getAllByRole('tooltip');
    expect(tips).toHaveLength(6);
    for (const tip of tips) {
      expect(tip.querySelector('b')?.textContent ?? '').not.toBe('');
      expect((tip.textContent ?? '').length).toBeGreaterThan(30);
    }
    expect(
      screen.getAllByText(/Total repartido en 3 semanas de 5 días hábiles/).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Día hábil con más radicados del periodo/).length).toBeGreaterThan(
      0
    );

    // El botón de ayuda queda vinculado a su tooltip
    const info = screen.getByTestId('dash-gstat-info-promsem');
    expect(info).toHaveAttribute('aria-describedby', 'dash-tip-promsem');
    expect(info).toHaveAttribute('aria-label', 'Qué significa: Promedio por semana');
    expect(screen.getByTestId('dash-gstat-info-pico')).toHaveAttribute(
      'aria-describedby',
      'dash-tip-pico'
    );
  });

  it('clic en KPI abre el modal de listado con sus radicados', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('kpi-vencidos'));
    const modal = screen.getByTestId('dash-list-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('900002')).toBeInTheDocument();
    // La columna "Origen" fue eliminada del listado
    expect(within(modal).queryByText('Origen')).not.toBeInTheDocument();
    expect(within(modal).queryByText(/SAC \+ Mercurio|Solo SAC|Solo Mercurio/)).toBeNull();

    fireEvent.click(screen.getByTestId('dash-list-close'));
    expect(screen.queryByTestId('dash-list-modal')).not.toBeInTheDocument();
  });

  it('clic en barra selecciona el día y Detalles abre el panel en línea', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-bar-2'));
    expect(screen.getByTestId('dash-day-panel')).toBeInTheDocument();
    expect(screen.getByText('Radicados del día 2')).toBeInTheDocument();

    const card = screen.getByTestId('dash-daycard-R:900001');
    fireEvent.click(within(card).getByText('Detalles →'));
    const detail = screen.getByTestId('dash-detail-panel');
    expect(detail).toBeInTheDocument();
    // La sección 04 muestra el panel en línea, nunca una ventana modal
    expect(screen.queryByTestId('dash-detail-modal')).not.toBeInTheDocument();
    expect(within(card).getByText('Ocultar detalle')).toBeInTheDocument();
    expect(screen.getByTestId('dash-detail-radicado')).toHaveTextContent('900001');
    expect(within(detail).getAllByText(/Procesos asociados/).length).toBeGreaterThan(0);
    expect(within(detail).getAllByText('Estado en Mercurio').length).toBeGreaterThan(0);

    // Pestañas: Resumen activo por defecto; cambiarla reemplaza el contenido
    expect(within(detail).getByTestId('dash-detail-tab-resumen')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(within(detail).getByRole('tabpanel')).toHaveAttribute('id', 'ddet-cont-resumen');
    expect(within(detail).getByText('Información del radicado')).toBeInTheDocument();
    fireEvent.click(within(detail).getByTestId('dash-detail-tab-procesos'));
    expect(within(detail).getByTestId('dash-detail-tab-procesos')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(within(detail).getByRole('tabpanel')).toHaveAttribute('id', 'ddet-cont-procesos');
    expect(within(detail).queryByText('Información del radicado')).not.toBeInTheDocument();
    expect(within(detail).getByText('PROC-1')).toBeInTheDocument();
    fireEvent.click(within(detail).getByTestId('dash-detail-tab-resumen'));
    // El campo "Origen" fue eliminado de la ficha y de los chips del detalle
    expect(within(detail).queryByText('Origen')).not.toBeInTheDocument();
    expect(within(detail).queryByText(/SAC \+ Mercurio|Solo SAC|Solo Mercurio/)).toBeNull();

    fireEvent.click(screen.getByTestId('dash-detail-close'));
    expect(screen.queryByTestId('dash-detail-panel')).not.toBeInTheDocument();
    expect(within(card).getByText('Detalles →')).toBeInTheDocument();

    // Cambiar de día cierra el panel: la ficha pertenecía al día anterior
    fireEvent.click(screen.getByTestId('dash-daydetail-R:900001'));
    expect(screen.getByTestId('dash-detail-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dash-bar-1'));
    expect(screen.queryByTestId('dash-detail-panel')).not.toBeInTheDocument();
  });

  it('clic en la tarjeta alterna el panel y «Vencidas» sigue abriendo la ventana modal', () => {
    localStorage.clear();
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-bar-2'));
    const card = screen.getByTestId('dash-daycard-R:900001');

    // Clic en la tarjeta (no en el botón) abre el panel en línea
    fireEvent.click(card);
    expect(screen.getByTestId('dash-detail-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('dash-detail-modal')).not.toBeInTheDocument();

    // Un segundo clic la cierra
    fireEvent.click(card);
    expect(screen.queryByTestId('dash-detail-panel')).not.toBeInTheDocument();

    // El acceso desde «Vencidas» (fuera de la sección 04) conserva el modal
    fireEvent.click(screen.getByTestId('dash-venc-chip-18'));
    fireEvent.click(screen.getByTestId('dash-venc-R:900002'));
    expect(screen.getByTestId('dash-detail-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('dash-detail-panel')).not.toBeInTheDocument();
    localStorage.clear();
  });

  it('colores por registro: paleta de 5, cambio, quitar y persistencia', () => {
    localStorage.clear();
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-bar-2'));
    const card = screen.getByTestId('dash-daycard-R:900001');
    expect(card.className).not.toContain('con-color');

    // Se despliega la paleta: 5 colores + quitar color
    fireEvent.click(within(card).getByTestId('dash-colorbtn-R:900001'));
    const paleta = within(card).getByRole('group', { name: 'Color del registro' });
    expect(within(paleta).getAllByRole('button')).toHaveLength(6);

    fireEvent.click(within(paleta).getByTestId('dash-color-R:900001-violeta'));
    expect(card.className).toContain('con-color');
    expect(card.style.getPropertyValue('--rc')).toBe('#7b61d8');
    expect(JSON.parse(localStorage.getItem('essa-dashboard-colores') ?? '{}')).toEqual({
      'R:900001': '#7b61d8',
    });
    // Elegir un color cierra la fila
    expect(within(card).queryByRole('group', { name: 'Color del registro' })).toBeNull();

    // Cambiar a otro color
    fireEvent.click(within(card).getByTestId('dash-colorbtn-R:900001'));
    fireEvent.click(within(card).getByTestId('dash-color-R:900001-rosa'));
    expect(card.style.getPropertyValue('--rc')).toBe('#e0508f');
    expect(JSON.parse(localStorage.getItem('essa-dashboard-colores') ?? '{}')).toEqual({
      'R:900001': '#e0508f',
    });

    // Quitar el color
    fireEvent.click(within(card).getByTestId('dash-colorbtn-R:900001'));
    fireEvent.click(within(card).getByTestId('dash-color-R:900001-none'));
    expect(card.className).not.toContain('con-color');
    expect(JSON.parse(localStorage.getItem('essa-dashboard-colores') ?? '{}')).toEqual({});
    localStorage.clear();
  });

  it('la paleta también está en el panel de detalle y al recargar se mantiene', () => {
    localStorage.clear();
    seed(sacRows, merRows);
    const first = render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-bar-2'));
    fireEvent.click(screen.getByTestId('dash-daydetail-R:900001'));

    const panel = screen.getByTestId('dash-detail-panel');
    const paleta = within(panel).getByRole('group', { name: 'Color del registro' });
    fireEvent.click(within(paleta).getByTestId('dash-color-panel-teal'));
    expect(JSON.parse(localStorage.getItem('essa-dashboard-colores') ?? '{}')).toEqual({
      'R:900001': '#0d9488',
    });

    // Recarga: el color elegido se vuelve a pintar en la tarjeta
    first.unmount();
    render(<HomeView />);
    fireEvent.click(screen.getByTestId('dash-bar-2'));
    const card = screen.getByTestId('dash-daycard-R:900001');
    expect(card.className).toContain('con-color');
    expect(card.style.getPropertyValue('--rc')).toBe('#0d9488');
    localStorage.clear();
  });

  it('panel Vencidas filtra por día y abre el listado completo', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    const chip = screen.getByTestId('dash-venc-chip-18');
    expect(chip).toHaveTextContent('1');
    fireEvent.click(chip);
    expect(screen.getByTestId('dash-venc-R:900002')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dash-venc-todos'));
    expect(screen.getByTestId('dash-list-modal')).toBeInTheDocument();
  });

  it('botón de análisis abre el modal con dona, rankings y matriz', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-open-analysis'));
    expect(screen.getByTestId('dash-analysis-modal')).toBeInTheDocument();
    expect(screen.getByTestId('dash-anal-donut')).toBeInTheDocument();
    expect(screen.getByTestId('dash-anal-rank-resp')).toBeInTheDocument();
    expect(screen.getByTestId('dash-anal-matriz')).toBeInTheDocument();

    // clic en ranking de responsable filtra el tablero y cierra el modal
    fireEvent.click(screen.getByTestId('dash-anal-resp-0'));
    expect(screen.queryByTestId('dash-analysis-modal')).not.toBeInTheDocument();
    expect((screen.getByTestId('dash-filter-responsable') as HTMLSelectElement).value).not.toBe(
      'todos'
    );
  });

  it('filtros reducen el tablero y Limpiar restaura', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.change(screen.getByTestId('dash-filter-tipo'), {
      target: { value: 'Tutela' },
    });
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('1');
    expect(screen.getByTestId('dash-count')).toHaveTextContent('1 de 6');

    fireEvent.change(screen.getByTestId('dash-filter-q'), {
      target: { value: '900004' },
    });
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('dash-clear-filters'));
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5');
    expect(screen.queryByTestId('dash-clear-filters')).not.toBeInTheDocument();
  });

  it('filtro por responsable usa la clave agrupada (SAC o gestor)', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    const sel = screen.getByTestId('dash-filter-responsable') as HTMLSelectElement;
    const ana = Array.from(sel.options).find((o) => o.text === 'Ana Perez')!;
    fireEvent.change(sel, { target: { value: ana.value } });
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('1');
  });

  it('incluir fuera de ventana incorpora el grupo sin fecha', () => {
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-filter-fuera'));
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('6');
  });

  it('muestra nota unificando variantes al filtrar por responsable', () => {
    seed(
      [
        sacRow({
          rowId: 'v1',
          radicadoEntrada: '900011',
          NOMBRE_USUARIO_INICIAL_PROCESO: 'NORA LILIANA VILLAMIZAR JAIMES',
        }),
        sacRow({
          rowId: 'v2',
          radicadoEntrada: '900012',
          NOMBRE_USUARIO_INICIAL_PROCESO: 'NORA LILIANA VILLAMIZAR',
        }),
      ],
      []
    );
    render(<HomeView />);
    const sel = screen.getByTestId('dash-filter-responsable') as HTMLSelectElement;
    const opt = Array.from(sel.options).find((o) => o.text === 'NORA LILIANA VILLAMIZAR JAIMES')!;
    fireEvent.change(sel, { target: { value: opt.value } });
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('2');
    expect(screen.getByTestId('dash-count')).toHaveTextContent('unificando 2 variantes');
  });

  it('detalle de correo permite registrar fecha real y recalcula el día', () => {
    localStorage.clear();
    seed(
      [
        sacRow({
          rowId: 'mail1',
          radicadoEntrada: '900021',
          FECHA_SOLICITUD: fechaDe(2),
          fechaSolicitud: fechaDe(2),
          MEDIO_SOLICITUD: 'E-Mail',
          medioSolicitud: 'E-Mail',
          NOMBRE_USUARIO_INICIAL_PROCESO: 'Ana',
        }),
        sacRow({
          rowId: 'fis1',
          radicadoEntrada: '900022',
          FECHA_SOLICITUD: fechaDe(2),
          fechaSolicitud: fechaDe(2),
          MEDIO_SOLICITUD: 'Escrito',
          medioSolicitud: 'Escrito',
          NOMBRE_USUARIO_INICIAL_PROCESO: 'Luis',
        }),
      ],
      []
    );
    render(<HomeView />);

    // El grupo físico no ofrece la caja de ajuste
    fireEvent.click(screen.getByTestId('dash-bar-2'));
    fireEvent.click(screen.getByTestId('dash-daydetail-R:900022'));
    expect(screen.getByTestId('dash-detail-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('dash-detail-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dash-detail-mailbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dash-detail-close'));

    // El grupo de correo sí: aplicar fecha real más antigua mueve el día
    fireEvent.click(screen.getByTestId('dash-daydetail-R:900021'));
    expect(screen.getByTestId('dash-detail-mailbox')).toBeInTheDocument();

    // Antes de corregir: la tarjeta usa el vencimiento oficial del sistema
    const vence = () => screen.getByTestId('dash-detail-vence').textContent?.trim() ?? '';
    const restan = () => screen.getByTestId('dash-detail-restan').textContent?.trim() ?? '';
    expect(restan()).toBe('40');
    expect(vence()).toBe(`Vence ${fechaFutura(40)}`);
    expect(screen.queryByText(/\(sistema:/)).not.toBeInTheDocument();

    const iso10 = (() => {
      const s = WIN.find((x) => x.dia === 10)!;
      const d = s.fecha;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    fireEvent.change(screen.getByTestId('dash-detail-fecha'), { target: { value: iso10 } });
    fireEvent.click(screen.getByTestId('dash-detail-aplicar'));

    // Chips, información del radicado y tiempos muestran el nuevo día (tres menciones)
    expect(screen.getAllByText('Día 10 de 15')).toHaveLength(3);
    expect(screen.queryByText('Día 2 de 15')).not.toBeInTheDocument();

    // La tarjeta de días restantes se recalcula con la fecha corregida
    expect(restan()).not.toBe('40');
    expect(vence()).not.toBe(`Vence ${fechaFutura(40)}`);
    const venceTxt = /Vence (\d{2})\/(\d{2})\/(\d{4})/.exec(vence());
    expect(venceTxt).not.toBeNull();
    const venceDate = new Date(
      Number(venceTxt![3]),
      Number(venceTxt![2]) - 1,
      Number(venceTxt![1])
    );
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    expect(Number(restan())).toBe(Math.round((venceDate.getTime() - hoy.getTime()) / 86400000));
    // F. radicación y F. vencimiento muestran la fecha oficial entre paréntesis
    expect(screen.getAllByText(/\(sistema:/)).toHaveLength(2);

    expect(JSON.parse(localStorage.getItem('essa-dashboard-ajustes-correo') ?? '{}')).toEqual({
      'R:900021': iso10,
    });

    // Quitar el ajuste restaura el día oficial y el vencimiento original
    fireEvent.click(screen.getByTestId('dash-detail-quitar'));
    expect(screen.getAllByText('Día 2 de 15')).toHaveLength(3);
    expect(restan()).toBe('40');
    expect(vence()).toBe(`Vence ${fechaFutura(40)}`);
    expect(screen.queryByText(/\(sistema:/)).not.toBeInTheDocument();
    expect(localStorage.getItem('essa-dashboard-ajustes-correo')).toBe('{}');
    localStorage.clear();
  });

  it('vencimiento vacío: lo calcula con el plazo y con él muestra los días restantes', () => {
    localStorage.clear();
    seed(sacRows, merRows);
    render(<HomeView />);

    // Fila sin fecha de vencimiento: P:PROC-9 (radicado el día 1 de la ventana)
    fireEvent.click(screen.getByTestId('dash-bar-1'));
    fireEvent.click(screen.getByTestId('dash-daydetail-P:PROC-9'));
    expect(screen.getByTestId('dash-detail-panel')).toBeInTheDocument();

    // Regla establecida: 15 días hábiles después de la fecha de radicación
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vto = addBusinessDays(parseDateOnly(fechaDe(1))!, 15);
    const restan = Math.round((vto.getTime() - hoy.getTime()) / 86400000);

    expect(screen.getByTestId('dash-detail-vence')).toHaveTextContent(`Vence ${formatDMY(vto)}`);
    expect(screen.getByTestId('dash-detail-vence')).toHaveTextContent('(calculada)');
    expect(screen.getByTestId('dash-detail-restan')).toHaveTextContent(String(restan));
    expect(screen.getByTestId('dash-detail-vtocalc')).toHaveTextContent('Calculada');
    // Con fecha calculada ya no aparece el estado vacío del reloj
    expect(screen.queryByText('Sin fecha de vencimiento')).not.toBeInTheDocument();
    localStorage.clear();
  });

  it('detalle del radicado: bloque de observaciones diferenciadas por origen', () => {
    localStorage.clear();
    seed(
      [
        sacRow({
          rowId: 'obs1',
          radicadoEntrada: '900031',
          FECHA_SOLICITUD: fechaDe(2),
          fechaSolicitud: fechaDe(2),
          MEDIO_SOLICITUD: 'Escrito',
          medioSolicitud: 'Escrito',
          OBSERVACION_REVISION: 'Insumo: se verificó el medidor del usuario.',
          OBSERVACION_DECISION: 'Decisión: se aprueba el ajuste de la factura.',
        }),
        sacRow({
          rowId: 'obs2',
          radicadoEntrada: '900032',
          FECHA_SOLICITUD: fechaDe(2),
          fechaSolicitud: fechaDe(2),
          MEDIO_SOLICITUD: 'Escrito',
          medioSolicitud: 'Escrito',
        }),
      ],
      [
        merRow({
          rowId: 'mobs',
          'No. Radicado': '900031',
          'Nombre del Gestor': 'Gestor Obs',
          Estado: 'P',
          'Fecha  Radicacion': fechaDe(2),
          'Refencia del Documento': 'RAD-REF-001',
        }),
      ]
    );
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-bar-2'));
    fireEvent.click(screen.getByTestId('dash-daydetail-R:900031'));

    // Las observaciones viven en su propia pestaña (no en Resumen)
    expect(screen.queryByTestId('dash-detail-obs-mercurio')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dash-detail-tab-observaciones'));

    const mer = screen.getByTestId('dash-detail-obs-mercurio');
    expect(screen.getByTestId('dash-detail-obs')).toBeInTheDocument();
    expect(mer).toHaveTextContent('Observación Mercurio');
    expect(mer).toHaveTextContent('RAD-REF-001');

    const ins = screen.getByTestId('dash-detail-obs-insumo');
    expect(ins).toHaveTextContent('Observación del Insumo');
    expect(ins).toHaveTextContent('Insumo: se verificó el medidor del usuario.');

    const dec = screen.getByTestId('dash-detail-obs-decision');
    expect(dec).toHaveTextContent('Observación de la Decisión');
    expect(dec).toHaveTextContent('Decisión: se aprueba el ajuste de la factura.');

    // Solo etiquetas amigables: sin rótulos de archivo ni de columnas técnicas
    for (const tecnica of [
      'Archivo SAC',
      'Archivo Mercurio',
      'Refencia del Documento',
      'OBSERVACION_REVISION',
      'OBSERVACION_DECISION',
    ]) {
      expect(screen.queryByText(tecnica)).not.toBeInTheDocument();
    }

    // Sin observaciones: las tres tarjetas siguen presentes con su estado vacío
    fireEvent.click(screen.getByTestId('dash-detail-close'));
    fireEvent.click(screen.getByTestId('dash-daydetail-R:900032'));
    fireEvent.click(screen.getByTestId('dash-detail-tab-observaciones'));
    expect(screen.getByTestId('dash-detail-obs-mercurio-empty')).toBeInTheDocument();
    expect(screen.getByTestId('dash-detail-obs-insumo-empty')).toBeInTheDocument();
    expect(screen.getByTestId('dash-detail-obs-decision-empty')).toBeInTheDocument();
    expect(screen.getByTestId('dash-detail-obs-mercurio')).toHaveTextContent(
      'Sin referencia de documento en Mercurio para este radicado.'
    );
    localStorage.clear();
  });

  it('notas del trabajo diario: crear, consultar, editar y eliminar con persistencia', () => {
    localStorage.clear();
    seed(sacRows, merRows);
    const first = render(<HomeView />);

    // El botón vive en el bloque derecho de la sección 04
    fireEvent.click(screen.getByTestId('dash-notas-open'));
    const modal = screen.getByTestId('dash-notas-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByTestId('dash-notas-empty')).toBeInTheDocument();

    // Crear una nota general
    fireEvent.change(screen.getByTestId('dash-notas-texto'), {
      target: { value: 'Confirmar radicación con jurídica' },
    });
    expect(screen.getByTestId('dash-notas-guardar')).toBeEnabled();
    fireEvent.click(screen.getByTestId('dash-notas-guardar'));

    expect(screen.queryByTestId('dash-notas-empty')).not.toBeInTheDocument();
    expect(screen.getByText('Confirmar radicación con jurídica')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByTestId('dash-notas-guardar')).toBeDisabled();
    expect(JSON.parse(localStorage.getItem('essa-dashboard-notas') ?? '[]')).toHaveLength(1);

    // Recargar la vista: la nota sigue en la caché del navegador
    first.unmount();
    render(<HomeView />);
    fireEvent.click(screen.getByTestId('dash-notas-open'));
    expect(screen.getByText('Confirmar radicación con jurídica')).toBeInTheDocument();

    // Editar
    const guardadas = JSON.parse(localStorage.getItem('essa-dashboard-notas') ?? '[]');
    const id = guardadas[0].id as string;
    fireEvent.click(screen.getByTestId(`dash-nota-edit-${id}`));
    expect(screen.getByTestId('dash-notas-texto')).toHaveValue('Confirmar radicación con jurídica');
    fireEvent.change(screen.getByTestId('dash-notas-texto'), {
      target: { value: 'Llamar al solicitante hoy' },
    });
    fireEvent.click(screen.getByTestId('dash-notas-guardar'));

    expect(screen.getByText('Llamar al solicitante hoy')).toBeInTheDocument();
    expect(screen.queryByText('Confirmar radicación con jurídica')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('essa-dashboard-notas') ?? '[]')[0].texto).toBe(
      'Llamar al solicitante hoy'
    );

    // Buscar (consultar)
    fireEvent.change(screen.getByTestId('dash-notas-buscar'), {
      target: { value: 'otra cosa' },
    });
    expect(screen.getByTestId('dash-notas-empty')).toHaveTextContent(/Ninguna nota coincide/);
    fireEvent.change(screen.getByTestId('dash-notas-buscar'), { target: { value: '' } });

    // Eliminar con confirmación en dos pasos
    const id2 = JSON.parse(localStorage.getItem('essa-dashboard-notas') ?? '[]')[0].id as string;
    fireEvent.click(screen.getByTestId(`dash-nota-del-${id2}`));
    expect(screen.getByTestId(`dash-nota-del-yes-${id2}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`dash-nota-del-yes-${id2}`));

    expect(screen.getByTestId('dash-notas-empty')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('essa-dashboard-notas') ?? '[]')).toHaveLength(0);

    // Escape cierra el gestor
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('dash-notas-modal')).not.toBeInTheDocument();
    localStorage.clear();
  });

  it('detalle del radicado muestra sus notas y su atajo abre el gestor precargado', () => {
    localStorage.clear();
    seed(sacRows, merRows);
    render(<HomeView />);

    fireEvent.click(screen.getByTestId('dash-bar-2'));
    fireEvent.click(screen.getByTestId('dash-daydetail-R:900001'));

    expect(screen.getByTestId('dash-detail-notas')).toBeInTheDocument();
    expect(screen.getByTestId('dash-detail-notas-empty')).toBeInTheDocument();

    // Atajo: abre el gestor con el radicado precargado
    fireEvent.click(screen.getByTestId('dash-detail-notas-edit'));
    expect(screen.getByTestId('dash-notas-modal')).toBeInTheDocument();
    expect((screen.getByTestId('dash-notas-radicado') as HTMLInputElement).value).toContain(
      '900001'
    );

    fireEvent.change(screen.getByTestId('dash-notas-texto'), {
      target: { value: 'Pendiente confirmación del área' },
    });
    fireEvent.click(screen.getByTestId('dash-notas-guardar'));
    fireEvent.click(screen.getByTestId('dash-notas-cerrar'));

    // El detalle muestra la nota de SU radicado
    expect(screen.getByTestId('dash-detail-notas')).toHaveTextContent(
      'Pendiente confirmación del área'
    );
    expect(screen.queryByTestId('dash-detail-notas-empty')).not.toBeInTheDocument();

    // Otra nota de otro radicado no aparece en este detalle
    fireEvent.click(screen.getByTestId('dash-detail-notas-edit'));
    fireEvent.change(screen.getByTestId('dash-notas-texto'), {
      target: { value: 'Nota de otro radicado' },
    });
    fireEvent.change(screen.getByTestId('dash-notas-radicado'), {
      target: { value: '900004' },
    });
    fireEvent.click(screen.getByTestId('dash-notas-guardar'));
    fireEvent.click(screen.getByTestId('dash-notas-cerrar'));

    expect(screen.getByTestId('dash-detail-notas')).not.toHaveTextContent('Nota de otro radicado');
    localStorage.clear();
  });

  it('botón del encabezado navega a Configuración', () => {
    seed(sacRows, merRows);
    render(<HomeView />);
    fireEvent.click(screen.getByTestId('dash-go-config'));
    expect(useNavigationStore.getState().currentStep).toBe('configuracion');
  });

  it('filtra automáticamente por responsable y oculta el selector para usuarios distintos a Atención Clientes', () => {
    useProfileStore.setState({
      profile: {
        name: 'Ana Pérez',
        position: 'Gestor',
        email: 'ana@essa.com.co',
        signatureUrl: null,
      },
    });
    seed(sacRows, merRows);
    render(<HomeView />);

    // El selector de responsable no está visible para usuarios regulares
    expect(screen.queryByTestId('dash-filter-responsable')).not.toBeInTheDocument();
    // El tablero está filtrado automáticamente a los registros de Ana Pérez (1 radicado único)
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('1');
  });

  it('muestra y permite usar el filtro de responsable únicamente cuando el perfil es Atención Clientes', () => {
    useProfileStore.setState({
      profile: {
        name: 'Atención Clientes',
        position: 'Admin',
        email: 'atencion@essa.com.co',
        signatureUrl: null,
      },
    });
    seed(sacRows, merRows);
    render(<HomeView />);

    const select = screen.getByTestId('dash-filter-responsable') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('todos');
    // Tablero sin filtrar inicialmente (5 en ventana)
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5');

    // Atención Clientes puede seleccionar un responsable específico
    const anaOpt = Array.from(select.options).find((o) => o.text === 'Ana Perez')!;
    fireEvent.change(select, { target: { value: anaOpt.value } });
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('1');
  });
});
