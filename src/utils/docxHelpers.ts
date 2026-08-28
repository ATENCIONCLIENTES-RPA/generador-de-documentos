import PizZip from 'pizzip';
import type { Template, Variable } from '@/types/template';

// ---------------------------------------------------------------------------
// Helpers: Blob -> Uint8Array
// ---------------------------------------------------------------------------

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const maybe = blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> };
  let buffer: ArrayBuffer;
  if (typeof maybe.arrayBuffer === 'function') {
    buffer = await maybe.arrayBuffer();
  } else {
    buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsArrayBuffer(blob);
    });
  }
  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// parseDocxFile — extract plain text from docx (joined w:t per paragraph)
// ---------------------------------------------------------------------------

export async function parseDocxFile(file: File): Promise<string> {
  try {
    const bytes = await blobToUint8Array(file as unknown as Blob);
    const zip = new PizZip(bytes);
    const docFile = zip.file('word/document.xml');
    if (!docFile) return '';
    const xml = docFile.asText();

    // Fast path: strip tags and join paragraphs with newline
    // We parse paragraphs to preserve line breaks similar to legacy DOMParser approach
    const paragraphs: string[] = [];
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pRegex.exec(xml)) !== null) {
      const paraXml = pMatch[1] ?? '';
      const texts: string[] = [];
      const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tRegex.exec(paraXml)) !== null) {
        // Unescape xml entities if needed (basic)
        let t = tMatch[1] ?? '';
        t = t
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        texts.push(t);
      }
      if (texts.length > 0) paragraphs.push(texts.join(''));
    }

    // If no paragraphs found, fallback to stripping all tags
    if (paragraphs.length === 0) {
      return xml.replace(/<[^>]+>/g, '').trim();
    }

    return paragraphs.join('\n').trim();
  } catch (err) {
    console.warn('parseDocxFile failed', (file as File)?.name, err);
    return '';
  }
}

// ---------------------------------------------------------------------------
// extractTemplateVariables — find [VARIABLE] markers
// ---------------------------------------------------------------------------

const VAR_LABELS: Record<string, string> = {
  NOMBRE_SOLICITANTE: 'Nombre Solicitante',
  PRIMER_NOMBRE: 'Primer Nombre',
  RADICADO_ENTRADA: 'Radicado de Entrada',
  NUMERO_PROCESO: 'Número de Proceso',
  FECHA_SOLICITUD: 'Fecha de Solicitud',
  NUMERO_CUENTA: 'Número de Cuenta',
  CORREO_SOLICITANTE: 'Correo Solicitante',
  DIRECCION_SOLICITANTE: 'Dirección Solicitante',
  CEDULA_SOLICITANTE: 'Cédula Solicitante',
  TELEFONO_SOLICITANTE: 'Teléfono Solicitante',
  CELULAR_SOLICITANTE: 'Celular Solicitante',
  MUNICIPIO_SOLICITANTE: 'Municipio Solicitante',
  DEPTO_SOLICITANTE: 'Departamento Solicitante',
  BARRIO_SOLICITANTE: 'Barrio Solicitante',
  MEDIO_SOLICITUD: 'Medio Solicitud',
  NOMBRE_SUSCRIPTOR: 'Nombre Suscriptor',
  CEDULA_SUSCRIPTOR: 'Cédula Suscriptor',
  TELEFONO_SUSCRIPTOR: 'Teléfono Suscriptor',
  DIRECCION_SUSCRIPTOR: 'Dirección Suscriptor',
  MUNICIPIO_SUSCRIPTOR: 'Municipio Suscriptor',
  OBSERVACION_PROCESO: 'Observación Proceso',
  OBSERVACION_DECISION: 'Observación Decisión',
  CIRCUITO: 'Circuito',
  NOMBRE_CIRCUITO: 'Nombre Circuito',
  ID_TRAFO: 'ID Trafo',
  NUMERO_MEDIDOR: 'Número Medidor',
  MARCA_MEDIDOR: 'Marca Medidor',
  TIPO_MEDIDOR: 'Tipo Medidor',
  DIAS_REGISTRO: 'Días Registro',
  NUMERO_REVISION: 'Número Revisión',
  ESTADO_REVISION: 'Estado Revisión',
  TIPO_REVISION: 'Tipo Revisión',
  DESCRIPCION_MOTIVO: 'Descripción Motivo',
  NOMBRE_FIRMANTE: 'Nombre del Firmante',
  CARGO_FIRMANTE: 'Cargo del Firmante',
  CORREO_FIRMANTE: 'Correo del Firmante',
  FIRMA_DOCUMENTO: 'Firma del Documento',
};

