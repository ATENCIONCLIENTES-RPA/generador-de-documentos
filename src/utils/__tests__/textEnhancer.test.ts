import { describe, it, expect } from 'vitest';
import { improveText, correctWord } from '@/utils/textEnhancer';

describe('textEnhancer — nspell y corrección ortográfica / gramatical', () => {
  it('corrige palabras individuales con tildes y errores tipográficos comunes', () => {
    expect(correctWord('revision')).toBe('revisión');
    expect(correctWord('Revision')).toBe('Revisión');
    expect(correctWord('facturacion')).toBe('facturación');
    expect(correctWord('clinte')).toBe('cliente');
    expect(correctWord('solisitud')).toBe('solicitud');
    expect(correctWord('energia')).toBe('energía');
    expect(correctWord('electrica')).toBe('eléctrica');
  });

  it('corrige espaciado, puntuación y mayúsculas en oraciones completas', () => {
    const raw = 'el usuario solicita revision del medidor , no esta de acuerdo con la facturacion .';
    const enhanced = improveText(raw);
    expect(enhanced).toBe('El usuario solicita revisión del medidor, no está de acuerdo con la facturación.');
  });

  it('convierte texto completamente en MAYÚSCULAS a formato de oración legible', () => {
    const raw = 'EL CLIENTE SOLICITA REVISION TECNICA DE SU MEDIDOR POR COBRO EXCESIVO DE ENERGIA ELECTRICA';
    const enhanced = improveText(raw);
    expect(enhanced).toBe('El cliente solicita revisión técnica de su medidor por cobro excesivo de energía eléctrica');
  });

  it('preserva siglas y términos técnicos en mayúsculas (ESSA, SAC, PQR, NIT, kWh, etc.)', () => {
    const raw = 'se radica pqr ante essa para el predio con nit 123456 y consumo de 150 kwh .';
    const enhanced = improveText(raw);
    expect(enhanced).toBe('Se radica PQR ante ESSA para el predio con NIT 123456 y consumo de 150 kWh.');
  });

  it('maneja múltiples oraciones capitalizando cada una después del punto', () => {
    const raw = 'primera oracion sin tilde en atencion . segunda oracion con peticion . tercera oracion .';
    const enhanced = improveText(raw);
    expect(enhanced).toBe('Primera oración sin tilde en atención. Segunda oración con petición. Tercera oración.');
  });

  it('retorna texto vacío o en blanco sin fallos', () => {
    expect(improveText('')).toBe('');
    expect(improveText('   ')).toBe('   ');
  });
});
