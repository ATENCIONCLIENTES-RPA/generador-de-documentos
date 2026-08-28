# ESSA Sistema Documental — Migración a Vite + Rediseño Total

> **Fecha:** 2026-08-27
> **Autor:** Brainstorming con equipo ESSA
> **Estado:** Spec aprobado — pendiente plan de implementación

## 1. Objetivo

Migrar el sistema de `index.html` (Babel standalone, archivo único 5172 líneas) a **Vite + React 18 + TypeScript** con arquitectura modular, integrando **easy-template-x + PizZip** como motor de plantillas DOCX, **Zustand** para estado, y un **rediseño total** de la interfaz en dirección **Modern Corporate ESSA** (limpia, data-dense, desktop-first).

El resultado debe ser: estable, mantenible, testeable, performante, visualmente sobresaliente y 100% compatible con plantillas/Excel actuales.

---

## 2. Arquitectura técnica

### 2.1 Stack definitivo

| Capa | Herramienta | Por qué |
|------|-------------|---------|
| Bundler | `vite@5` | Rápido, HMR, ESM nativo |
| UI | `react@18` + `typescript@5` | Tipado, componentes, hooks |
| Estado | `zustand@4` | Ligero ~1KB, TS-first, sin providers |
| Plantillas | `easy-template-x` + `pizzip` | API moderna JSON-based, bucles/condicionales/tablas, delimiter `[VARIABLE]` compatible |
| Filtros | `alasql@4` | SQL en memoria (filtros DataView) |
| Excel | `xlsx` | Parse .xlsx/.xls |
| Descargas | `file-saver` | saveAs blob/ZIP |
| Preview DOCX | `docx-preview` | Render .docx en canvas/browser |
| Testing | `vitest` + `@testing-library/react` + `playwright` | Unit + E2E |
| Calidad | `eslint` + `prettier` + `husky` + `lint-staged` | Pre-commit hooks |

### 2.2 Estructura de proyecto

```
essa-docgen/
├── index.html                  # Vite entry (mínimo, monta <div id="root">)
├── vite.config.ts              # alias @/, plugins, chunking
├── tsconfig.json               # strict, paths @/* → src/*
├── package.json
├── .eslintrc.cjs
├── .prettierrc
├── public/
│   ├── Logo 3.png
│   └── favicon.svg
├── src/
│   ├── main.tsx                # createRoot(<App />)
│   ├── App.tsx                 # Router por currentStep (sin react-router, estado en store)
│   ├── types/
│   │   ├── record.ts           # Record, RowId, FilterState
│   │   ├── template.ts         # Template, Variable, DocxGenerationResult
│   │   └── store.ts            # Stores interfaces
│   ├── store/
│   │   ├── excelStore.ts       # sacFile, mercurioFile, templateFolder, allReady
│   │   ├── dataStore.ts        # records, selectedRows: Set<string>, filterState, pagination, editingRecord
│   │   ├── templateStore.ts    # templates, selectedTemplate, preview state
│   │   ├── generationStore.ts  # stage, progress, docResults, generationStatus
│   │   ├── profileStore.ts     # profile (name, position, email, signature)
│   │   └── navigationStore.ts  # currentStep, stepCompleted
│   ├── hooks/
│   │   ├── useExcelParser.ts   # parseExcelFile, rowId generation
│   │   ├── useTemplateEngine.ts# generateDocx (easy-template-x wrapper)
│   │   ├── useGeneration.ts    # processNext, downloadSingle, downloadAll (ZIP)
│   │   ├── useDebouncedSearch.ts
│   │   └── useSelection.ts     # toggleRow, togglePage, clearSelection (Set<RowId>)
│   ├── utils/
│   │   ├── nameParser.ts       # extractFirstName, formatApplicantName
│   │   ├── excelParser.ts      # AlaSQL + xlsx helpers
│   │   ├── templateEngine.ts   # generateDocxWithEasyTemplateX
│   │   ├── docxHelpers.ts      # fileToTemplate, extractVariables, preview
│   │   └── formatters.ts       # Dates, currency, account numbers
│   ├── components/
│   │   ├── ui/                 # Primitivos reutilizables
│   │   │   ├── Button.tsx      # variants: primary | secondary | ghost | danger
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx       # with label, error, icon, clear button
│   │   │   ├── Select.tsx
│   │   │   ├── DatePicker.tsx  # native input[type=date] + icon
│   │   │   ├── Badge.tsx
│   │   │   ├── Spinner.tsx     # con variante shimmer/pulse
│   │   │   ├── Modal.tsx       # Overlay, focus trap, Esc, click outside
│   │   │   ├── Table.tsx       # Sortable, selectable, paginated
│   │   │   ├── Pagination.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Tooltip.tsx
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx   # Logo, nav, badges excel/marcados, avatar
│   │   │   ├── AppFooter.tsx
│   │   │   ├── StepperBar.tsx  # Horizontal stepper con estados (pending/active/completed)
│   │   │   └── PageContainer.tsx
│   │   ├── features/
│   │   │   ├── EnergyIllustration.tsx
│   │   │   ├── SignaturePad.tsx
│   │   │   ├── ExcelUploadCard.tsx  # Reutilizable para SAC/Mercurio/Folder
│   │   │   ├── RecordEditModal.tsx
│   │   │   ├── VariableTag.tsx
│   │   │   └── GenerationStageIndicator.tsx
│   │   └── EssaLogo.tsx
│   ├── views/
│   │   ├── HomeView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── ConfigView.tsx       # M2: Dual Excel + Folder (hero + grid + cards)
│   │   ├── DataView.tsx         # M3: rowId, Set selection, filtros AND, 10/page, modal
│   │   ├── TemplatesView.tsx    # M4: preview centrado, sin toolbar gris
│   │   └── GenerateView.tsx     # M5+6 unificado: sidebar + preview + status bar + generación
│   └── styles/
│       ├── globals.css         # Reset, variables CSS, utilidades base
│       ├── tokens.css          # Design tokens (colores, spacing, radius, shadows, fonts)
│       └── components.css      # Estilos compartidos (card, btn, table, etc.)
├── tests/
│   ├── unit/                   # templateEngine, nameParser, excelParser, stores
│   └── e2e/                    # flujo completo M2→M6
└── docs/
    └── superpowers/
        ├── specs/              # Este documento
        └── plans/              # Plan de implementación (siguiente paso)
```

