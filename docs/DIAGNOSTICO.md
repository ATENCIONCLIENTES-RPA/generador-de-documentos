# Diagnóstico y estrategia de migración

## Arquitectura original
HTML único (~1,7 MB, sin red): shell + 3 módulos incrustados como cadenas (`MODULE_HTML`) en `<iframe srcdoc>` (Recursos, Cuadro de mando, Generación documental) + núcleo compartido (`XLSXLite`, `PersonName`, `DocStore` → IndexedDB `essa-modulo1`, `DataRepository` → IndexedDB `essa_cm` + espejo localStorage + carpeta externa) + librerías vendorizadas (JSZip, PizZip, docxtemplater, easy-template-x, docx-preview, docx-renderer, Mammoth local, ADDocxLocal). Los módulos hablan con el shell por `window.parent.AsistenteDocumental`.

## Código crítico (lógica NO modificada)
| Área | Ubicación | Estado |
|---|---|---|
| Lectura XLSX | `src/services/xlsx/xlsx-lite.ts` | Idéntico; ahora en **Web Worker** con respaldo automático en hilo principal (`xlsx-reader.ts`) |
| DocStore (IndexedDB `essa-modulo1`, plantillas, validaciones) | `src/repositories/doc-store.ts` | Idéntico; contrato en `src/types/doc-store.ts` |
| DataRepository (IndexedDB `essa_cm`, localStorage, carpeta externa, import/export) | `src/repositories/data-repository.ts` | Idéntico |
| PersonName | `src/services/person-name.ts` | Idéntico (tests de caracterización) |
| DOCX: generación (docxtemplater → easy-template-x → OOXML integrado), vista previa (docx-renderer → docx-preview → Mammoth → renderer integrado), control de calidad, variables | `src/modules/documentos/main.ts` + `public/vendor/*` | Sin cambios |
| Exportación Excel del Cuadro | `src/modules/cuadro/main.ts` | Sin cambios |
| Guía rápida y puente de módulo (copiados ×3) | `src/components/guided-tour/`, `src/modules/shared/module-bridge.ts` | **Unificados** (única fuente de verdad) |
| Shell | `src/app/*`, `src/stores/shell-store.ts` | TypeScript estricto + Zustand (solo estado de UI) |

## Fase 1 (esta entrega)
Refactor → Migración → Integración, sin cambiar comportamiento: extracción por archivos conservando el orden de ejecución, Vite multipágina (`base './'`), TypeScript estricto en el código nuevo (legado con `@ts-nocheck` + ESLint `no-undef` como red de seguridad), Zustand solo para UI del shell, Web Worker XLSX con respaldo, tests de caracterización con valores capturados de la app original, scripts de paridad.

## Pendiente (fases siguientes, una a una y con paridad verificada)
- Tipado estricto progresivo de los 3 módulos (hoy `@ts-nocheck`).
- Workers para DOCX (inspección ZIP/generación) y compresión del export XLSX.
- **OPFS**: el original no lo usa (persiste en IndexedDB + carpeta externa); no se introdujo. Evaluar para Blobs grandes con migración de versión de IndexedDB.
- Zustand en los módulos, lazy loading de librerías DOCX por módulo, optimizar `fonts.css` (85 KB base64).
