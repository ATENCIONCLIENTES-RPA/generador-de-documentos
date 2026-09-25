import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAjustes,
  saveAjuste,
  removeAjuste,
  parseIsoDate,
  toIsoDate,
} from '../dashboardAjustes';

describe('dashboardAjustes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadAjustes vacío sin nada guardado', () => {
    expect(loadAjustes()).toEqual({});
  });

  it('saveAjuste guarda y loadAjustes lo recupera', () => {
    saveAjuste('R:123', '2026-09-01');
    expect(loadAjustes()).toEqual({ 'R:123': '2026-09-01' });
    saveAjuste('R:456', '2026-09-02');
    expect(loadAjustes()).toEqual({ 'R:123': '2026-09-01', 'R:456': '2026-09-02' });
  });

  it('removeAjuste elimina solo esa clave', () => {
    saveAjuste('R:123', '2026-09-01');
    saveAjuste('R:456', '2026-09-02');
    removeAjuste('R:123');
    expect(loadAjustes()).toEqual({ 'R:456': '2026-09-02' });
  });

  it('ignora valores corruptos o fechas inválidas', () => {
    localStorage.setItem(
      'essa-dashboard-ajustes-correo',
      '{"A":"no-fecha","B":"2026-13-99","C":"2026-09-01"}'
    );
    expect(loadAjustes()).toEqual({ C: '2026-09-01' });
    localStorage.setItem('essa-dashboard-ajustes-correo', 'no-json{{{');
    expect(loadAjustes()).toEqual({});
  });

  it('parseIsoDate y toIsoDate son inversos', () => {
    const d = new Date(2026, 8, 4);
    expect(toIsoDate(d)).toBe('2026-09-04');
    const back = parseIsoDate('2026-09-04')!;
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(8);
    expect(back.getDate()).toBe(4);
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('04/09/2026')).toBeNull();
  });
});
