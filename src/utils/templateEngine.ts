import PizZip from 'pizzip';
import { TemplateHandler, MimeType } from 'easy-template-x';
import type { Record as EssaRecord } from '@/types/record';
import type { Profile } from '@/types/profile';
import { extractFirstName, formatApplicantName } from './nameParser';
import { formatDateToSpanish } from './businessDays';

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

export function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------
// TemplateData helpers
// ---------------------------------------------------------------------------

export interface TemplateData {
  [key: string]: string | number | boolean | Uint8Array | null | undefined | unknown;
}

export function buildTemplateData(record: EssaRecord, profile?: Profile | null): TemplateData {
  const rawName = (record?.nombreSolicitante as string) || '';
  const primerNombre = extractFirstName(rawName) || '—';
  const nombreNormalizado = formatApplicantName(rawName) || '—';
  const cuenta = (record?.numeroCuenta as string) || (record?.cuenta as string) || '';
  const fechaSolicitudEspanol =
    formatDateToSpanish(record?.fechaSolicitud) || (record?.fechaSolicitud as string) || '—';
  const fechaRadSalidaHoy = formatDateToSpanish(new Date()) || '—';

  const data: TemplateData = {
    NOMBRE_SOLICITANTE: nombreNormalizado,
    PRIMER_NOMBRE: primerNombre,
    RADICADO_ENTRADA: (record?.radicadoEntrada as string) || '—',
    RADICADO_SALIDA:
      (record?.['RADICADO_SALIDA'] as string) || (record?.radicadoSalida as string) || '—',
    NUMERO_PROCESO: (record?.numeroProceso as string) || '—',
    FECHA_SOLICITUD: fechaSolicitudEspanol,
    FECHA_RAD_SALIDA: fechaRadSalidaHoy,
    NUMERO_CUENTA: cuenta || '—',
    CORREO_SOLICITANTE: (record?.correoSolicitante as string) || '—',
    DIRECCION_SOLICITANTE: (record?.direccionSolicitante as string) || '—',
    CEDULA_SOLICITANTE: (record?.cedulaSolicitante as string) || '—',
    TELEFONO_SOLICITANTE:
      (record?.['celularSolicitante'] as string) ||
      (record?.['CELULAR_SOLICITANTE'] as string) ||
      '—',
    CELULAR_SOLICITANTE: (record?.['celularSolicitante'] as string) || '—',
    MUNICIPIO_SOLICITANTE: (record?.municipioSolicitante as string) || '—',
    DEPARTAMENTO_SOLICITANTE:
      (record?.departamentoSolicitante as string) ||
      (record?.['DEPTO_SOLICITANTE'] as string) ||
      '—',
    DEPTO_SOLICITANTE: (record?.departamentoSolicitante as string) || '—',
    BARRIO_SOLICITANTE: (record?.['barrioSolicitante'] as string) || '—',
    MEDIO_SOLICITUD: (record?.['medioSolicitud'] as string) || '—',
    NOMBRE_SUSCRIPTOR: (record?.['nombreSuscriptor'] as string) || '—',
    CEDULA_SUSCRIPTOR: (record?.['cedulaSuscriptor'] as string) || '—',
    TELEFONO_SUSCRIPTOR: (record?.['telefonoSuscriptor'] as string) || '—',
    DIRECCION_SUSCRIPTOR: (record?.['direccionSuscriptor'] as string) || '—',
    MUNICIPIO_SUSCRIPTOR: (record?.['municipioSuscriptor'] as string) || '—',
    OBSERVACION_PROCESO: (record?.['observacionProceso'] as string) || '—',
    OBSERVACION_DECISION: (record?.['observacionDecision'] as string) || '—',
    CIRCUITO: (record?.['circuito'] as string) || '—',
    NOMBRE_CIRCUITO: (record?.['nombreCircuito'] as string) || '—',
    ID_TRAFO: (record?.['idTrafo'] as string) || '—',
    NUMERO_MEDIDOR: (record?.['numeroMedidor'] as string) || '—',
    MARCA_MEDIDOR: (record?.['marcaMedidor'] as string) || '—',
    TIPO_MEDIDOR: (record?.['tipoMedidor'] as string) || '—',
    DIAS_REGISTRO: (record?.['diasRegistro'] as string) || '—',
    NUMERO_REVISION: (record?.['numeroRevision'] as string) || '—',
    ESTADO_REVISION: (record?.['estadoRevision'] as string) || '—',
    TIPO_REVISION: (record?.['tipoRevision'] as string) || '—',
    DESCRIPCION_MOTIVO: (record?.['descripcionMotivo'] as string) || '—',
    NOMBRE_FIRMANTE: profile?.name || 'Funcionario ESSA',
    CARGO_FIRMANTE: profile?.position || 'Gestor ESSA',
    CORREO_FIRMANTE: profile?.email || 'notificaciones@essa.com.co',
    // FIRMA_DOCUMENTO handled separately as image or empty string
    FIRMA_DOCUMENTO: '',
  };

  // Spread dynamic record fields as fallback for any extra [VARIABLE] not in list
  // Only add upper snake keys that don't already exist
  for (const [k, v] of Object.entries(record as globalThis.Record<string, unknown>)) {
    const upper = k.toUpperCase();
    if (data[upper] === undefined && v !== undefined && v !== null) {
      const str = String(v).trim();
      if (str !== '') data[upper] = str;
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// replaceTemplateVariables — string-only helper (for preview/sampleContent)
// ---------------------------------------------------------------------------

export function replaceTemplateVariables(
  content: string | null | undefined,
  record: EssaRecord,
  profile?: Profile | null
): string {
  if (!content) return '';
  const rawName = (record?.nombreSolicitante as string) || '';
  const primerNombre = extractFirstName(rawName);
  const nombreNormalizado = formatApplicantName(rawName);
  const cuenta = (record?.numeroCuenta as string) || (record?.cuenta as string) || '';
  const fechaSolicitudEspanol =
    formatDateToSpanish(record?.fechaSolicitud) || (record?.fechaSolicitud as string) || '—';
  const fechaRadSalidaHoy = formatDateToSpanish(new Date()) || '—';

  return content
    .replace(/\[NOMBRE_SOLICITANTE\]/g, nombreNormalizado || '—')
    .replace(/\[PRIMER_NOMBRE\]/g, primerNombre || '—')
    .replace(/\[RADICADO_ENTRADA\]/g, (record?.radicadoEntrada as string) || '—')
    .replace(
      /\[RADICADO_SALIDA\]/g,
      (record?.['RADICADO_SALIDA'] as string) || (record?.radicadoSalida as string) || '—'
    )
    .replace(/\[NUMERO_PROCESO\]/g, (record?.numeroProceso as string) || '—')
    .replace(/\[FECHA_SOLICITUD\]/g, fechaSolicitudEspanol)
    .replace(/\[FECHA_RAD_SALIDA\]/g, fechaRadSalidaHoy)
    .replace(/\[NUMERO_CUENTA\]/g, cuenta || '—')
    .replace(/\[CORREO_SOLICITANTE\]/g, (record?.correoSolicitante as string) || '—')
    .replace(/\[DIRECCION_SOLICITANTE\]/g, (record?.direccionSolicitante as string) || '—')
    .replace(/\[CEDULA_SOLICITANTE\]/g, (record?.cedulaSolicitante as string) || '—')
    .replace(
      /\[TELEFONO_SOLICITANTE\]/g,
      (record?.['celularSolicitante'] as string) ||
        (record?.['CELULAR_SOLICITANTE'] as string) ||
        '—'
    )
    .replace(/\[CELULAR_SOLICITANTE\]/g, (record?.['celularSolicitante'] as string) || '—')
    .replace(/\[MUNICIPIO_SOLICITANTE\]/g, (record?.municipioSolicitante as string) || '—')
    .replace(
      /\[DEPARTAMENTO_SOLICITANTE\]/g,
      (record?.departamentoSolicitante as string) ||
        (record?.['DEPTO_SOLICITANTE'] as string) ||
        '—'
    )
    .replace(/\[DEPTO_SOLICITANTE\]/g, (record?.departamentoSolicitante as string) || '—')
    .replace(/\[BARRIO_SOLICITANTE\]/g, (record?.['barrioSolicitante'] as string) || '—')
    .replace(/\[MEDIO_SOLICITUD\]/g, (record?.['medioSolicitud'] as string) || '—')
    .replace(/\[NOMBRE_SUSCRIPTOR\]/g, (record?.['nombreSuscriptor'] as string) || '—')
    .replace(/\[CEDULA_SUSCRIPTOR\]/g, (record?.['cedulaSuscriptor'] as string) || '—')
    .replace(/\[TELEFONO_SUSCRIPTOR\]/g, (record?.['telefonoSuscriptor'] as string) || '—')
    .replace(/\[DIRECCION_SUSCRIPTOR\]/g, (record?.['direccionSuscriptor'] as string) || '—')
    .replace(/\[MUNICIPIO_SUSCRIPTOR\]/g, (record?.['municipioSuscriptor'] as string) || '—')
    .replace(/\[OBSERVACION_PROCESO\]/g, (record?.['observacionProceso'] as string) || '—')
    .replace(/\[OBSERVACION_DECISION\]/g, (record?.['observacionDecision'] as string) || '—')
    .replace(/\[CIRCUITO\]/g, (record?.['circuito'] as string) || '—')
    .replace(/\[NOMBRE_CIRCUITO\]/g, (record?.['nombreCircuito'] as string) || '—')
    .replace(/\[ID_TRAFO\]/g, (record?.['idTrafo'] as string) || '—')
    .replace(/\[NUMERO_MEDIDOR\]/g, (record?.['numeroMedidor'] as string) || '—')
    .replace(/\[MARCA_MEDIDOR\]/g, (record?.['marcaMedidor'] as string) || '—')
    .replace(/\[TIPO_MEDIDOR\]/g, (record?.['tipoMedidor'] as string) || '—')
    .replace(/\[DIAS_REGISTRO\]/g, (record?.['diasRegistro'] as string) || '—')
    .replace(/\[NUMERO_REVISION\]/g, (record?.['numeroRevision'] as string) || '—')
    .replace(/\[ESTADO_REVISION\]/g, (record?.['estadoRevision'] as string) || '—')
    .replace(/\[TIPO_REVISION\]/g, (record?.['tipoRevision'] as string) || '—')
    .replace(/\[DESCRIPCION_MOTIVO\]/g, (record?.['descripcionMotivo'] as string) || '—')
    .replace(/\[NOMBRE_FIRMANTE\]/g, profile?.name || 'Funcionario ESSA')
    .replace(/\[CARGO_FIRMANTE\]/g, profile?.position || 'Gestor ESSA')
    .replace(/\[CORREO_FIRMANTE\]/g, profile?.email || 'notificaciones@essa.com.co')
    .replace(/\[FIRMA_DOCUMENTO\]/g, '');
}

// ---------------------------------------------------------------------------
// Blob helpers
// ---------------------------------------------------------------------------

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const maybe = blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof maybe.arrayBuffer === 'function') {
    return await maybe.arrayBuffer();
  }
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(blob);
  });
}

