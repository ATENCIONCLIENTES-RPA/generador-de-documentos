/**
 * Utilidades de texto y XML — adaptación directa de `PRUEBA CONSUMO SERVICIO MERCURIO.py`
 * Mantiene la misma lógica de limpieza, escapado y construcción de elementos,
 * pero en TypeScript reutilizable.
 */
import { MERCURIO_CONFIG } from './config';

/**
 * Limpia texto eliminando separadores Mercurio, <br>, normalizando saltos
 * y eliminando caracteres no válidos para XML.
 * Equivalente a `limpiar_texto` en Python.
 */
export function limpiarTexto(valor: unknown): string {
  if (valor == null) return '';
  let texto = String(valor);

  // Normalizar separadores Mercurio
  const separadores = [
    '&amp;amp;amp;#13;&amp;amp;amp;#10;',
    '&amp;amp;#13;&amp;amp;#10;',
    '&amp;#13;&amp;#10;',
    '&#13;&#10;',
    '&amp;#13;\n&amp;#10;',
  ];
  for (const sep of separadores) {
    texto = texto.split(sep).join('\n');
  }
  texto = texto.replace(/<br\s*\/?>/gi, '\n').replace(/&lt;br\s*\/?&gt;/gi, '\n');
  texto = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Filtrar caracteres no válidos para XML 1.0
  const caracteresValidos: string[] = [];
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0) ?? 0;
    if (
      caracter === '\n' ||
      caracter === '\t' ||
      (codigo >= 32 && codigo <= 55295) ||
      (codigo >= 57344 && codigo <= 65533) ||
      (codigo >= 65536 && codigo <= 1114111)
    ) {
      caracteresValidos.push(caracter);
    }
  }

  const lineas = caracteresValidos
    .join('')
    .split('\n')
    .map((l) => l.trim());
  const resultado: string[] = [];
  let anteriorVacia = false;
  for (const linea of lineas) {
    const actualVacia = linea === '';
    if (actualVacia && anteriorVacia) continue;
    resultado.push(linea);
    anteriorVacia = actualVacia;
  }
  return resultado.join('\n').trim();
}

/**
 * Escapa texto para XML y opcionalmente convierte saltos a `&#13;&#10;`.
 * Equivalente a `preparar_xml` en Python.
 */
export function prepararXml(valor: unknown, convertirSaltos = false): string {
  const texto = limpiarTexto(valor);
  const escapar = (linea: string): string =>
    linea
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  if (!convertirSaltos) return escapar(texto);
  return texto.split('\n').map(escapar).join(MERCURIO_CONFIG.separador);
}

/**
 * Crea un elemento `<ext:nombre>valor</ext:nombre>` con validación.
 * Equivalente a `crear_elemento_ext` en Python.
 */
export function crearElementoExt(
  nombre: string,
  valor: unknown,
  obligatorio = false,
  convertirSaltos = false
): string {
  const valorLimpio = limpiarTexto(valor);
  if (!valorLimpio) {
    if (obligatorio) throw new Error(`El campo obligatorio '${nombre}' no tiene valor.`);
    return '';
  }
  const valorXml = prepararXml(valorLimpio, convertirSaltos);
  return `<ext:${nombre}>${valorXml}</ext:${nombre}>`;
}

/**
 * Valida que el XML sea bien formado usando DOMParser.
 * Equivalente a `validar_xml` en Python (lxml).
 */
export function validarXml(xml: string, nombreOperacion: string): void {
  // En navegador usamos DOMParser; en Node (tests) también está disponible vía jsdom
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(
      `El XML generado para ${nombreOperacion} no es válido. Detalle: ${parserError.textContent}`
    );
  }
}
