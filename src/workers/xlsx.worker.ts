/// <reference lib="webworker" />
/** Worker del lector XLSX: ejecuta XLSXLite (sin cambios) fuera del hilo principal. */
import { XLSXLite } from '../services/xlsx/xlsx-lite';
interface Request { id: number; buffer: ArrayBuffer; columns?: string[] }
self.addEventListener('message', async (e: MessageEvent<Request>) => {
  const { id, buffer, columns } = e.data;
  try { const rows = await XLSXLite.leer(buffer, columns); (self as unknown as Worker).postMessage({ id, ok: true, rows }); }
  catch (err) { (self as unknown as Worker).postMessage({ id, ok: false, message: String((err as Error)?.message ?? err) }); }
});
