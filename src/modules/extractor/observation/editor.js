/* «Observacion Creg» editable: persistencia, edición y copia. */
import { $, esc, icon } from '../lib/utils.js';
import { obsPesos } from './logic.js';
import { S } from '../state.js';
import { normCta } from '../ui/account.js';
import { msgHTML, toast } from '../ui/feedback.js';
import { renderResults } from '../ui/results.js';

/* ==========================================================================
   19c. «OBSERVACION CREG» EDITABLE
   - El texto automático (observationFromCalc) sigue siendo la base; el usuario puede corregirlo y guardarlo.
   - Persistencia: localStorage (si el navegador lo bloquea se guarda sólo en memoria y se avisa). Clave del caso =
     cuenta + datos que producen el texto (clase, meta diaria, días, consumo, CU, periodo y fechas): si algo de eso cambia,
     el texto automático cambia y NO se aplica una edición hecha para otro caso; al volver a los mismos datos reaparece la guardada.
   - Una edición guardada reemplaza al texto automático en pantalla Y en «Copiar observación» (S.lastObs.texto = texto efectivo).
   ========================================================================== */
const OBS_LS = 'essa.metas.obsCreg.v1', OBS_MAX = 300;
export const ObsStore = {
  mem: {},
  all() { try { const r = localStorage.getItem(OBS_LS); const o = r ? JSON.parse(r) : {}; return (o && typeof o === 'object') ? o : {}; } catch { return this.mem; } },
  get(k) { const r = this.all()[k]; return r && typeof r.texto === 'string' && r.texto.trim() ? r : null; },
  write(o) {
    const ks = Object.keys(o); if (ks.length > OBS_MAX) ks.sort((a, b) => (o[a].ts || 0) - (o[b].ts || 0)).slice(0, ks.length - OBS_MAX).forEach(k => delete o[k]);
    this.mem = o; try { localStorage.setItem(OBS_LS, JSON.stringify(o)); return true; } catch { return false; }
  },
  set(k, texto, auto) { const o = this.all(); o[k] = { texto, auto, ts: Date.now() }; return this.write(o); },
  del(k) { const o = this.all(); delete o[k]; return this.write(o); }
};
/** Identifica «el mismo caso»: cuenta + los datos de los que depende el texto de la observación. */
export function obsCaseKey(c, cuenta) {
  const i = c.inputs || {}, p = c.periodo || {}, n = v => (v === null || v === undefined || v === '') ? '' : (typeof v === 'number' ? +v.toFixed(6) : String(v).trim());
  return [normCta(cuenta), n(i.C5), n(i.C6), n(i.C7), n(i.F5), n(i.F6), n(p.periodo), n(p.periodoDesde), n(p.periodoHasta)].join('|');
}
const obsEditing = obs => !!(S.obsEdit && obs && S.obsEdit.key === obs.key);
export function obsAutosize(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 480) + 'px'; }
export function obsCount(ta) { const c = $('#obsCnt'); if (c) c.textContent = ta.value.length.toLocaleString('es-CO') + ' caracteres'; }
export function obsStartEdit() {
  const o = S.lastObs; if (!o) return;
  S.obsEdit = { key: o.key, draft: o.texto }; renderResults();
  const ta = $('#obsEdit'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}
export function obsCancelEdit() { S.obsEdit = null; renderResults(); const b = $('#btnEditObs'); if (b) b.focus({ preventScroll: true }); }
export function obsSaveEdit() {
  const o = S.lastObs, ta = $('#obsEdit'); if (!o || !ta) return;
  const t = ta.value.replace(/\r\n/g, '\n').trim();
  if (!t) { toast('warn', 'La observación no puede quedar vacía', 'Escribe el texto o usa «Restaurar automática».'); ta.focus(); return; }
  let ok = true;
  if (t === o.textoAuto) ObsStore.del(o.key);                              // igual a la automática: no hay nada que conservar
  else ok = ObsStore.set(o.key, t, o.textoAuto);
  S.obsEdit = null; renderResults();
  if (t === o.textoAuto) toast('ok', 'Observación sin cambios', 'Coincide con el texto automático.');
  else if (ok) toast('ok', 'Observación guardada', 'Se conservará al recargar la página.');
  else toast('warn', 'Guardada solo en esta sesión', 'El navegador no permite almacenamiento permanente; se perderá al cerrar o recargar.');
  const b = $('#btnEditObs'); if (b) b.focus({ preventScroll: true });
}
export function obsRestoreAuto() {
  const o = S.lastObs; if (!o) return;
  ObsStore.del(o.key); S.obsEdit = null; renderResults();
  toast('ok', 'Texto automático restaurado', 'Se eliminó tu versión guardada de esta observación.');
}
/** Bloque visual de la observación (se agrega bajo «Resultados calculados»). */
export function observationHTML(obs, calc) {
  const pre = calc && calc.status === 'preliminar';
  const cl = { confirma: 'ok', accede: 'ok', parcial: 'warn', validar: 'err' }[obs.estado];
  const k = obs.calculo;
  const stats = k ? (k.valorFacturado === null
    ? `<div class="obs-k" style="grid-template-columns:1fr"><div><span>Valor validado del concepto</span><b class="num">${obsPesos(k.valorValidado)}</b></div></div>`
    : `<div class="obs-k">
      <div><span>Valor validado</span><b class="num">${obsPesos(k.valorValidado)}</b></div>
      <div><span>Valor facturado</span><b class="num">${obsPesos(k.valorFacturado)}</b></div>
      <div><span>Diferencia</span><b class="num ${k.diferencia < 0 ? 'neg' : ''}">${k.diferencia < 0 ? '−' : ''}${obsPesos(Math.abs(k.diferencia))}</b></div></div>`) : '';
  const warn = pre ? msgHTML('warn', 'Observación preliminar:', (calc.reasons || []).join(' · ') + '. Confirma los datos antes de copiarla.') : '';
  const adv = (obs.advertencias || []).map(a => msgHTML('info', a)).join('');
  const det = obs.detalle && obs.detalle.length ? `<details class="obs-det"><summary>Cómo se validó</summary><div class="obs-det-b">${obs.detalle.map(([l, t]) => `<div><span>${esc(l)}</span><b class="num">${esc(t)}</b></div>`).join('')}</div></details>` : '';
  const ed = obsEditing(obs), canCopy = obs.estado !== 'validar' && !pre && !ed;
  const body = ed
    ? `<div class="obs-ed"><textarea class="obs-ta" id="obsEdit" spellcheck="true" aria-label="Texto de Observacion Creg">${esc(S.obsEdit.draft)}</textarea></div>
       <p class="obs-ed-note">Ctrl + Enter guarda · Esc cancela. Tu texto reemplaza al automático al copiar.</p>
       <div class="obs-ed-f"><span class="cnt" id="obsCnt"></span>
         ${obs.editada ? `<button class="btn sm ghost" type="button" id="btnObsRestore">${icon('i-refresh', 'i sm')}Restaurar automática</button>` : ''}
         <button class="btn sm" type="button" id="btnObsCancel">Cancelar</button>
         <button class="btn sm ok" type="button" id="btnObsSave">${icon('i-check', 'i sm')}Guardar</button></div>`
    : `<p class="obs-text" id="obsText">${esc(obs.texto)}</p>`;
  return `<div class="obs obs-${obs.estado}${ed ? ' editing' : ''}" id="obsBox">
    <div class="obs-h"><span class="obs-ico">${icon('i-doc', 'i')}</span><h3>Observacion Creg</h3><span class="chip ${cl}">${esc(obs.etiqueta)}</span>${obs.editada ? '<span class="chip edited" title="Texto modificado y guardado por el usuario">Editada</span>' : ''}<span class="grow"></span>
      <span class="obs-act">${ed ? '' : `<button class="btn sm edit" type="button" id="btnEditObs">${icon('i-edit', 'i sm')}Editar</button>`}
      <button class="btn sm primary" type="button" id="btnCopyObs" ${canCopy ? '' : 'disabled'}>${icon('i-check')}Copiar observación</button></span></div>
    ${stats}${warn}${adv}
    ${body}${ed ? '' : det}</div>`;
}
export async function copyObservation() {
  const t = S.lastObs && S.lastObs.texto; if (!t) return;
  try { await navigator.clipboard.writeText(t); }
  catch { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } finally { a.remove(); } }
  toast('ok', 'Observación copiada', 'Ya puedes pegarla en el aplicativo.');
}
