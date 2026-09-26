import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadNotas,
  upsertNota,
  deleteNota,
  notasDe,
  mismaRadicado,
  formatNotaFecha,
} from '../dashboardNotas';

const LS_KEY = 'essa-dashboard-notas';

describe('dashboardNotas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadNotas devuelve lista vacía sin nada guardado', () => {
    expect(loadNotas()).toEqual([]);
  });

  it('upsertNota crea, persiste y loadNotas la recupera', () => {
    upsertNota({ texto: 'Llamar al solicitante', radicado: '900001' });

    const notas = loadNotas();
    expect(notas).toHaveLength(1);
    expect(notas[0]!.texto).toBe('Llamar al solicitante');
    expect(notas[0]!.radicado).toBe('900001');
    expect(notas[0]!.creadaEn).toBeTruthy();

    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    expect(raw).toHaveLength(1);
  });

  it('sin radicado queda como nota general', () => {
    upsertNota({ texto: 'Nota general del día' });
    expect(loadNotas()[0]!.radicado).toBe('');
  });

  it('edita por id conservando creadaEn', () => {
    const creada = upsertNota({ texto: 'Original' })[0]!;
    const tras = upsertNota({ id: creada.id, texto: 'Editada', radicado: '900004' });

    expect(tras).toHaveLength(1);
    expect(tras[0]!.id).toBe(creada.id);
    expect(tras[0]!.texto).toBe('Editada');
    expect(tras[0]!.radicado).toBe('900004');
    expect(tras[0]!.creadaEn).toBe(creada.creadaEn);
    expect(loadNotas()).toHaveLength(1);
  });

  it('texto vacío o de solo espacios no guarda nada', () => {
    upsertNota({ texto: '   ' });
    expect(loadNotas()).toEqual([]);
    upsertNota({ texto: '' });
    expect(loadNotas()).toEqual([]);
  });

  it('deleteNota elimina solo esa nota', () => {
    const a = upsertNota({ texto: 'A' })[0]!;
    upsertNota({ texto: 'B' });
    expect(deleteNota(a.id)).toHaveLength(1);
    expect(loadNotas().map((n) => n.texto)).toEqual(['B']);
    deleteNota('inexistente');
    expect(loadNotas()).toHaveLength(1);
  });

  it('ignora entradas corruptas o incompletas', () => {
    localStorage.setItem(LS_KEY, 'no-json{{{');
    expect(loadNotas()).toEqual([]);

    localStorage.setItem(LS_KEY, '{"no":"es-array"}');
    expect(loadNotas()).toEqual([]);

    localStorage.setItem(
      LS_KEY,
      JSON.stringify([
        { texto: 'Válida', radicado: '900001', creadaEn: '2026-09-01T10:00:00.000Z' },
        { radicado: '900002' },
        'cadena',
        null,
        { texto: 'Otra', id: 'n_x' },
      ])
    );
    const notas = loadNotas();
    // Las más recientes primero ('Otra' se creó ahora, 'Válida' está fechada)
    expect(notas.map((n) => n.texto)).toEqual(['Otra', 'Válida']);
    expect(notas.every((n) => n.creadaEn)).toBe(true);
  });

  it('mismaRadicado compara con independencia del formato', () => {
    expect(mismaRadicado('900001', '900001')).toBe(true);
    expect(mismaRadicado('RAD 900001', '900001')).toBe(true);
    expect(mismaRadicado('900001', '900002')).toBe(false);
    expect(mismaRadicado('', '900001')).toBe(false);
    expect(mismaRadicado('—', '—')).toBe(false);
  });

  it('notasDe devuelve solo las del radicado (no las generales)', () => {
    upsertNota({ texto: 'Del radicado', radicado: '900001' });
    upsertNota({ texto: 'General' });
    const notas = loadNotas();

    expect(notasDe(notas, '900001').map((n) => n.texto)).toEqual(['Del radicado']);
    expect(notasDe(notas, '900002')).toEqual([]);
  });

  it('formatNotaFecha formatea dd/mm/aaaa · hh:mm', () => {
    const iso = new Date(2026, 8, 25, 9, 5).toISOString();
    expect(formatNotaFecha(iso)).toBe('25/09/2026 · 09:05');
    expect(formatNotaFecha('no-fecha')).toBe('');
  });
});
