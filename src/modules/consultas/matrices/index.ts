import './matrices.css';
import { asegurarDatosMatrices } from './data/init-datos';

let inicializado = false;

export async function initMatricesModule(rootEl?: HTMLElement | null): Promise<void> {
  const root = rootEl || document.getElementById('viewMatrices');
  if (!root) return;

  if (inicializado) {
    const qInput = root.querySelector<HTMLInputElement>('#q');
    if (qInput) qInput.focus({ preventScroll: true });
    return;
  }

  // Asegurar que los scripts y datos globales de matrices existan antes de ejecutar los módulos
  asegurarDatosMatrices();

  // Importar en el orden original de ejecución
  await import('./modules/colores-hoja.js');
  await import('./modules/datos-imagenes.js');
  await import('./modules/matriz-requisitos.js');
  await import('./modules/arbol-transacciones.js');
  await import('./modules/lector-excel.js');
  await import('./modules/actualizacion-versiones.js');
  await import('./modules/experiencia.js');
  await import('./modules/selector-consultas.js');
  await import('./modules/tooltips.js');
  await import('./modules/selector-tema.js');
  await import('./modules/croma.js');

  inicializado = true;

  const qInput = root.querySelector<HTMLInputElement>('#q');
  if (qInput) qInput.focus({ preventScroll: true });
}
