import { AppError } from '../lib/utils.js';

const TESS_URL = import.meta.env?.VITE_TESSERACT_URL || 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
export const OCR = {
  worker: null, custom: null, loading: null,
  setEngine(fn) { this.custom = fn; },
  loadScript() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = TESS_URL; s.async = true; s.crossOrigin = 'anonymous';
      const to = setTimeout(() => rej(new AppError('El motor OCR tardó demasiado en descargarse.', 'Revisa la conexión a internet e inténtalo de nuevo.')), 30000);
      s.onload = () => { clearTimeout(to); window.Tesseract ? res() : rej(new AppError('El motor OCR no se inicializó.')); };
      s.onerror = () => { clearTimeout(to); s.remove(); rej(new AppError('No se pudo descargar el motor OCR (Tesseract.js).', 'Se necesita internet la primera vez. Mientras tanto puedes ingresar los datos manualmente.')); };
      document.head.appendChild(s);
    });
  },
  async ensure(onProgress) {
    if (this.custom || this.worker) return;
    if (!this.loading) this.loading = (async () => {
      if (!navigator.onLine && !window.Tesseract) throw new AppError('Sin conexión a internet: no se puede descargar el motor OCR.', 'Conéctate o ingresa los datos manualmente.');
      await this.loadScript();
      try {
        this.worker = await window.Tesseract.createWorker('spa', 1, { logger: m => { if (!this.ready && onProgress) onProgress(m); } });
        this.ready = true;
      } catch (e) { throw new AppError('No se pudo cargar el modelo de idioma del OCR.', 'Verifica la conexión a internet (se descarga desde jsDelivr).'); }
    })().catch(e => { this.loading = null; throw e; });
    return this.loading;
  },
  async recognize(canvas, { psm = 7, whitelist = '' } = {}) {
    if (this.custom) return this.custom(canvas, { psm, whitelist });
    await this.worker.setParameters({ tessedit_pageseg_mode: String(psm), tessedit_char_whitelist: whitelist, preserve_interword_spaces: '1' });
    const { data } = await this.worker.recognize(canvas);
    return { text: (data.text || '').trim(), confidence: data.confidence || 0, words: (data.words || []).map(w => ({ text: w.text, conf: w.confidence, bbox: w.bbox })) };
  }
};
export function mapWords(words, map) {
  return words.filter(w => w.text && w.text.trim()).map(w => ({
    text: w.text.trim(), conf: w.conf,
    x0: map.ox + (w.bbox.x0 - map.pad) / map.S, y0: map.oy + (w.bbox.y0 - map.pad) / map.S,
    x1: map.ox + (w.bbox.x1 - map.pad) / map.S, y1: map.oy + (w.bbox.y1 - map.pad) / map.S
  }));
}
export const meanConf = ws => ws.length ? ws.reduce((s, w) => s + (w.conf || 0), 0) / ws.length : 0;
