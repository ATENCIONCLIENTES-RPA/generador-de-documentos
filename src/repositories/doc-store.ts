// @ts-nocheck — lógica legada sin cambios de comportamiento; contrato tipado en src/types/doc-store.ts.
/* =====================================================================
   Asistente Documental · DocStore
   Fuente única de verdad de los documentos de trabajo.

   · Carga, valida, persiste (IndexedDB) y procesa cada archivo UNA sola vez.
   · Los módulos se suscriben al estado; ninguno vuelve a pedir los archivos.
   · Persistencia compatible con lo que el Módulo 1 ya guardaba
     (BD "essa-modulo1", almacén "recursos", mismo formato de registro).
   · El procesamiento XLSX usa XLSXLite (movido desde el Módulo 2).
   ===================================================================== */
import { xlsxReader } from '../services/xlsx/xlsx-reader';
import { DataRepository } from './data-repository';

/* El lector XLSX se obtiene del servicio (Web Worker con respaldo en el hilo principal). */
const XLSX = xlsxReader;
const global: any = typeof window !== 'undefined' ? window : globalThis;

  /* ------------------------- Configuración ------------------------- */
  const COLS_SAC = ['NUMERO_CUENTA','NUMERO_PROCESO','PROCESO','DESCRIPCION_PROCESO','DESCRIPCION_TIPO_PROCESO',
    'TIPO_TRAMITE','FECHA_SOLICITUD','FECHA_VENCIMIENTO','FECHA_REGISTRO_PROCESO','MEDIO_SOLICITUD',
    'NOMBRE_USUARIO_INICIAL_PROCESO','NOMBRE_SOLICITANTE','NOMBRE_SUSCRIPTOR','MUNICIPIO_SUSCRIPTOR',
    'MUNICIPIO_SOLICITANTE','SUBESTADO','ESTADO_FIN_INICIAL','RADICADO_ENTRADA','RADICADO_SALIDA',
    'ULTIMA_ACCION_TRAMITE','ULTIMA_ACCION_FINALIZADA','USUARIO_RESPONSABLE_REVISION','OBSERVACION_REVISION',
    'ESTADO_REVISION','FECHA_REVISION','FECHA_PROGRAMACION_REVISION','NUMERO_REVISION','DESCRIPCION_MOTIVO','OBSERVACION_PROCESO','CEDULA_SOLICITANTE',
    'TIPO_RESPUESTA','FECHA_SOLICITUD','TIPO_PERSONA','TIPO_SOLICITANTE','NATURALEZA_PERSONA','NATURALEZA_SOLICITANTE','PERSONA_NATURAL_JURIDICA','TIPO_IDENTIFICACION','TIPO_DOCUMENTO','TIPO_DOCUMENTO_SOLICITANTE','NIT','RAZON_SOCIAL','PRIMER_NOMBRE','NOMBRE_1','NOMBRE1','NOMBRES','NOMBRES_SOLICITANTE','PRIMER_APELLIDO','APELLIDO_1','APELLIDO1','SEGUNDO_APELLIDO','APELLIDO_2','APELLIDO2','DIRECCION_SOLICITANTE','DIRECCION_SUSCRIPTOR','DIRECCION','DEPARTAMENTO_SOLICITANTE','DEPARTAMENTO_SUSCRIPTOR','DEPARTAMENTO','CORREO_SOLICITANTE','CORREO_SUSCRIPTOR','CORREO','EMAIL','OBSERVACION_DECISION',
    /* Módulo 3: Departamento -> DEPTO_SOLICITANTE; [TELEFONO_SOLICITANTE] -> CELULAR_SOLICITANTE */
    'DEPTO_SOLICITANTE','CELULAR_SOLICITANTE',
    /* Módulo 2 · Histórico: cierre y estado del proceso */
    'DESCRIPCION_CLASIFICACION','ESTADO_PROCESO',
    /* Detalle del radicado · Detalles de la cuenta: suscriptor, facturación y datos técnicos */
    'CEDULA_SUSCRIPTOR','TELEFONO_SUSCRIPTOR','CELULAR_SUSCRIPTOR','BARRIO_SUSCRIPTOR','DEPTO_SUSCRIPTOR','ZONA_SUSCRIPTOR',
    'CICLO','AREA','TARIFA','CLASE_SERVICIO','ESTRATO','MEDIDA_TENSION','ESTADO_CLIENTE','NUMERO_FACTURA','PERIODO_FACTURA',
    'VALOR_CONGELADO_CUENTA','VALOR_RECLAMADO_CUENTA','CIRCUITO','NOMBRE_CIRCUITO','ID_TRAFO','PROPIEDAD_TRAFO',
    'NUMERO_MEDIDOR','MARCA_MEDIDOR','TIPO_MEDIDOR','ESTADO_MEDIDOR','FACTOR_MULTIPLICACION'];
  const COLS_MER = ['No. Radicado','Fecha  Radicacion','Fecha Radicacion','Fecha de Entrada','Nombre de la Ruta',
    'Refencia del Documento','Referencia del Documento','Nombre del Gestor','Nombre de la Entidad Remitente','Estado'];

  const MODULES = {
    recursos:   { id: 'recursos',   index: 1, label: 'Recursos',             title: 'Configuración de recursos' },
    cuadro:     { id: 'cuadro',     index: 2, label: 'Cuadro de mando',      title: 'Cuadro de mando' },
    documentos: { id: 'documentos', index: 3, label: 'Generación documental', title: 'Generación documental' }
  };

  const RESOURCES = {
    sac: {
      key: 'sac', label: 'SAC Trámite', short: 'SAC', description: 'Base principal de trámites',
      kind: 'xlsx', required: true, extensions: ['xlsx'], columns: COLS_SAC,
      keyColumns: ['NUMERO_PROCESO', 'RADICADO_ENTRADA'], consumers: ['cuadro'],
      note: 'Formato permitido: Libro de Excel (.xlsx).',
      sourceUrl: 'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/SAC_TRAMITE_EXCEL_COMPARTIDO?d=wc7d2ddae58bf4835affc2ac2eb9d5791&csf=1&web=1&e=bqAsz8'
    },
    plantillas: {
      key: 'plantillas', label: 'Plantillas Word', short: 'Plantillas', description: 'Carpeta con los documentos .docx',
      kind: 'folder', required: true, extensions: ['docx'], consumers: ['documentos'],
      note: 'Solo se aceptan archivos .docx en formato de plantilla.',
      sourceUrl: 'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/PLANTILAS_SOPORTE%20CLIENTES?d=wbb247310e4a14457bc93016440b8ecb0&csf=1&web=1&e=b35gs0'
    },
    mercurio: {
      key: 'mercurio', label: 'Mercurio Trámite', short: 'Mercurio', description: 'Base de correspondencia',
      kind: 'xlsx', required: false, extensions: ['xlsx'], columns: COLS_MER,
      keyColumns: ['No. Radicado'], consumers: ['cuadro'],
      note: 'Formato permitido: Libro de Excel (.xlsx).',
      sourceUrl: 'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/MERCURIO_TRAMITE_EXCEL_COMPARTIDO?d=wecd9b18ce9a0467ba0689edaca9a58c7&csf=1&web=1&e=WNkv41'
    }
  };
  const ORDER = ['sac', 'plantillas', 'mercurio'];

  /* Estados del ciclo de vida de un recurso */
  const STATUS = { EMPTY: 'empty', LOADING: 'loading', PROCESSING: 'processing', READY: 'ready', ERROR: 'error' };

  /* ------------------------- Utilidades ------------------------- */
  const ext = name => (String(name || '').match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
  const fmtDate = ms => new Date(ms || Date.now()).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const blank = key => ({ key, status: STATUS.EMPTY, file: null, rowCount: 0, error: null,
    warnings: [], persisted: null, origin: null, updatedAt: null });

  /* ------------------------- Persistencia (IndexedDB) ------------------------- */
  const DB_NAME = 'essa-modulo1', DB_VER = 1, DB_STORE = 'recursos';
  let dbPromise = null;
  function idbOpen() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error('IndexedDB no disponible'));
      const req = global.indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE, { keyPath: 'key' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(e => { dbPromise = null; throw e; });
    return dbPromise;
  }
  async function idbTx(mode, fn) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode), st = tx.objectStore(DB_STORE);
      let out; const req = fn(st); if (req) req.onsuccess = () => { out = req.result; };
      tx.oncomplete = () => resolve(out); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  const idb = {
    async set(key, value) { try { await idbTx('readwrite', st => st.put({ key, ...value })); return true; } catch (e) { console.warn('[DocStore] No se pudo guardar', key, e); return false; } },
    async get(key) { try { return (await idbTx('readonly', st => st.get(key))) || null; } catch (e) { return null; } },
    async del(key) { try { await idbTx('readwrite', st => st.delete(key)); return true; } catch (e) { return false; } }
  };

  /* ------------------------- Validaciones ------------------------- */
  function validate(key, files) {
    const cfg = RESOURCES[key];
    if (!cfg) return { ok: false, error: 'Recurso desconocido: ' + key };
    files = Array.from(files || []);
    if (!files.length) return { ok: false, error: 'No se seleccionó ningún archivo.' };
    if (cfg.kind === 'folder') {
      const docs = files.filter(f => cfg.extensions.includes(ext(f.name)) && !f.name.startsWith('~$'));
      if (!docs.length) return { ok: false, error: 'La carpeta no contiene archivos .docx' };
      return { ok: true, files: docs };
    }
    const f = files[0];
    if (ext(f.name) === 'xls') return { ok: false, error: `«${f.name}» está en formato Excel 97-2003 (.xls). Ábrelo en Excel y guárdalo como Libro de Excel (.xlsx).` };
    if (!cfg.extensions.includes(ext(f.name))) return { ok: false, error: `Formato no válido para ${cfg.label}. Usa un archivo .xlsx` };
    if (!f.size) return { ok: false, error: `«${f.name}» está vacío.` };
    return { ok: true, files: [f] };
  }

  function validateRows(cfg, rows) {
    if (!rows.length) throw new Error('El archivo no contiene registros.');
    const head = rows[0], has = c => Object.prototype.hasOwnProperty.call(head, c);
    if (cfg.keyColumns && !cfg.keyColumns.some(has)) {
      throw new Error(`No parece un archivo de ${cfg.label}: falta la columna ${cfg.keyColumns.join(' o ')}. Verifica que cargaste el archivo correcto.`);
    }
    const missing = cfg.columns.filter(c => !has(c));
    return missing.length > cfg.columns.length * 0.5 ? [`Faltan ${missing.length} columnas esperadas; algunos indicadores pueden quedar incompletos.`] : [];
  }

  /* ------------------------- Estado y eventos ------------------------- */
  const state = {}, rows = {}, blobs = {}, tokens = {};
  ORDER.forEach(k => { state[k] = blank(k); rows[k] = null; blobs[k] = null; tokens[k] = 0; });
  const listeners = new Set();
  let hydrated = false, profileState = null;
  try { profileState = JSON.parse(localStorage.getItem('essa-perfil') || 'null'); } catch (e) { profileState = null; }

  function snapshot() {
    const resources = {};
    ORDER.forEach(k => { const s = state[k]; resources[k] = Object.freeze({ ...s, file: s.file ? Object.freeze({ ...s.file }) : null, warnings: s.warnings.slice() }); });
    const profile = profileState && typeof profileState === 'object' ? Object.freeze({ ...profileState }) : null;
    return Object.freeze({ resources: Object.freeze(resources), order: ORDER.slice(), hydrated, profile });
  }
  function emit(evt) {
    const snap = snapshot();
    listeners.forEach(fn => { try { fn(snap, evt); } catch (e) {
      /* Un suscriptor roto (p. ej. un marco descargado) no afecta a los demás */
      console.warn('[DocStore] suscriptor eliminado por error:', e); listeners.delete(fn); } });
  }
  function set(key, patch, evt) {
    state[key] = { ...state[key], ...patch, updatedAt: Date.now() };
    emit({ key, ...evt });
  }
  function getProfile() { return profileState && typeof profileState === 'object' ? Object.freeze({ ...profileState }) : null; }
  function setProfile(value) {
    profileState = value && typeof value === 'object' ? { ...value } : null;
    try {
      if (DataRepository) {
        if (profileState) DataRepository.setJSON('essa-perfil', profileState); else DataRepository.removeItem('essa-perfil');
      } else if (profileState) localStorage.setItem('essa-perfil', JSON.stringify(profileState));
      else localStorage.removeItem('essa-perfil');
    } catch (e) { console.warn('[DocStore] No se pudo guardar el perfil', e); }
    emit({ key: 'perfil', type: 'profile', origin: 'user' });
    return getProfile();
  }
  /* Se ejecuta después de hidratar DataRepository para recuperar el perfil aun si
     localStorage fue limpiado pero la copia persistente de IndexedDB sigue disponible. */
  function refreshProfile() {
    try { profileState = JSON.parse(localStorage.getItem('essa-perfil') || 'null'); }
    catch (e) { profileState = null; }
    emit({ key: 'perfil', type: 'profile', origin: 'hydrate' });
    return getProfile();
  }

  /* ------------------------- Procesamiento ------------------------- */
  async function process(key, token, origin) {
    const cfg = RESOURCES[key];
    if (cfg.kind !== 'xlsx') { set(key, { status: STATUS.READY, error: null }, { type: 'ready', origin }); return; }
    set(key, { status: STATUS.PROCESSING, error: null }, { type: 'processing', origin });
    try {
      if (!XLSX) throw new Error('Lector XLSX no disponible.');
      const buf = await blobs[key].arrayBuffer();
      const data = await XLSX.leer(buf, cfg.columns);
      if (token !== tokens[key]) return;                    /* se reemplazó mientras procesaba */
      const warnings = validateRows(cfg, data);
      rows[key] = data;
      set(key, { status: STATUS.READY, rowCount: data.length, warnings, error: null }, { type: 'ready', origin });
    } catch (err) {
      if (token !== tokens[key]) return;
      rows[key] = null;
      const msg = /ZIP|XLSX válido/i.test(err.message) ? 'El archivo está dañado o no es un Excel válido (.xlsx).' : err.message;
      set(key, { status: STATUS.ERROR, rowCount: 0, error: msg }, { type: 'error', origin, error: msg });
    }
  }

  /* ---- Colección de plantillas (múltiples carpetas, acumulativas) ----
     Cada plantilla conserva su nombre de archivo REAL; nada se infiere ni se fija en código.
     id = nombre de archivo en minúsculas: si el mismo nombre aparece en dos carpetas, la carpeta
     agregada más recientemente "gana" esa plantilla (evita duplicados; criterio de identidad = nombre).
     Cada carpeta agregada queda registrada en `folderRegistry` (viva mientras el recurso tenga datos)
     y se reconstruye su conteo de plantillas a partir de los items que aún le pertenecen. */
  const tplId = fileName => String(fileName).trim().toLowerCase();
  let _folderSeq = 0;
  const nextFolderId = () => 'fld' + (++_folderSeq) + '_' + Date.now().toString(36);
  const MANUAL_FOLDER_ID = '__manual__';
  const folderRegistry = {};                           /* key -> [{id, name, addedAt}] (solo recurso 'plantillas') */
  const deriveRootName = files => { const p = files[0] && files[0].webkitRelativePath; return p ? p.split('/')[0] : undefined; };

  function tplEntry(fileName, blob, path, folderId, folderName) {
    return { fileName, path: path || fileName, blob, folderId: folderId || null, folderName: folderName || null };
  }
  function tplMeta(e) {
    return Object.freeze({ id: tplId(e.fileName), fileName: e.fileName, title: e.fileName.replace(/\.[^.]+$/, ''),
      ext: ext(e.fileName), size: e.blob && e.blob.size || 0, lastModified: e.blob && e.blob.lastModified || null,
      path: e.path, folderId: e.folderId || null, folderName: e.folderName || null });
  }
  /* entries: todas las plantillas de TODAS las carpetas agregadas hasta ahora (puede haber ids repetidos:
     gana la última entrada de la lista). folders: metadatos de las carpetas agregadas (registro vivo). */
  function tplCollection(entries, folders) {
    const byId = new Map(); entries.forEach(e => byId.set(tplId(e.fileName), e));       /* sin duplicados: gana la última */
    const list = [...byId.values()].sort((a, b) => a.fileName.localeCompare(b.fileName, 'es', { sensitivity: 'base', numeric: true }));
    const items = Object.freeze(list.map(tplMeta));
    const counts = new Map(); items.forEach(it => { if (it.folderId) counts.set(it.folderId, (counts.get(it.folderId) || 0) + 1); });
    /* El lote "Agregadas manualmente" es un cajón sintético (no una carpeta real del disco): si se
       queda sin plantillas, desaparece de la lista en vez de quedar como una carpeta vacía permanente.
       Las carpetas reales SIEMPRE se conservan (aunque lleguen a 0), para que el usuario vea con
       claridad todo lo que cargó, incluso si otra carpeta más reciente le "ganó" sus duplicados. */
    const folderMetas = Object.freeze((folders || []).slice().sort((a, b) => a.addedAt - b.addedAt)
      .filter(f => !(f.id === MANUAL_FOLDER_ID && !counts.get(f.id)))
      .map(f => Object.freeze({ id: f.id, name: f.name, addedAt: f.addedAt, count: counts.get(f.id) || 0 })));
    const name = folderMetas.length === 1 ? folderMetas[0].name : folderMetas.length ? `${folderMetas.length} carpetas` : 'Plantillas';
    return {
      entries: list,
      meta: Object.freeze({ name, count: items.length, items, folders: folderMetas }),
      persist: { name, count: items.length, folders: folders || [], files: list.map(e => ({ name: e.fileName, path: e.path, blob: e.blob, folderId: e.folderId, folderName: e.folderName })) }
    };
  }
  /* Registra (o actualiza) una carpeta en el registro vivo del recurso */
  function ensureFolder(key, { id, name }) {
    const folders = (folderRegistry[key] = folderRegistry[key] || []);
    if (id) {
      let f = folders.find(x => x.id === id);
      if (!f) { f = { id, name, addedAt: Date.now() }; folders.push(f); } else { f.addedAt = Date.now(); if (name) f.name = name; }
      return f;
    }
    let finalName = name || 'Plantillas', i = 2;
    while (folders.some(x => x.name === finalName)) finalName = `${name || 'Plantillas'} (${i++})`;  /* nombres repetidos: se distinguen */
    const f = { id: nextFolderId(), name: finalName, addedAt: Date.now() }; folders.push(f); return f;
  }
  /* Fusiona los archivos de UNA carpeta/lote en la colección existente, sin tocar las demás carpetas */
  async function mergeIntoTemplates(fileList, folderMeta, origin) {
    const key = 'plantillas';
    const prevEntries = (state[key].status === STATUS.READY && blobs[key]) ? blobs[key] : [];
    const prevIds = new Set(prevEntries.map(e => tplId(e.fileName)));
    const incoming = fileList.map(f => tplEntry(f.name, f, f.webkitRelativePath || f.name, folderMeta.id, folderMeta.name));
    const c = tplCollection(prevEntries.concat(incoming), folderRegistry[key]);
    const ids = [...new Set(incoming.map(e => tplId(e.fileName)))];
    return commitTemplates(c, origin, { added: ids.filter(i => !prevIds.has(i)), replaced: ids.filter(i => prevIds.has(i)), folderId: folderMeta.id, folderName: folderMeta.name });
  }

  function buildRecord(key, files, root) {
    const f = files[0];
    const meta = { name: f.name, size: f.size, date: fmtDate(f.lastModified) };
    return { meta, persist: { ...meta, blob: f }, blob: f };
  }

  /* API pública: carga un recurso de archivo único (SAC/Mercurio). Lo valida, guarda y procesa una sola vez. */
  async function load(key, fileList, opts = {}) {
    const origin = opts.origin || 'user';
    const v = validate(key, fileList);
    if (!v.ok) { emit({ key, type: 'rejected', origin, error: v.error }); return { ok: false, error: v.error }; }
    if (RESOURCES[key].kind === 'folder') return addFolder(v.files, opts);  /* las carpetas de plantillas siempre se acumulan */
    const token = ++tokens[key];
    const rec = buildRecord(key, v.files, opts.root);
    blobs[key] = rec.blob; rows[key] = null;
    set(key, { status: STATUS.LOADING, file: rec.meta, rowCount: 0, error: null, warnings: [], persisted: null, origin },
      { type: 'loading', origin });
    const persisted = await idb.set(key, rec.persist);
    if (token !== tokens[key]) return { ok: false, superseded: true };
    state[key] = { ...state[key], persisted };
    if (!persisted) emit({ key, type: 'persist-failed', origin });
    await process(key, token, origin);
    return { ok: state[key].status === STATUS.READY, error: state[key].error };
  }

  /* Agrega UNA carpeta completa de plantillas (criterio #1-5): se suma al conjunto existente,
     sin tocar las carpetas ya cargadas. Cada llamada crea una entrada de carpeta nueva. */
  async function addFolder(fileList, opts = {}) {
    const key = 'plantillas', origin = opts.origin || 'user';
    const v = validate(key, fileList);
    if (!v.ok) { emit({ key, type: 'rejected', origin, error: v.error }); return { ok: false, error: v.error }; }
    const folderMeta = ensureFolder(key, { name: opts.root || deriveRootName(v.files) || 'Plantillas' });
    return mergeIntoTemplates(v.files, folderMeta, origin);
  }
  /* Agrega o reemplaza (mismo nombre de archivo) plantillas sueltas, sin asociarlas a una carpeta del
     disco: se agrupan bajo un mismo lote estable ("Agregadas manualmente") para no crear una carpeta
     nueva en cada clic. */
  async function addTemplates(fileList, opts = {}) {
    const key = 'plantillas', origin = opts.origin || 'user';
    const v = validate(key, fileList);
    if (!v.ok) { emit({ key, type: 'rejected', origin, error: v.error }); return { ok: false, error: v.error }; }
    const folderMeta = ensureFolder(key, { id: MANUAL_FOLDER_ID, name: opts.root || 'Agregadas manualmente' });
    return mergeIntoTemplates(v.files, folderMeta, origin);
  }
  async function removeTemplate(id, opts = {}) {
    const key = 'plantillas', origin = opts.origin || 'user';
    const prev = blobs[key] || [];
    const rest = prev.filter(e => tplId(e.fileName) !== id);
    if (rest.length === prev.length) return { ok: false, error: 'La plantilla no existe.' };
    if (!rest.length) { folderRegistry[key] = []; await remove(key, { origin }); return { ok: true, removed: [id] }; }
    return commitTemplates(tplCollection(rest, folderRegistry[key]), origin, { removed: [id] });
  }
  /* Quita una carpeta completa. Si alguna de sus plantillas fue "ganada" por una carpeta agregada
     después (mismo nombre de archivo), esa plantilla ya pertenece a la otra carpeta y se conserva. */
  async function removeFolder(folderId, opts = {}) {
    const key = 'plantillas', origin = opts.origin || 'user';
    const prev = blobs[key] || [];
    const removedIds = prev.filter(e => e.folderId === folderId).map(e => tplId(e.fileName));
    const rest = prev.filter(e => e.folderId !== folderId);
    const folders = (folderRegistry[key] || []).filter(f => f.id !== folderId);
    folderRegistry[key] = folders;
    if (!rest.length) { await remove(key, { origin }); return { ok: true, folderRemoved: folderId, removed: removedIds }; }
    return commitTemplates(tplCollection(rest, folders), origin, { removed: removedIds, folderRemoved: folderId });
  }
  async function commitTemplates(c, origin, change) {
    const key = 'plantillas', token = ++tokens[key];
    blobs[key] = c.entries;
    state[key] = { ...state[key], status: STATUS.READY, file: c.meta, error: null, warnings: [], origin, updatedAt: Date.now() };
    emit({ key, type: 'updated', origin, change });
    const persisted = await idb.set(key, c.persist);
    if (token !== tokens[key]) return { ok: true, superseded: true };
    state[key] = { ...state[key], persisted };
    if (!persisted) emit({ key, type: 'persist-failed', origin });
    return { ok: true, ...change };
  }

  async function remove(key, opts = {}) {
    tokens[key]++; rows[key] = null; blobs[key] = null;
    if (RESOURCES[key].kind === 'folder') folderRegistry[key] = [];
    state[key] = blank(key); emit({ key, type: 'removed', origin: opts.origin || 'user' });
    await idb.del(key);
  }
  async function clear() { await Promise.all(ORDER.map(k => remove(k))); }
  async function reprocess(key) {
    if (!blobs[key]) return;
    const token = ++tokens[key];
    await process(key, token, 'user');
  }

  /* Recupera lo guardado en este equipo (también lo que guardaba el Módulo 1 original) */
  async function hydrate() {
    await Promise.all(ORDER.map(async key => {
      const rec = await idb.get(key);
      if (!rec || tokens[key] !== 0) return;                 /* el usuario ya cargó algo nuevo */
      const token = ++tokens[key];
      if (RESOURCES[key].kind === 'folder') {
        const raw = (rec.files || []).filter(x => x && x.blob && x.name);
        if (!raw.length) return;
        /* Compatibilidad: respaldos guardados antes de soportar múltiples carpetas no traen `folders`
           ni `folderId` por archivo; se reconstruye una única carpeta implícita con lo que había. */
        let folders = rec.folders && rec.folders.length ? rec.folders.map(f => ({ ...f })) : null;
        if (!folders) {
          const fid = nextFolderId();
          folders = [{ id: fid, name: rec.name || 'Plantillas', addedAt: Date.now() }];
          raw.forEach(x => { x.folderId = x.folderId || fid; x.folderName = x.folderName || folders[0].name; });
        }
        folderRegistry[key] = folders;
        const c = tplCollection(raw.map(x => tplEntry(x.name, x.blob, x.path, x.folderId, x.folderName)), folders);
        blobs[key] = c.entries;
        state[key] = { ...state[key], status: STATUS.LOADING, file: c.meta, persisted: true, origin: 'hydrate' };
      } else {
        if (!rec.blob) return;
        blobs[key] = rec.blob;
        state[key] = { ...state[key], status: STATUS.LOADING, file: { name: rec.name, size: rec.size, date: rec.date }, persisted: true, origin: 'hydrate' };
      }
      emit({ key, type: 'loading', origin: 'hydrate' });
      await process(key, token, 'hydrate');
    }));
    hydrated = true; emit({ type: 'hydrated', origin: 'hydrate' });
  }

  async function checkStorage() {
    let ok = true;
    try {
      if (!global.indexedDB) throw new Error('sin indexedDB');
      if (!(await idb.set('__healthcheck__', { ping: Date.now() }))) throw new Error('escritura');
      if (!(await idb.get('__healthcheck__'))) throw new Error('lectura');
      await idb.del('__healthcheck__');
    } catch (e) { ok = false; }
    try { if (global.navigator && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
    return ok;
  }

  export const DocStore = Object.freeze({
    STATUS,
    config: Object.freeze({ resources: RESOURCES, order: ORDER, modules: MODULES }),
    getState: snapshot,
    getProfile,
    setProfile,
    refreshProfile,
    getRows: key => rows[key],                         /* solo lectura: no mutar */
    /* Plantillas cargadas en Recursos (inmutable). Vacía si no hay carpeta lista. */
    getTemplates: () => (state.plantillas.status === STATUS.READY && state.plantillas.file) ? state.plantillas.file.items : Object.freeze([]),
    getTemplateBlob: id => { const e = (blobs.plantillas || []).find(x => tplId(x.fileName) === String(id || '').toLowerCase()); return e ? e.blob : null; },
    isReady: key => state[key] && state[key].status === STATUS.READY,
    subscribe(fn, { immediate = true } = {}) { listeners.add(fn); if (immediate) { try { fn(snapshot(), { type: 'init' }); } catch (e) { console.warn(e); } } return () => listeners.delete(fn); },
    load, remove, clear, reprocess, hydrate, checkStorage, validate,
    addFolder, addTemplates, removeTemplate, removeFolder
  });
