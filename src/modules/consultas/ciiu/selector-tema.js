
/* ==========================================================================
   TEMA · controlador del selector (claro / automático / oscuro)
   · La preferencia se guarda en localStorage («ciiu.theme»); el estado inicial
     ya fue aplicado por el script del <head>, así que aquí solo se sincroniza.
   · En «auto» se escucha prefers-color-scheme y se reacciona en vivo.
   · El cambio usa View Transitions (revelado circular) cuando el navegador lo
     soporta y el usuario no pidió reducir el movimiento; si no, es instantáneo.
   ========================================================================== */
export function initCiiuTema(rootEl) {
  'use strict';
  if (!window.__ciiuTheme) {
    const K = "ciiu.theme";
    window.__ciiuTheme = {
      key: K,
      read: () => localStorage.getItem(K) || document.documentElement.getAttribute('data-theme') || 'light',
      resolve: (p) => p === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p,
      paint: (p) => {
        const r = p === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p;
        document.documentElement.setAttribute('data-theme', r);
        document.documentElement.setAttribute('data-theme-pref', p);
        return r;
      },
      mq: matchMedia('(prefers-color-scheme: dark)')
    };
  }
  const T = window.__ciiuTheme;
  const rootContainer = rootEl || document.getElementById('viewCiiu') || document;
  const sw = rootContainer.querySelector('#tsw');
  if (!T || !sw) return;
  const root = document.documentElement, live = rootContainer.querySelector('#live');
  const btns = Array.from(sw.querySelectorAll('[role="radio"]'));
  const ORDER = btns.map(b => b.dataset.v);
  const SAID = { light: 'Tema claro activado', dark: 'Tema oscuro activado', auto: 'Tema automático activado: sigue la preferencia del sistema' };
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  let pref = T.read();

  function syncUI() {
    btns.forEach(b => {
      const on = b.dataset.v === pref;
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
    });
  }

  /* Ejecuta `fn` (que aplica el tema) con transición si procede. `o` = {x,y} origen del revelado. */
  function swap(fn, o) {
    if (typeof document.startViewTransition !== 'function' || rm.matches) { fn(); return; }
    if (o) root.classList.add('vt-reveal');
    let vt;
    try { vt = document.startViewTransition(fn); } catch (e) { root.classList.remove('vt-reveal'); fn(); return; }
    const done = () => root.classList.remove('vt-reveal');
    vt.finished.then(done, done);
    if (o) {
      vt.ready.then(() => {
        const r = Math.hypot(Math.max(o.x, innerWidth - o.x), Math.max(o.y, innerHeight - o.y));
        root.animate(
          { clipPath: [`circle(0px at ${o.x}px ${o.y}px)`, `circle(${r}px at ${o.x}px ${o.y}px)`] },
          { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }, () => {});
    }
  }

  function choose(next, origin) {
    if (!ORDER.includes(next)) return;
    const changesLook = T.resolve(next) !== root.getAttribute('data-theme');
    pref = next;
    try { localStorage.setItem(T.key, next); } catch (e) { /* almacenamiento bloqueado: se mantiene en memoria */ }
    /* El selector responde al instante; el repintado del tema va dentro de la transición. */
    root.setAttribute('data-theme-pref', next); syncUI();
    const apply = () => T.paint(next);
    if (changesLook) swap(apply, origin); else apply();
    if (live) live.textContent = SAID[next];
  }

  const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  btns.forEach(b => b.addEventListener('click', () => choose(b.dataset.v, centerOf(b))));

  /* Teclado: patrón radiogroup (flechas, Inicio, Fin) */
  sw.addEventListener('keydown', e => {
    const i = ORDER.indexOf(pref); let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % ORDER.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + ORDER.length) % ORDER.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ORDER.length - 1;
    if (n < 0) return;
    e.preventDefault(); choose(ORDER[n], centerOf(btns[n])); btns[n].focus();
  });

  /* Preferencia del sistema operativo (solo importa en «auto») */
  const onSystem = () => {
    if (pref !== 'auto') return;
    if (T.resolve('auto') !== root.getAttribute('data-theme')) swap(() => T.paint('auto'));
  };
  if (T.mq) { T.mq.addEventListener ? T.mq.addEventListener('change', onSystem) : T.mq.addListener(onSystem); }

  /* Sincroniza otras pestañas y la restauración desde caché (botón «atrás») */
  const resync = () => { pref = T.read(); T.paint(pref); syncUI(); };
  addEventListener('storage', e => { if (e.key === T.key || e.key === null) resync(); });
  addEventListener('pageshow', e => { if (e.persisted) resync(); });

  syncUI();
}
