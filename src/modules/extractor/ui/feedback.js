import { MODEL } from '../calc/model.js';
import { numStr } from '../lib/format.js';
import { $, AppError, clamp, esc, icon } from '../lib/utils.js';

const ICON_BY = { ok: 'i-check', warn: 'i-alert', err: 'i-err', info: 'i-info' };
export function toast(type, title, msg = '', ms = 4200) {
  const el = document.createElement('div'); el.className = 'toast ' + type; el.setAttribute('role', type === 'err' ? 'alert' : 'status');
  el.innerHTML = `<div class="ic">${icon(ICON_BY[type])}</div><div><div class="ti">${esc(title)}</div>${msg ? `<div class="tm">${esc(msg)}</div>` : ''}</div><button class="btn icon sm ghost" aria-label="Cerrar">${icon('i-x')}</button>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
  el.querySelector('button').onclick = close; $('#toasts').appendChild(el); if (ms) setTimeout(close, ms);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
export function msgHTML(type, title, text = '', extra = '') { return `<div class="msg ${type} fade-in">${icon(ICON_BY[type])}<div><b>${esc(title)}</b>${text ? ' ' + esc(text) : ''}${extra}</div></div>`; }
export function setMsgs(id, html) { $(id).innerHTML = html || ''; }
export function errorMsg(e) { return e instanceof AppError ? { t: e.message, h: e.hint } : { t: 'Error inesperado.', h: e && e.message ? e.message : String(e) }; }

const tip = $('#tip');
document.addEventListener('mouseover', e => {
  const t = e.target.closest('[data-tip]'); if (!t) { tip.classList.remove('on'); return; }
  tip.innerHTML = t.getAttribute('data-tip'); tip.classList.add('on');
  const r = t.getBoundingClientRect(); const tw = Math.min(360, tip.offsetWidth);
  tip.style.left = clamp(r.left + r.width / 2 - tw / 2, 8, innerWidth - tw - 8) + 'px';
  const top = r.top - tip.offsetHeight - 8; tip.style.top = (top < 8 ? r.bottom + 8 : top) + 'px';
});
document.addEventListener('scroll', () => tip.classList.remove('on'), true);
export const tipAttr = (title, body) => `data-tip="${esc(`<div class='tt'>${title}</div>${body || ''}`)}"`;


const pct = x => numStr(x * 100, 0, false) + ' %';
function helpFor(ref) {
  const p = MODEL.params;
  const contrib = (p.contrib || []).join(', ').replace(/, ([^,]*)$/, ' y $1');
  const H = {
    C5: ['Clase de servicio', 'Es el tipo de cliente que aparece en la factura (por ejemplo, Residencial 2 o Comercial). Se toma de la imagen y define qué porcentaje se cobra si hay exceso y si se aplica recargo.'],
    C6: ['Meta diaria', 'Son los kWh que este cliente debería gastar, más o menos, en un día. Si escribes la meta del ciclo, aquí se calcula dividiéndola entre los días facturados.'],
    C7: ['Número de Ciclos/Días Facturados', 'Cuántos días cubre la factura. Con esto se convierte la meta diaria en la meta de todo el período.'],
    C8: ['Meta del período', 'Lo que el cliente debería consumir en todo el período facturado: su meta diaria por la cantidad de días.'],
    C9: ['Mínimo de la meta', `Es el ${pct(p.pMin)} de la meta. Si el cliente consume menos que esto, se considera que ahorró.`],
    C10: ['Límite de 110% de la Meta de Ciclo kWh', `Es el ${pct(p.pMax)} de la meta. Hay un margen de tolerancia: sólo si el consumo pasa de este límite se considera exceso.`],
    C11: ['Tope de ahorro', `El ahorro reconocido nunca supera el ${pct(p.pTope)} de la meta, aunque el cliente haya consumido mucho menos.`],
    F5: ['Consumo Registrado kWh', 'Los kWh que realmente consumió el cliente, según la factura. Es lo que se compara contra la meta.'],
    F6: ['CU (costo por kWh)', 'Lo que cuesta cada kWh según la factura. Se usa para pasar los kWh de exceso a pesos.'],
    F7: ['¿Contribuye?', `Indica si la clase paga contribución. Aplica para ${contrib}. Si dice «Sí», el precio del kWh lleva un recargo.`],
    F8: ['Consumo Excedente kWh', `Cuántos kWh se pasó el cliente por encima del máximo permitido. Si muestra 0, el consumo se mantuvo dentro del límite y no hay cobro adicional.`],
    F9: ['Ahorro', `Cuántos kWh consumió por debajo del mínimo, con el tope de ahorro como límite. Si dice «${p.noAhorro}», no llegó a ahorrar. Es informativo: no cambia el valor a cobrar.`],
    F10: ['¿CU o tarifa?', 'Te dice qué precio se usa: el CU tal cual, o la tarifa con recargo si la clase contribuye.'],
    F11: ['Precio por kWh a aplicar', `El precio que se usa para el cálculo. Si la clase contribuye, es el CU con un recargo del ${pct(p.pTarifa - 1)}; si no, es el mismo CU.`],
    F12: ['Porcentaje de cobro', 'Qué parte del precio se cobra por cada kWh de exceso. Depende de la clase de servicio: no todas pagan lo mismo.'],
    F13: ['Valor por kWh de exceso', 'Cuánto se cobra por cada kWh que el cliente se pasó: el precio a aplicar ya ajustado con el porcentaje de cobro.'],
    F14: ['Total a cobrar por exceso', 'Lo que el cliente debería pagar de más por haberse pasado de la meta. Si no hubo exceso, es $ 0.'],
    periodo: ['Periodo', 'El periodo de facturación que trae el documento (en la imagen se llama «Facturación de»). Se muestra tal cual aparece.'],
    desde: ['Periodo Desde', 'La fecha en que empieza el periodo facturado, tal como aparece en la factura.'],
    hasta: ['Periodo Hasta', 'La fecha en que termina el periodo facturado, tal como aparece en la factura.'],
    F17: ['Cobro actual', 'Lo que ya se le cobró al cliente por este concepto. Escríbelo para que la app te diga si hay que cobrar más o devolver.'],
    F18: ['Valor del ajuste', 'La diferencia entre lo que se debería cobrar y lo que ya se cobró, redondeada a pesos. Positivo: falta cobrar. Negativo (en rojo): hay que descontar.'],
    F19: ['Ajuste que procede', `La decisión final: «${p.f19Pos}» si falta cobrar, «${p.f19Neg}» si se cobró de más, o «${p.f19Cero}» si todo cuadra.`]
  };
  return H[ref] || [ref, ''];
}
export const helpTip = ref => { const [t, b] = helpFor(ref); return tipAttr(t, b); };

export function setPill(id, state, text) { const p = $(id); p.querySelector('.dot').className = 'dot ' + (state || ''); p.querySelector('span:last-child').textContent = text; }
