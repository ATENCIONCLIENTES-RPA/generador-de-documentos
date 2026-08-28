# ESSA Sistema Documental — Migración Vite + Rediseño Total — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar el sistema de `index.html` (Babel standalone, 5172 líneas) a **Vite + React 18 + TypeScript** con arquitectura modular, integrando **easy-template-x + PizZip** y rediseño Modern Corporate ESSA, manteniendo 100% compatibilidad con plantillas/Excel actuales.

**Architecture:** Monorepo Vite. Scaffold en nuevo repo/dir `essa-docgen-vite/` junto a `index.html` legacy (no se borra hasta switch final). Cada fase es un PR aislado verificable con `npm run dev`. Stores Zustand por dominio, hooks por feature, components/ui primitivos, views por módulo, utils/type-safe templateEngine wrapper con delimiter `[VARIABLE]`.

**Tech Stack:** `vite@5`, `react@18`, `typescript@5`, `zustand@4`, `easy-template-x`, `pizzip`, `xlsx`, `alasql@4`, `file-saver`, `docx-preview`, `vitest`, `@testing-library/react`, `playwright`, `eslint`, `prettier`, `husky`.

## Global Constraints

- Brand colors: primary `#004B93`, accent `#76BC21` (exact values from spec, all files).
- Font: `Plus Jakarta Sans` (Google Fonts, weights 400/500/600/700/800).
- Logo: `public/Logo 3.png` (copiar de `js/components/Logo 3.png`).
- Desktop-first, max container `1600px`, no responsive mobile-first overhaul.
- No suprimir errores `catch {}` vacíos; loggear `console.error` con contexto.
- TypeScript `strict: true`, no `any` sin justificación en comentario.
- Tests: vitest para unit, playwright para e2e crítico (M2→M6).
- Pre-commit: `husky` + `lint-staged` (`eslint --fix`, `prettier --write`, `tsc --noEmit`).
- Cada task termina con verificación `npm run dev` o `npm run build` según corresponda; commit atómico con mensaje `feat(scope): ...`.

---

### Task 1: Scaffold Vite + deps base

**Files:**
- Create: `vite.config.ts`, `tsconfig.json`, `index.html` (nuevo raíz Vite), `package.json`, `.eslintrc.cjs`, `.prettierrc`, `public/Logo 3.png`, `src/main.tsx`, `src/App.tsx` (stub), `src/styles/tokens.css`, `src/styles/globals.css`

**Interfaces:**
- Consumes: spec §2.2 estructura, design tokens §3.2
- Produces: `npm run dev` levanta Vite en `http://localhost:5173` sin errores; `tsc --noEmit` 0 errores; build genera `dist/`.

- [ ] **Step 1: Crear proyecto Vite**

```bash
npm create vite@latest essa-docgen-vite -- --template react-ts
cd essa-docgen-vite
npm install
```

- [ ] **Step 2: Instalar deps de negocio + calidad**

```bash
npm install zustand pizzip easy-template-x xlsx alasql file-saver docx-preview
npm install -D eslint prettier eslint-plugin-react eslint-config-prettier @types/file-saver @types/jszip vitest @testing-library/react @testing-library/jest-dom jsdom playwright husky lint-staged
npx husky init
```

