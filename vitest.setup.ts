/** Entorno mínimo para importar en Node los módulos que tocan `window`/`localStorage` al cargarse (DataRepository parchea Storage.prototype). */
class MemoryStorage {
  private map = new Map<string, string>();
  get length(): number { return this.map.size; }
  key(i: number): string | null { return [...this.map.keys()][i] ?? null; }
  getItem(k: string): string | null { return this.map.has(k) ? (this.map.get(k) as string) : null; }
  setItem(k: string, v: string): void { this.map.set(String(k), String(v)); }
  removeItem(k: string): void { this.map.delete(k); }
  clear(): void { this.map.clear(); }
}
const g = globalThis as Record<string, unknown>;
g.Storage = MemoryStorage; g.localStorage = new MemoryStorage(); g.window = globalThis; g.addEventListener = () => undefined;
