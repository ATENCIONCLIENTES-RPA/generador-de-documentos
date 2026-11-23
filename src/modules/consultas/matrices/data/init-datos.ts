import dataMatrizRaw from './DATA_MATRIZ.txt?raw';
import dataInfogenRaw from './DATA_INFOGEN.txt?raw';
import dataArbolRaw from './DATA_ARBOL.txt?raw';
import dataImgreqRaw from './DATA_IMGREQ.txt?raw';
import dataImggenKeysRaw from './DATA_IMGGEN_KEYS.txt?raw';
import dataImggenRaw from './DATA_IMGGEN.txt?raw';

export function asegurarDatosMatrices(): void {
  if (typeof window === 'undefined') return;

  const inyectar = (id: string, type: string, raw: string): void => {
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      if (type) el.type = type;
      el.textContent = raw;
      document.body.appendChild(el);
    }
  };

  inyectar('DATA_MATRIZ', '', dataMatrizRaw);
  inyectar('DATA_INFOGEN', '', dataInfogenRaw);
  inyectar('DATA_ARBOL', '', dataArbolRaw);
  inyectar('DATA_IMGREQ', '', dataImgreqRaw);
  inyectar('DATA_IMGGEN_KEYS', 'application/json', dataImggenKeysRaw);
  inyectar('DATA_IMGGEN', 'text/plain', dataImggenRaw);

  // Asegura que window.MATRIZ, INFOGEN y ARBOL estén expuestos globalmente
  const w = window as any;
  if (!w.MATRIZ) {
    try {
      const fn = new Function(dataMatrizRaw);
      fn();
    } catch (e) {
      console.warn('Error al evaluar DATA_MATRIZ:', e);
    }
  }
  if (!w.INFOGEN) {
    try {
      const fn = new Function(dataInfogenRaw);
      fn();
    } catch (e) {
      console.warn('Error al evaluar DATA_INFOGEN:', e);
    }
  }
  if (!w.ARBOL) {
    try {
      const fn = new Function(dataArbolRaw);
      fn();
    } catch (e) {
      console.warn('Error al evaluar DATA_ARBOL:', e);
    }
  }
}
