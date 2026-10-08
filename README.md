# Asistente Documental · ESSA (v2 · fase 1)

Aplicación 100 % en el navegador (sin backend ni APIs externas): **Recursos → Cuadro de mando → Generación documental**.
Es la aplicación original refactorizada (no reescrita): misma lógica, mismas librerías DOCX/Excel, mismos datos en IndexedDB/localStorage.

## Comandos
```bash
npm install
npm run dev          # desarrollo local (http://localhost:5173)
npm run build        # typecheck + build de producción en dist/
npm run preview      # servir dist/ (http://localhost:4173)
npm run typecheck && npm run lint && npm test
npm run build:ci     # typecheck + lint + tests + build (lo usa GitHub Actions)
```
Requiere Node ≥ 20.19.

## Publicación
- **GitHub Pages**: incluye `.github/workflows/pages.yml` (Settings → Pages → Source: *GitHub Actions*). Rutas relativas: funciona en `https://usuario.github.io/repo/`.
- **Local**: sirve `dist/` con cualquier servidor estático. No abrir con `file://` (los módulos usan iframes y Workers).

## Paridad con la app original
`reference/Asistente Documental.original.html` es la referencia funcional.
```bash
npm run build && npm run preview -- --port 4173
pip install playwright openpyxl python-docx && playwright install chromium
npm run parity            # mismo guion en original y nuevo; compara resultados
npm run parity:storage    # compatibilidad de IndexedDB/localStorage en ambos sentidos
```

## Estructura
`src/app` shell · `src/stores` Zustand (solo UI) · `src/repositories` DocStore/DataRepository · `src/services` XLSX/PersonName · `src/workers` · `src/modules/{recursos,cuadro,documentos}` · `src/components` · `src/types` · `src/styles` · `public/vendor` librerías DOCX (sin cambios) · `docs/DIAGNOSTICO.md`.
