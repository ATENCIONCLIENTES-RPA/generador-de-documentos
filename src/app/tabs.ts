import type { ShellStore, TabStatus } from '../stores/shell-store';
import type { ModuleId, ModuleMeta } from '../types/doc-store';
import { byId } from '../utils/dom';
/** Barra de pestañas (tablist): render, tinta deslizante, teclado y estado visible por pestaña (alimentado por el store de UI). */
export interface Tabs { select(id: ModuleId): void; moveInk(): void; scrollToTab(id: ModuleId): void }
interface Deps { store: ShellStore; mods: Readonly<Record<ModuleId, ModuleMeta>>; routes: readonly ModuleId[]; navigate: (id: ModuleId) => unknown }
export function createTabs({ store, mods, routes, navigate }: Deps): Tabs {
  const nav = byId('adNav'), ink = byId('adInk');
  nav.insertAdjacentHTML('afterbegin', routes.map(id => {
    const m = mods[id];
    return '<a class="ad-tab" role="tab" id="tab-' + id + '" href="#/' + id + '" data-route="' + id + '" aria-controls="panel-' + id + '" aria-selected="false" tabindex="-1">' +
      '<span class="ad-idx">' + String(m.index).padStart(2, '0') + '<span class="ad-dot" data-dot></span></span>' +
      '<span class="ad-txt"><b>' + m.label + '</b><small data-sub>&nbsp;</small></span></a>';
  }).join(''));
  const tabs = [...nav.querySelectorAll<HTMLAnchorElement>('.ad-tab')];
  const tabOf = (id: ModuleId | null) => tabs.find(t => t.dataset.route === id);
  function moveInk(): void {
    const t = tabOf(store.getState().route);
    if (!t) { ink.classList.remove('on'); return; }
    const pad = 14;
    ink.style.width = Math.max(0, t.offsetWidth - pad * 2) + 'px';
    ink.style.transform = 'translateX(' + (t.offsetLeft + pad - nav.scrollLeft) + 'px)';
    ink.classList.add('on');
  }
  /** Throttle via rAF: agrupa llamadas durante scroll/resize al siguiente ciclo de pintura,
   *  evitando layout thrashing cuando el navegador dispara decenas de eventos por segundo. */
  let _inkRaf = 0;
  const moveInkThrottled = (): void => { if (!_inkRaf) _inkRaf = requestAnimationFrame(() => { _inkRaf = 0; moveInk(); }); };
  nav.addEventListener('scroll', moveInkThrottled, { passive: true });
  window.addEventListener('resize', moveInkThrottled, { passive: true });
  nav.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement as HTMLAnchorElement); if (i < 0) return;
    let n: number | null = null;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
    if (n === null) return; e.preventDefault(); tabs[n].focus(); navigate(tabs[n].dataset.route as ModuleId);
  });
  const renderStatus = (st: Partial<Record<ModuleId, TabStatus>>): void => {
    tabs.forEach(t => {
      const id = t.dataset.route as ModuleId, s = st[id]; if (!s) return;
      t.dataset.state = s.state; (t.querySelector('[data-dot]') as HTMLElement).dataset.state = s.state;
      t.querySelector('[data-sub]')!.textContent = s.text; t.setAttribute('aria-label', mods[id].label + ' · ' + s.text);
    });
    requestAnimationFrame(moveInk);
  };
  store.subscribe((s, prev) => { if (s.tabs !== prev.tabs) renderStatus(s.tabs); });
  return {
    select(id) { tabs.forEach(t => { const on = t.dataset.route === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }); },
    moveInk, scrollToTab(id) { const t = tabOf(id); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  };
}
