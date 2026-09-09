/**
 * Manejo de archivos — adaptación de `cargar_archivo_base64` de Python
 * para trabajar con `File`/`Blob` del navegador en lugar de `Path`.
 */

/**
 * Convierte un `File`/`Blob` a base64.
 * Retorna { base64, fileName } o lanza error si el archivo es inválido.
 */
export async function fileToBase64(
  file: File | Blob
): Promise<{ base64: string; fileName: string }> {
  if (!file) throw new Error('No se proporcionó archivo.');
  if (file.size === 0)
    throw new Error(`El archivo está vacío: ${(file as File).name || 'desconocido'}`);

  const buffer = await fileToArrayBuffer(file);
  const bytes = new Uint8Array(buffer);
  // Convertir a base64 sin bloquear el hilo para archivos grandes
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);
  const fileName = (file as File).name || 'documento.pdf';
  return { base64, fileName };
}

async function fileToArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  if (
    typeof (file as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer ===
    'function'
  ) {
    return await (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
  }
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Valida que un archivo sea PDF (por tipo o extensión).
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Genera fecha de indexación en formato `YYYY-MM-DDTHH:mm:ss`
 * Equivalente a `obtener_fecha_indexacion` en Python.
 */
export function obtenerFechaIndexacion(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
