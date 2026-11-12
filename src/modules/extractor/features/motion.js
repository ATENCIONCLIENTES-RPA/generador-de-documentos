export function initMotion() {
  try {
    const q = (s, r = document) => r.querySelector(s);
    const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const pulse = (el, cls, ms) => {
      if (!el || reduce.matches) return;
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), ms || 800);
    };

    const res = q('#resBody');
    let prevVals = new Map(), prevObs = '', hadGroups = false;
    const scanResults = () => {
      const groups = q('.groups', res);
      const vals = new Map(qa('.li[data-ref]', res).map(li => [li.dataset.ref, (q('.v', li) || {}).textContent || '']));
      if (groups && !hadGroups && !reduce.matches) {
        groups.classList.add('enter');
        qa('.li', groups).forEach((li, i) => li.style.setProperty('--d', Math.min(i, 16) * 26 + 'ms'));
      } else if (groups) {
        vals.forEach((v, k) => { if (prevVals.has(k) && prevVals.get(k) !== v) pulse(q('.li[data-ref="' + k + '"]', res), 'chg', 950); });
      }
      const ot = (q('#obsText') || {}).textContent || '';
      if (ot && prevObs && ot !== prevObs) pulse(q('#obsBox'), 'swap', 700);
      hadGroups = !!groups; prevVals = vals; prevObs = ot;
      syncJump();
    };

    const inv = q('#invBody'); let prevInv = new Map();
    const scanInvoice = () => {
      const cur = new Map(qa('input[data-k],select[data-k]', inv).map(e => [e.dataset.k, e.value]));
      const act = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
      cur.forEach((v, k) => { if (v && !prevInv.get(k) && prevInv.size && act !== k) pulse(q('.frow[data-row="' + k + '"]', inv), 'filled', 1000); });
      prevInv = cur;
    };

    const jump = q('#jump'), hRes = q('#hRes'); let resVisible = false;
    function syncJump() {
      if (!jump) return;
      const chip = q('#obsBox .obs-h .chip');
      jump.textContent = chip ? 'Ver resultado · ' + chip.textContent.trim() : 'Ver resultado';
      jump.classList.toggle('on', !!q('#obsBox') && !resVisible);
    }
    if (jump && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => { resVisible = es.some(e => e.isIntersecting); syncJump(); }, { threshold: 0.15 }).observe(q('#resBody'));
    }

    new MutationObserver(scanResults).observe(res, { childList: true });
    new MutationObserver(scanInvoice).observe(inv, { childList: true });
    scanResults(); scanInvoice();
  } catch (e) { }
}
