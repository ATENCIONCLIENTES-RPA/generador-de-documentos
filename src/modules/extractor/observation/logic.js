/* Observación automática CREG 101 120 de 2026 (lógica pura, sin DOM). */
import { calculateResults, refLabel, validateCalcInputs } from '../calc/engine.js';
import { MODEL } from '../calc/model.js';
import { excelRound, numStr } from '../lib/format.js';
import { dateMs, parsePeriodText } from '../ocr/parse.js';

/* ==========================================================================
   19b. OBSERVACIÓN AUTOMÁTICA · «Cobro adicional CREG 101 120 de 2026»
   Capas separadas (lógica pura, sin DOM) que NO duplican el calculador: toman sus resultados
   (calculateResults: C8 meta del ciclo, C10 límite 110 %, F8 CEOC, F11 TR, F12 = F − 1, F14 cobro) y los VERIFICAN
   contra la Resolución CREG 101 120 de 2026 (arts. 8, 10 y 11) antes de redactar:

     1) validarCobroAdicional()  → verifica que los datos sean del MISMO caso (cuenta, periodo, fechas, días) y cada paso del cálculo.
     2) decidirCobroAdicional()  → decide a partir de la validación: confirma/mantenido · accede/retirado · validar información
                                   (y, sólo si se suministra el valor facturado del concepto por API: accede parcialmente/reliquidado).
     3) redactarObservacion()    → construye el texto sólo con el resultado estructurado.
     4) verificarCoherencia()    → antes de entregar el texto comprueba que decisión, importes y redacción no se contradigan;
                                   si algo no cuadra, NO entrega el texto: pide validar el caso.

   Reglas verificadas en la regulación:
     · Meta del ciclo (art. 8)  = meta diaria × días del ciclo facturado (mensual o bimestral).
     · Banda neutra (art. 10)   = hasta el 110 % de la meta del ciclo no genera cobro. CEOC = máx(0; consumo − 110 % meta).
     · Factor F (art. 10)       = 1,30 residencial estratos 1-3 · 1,50 estratos 4-6 · 1,70 comercial e industrial.
     · Cobro (art. 11)          = (F − 1) × TR × CEOC, con TR = tarifa regulada de referencia ($/kWh).
   El valor validado se REDONDEA al peso más cercano (mitad hacia arriba, como ROUND de Excel): $478.106,92 → $478.107. En «Cómo se validó»
   el cobro se muestra con decimales; en la observación, redondeado.
   ========================================================================== */
export const OBS_CONFIG = {
  concepto: 'Cobro adicional CREG 101 120 de 2026',
  // Precisión. Si se suministra el valor facturado del concepto, el cobro calculado se compara SIN redondear: son iguales si difieren en menos del
  // MAYOR entre `pesos` y `relativa` × valor facturado (absorbe el redondeo o truncamiento al peso del sistema de facturación y el redondeo del CU/TR a 4 decimales).
  tolerancia: { pesos: 1, relativa: 1e-6 },
  eps: 1e-9,                       // ruido de punto flotante al comparar el consumo con el límite (p. ej. 300 × 1,1 = 330,00000000000006)
  suspension: 'La falta de pago de este concepto no dará lugar a la suspensión del servicio de energía eléctrica.'
};
const OBS_ETIQUETA = { confirma: 'Confirma · Mantenido', parcial: 'Accede parcialmente · Reliquidado', accede: 'Accede · Retirado', validar: 'Validar información' };
/** Parámetros de la regulación (Res. CREG 101 120 de 2026). Sirven para VERIFICAR el calculador, no para sustituirlo. */
const REG = {
  limite: 1.10,
  factores: { 'Residencial 1': 1.3, 'Residencial 2': 1.3, 'Residencial 3': 1.3, 'Residencial 4': 1.5, 'Residencial 5': 1.5, 'Residencial 6': 1.5, 'Comercial': 1.7, 'Industrial': 1.7 },
  tipo: { 'Residencial 1': 'usuarios residenciales de los estratos 1, 2 y 3', 'Residencial 2': 'usuarios residenciales de los estratos 1, 2 y 3', 'Residencial 3': 'usuarios residenciales de los estratos 1, 2 y 3',
          'Residencial 4': 'usuarios residenciales de los estratos 4, 5 y 6', 'Residencial 5': 'usuarios residenciales de los estratos 4, 5 y 6', 'Residencial 6': 'usuarios residenciales de los estratos 4, 5 y 6',
          'Comercial': 'usuarios comerciales', 'Industrial': 'usuarios industriales' }
};
export const obsPesos = n => '$' + numStr(n, 0, true);                          // $3.153.849 (sólo valores ≥ 0)
const obsPesosDec = n => '$' + numStr(n, 2, true);                       // $1.237,91
const obsKwh = n => numStr(n, 2, true);                                  // 3.639,60
const obsMeta = n => numStr(n, 6, false).replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');   // 9,483871 · 12,5 · 10
const obsEntero = n => numStr(n, Number.isInteger(n) ? 0 : 2, true);     // 3.963
const obsFactor = n => numStr(n, 2, false);                              // 1,70
const cercano = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const tolPesos = (facturado, cfg = OBS_CONFIG) => Math.max(cfg.tolerancia.pesos, cfg.tolerancia.relativa * Math.abs(facturado));
const DIA_MS = 86400000;
const sinCeros = s => String(s ?? '').trim().replace(/^0+(?=\d)/, '');
/** «2026-10» · «10-2026» · «202610» → { y, m } (o null). */
function periodoYM(s) {
  const p = parsePeriodText(s); if (!p.ok) return null;
  const t = p.value; let m = t.match(/^(\d{4})[-/.]?(\d{1,2})$/); if (m) return { y: +m[1], m: +m[2] };
  m = t.match(/^(\d{1,2})[-/.](\d{4})$/); return m ? { y: +m[2], m: +m[1] } : null;
}
const ymDeFecha = s => { const t = dateMs(s); if (t === null) return null; const d = new Date(t); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }; };