### 2.3 Stores (Zustand)

- **excelStore:** `sacFile: ExcelFileState | null`, `mercurioFile`, `templateFolder`, `allReady: boolean`, `setSacFile`, `setMercurioFile`, `setTemplateFolder`, `clearAll`.
- **dataStore:** `records: Record[]`, `selectedRows: Set<string>`, `filterState: {search, cuenta, proceso, radicado, fechaSolicitud}`, `currentPage`, `pageSize: 10`, `editingRecord: Record | null`, `toggleRow(rowId)`, `togglePage()`, `clearSelection()`, `applyFilters()`, `setPage(n)`, `editRecord(rowId, patch)`.
- **templateStore:** `templates: Template[]`, `selectedTemplate: Template | null`, `selectTemplate(id)`, `loadTemplates(files)`.
- **generationStore:** `stage: 'revision'|'generando'|'finalizado'|'con_errores'`, `progress: number`, `docResults: GenerationResult[]`, `startGeneration()`, `retryFailed()`, `downloadSingle(id)`, `downloadAll()`.
- **profileStore:** `profile: { name, position, email, signatureUrl }`.
- **navigationStore:** `currentStep: StepId`, `completed: Set<StepId>`, `goTo(step)`, `complete(step)`.

Cada store es file-scoped, `create<Store>()` con `persist` opcional para profile.

### 2.4 Motor de plantillas: easy-template-x + PizZip

```ts
// src/utils/templateEngine.ts
import { TemplateHandler } from 'easy-template-x';
import PizZip from 'pizzip';

type TemplateData = Record<string, string>;

const DELIMITER = { start: '[', end: ']' };

export async function generateDocx(
  templateFile: File,
  data: TemplateData,
  opts?: { signatureImage?: Blob; signatureField?: string }
): Promise<Blob> {
  const arrayBuffer = await templateFile.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const handler = new TemplateHandler();

  // 1. Firma: si hay signatureImage y la plantilla contiene [FIRMA_DOCUMENTO], insertar imagen
  // easy-template-x soporta imágenes vía tag.image; fallback: reemplazar por DrawingML si no
  const enrichedData: TemplateData & Record<string, unknown> = { ...data };
  if (opts?.signatureImage && opts?.signatureField) {
    const b64 = await blobToBase64(opts.signatureImage);
    enrichedData[opts.signatureField] = { width: 180, height: 72, data: b64, extension: '.png' };
  }

  // 2. easy-template-x process
  await handler.process(zip, enrichedData as never, {
    delimiters: DELIMITER,
    nullGetter: () => '—',
    // auto-escape XML interior
  } as never);

  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.readAsDataURL(blob);
  });
}
```

- Soporta `{#each items}{/each}`, `{#if condition}{/if}`, tablas dinámicas, imágenes, rich text.
- Variables `[VARIABLE]` mapean directo — compatibilidad total con plantillas actuales ESSA.
- PizZip maneja el ZIP; easy-template-x iteración sobre paragraphs/runs preservando estilos.
- Fallback regex (actual) se mantiene como util interna si easy-template-x falla en edge case.

