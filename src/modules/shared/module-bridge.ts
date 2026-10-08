/**
 * Puente de módulo: expone window.AD (API del shell) y marca el documento como integrado.
 * Si el iframe carga desde caché antes de que el shell asigne window.AsistenteDocumental,
 * reintenta hasta 2 s para garantizar que el módulo siempre reciba la API correcta.
 */
import type { AsistenteDocumentalApi } from '../../types/ad';
import type { ModuleId } from '../../types/doc-store';

function resolveAD(): AsistenteDocumentalApi | null {
  try { return (window.parent !== window && (window.parent as any).AsistenteDocumental) || null; } catch { return null; }
}

let AD: AsistenteDocumentalApi | null = resolveAD();

function applyAD(api: AsistenteDocumentalApi): void {
  window.AD = api;
  const root = document.documentElement;
  root.classList.add('ad-embedded');
  try { root.setAttribute('data-theme', api.theme.get()); } catch { /* tema por defecto */ }
}

if (AD) {
  applyAD(AD);
} else {
  /* El iframe puede cargar desde caché antes de que el shell asigne la API: reintentamos. */
  window.AD = null;
  let attempts = 0;
  const MAX = 20, INTERVAL = 100; // hasta 2 s
  const poll = setInterval(() => {
    const api = resolveAD();
    if (api) { clearInterval(poll); AD = api; applyAD(api); return; }
    if (++attempts >= MAX) clearInterval(poll);
  }, INTERVAL);
}

/* Navegación declarativa: cualquier elemento con data-ad-nav="recursos|cuadro|documentos" */
document.addEventListener('click', e => {
  const t = e.target && (e.target as Element).closest ? (e.target as Element).closest('[data-ad-nav]') : null; if (!t) return;
  e.preventDefault(); e.stopPropagation(); if (AD) void AD.navigate(t.getAttribute('data-ad-nav') as ModuleId);
}, true);

/* Alt+1/2/3 cambia de módulo aunque el foco esté dentro de este módulo */
document.addEventListener('keydown', e => {
  if (!AD || !e.altKey || e.ctrlKey || !/^[1-9]$/.test(e.key)) return;
  const mods = AD.store.config.modules, ids = (Object.keys(mods) as ModuleId[]).sort((a, b) => mods[a].index - mods[b].index);
  if (ids[+e.key - 1]) { e.preventDefault(); void AD.navigate(ids[+e.key - 1]); }
});

if (!AD) {
  document.addEventListener('DOMContentLoaded', () => {
    /* Solo muestra el aviso si tras 2 s la API sigue sin llegar (modulo abierto fuera del shell) */
    setTimeout(() => {
      if (window.AD) return;
      const n = document.createElement('div'); n.setAttribute('role', 'alert');
      n.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:99999;padding:10px 16px;border-radius:12px;background:#FBE7E8;color:#A01119;border:1px solid #F3C3C7;font:600 13px Segoe UI,Arial,sans-serif;box-shadow:0 10px 30px -12px rgba(0,0,0,.3)';
      n.textContent = 'Este modulo forma parte del Asistente Documental. Abrelo desde el servidor local para usar los archivos cargados.';
      document.body.appendChild(n);
    }, 2100);
  });
}
export {};

