// @ts-nocheck — lógica legada sin cambios de comportamiento; contrato tipado en src/types/data-repository.ts.
/* =====================================================================
   Asistente Documental · DataRepository
   Fuente única de verdad para configuraciones, rutas, notas y estado local.

   · IndexedDB es el repositorio persistente principal.
   · localStorage se conserva como espejo síncrono para los módulos existentes.
   · Una carpeta elegida por el usuario añade una copia externa recuperable.
   · Importación, exportación y sincronización comparten el mismo paquete de datos.
   ===================================================================== */
const global: any = typeof window !== 'undefined' ? window : globalThis;
  const ARCH = 'asistente_documental_datos.json';
  const LEGACY_ARCH = 'cuadro_mando_datos.json';
  const STAMP = 'essa__stamp', PREFIXES = ['essa_', 'essa-'];
  const DB_NAME = 'essa_cm', DB_VER = 1, DB_STORE = 'h';
  const DIR_KEY = 'dir', DATA_KEY = 'app-data-v2';
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;

  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error('IndexedDB no disponible'));
      const req = global.indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error || new Error('No fue posible abrir IndexedDB'));
    });
  }
  async function idbGet(k) {
    try { const db = await idbOpen(); return await new Promise(res => { const q = db.transaction(DB_STORE).objectStore(DB_STORE).get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
    catch (e) { return null; }
  }
  async function idbSet(k, v) {
    try { const db = await idbOpen(); return await new Promise(res => { const t = db.transaction(DB_STORE, 'readwrite'); t.objectStore(DB_STORE).put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); t.onabort = () => res(false); }); }
    catch (e) { return false; }
  }

  const rawSet = (k, v) => nativeSet.call(localStorage, k, String(v));
  const rawRemove = k => nativeRemove.call(localStorage, k);
  const isAppKey = k => PREFIXES.some(p => String(k || '').indexOf(p) === 0);
  function datos() {
    const o = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (isAppKey(k)) o[k] = localStorage.getItem(k); } }
    catch (e) {}
    return o;
  }
  function statsOf(d) {
    const keys = Object.keys(d || {}).filter(k => k !== STAMP);
    return { itemCount: keys.length, bytes: keys.reduce((n, k) => n + (k.length + String(d[k] || '').length) * 2, 0) };
  }
  function revisionOfData(d) { const n = +(d && d[STAMP] || 0); return Number.isFinite(n) ? n : 0; }
  function revisionOfPackage(p) {
    if (!p || typeof p !== 'object') return 0;
    return +(p.revision || revisionOfData(p.datos) || (p.updatedAt && Date.parse(p.updatedAt)) || (p.guardado && Date.parse(p.guardado)) || 0);
  }
  function nextRevision() {
    const prev = +(localStorage.getItem(STAMP) || 0);
    return Math.max(Date.now(), Number.isFinite(prev) ? prev + 1 : Date.now());
  }
  function marca(revision) { const r = revision || nextRevision(); try { rawSet(STAMP, r); } catch (e) {} return r; }
  function paqueteActual() {
    const d = datos(), revision = revisionOfData(d) || marca();
    if (!d[STAMP]) d[STAMP] = String(revision);
    return { schema: 'essa-app-data', version: 2, revision, updatedAt: new Date(revision).toISOString(), guardado: new Date().toISOString(), datos: d };
  }

  let DIR = null, localTimer = null, folderTimer = null, ready = false, applying = false;
  let writeQueue = Promise.resolve();
  const listeners = new Set();
  const state = {
    status: 'initializing', localReady: false, persistent: false, itemCount: 0, bytes: 0,
    folderStatus: global.showDirectoryPicker ? 'none' : 'unsupported', folderSupported: !!global.showDirectoryPicker,
    dirName: null, lastSaved: null, error: null, folderError: null, supported: !!global.indexedDB
  };
  function snapshotState() { return Object.freeze({ ...state }); }
  function emit() { const snap = snapshotState(); listeners.forEach(fn => { try { fn(snap); } catch (e) { console.warn('[DataRepository]', e); listeners.delete(fn); } }); }
  function setState(p) { Object.assign(state, p); emit(); }
  function updateStats(extra) { const s = statsOf(datos()); setState({ itemCount: s.itemCount, bytes: s.bytes, ...extra }); }

  async function persistLocal() {
    if (!global.indexedDB) { setState({ status: 'error', localReady: false, error: 'IndexedDB no está disponible en este navegador.' }); return false; }
    const pkg = paqueteActual();
    writeQueue = writeQueue.catch(() => false).then(async () => {
      const ok = await idbSet(DATA_KEY, pkg), s = statsOf(pkg.datos);
      setState(ok
        ? { status: 'ready', localReady: true, itemCount: s.itemCount, bytes: s.bytes, error: null }
        : { status: 'error', localReady: false, itemCount: s.itemCount, bytes: s.bytes, error: 'No se pudo actualizar el repositorio local persistente.' });
      return ok;
    });
    return writeQueue;
  }
  function schedulePersistence() {
    if (!ready || applying) return;
    setState({ status: 'saving' });
    clearTimeout(localTimer); localTimer = setTimeout(persistLocal, 20);
    if (DIR) { clearTimeout(folderTimer); folderTimer = setTimeout(escribir, 700); }
  }
  function changed() { marca(); schedulePersistence(); }

  function getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setItem(k, v) {
    try { rawSet(k, v); if (isAppKey(k) && k !== STAMP) changed(); return true; }
    catch (e) { setState({ status: 'error', error: 'No se pudo guardar el cambio local.' }); return false; }
  }
  function removeItem(k) {
    try { rawRemove(k); if (isAppKey(k) && k !== STAMP) changed(); return true; }
    catch (e) { setState({ status: 'error', error: 'No se pudo eliminar el dato local.' }); return false; }
  }
  function getJSON(k, fallback) { try { const v = getItem(k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
  function setJSON(k, v) { return setItem(k, JSON.stringify(v)); }

  async function aplicar(d, opts = {}) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('El respaldo no contiene datos válidos.');
    applying = true;
    try {
      if (opts.replace !== false) {
        Object.keys(datos()).forEach(k => { if (k !== STAMP && !Object.prototype.hasOwnProperty.call(d, k)) rawRemove(k); });
      }
      Object.keys(d).forEach(k => { if (isAppKey(k) && k !== STAMP && d[k] != null) rawSet(k, d[k]); });
      marca(opts.revision || revisionOfData(d) || nextRevision());
    } finally { applying = false; }
    await persistLocal();
  }

  async function leerArchivo() {
    if (!DIR) return null;
    for (const name of [ARCH, LEGACY_ARCH]) {
      try { const fh = await DIR.getFileHandle(name); const j = JSON.parse(await (await fh.getFile()).text()); if (j && typeof j.datos === 'object') return j; }
      catch (e) {}
    }
    return null;
  }
  async function escribir() {
    if (!DIR) return { ok: false };
    setState({ folderStatus: 'saving', folderError: null });
    try {
      await persistLocal();
      const fh = await DIR.getFileHandle(ARCH, { create: true }), w = await fh.createWritable();
      await w.write(JSON.stringify(paqueteActual(), null, 1)); await w.close();
      setState({ folderStatus: 'connected', dirName: DIR.name, lastSaved: Date.now(), folderError: null });
      return { ok: true, applied: false };
    } catch (e) {
      setState({ folderStatus: 'error', dirName: DIR && DIR.name || null, folderError: 'No se pudo guardar. Reconecta la carpeta e inténtalo de nuevo.' });
      return { ok: false, error: state.folderError };
    }
  }
  async function sincronizar() {
    const filePackage = await leerArchivo(), localPackage = paqueteActual();
    const fileRevision = revisionOfPackage(filePackage), localRevision = revisionOfPackage(localPackage);
    if (filePackage && fileRevision > localRevision) {
      await aplicar(filePackage.datos, { replace: true, revision: fileRevision });
      setState({ folderStatus: 'connected', dirName: DIR.name, lastSaved: Date.now(), folderError: null });
      return { ok: true, applied: true };
    }
    return escribir();
  }
  async function elegir() {
    if (!global.showDirectoryPicker) { setState({ folderStatus: 'unsupported' }); return { ok: false, error: 'El selector de carpetas requiere Edge o Chrome.' }; }
    setState({ folderStatus: 'choosing', folderError: null });
    try {
      const h = await global.showDirectoryPicker({ mode: 'readwrite', id: 'essa_cm' });
      DIR = h; await idbSet(DIR_KEY, h);
      return await sincronizar();
    } catch (e) {
      if (e && e.name === 'AbortError') { setState({ folderStatus: DIR ? 'permission' : 'none', folderError: null }); return { ok: false, cancelled: true }; }
      setState({ folderStatus: 'error', folderError: 'No fue posible abrir la carpeta seleccionada.' });
      return { ok: false, error: state.folderError };
    }
  }
  async function reconectar() {
    if (!DIR) return elegir();
    setState({ folderStatus: 'choosing', folderError: null });
    try {
      const p = await DIR.requestPermission({ mode: 'readwrite' });
      if (p === 'granted') return sincronizar();
      setState({ folderStatus: 'permission', dirName: DIR.name, folderError: null });
      return { ok: false, error: 'La carpeta necesita permiso para volver a conectarse.' };
    } catch (e) { return elegir(); }
  }
  function exportarJSON() {
    const blob = new Blob([JSON.stringify(paqueteActual(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'asistente_documental_respaldo_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function importarJSON(file) {
    try {
      const j = JSON.parse(await file.text());
      if (!j || typeof j.datos !== 'object' || Array.isArray(j.datos)) throw new Error('formato');
      const valid = Object.keys(j.datos).filter(isAppKey);
      if (!valid.length) throw new Error('vacío');
      return {
        ok: true, count: valid.filter(k => k !== STAMP).length,
        async apply() {
          await aplicar(j.datos, { replace: true, revision: nextRevision() });
          if (DIR) await escribir();
          return { ok: true };
        }
      };
    } catch (e) { return { ok: false, error: 'El archivo no es un respaldo válido del Asistente Documental.' }; }
  }

  global.addEventListener('storage', e => {
    if (applying || !ready) return;
    if ((e.storageArea === localStorage) && (e.key === null || isAppKey(e.key))) changed();
  });
  global.addEventListener('pagehide', () => { if (ready) { clearTimeout(localTimer); persistLocal(); } });
  Storage.prototype.setItem = function (k, v) {
    nativeSet.call(this, k, v);
    if (this === localStorage && isAppKey(k) && k !== STAMP && ready && !applying) changed();
  };
  Storage.prototype.removeItem = function (k) {
    nativeRemove.call(this, k);
    if (this === localStorage && isAppKey(k) && k !== STAMP && ready && !applying) changed();
  };

  async function init() {
    if (!global.indexedDB) { ready = true; setState({ status: 'error', supported: false, localReady: false, folderStatus: 'unsupported', error: 'El navegador no ofrece almacenamiento persistente local.' }); return false; }
    setState({ status: 'initializing', error: null });
    let persistent = false;
    try {
      if (global.navigator && navigator.storage) {
        persistent = navigator.storage.persisted ? await navigator.storage.persisted() : false;
        if (!persistent && navigator.storage.persist) persistent = await navigator.storage.persist();
      }
    } catch (e) {}

    const dbPackage = await idbGet(DATA_KEY), localData = datos();
    const dbRevision = revisionOfPackage(dbPackage), localRevision = revisionOfData(localData);
    const meaningfulLocal = Object.keys(localData).filter(k => ![STAMP, 'essa-theme', 'essa_cm_theme'].includes(k)).length;
    if (dbPackage && dbPackage.datos && (dbRevision > localRevision || !meaningfulLocal)) {
      await aplicar(dbPackage.datos, { replace: true, revision: dbRevision || Date.now() });
    } else {
      if (!localRevision) marca();
      await persistLocal();
    }
    ready = true;
    updateStats({ status: 'ready', localReady: true, persistent, error: null });

    try { DIR = await idbGet(DIR_KEY); } catch (e) { DIR = null; }
    if (!DIR) { setState({ folderStatus: state.folderSupported ? 'none' : 'unsupported' }); return true; }
    let permission = 'prompt'; try { permission = await DIR.queryPermission({ mode: 'readwrite' }); } catch (e) {}
    if (permission === 'granted') await sincronizar();
    else setState({ folderStatus: 'permission', dirName: DIR.name, folderError: null });
    return true;
  }

  export const DataRepository = Object.freeze({
    subscribe(fn, { immediate = true } = {}) { listeners.add(fn); if (immediate) { try { fn(snapshotState()); } catch (e) {} } return () => listeners.delete(fn); },
    getState: snapshotState, getStats: () => Object.freeze(statsOf(datos())), snapshot: () => Object.freeze({ ...datos() }),
    getItem, setItem, removeItem, getJSON, setJSON, elegir, reconectar, exportarJSON, importarJSON, init,
    flush: async () => { clearTimeout(localTimer); clearTimeout(folderTimer); const ok = await persistLocal(); if (DIR) await escribir(); return ok; }
  });
