import { describe, expect, it } from 'vitest';
import { docStore } from '../src/repositories';
import type { ResourceKey } from '../src/types/doc-store';
import golden from './fixtures/golden-original.json';
describe('DocStore (contrato y validaciones idénticos al original)', () => {
  it('la configuración de recursos y módulos no cambió', () => { expect(JSON.parse(JSON.stringify(docStore.config))).toEqual(golden.cfg); });
  golden.vcases.forEach(([key, files], i) => it(`validate #${i} ${key}`, () => {
    const r = docStore.validate(key as ResourceKey, files as unknown as File[]);
    expect({ ok: r.ok, error: r.error ?? null, n: r.files ? r.files.length : null }).toEqual(golden.val[i]);
  }));
  it('estado inicial: recursos vacíos y snapshot inmutable', () => {
    const s = docStore.getState();
    expect(s.order).toEqual(['sac', 'plantillas', 'mercurio']); expect(s.order.map(k => s.resources[k].status)).toEqual(['empty', 'empty', 'empty']);
    expect(Object.isFrozen(s)).toBe(true); expect(docStore.getTemplates()).toEqual([]);
  });
  it('subscribe notifica el estado inicial y permite cancelar', () => { let n = 0; const off = docStore.subscribe(() => { n++; }); expect(n).toBe(1); off(); });
  it('perfil: setProfile/getProfile persistido vía DataRepository', () => {
    expect(docStore.getProfile()).toBeNull(); docStore.setProfile({ nombre: 'Ana' });
    expect(docStore.getProfile()).toEqual({ nombre: 'Ana' }); expect(JSON.parse(localStorage.getItem('essa-perfil') as string)).toEqual({ nombre: 'Ana' });
    docStore.setProfile(null); expect(docStore.getProfile()).toBeNull();
  });
});