/* ---------- 1) VALIDACIÓN TÉCNICA Y MATEMÁTICA ---------- */
/** c = { inputs, invalid, res, periodo, cuentaImagen } → { datos, pasos, verificaciones, faltantes, inconsistencias, advertencias } */
export function validarCobroAdicional(c, cuenta, cfg = OBS_CONFIG) {
  const { inputs, res, invalid } = c, per = c.periodo || {};
  const vacio = x => x === null || x === undefined || x === '';
  const v = { cuenta: String(cuenta ?? '').trim(), faltantes: [], inconsistencias: [], advertencias: [], verificaciones: [], datos: null, pasos: null };
  const ok = (id, texto) => v.verificaciones.push({ id, estado: 'ok', texto });
  const pend = (id, texto) => v.verificaciones.push({ id, estado: 'pendiente', texto });
  if (!v.cuenta) v.faltantes.push('Número de cuenta');
  else if (!/^\d{1,15}$/.test(v.cuenta)) v.inconsistencias.push('El número de cuenta debe tener sólo dígitos (máx. 15)');
  // El valor facturado del CONCEPTO es opcional (la pantalla ya no lo pide): si no existe, se mantiene el valor validado.
  if (!vacio(inputs.F17) && typeof inputs.F17 === 'number' && inputs.F17 < 0) v.inconsistencias.push('El valor facturado no puede ser negativo');
  const facturado = vacio(inputs.F17) ? null : excelRound(inputs.F17, 0);
  v.datos = { cuenta: v.cuenta, cuentaImagen: c.cuentaImagen || null, clase: inputs.C5 ?? null, metaDiaria: inputs.C6 ?? null, dias: inputs.C7 ?? null, consumo: inputs.F5 ?? null, cu: inputs.F6 ?? null, valorFacturado: facturado,
    periodo: per.periodo ?? null, desde: per.periodoDesde ?? null, hasta: per.periodoHasta ?? null };
  // (0) MISMO CASO: la cuenta de la imagen debe ser la cuenta sobre la que se redacta la observación
  if (c.cuentaImagen && v.cuenta && sinCeros(c.cuentaImagen) !== sinCeros(v.cuenta))
    v.inconsistencias.push(`La imagen de la factura corresponde a la cuenta ${c.cuentaImagen} y no a la cuenta ${v.cuenta}: los datos no pertenecen al mismo caso`);
  // (0b) MISMO CICLO: periodo de facturación y fechas del documento
  const dMs = vacio(per.periodoDesde) ? null : dateMs(per.periodoDesde), hMs = vacio(per.periodoHasta) ? null : dateMs(per.periodoHasta);
  if (dMs !== null && hMs !== null && hMs < dMs) v.inconsistencias.push(`El periodo es incoherente: «Desde» (${per.periodoDesde}) es posterior a «Hasta» (${per.periodoHasta})`);
  if (!vacio(per.periodo) && dMs !== null && hMs !== null && hMs >= dMs) {
    const pm = periodoYM(per.periodo), a = ymDeFecha(per.periodoDesde), b = ymDeFecha(per.periodoHasta);
    const igual = (x, y) => x && y && x.y === y.y && x.m === y.m;
    if (pm && !igual(pm, a) && !igual(pm, b)) v.inconsistencias.push(`El periodo de facturación ${per.periodo} no corresponde a las fechas del ciclo (${per.periodoDesde} a ${per.periodoHasta}): los datos pertenecen a periodos distintos`);
  }
  for (const [k, l] of [['C5', 'Clase de servicio (tipo de usuario)'], ['C6', 'Meta'], ['C7', 'Número de días del periodo facturado'], ['F5', 'Consumo registrado (kWh)'], ['F6', 'Valor unitario del kWh (CU)']])
    if (vacio(inputs[k])) v.faltantes.push(l);
  for (const [k, msg] of Object.entries(invalid || {})) if (!vacio(inputs[k])) v.inconsistencias.push(msg);
  if (typeof inputs.F6 === 'number' && inputs.F6 <= 0 && !v.inconsistencias.length) v.inconsistencias.push('El valor unitario del kWh (CU) debe ser mayor que 0');
  if (v.faltantes.length || v.inconsistencias.length) return v;
  for (const k of ['C8', 'C10', 'F7', 'F8', 'F11', 'F12'])
    if (!res[k] || res[k].state !== 'ok') { v.inconsistencias.push(res[k] && res[k].reason ? res[k].reason : `No se pudo calcular ${refLabel(MODEL, k)}`); return v; }
  const md = inputs.C6, dias = inputs.C7, cons = inputs.F5;
  const metaP = res.C8.value, limite = res.C10.value, f1 = res.F12.value, F = 1 + f1, tr = res.F11.value;
  const contribuye = res.F7.value === MODEL.params.f7Yes;
  // (a) Meta del periodo y límite del 110 % (arts. 8 y 10)
  if (!cercano(metaP, md * dias)) v.inconsistencias.push('La meta del periodo no es la meta diaria × los días facturados (art. 8)');
  else ok('meta', `Meta del periodo = ${obsMeta(md)} × ${dias} = ${obsKwh(metaP)} kWh`);
  if (!cercano(limite, md * dias * REG.limite)) v.inconsistencias.push('El calculador no usa el límite del 110 % de la meta del periodo (art. 10)');
  else ok('limite', `Límite del 110 % = ${obsKwh(metaP)} × 1,10 = ${obsKwh(limite)} kWh`);
  // (b) Comparación y CEOC: sólo el consumo que supera el límite, nunca el consumo total (art. 10). El ruido de punto flotante no cuenta.
  const exceso = cons - limite, supera = exceso > cfg.eps;
  const comparacion = supera ? 'supera' : (Math.abs(exceso) <= cfg.eps ? 'iguala' : 'inferior');
  const ceoc = supera ? exceso : 0;
  if (!cercano(res.F8.value, ceoc)) v.inconsistencias.push('El consumo excedente objeto de cobro no es máx(0; consumo − límite del 110 %) (art. 10)');
  else ok('ceoc', supera ? `CEOC = máx(0; ${obsEntero(cons)} − ${obsKwh(limite)}) = ${obsKwh(ceoc)} kWh` : `El consumo (${obsEntero(cons)} kWh) ${comparacion === 'iguala' ? 'es igual al' : 'no supera el'} límite (${obsKwh(limite)} kWh): CEOC = 0`);
  // (c) Factor F contra la tabla del art. 10 y tarifa regulada de referencia TR
  const fReg = REG.factores[inputs.C5];
  if (fReg === undefined) v.inconsistencias.push(`La clase «${inputs.C5}» no tiene un factor definido en el artículo 10`);
  else if (!cercano(F, fReg)) v.inconsistencias.push(`El factor del calculador (${obsFactor(F)}) no coincide con el del artículo 10 para ${REG.tipo[inputs.C5]} (${obsFactor(fReg)})`);
  else ok('factor', `F = ${obsFactor(F)} (${REG.tipo[inputs.C5]}, art. 10)`);
  if (!(tr > 0)) v.inconsistencias.push('La tarifa regulada de referencia (TR) debe ser mayor que 0');
  else ok('tr', `TR = ${obsPesosDec(tr)}/kWh${contribuye ? ` (CU de ${obsPesosDec(inputs.F6)}/kWh con contribución del 20 %)` : ` (CU de ${obsPesosDec(inputs.F6)}/kWh)`}`);
  // (d) Días facturados frente a las fechas del documento: se aceptan los días entre las fechas o contando ambos extremos
  if (dMs !== null && hMs !== null && hMs >= dMs) {
    const dif = Math.round((hMs - dMs) / DIA_MS), incl = dif + 1;
    if (dias !== dif && dias !== incl) v.inconsistencias.push(`Los ${dias} días facturados no coinciden con el periodo del ${per.periodoDesde} al ${per.periodoHasta} (${dif} días entre las fechas, ${incl} contando ambos extremos)`);
    else ok('dias', `Días facturados (${dias}) coherentes con el periodo ${per.periodoDesde} a ${per.periodoHasta} (${dias === incl ? 'contando ambos extremos' : 'diferencia entre fechas'})`);
  } else pend('dias', 'Sin fechas «Desde/Hasta» legibles del documento: los días facturados no se contrastaron con el periodo');
  // (e) Fórmula regulatoria (art. 11) contra el cálculo del sistema
  const formula = f1 * tr * ceoc;                                         // (F − 1) × TR × CEOC
  if (Math.abs(formula - res.F14.value) > 1e-6 * Math.max(1, Math.abs(formula))) v.inconsistencias.push('El calculador no reproduce la fórmula del artículo 11: (F − 1) × TR × CEOC');
  v.pasos = { metaPeriodo: metaP, limite, comparacion, supera, ceoc, factor: F, factorMenos1: f1, tr, cu: inputs.F6, contribuye, valorUnitario: f1 * tr, valorFormula: formula,
    valorBase: formula, valorRedondeado: excelRound(formula, 0), valorFacturado: facturado };
  // (f) Sólo si se suministró el valor facturado del concepto (por API): no puede superar el máximo posible, que es cobrar TODO el consumo.
  const unit = f1 * tr;
  if (facturado !== null && facturado > unit * cons + tolPesos(facturado, cfg))
    v.inconsistencias.push(`El valor facturado (${obsPesos(facturado)}) supera el máximo que podría cobrarse por este concepto con el consumo registrado (${obsEntero(cons)} kWh × ${obsPesosDec(unit)}/kWh = ${obsPesos(unit * cons)}, aun sin descontar el 110 % de la meta): no parece corresponder al «${cfg.concepto}»`);
  return v;
}

