export function initGuide() {
  let openGuide = () => { };
  try {
    const $ = (s, r = document) => r.querySelector(s);
    const STEPS = [
      { icon: 'bolt', title: 'Te guío en un minuto',
        text: 'Para sacar el resultado solo hay <b>4 pasos</b>: subir la captura, escribir la cuenta y la meta, revisar los datos de la factura y leer el resultado. Puedes moverte con las flechas del teclado.' },
      { sel: 'section[aria-labelledby="hImg"]', pos: 'right', icon: 'image', title: '1 · Sube la captura de la factura',
        text: 'Arrastra la imagen, selecciónala o pégala con <b>Ctrl+V</b>. Luego pulsa <b>«Extraer datos»</b> y la app lee los valores por ti. Con <b>«Ver imagen y datos detectados»</b> compruebas de dónde salió cada dato.' },
      { sel: 'section.cmd', pos: 'bottom', icon: 'user', title: '2 · Escribe la cuenta y la meta',
        text: 'Pon el número de <b>cuenta</b> y la <b>meta</b>, y elige si es de todo el ciclo o por día. Pulsa <b>«Aplicar»</b> para consultar. Si te equivocas, <b>«Limpiar»</b> borra los campos.' },
      { sel: '#cardInv', pos: 'bottom', icon: 'receipt', title: '3 · Revisa los datos de la factura',
        text: 'Aquí aparece lo que se leyó de la imagen. Ábrelo con la flecha para <b>corregir</b> lo que no coincida o <b>llenarlo a mano</b> si no subiste imagen. Cuando todo esté bien, pulsa <b>«Confirmar datos»</b>.' },
      { sel: 'section[aria-labelledby="hRes"]', pos: 'left', icon: 'target', title: '4 · Lee el resultado',
        text: 'Aquí ves la <b>meta del periodo</b>, el <b>mínimo 90 %</b>, el <b>límite de 110 %</b> y el <b>tope de ahorro 30 %</b>. Los puntos de color junto a cada dato dicen de dónde viene (OCR, Corregido, Manual o Calculado): pasa el cursor y se despliegan.' },
      { sel: '#btnResetAll', pos: 'bottom', icon: 'reset', title: '¿Otro caso? Empieza de cero',
        text: 'Con <b>«Reiniciar»</b> se borran la cuenta, la imagen y los datos de la factura, y puedes arrancar un caso nuevo sin recargar la página.' },
      { icon: 'check', title: '¡Listo, ya puedes empezar!',
        text: 'Cuando quieras repasar el recorrido, vuelve a pulsar <b>«Guía rápida»</b> en el encabezado. Y si prefieres una pantalla más cómoda de noche, el botón del sol y la luna cambia entre <b>modo claro y oscuro</b>.' }
    ];
    const N = STEPS.length, M = 12, PAD = 8;
    let i = 0, active = false, opener = null, raf = 0, settle = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const ico = n => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;

    const block = document.createElement('div'); block.className = 'gt-block'; block.setAttribute('aria-hidden', 'true');
    const spot = document.createElement('div'); spot.className = 'gt-spot none'; spot.style.display = 'none';
    const pop = document.createElement('div'); pop.className = 'gt-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true');
    pop.setAttribute('aria-labelledby', 'gtTitle'); pop.setAttribute('aria-describedby', 'gtText'); pop.style.display = 'none';
    pop.innerHTML = `<span class="gt-arrow"></span>
      <div class="gt-body" aria-live="polite">
        <div class="gt-head"><span class="gt-ic" id="gtIc"></span><span class="gt-count" id="gtCount"></span></div>
        <h3 class="gt-title" id="gtTitle"></h3><p class="gt-text" id="gtText"></p>
      </div>
      <div class="gt-foot">
        <button type="button" class="gt-skip" id="gtSkip">Saltar guía</button>
        <div class="gt-dots" id="gtDots"></div>
        <div class="gt-nav"><button type="button" class="gt-btn back" id="gtBack">Atrás</button><button type="button" class="gt-btn next" id="gtNext">Siguiente</button></div>
      </div>`;
    document.body.append(block, spot, pop);
    const arrow = $('.gt-arrow', pop), dots = $('#gtDots', pop), btnBack = $('#gtBack', pop), btnNext = $('#gtNext', pop);
    dots.innerHTML = STEPS.map((_, k) => `<button type="button" aria-label="Ir al paso ${k + 1}" data-k="${k}"></button>`).join('');

    const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));
    const target = () => { const s = STEPS[i], el = s.sel && $(s.sel); if (!el) return null; const r = el.getBoundingClientRect(); return r.width < 2 || r.height < 2 ? null : r; };

    function place() {
      if (!active) return;
      const vw = innerWidth, vh = innerHeight, pw = pop.offsetWidth, ph = pop.offsetHeight, r = target();
      if (!r) {
        spot.classList.add('none');
        spot.style.cssText = `display:block;left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`;
        pop.dataset.side = '';
        pop.style.left = Math.round((vw - pw) / 2) + 'px'; pop.style.top = Math.round((vh - ph) / 2) + 'px';
        return;
      }
      const x0 = Math.max(r.left, 0), y0 = Math.max(r.top, 0), x1 = Math.min(r.right, vw), y1 = Math.min(r.bottom, vh);
      spot.classList.remove('none');
      spot.style.cssText = `display:block;left:${x0 - PAD}px;top:${y0 - PAD}px;width:${x1 - x0 + PAD * 2}px;height:${y1 - y0 + PAD * 2}px`;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, gap = 18;
      const opts = {
        bottom: () => ({ x: clamp(cx - pw / 2, M, vw - pw - M), y: y1 + PAD + gap }),
        top: () => ({ x: clamp(cx - pw / 2, M, vw - pw - M), y: y0 - PAD - gap - ph }),
        right: () => ({ x: x1 + PAD + gap, y: clamp(cy - ph / 2, M, vh - ph - M) }),
        left: () => ({ x: x0 - PAD - gap - pw, y: clamp(cy - ph / 2, M, vh - ph - M) })
      };
      const fits = p => p.x >= M - 1 && p.y >= M - 1 && p.x + pw <= vw - M + 1 && p.y + ph <= vh - M + 1;
      const order = [STEPS[i].pos, 'bottom', 'top', 'right', 'left'].filter((v, k, a) => v && a.indexOf(v) === k);
      let side = '', pos = null;
      for (const s of order) { const p = opts[s](); if (fits(p)) { side = s; pos = p; break; } }
      if (!pos) { pos = { x: (vw - pw) / 2, y: vh - ph - 16 }; }
      pop.dataset.side = side;
      pop.style.left = Math.round(pos.x) + 'px'; pop.style.top = Math.round(pos.y) + 'px';
      if (side === 'bottom' || side === 'top') arrow.style.cssText = `left:${clamp(cx - pos.x, 26, pw - 26) - 8}px`;
      else if (side) arrow.style.cssText = `top:${clamp(cy - pos.y, 26, ph - 26) - 8}px`;
    }
    const keepPlacing = ms => { cancelAnimationFrame(raf); const t0 = performance.now(); const loop = () => { place(); if (active && performance.now() - t0 < ms) raf = requestAnimationFrame(loop); }; loop(); };

    function bringIntoView() {
      const el = STEPS[i].sel && $(STEPS[i].sel); if (!el) return;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const top = $('.top'), hh = top && getComputedStyle(top).position === 'sticky' ? top.offsetHeight : 0;
      const big = r.height > vh * 0.55;
      let y = scrollY + r.top - (big ? hh + 24 : (vh - r.height) / 2 - (innerWidth > 1000 ? 40 : 0));
      y = clamp(y, 0, document.documentElement.scrollHeight - vh);
      if (Math.abs(y - scrollY) > 2) scrollTo({ top: y, behavior: reduce.matches ? 'auto' : 'smooth' });
    }

    function render() {
      const s = STEPS[i];
      $('#gtIc', pop).innerHTML = ico(s.icon);
      $('#gtCount', pop).textContent = (i + 1) + ' / ' + N;
      $('#gtTitle', pop).textContent = s.title;
      $('#gtText', pop).innerHTML = s.text;
      Array.from(dots.children).forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      btnBack.hidden = i === 0;
      btnNext.textContent = i === N - 1 ? 'Finalizar' : 'Siguiente';
      pop.classList.remove('in'); void pop.offsetWidth; pop.classList.add('in');
    }
    function go(n) {
      if (n < 0) return;
      if (n >= N) return close();
      i = n; render(); bringIntoView(); keepPlacing(reduce.matches ? 60 : 750);
      btnNext.focus({ preventScroll: true });
    }
    function open() {
      if (active) return;
      active = true; opener = document.activeElement; i = 0;
      block.style.display = 'block'; pop.style.display = 'block'; spot.style.display = 'block';
      document.body.classList.add('gt-on');
      addEventListener('resize', onMove); addEventListener('scroll', onMove, true);
      render(); place(); bringIntoView(); keepPlacing(reduce.matches ? 60 : 750);
      btnNext.focus({ preventScroll: true });
    }
    function close() {
      if (!active) return;
      active = false; cancelAnimationFrame(raf);
      block.style.display = 'none'; pop.style.display = 'none'; spot.style.display = 'none';
      document.body.classList.remove('gt-on');
      removeEventListener('resize', onMove); removeEventListener('scroll', onMove, true);
      const back = opener && document.contains(opener) ? opener : $('#btnGuide'); if (back) back.focus({ preventScroll: true });
    }
    const onMove = () => { if (active) place(); };

    openGuide = open;
    btnNext.addEventListener('click', () => go(i + 1));
    btnBack.addEventListener('click', () => go(i - 1));
    $('#gtSkip', pop).addEventListener('click', close);
    dots.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) go(+b.dataset.k); });
    document.addEventListener('keydown', e => {
      if (!active) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Tab') {
        const f = Array.from(pop.querySelectorAll('button')).filter(b => !b.hidden && b.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (!pop.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
  } catch (e) { }
  return openGuide;
}