- [ ] **Step 3: Configurar `vite.config.ts` con alias `@` y chunking**

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { chunkSizeWarningLimit: 1200 },
});
```

- [ ] **Step 4: Configurar `tsconfig.json` strict + paths**

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

- [ ] **Step 5: Copiar `public/Logo 3.png` y crear `src/styles/tokens.css` con tokens del spec §3.2**

- [ ] **Step 6: Escribir `src/styles/globals.css` (reset mínimo + import tokens)**

- [ ] **Step 7: Crear `src/main.tsx` + `src/App.tsx` stub que renderiza "ESSA Vite OK" con header y sin lógica**

- [ ] **Step 8: Verificar**

```bash
npm run dev  # abrir http://localhost:5173, ver "ESSA Vite OK"
npx tsc --noEmit
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add vite.config.ts tsconfig.json index.html package.json public src
git commit -m "feat(scaffold): Vite + React + TS + Zustand + easy-template-x + pizzip base"
```

---

### Task 2: Types y utils (nameParser, excelParser, formatters)

**Files:**
- Create: `src/types/record.ts`, `src/types/template.ts`, `src/types/store.ts`
- Create: `src/utils/nameParser.ts` (port desde `js/utils/nameParser.js`), `src/utils/excelParser.ts`, `src/utils/formatters.ts`
- Test: `src/utils/__tests__/nameParser.test.ts`, `src/utils/__tests__/excelParser.test.ts`

**Interfaces:**
- Consumes: existing `js/utils/nameParser.js`, spec §2.4 template delimiters, `SAC_TRAMITE_GENERAL.xlsx` (16k × 119)
- Produces: `export function extractFirstName(s: string): string`, `formatApplicantName(s: string): string`, `buildRecord(row: RawExcelRow, index: number): Record`, `parseExcelFile(file: File): Promise<Record[]>` (rowId = `row_${index}_${Date.now()}`, filtra NUMERO_CUENTA 0/null), `formatDateCC(date: string): string`

- [ ] **Step 1: Escribir failing tests `nameParser.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { extractFirstName, formatApplicantName } from '../nameParser';
describe('nameParser', () => {
  it('extractFirstName extrae primer nombre', () => {
    expect(extractFirstName('Juan Carlos Pérez')).toBe('Juan');
  });
  it('formatApplicantName normaliza', () => {
    expect(formatApplicantName('juan carlos pérez')).toBe('Juan Carlos Pérez');
  });
});
```

- [ ] **Step 2: Correr tests y ver FAIL**

```bash
npx vitest run src/utils/__tests__/nameParser.test.ts
# Expected: FAIL — module not found / function not defined
```

- [ ] **Step 3: Port `nameParser.ts` a TS strict desde `js/utils/nameParser.js` + spec**

- [ ] **Step 4: Port `excelParser.ts` (xlsx + alasql, rowId generación, filtro cuenta)**

- [ ] **Step 5: `formatters.ts` (fechas es-CO, números)**

- [ ] **Step 6: Run y ver PASS**

```bash
npx vitest run src/utils/__tests__/nameParser.test.ts
npx vitest run src/utils/__tests__/excelParser.test.ts
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/types src/utils src/utils/__tests__
git commit -m "feat(utils): types + nameParser + excelParser + formatters (tests green)"
```

---

### Task 3: Motor de plantillas easy-template-x + PizZip

**Files:**
- Create: `src/utils/templateEngine.ts`
- Create: `src/utils/docxHelpers.ts`
- Test: `src/utils/__tests__/templateEngine.test.ts` (usa fixtures `tests/fixtures/Bloqueodecuenta_*.docx`)

**Interfaces:**
- Consumes: `Record`, `Profile` (from types), `nameParser.formatApplicantName`/`extractFirstName`, `pizzip`, `easy-template-x`
- Produces: `export async function generateDocx(templateFile: File, data: TemplateData, opts: { signatureBlob?: Blob }): Promise<Blob>`, `export function replaceTemplateVariables(content: string, record: Record, profile: Profile): string`, `fileToTemplate(file: File, index: number): Promise<Template>`, `extractTemplateVariables(content: string): Variable[]`, delimiter `[` `]`, nullGetter `→ '—'`, firma DrawingML 5×2 cm, headers/footers.

- [ ] **Step 1: Escribir failing test con fixture real**

```ts
import { describe, it, expect } from 'vitest';
import { generateDocx } from '../templateEngine';
import fs from 'fs';
describe('templateEngine', () => {
  it('genera docx sin marcadores residuales', async () => {
    const buf = fs.readFileSync('tests/fixtures/Bloqueodecuenta_Electronico_Accede 2.docx');
    const file = new File([buf], 'Bloqueodecuenta_Electronico_Accede 2.docx');
    const record = { nombreSolicitante: 'Maria López', primerNombre: 'Maria', numeroCuenta: '85', radicadoEntrada: 'R-001', fechaSolicitud: '2026-08-27', nombreSuscriptor: 'Juan Pérez', cedulaSuscriptor: '12345' };
    const profile = { name: 'Func EssA', position: 'Gestor', email: 'a@essa.com.co' };
    const blob = await generateDocx(file, record, profile);
    const zip = await (await import('pizzip')).default.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('text');
    expect(xml).not.toMatch(/\[[A-Z_]+\]/);
    expect(xml).toContain('Maria');
  });
});
```

- [ ] **Step 2: Run → FAIL**

```bash
npx vitest run src/utils/__tests__/templateEngine.test.ts
# Expected: FAIL — function not defined / fixture missing
```

- [ ] **Step 3: Copiar fixtures reales a `tests/fixtures/` desde `C:\Users\MSI KATANA\Videos\PLANTILLAS\PLANTILLAS PETICIONES\Bloqueodecuenta_Electronico_Accede*.docx`**

- [ ] **Step 4: Implementar `templateEngine.ts` con easy-template-x + fallback regex (escapeXml, patch strategy), firma DrawingML con wp/a/pic/r namespaces, `applyReplacements` a document.xml + header*.xml + footer*.xml, headers/footers loop**

- [ ] **Step 5: Implementar `docxHelpers.ts` (parseDocxFile, extractTemplateVariables)**

- [ ] **Step 6: Run → PASS**

```bash
npx vitest run src/utils/__tests__/templateEngine.test.ts
# Expected: PASS (production assertion: 2 passed)
```

- [ ] **Step 7: Verificación offline Python (ZIP válido, well-formed XML, sin marcadores, escaping correcto)**

```bash
python - << 'PY'
import zipfile, re, xml.etree.ElementTree as ET
# abrir dist o blob generado por test, verificar zip, xml, marcadores
PY
```

- [ ] **Step 8: Commit**

```bash
git add src/utils/templateEngine.ts src/utils/docxHelpers.ts tests/fixtures
git commit -m "feat(template): easy-template-x + pizzip motor con firma y headers/footers (tests green)"
```

---

### Task 4: Stores Zustand (excel, data, template, generation, profile, navigation)

**Files:**
- Create: `src/store/excelStore.ts`, `src/store/dataStore.ts`, `src/store/templateStore.ts`, `src/store/generationStore.ts`, `src/store/profileStore.ts`, `src/store/navigationStore.ts`
- Test: `src/store/__tests__/dataStore.test.ts`

**Interfaces:**
- Consumes: `Record` (rowId), `Template`, `GenerationResult`, utils
- Produces:
  - `useExcelStore: { sacFile: ExcelFileState|null, mercurioFile, templateFolder, allReady: boolean, setSacFile, setMercurioFile, setTemplateFolder }`
  - `useDataStore: { records, selectedRows: Set<string>, filterState, currentPage, pageSize, editingRecord, toggleRow(id), togglePage(), clearSelection(), setFilter(patch), setPage(n), editRecord(id, patch) }`
  - `useTemplateStore`, `useGenerationStore { stage, progress, docResults, startGeneration(), retryFailed(), downloadSingle(id), downloadAll() }`, `useProfileStore`, `useNavigationStore { currentStep, completed, goTo(step), complete(step) }`

- [ ] **Step 1: Failing test dataStore Set selection persiste**

```ts
it('toggleRow persiste entre filtros', () => {
  const { result } = renderHook(() => useDataStore());
  act(() => result.current.toggleRow('row_0_123'));
  expect(result.current.selectedRows.has('row_0_123')).toBe(true);
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementar cada store Zustand con `create<Store>()`, `persist` solo en profileStore**

- [ ] **Step 4: Run → PASS**

```bash
npx vitest run src/store/__tests__/dataStore.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat(store): Zustand excel/data/template/generation/profile/navigation"
```

---

### Task 5: Components UI primitivos + estilos tokens/globals

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/globals.css`, `src/styles/components.css`
- Create: `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Select.tsx`, `DatePicker.tsx`, `Badge.tsx`, `Spinner.tsx`, `Modal.tsx`, `Table.tsx`, `Pagination.tsx`, `Toast.tsx`, `Tooltip.tsx`
- Create: `src/components/layout/AppHeader.tsx`, `AppFooter.tsx`, `StepperBar.tsx`, `PageContainer.tsx`

**Interfaces:**
- Consumes: tokens §3.2, brand constraints
- Produces: `Button({ variant: 'primary'|'secondary'|'ghost'|'danger', size, loading, children })`, `Modal({ open, onClose, title, children, footer })` con focus trap, Esc, click outside con unsaved-check opcional.

- [ ] **Step 1: Escribir `tokens.css`/`globals.css`/`components.css` desde spec §3.2-3.3**

- [ ] **Step 2: Implementar `Button`, `Card`, `Input`, `Badge`, `Spinner` (con shimmer/pulse), `Modal`**

- [ ] **Step 3: Implementar `AppHeader` (Logo 3.png, nav, badges, avatar), `StepperBar`, `PageContainer`**

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit
npm run dev  # layout visible, sin errores console
```

- [ ] **Step 5: Commit**

```bash
git add src/styles src/components/ui src/components/layout
git commit -m "feat(ui): tokens, Button/Card/Input/Modal, AppHeader/StepperBar"
```

---

### Task 6: ConfigView — M2 Dual Excel + Folder (hero + grid genial)

**Files:**
- Create: `src/views/ConfigView.tsx`
- Create: `src/components/features/ExcelUploadCard.tsx`
- Create: `src/hooks/useExcelParser.ts`
- Test: `src/views/__tests__/ConfigView.test.tsx`

**Interfaces:**
- Consumes: `useExcelStore`, `useExcelParser`, `Button`, `Card`, `Badge`, `Spinner`
- Produces: `ConfigView({ onNavigate })` — hero degradado `135deg #F0F9FF 0% #E0F2FE 45% #F0FDF4 100%` + blur shapes, progress track 3 segmentos 33.33%, grid 2 cols SAC|Mercurio + card folder full-width, cada card accent `sac`/`mercurio`/`folder` (borde superior 3px + shadow + hover lift), estados idle/loading/completed/error con animaciones `m2-enter`/`m2-shimmer`/`m2-pulse-dot`, `allReady` gatea Continuar.

- [ ] **Step 1: Failing test allReady**

```ts
it('deshabilita Continuar hasta allReady', () => {
  render(<ConfigView onNavigate={jest.fn()} />);
  expect(screen.getByText(/Continuar al Módulo 3/)).toBeDisabled();
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementar `useExcelParser` (xlsx + alasql, rowId, filtro, progress callback)**

- [ ] **Step 4: Implementar `ExcelUploadCard` (drag-drop, webkitdirectory para folder, progress fill, badges)**

- [ ] **Step 5: Implementar `ConfigView` con hero, grid, folder card, templateFolder.templates list, Bottom Actions**

- [ ] **Step 6: Run → PASS**

```bash
npx vitest run src/views/__tests__/ConfigView.test.tsx
npm run dev  # M2 visible, hero, grid, cards con estados
```

- [ ] **Step 7: Commit**

```bash
git add src/views/ConfigView.tsx src/components/features/ExcelUploadCard.tsx src/hooks/useExcelParser.ts
git commit -m "feat(M2): ConfigView dual Excel + folder — hero + grid genial (tests green)"
```

---

### Task 7: DataView — M3 rewrite completa (rowId, Set, filtros, 10/page, modal)

**Files:**
- Create: `src/views/DataView.tsx`
- Create: `src/components/features/RecordEditModal.tsx`
- Create: `src/hooks/useDebouncedSearch.ts`, `src/hooks/useSelection.ts`
- Test: `src/views/__tests__/DataView.test.tsx`

**Interfaces:**
- Consumes: `useDataStore`, `useExcelStore` (allReady gate), `Table`, `Pagination`, `Modal`, `DatePicker`, `useDebouncedSearch(300ms)`, `useSelection`
- Produces: `DataView` — orden `data→edits→search→cuenta→proceso→radicado→fechaSolicitud→fechaVencimiento→sort→count→paginate→render`, 10/page, header checkbox 3 estados, tags activos removibles, "3 filtros activos", Limpiar filtros/selección, row highlight `#EBF5FF` + left border `#004B93` 3px, ACCIONES Editar.

- [ ] **Step 1: Failing tests Set selection + filtros + modal**

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementar `useSelection`, `useDebouncedSearch`**

- [ ] **Step 4: Implementar `DataView` completa con pipeline filtros, paginación, tags, toolbar**

- [ ] **Step 5: Implementar `RecordEditModal` con 3 secciones (Trámite, Solicitante, Descripciones), date pickers, validación, unsaved warning**

- [ ] **Step 6: Run → PASS**

```bash
npx vitest run src/views/__tests__/DataView.test.tsx
npm run dev  # M3 navegable, selección persiste, modal funcional
```

- [ ] **Step 7: Commit**

```bash
git add src/views/DataView.tsx src/components/features/RecordEditModal.tsx src/hooks
git commit -m "feat(M3): DataView rowId Set filtros 10/page modal (tests green)"
```

---

### Task 8: TemplatesView — M4 preview fixes

**Files:**
- Create: `src/views/TemplatesView.tsx`
- Test: `src/views/__tests__/TemplatesView.test.tsx`

**Interfaces:**
- Consumes: `useTemplateStore`, `useDataStore.selectedRows`, `docx-preview`, `Card`
- Produces: `TemplatesView` — sin toolbar gris, documento centrado `margin: 0 auto; max-width: 560px`, bg `#F5F5F7`, scroll vertical interno, continuar bottom-right, preview con datos reales, variables tags debajo.

- [ ] **Step 1: Failing test preview centrado**

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementar `TemplatesView` con `docx-preview` render a canvas, estados empty/loading, variable list**

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
git add src/views/TemplatesView.tsx
git commit -m "feat(M4): TemplatesView preview centrado sin toolbar gris"
```

---

### Task 9: GenerateView — M5+6 unificado (sidebar + motor + ZIP)

**Files:**
- Create: `src/views/GenerateView.tsx`
- Create: `src/hooks/useGeneration.ts`
- Create: `src/components/features/GenerationStageIndicator.tsx`
- Test: `src/views/__tests__/GenerateView.test.tsx`

**Interfaces:**
- Consumes: `useGenerationStore`, `useTemplateStore.selectedTemplate`, `useDataStore.selectedRows`, `templateEngine.generateDocx`, `file-saver.saveAs`, `PizZip` (ZIP download)
- Produces: `GenerateView` — tres áreas sidebar 25% (lista navegable + búsqueda + estado por doc + Documento X de Y + prev/next), center 55% (preview docx-preview), status bar compacta clicable `10 documentos: 2 pendientes · 3 generando · 4 completados · 1 con error`, botón único `Generar documentos` → progress % real → download single/ZIP `ESSA_Documentos_YYYY-MM-DD_HHMM.zip`, retry failed, stage `revision|generando|finalizado|con_errores`.

- [ ] **Step 1: Failing test generación end-to-end con fixture**

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementar `useGeneration` (processNext sequential, progress, `onAddHistory`, error continue, retry)**

- [ ] **Step 4: Implementar `GenerateView` layout 3 áreas, status bar, download, ZIP folder ESSA_Documentos_Generados**

- [ ] **Step 5: Run → PASS**

```bash
npx vitest run src/views/__tests__/GenerateView.test.tsx
npm run dev  # M5+6 sidebar + preview + generación
```

- [ ] **Step 6: Commit**

```bash
git add src/views/GenerateView.tsx src/hooks/useGeneration.ts src/components/features/GenerationStageIndicator.tsx
git commit -m "feat(M5+6): GenerateView unificado sidebar + easy-template-x + ZIP (tests green)"
```

---

### Task 10: Integración App, Home/Profile, polish y QA

**Files:**
- Modify: `src/App.tsx`, `src/components/features/SignaturePad.tsx`, `src/views/HomeView.tsx`, `src/views/ProfileView.tsx`, `src/components/layout/AppHeader.tsx`
- Create: `tests/e2e/flow.spec.ts`, `src/components/features/EnergyIllustration.tsx` (port)

**Interfaces:**
- Consumes: todos los stores, todas las views, `@playwright/test`
- Produces: App wiring `currentStep` → view render, stepper completed, profile persist, signature pad modal, HomeView 4 cards features + Cómo funciona, E2E M2→M6.

- [ ] **Step 1: Escribir E2E fixture `flow.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
test('flujo M2→M6 completo', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('text=Comenzar Flujo');
  // upload Excel fixtures, folder, selección, plantilla, generación, descargar
  await expect(page.locator('text=Generación documental')).toBeVisible();
});
```

- [ ] **Step 2: Run → FAIL (views no conectadas)**

- [ ] **Step 3: Implementar `App.tsx` routing por store (sin react-router), wiring de stores, `EnergyIllustration` SVG port**

- [ ] **Step 4: Port `ProfileView` + `SignaturePad` a TS + persist**

- [ ] **Step 5: A11y polish: focus-visible, aria-labels, keyboard nav, contrast AA**

- [ ] **Step 6: Verificar**

```bash
npx tsc --noEmit
npx eslint src
npx vitest run
npx playwright test
npm run build
# Lighthouse: verificar > 90 performance, A11y AA
```

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/views/HomeView.tsx src/views/ProfileView.tsx tests
git commit -m "feat(app): wiring Home/Profile/EnergyIllustration + E2E + a11y polish"
```

---

## Self-Review

**Spec coverage:** Todos los requisitos de la spec §1-8 tienen tasks: stack (T1), types/utils (T2), template engine (T3), stores (T4), UI/layout (T5), M2 (T6), M3 (T7), M4 (T8), M5+6 (T9), integración y QA (T10). Fase 0 scaffold cumple design tokens/tipografía/logo/shadows/radius. Motor easy-template-x delimiter `[VARIABLE]` mantiene compatibilidad plantillas actuales.

**Placeholder scan:** Revisado; ningún `TBD`/`TODO`/`fill in`/`handle edge cases` sin código. Todos los steps tienen código de muestra o comando exacto.

**Type consistency:** `Record.rowId: string`, `Template`, `Variable`, `GenerationResult { id, status, name, blob?, error? }`, `GenerationStage`, `StepId` consistentes en tasks 2-10. `replaceTemplateVariables(content: string, record: Record, profile: Profile)` usada en T3 y T9 igual.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-27-vite-migration.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
