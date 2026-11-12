import { AppError, clamp, fmtBytes } from '../lib/utils.js';

const IMG_MAX_BYTES = 15 * 1024 * 1024;
const IMG_MAX_SIDE = 3200;

export async function handleImageUpload(file) {
  if (!file) throw new AppError('No se seleccionó ningún archivo.');
  const okExt = /\.(png|jpe?g)$/i.test(file.name);
  const okMime = /^image\/(png|jpeg|jpg|pjpeg)$/i.test(file.type || '');
  if (!okExt && !okMime) throw new AppError(`«${file.name}» no es una imagen PNG o JPG.`, 'Formatos admitidos: PNG, JPG y JPEG.');
  if (file.size === 0) throw new AppError('La imagen está vacía.');
  if (file.size > IMG_MAX_BYTES) throw new AppError(`La imagen pesa ${fmtBytes(file.size)}; el máximo es 15 MB.`, 'Recórtala o guárdala con menor calidad.');
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
  const isJpg = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
  if (!isPng && !isJpg) throw new AppError('El contenido del archivo no corresponde a una imagen PNG/JPG válida.', 'Puede estar dañado o tener una extensión incorrecta.');
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    try {
      const url = URL.createObjectURL(file); const im = new Image(); im.src = url;
      await im.decode(); bmp = im; URL.revokeObjectURL(url);
    } catch { throw new AppError('No se pudo decodificar la imagen (archivo dañado o incompleto).'); }
  }
  if (bmp.width < 120 || bmp.height < 60) throw new AppError(`La imagen es demasiado pequeña (${bmp.width}×${bmp.height}px).`);
  const k = Math.min(1, IMG_MAX_SIDE / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingQuality = 'high'; cx.drawImage(bmp, 0, 0, cv.width, cv.height);
  if (bmp.close) bmp.close();
  return { file, canvas: cv, w: cv.width, h: cv.height, url: URL.createObjectURL(file), scaledFrom: k < 1 ? 1 / k : 1 };
}


function isRedMark(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx !== r || mx < 90) return false;
  const d = r - Math.max(g, b), sat = (mx - mn) / mx;
  const hue = mx === mn ? 0 : 60 * ((g - b) / (mx - mn));
  return d >= 60 && sat >= 0.45 && hue <= 25 && hue >= -30;
}
export function preprocessImage(img) {
  const { w, h } = img;
  const src = img.canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const red = new Uint8Array(w * h);
  for (let i = 0, j = 0; j < red.length; i += 4, j++) if (src[i + 3] >= 20 && isRedMark(src[i], src[i + 1], src[i + 2])) red[j] = 1;
  const L = Math.max(8, Math.round(Math.max(w, h) / 220)); const kill = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let run = 0; for (let x = 0; x <= w; x++) { if (x < w && red[y * w + x]) run++; else { if (run >= L) for (let k = x - run; k < x; k++) kill[y * w + k] = 1; run = 0; } } }
  for (let x = 0; x < w; x++) { let run = 0; for (let y = 0; y <= h; y++) { if (y < h && red[y * w + x]) run++; else { if (run >= L) for (let k = y - run; k < y; k++) kill[k * w + x] = 1; run = 0; } } }
  const gray = new Uint8ClampedArray(w * h), gmin = new Uint8ClampedArray(w * h); let redPx = 0, sum = 0;
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
    let near = false;
    if (!kill[j]) { const x = j % w, y = (j / w) | 0; near = (x > 0 && kill[j - 1]) || (x < w - 1 && kill[j + 1]) || (y > 0 && kill[j - w]) || (y < h - 1 && kill[j + w]); near = near && red[j]; }
    if (a < 20 || kill[j] || near) { gray[j] = gmin[j] = 255; if (kill[j]) redPx++; }
    else { gray[j] = 0.299 * r + 0.587 * g + 0.114 * b; gmin[j] = Math.min(r, g, b); }
    sum += gray[j];
  }
  if (sum / gray.length < 110) for (let j = 0; j < gray.length; j++) { gray[j] = 255 - gray[j]; gmin[j] = 255 - gmin[j]; }
  const toCanvas = arr => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const id = cv.getContext('2d').createImageData(w, h);
    for (let j = 0; j < arr.length; j++) { const k = j * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = arr[j]; id.data[k + 3] = 255; }
    cv.getContext('2d').putImageData(id, 0, 0); return cv;
  };
  return { canvas: toCanvas(gray), minCanvas: toCanvas(gmin), w, h, redPx };
}
function otsu(data) {
  const hist = new Array(256).fill(0); for (const v of data) hist[v | 0]++;
  const total = data.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, max = 0, thr = 127;
  for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break; sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF; const bt = wB * wF * (mB - mF) ** 2; if (bt > max) { max = bt; thr = i; } }
  return thr;
}
export function enhanceCrop(work, box, S, variant = 'A', pad = 20, { sharpen = false } = {}) {
  const x0 = clamp(Math.floor(box.x0), 0, work.w - 1), y0 = clamp(Math.floor(box.y0), 0, work.h - 1);
  const x1 = clamp(Math.ceil(box.x1), x0 + 1, work.w), y1 = clamp(Math.ceil(box.y1), y0 + 1, work.h);
  const bw = x1 - x0, bh = y1 - y0, W = Math.max(1, Math.round(bw * S)), H = Math.max(1, Math.round(bh * S));
  const c = document.createElement('canvas'); c.width = W + 2 * pad; c.height = H + 2 * pad;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(variant === 'M' ? work.minCanvas : work.canvas, x0, y0, bw, bh, pad, pad, W, H);
  const id = x.getImageData(pad, pad, W, H), d = id.data, n = W * H;
  let g = new Float32Array(n); for (let i = 0; i < n; i++) g[i] = d[i * 4];
  const srt = Float32Array.from(g).sort(); const lo = srt[Math.floor(n * 0.01)], hi = srt[Math.min(n - 1, Math.floor(n * 0.99))];
  if (hi - lo > 12) for (let i = 0; i < n; i++) g[i] = clamp((g[i] - lo) * 255 / (hi - lo), 0, 255);
  if (sharpen && S >= 1.8 && n < 4e6) {
    const o = new Float32Array(n);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += g[clamp(yy + dy, 0, H - 1) * W + clamp(xx + dx, 0, W - 1)];
      const p = yy * W + xx; o[p] = clamp(g[p] + 0.7 * (g[p] - s / 9), 0, 255);
    }
    g = o;
  }
  if (variant === 'B') {
    const m = new Float32Array(n), a = new Array(9);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) a[k++] = g[clamp(yy + dy, 0, H - 1) * W + clamp(xx + dx, 0, W - 1)]; a.sort((p, q) => p - q); m[yy * W + xx] = a[4]; }
    const t = otsu(m); for (let i = 0; i < n; i++) g[i] = m[i] > t ? 255 : 0;
  }
  for (let i = 0; i < n; i++) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g[i];
  x.putImageData(id, pad, pad);
  c._map = { S, pad, ox: x0, oy: y0 };
  return c;
}
export const pageScale = w => w <= 950 ? 4 : w <= 1550 ? 3 : w <= 2400 ? 2 : 1;
