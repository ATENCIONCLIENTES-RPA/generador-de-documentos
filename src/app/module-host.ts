import type { ShellStore } from '../stores/shell-store';
import type { ModuleId, ModuleMeta } from '../types/doc-store';
/**
 * Anfitrión de módulos: cada módulo vive en su propio iframe (aislamiento de CSS/ids/globales, como en el original) y se monta
 * de forma perezosa UNA sola vez. Cambio: el iframe carga `modules/<id>.html` (página de Vite) en vez de `srcdoc` con HTML en cadena;
 * el origen es el mismo, así que `window.parent.AsistenteDocumental` y el almacenamiento compartido funcionan igual.
 */
export interface ModuleHost {
  readonly frames: Readonly<Record<string, HTMLIFrameElement>>;
  isLoaded(id: ModuleId): boolean; frameOf(id: ModuleId | null): HTMLIFrameElement | undefined;
  mount(id: ModuleId): HTMLIFrameElement; whenLoaded(id: ModuleId): Promise<void>; syncActive(id: ModuleId): void; reload(id: ModuleId): boolean;
}
interface Deps { store: ShellStore; mods: Readonly<Record<ModuleId, ModuleMeta>>; stage: HTMLElement; loader: HTMLElement }
export const moduleUrl = (id: ModuleId): string => new URL(`modules/${id}.html`, document.baseURI).href;
export function createModuleHost({ store, mods, stage, loader }: Deps): ModuleHost {
  const frames: Record<string, HTMLIFrameElement> = {}, loaded: Record<string, boolean> = {};
  const current = (): ModuleId | null => store.getState().route;
  function mount(id: ModuleId): HTMLIFrameElement {
    if (frames[id]) return frames[id];
    const f = document.createElement('iframe');
    f.className = 'ad-frame'; f.id = 'panel-' + id; f.title = mods[id].title;
    f.setAttribute('role', 'tabpanel'); f.setAttribute('aria-labelledby', 'tab-' + id);
    f.addEventListener('load', () => {
      loaded[id] = true;
      try { const de = f.contentDocument!.documentElement; de.setAttribute('data-theme', store.getState().theme); de.setAttribute('data-ad-active', String(id === current())); } catch { /* marco inaccesible */ }
      if (id === current()) loader.classList.remove('on');
    });
    f.src = moduleUrl(id); frames[id] = f; stage.appendChild(f); return f;
  }
  return {
    frames, isLoaded: id => !!loaded[id], frameOf: id => (id ? frames[id] : undefined), mount,
    async whenLoaded(id) { mount(id); if (!loaded[id]) await new Promise<void>(res => frames[id].addEventListener('load', () => res(), { once: true })); },
    syncActive(id) {
      Object.keys(frames).forEach(k => {
        const fr = frames[k], on = k === id;
        fr.classList.toggle('is-active', on); fr.inert = !on; fr.setAttribute('aria-hidden', String(!on));
        if (loaded[k]) { try { fr.contentDocument!.documentElement.setAttribute('data-ad-active', String(on)); } catch { /* marco inaccesible */ } }
      });
    },
    reload(id) { const fr = frames[id]; if (!fr || !loaded[id]) return false; loaded[id] = false; try { fr.contentWindow!.location.reload(); return true; } catch { return false; } }
  };
}
