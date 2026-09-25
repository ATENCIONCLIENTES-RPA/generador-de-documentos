import { describe, it, expect } from 'vitest';
import {
  improveText,
  correctWord,
  ensureFullDictionary,
  repairCorruptToken,
} from '@/utils/textEnhancer';

describe('textEnhancer — nspell y corrección ortográfica / gramatical', { timeout: 20000 }, () => {
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
    const raw =
      'el usuario solicita revision del medidor , no esta de acuerdo con la facturacion .';
    const enhanced = improveText(raw);
    expect(enhanced).toBe(
      'El usuario solicita revisión del medidor, no está de acuerdo con la facturación.'
    );
  });

  it('convierte texto completamente en MAYÚSCULAS a formato de oración legible', () => {
    const raw =
      'EL CLIENTE SOLICITA REVISION TECNICA DE SU MEDIDOR POR COBRO EXCESIVO DE ENERGIA ELECTRICA';
    const enhanced = improveText(raw);
    expect(enhanced).toBe(
      'El cliente solicita revisión técnica de su medidor por cobro excesivo de energía eléctrica.'
    );
  });

  it('preserva siglas y términos técnicos en mayúsculas (ESSA, SAC, PQR, NIT, kWh, etc.)', () => {
    const raw = 'se radica pqr ante essa para el predio con nit 123456 y consumo de 150 kwh .';
    const enhanced = improveText(raw);
    expect(enhanced).toBe(
      'Se radica PQR ante ESSA para el predio con NIT 123456 y consumo de 150 kWh.'
    );
  });

  it('maneja múltiples oraciones capitalizando cada una después del punto', () => {
    const raw =
      'primera oracion sin tilde en atencion . segunda oracion con peticion . tercera oracion .';
    const enhanced = improveText(raw);
    expect(enhanced).toBe(
      'Primera oración sin tilde en atención. Segunda oración con petición. Tercera oración.'
    );
  });

  it('retorna texto vacío o en blanco sin fallos', () => {
    expect(improveText('')).toBe('');
    expect(improveText('   ')).toBe('   ');
  });

  it('corrige el caso principal con codificación dañada y segmenta oraciones', async () => {
    await ensureFullDictionary();
    const raw =
      'Buenos d¿as muy cordialmente solicitamos la exenci¿n de contribuci¿n de energ¿a muchas gracias.';
    expect(improveText(raw)).toBe(
      'Buenos días. Muy cordialmente, solicitamos la exención de contribución de energía. Muchas gracias.'
    );
  });

  it('repara mojibake y caracteres corruptos con el diccionario general', async () => {
    await ensureFullDictionary();
    expect(correctWord('exencion')).toBe('exención');
    expect(correctWord('contribucion')).toBe('contribución');
    expect(improveText('solicitamos la exencion del cobro')).toBe(
      'Solicitamos la exención del cobro.'
    );
  });

  it('corrige letras faltantes con distancia de edición real', async () => {
    await ensureFullDictionary();
    expect(correctWord('solictud')).toBe('solicitud');
    expect(improveText('el usuario presenta la solictud de revision')).toBe(
      'El usuario presenta la solicitud de revisión.'
    );
  });

  it('preserva correos, códigos con dígitos, siglas y nombres propios', async () => {
    await ensureFullDictionary();
    expect(
      improveText('escribir a juan.perez@essa.com.co cuenta 874521 radicado FPSAC069 kwh')
    ).toBe('Escribir a juan.perez@essa.com.co cuenta 874521 radicado FPSAC069 kWh.');
    // Nombre propio capitalizado no se convierte en palabra común
    expect(correctWord('Vargas')).toBe('Vargas');
  });

  it('repairCorruptToken resuelve comodines con el diccionario', async () => {
    await ensureFullDictionary();
    expect(repairCorruptToken('d¿as')).toBe('días');
    expect(repairCorruptToken('energ¿a')).toBe('energía');
    // Sin letras a su alrededor no se toca (signo legítimo)
    expect(repairCorruptToken('¿Cómo')).toBe('¿Cómo');
  });

  it('separa saludo y despedida y cierra con punto final', async () => {
    await ensureFullDictionary();
    expect(improveText('buenos días solicitamos ayuda')).toBe('Buenos días. Solicitamos ayuda.');
    expect(improveText('el cobro es excesivo muchas gracias')).toBe(
      'El cobro es excesivo. Muchas gracias.'
    );
  });
});
