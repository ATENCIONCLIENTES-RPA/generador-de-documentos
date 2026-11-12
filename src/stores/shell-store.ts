import { createStore } from 'zustand/vanilla';
import type { ThemeMode } from '../types/ad';
import type { ModuleId } from '../types/doc-store';
export type TabState = 'busy' | 'err' | 'ok' | 'pend';
export interface TabStatus { readonly state: TabState; readonly text: string }
export interface ShellState {
  route: ModuleId | null; theme: ThemeMode; busy: boolean; tabs: Partial<Record<ModuleId, TabStatus>>;
  setRoute(route: ModuleId): void; setTheme(theme: ThemeMode): void; setBusy(busy: boolean): void; setTabs(tabs: Partial<Record<ModuleId, TabStatus>>): void;
}
export const normalizeTheme = (m: unknown): ThemeMode => (m === 'dark' ? 'dark' : 'light');
export function createShellStore(initialTheme: ThemeMode = 'light') {
  return createStore<ShellState>()(set => ({
    route: null, theme: initialTheme, busy: false, tabs: {},
    setRoute: route => set({ route }), setTheme: theme => set({ theme }), setBusy: busy => set({ busy }), setTabs: tabs => set({ tabs })
  }));
}
export type ShellStore = ReturnType<typeof createShellStore>;