/* ---------- 2) DECISIÓN ---------- */
/** Si el cobro se reliquida (sólo con valor facturado del concepto), identifica el error concreto contrastando lo facturado con hipótesis aritméticas. */
function diagnosticarDiferencia(v, tol) {
  const p = v.pasos, d = v.datos, B = d.valorFacturado, unit = p.valorUnitario;
  const hit = val => Math.abs(val - B) <= tol;
  const exMeta = Math.max(0, d.consumo - p.metaPeriodo);
  if (exMeta > p.ceoc && hit(exMeta * unit))
    return { codigo: 'sin_banda', dato: 'el consumo excedente objeto de cobro', texto: `el cobro se liquidó sobre el consumo que supera el 100 % de la meta (${obsKwh(exMeta)} kWh) y no sobre el que supera el límite del 110 % (${obsKwh(p.ceoc)} kWh), contrario a lo previsto en el artículo 10 de la Resolución CREG 101 120 de 2026` };
  if (hit(d.consumo * unit))
    return { codigo: 'consumo_total', dato: 'la base del cobro', texto: `el cobro se liquidó sobre la totalidad del consumo registrado (${obsEntero(d.consumo)} kWh) y no solo sobre el consumo excedente objeto de cobro (${obsKwh(p.ceoc)} kWh), contrario a lo previsto en el artículo 10 de la Resolución CREG 101 120 de 2026` };
  for (const Fx of [1.3, 1.5, 1.7])
    if (Math.abs(Fx - p.factor) > 1e-9 && hit((Fx - 1) * p.tr * p.ceoc))
      return { codigo: 'factor', dato: 'el factor de cobro', texto: `se aplicó un factor de cobro (F = ${obsFactor(Fx)}) distinto del que corresponde a ${REG.tipo[d.clase]} (F = ${obsFactor(p.factor)}, artículo 10 de la Resolución CREG 101 120 de 2026)` };
  const tr2 = p.contribuye ? p.cu : p.cu * MODEL.params.pTarifa;
  if (hit(p.factorMenos1 * tr2 * p.ceoc))
    return { codigo: 'tarifa', dato: 'la tarifa regulada de referencia', texto: `la tarifa regulada de referencia utilizada (${obsPesosDec(tr2)}/kWh) no corresponde a la aplicable a ${REG.tipo[d.clase]} (${obsPesosDec(p.tr)}/kWh${p.contribuye ? ', con la contribución del 20 %' : ', sin contribución'})` };
  return { codigo: 'calculo', dato: 'el valor del cobro adicional', texto: `el valor facturado no coincide con el que resulta de aplicar la fórmula del artículo 11 de la Resolución CREG 101 120 de 2026 con los datos verificados, sin que la diferencia pueda atribuirse a un único dato` };
}
/** v (validación) → decisión estructurada.
 *  valorValidado = importe del concepto que resulta de la validación · valorFinal = importe con el que queda el concepto · valorRetirado = importe eliminado (si se conoce). */
