import type { Record as EssaRecord } from '@/types/record';
import { getExcelCellValue } from '@/utils/excelParser';
import { formatDateToSpanish } from '@/utils/businessDays';

function readRecordField(record: EssaRecord, keys: string[]): string {
  const value = getExcelCellValue(record, keys);
  return value === undefined || value === null ? '' : String(value).trim();
}

export function isValidReferenciaValue(v: string): boolean {
  if (!v) return false;
  const t = v.trim();
  if (!t || t === '—') return false;
  const lower = t.toLowerCase();
  return lower !== 'null' && lower !== 'undefined';
}

/** Título: primera letra de cada palabra en mayúscula, resto en minúscula. */
export function toTitleCaseReferencia(value: string): string {
  const collapsed = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!collapsed) return '';
  return collapsed.toLowerCase().replace(/(^\p{L}|\s\p{L}|-\p{L})/gu, (m) => m.toUpperCase());
}

/** Oración: primera letra en mayúscula, resto en minúscula (respeta números y símbolos). */
export function toSentenceCaseReferencia(value: string): string {
  const collapsed = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!collapsed) return '';
  const lower = collapsed.toLowerCase();
  return lower.replace(/^\P{L}*\p{L}/u, (m) => m.toUpperCase());
}

/** Normalización ligera al editar: solo correos a minúsculas, respeta la edición libre. */
export function normalizeReferenciaEmails(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => {
      if (!line.includes('@')) return line;
      return line
        .split(/(\s+)/)
        .map((tok) => (tok.includes('@') ? tok.toLowerCase() : tok))
        .join('');
    })
    .join('\n');
}

/**
 * Construye el campo Referencia del modal "Gestionar datos para radicar" / "Enviar a Radicar".
 * Aplica formato solo al texto generado, sin mutar el registro original.
 */
export function buildReferencia(record: EssaRecord | null): string {
  if (!record) return '';
  const nombreRaw = readRecordField(record, [
    'nombreSolicitante',
    'NOMBRE_SOLICITANTE',
    'NOMBRE SOLICITANTE',
  ]);
  const direccionRaw = readRecordField(record, [
    'direccionSolicitante',
    'DIRECCION_SOLICITANTE',
    'DIRECCION SOLICITANTE',
  ]);
  const municipioRaw = readRecordField(record, [
    'municipioSolicitante',
    'MUNICIPIO_SOLICITANTE',
    'MUNICIPIO SOLICITANTE',
  ]);
  const deptoRaw = readRecordField(record, [
    'departamentoSolicitante',
    'DEPARTAMENTO_SOLICITANTE',
    'DEPARTAMENTO SOLICITANTE',
    'DEPTO_SOLICITANTE',
    'DEPTO SOLICITANTE',
  ]);
  const telefonoRaw = readRecordField(record, [
    'celularSolicitante',
    'CELULAR_SOLICITANTE',
    'CELULAR SOLICITANTE',
    'TELEFONO_SOLICITANTE',
    'TELEFONO SOLICITANTE',
    'telefonoSolicitante',
  ]);
  const correoRaw = readRecordField(record, [
    'correoSolicitante',
    'CORREO_SOLICITANTE',
    'CORREO SOLICITANTE',
  ]);
  const cuentaRaw = readRecordField(record, [
    'numeroCuenta',
    'cuenta',
    'NUMERO_CUENTA',
    'NUMERO CUENTA',
  ]);
  const procesoRaw = readRecordField(record, ['numeroProceso', 'NUMERO_PROCESO', 'NUMERO PROCESO']);
  const radicadoRaw = readRecordField(record, [
    'radicadoEntrada',
    'RADICADO_ENTRADA',
    'RADICADO ENTRADA',
  ]);
  const fechaRaw = readRecordField(record, [
    'fechaSolicitud',
    'FECHA_SOLICITUD',
    'FECHA SOLICITUD',
  ]);

  const lines: string[] = [];
  if (isValidReferenciaValue(nombreRaw)) lines.push(toTitleCaseReferencia(nombreRaw));
  // Si la dirección contiene '@' es un correo mal ubicado: se omite para no duplicar correos.
  if (isValidReferenciaValue(direccionRaw) && !direccionRaw.includes('@'))
    lines.push(toSentenceCaseReferencia(direccionRaw));
  if (isValidReferenciaValue(municipioRaw)) lines.push(toSentenceCaseReferencia(municipioRaw));
  if (isValidReferenciaValue(deptoRaw)) lines.push(toSentenceCaseReferencia(deptoRaw));
  if (isValidReferenciaValue(telefonoRaw)) lines.push(telefonoRaw.trim());
  if (isValidReferenciaValue(correoRaw)) lines.push(correoRaw.trim().toLowerCase());

  // Fecha en formato largo en español: "17 de agosto de 2026".
  // Si no se puede parsear, se conserva el valor original.
  const fechaFormateada = formatDateToSpanish(fechaRaw) || fechaRaw.trim();

  lines.push('');
  lines.push(
    `Citación para notificación personal Cuenta No. ${cuentaRaw.trim()} Id. ${procesoRaw.trim()}`.trim()
  );
  lines.push(`Radicado número ${radicadoRaw.trim()} del ${fechaFormateada}`.trim());
  return lines.join('\n');
}