const VAR_SOURCES: Record<string, string> = {
  NOMBRE_SOLICITANTE: 'Excel',
  PRIMER_NOMBRE: 'Calculado',
  RADICADO_ENTRADA: 'Excel',
  NUMERO_PROCESO: 'Excel',
  FECHA_SOLICITUD: 'Excel',
  NUMERO_CUENTA: 'Excel',
  CORREO_SOLICITANTE: 'Excel',
  DIRECCION_SOLICITANTE: 'Excel',
  CEDULA_SOLICITANTE: 'Excel',
  TELEFONO_SOLICITANTE: 'Excel',
  CELULAR_SOLICITANTE: 'Excel',
  MUNICIPIO_SOLICITANTE: 'Excel',
  DEPTO_SOLICITANTE: 'Excel',
  BARRIO_SOLICITANTE: 'Excel',
  MEDIO_SOLICITUD: 'Excel',
  NOMBRE_SUSCRIPTOR: 'Excel',
  CEDULA_SUSCRIPTOR: 'Excel',
  TELEFONO_SUSCRIPTOR: 'Excel',
  DIRECCION_SUSCRIPTOR: 'Excel',
  MUNICIPIO_SUSCRIPTOR: 'Excel',
  OBSERVACION_PROCESO: 'Excel',
  OBSERVACION_DECISION: 'Excel',
  CIRCUITO: 'Excel',
  NOMBRE_CIRCUITO: 'Excel',
  ID_TRAFO: 'Excel',
  NUMERO_MEDIDOR: 'Excel',
  MARCA_MEDIDOR: 'Excel',
  TIPO_MEDIDOR: 'Excel',
  DIAS_REGISTRO: 'Excel',
  NUMERO_REVISION: 'Excel',
  ESTADO_REVISION: 'Excel',
  TIPO_REVISION: 'Excel',
  DESCRIPCION_MOTIVO: 'Excel',
  NOMBRE_FIRMANTE: 'Perfil',
  CARGO_FIRMANTE: 'Perfil',
  CORREO_FIRMANTE: 'Perfil',
  FIRMA_DOCUMENTO: 'Firma',
};

export function extractTemplateVariables(content: string | null | undefined): Variable[] {
  if (!content) return [];
  const regex = /\[([A-Z0-9_]+)\]/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    const key = m[1];
    if (key) found.add(key);
  }
  const vars: Variable[] = [];
  for (const key of found) {
    vars.push({
      key,
      label:
        VAR_LABELS[key] ??
        key
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      type: key === 'FIRMA_DOCUMENTO' ? 'Imagen' : key === 'FECHA_SOLICITUD' ? 'Fecha' : 'Texto',
      source: VAR_SOURCES[key] ?? 'Excel',
    });
  }
  return vars;
}

// ---------------------------------------------------------------------------
// fileToTemplate — build Template from File
// ---------------------------------------------------------------------------

export async function fileToTemplate(file: File, index: number): Promise<Template> {
  const content = await parseDocxFile(file);
  const variables = extractTemplateVariables(content);
  const base = file.name.replace(/\.docx$/i, '').replace(/[_-]+/g, ' ');
  const title = base.charAt(0).toUpperCase() + base.slice(1);
  return {
    id: `tpl-file-${index}-${Date.now()}`,
    title,
    category: 'Documentos',
    description:
      variables.length > 0
        ? `Plantilla con ${variables.length} variable${variables.length !== 1 ? 's' : ''} detectada${variables.length !== 1 ? 's' : ''}`
        : 'Plantilla de documento Word',
    fileName: file.name,
    variables,
    sampleContent: content,
    file,
  };
}