export function decidirCobroAdicional(v, cfg = OBS_CONFIG) {
  const d = { estado: 'validar', tratamiento: null, valorValidado: null, valorFinal: null, valorRetirado: null, valorFacturado: v.datos ? v.datos.valorFacturado : null,
    comparacion: v.pasos ? v.pasos.comparacion : null, causa: null, motivo: null, diferencia: null, diferenciaRedondeo: null, tolerancia: null, inconsistencias: [] };
  if (v.faltantes.length || v.inconsistencias.length) return d;
  const B = v.datos.valorFacturado, p = v.pasos;
  // Caso C: el consumo no supera el umbral → no hay CEOC y el cobro no procede (se retira completo, no se reliquida)
  if (!p.supera) {
    if (B === null) return Object.assign(d, { estado: 'accede', tratamiento: 'retirado', valorValidado: 0, valorFinal: 0, valorRetirado: null, motivo: { tipo: 'sin_excedente' } });
    if (!(B > 0)) { d.inconsistencias.push('El consumo no supera el límite del 110 % y el valor facturado es $0: no existe un cobro que retirar'); return d; }
    return Object.assign(d, { estado: 'accede', tratamiento: 'retirado', valorValidado: 0, valorFinal: 0, valorRetirado: B, diferencia: -B, motivo: { tipo: 'sin_excedente' } });
  }
  // A partir de aquí el consumo SÍ supera el límite: el cobro se mantiene o se reliquida; nunca se retira por una diferencia menor.
  if (!(p.valorRedondeado > 0)) { d.inconsistencias.push(`El consumo supera el límite del 110 % en ${obsKwh(p.ceoc)} kWh, pero el cobro que resulta de la fórmula es $0 al redondear al peso: se requiere validar el caso`); return d; }
  if (B === null) return Object.assign(d, { estado: 'confirma', tratamiento: 'mantenido', valorValidado: p.valorRedondeado, valorFinal: p.valorRedondeado, motivo: { tipo: 'sin_comparacion' } });
  if (!(B > 0)) { d.inconsistencias.push(`El cobro adicional procede (valor validado ${obsPesos(p.valorRedondeado)}), pero el valor facturado del concepto es $0: no hay valor que mantener ni reliquidar`); return d; }
  const tol = tolPesos(B, cfg), dif = p.valorBase - B;
  d.tolerancia = tol;
  if (Math.abs(dif) <= tol) return Object.assign(d, { estado: 'confirma', tratamiento: 'mantenido', valorValidado: B, valorFinal: B, diferencia: 0, diferenciaRedondeo: dif, motivo: { tipo: 'coincide' } });
  if (dif < 0) return Object.assign(d, { estado: 'parcial', tratamiento: 'reliquidado', valorValidado: p.valorRedondeado, valorFinal: p.valorRedondeado, diferencia: p.valorRedondeado - B, causa: diagnosticarDiferencia(v, tol), motivo: { tipo: 'reliquida' } });
  d.inconsistencias.push(`El valor validado (${obsPesos(p.valorRedondeado)}) es superior al facturado (${obsPesos(B)}): no se reliquida al alza en la respuesta a la solicitud; se requiere validar el caso`);
  return d;
}

