export function initTheme() {
  try {
    const KEYS = ['essa-theme', 'essa_cm_theme', 'extractor-theme-v1'];
    const root = document.documentElement;
    const btn = document.getElementById('btnTheme');
    if (!btn) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const sysDark = matchMedia('(prefers-color-scheme: dark)');
    const hasVT = typeof document.startViewTransition === 'function';
    const maskOK = !!(window.CSS && CSS.supports && 'registerProperty' in CSS &&
      (CSS.supports('mask-image', 'radial-gradient(circle at 0 0,#000,transparent)') || CSS.supports('-webkit-mask-image', 'radial-gradient(circle at 0 0,#000,transparent)')));
    const PAGE = { light: '#F8FAFC', dark: '#11151D' };
    const EASE = 'cubic-bezier(.65,.02,.25,1)';
    let busy = false;

    const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');
    const stored = () => {
      try { for (const k of KEYS) { const t = localStorage.getItem(k); if (t === 'dark' || t === 'light') return t; } } catch (e) { }
      return null;
    };
    const save = t => { try { for (const k of KEYS) localStorage.setItem(k, t); } catch (e) { } };

    function paint(t) {
      root.dataset.theme = t;
      const dark = t === 'dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      const label = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
      btn.setAttribute('aria-label', label); btn.title = label;
      let m = document.querySelector('meta[name="theme-color"]');
      if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
      m.content = PAGE[t];
    }

    function reveal(el, pseudo, x, y, R, dur) {
      const opts = { duration: dur, easing: EASE, fill: 'both' };
      if (pseudo) opts.pseudoElement = pseudo;
      if (maskOK) return el.animate({ '--tr': ['0px', R + 'px'] }, opts);
      return el.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] }, opts);
    }

    async function switchTo(next) {
      if (busy || next === current()) return;
      save(next);
      const r = btn.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      const R = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 100;
      if (reduce.matches) { paint(next); return; }
      busy = true;
      root.style.setProperty('--tx', x + 'px'); root.style.setProperty('--ty', y + 'px');
      btn.classList.add('spin');
      const done = () => { busy = false; root.classList.remove('th-clip', 'th-fade'); root.style.removeProperty('--tx'); root.style.removeProperty('--ty'); btn.classList.remove('spin'); };

      if (hasVT) {
        if (!maskOK) root.classList.add('th-clip');
        const vt = document.startViewTransition(() => paint(next));
        vt.ready.then(() => {
          const dur = 1050;
          reveal(root, '::view-transition-new(root)', x, y, R, dur);
          root.animate({ filter: ['saturate(1) brightness(1)', next === 'dark' ? 'saturate(.6) brightness(.78)' : 'saturate(.7) brightness(1.12)'] },
            { duration: dur, easing: EASE, fill: 'both', pseudoElement: '::view-transition-old(root)' });
        }).catch(() => { });
        vt.finished.then(done, done);
        return;
      }

      const wipe = document.createElement('div');
      wipe.className = 'th-wipe';
      wipe.style.setProperty('--tx', x + 'px'); wipe.style.setProperty('--ty', y + 'px');
      wipe.style.background = next === 'dark'
        ? 'radial-gradient(900px 600px at 10% 0%,#1B2F66,transparent 65%),#11151D'
        : 'radial-gradient(900px 600px at 10% 0%,#FFFFFF,transparent 65%),#F8FAFC';
      document.body.appendChild(wipe);
      const grow = reveal(wipe, null, x, y, R, 760);
      setTimeout(() => { root.classList.add('th-fade'); paint(next); }, 430);
      grow.finished.then(() => wipe.animate({ opacity: [1, 0] }, { duration: 420, easing: 'ease', fill: 'forwards' }).finished)
        .catch(() => { }).then(() => { wipe.remove(); setTimeout(done, 250); });
    }

    paint(current());
    btn.addEventListener('click', () => switchTo(current() === 'dark' ? 'light' : 'dark'));
    const onSys = e => { if (!stored() && !busy) paint(e.matches ? 'dark' : 'light'); };
    sysDark.addEventListener ? sysDark.addEventListener('change', onSys) : sysDark.addListener(onSys);
    window.addEventListener('storage', e => {
      if (e.key && KEYS.indexOf(e.key) < 0) return;
      const t = e.key ? (e.newValue === 'dark' || e.newValue === 'light' ? e.newValue : null) : stored();
      if (t && t !== current() && !busy) paint(t);
    });
  } catch (e) { }
}
