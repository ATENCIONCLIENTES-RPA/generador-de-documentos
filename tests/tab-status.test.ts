import { describe, expect, it } from 'vitest';
import { statusOf } from '../src/app/tab-status';
import { docStore } from '../src/repositories';
import type { DocStoreSnapshot, ResourceKey, ResourceState, ResourceStatusValue } from '../src/types/doc-store';
const cfg = docStore.config;
function snap(st: Partial<Record<ResourceKey, ResourceStatusValue>>, tpl = 0): DocStoreSnapshot {
  const resources = {} as Record<ResourceKey, ResourceState>;
  cfg.order.forEach(k => { resources[k] = { key: k, status: st[k] ?? 'empty', file: k === 'plantillas' && st[k] === 'ready' ? { items: Array.from({ length: tpl }, (_, i) => ({ id: String(i) })) as never } : null, rowCount: 0, error: null, warnings: [], persisted: null, origin: null, updatedAt: null }; });
  return { resources, order: cfg.order, hydrated: true, profile: null };
}
describe('statusOf (reglas de las pestañas)', () => {
  it('Recursos pendiente', () => expect(statusOf('recursos', snap({}), cfg)).toEqual({ state: 'pend', text: '0 de 3 recursos listos' }));
  it('Recursos ok', () => expect(statusOf('recursos', snap({ sac: 'ready', plantillas: 'ready' }, 2), cfg)).toEqual({ state: 'ok', text: '2 de 3 recursos listos' }));
  it('Recursos busy', () => expect(statusOf('recursos', snap({ sac: 'processing' }), cfg).state).toBe('busy'));
  it('Recursos error', () => expect(statusOf('recursos', snap({ sac: 'error' }), cfg)).toEqual({ state: 'err', text: 'Revisa un archivo' }));
  it('Cuadro al día / parcial / vacío / error', () => {
    expect(statusOf('cuadro', snap({ sac: 'ready', mercurio: 'ready' }), cfg).text).toBe('Datos al día');
    expect(statusOf('cuadro', snap({ sac: 'ready' }), cfg).text).toBe('Datos parciales');
    expect(statusOf('cuadro', snap({}), cfg).text).toBe('Sin datos cargados');
    expect(statusOf('cuadro', snap({ mercurio: 'error' }), cfg)).toEqual({ state: 'err', text: 'Revisa en Recursos' });
  });
  it('Documentos singular/plural/vacío', () => {
    expect(statusOf('documentos', snap({ plantillas: 'ready' }, 1), cfg).text).toBe('1 plantilla lista');
    expect(statusOf('documentos', snap({ plantillas: 'ready' }, 2), cfg).text).toBe('2 plantillas listas');
    expect(statusOf('documentos', snap({}), cfg).text).toBe('Sin plantillas cargadas');
  });
});