/* ---------- 3) REDACCIÓN (sólo con el resultado estructurado) ---------- */
export function redactarObservacion(v, d, cfg = OBS_CONFIG) {
  const cta = v.cuenta, B = v.datos.valorFacturado;
  if (d.estado === 'validar') {
    const partes = [];
    if (v.faltantes.length) partes.push(`información faltante (${v.faltantes.join('; ')})`);
    const inc = [...v.inconsistencias, ...d.inconsistencias];
    if (inc.length) partes.push(`datos inconsistentes (${inc.join('; ')})`);
    return `No es posible generar la observación${cta ? ` de la cuenta N.° ${cta}` : ''}: se requiere validar ${partes.join(' y ')}.`;
  }
  const dt = v.datos, p = v.pasos, concepto = `‘${cfg.concepto}’`;
  const ciclo = `${dt.dias} días${dt.desde && dt.hasta ? `, del ${dt.desde} al ${dt.hasta}` : ''}`;
  let apertura, cuerpo;
  if (d.estado === 'confirma') {
    apertura = `En atención a la validación anterior, ESSA confirma el concepto de la cuenta N.° ${cta}, debido a que el consumo registrado superó el límite del 110 % de la meta de consumo aplicable al ciclo (${obsEntero(dt.consumo)} kWh frente a un límite de ${obsKwh(p.limite)} kWh en un ciclo de ${ciclo}).`;
    cuerpo = `El cobro correspondiente al concepto ${concepto}, por la suma de ${obsPesos(d.valorValidado)}, se mantiene y su falta de pago no dará lugar a la suspensión del servicio de energía eléctrica.`;
  } else if (d.estado === 'accede') {
    const cmp = p.comparacion === 'iguala' ? 'fue igual al' : 'no superó el';
    apertura = `En atención a la validación anterior, ESSA accede a la solicitud de la cuenta N.° ${cta}, debido a que el consumo registrado (${obsEntero(dt.consumo)} kWh) ${cmp} límite del 110 % de la meta de consumo aplicable al ciclo (${obsMeta(dt.metaDiaria)} kWh/día × ${dt.dias} días × 1,10 = ${obsKwh(p.limite)} kWh), por lo que no existe consumo excedente objeto de cobro.`;
    cuerpo = `El cobro correspondiente al concepto ${concepto}${d.valorRetirado === null ? '' : `, por la suma de ${obsPesos(d.valorRetirado)},`} se retira y el valor final del concepto queda en $0. ${cfg.suspension}`;
  } else {
    const trTxt = `${obsPesosDec(p.tr)}/kWh${p.contribuye ? ` (CU de ${obsPesosDec(p.cu)}/kWh con la contribución del 20 %)` : ` (CU de ${obsPesosDec(p.cu)}/kWh)`}`;
    const dif = B - d.valorFinal;
    apertura = `En atención a la validación anterior, ESSA accede parcialmente a la solicitud de la cuenta N.° ${cta}, debido a que, aunque el consumo registrado (${obsEntero(dt.consumo)} kWh) superó el límite del 110 % de la meta de consumo aplicable al ciclo (${obsKwh(p.limite)} kWh), con un consumo excedente objeto de cobro de ${obsKwh(p.ceoc)} kWh, ${d.causa.texto}.`;
    cuerpo = `El cobro correspondiente al concepto ${concepto}, inicialmente facturado por ${obsPesos(B)}, se reliquida y queda por la suma de ${obsPesos(d.valorFinal)}, una diferencia de ${obsPesos(dif)} a favor del usuario, al aplicar (F − 1) × TR × CEOC = (${obsFactor(p.factor)} − 1) × ${obsPesosDec(p.tr)} × ${obsKwh(p.ceoc)} kWh, con F = ${obsFactor(p.factor)} (artículo 10, ${REG.tipo[dt.clase]}) y TR = ${trTxt}; el dato por corregir es ${d.causa.dato}. ${cfg.suspension}`;
  }
  return `${apertura} ${cuerpo}`;
}

