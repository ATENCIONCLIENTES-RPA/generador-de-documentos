import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import {
  generateDocx,
  replaceTemplateVariables,
  escapeXml,
  buildTemplateData,
} from '../templateEngine';
import { parseDocxFile, extractTemplateVariables, fileToTemplate } from '../docxHelpers';
import type { Record } from '@/types/record';
import type { Profile } from '@/types/profile';

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const maybe = blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof maybe.arrayBuffer === 'function') return await maybe.arrayBuffer();
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(blob);
  });
}

function fixtureFile(name: string): File {
  const p = path.resolve('tests/fixtures', name);
  const buf = fs.readFileSync(p);
  // Node 20 File supports Blob parts
  return new File([buf], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const baseRecord: Record = {
  rowId: 'row_0_123',
  id: 1,
  status: 'Pendiente',
  selected: true,
  fechaSolicitud: '27/08/2026',
  fechaVencimiento: '27/09/2026',
  numeroProceso: 'PRC-2025-0891',
  radicadoEntrada: 'RAD-2025-01452',
  nombreSolicitante: 'CARRILLO PALACIO JUAN CARLOS',
  cedulaSolicitante: '91.245.890',
  direccionSolicitante: 'Carrera 27 # 45-12',
  departamentoSolicitante: 'Santander',
  municipioSolicitante: 'Bucaramanga',
  correoSolicitante: 'juan@example.com',
  numeroCuenta: '3001458921',
  cuenta: '3001458921',
};

const baseProfile: Profile = {
  name: 'Jaime Arley Rizo Morales',
  position: 'Técnico',
  email: 'notificaciones@essa.com.co',
};

describe('templateEngine', () => {
  it('genera docx sin marcadores residuales (incluye PRIMER_NOMBRE fix)', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const blob = await generateDocx(file, baseRecord, baseProfile);
    expect(blob).toBeInstanceOf(Blob);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const xml = zip.file('word/document.xml')!.asText();
    // No remaining [VARIABLE] markers
    expect(xml).not.toMatch(/\[[A-Z0-9_]+\]/);
    // Also check stripped text has no brackets
    const stripped = xml.replace(/<[^>]+>/g, '');
    expect(stripped).not.toMatch(/\[[A-Z_]+\]/);
  });

  it('reemplaza correctamente valores y primer nombre calculado', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    // Use a known name where primer nombre is deterministically Juan
    const blob = await generateDocx(file, baseRecord, baseProfile);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const xml = zip.file('word/document.xml')!.asText();
    const stripped = xml.replace(/<[^>]+>/g, '');
    // baseRecord nombre is CARRILLO PALACIO JUAN CARLOS -> primer nombre Juan, full normalized Juan Carlos Carrillo Palacio
    expect(stripped).toContain('Juan');
    expect(stripped).toContain('RAD-2025-01452');
    expect(stripped).toContain('3001458921');
    expect(stripped).toContain('Jaime Arley Rizo Morales');
  });

  it('usa — como nullGetter para valores faltantes y no deja marcadores', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const emptyRecord: Record = {
      rowId: 'row_1_123',
      id: 2,
      status: 'Pendiente',
      selected: true,
      fechaSolicitud: '',
      fechaVencimiento: '',
      numeroProceso: '',
      radicadoEntrada: '',
      nombreSolicitante: '',
      cedulaSolicitante: '',
      direccionSolicitante: '',
      departamentoSolicitante: '',
      municipioSolicitante: '',
      correoSolicitante: '',
      numeroCuenta: '',
    };
    const blob = await generateDocx(file, emptyRecord, baseProfile);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).not.toMatch(/\[[A-Z0-9_]+\]/);
    const stripped = xml.replace(/<[^>]+>/g, '');
    expect(stripped).toContain('—');
  });

  it('maneja firma como imagen DrawingML 5x2cm si signatureBlob provisto', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const pngBytes = Uint8Array.from(Buffer.from(pngBase64, 'base64'));
    const sigBlob = new Blob([pngBytes], { type: 'image/png' });
    const blob = await generateDocx(file, baseRecord, { signatureBlob: sigBlob });
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).not.toMatch(/\[FIRMA_DOCUMENTO\]/);
    expect(xml).toContain('w:drawing');
    expect(xml).toContain('wp:inline');
  });

  it('sin firma elimina marcador sin dejar rastro', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const blob = await generateDocx(file, baseRecord, baseProfile);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).not.toContain('[FIRMA_DOCUMENTO]');
    // Should not contain empty drawing if no signature
    // But should still be valid and not contain brackets
    expect(xml).not.toMatch(/\[[A-Z_]+\]/);
  });

  it('escapeXml y xml escaping en valores ( & < > )', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const specialRecord: Record = {
      ...baseRecord,
      nombreSolicitante: 'Pérez & Gómez <Test>',
      radicadoEntrada: 'RAD-<001>&"test"',
    };
    const blob = await generateDocx(file, specialRecord, baseProfile);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).not.toMatch(/\[[A-Z0-9_]+\]/);
    // xml should be well-formed, escaped entities present
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    // stripped text after decoding entities should contain original fragments (allow normalization reordering)
    const stripped = xml
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
    expect(stripped).toContain('Gómez');
    expect(stripped).toContain('RAD-');
  });

  it('procesa headers/footers sin dejar marcadores', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const blob = await generateDocx(file, baseRecord, baseProfile);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const headerNames = Object.keys(zip.files).filter((n) => n.startsWith('word/header'));
    for (const h of headerNames) {
      const xml = zip.file(h)!.asText();
      expect(xml).not.toMatch(/\[[A-Z0-9_]+\]/);
    }
  });

  it('replaceTemplateVariables helper funciona y limpia FIRMA_DOCUMENTO', () => {
    const content =
      'Hola [PRIMER_NOMBRE] de [NOMBRE_SOLICITANTE] radicado [RADICADO_ENTRADA] firma [FIRMA_DOCUMENTO]';
    const out = replaceTemplateVariables(content, baseRecord, baseProfile);
    expect(out).not.toMatch(/\[[A-Z_]+\]/);
    expect(out).toContain('Juan');
    expect(out).toContain('Juan Carlos Carrillo Palacio');
    expect(out).toContain('RAD-2025-01452');
    expect(out).not.toContain('[FIRMA_DOCUMENTO]');
    // FIRMA_DOCUMENTO replaced with empty string
    expect(out).not.toContain('FIRMA');
  });

  it('escapeXml escapa caracteres', () => {
    expect(escapeXml('a & b <c> "d" \'e\'')).toBe(
      'a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;'
    );
  });

  it('buildTemplateData mapea correctamente', () => {
    const td = buildTemplateData(baseRecord, baseProfile);
    expect(td['NOMBRE_SOLICITANTE']).toBe('Juan Carlos Carrillo Palacio');
    expect(td['PRIMER_NOMBRE']).toBe('Juan');
    expect(td['NUMERO_CUENTA']).toBe('3001458921');
    expect(td['NOMBRE_FIRMANTE']).toBe(baseProfile.name);
    expect(td['FECHA_SOLICITUD']).toBe('27 de agosto de 2026');
  });

  it('soporta generateDocx con TemplateData flat + opts signature', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede 2.docx');
    const td = buildTemplateData(baseRecord, baseProfile);
    const blob = await generateDocx(file, td as unknown as Record);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    const stripped = zip
      .file('word/document.xml')!
      .asText()
      .replace(/<[^>]+>/g, '');
    expect(stripped).toContain('Juan');
    expect(stripped).not.toMatch(/\[[A-Z_]+\]/);
  });
});

