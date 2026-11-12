import { XLSXLite } from './xlsx-lite';
export type XlsxRow = Record<string, unknown>;
export interface XlsxReader { leer(buffer: ArrayBuffer, columns?: readonly string[]): Promise<XlsxRow[]> }
interface WorkerReply { id: number; ok: boolean; rows?: XlsxRow[]; message?: string }
class FileError extends Error {}

let worker: Worker | null = null, workerUnavailable = false, seq = 0;
const pending = new Map<number, { resolve: (r: XlsxRow[]) => void; reject: (e: Error) => void }>();
function disableWorker(reason: unknown): void {
  workerUnavailable = true;
  try { worker?.terminate(); } catch { }
  worker = null;
  const all = [...pending.values()]; pending.clear();
  all.forEach(p => p.reject(new Error('worker-unavailable: ' + String((reason as Error)?.message ?? reason))));
}
function getWorker(): Worker | null {
  if (workerUnavailable || typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL('../../workers/xlsx.worker.ts', import.meta.url), { type: 'module' });
    w.addEventListener('message', (e: MessageEvent<WorkerReply>) => {
      const r = e.data, p = pending.get(r.id); if (!p) return; pending.delete(r.id);
      if (r.ok) p.resolve(r.rows ?? []); else p.reject(new FileError(r.message || 'No se pudo leer el archivo.'));
    });
    w.addEventListener('error', ev => disableWorker((ev as ErrorEvent).message || 'error del worker'));
    w.addEventListener('messageerror', () => disableWorker('messageerror'));
    worker = w; return w;
  } catch (e) { disableWorker(e); return null; }
}
function readInWorker(w: Worker, buffer: ArrayBuffer, columns?: readonly string[]): Promise<XlsxRow[]> {
  return new Promise<XlsxRow[]>((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject });
    const copy = buffer.slice(0);
    try { w.postMessage({ id, buffer: copy, columns: columns ? [...columns] : undefined }, [copy]); } catch (e) { pending.delete(id); reject(e as Error); }
  });
}
export const xlsxReader: XlsxReader = {
  async leer(buffer, columns) {
    const w = getWorker();
    if (w) {
      try { return await readInWorker(w, buffer, columns); }
      catch (e) {
        if (e instanceof FileError) throw new Error(e.message);
        if (!workerUnavailable) disableWorker(e);
      }
    }
    return XLSXLite.leer(buffer, columns) as Promise<XlsxRow[]>;
  }
};
export const leerEnHiloPrincipal: XlsxReader['leer'] = (buffer, columns) => XLSXLite.leer(buffer, columns) as Promise<XlsxRow[]>;
