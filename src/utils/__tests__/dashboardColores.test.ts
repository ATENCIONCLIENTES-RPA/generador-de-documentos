import { beforeEach, describe, expect, it } from 'vitest';
import { PALETA_COLORES, esColorPaleta, loadColores, saveColor } from '@/utils/dashboardColores';

const LS_KEY = 'essa-dashboard-colores';

describe('dashboardColores', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('expone exactamente cinco colores', () => {
    expect(PALETA_COLORES).toHaveLength(5);
    const hexes = PALETA_COLORES.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(5);
    for (const c of PALETA_COLORES) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.nombre.trim()).not.toBe('');
      expect(esColorPaleta(c.hex)).toBe(true);
    }
  });

  it('guarda, cambia y quita colores por registro', () => {
    expect(loadColores()).toEqual({});

    saveColor('R:900001', PALETA_COLORES[1].hex);
    expect(loadColores()).toEqual({ 'R:900001': PALETA_COLORES[1].hex });

    saveColor('R:900001', PALETA_COLORES[3].hex);
    saveColor('M:otro', PALETA_COLORES[0].hex);
    expect(loadColores()).toEqual({
      'R:900001': PALETA_COLORES[3].hex,
      'M:otro': PALETA_COLORES[0].hex,
    });

    saveColor('R:900001', null);
    expect(loadColores()).toEqual({ 'M:otro': PALETA_COLORES[0].hex });
    expect(JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')).toEqual({
      'M:otro': PALETA_COLORES[0].hex,
    });
  });

  it('ignora claves vacías y colores fuera de la paleta', () => {
    saveColor('  ', '#1565d8');
    saveColor('R:1', '#ff0000');
    expect(loadColores()).toEqual({});

    // Datos corruptos o manipulados en la caché se descartan al leer
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ 'R:1': '#123456', 'R:2': PALETA_COLORES[0].hex, '': '#1565d8', R3: 7 })
    );
    expect(loadColores()).toEqual({ 'R:2': PALETA_COLORES[0].hex });
  });

  it('sobrevive a JSON inválido y a un almacenamiento no disponible', () => {
    localStorage.setItem(LS_KEY, 'esto no es json');
    expect(loadColores()).toEqual({});

    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('cuota llena');
    };
    expect(() => saveColor('R:1', PALETA_COLORES[0].hex)).not.toThrow();
    Storage.prototype.setItem = original;
  });

  it('normaliza a las mayúsculas oficiales de la paleta', () => {
    saveColor('R:1', PALETA_COLORES[0].hex.toUpperCase());
    expect(loadColores()['R:1']).toBe(PALETA_COLORES[0].hex);
    expect(esColorPaleta(PALETA_COLORES[0].hex.toUpperCase())).toBe(true);
    expect(esColorPaleta(undefined)).toBe(false);
  });
});
