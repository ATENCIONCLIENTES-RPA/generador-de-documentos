import type { TabStatus } from '../stores/shell-store';
import type { DocStoreApi, DocStoreSnapshot, ModuleId, ResourceState } from '../types/doc-store';
const busy = (r: ResourceState): boolean => r.status === 'loading' || r.status === 'processing';
/** Estado visible de cada pestaña a partir del snapshot del DocStore (función pura; reglas idénticas al shell original). */
export function statusOf(id: ModuleId, snap: DocStoreSnapshot, cfg: DocStoreApi['config']): TabStatus {
  const R = snap.resources, RES = cfg.resources;
  if (id === 'recursos') {
    const keys = snap.order, ready = keys.filter(k => R[k].status === 'ready').length;
    if (keys.some(k => busy(R[k]))) return { state: 'busy', text: 'Procesando archivos…' };
    if (keys.some(k => R[k].status === 'error')) return { state: 'err', text: 'Revisa un archivo' };
    const reqOk = keys.filter(k => RES[k].required).every(k => R[k].status === 'ready');
    return { state: reqOk ? 'ok' : 'pend', text: ready + ' de ' + keys.length + ' recursos listos' };
  }
  const mine = snap.order.filter(k => RES[k].consumers.includes(id)).map(k => R[k]);
  const nReady = mine.filter(r => r.status === 'ready').length;
  if (mine.some(busy)) return { state: 'busy', text: 'Procesando datos…' };
  const nTpl = mine.reduce((a, r) => a + (r.status === 'ready' && r.file && r.file.items ? r.file.items.length : 0), 0);
  if (nReady === mine.length) return { state: 'ok', text: nTpl ? nTpl + (nTpl === 1 ? ' plantilla lista' : ' plantillas listas') : 'Datos al día' };
  if (nReady) return { state: 'ok', text: 'Datos parciales' };
  if (mine.some(r => r.status === 'error')) return { state: 'err', text: 'Revisa en Recursos' };
  return { state: 'pend', text: id === 'documentos' ? 'Sin plantillas cargadas' : 'Sin datos cargados' };
}