/* ---------- 4) COHERENCIA: decisión · importes · texto ---------- */
/** Devuelve la lista de contradicciones (vacía si todo cuadra). Si no está vacía, la observación NO se entrega. */
export function verificarCoherencia(v, d, texto, cfg = OBS_CONFIG) {
  const pr = [], B = v.datos.valorFacturado, p = v.pasos;
  if (d.estado === 'validar') return pr;
  const monto = n => obsPesos(n);
  const dec = { confirma: ['mantenido', /confirma el concepto/], parcial: ['reliquidado', /accede parcialmente/], accede: ['retirado', /accede a la solicitud/] }[d.estado];
  if (!dec || d.tratamiento !== dec[0]) pr.push('La decisión y el tratamiento del cobro no corresponden entre sí');
  else if (!dec[1].test(texto)) pr.push('La redacción no corresponde a la decisión tomada');
  const verbos = [/confirma el concepto/, /accede parcialmente/, /accede a la solicitud/].filter(r => r.test(texto)).length;
  if (verbos !== 1) pr.push('El texto presenta más de una decisión');
  if (/\[[^\]]*\]/.test(texto)) pr.push('El texto conserva marcadores sin diligenciar');
  if (!texto.includes(`N.° ${v.cuenta}`)) pr.push('El texto no menciona la cuenta del caso');
  if (!texto.includes(cfg.concepto)) pr.push('El texto no menciona el concepto');
  if (!texto.includes('no dará lugar a la suspensión del servicio de energía eléctrica')) pr.push('El texto no conserva la condición de no suspensión');
  if (d.estado === 'confirma') {
    if (!p || !p.supera) pr.push('Se confirma el cobro, pero el consumo no supera el límite del 110 %');
    if (B === null) { if (!p || d.valorValidado !== p.valorRedondeado || d.valorFinal !== p.valorRedondeado) pr.push('El valor mantenido no coincide con el valor validado'); }
    else {
      if (d.valorValidado !== B || d.valorFinal !== B) pr.push('El valor mantenido no coincide con el valor facturado validado');
      if (p && Math.abs(p.valorBase - B) > tolPesos(B, cfg) + 1e-9) pr.push('El valor calculado difiere del facturado más de lo que permite la precisión');
    }
    if (!texto.includes(`por la suma de ${monto(d.valorValidado)}`) || /se retira|se reliquida/.test(texto)) pr.push('El texto no corresponde con el cobro que se mantiene');
  } else if (d.estado === 'parcial') {
    if (!p || !p.supera) pr.push('Se reliquida el cobro, pero el consumo no supera el límite del 110 %');
    if (B === null || !(d.valorFinal > 0 && d.valorFinal < B) || d.valorFinal !== d.valorValidado || p && d.valorFinal !== p.valorRedondeado) pr.push('El valor reliquidado no coincide con el valor validado o no es menor que el facturado');
    else if (!texto.includes(monto(B)) || !texto.includes(`queda por la suma de ${monto(d.valorFinal)}`) || !texto.includes(`una diferencia de ${monto(B - d.valorFinal)}`)) pr.push('Los importes del texto no coinciden con la reliquidación');
    if (/se mantiene|confirma el concepto|se retira/.test(texto)) pr.push('El texto contradice la reliquidación');
  } else {
    if (d.valorFinal !== 0 || d.valorValidado !== 0 || d.valorRetirado !== B) pr.push('El valor retirado no corresponde al importe facturado o el valor final no es $0');
    if (p && p.supera) pr.push('Se retira el cobro, pero el consumo supera el límite del 110 %');
    if (!/queda en \$0/.test(texto) || /se mantiene|se reliquida/.test(texto) || (B !== null && !texto.includes(`por la suma de ${monto(B)}`)) || (B === null && /por la suma de/.test(texto))) pr.push('El texto no corresponde con el cobro que se retira');
  }
  return pr;
}

