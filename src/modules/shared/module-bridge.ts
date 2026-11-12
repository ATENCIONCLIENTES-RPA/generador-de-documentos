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
  try { root.setAttribute('data-theme', api.theme.get()); } catch { }
}

if (AD) {
  applyAD(AD);
} else {
  window.AD = null;
  let elapsed = 0;
  const MAX_MS = 2000;
  function retry(delay: number): void {
    if (elapsed >= MAX_MS) return;
    setTimeout(() => {
      elapsed += delay;
      const api = resolveAD();
      if (api) { AD = api; applyAD(api); return; }
      retry(Math.min(delay * 2, 400));
    }, delay);
  }
  requestAnimationFrame(() => {
    const api = resolveAD();
    if (api) { AD = api; applyAD(api); return; }
    retry(50);
  });
}

document.addEventListener('click', e => {
  const t = e.target && (e.target as Element).closest ? (e.target as Element).closest('[data-ad-nav]') : null; if (!t) return;
  e.preventDefault(); e.stopPropagation(); if (AD) void AD.navigate(t.getAttribute('data-ad-nav') as ModuleId);
}, true);

document.addEventListener('keydown', e => {
  if (!AD || !e.altKey || e.ctrlKey || !/^[1-9]$/.test(e.key)) return;
  const mods = AD.store.config.modules, ids = (Object.keys(mods) as ModuleId[]).sort((a, b) => mods[a].index - mods[b].index);
  if (ids[+e.key - 1]) { e.preventDefault(); void AD.navigate(ids[+e.key - 1]); }
});

if (!AD) {
  document.addEventListener('DOMContentLoaded', () => {
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