function detectMimeType(blob: Blob, bytes: Uint8Array): MimeType {
  const t = (blob.type || '').toLowerCase();
  if (t.includes('png')) return MimeType.Png;
  if (t.includes('jpeg') || t.includes('jpg')) return MimeType.Jpeg;
  if (t.includes('gif')) return MimeType.Gif;
  if (t.includes('bmp')) return MimeType.Bmp;
  if (t.includes('svg')) return MimeType.Svg;
  // sniff magic bytes
  if (bytes.length >= 8) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
      return MimeType.Png;
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return MimeType.Jpeg;
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return MimeType.Gif;
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) return MimeType.Bmp;
  }
  return MimeType.Png;
}

function isProfileLike(v: unknown): v is Profile {
  return !!v && typeof v === 'object' && 'name' in (v as globalThis.Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// generateDocx
// ---------------------------------------------------------------------------

export async function generateDocx(
  templateFile: File,
  data: TemplateData | EssaRecord,
  opts?: { signatureBlob?: Blob } | Profile | null
): Promise<Blob> {
  if (!templateFile) throw new Error('templateFile is required');

  // Resolve overloads:
  // - generateDocx(file, record, profile)
  // - generateDocx(file, templateData, { signatureBlob })
  // - generateDocx(file, templateData)
  let templateData: TemplateData;
  let signatureBlob: Blob | undefined;

  if (
    opts &&
    isProfileLike(opts) &&
    !('signatureBlob' in (opts as unknown as globalThis.Record<string, unknown>))
  ) {
    // second arg is EssaRecord, third is Profile
    templateData = buildTemplateData(data as EssaRecord, opts as Profile);
  } else {
    // data is already TemplateData (or EssaRecord treated as TemplateData)
    // If data looks like EssaRecord (has nombreSolicitante), convert via builder for safety,
    // unless it already contains upper keys like NOMBRE_SOLICITANTE
    const hasUpperKey = Object.keys(data as globalThis.Record<string, unknown>).some(
      (k) => k === k.toUpperCase() && k.includes('_')
    );
    if ((data as EssaRecord).nombreSolicitante !== undefined && !hasUpperKey) {
      templateData = buildTemplateData(data as EssaRecord, null);
    } else {
      templateData = { ...(data as TemplateData) };
    }
    if (
      opts &&
      typeof opts === 'object' &&
      'signatureBlob' in (opts as unknown as globalThis.Record<string, unknown>)
    ) {
      signatureBlob = (opts as { signatureBlob?: Blob }).signatureBlob ?? undefined;
      // allow profile inside opts? not needed
    }
  }

  // Handle signature as image plugin content if blob provided
  if (signatureBlob) {
    try {
      const imageBuffer = await blobToArrayBuffer(signatureBlob);
      const bytes = new Uint8Array(imageBuffer);
      const mime = detectMimeType(signatureBlob, bytes);
      // easy-template-x image plugin expects width/height in pixels
      // 5×2 cm ≈ 189×76 px @96dpi → use 190×75 to match DrawingML 1800000×720000 EMUs (9525 per px)
      const widthPx = 190;
      const heightPx = 75;
      const source: ArrayBuffer = imageBuffer;
      (templateData as globalThis.Record<string, unknown>)['FIRMA_DOCUMENTO'] = {
        _type: 'image',
        source,
        format: mime,
        width: widthPx,
        height: heightPx,
        altText: 'Firma',
      };
    } catch (e) {
      console.error('Failed to process signatureBlob, falling back to empty', e);
      (templateData as globalThis.Record<string, unknown>)['FIRMA_DOCUMENTO'] = '';
    }
  } else {
    // Ensure FIRMA_DOCUMENTO is at least empty string if not image, to avoid leaving marker
    if (templateData['FIRMA_DOCUMENTO'] === undefined || templateData['FIRMA_DOCUMENTO'] === null) {
      templateData['FIRMA_DOCUMENTO'] = '';
    }
  }

  // Ensure every placeholder resolves to '—' when missing — via scopeDataResolver + fallback
  const handler = new TemplateHandler({
    delimiters: { tagStart: '[', tagEnd: ']' },
    scopeDataResolver: (args: unknown) => {
      const a = args as {
        data: globalThis.Record<string, unknown>;
        strPath: string[];
        path: unknown[];
      };
      const lastKey = a.strPath[a.strPath.length - 1] ?? '';
      // try direct lookup in current scope data, then global templateData
      let val: unknown = undefined;
      if (a.data && lastKey in a.data)
        val = (a.data as globalThis.Record<string, unknown>)[lastKey];
      if (val === undefined && lastKey in (templateData as globalThis.Record<string, unknown>)) {
        val = (templateData as globalThis.Record<string, unknown>)[lastKey];
      }
      // Preserve image objects, handle missing string values
      if (
        val !== null &&
        typeof val === 'object' &&
        (val as globalThis.Record<string, unknown>)._type
      ) {
        return val as unknown as string;
      }
      if (val === null || val === undefined || val === '') return '—';
      return val as unknown as string;
    },
  });

  const templateBuffer = await blobToArrayBuffer(templateFile as unknown as Blob);

  let processedBuffer: ArrayBuffer;
  try {
    const out = await handler.process(
      templateBuffer,
      templateData as unknown as globalThis.Record<string, unknown> as unknown as Parameters<
        typeof handler.process
      >[1]
    );
    // handler.process exports same binary type as input (ArrayBuffer -> ArrayBuffer)
    if ((out as unknown) instanceof ArrayBuffer) {
      processedBuffer = out as ArrayBuffer;
    } else if ((out as unknown) instanceof Blob) {
      processedBuffer = await blobToArrayBuffer(out as unknown as Blob);
    } else if ((out as unknown) instanceof Uint8Array) {
      // Fallback if handler unexpectedly returns Uint8Array (e.g., node Buffer is Uint8Array)
      const u8 = out as unknown as Uint8Array;
      processedBuffer = u8.buffer.slice(
        u8.byteOffset,
        u8.byteOffset + u8.byteLength
      ) as ArrayBuffer;
    } else {
      // Generic fallback
      processedBuffer = out as unknown as ArrayBuffer;
    }
  } catch (e) {
    console.error('TemplateHandler.process failed, applying fallback regex', e);
    // fallback: raw pizzip manipulation
    processedBuffer = templateBuffer;
  }

  // Fallback cleanup: ensure NO remaining [VARIABLE] markers in any xml part.
  // We load with PizZip and scrub remaining markers via paragraph-combined replacement
  // and direct marker -> '—' replacement for headers/footers.
  try {
    const zip = new PizZip(new Uint8Array(processedBuffer));

    const scrubXml = (xml: string): string => {
      // Strategy: combine paragraph texts, replace any remaining [VAR] via templateData or '—'
      // This handles split markers across w:t nodes.
      let outXml = xml.replace(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g, (paraContent: string) => {
        const texts: string[] = [];
        paraContent.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_m: string, t: string) => {
          texts.push(t);
          return '';
        });
        const combined = texts.join('');
        const markers = combined.match(/\[[A-Z0-9_]+\]/g);
        if (!markers || markers.length === 0) return paraContent;

        // Build replacement map
        let replaced = combined;
        for (const marker of markers) {
          const key = marker.slice(1, -1);
          const val = (templateData as globalThis.Record<string, unknown>)[key];
          let rep: string;
          if (val !== undefined && val !== null && val !== '' && typeof val !== 'object') {
            rep = escapeXml(String(val));
          } else if (
            typeof val === 'object' &&
            val !== null &&
            (val as globalThis.Record<string, unknown>)._type === 'image'
          ) {
            // image already handled by easy-template-x, this shouldn't happen in fallback
            rep = '';
          } else {
            rep = '—';
          }
          replaced = replaced.split(marker).join(rep);
        }

        // Also handle any leftover generic [VAR] not in our map -> '—'
        replaced = replaced.replace(/\[[A-Z0-9_]+\]/g, '—');
        // Escape the replaced combined text already escaped above; but we pre-escaped vals so keep as is.
        // However replaced contains '—' which is safe; no need to escape again.

        // Write replaced text to first w:t, empty the rest
        let idx = 0;
        return paraContent.replace(
          /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g,
          (_m: string, open: string, _text: string, close: string) => {
            if (idx === 0) {
              idx++;
              return open + replaced + close;
            }
            return open + close;
          }
        );
      });

      // Final sweep: any remaining literal markers (outside paragraphs, e.g. headers fallback)
      outXml = outXml.replace(/\[[A-Z0-9_]+\]/g, '—');
      return outXml;
    };

    const xmlFiles = Object.keys(zip.files).filter(
      (n) => n === 'word/document.xml' || n.startsWith('word/header') || n.startsWith('word/footer')
    );

    for (const fname of xmlFiles) {
      const file = zip.file(fname);
      if (!file) continue;
      const xml = file.asText();
      if (!xml.includes('[')) continue;
      // Only scrub if markers present to avoid unnecessary rewrite
      const hasMarker = /\[[A-Z0-9_]+\]/.test(xml);
      if (!hasMarker) continue;
      const cleaned = scrubXml(xml);
      zip.file(fname, cleaned);
    }

    const outBuf = zip.generate({ type: 'arraybuffer' }) as ArrayBuffer;
    return new Blob([outBuf], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  } catch (e) {
    console.error('Fallback scrub failed', e);
    return new Blob([processedBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
}