describe('docxHelpers', () => {
  it('extractTemplateVariables detecta variables', () => {
    const vars = extractTemplateVariables(
      'Hola [NOMBRE_SOLICITANTE] y [PRIMER_NOMBRE] [NUMERO_CUENTA]'
    );
    expect(vars.map((v) => v.key)).toEqual(
      expect.arrayContaining(['NOMBRE_SOLICITANTE', 'PRIMER_NOMBRE', 'NUMERO_CUENTA'])
    );
    expect(vars.find((v) => v.key === 'FIRMA_DOCUMENTO')?.type).toBeUndefined();
  });

  it('extractTemplateVariables maneja FIRMA_DOCUMENTO y FECHA', () => {
    const vars = extractTemplateVariables('[FIRMA_DOCUMENTO] [FECHA_SOLICITUD]');
    expect(vars.find((v) => v.key === 'FIRMA_DOCUMENTO')?.type).toBe('Imagen');
    expect(vars.find((v) => v.key === 'FECHA_SOLICITUD')?.type).toBe('Fecha');
  });

  it('parseDocxFile extrae texto del fixture', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const text = await parseDocxFile(file);
    expect(text).toContain('[NOMBRE_SOLICITANTE]');
    expect(text).toContain('[PRIMER_NOMBRE]');
    expect(text.length).toBeGreaterThan(100);
  });

  it('fileToTemplate construye Template', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede.docx');
    const tpl = await fileToTemplate(file, 0);
    expect(tpl.fileName).toBe('Bloqueodecuenta_Electronico_Accede.docx');
    expect(tpl.variables.length).toBeGreaterThan(0);
    expect(tpl.variables.map((v) => v.key)).toContain('NOMBRE_SOLICITANTE');
    expect(tpl.sampleContent).toContain('[NOMBRE_SOLICITANTE]');
    expect(tpl.id).toMatch(/^tpl-file-0-/);
  });

  it('segundo fixture también válido', async () => {
    const file = fixtureFile('Bloqueodecuenta_Electronico_Accede 2.docx');
    const text = await parseDocxFile(file);
    const vars = extractTemplateVariables(text);
    expect(vars.length).toBeGreaterThan(0);
    const blob = await generateDocx(file, baseRecord, baseProfile);
    const buf = await blobToArrayBuffer(blob);
    const zip = new PizZip(new Uint8Array(buf));
    expect(zip.file('word/document.xml')!.asText()).not.toMatch(/\[[A-Z0-9_]+\]/);
  });
});
