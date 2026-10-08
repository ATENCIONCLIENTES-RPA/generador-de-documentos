export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} no encontrado en el documento.`);
  return el as T;
}
export const escHtml = (t: unknown): string => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c as '&' | '<' | '>']));
export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
/** Espera a que el navegador pinte el estado actual (con respaldo por si la pestaña está en segundo plano). */
export const nextPaint = (): Promise<void> => new Promise(res => {
  let ok = false; const fin = () => { if (!ok) { ok = true; res(); } };
  requestAnimationFrame(() => requestAnimationFrame(fin)); setTimeout(fin, 90);
});
