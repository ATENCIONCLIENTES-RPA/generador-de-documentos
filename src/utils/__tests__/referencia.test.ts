import { describe, it, expect } from 'vitest';
import {
  buildReferencia,
  toTitleCaseReferencia,
  toSentenceCaseReferencia,
  normalizeReferenciaEmails,
  isValidReferenciaValue,
} from '@/utils/referencia';
import type { Record as EssaRecord } from '@/types/record';

describe('referencia utility — buildReferencia and formatting', () => {
  it('toTitleCaseReferencia capitaliza la primera letra de cada palabra', () => {
    expect(toTitleCaseReferencia('ana maría gómez')).toBe('Ana María Gómez');
    expect(toTitleCaseReferencia('CARLOS ALBERTO PEREZ')).toBe('Carlos Alberto Perez');
  });

  it('toSentenceCaseReferencia capitaliza solo la primera letra', () => {
    expect(toSentenceCaseReferencia('calle 10 # 20-30')).toBe('Calle 10 # 20-30');
    expect(toSentenceCaseReferencia('CARRERA 15 # 45-20')).toBe('Carrera 15 # 45-20');
  });

  it('normalizeReferenciaEmails convierte correos a minúsculas conservando el resto', () => {
    const text = 'Nombre: Juan\nCorreo: JUAN.PEREZ@EXAMPLE.COM\nCiudad: Bucaramanga';
    const normalized = normalizeReferenciaEmails(text);
    expect(normalized).toContain('juan.perez@example.com');
    expect(normalized).toContain('Nombre: Juan');
  });

  it('isValidReferenciaValue valida correctamente valores no nulos ni vacíos', () => {
    expect(isValidReferenciaValue('texto')).toBe(true);
    expect(isValidReferenciaValue('')).toBe(false);
    expect(isValidReferenciaValue('—')).toBe(false);
    expect(isValidReferenciaValue('null')).toBe(false);
    expect(isValidReferenciaValue('undefined')).toBe(false);
  });

  it('buildReferencia arma la estructura completa de notificación personal', () => {
    const record: Partial<EssaRecord> = {
      nombreSolicitante: 'MARIA PAULA GOMEZ',
      direccionSolicitante: 'CLL 28 # 58-80',
      municipioSolicitante: 'BUCARAMANGA',
      departamentoSolicitante: 'SANTANDER',
      celularSolicitante: '3101234567',
      correoSolicitante: 'MARIA@EXAMPLE.COM',
      numeroCuenta: '12345678',
      numeroProceso: 'PROC-999',
      radicadoEntrada: '20260320045286',
      fechaSolicitud: '2026-08-17',
    };

    const ref = buildReferencia(record as EssaRecord);
    expect(ref).toContain('Maria Paula Gomez');
    expect(ref).toContain('Cll 28 # 58-80');
    expect(ref).toContain('Bucaramanga');
    expect(ref).toContain('Santander');
    expect(ref).toContain('3101234567');
    expect(ref).toContain('maria@example.com');
    expect(ref).toContain('Citación para notificación personal Cuenta No. 12345678 Id. PROC-999');
    expect(ref).toContain('Radicado número 20260320045286');
  });
});
