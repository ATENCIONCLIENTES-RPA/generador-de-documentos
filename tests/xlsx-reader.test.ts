import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { leerEnHiloPrincipal, xlsxReader } from '../src/services/xlsx/xlsx-reader';
import golden from './fixtures/golden-original.json';
const buf = (name: string): ArrayBuffer => { const b = readFileSync(new URL(`./fixtures/${name}`, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
const plain = (x: unknown) => JSON.parse(JSON.stringify(x));
const cols = golden.cfg.resources.sac.columns;
afterEach(() => vi.resetModules());
describe('lector XLSX (XLSXLite sin cambios de lógica)', () => {
  it('lee el libro igual que la aplicación original', async () => { expect(plain(await leerEnHiloPrincipal(buf('sac-mini.xlsx'), cols))).toEqual(golden.xlsx.rows); });
  it('sin columnas deseadas devuelve todas', async () => { expect(plain(await leerEnHiloPrincipal(buf('sac-mini.xlsx'))).slice(0, 2)).toEqual(golden.xlsx.rowsAllColumnsHead); });
  it('archivo dañado: mismo mensaje que el original', async () => { await expect(leerEnHiloPrincipal(buf('corrupt.xlsx'), ['A'])).rejects.toThrow(golden.xlsx.corruptError); });
});
describe('xlsxReader (Worker con respaldo en el hilo principal)', () => {
  it('sin Worker usa el hilo principal y devuelve lo mismo', async () => {
    expect(typeof Worker).toBe('undefined');
    expect(plain(await xlsxReader.leer(buf('sac-mini.xlsx'), cols))).toEqual(golden.xlsx.rows);
    await expect(xlsxReader.leer(buf('corrupt.xlsx'), ['A'])).rejects.toThrow(golden.xlsx.corruptError);
  });
  it('si el Worker falla por infraestructura, usa el respaldo sin perder el archivo', async () => {
    class Broken { l: Record<string, (e: unknown) => void> = {}; addEventListener(t: string, f: (e: unknown) => void) { this.l[t] = f; } postMessage() { queueMicrotask(() => this.l.error?.({ message: 'fallo' })); } terminate() { /* noop */ } }
    vi.stubGlobal('Worker', Broken); const { xlsxReader: reader } = await import('../src/services/xlsx/xlsx-reader');
    const original = buf('sac-mini.xlsx'); expect(plain(await reader.leer(original, cols))).toEqual(golden.xlsx.rows); expect(original.byteLength).toBeGreaterThan(0); vi.unstubAllGlobals();
  });
  it('error del archivo reportado por el Worker: mismo mensaje, sin reintento', async () => {
    class FileErr { l: Record<string, (e: unknown) => void> = {}; addEventListener(t: string, f: (e: unknown) => void) { this.l[t] = f; } postMessage(m: { id: number }) { queueMicrotask(() => this.l.message?.({ data: { id: m.id, ok: false, message: 'mensaje del archivo' } })); } terminate() { /* noop */ } }
    vi.stubGlobal('Worker', FileErr); const { xlsxReader: reader } = await import('../src/services/xlsx/xlsx-reader');
    await expect(reader.leer(buf('sac-mini.xlsx'), cols)).rejects.toThrow('mensaje del archivo'); vi.unstubAllGlobals();
  });
});