### 2.5 Excel → Store → DataView

- `useExcelParser`: lee File → `xlsx`/`alasql` → `records: Record[]` con `rowId = `row_${index}_${Date.now()}`.
- `record.rowId` estable, no cambia nunca; selección por `Set<string>`.
- Filtros: orden `data → edits → search → cuenta → proceso → radicado → fecha → paginate`.

---

## 3. Diseño visual — Modern Corporate ESSA (Genial)

### 3.1 Principios

- **Densidad controlada:** Data-dense donde importa (tablas, cards), aire generoso donde respira (hero, preview).
- **Motión útil:** 150ms ease-out; shimmer/pulse solo en estados loading; nada gratuito.
- **Jerarquía tipográfica:** Plus Jakarta Sans 400 (body), 600-800 (headings), 12-14px secondary.
- **Desktop-first:** 1600px max container; grids 12 cols; sticky header y sidebar.

### 3.2 Tokens

```css
/* tokens.css */
:root {
  --essa-primary: #004B93;
  --essa-primary-hover: #003a73;
  --essa-accent: #76BC21;
  --essa-accent-hover: #689d1c;
  --neutral-900: #0F172A;
  --neutral-700: #334155;
  --neutral-500: #64748B;
  --neutral-300: #CBD5E1;
  --neutral-100: #F1F5F9;
  --neutral-50: #F8FAFC;
  --bg-page: #F0F4F9;
  --danger: #DC2626;
  --radius-card: 12px;
  --radius-input: 8px;
  --radius-badge: 999px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10);
  --shadow-lg: 0 12px 28px rgba(0,0,0,0.14);
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration: 150ms;
}
```

### 3.3 Componentes clave (geniales pero sobrios)

- **Button:** `primary` (primary bg, white text, hover darker, active scale 0.98), `secondary` (white bg, border), `ghost` (transparent, hover bg), `danger`. Tamaños sm/md/lg. Loading con spinner inline.
- **Card:** `background: white`, `border: 1px solid var(--neutral-100)`, `border-radius: var(--radius-card)`, `box-shadow: var(--shadow-sm)`, hover `shadow-md + translateY(-2px)`.
- **Badge:** `font-size: 11px`, `letter-spacing: 0.08em`, `uppercase` opcional. Variantes: neutral, success, warning, danger, primary.
- **Input/Search:** `46px height`, `border-radius: var(--radius-input)`, focus ring `0 0 0 3px rgba(0,75,147,0.15)`.
- **Table (DataView):** header sticky, zebra sutil, row selected `background: #EBF5FF`, left border `3px solid var(--essa-primary)` + `transition`. Checkbox con estado indeterminate. Acciones (Editar) icono lápiz.
- **StepperBar:** horizontal, línea conectora, estados: pending (gris 300), active (primary bg white text + ring), completed (success bg). Mobile: collapse a dots.
- **Modal:** overlay `rgba(15,23,42,0.45)` + backdrop blur, `max-width: 720px`, header con X, body scrolleable, footer sticky con Cancel/Save.
- **Sidebar (GenerateView):** `width: 300px`, lista documentos con badge estado, búsqueda arriba, prev/next paginación, highlight activo `bg: #EBF5FF`.

### 3.4 Vistas

- **HomeView:** hero 12-col grid, badge GENERADOR DE PLANTILLAS, h1 2.5rem 800, p 1.05rem 400 neutral-500, botón Comenzar Flujo primary lg, ilustración energía SVG derecha. 4 cards features icon 44px primario.

- **ConfigView (M2) — Brillante:**
  - Hero degradado: `linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 45%, #F0FDF4 100%)` con blur shapes.
  - Header: badge MÓDULO 2: CONFIGURACIÓN DE RECURSOS, título, subtítulo 0.82rem.
  - Progress track: segmentos 33.33% cada uno, fill `#004B93`, texto por fuente.
  - Grid `m2-grid`: 2 cols (SAC | Mercurio) + card folder full-width abajo.
  - Cada card: `accent-sac` (azul primary), `accent-mercurio` (esmeralda), `accent-folder` (amarillo). Borde superior 3px + shadow + hover lift. `m2-icon-box` 42px con icono 20px.
  - Estados: idle (drop dashed, icon +, texto explora), loading (shimmer track, pulse dot, texto dinámico), completed (compacto verde, check, filename, count, botones Cambiar/Quitar), error (rojo, warning, reintentar).
  - Bottom actions: Cancelar (secondary) + Continuar (primary, disabled hasta `allReady`).

