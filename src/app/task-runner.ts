import type { ShellStore } from '../stores/shell-store';
import type { NavigateOptions, NavigateResult, TaskController, TaskStep } from '../types/ad';
import type { ModuleId, ModuleMeta } from '../types/doc-store';
import { byId, escHtml, nextPaint, sleep } from '../utils/dom';
import type { ModuleHost } from './module-host';
/**
 * Navegación con contexto y tarea visible: muestra el loader en modo «tarea» ANTES de cualquier trabajo, prepara el módulo destino y le entrega
 * `params` vía window.__AD_ON_NAVIGATE(params, ctl) (ctl.step/progress/detail). Solo si termina bien hace la transición; si falla, el usuario
 * permanece en el origen y recibe {ok:false,error}. Mientras hay una tarea en curso no se aceptan otras.
 */
const STEP_MIN_MS = 72, DONE_MS = 150, ERROR_MS = 420, TASK_TIMEOUT_MS = 30000;
const MSG_GENERICO = 'No fue posible completar el proceso. Inténtalo de nuevo.';
const amable = (m: string): Error => Object.assign(new Error(m), { friendly: true });
const labelOf = (s: TaskStep | undefined): string => (typeof s === 'string' ? s : (s && s.label) || '');
function swapText(el: HTMLElement, txt: string): void {
  if (el.textContent === txt) return; el.textContent = txt;
  if (el.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) el.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
}
interface Deps { store: ShellStore; mods: Readonly<Record<ModuleId, ModuleMeta>>; host: ModuleHost; loader: HTMLElement; go: (id: ModuleId) => void }
export interface TaskRunner { navigate(id: ModuleId, params?: unknown, opts?: NavigateOptions): Promise<NavigateResult> }
export function createTaskRunner({ store, mods, host, loader, go }: Deps): TaskRunner {
  const taskSteps = byId('adTaskSteps'), taskCard = byId('adTask'), taskTitle = byId('adTaskTitle'), taskDetail = byId('adTaskDetail'), taskPct = byId('adTaskPct');
  const sceneLines = [...document.querySelectorAll('#adScene .sc-ln')];
  let taskTimer: ReturnType<typeof setTimeout> | undefined;
  function makeCtl(o: NavigateOptions): TaskController {
    const steps = (o.steps && o.steps.length ? o.steps : [o.title || 'Procesando la información']).map(labelOf), n = steps.length;
    let cur = -1, tStart = 0, frac = 0, closed = false;
    const paint = (): void => {
      const p = Math.min(1, (Math.max(cur, 0) + (cur >= n - 1 ? 0 : frac)) / n), shown = cur >= n - 1 && closed ? 1 : p;
      taskCard.style.setProperty('--ad-p', shown.toFixed(3)); taskPct.textContent = Math.round(shown * 100) + '%';
      const on = Math.round(shown * sceneLines.length); sceneLines.forEach((l, k) => l.classList.toggle('on', k < on));
      [...taskSteps.children].forEach((li, i) => { li.classList.toggle('done', i < cur || (closed && i <= cur)); li.classList.toggle('active', !closed && i === cur); });
    };
    const api: TaskController = {
      n,
      async step(i, detail) {
        i = Math.max(0, Math.min(n - 1, i | 0)); if (closed) return;
        if (cur >= 0 && i > cur) { const resto = STEP_MIN_MS - (performance.now() - tStart); if (resto > 0) await sleep(resto); }
        if (i > cur) { cur = i; tStart = performance.now(); frac = 0; swapText(taskTitle, steps[cur] + '…'); }
        if (detail != null) swapText(taskDetail, detail); paint();
      },
      progress(f) { if (closed) return; frac = Math.max(frac, Math.max(0, Math.min(1, +f || 0))); paint(); },
      detail(t) { if (!closed && t != null) swapText(taskDetail, t); },
      async finish(detail) { await api.step(n - 1, detail); await sleep(STEP_MIN_MS); closed = true; taskCard.dataset.state = 'done'; paint(); await sleep(DONE_MS); },
      async fail(msg) {
        closed = true; taskCard.dataset.state = 'error'; swapText(taskTitle, 'No se pudo completar el proceso'); swapText(taskDetail, msg || MSG_GENERICO);
        [...taskSteps.children].forEach((li, i) => li.classList.toggle('active', i === Math.max(cur, 0))); await sleep(ERROR_MS);
      }
    };
    return api;
  }
  function taskUI(on: boolean, o: NavigateOptions = {}): void {
    clearTimeout(taskTimer);
    const bar = document.querySelector<HTMLElement>('.ad-bar')!, fr = host.frameOf(store.getState().route);
    if (on) {
      taskCard.dataset.state = 'run'; taskCard.style.setProperty('--ad-p', '0'); taskPct.textContent = '0%';
      const steps = (o.steps || []).map(labelOf);
      taskSteps.innerHTML = steps.map(t => '<li><span class="ad-dot"></span><span>' + escHtml(t) + '</span></li>').join('');
      taskCard.style.setProperty('--ad-n', String(Math.max(steps.length, 1))); taskSteps.hidden = !steps.length;
      sceneLines.forEach(l => l.classList.remove('on'));
      taskTitle.textContent = (steps[0] || o.title || 'Procesando la información') + '…'; taskDetail.textContent = o.detail || '';
      loader.classList.add('is-task', 'on'); document.body.setAttribute('aria-busy', 'true'); bar.inert = true; if (fr) fr.inert = true;
    } else {
      loader.classList.remove('on'); document.body.removeAttribute('aria-busy'); bar.inert = false;
      if (fr && host.frameOf(store.getState().route) === fr) fr.inert = false;
      taskTimer = setTimeout(() => { loader.classList.remove('is-task'); taskCard.dataset.state = 'run'; }, 360);
    }
  }
  async function runTask(id: ModuleId, params: unknown, o: NavigateOptions): Promise<NavigateResult> {
    store.getState().setBusy(true); const origen = store.getState().route; taskUI(true, o);
    const ctl = makeCtl(o); let tm: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, rej) => { tm = setTimeout(() => rej(amable('El proceso tardó más de lo esperado. Inténtalo de nuevo.')), TASK_TIMEOUT_MS); });
    try {
      await nextPaint();
      return await Promise.race([limite, (async (): Promise<NavigateResult> => {
        await ctl.step(0, o.detail);
        if (!host.isLoaded(id)) ctl.detail('Preparando el módulo de destino…');
        await host.whenLoaded(id);
        const w = host.frames[id].contentWindow as Window & typeof globalThis;
        const ctx = (typeof w.__AD_ON_NAVIGATE === 'function' ? await w.__AD_ON_NAVIGATE(params, ctl) : { ok: true }) as { ok?: boolean; error?: string } | undefined;
        if (ctx && ctx.ok === false) throw amable(ctx.error || MSG_GENERICO);
        await ctl.finish('Abriendo el módulo de destino');
        go(id); for (let i = 0; i < 60 && store.getState().route !== id; i++) await new Promise(r => requestAnimationFrame(r));
        await nextPaint();
        return { ok: true, ...(ctx || {}) };
      })()]);
    } catch (e) {
      const err = e as Error & { friendly?: boolean };
      if (!(err && err.friendly)) console.error('[Asistente Documental] Falló la tarea de navegación:', e);
      const msg = (err && err.friendly && err.message) || MSG_GENERICO;
      await ctl.fail(msg); return { ok: false, error: msg, origen };
    } finally { clearTimeout(tm); store.getState().setBusy(false); taskUI(false); }
  }
  return {
    navigate(id, params, opts) {
      if (!mods[id]) return Promise.resolve({ ok: false, error: 'El módulo solicitado no existe.' });
      if (store.getState().busy) return Promise.resolve({ ok: false, busy: true, error: 'Hay un proceso en curso.' });
      if (!params) { go(id); return Promise.resolve({ ok: true }); }
      return runTask(id, params, opts || {});
    }
  };
}