/** c = { inputs, invalid, res, periodo, cuentaImagen } → resultado estructurado + texto. Punto de entrada de la pantalla y de las pruebas. */
export function observationFromCalc(c, cuenta, cfg = OBS_CONFIG) {
  const v = validarCobroAdicional(c, cuenta, cfg);
  let d = decidirCobroAdicional(v, cfg);
  let texto = redactarObservacion(v, d, cfg);
  const incoh = verificarCoherencia(v, d, texto, cfg);
  if (incoh.length) {   // nunca se entrega un texto contradictorio con los cálculos
    d = Object.assign(decidirCobroAdicional({ ...v, faltantes: ['(coherencia)'] }, cfg), { inconsistencias: incoh.map(x => 'Inconsistencia interna: ' + x) });
    texto = redactarObservacion({ ...v, faltantes: [] }, d, cfg);
  }
  const p = v.pasos, B = v.datos.valorFacturado;
  return {
    estado: d.estado, etiqueta: OBS_ETIQUETA[d.estado], tratamiento: d.tratamiento, texto,
    // resultado estructurado
    decision: { estado: d.estado, tratamiento: d.tratamiento, comparacion: d.comparacion, valorFacturado: B, valorValidado: d.valorValidado, valorFinal: d.valorFinal, valorRetirado: d.valorRetirado,
      diferencia: d.diferencia, diferenciaRedondeo: d.diferenciaRedondeo, tolerancia: d.tolerancia, causa: d.causa, motivo: d.motivo },
    datos: v.datos, pasos: p, verificaciones: v.verificaciones, detalle: detalleValidacion(v, d),
    faltantes: v.faltantes, inconsistencias: [...v.inconsistencias, ...d.inconsistencias], advertencias: v.advertencias,
    // compatibilidad con la pantalla
    valorFinal: d.valorFinal, periodo: c.periodo || null,
    calculo: p && d.valorValidado !== null ? { metaCiclo: p.metaPeriodo, limite: p.limite, excedente: p.ceoc, valorUnitario: p.valorUnitario, valorCalculado: p.valorBase, valorValidado: d.valorValidado, valorFacturado: B, diferencia: B === null ? null : d.valorValidado - B } : null
  };
}
/** Detalle verificable (para la pantalla): cada paso con su operación. */
function detalleValidacion(v, d) {
  const p = v.pasos, dt = v.datos; if (!p) return [];
  const L = [['Cuenta', dt.cuenta], ['Periodo', dt.periodo ? `${dt.periodo}${dt.desde && dt.hasta ? ` (${dt.desde} a ${dt.hasta})` : ''} · ${dt.dias} días` : `${dt.dias} días`],
    ['Meta del periodo', `${obsMeta(dt.metaDiaria)} × ${dt.dias} = ${obsKwh(p.metaPeriodo)} kWh`], ['Límite del 110 %', `${obsKwh(p.metaPeriodo)} × 1,10 = ${obsKwh(p.limite)} kWh`],
    ['Consumo registrado', `${obsEntero(dt.consumo)} kWh · ${{ supera: 'supera el límite', iguala: 'es igual al límite', inferior: 'está por debajo del límite' }[p.comparacion]}`],
    ['CEOC', `máx(0; ${obsEntero(dt.consumo)} − ${obsKwh(p.limite)}) = ${obsKwh(p.ceoc)} kWh`],
    ['Factor F', `${obsFactor(p.factor)} (art. 10)`], ['TR', `${obsPesosDec(p.tr)}/kWh`],
    ['Cobro (F − 1) × TR × CEOC', `${obsFactor(p.factorMenos1)} × ${obsPesosDec(p.tr)} × ${obsKwh(p.ceoc)} = ${obsPesosDec(p.valorFormula)}`]];
  if (d && d.valorValidado !== null) {
    L.push(['Valor validado (redondeado al peso)', obsPesos(d.valorValidado)]);
    if (dt.valorFacturado !== null) L.push(['Valor facturado', obsPesos(dt.valorFacturado)]);
    if (d.diferencia !== null) L.push(['Diferencia (validado − facturado)', `${d.diferencia < 0 ? '−' : ''}${obsPesos(Math.abs(d.diferencia))}`]);
    if (d.diferenciaRedondeo) L.push(['Redondeo', `El cobro calculado (${obsPesosDec(p.valorBase)}) difiere ${obsPesosDec(Math.abs(d.diferenciaRedondeo))} del facturado: es redondeo al peso, no un error (tolerancia ${obsPesosDec(d.tolerancia)})`]);
  }
  return L;
}
/** Datos del caso → observación (para pruebas y otras pantallas). d.valorFacturado y d.cuentaImagen son opcionales. */
export function generarObservacionConsumo(model, d) {
  const num = v => (v === undefined || v === null || v === '' || (typeof v === 'number' && !isFinite(v))) ? null : v;
  const inputs = { C5: num(d.clase), C6: num(d.metaDiaria), C7: num(d.dias), F5: num(d.consumo), F6: num(d.cu), F17: num(d.valorFacturado) === null ? '' : d.valorFacturado };
  const invalid = validateCalcInputs(model, inputs);
  return observationFromCalc({ inputs, invalid, res: calculateResults(model, inputs, invalid), cuentaImagen: d.cuentaImagen || null,
    periodo: { periodo: d.periodo ?? null, periodoDesde: d.periodoDesde ?? null, periodoHasta: d.periodoHasta ?? null } }, d.cuenta);
}
