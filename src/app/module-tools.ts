import type { ModuleHost } from './module-host';
import { byId } from '../utils/dom';
type ToolAction = 'mat' | 'ciiu' | 'cal' | 'rev';
interface ToolDeps { host: ModuleHost; go: (id: 'cuadro') => void }
export function bindModuleTools({ host, go }: ToolDeps): void {
  const cuadroFrame = (): Window | null => host.frameOf('cuadro')?.contentWindow ?? null;
  const dispara = (accion: ToolAction): void => {
    go('cuadro');
    void host.whenLoaded('cuadro').then(() => {
      try { cuadroFrame()?.dispatchEvent(new CustomEvent('ad-cuadro-tool', { detail: { action: accion } })); }
      catch { }
    });
  };
  const botones = ['adMat', 'adCiiu', 'adCal', 'adRev'].map(id => byId(id)).filter((b): b is HTMLElement => !!b);
  const activa = (id: string): void => { botones.forEach(b => b.classList.toggle('is-active', b.id === id)); };
  const bind = (id: string, accion: ToolAction): void => {
    const b = byId(id); if (!b) return;
    b.addEventListener('click', () => { activa(id); dispara(accion); });
  };
  bind('adMat', 'mat'); bind('adCiiu', 'ciiu'); bind('adCal', 'cal'); bind('adRev', 'rev');
  function pintarFecha(): void {
    const d = new Date();
    byId('adCalMes').textContent = d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '').toUpperCase();
    byId('adCalDia').textContent = String(d.getDate()).padStart(2, '0');
    byId('adCalSem').textContent = d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '').toUpperCase();
    byId('adCalTip').textContent = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    const manana = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime();
    window.setTimeout(pintarFecha, manana + 1000);
  }
  pintarFecha();
  let ultimoConteo = -1;
  window.addEventListener('ad-rev-count', (e) => {
    const n = Math.max(0, Math.trunc(Number((e as CustomEvent).detail?.n) || 0));
    const badge = byId('adRevBadge'), boton = byId('adRev');
    badge.textContent = n > 99 ? '99+' : String(n); badge.hidden = n === 0;
    boton.setAttribute('aria-label', n ? 'Alertas de revisión · ' + n + (n === 1 ? ' pendiente' : ' pendientes') : 'Alertas de revisión');
    if (n !== ultimoConteo) {
      ultimoConteo = n;
      badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
    }
  });
}
