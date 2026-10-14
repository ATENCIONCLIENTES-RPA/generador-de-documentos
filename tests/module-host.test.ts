import { afterEach, describe, expect, it, vi } from 'vitest';
import { moduleUrl } from '../src/app/module-host';

describe('moduleUrl', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('versiona las páginas de módulo con el bundle actual', () => {
    vi.stubGlobal('document', {
      baseURI: 'https://example.test/app/',
      querySelector: () => ({ src: 'https://example.test/app/assets/main-abc123.js' })
    });

    expect(moduleUrl('cuadro')).toBe('https://example.test/app/modules/cuadro.html?v=main-abc123.js');
  });
});
