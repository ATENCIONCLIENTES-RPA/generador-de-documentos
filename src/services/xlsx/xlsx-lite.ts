// @ts-nocheck — lector XLSX legado, sin cambios de lógica. Sin dependencias del DOM: corre en hilo principal o Web Worker.
/* Movido desde Módulo 2 (Cuadro de Mando) sin cambios de lógica: ahora es el único lector XLSX del Asistente. */
/* XLSXLite — lector XLSX sin dependencias externas.
   Usa DecompressionStream nativo del navegador. */
export const XLSXLite = (function () {

  const dv = b => new DataView(b.buffer, b.byteOffset, b.byteLength);
  /** Instancia compartida y reutilizable: TextDecoder UTF-8 es stateless. */
  const _utf8 = new TextDecoder('utf-8');

  async function unzip(buf) {
    const u8 = new Uint8Array(buf), v = dv(u8);
    let eocd = -1;
    for (let i = u8.length - 22; i >= 0 && i > u8.length - 66000; i--) {
      if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('El archivo no es un XLSX válido (ZIP no reconocido).');
    let cdOff = v.getUint32(eocd + 16, true);
    let cdCnt = v.getUint16(eocd + 10, true);

    if (cdOff === 0xFFFFFFFF || cdCnt === 0xFFFF) {
      for (let i = eocd - 20; i >= 0; i--) {
        if (v.getUint32(i, true) === 0x07064b50) {
          const z64 = Number(v.getBigUint64(i + 8, true));
          cdCnt = Number(v.getBigUint64(z64 + 32, true));
          cdOff = Number(v.getBigUint64(z64 + 48, true));
          break;
        }
      }
    }

    const files = {};
    let p = cdOff;
    for (let n = 0; n < cdCnt && p + 46 <= u8.length; n++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      const method = v.getUint16(p + 10, true);
      let csize = v.getUint32(p + 20, true);
      let usize = v.getUint32(p + 24, true);
      const fnLen = v.getUint16(p + 28, true);
      const exLen = v.getUint16(p + 30, true);
      const cmLen = v.getUint16(p + 32, true);
      let lho = v.getUint32(p + 42, true);
      const name = _utf8.decode(u8.subarray(p + 46, p + 46 + fnLen));

      if (usize === 0xFFFFFFFF || csize === 0xFFFFFFFF || lho === 0xFFFFFFFF) {
        let e = p + 46 + fnLen, end = e + exLen;
        while (e + 4 <= end) {
          const hid = v.getUint16(e, true), hsz = v.getUint16(e + 2, true);
          if (hid === 0x0001) {
            let q = e + 4;
            if (usize === 0xFFFFFFFF) { usize = Number(v.getBigUint64(q, true)); q += 8; }
            if (csize === 0xFFFFFFFF) { csize = Number(v.getBigUint64(q, true)); q += 8; }
            if (lho === 0xFFFFFFFF) { lho = Number(v.getBigUint64(q, true)); q += 8; }
            break;
          }
          e += 4 + hsz;
        }
      }
      files[name] = { method, csize, lho };
      p += 46 + fnLen + exLen + cmLen;
    }

    async function read(name) {
      const f = files[name];
      if (!f) return null;
      const lfn = v.getUint16(f.lho + 26, true);
      const lex = v.getUint16(f.lho + 28, true);
      const start = f.lho + 30 + lfn + lex;
      const raw = u8.subarray(start, start + f.csize);
      if (f.method === 0) return _utf8.decode(raw);
      if (f.method !== 8) throw new Error('Compresión ZIP no soportada (método ' + f.method + ').');
      if (typeof DecompressionStream === 'undefined')
        throw new Error('Tu navegador no soporta DecompressionStream. Usa Edge o Chrome actualizado.');
      const ds = new DecompressionStream('deflate-raw');
      const stream = new Blob([raw]).stream().pipeThrough(ds);
      return await new Response(stream).text();
    }
    return { names: Object.keys(files), read };
  }

  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  function unesc(s) {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (m, c) => {
      if (c[0] === '#') return String.fromCodePoint(c[1] === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10));
      return ENT[c] ?? m;
    });
  }

  /* IMPORTANTE (alineación de columnas): Excel escribe los elementos vacíos como autocerrados
     (<c r="H3" s="1"/>, <row .../>, <si/>, <t/>). Con "[^>]*>" el "/" final se tomaba como
     atributo y se tragaba el elemento SIGUIENTE (valores desplazados de columna). */
  const reTexto = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
  function textoDe(body) {
    if (!body) return '';
    const limpio = body.indexOf('<rPh') < 0 ? body : body.replace(/<rPh\b[^>]*?(?:\/>|>[\s\S]*?<\/rPh>)/g, '');
    let s = '', t;
    reTexto.lastIndex = 0;
    while ((t = reTexto.exec(limpio)) !== null) s += t[1] || '';
    return unesc(s);
  }

  function parseShared(xml) {
    const out = [];
    if (!xml) return out;
    const re = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
    let m;
    while ((m = re.exec(xml)) !== null) out.push(textoDe(m[1] || ''));
    return out;
  }

  const FECHA_STD = new Set([14,15,16,17,18,19,20,21,22,27,30,36,45,46,47,50,57]);
  function parseEstilos(xml) {
    const esFecha = [];
    if (!xml) return esFecha;
    const custom = {};
    const rn = /<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g;
    let m;
    while ((m = rn.exec(xml)) !== null) {
      const code = unesc(m[2]).replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, '');
      custom[+m[1]] = /[ymdhs]/i.test(code) && !/^[@#0.,%\s]*$/.test(code);
    }
    const bloque = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
    if (!bloque) return esFecha;
    const rx = /<xf\b[^>]*?numFmtId="(\d+)"[^>]*?>|<xf\b[^>]*?numFmtId="(\d+)"[^>]*?\/>/g;
    while ((m = rx.exec(bloque[1])) !== null) {
      const id = +(m[1] ?? m[2]);
      esFecha.push(FECHA_STD.has(id) || custom[id] === true);
    }
    return esFecha;
  }

  function serialAFecha(n) {
    if (!isFinite(n)) return null;
    const d = new Date(Math.round((n - 25569) * 86400000));
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
                    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  }

  const colIdx = ref => {
    let n = 0;
    for (let i = 0; i < ref.length; i++) {
      const c = ref.charCodeAt(i);
      if (c < 65 || c > 90) break;
      n = n * 26 + (c - 64);
    }
    return n - 1;
  };

  function parseHoja(xml, shared, esFecha, quiero) {
    const filas = [];
    let encabezado = null, idxWanted = null;
    const reRow = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g;
    const reCel = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let mr;

    while ((mr = reRow.exec(xml)) !== null) {
      const cuerpo = mr[1] || '';
      const celdas = [];
      let mc;
      reCel.lastIndex = 0;
      while ((mc = reCel.exec(cuerpo)) !== null) {
        const attrs = mc[1], inner = mc[2] || '';
        const mRef = /r="([A-Z]+)/.exec(attrs);
        const ci = mRef ? colIdx(mRef[1]) : celdas.length;
        if (idxWanted && !idxWanted.has(ci)) continue;

        const mT = /t="([^"]+)"/.exec(attrs);
        const tipo = mT ? mT[1] : 'n';
        let val = null;

        if (tipo === 'inlineStr') {
          val = textoDe(inner);
        } else {
          const mv = /<v>([\s\S]*?)<\/v>/.exec(inner);
          if (mv) {
            const crudo = mv[1];
            if (tipo === 's') val = shared[+crudo] ?? '';
            else if (tipo === 'str' || tipo === 'e') val = unesc(crudo);
            else if (tipo === 'b') val = crudo === '1';
            else if (tipo === 'd') val = new Date(crudo);
            else {
              const n = parseFloat(crudo);
              const ms = /s="(\d+)"/.exec(attrs);
              const fmt = ms ? esFecha[+ms[1]] : false;
              val = (fmt && n > 0) ? serialAFecha(n) : n;
            }
          }
        }
        celdas[ci] = val;
      }

      if (!encabezado) {
        if (!celdas.some(c => c != null && String(c).trim() !== '')) continue;   /* filas vacías previas al encabezado */
        encabezado = celdas.map(c => (c == null ? '' : String(c).trim()));
        if (quiero && quiero.length) {
          idxWanted = new Set();
          encabezado.forEach((h, i) => { if (quiero.includes(h)) idxWanted.add(i); });
          if (!idxWanted.size) idxWanted = null;
        }
        continue;
      }
      const obj = {};
      let vacia = true;
      for (let i = 0; i < encabezado.length; i++) {
        const k = encabezado[i];
        if (!k) continue;
        if (idxWanted && !idxWanted.has(i)) continue;
        const v = celdas[i];
        obj[k] = v === undefined ? null : v;
        if (v !== undefined && v !== null && v !== '') vacia = false;
      }
      if (!vacia) filas.push(obj);
    }
    return filas;
  }

  async function leer(arrayBuffer, columnasDeseadas) {
    const zip = await unzip(arrayBuffer);
    const shared = parseShared(await zip.read('xl/sharedStrings.xml'));
    const esFecha = parseEstilos(await zip.read('xl/styles.xml'));

    let hoja = 'xl/worksheets/sheet1.xml';
    const wb = await zip.read('xl/workbook.xml');
    const rels = await zip.read('xl/_rels/workbook.xml.rels');
    if (wb && rels) {
      const ms = /<sheet\b[^>]*r:id="([^"]+)"/.exec(wb);
      if (ms) {
        const mr = new RegExp('Id="' + ms[1] + '"[^>]*Target="([^"]+)"').exec(rels);
        if (mr) {
          const t = mr[1].replace(/^\/?xl\//, '').replace(/^\//, '');
          if (zip.names.includes('xl/' + t)) hoja = 'xl/' + t;
        }
      }
    }
    if (!zip.names.includes(hoja)) hoja = zip.names.find(n => /^xl\/worksheets\/.*\.xml$/.test(n));
    if (!hoja) throw new Error('No se encontró ninguna hoja de cálculo en el archivo.');

    return parseHoja(await zip.read(hoja), shared, esFecha, columnasDeseadas);
  }

  return { leer };
})();
