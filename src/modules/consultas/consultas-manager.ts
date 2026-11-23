import './consultas.css';
import { initCiiuModule } from './ciiu';
import { initMatricesModule } from './matrices';

export type TipoConsulta = 'ciiu' | 'matrices' | 'mat';

class ConsultasManager {
  private viewCiiu: HTMLElement | null = null;
  private viewMatrices: HTMLElement | null = null;
  private active: TipoConsulta | null = null;
  private ciiuApi: any = null;
  private initialized = false;

  public init(): void {
    if (this.initialized) return;
    this.viewCiiu = document.getElementById('viewCiiu');
    this.viewMatrices = document.getElementById('viewMatrices');

    // Botones de cierre en las barras de retorno
    document.querySelectorAll('.ad-consulta-btn-close').forEach(b => {
      b.addEventListener('click', () => this.cerrar());
    });

    // Tecla Escape para cerrar la consulta activa (si no hay modales internos abiertos)
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.active) {
        const velo = document.getElementById('velo');
        const lupa = document.getElementById('lupa');
        if (velo && velo.classList.contains('on')) return;
        if (lupa && lupa.classList.contains('on')) return;
        this.cerrar();
      }
    });

    // Escuchar solicitudes de apertura desde cualquier parte de la aplicación o iframes
    window.addEventListener('ad-open-consulta', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const id = detail && detail.id;
      if (id === 'mat' || id === 'matrices') {
        this.abrir('matrices');
      } else if (id === 'ciiu') {
        this.abrir('ciiu');
      }
    });

    this.initialized = true;
  }

  public async abrir(tipo: TipoConsulta): Promise<void> {
    this.init();
    const id = (tipo === 'mat' ? 'matrices' : tipo) as 'ciiu' | 'matrices';

    if (id === 'ciiu') {
      if (this.viewMatrices) this.viewMatrices.hidden = true;
      if (this.viewCiiu) {
        this.viewCiiu.hidden = false;
        this.active = 'ciiu';
        this.ciiuApi = initCiiuModule(this.viewCiiu);
        if (this.ciiuApi && this.ciiuApi.focus) {
          setTimeout(() => this.ciiuApi.focus(), 60);
        }
      }
    } else if (id === 'matrices') {
      if (this.viewCiiu) this.viewCiiu.hidden = true;
      if (this.viewMatrices) {
        this.viewMatrices.hidden = false;
        this.active = 'matrices';
        await initMatricesModule(this.viewMatrices);
      }
    }
  }

  public cerrar(): void {
    if (this.viewCiiu) this.viewCiiu.hidden = true;
    if (this.viewMatrices) this.viewMatrices.hidden = true;
    this.active = null;

    // Regresar foco al contenedor principal
    const stage = document.getElementById('adStage');
    if (stage) stage.focus();
  }

  public estaAbierta(): boolean {
    return this.active !== null;
  }
}

export const consultasManager = new ConsultasManager();
