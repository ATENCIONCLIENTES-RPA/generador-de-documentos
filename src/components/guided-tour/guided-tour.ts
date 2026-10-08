// @ts-nocheck — componente legado extraído sin cambios de lógica (tipado estricto previsto para la fase 2).
/* Antes: <script> inyectado en los 3 módulos (copia idéntica); ahora un único archivo. Se conserva window.GuidedTour por compatibilidad. */
/* =====================================================================
   Asistente Documental · Guía rápida (motor compartido)

   Un único componente para los 3 módulos: cada módulo solo aporta su
   propio arreglo de pasos (selector o función `resolve`, icono, título
   y texto) y llama a `GuidedTour.mount(steps)` desde su propio documento.
   Toda la lógica de posicionamiento, overlay, navegación, teclado y
   accesibilidad vive aquí UNA sola vez; nada se duplica entre módulos.

   Cada módulo corre en su propio iframe (su propio `window`), así que
   este componente es, en la práctica, una instancia independiente por
   módulo: no hay estado compartido entre las guías de distintos módulos.
   ===================================================================== */

  /* Catálogo de íconos (trazos SVG) disponible para los pasos de cualquier módulo */
  const ICN = {
    wave:     '<path d="M8 12h.01M12 12h.01M16 12h.01"/><circle cx="12" cy="12" r="9.5"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    user:     '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>',
    list:     '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/>',
    switch:   '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m9 9 3 3-3 3M15 9v6"/>',
    doc:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    edit:     '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    check:    '<path d="M20 6 9 17l-5-5"/>',
    folder:   '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    upload:   '<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    board:    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    arrow:    '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };

  let mounted = false, tStep = 0, steps = [], els = {}, onFinish = null;

  function buildOverlay() {
    if (document.getElementById('tourOverlay')) { cacheEls(); return; }
    const host = document.createElement('div');
    host.innerHTML =
      '<div id="tourOverlay">' +
        '<div class="tour-highlight" id="tourHighlight"></div>' +
        '<div class="tour-tooltip" id="tourTooltip">' +
          '<span class="tour-arrow" id="tourArrow"></span>' +
          '<div class="tour-head">' +
            '<span class="tour-ic" id="tourIc"></span>' +
            '<span class="tour-step-count" id="tourCount"></span>' +
          '</div>' +
          '<div class="tour-title" id="tourTitle"></div>' +
          '<div class="tour-text" id="tourText"></div>' +
          '<div class="tour-foot">' +
            '<button type="button" class="tour-skip" id="tourSkip">Saltar guía</button>' +
            '<div class="tour-dots" id="tourDots"></div>' +
            '<div class="tour-nav">' +
              '<button type="button" class="tour-btn back" id="tourBack">Atrás</button>' +
              '<button type="button" class="tour-btn next" id="tourNext">Siguiente</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(host.firstElementChild);
    cacheEls();
  }
  function cacheEls() {
    els = {
      overlay: document.getElementById('tourOverlay'), hl: document.getElementById('tourHighlight'),
      tip: document.getElementById('tourTooltip'), ic: document.getElementById('tourIc'),
      count: document.getElementById('tourCount'), title: document.getElementById('tourTitle'),
      text: document.getElementById('tourText'), dots: document.getElementById('tourDots'),
      back: document.getElementById('tourBack'), next: document.getElementById('tourNext'),
      skip: document.getElementById('tourSkip'), arrow: document.getElementById('tourArrow')
    };
  }

  /* Espera a que el navegador termine cualquier scroll/layout pendiente antes de medir */
  function settle(cb) {
    let last = -1, stable = 0;
    (function check() {
      const y = window.scrollY;
      if (Math.abs(y - last) < 0.5) stable++; else stable = 0;
      last = y;
      if (stable >= 2) cb(); else requestAnimationFrame(check);
    })();
  }

  function resolveTarget(step) {
    if (typeof step.resolve === 'function') { try { return step.resolve(); } catch (e) { return null; } }
    return step.sel ? document.querySelector(step.sel) : null;
  }

  function positionTour() {
    const step = steps[tStep];
    const target = resolveTarget(step);
    if (!target || !target.getClientRects().length) { tStep++; if (tStep < steps.length) renderStep(); else endTour(); return; }

    /* Si el elemento está dentro de un panel colapsable cerrado, lo abrimos para resaltarlo bien */
    const parentPanel = target.closest('.panel');
    if (parentPanel && parentPanel.classList.contains('collapsed')) parentPanel.classList.remove('collapsed');

    const pre = target.getBoundingClientRect();
    const tall = pre.height > window.innerHeight * 0.6;
    const desiredScroll = tall ? window.scrollY + pre.top - 90 : window.scrollY + pre.top - (window.innerHeight / 2 - pre.height / 2);
    const sc = target.closest('.doc-stage,[data-tour-scroll]'); if (sc && tall) sc.scrollTop = 0;
    window.scrollTo({ top: Math.max(0, desiredScroll), left: 0, behavior: 'auto' });

    settle(() => {
      const r = target.getBoundingClientRect();
      const pad = 8;
      const vTop = Math.max(r.top, 4), vBottom = Math.min(r.bottom, window.innerHeight - 4);
      const vLeft = Math.max(r.left, 4), vRight = Math.min(r.right, window.innerWidth - 4);
      const hlTop = vTop - pad, hlLeft = vLeft - pad;
      const hlW = (vRight - vLeft) + pad * 2, hlH = (vBottom - vTop) + pad * 2;

      els.hl.style.top = hlTop + 'px'; els.hl.style.left = hlLeft + 'px';
      els.hl.style.width = hlW + 'px'; els.hl.style.height = hlH + 'px';

      const tipW = 328, margin = 16, tipEstH = 220;
      let top, left, arrowSide;
      const spaceBelow = window.innerHeight - (hlTop + hlH), spaceAbove = hlTop;
      const spaceRight = window.innerWidth - (hlLeft + hlW), spaceLeft = hlLeft;
      const need = tipEstH + 24;
      if (spaceBelow >= need) { top = hlTop + hlH + 14; arrowSide = 'top'; }
      else if (spaceAbove >= need) { top = hlTop - 14 - tipEstH; arrowSide = 'bottom'; }
      else if (spaceRight >= tipW + 30) { left = hlLeft + hlW + 16; arrowSide = 'left'; }
      else if (spaceLeft >= tipW + 30) { left = hlLeft - 16 - tipW; arrowSide = 'right'; }
      else { arrowSide = 'none'; top = hlTop + hlH - tipEstH - 20; left = hlLeft + hlW - tipW - 20; }

      if (arrowSide === 'left' || arrowSide === 'right') {
        top = Math.max(hlTop + 20, Math.min(hlTop + hlH / 2 - tipEstH / 2, window.innerHeight - tipEstH - margin));
      } else if (arrowSide !== 'none') {
        left = hlLeft + hlW / 2 - tipW / 2;
      }
      left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - margin - tipEstH));

      els.tip.style.left = left + 'px'; els.tip.style.top = top + 'px'; els.tip.style.width = tipW + 'px';
      els.arrow.style.display = arrowSide === 'none' ? 'none' : '';
      els.arrow.style.top = els.arrow.style.bottom = els.arrow.style.left = els.arrow.style.right = '';
      if (arrowSide === 'top' || arrowSide === 'bottom') {
        els.arrow.style.left = Math.max(20, Math.min(hlLeft + hlW / 2 - left - 7, tipW - 34)) + 'px';
        els.arrow.style[arrowSide] = '-7px';
      } else if (arrowSide === 'left' || arrowSide === 'right') {
        els.arrow.style.top = '34px'; els.arrow.style[arrowSide] = '-7px';
      }
      els.tip.classList.add('show');
    });
  }

  function renderStep() {
    els.tip.classList.remove('show');
    const step = steps[tStep];
    els.ic.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (step.ic || ICN.check) + '</svg>';
    els.count.textContent = (tStep + 1) + ' / ' + steps.length;
    els.title.textContent = step.title;
    els.text.textContent = step.text;
    [...els.dots.children].forEach((d, i) => d.classList.toggle('on', i === tStep));
    els.back.style.visibility = tStep === 0 ? 'hidden' : 'visible';
    els.next.textContent = tStep === steps.length - 1 ? 'Finalizar' : 'Siguiente';
    positionTour();
  }

  function startTour() {
    if (!steps.length) return;
    tStep = 0;
    els.overlay.classList.add('open');
    document.querySelectorAll('.pulse-dot').forEach(p => { p.style.display = 'none'; });
    renderStep();
  }
  function endTour() {
    if (!els.overlay) return;
    els.overlay.classList.remove('open');
    els.tip.classList.remove('show');
    if (typeof onFinish === 'function') onFinish();
  }

  /* API pública: cada módulo llama a esto una sola vez con sus propios pasos.
     steps: [{ sel?, resolve?, ic, title, text }]  (sel o resolve: al menos uno) */
  function mount(stepList, opts) {
    opts = opts || {};
    steps = stepList || [];
    onFinish = opts.onFinish || null;
    buildOverlay();
    els.dots.innerHTML = steps.map((_, i) => '<span data-i="' + i + '"></span>').join('');

    if (!mounted) {
      mounted = true;
      els.skip.addEventListener('click', endTour);
      els.next.addEventListener('click', () => { if (tStep === steps.length - 1) { endTour(); return; } tStep++; renderStep(); });
      els.back.addEventListener('click', () => { if (tStep > 0) { tStep--; renderStep(); } });
      window.addEventListener('resize', () => { if (els.overlay.classList.contains('open')) positionTour(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && els.overlay.classList.contains('open')) endTour(); });
    }
    const triggerSel = opts.triggerSelector || '#btnGuide, [data-guide-trigger]';
    document.querySelectorAll(triggerSel).forEach(btn => btn.addEventListener('click', startTour));
    return Object.freeze({ start: startTour, end: endTour });
  }

export const GuidedTour = Object.freeze({ mount, ICN });
if (typeof window !== 'undefined') (window as any).GuidedTour = GuidedTour;