- **DataView (M3):** toolbar filtros con inputs text + date, tags activos removibles, contadores, tabla con 10/page, pagination abajo, toggle Ver seleccionados, modal edición 3 secciones (Trámite, Solicitante, Descripciones).

- **TemplatesView (M4):** Sin toolbar gris, documento centrado `margin: 0 auto`, `max-width: 560px`, background `#F5F5F7`, scroll vertical interno, continuar bottom-right.

- **GenerateView (M5+6 unificado):** Tres áreas: sidebar 25% (lista navegable + búsqueda + estado por doc), center 55% (preview con toolbar zoom/print), bottom/status bar compacta `10 documentos: 2 pendientes · 3 generando · 4 completados · 1 con error` (segmentos clicables filtra lista). Botón Generar documentos → progress real % → download single/ZIP.

### 3.5 Animaciones (sobrias)

- `fade-in 220ms ease-out`, `slide-up 180ms`, `shimmer 1.4s infinite` (progress fill), `pulse-dot 1.2s` (loading indicator).

---

## 4. Flujo de navegación y estados

```
Inicio → Perfil (firma) → Configuración (M2: dual Excel + folder) → Datos (M3: review/edit)
→ Plantillas (M4: selección + preview) → Generación (M5+6: revisión → generación → descarga)
```

- Cada paso marca `completed` en `navigationStore`; stepper permite volver atrás.
- `allReady` en ConfigView gatea "Continuar al Módulo 3".
- `selectedRows.size > 0` gatea "Continuar al Módulo 4".
- DataView `filterState` persiste al cambiar página/selección.
- GenerateView `stage` controla botón único: `Generar documentos` → `Descargar` (single/ZIP).

---

## 5. Testing y calidad

- **Unit:** `templateEngine.generateDocx` con .docx reales (fixtures en `tests/fixtures/`), `nameParser`, `excelParser`, `stores`.
- **Component:** `ConfigView` (dual upload, progress, allReady), `DataView` (selection Set, filtros AND, pagination, modal), `TemplatesView`, `GenerateView`.
- **E2E (Playwright):** flujo M2→M6 end-to-end (cargar Excel, seleccionar, elegir plantilla, generar, verificar ZIP).
- **Visual:** axe a11y, Lighthouse 90+ performance, contraste AA.
- **Pre-commit:** ESLint + Prettier + `tsc --noEmit` vía Husky.

---

## 6. Migración: estrategia por fases (sin romper nada)

1. **Fase 0 — Scaffold:** `npm create vite@latest`, instalar deps, copiar `public/Logo 3.png`, configurar tokens.
2. **Fase 1 — Fundaciones:** `types/`, `utils/`, `store/` (Zustand), `components/ui` + `layout`.
3. **Fase 2 — ConfigView (M2):** Hero + grid + ExcelUploadCard + allReady.
4. **Fase 3 — DataView (M3):** rowId, Set selection, filtros, pagination, modal.
5. **Fase 4 — TemplatesView (M4):** Preview centrado.
6. **Fase 5 — GenerateView (M5+6):** Sidebar + preview + motor easy-template-x + headers/footers + firma.
7. **Fase 6 — Integración:** `App.tsx` wiring, stepper, profile/signature, Home/Profile.
8. **Fase 7 — Polish & QA:** E2E, a11y, responsive desktop, ZIP/individual downloads.

Cada fase PR aislado, verificable en `npm run dev` sin tocar `index.html` original hasta el switch final.

---

## 7. Criterios de éxito

- `npm run dev` muestra el sistema completo sin errores console.
- `npm run build` → `dist/` deployable (GitHub Pages / Netlify).
- Excel SAC (16k rows × 119 cols) carga < 5s; DataView filtra/pagina < 200ms.
- Generación de 50 docs con firma < 10s; ZIP válido; DOCX abre en Word sin corrupción ni variables residuales.
- Lighthouse performance > 90, a11y AA, 0 ESLint errors.

---

## 8. Fuera de alcance (por ahora)

- Modo oscuro, i18n, backend, auth, RBAC, telemetría, offline PWA — post-MVP.

---

## 9. Referencias

- Plan anterior: `docs/superpowers/plans/2026-08-27-sistema-documental-ajustes.md`
- Convención brand: primary `#004B93`, accent `#76BC21`, Plus Jakarta Sans
- Logo: `public/Logo 3.png`
- Excel: `C:\Users\MSI KATANA\Videos\SAC_TRAMITE_GENERAL.xlsx`

---

*Aprobado. Siguiente paso: spec self-review → plan de implementación detallado.*
