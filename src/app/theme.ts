import type { ShellStore } from '../stores/shell-store';
import { normalizeTheme } from '../stores/shell-store';
import type { ThemeApi, ThemeMode } from '../types/ad';
import { byId } from '../utils/dom';
const SUN = '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
const MOON = '<path d="M20.5 14.2a8.5 8.5 0 1 1-9.7-11.7 7 7 0 0 0 9.7 11.7Z"/>';
export const readInitialTheme = (): ThemeMode => normalizeTheme(document.documentElement.getAttribute('data-theme'));
export function bindThemeEffects(store: ShellStore, frames: () => Iterable<HTMLIFrameElement>): void {
  const apply = (m: ThemeMode): void => {
    document.documentElement.setAttribute('data-theme', m);
    try { localStorage.setItem('essa-theme', m); localStorage.setItem('essa_cm_theme', m); } catch { }
    byId('adKnob').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (m === 'dark' ? MOON : SUN) + '</svg>';
    const t = byId('adTheme'); t.setAttribute('aria-checked', String(m === 'dark')); t.title = m === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    for (const f of frames()) { try { f.contentDocument?.documentElement.setAttribute('data-theme', m); } catch { } }
  };
  store.subscribe(s => apply(s.theme)); apply(store.getState().theme);
  byId('adTheme').addEventListener('click', () => store.getState().setTheme(store.getState().theme === 'dark' ? 'light' : 'dark'));
  window.addEventListener('storage', (e: StorageEvent): void => {
    if (e.key !== 'essa-theme' && e.key !== 'essa_cm_theme') return;
    const next = normalizeTheme(e.newValue ?? localStorage.getItem('essa-theme'));
    if (next !== store.getState().theme) store.getState().setTheme(next);
  });
}
export function createThemeApi(store: ShellStore): ThemeApi {
  return { get: () => store.getState().theme, set: m => store.getState().setTheme(normalizeTheme(m)), toggle() { this.set(this.get() === 'dark' ? 'light' : 'dark'); } };
}
