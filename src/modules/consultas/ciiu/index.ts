import './ciiu.css';
import { initCiiu } from './consulta.js';
import { initCiiuTema } from './selector-tema.js';

let inicializado = false;
let ciiuInstance: any = null;

export function initCiiuModule(rootEl?: HTMLElement | null): any {
  const root = rootEl || document.getElementById('viewCiiu');
  if (!root) return null;

  if (inicializado) {
    if (ciiuInstance && ciiuInstance.focus) {
      ciiuInstance.focus();
    }
    return ciiuInstance;
  }

  initCiiuTema(root);
  ciiuInstance = initCiiu(root);
  inicializado = true;
  return ciiuInstance;
}
