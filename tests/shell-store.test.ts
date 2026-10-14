import { describe, expect, it, vi } from 'vitest';
import { createShellStore, normalizeTheme } from '../src/stores/shell-store';
describe('shell-store (Zustand)', () => {
  it('estado inicial', () => { expect(createShellStore('dark').getState()).toMatchObject({ route: null, theme: 'dark', busy: false, tabs: {} }); });
  it('normalizeTheme', () => { expect(normalizeTheme('dark')).toBe('dark'); expect(normalizeTheme('x')).toBe('light'); expect(normalizeTheme(undefined)).toBe('light'); });
  it('las acciones actualizan y notifican', () => {
    const s = createShellStore(), fn = vi.fn(); s.subscribe(fn);
    s.getState().setRoute('cuadro'); s.getState().setBusy(true); s.getState().setTheme('dark'); s.getState().setTabs({ recursos: { state: 'ok', text: 'x' } });
    expect(s.getState()).toMatchObject({ route: 'cuadro', busy: true, theme: 'dark', tabs: { recursos: { state: 'ok', text: 'x' } } }); expect(fn).toHaveBeenCalledTimes(4);
  });
});
