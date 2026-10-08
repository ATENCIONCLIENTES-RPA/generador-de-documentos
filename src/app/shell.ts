import { dataRepository, docStore } from '../repositories';
import { createShellStore } from '../stores/shell-store';
import type { AsistenteDocumentalApi } from '../types/ad';
import type { ModuleId } from '../types/doc-store';
import { byId } from '../utils/dom';
import { createModuleHost } from './module-host';
import { createTabs } from './tabs';
import { statusOf } from './tab-status';
import { createTaskRunner } from './task-runner';
import { bindThemeEffects, createThemeApi, readInitialTheme } from './theme';
/**
 * Shell: navegación persistente, enrutado por hash, tema y montaje de módulos (cada uno se monta una vez y se conserva vivo).
 * Expone window.AsistenteDocumental: la misma API que los módulos consumen desde `window.parent`.
 */
export const APP_VERSION = '32';
export async function startShell(): Promise<void> {
  const store = docStore, MODS = store.config.modules;
  const ROUTES = (Object.keys(MODS) as ModuleId[]).sort((a, b) => MODS[a].index - MODS[b].index);
  const shell = createShellStore(readInitialTheme());
  const stage = byId('adStage'), loader = byId('adLoader'), mark = byId('adMark');
  const host = createModuleHost({ store: shell, mods: MODS, stage, loader });
  const theme = createThemeApi(shell);
  bindThemeEffects(shell, () => Object.values(host.frames));
  const routeFromHash = (): ModuleId | null => { const m = /^#\/(\w+)/.exec(location.hash || ''); return m && MODS[m[1] as ModuleId] ? (m[1] as ModuleId) : null; };
  const tabs = createTabs({ store: shell, mods: MODS, routes: ROUTES, navigate: id => runner.navigate(id) });
  let firstActivation = true;
  function activate(requested: ModuleId | null): void {
    const id = requested && MODS[requested] ? requested : ROUTES[0], prev = shell.getState().route;
    if (id === prev && !firstActivation) return;
    firstActivation = false;
    shell.getState().setRoute(id); tabs.select(id); host.mount(id); host.syncActive(id);
    byId('adLoaderTxt').textContent = 'Preparando ' + MODS[id].label.toLowerCase() + '…';
    loader.classList.toggle('on', !host.isLoaded(id));
    document.title = 'Asistente Documental';
    try { sessionStorage.setItem('ad_route', id); dataRepository.setItem('essa_last_route', id); } catch { /* sin almacenamiento */ }
    requestAnimationFrame(tabs.moveInk); tabs.scrollToTab(id);
    if (prev) { mark.classList.remove('pulse'); void mark.getBoundingClientRect(); mark.classList.add('pulse'); }
  }
  const go = (id: ModuleId): void => { if (location.hash !== '#/' + id) location.hash = '#/' + id; else activate(id); };
  const runner = createTaskRunner({ store: shell, mods: MODS, host, loader, go });
  window.addEventListener('hashchange', () => activate(routeFromHash() || ROUTES[0]));
  document.addEventListener('keydown', e => { if (e.altKey && !e.ctrlKey && /^[1-9]$/.test(e.key) && ROUTES[+e.key - 1]) { e.preventDefault(); void runner.navigate(ROUTES[+e.key - 1]); } });
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => e.preventDefault()));
  store.subscribe(snap => {
    const st: Partial<Record<ModuleId, ReturnType<typeof statusOf>>> = {};
    ROUTES.forEach(id => { st[id] = statusOf(id, snap, store.config); });
    shell.getState().setTabs(st);
  });
  /* Puente de mantenimiento: la acción vive en Recursos pero la ejecuta el Cuadro de Mando (se registra al montarse) para no duplicar lógica. */
  let maintenanceFn: (() => Promise<unknown> | unknown) | null = null;
  const registerMaintenance = (fn: () => Promise<unknown> | unknown): void => { maintenanceFn = fn; };
  async function runMaintenance(): Promise<unknown> {
    await host.whenLoaded('cuadro');
    if (!maintenanceFn) return { ok: false, error: 'No se pudo conectar con el Cuadro de Mando.' };
    try { return await maintenanceFn(); } catch { return { ok: false, error: 'No se pudo ejecutar el mantenimiento.' }; }
  }
  const api: AsistenteDocumentalApi = Object.freeze({
    store, navigate: runner.navigate, theme, data: dataRepository, backup: dataRepository, registerMaintenance, runMaintenance,
    reloadModule: (id: ModuleId) => host.reload(id), names: window.PersonName || null,
    libs: Object.freeze({ JSZip: window.JSZip, PizZip: window.PizZip || null, docxtemplater: window.docxtemplater || window.Docxtemplater || null,
      easyTemplateX: window.easyTemplateX || null, docx: window.docx || null, docxRenderer: window.docxRenderer || null, mammoth: window.mammoth || null }),
    version: APP_VERSION
  });
  window.AsistenteDocumental = api;
  /* la marca del loader reutiliza el SVG de identidad */
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); holder.setAttribute('width', '0'); holder.setAttribute('height', '0');
  holder.style.position = 'absolute'; holder.setAttribute('aria-hidden', 'true');
  const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol'); symbol.id = 'adMarkUse'; symbol.setAttribute('viewBox', '0 0 40 40');
  [...mark.childNodes].forEach(n => { if (n.nodeName !== 'defs') symbol.appendChild(n.cloneNode(true)); });
  holder.appendChild(symbol); document.body.appendChild(holder);
  void store.hydrate();
  /* IndexedDB (y la carpeta externa, si existe) se hidratan ANTES de montar módulos; localStorage queda como espejo compatible. */
  try { await dataRepository.init(); } catch { /* degrada a localStorage */ }
  try { store.refreshProfile(); } catch { /* sin perfil */ }
  try { theme.set((dataRepository.getItem('essa-theme') || dataRepository.getItem('essa_cm_theme') || theme.get()) as string); } catch { /* tema por defecto */ }
  let inicial: string | null = routeFromHash();
  if (!inicial) { try { inicial = sessionStorage.getItem('ad_route') || dataRepository.getItem('essa_last_route'); } catch { /* sin almacenamiento */ } }
  if (!inicial || !MODS[inicial as ModuleId]) inicial = ROUTES[0];
  if (location.hash !== '#/' + inicial) history.replaceState(null, '', '#/' + inicial);
  activate(inicial as ModuleId);
  const precargar = (): void => { ROUTES.forEach((id, i) => setTimeout(() => host.mount(id), 400 * i)); };
  (window.requestIdleCallback || ((fn: () => void) => setTimeout(fn, 1200)))(precargar, { timeout: 2500 });
}
