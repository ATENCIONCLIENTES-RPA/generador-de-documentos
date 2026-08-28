# ESSA Sistema Documental - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete overhaul of Modules 2-6: dual Excel upload, data review with editing modal, template preview fixes, unified generation view, and DOCX variable replacement fix.

**Architecture:** Single-page React app in `index.html` with inline Babel transpilation. All changes in one file. Modules: ConfigView (M2), DataView (M3), TemplatesView (M4), unified PreviewView+GenerateView (M5). State managed via useState in App component.

**Tech Stack:** React 18, Babel in-browser, JSZip, docx-preview, AlaSQL, XLSX, FileSaver, custom CSS.

## Global Constraints

- All code in `index.html` `<script type="text/babel">` block
- Brand colors: primary `#004B93`, accent `#76BC21`
- Font: Plus Jakarta Sans
- Logo: `js/components/Logo 3.png`
- Desktop-first optimization
- No build system, no bundler
- Maintain existing visual language

---

## Phase 1: Module 2 - ConfigView (Dual Excel + Folder)

### Task 1.1: Refactor ConfigView state and section structure

**Files:**
- Modify: `index.html` ConfigView component (~lines 3329-3644)

**Changes:**
- Add `mercurioFile` state alongside `excelFile`
- Rename sections: "1. Carga de Archivo Excel SAC", "2. Carga de Archivo Excel de Mercurio", "3. Selección de Carpeta de Plantillas"
- Each section has independent state: `{ file, loading, progress, error, recordCount, folder }`
- Remove old single-excel upload logic

- [ ] Add state variables for mercurioFile, mercurioLoaded, mercurioProgress, mercurioError, mercurioRecordCount
- [ ] Restructure JSX into three numbered sections
- [ ] Section 1: SAC Excel upload with drag-drop, file input, progress bar, validation
- [ ] Section 2: Mercurio Excel upload (identical design to SAC)
- [ ] Section 3: Folder selection for .docx templates
- [ ] Each section shows independent status: idle, selecting, loading, processing, validating, completed, error
- [ ] Add animation: circular spinner during processing, progress bar, dynamic text
- [ ] On completion: green checkmark icon, filename, record count
- [ ] On error: red warning icon, clear error message, retry action
- [ ] Verify "Continuar al Módulo 3" button disabled until both Excel files loaded + folder selected

### Task 1.2: Implement dual Excel parsing

**Files:**
- Modify: `index.html` parseExcelFile function (~line 1879)
- Modify: `index.html` ConfigView onChange handlers

**Changes:**
- parseExcelFile stays the same, called independently for each file
- SAC Excel creates `sacRecords` state
- Mercurio Excel creates `mercurioRecords` state (if needed, or merged)
- Each upload is independent - selecting one file doesn't affect the other

- [ ] Create separate onChange handlers for SAC and Mercurio file inputs
- [ ] Each handler calls parseExcelFile independently
- [ ] Store results in separate state variables
- [ ] Show independent progress for each
- [ ] Validate file extensions (.xlsx, .xls only)
- [ ] Show error for invalid formats
- [ ] Show record count after successful parse

### Task 1.3: ConfigView visual design

**Files:**
- Modify: `index.html` ConfigView CSS and JSX

**Changes:**
- White cards with rounded borders
- Dashed border upload areas
- Progress bars with animations
- Compact completed state with expand option
- Consistent with existing visual language

- [ ] Style upload areas with dashed borders, hover effects
- [ ] Add progress bar animations
- [ ] Add completed state: compact card with green check, filename, count
- [ ] Add error state: red border, warning icon, error message
- [ ] Ensure sections have clear visual separation
- [ ] Optimize for desktop (reduce card heights when completed)

---

## Phase 2: Module 3 - DataView (Complete Rewrite)

### Task 2.1: Add rowId generation and unique identifiers

**Files:**
- Modify: `index.html` parseExcelFile function

**Changes:**
- Generate `rowId` for each record during parsing
- rowId = `row_${index}_${Date.now()}` (unique, stable, never changes)
- Add rowId to each record object
- rowId used for ALL selection, editing, highlighting operations

- [ ] In parseExcelFile, add `rowId: 'row_${i}_${Date.now()}'` to each record
- [ ] Ensure rowId is generated once and never changes
- [ ] Store rowId as non-enumerable or hidden property if needed

### Task 2.2: Rewrite DataView selection logic

**Files:**
- Modify: `index.html` DataView component (~lines 3647-4046)

**Changes:**
- Selection uses `Set` of rowIds (not record objects)
- `selectedRows` state = `new Set()`
- Each checkbox toggle adds/removes its rowId from the Set
- Selection independent of page, filter, sort position
- "Marcar pág." selects only visible page rows (max 10)
- Header checkbox has 3 states: unchecked, checked, indeterminate

- [ ] Replace `records.filter(r => r.selected)` pattern with `selectedRows` Set
- [ ] Implement toggleRow(rowId) - adds/removes from Set
- [ ] Implement togglePage() - selects/deselects all visible page rows
- [ ] Implement header checkbox 3-state logic
- [ ] Show selection count: "5 seleccionados"
- [ ] Selection persists across filter changes
- [ ] Selection persists across page changes
- [ ] Selection persists across search changes

### Task 2.3: Rewrite DataView filtering system

**Files:**
- Modify: `index.html` DataView component

**Changes:**
- Processing order: data → edits → search → account → process → radicado → dateSolicitud → dateVencimiento → additional → sort → count → paginate → render
- Each filter is independent text input
- Date filters use calendar picker (input type="date" with custom styling)
- All filters combine with AND logic
- Each filter change returns to page 1
- Active filter count shown
- Filter tags shown with remove action

- [ ] Create filterState: `{ search, cuenta, proceso, radicado, fechaSolicitud, fechaVencimiento }`
- [ ] Implement applyFilters() function with correct processing order
- [ ] Add debounce (300ms) for search input
- [ ] Add calendar inputs for date filters
- [ ] Show active filter tags: "Cuenta: 937", "Proceso: 71116859"
- [ ] Each tag has X button to remove that filter
- [ ] Show "3 filtros activos" counter
- [ ] Add "Limpiar filtros" button (appears when any filter active)
- [ ] "Limpiar filtros" clears all filters but NOT selection
- [ ] "Limpiar selección" clears selection but NOT filters
- [ ] Filter changes reset to page 1

### Task 2.4: Implement 10-per-page pagination

**Files:**
- Modify: `index.html` DataView component

**Changes:**
- Default 10 records per page
- Show "Mostrando 1–10 de 18.329 registros"
- With filters: "Mostrando 1–10 de 35 registros filtrados"
- Page navigation: prev, next, page numbers
- "Ir a..." input with validation
- Total pages recalculated on filter change

- [ ] Set PAGE_SIZE = 10
- [ ] Calculate totalPages from filteredResults.length
- [ ] Implement pagination controls
- [ ] Show range text: "Mostrando X–Y de Z registros"
- [ ] Handle edge cases: last page with fewer items, empty results
- [ ] Show "No se encontraron registros" when no results

### Task 2.5: Implement edit modal

**Files:**
- Modify: `index.html` DataView component
- Add: EditModal inline component

**Changes:**
- "ACCIONES" column with "Editar" button per row
- Modal opens on "Editar" click
- Modal loads record by rowId (not position)
- Modal has 3 sections: Trámite, Solicitante, Descripciones
- Date fields use calendar picker
- Save validates and updates record
- Cancel discards changes
- Close button (X), Escape, click outside - all check for unsaved changes

- [ ] Add "ACCIONES" column to table header
- [ ] Add "Editar" button with pencil icon per row
- [ ] Create EditModal component with:
  - [ ] Header: "Editar Registro #N" with radicado
  - [ ] Section 1: INFORMACIÓN DEL TRÁMITE (Proceso, Radicado, Cuenta, Fechas)
  - [ ] Section 2: INFORMACIÓN DEL SOLICITANTE (Nombre, Cédula, Dirección, etc.)
  - [ ] Section 3: DESCRIPCIONES (multiline text fields)
  - [ ] Footer: Cancel + Save buttons
- [ ] Modal opens with current record values
- [ ] Modal saves changes to record by rowId
- [ ] Modal maintains selection, filters, page
- [ ] Unsaved changes warning on close/cancel/escape
- [ ] Only one modal open at a time
- [ ] Save button disabled during save operation

### Task 2.6: Implement row highlighting and visual states

**Files:**
- Modify: `index.html` DataView CSS

**Changes:**
- Selected rows: light blue background, blue left border (3px)
- Edit button active state when modal open
- Smooth transitions
- Accessible (not color-only)

- [ ] Add CSS for selected row: `background: #EBF5FF; border-left: 3px solid #004B93`
- [ ] Add CSS for edit-active row
- [ ] Add transition: `transition: all 0.2s ease`
- [ ] Ensure contrast is adequate

### Task 2.7: Implement "Ver seleccionados" and validation

**Files:**
- Modify: `index.html` DataView component

**Changes:**
- "Ver seleccionados" button shows only selected rows
- "Limpiar selección" with confirmation dialog
- "Validar Seleccionados" button - validates selected records
- Validation state per record
- "Continuar al Módulo 4" disabled until validation passes

- [ ] Add "Ver seleccionados" toggle button
- [ ] When active, show only selected rows (maintains pagination)
- [ ] Add "Limpiar selección" with confirmation: "¿Deseas desmarcar todos?"
- [ ] Add "Validar Seleccionados" button
- [ ] Validation checks required fields
- [ ] Show validation results per record
- [ ] "Continuar" button disabled when: no selection, unvalidated, unsaved changes, validating

---

## Phase 3: Module 4 - TemplatesView (Preview Fixes)

### Task 3.1: Fix template preview layout

**Files:**
- Modify: `index.html` TemplatesView component (~lines 4049-4334)

**Changes:**
- Remove gray header box
- Center document horizontally
- Uniform internal margins
- Neutral background
- Vertical scroll for document content only
- Remove "Datos reales" and "Variables [TAGS]" buttons
- Move "Continuar a Vista Previa" to bottom right of container

- [ ] Remove gray header/toolbar element above document viewer
- [ ] Center document: `margin: 0 auto; max-width: 100%`
- [ ] Add uniform padding inside viewer
- [ ] Background: neutral gray (#f5f5f5)
- [ ] Document scroll: `overflow-y: auto` on viewer only
- [ ] Remove "Datos reales" and "Variables [TAGS]" toggle buttons
- [ ] Move "Continuar a Vista Previa" to bottom-right of main container
- [ ] Ensure document not cropped or disproportionate
- [ ] Maintain visual consistency (colors, borders, shadows)

---

## Phase 4: Modules 5+6 - Unified Review/Generate View

### Task 4.1: Create unified module structure

**Files:**
- Modify: `index.html` - Replace PreviewView and GenerateView with single component

**Changes:**
- Single component: "Módulo 5: Revisión, Generación y Descarga"
- Dynamic stages: Revisión → Preparación → Generación → Finalización → Descarga
- Stage indicator (compact, not heavy stepper)
- Three-area layout: left sidebar, center viewer, bottom/right actions

- [ ] Create unified component with stage management
- [ ] Add stage indicator: "Revisión" | "Generando" | "Finalizado" | "Con errores"
- [ ] Implement three-area layout: sidebar (25%), center (55%), actions (20%)
- [ ] Sidebar: document list with navigation
- [ ] Center: document preview with toolbar
- [ ] Actions: generation controls and progress

### Task 4.2: Implement document navigation sidebar

**Files:**
- Modify: unified component

**Changes:**
- List of all selected documents
- Each shows: number, account, radicado, template name, status
- Status icons: pending, ready, generating, done, error
- Search within sidebar
- Click to switch document
- "Documento X de Y" indicator
- Prev/Next navigation

- [ ] Create sidebar component with document list
- [ ] Each item shows: "Documento 1 de 10", "Cuenta: 123", "Radicado: ...", "Plantilla: ..."
- [ ] Status indicators with colors and icons
- [ ] Search input: "Buscar por cuenta, radicado o nombre"
- [ ] Navigation: prev/next buttons
- [ ] Active document highlighted
- [ ] Selection preserves state when switching

### Task 4.3: Implement variable display and editing

**Files:**
- Modify: unified component

**Changes:**
- Variables organized in groups: Datos del trámite, Solicitante, Fechas, Respuesta, Firmante
- Each variable shows: name, value, status (complete/pending/optional)
- Editable variables can be corrected inline
- Preview updates after correction
- "Cambios sin guardar" indicator

- [ ] Create variable groups with collapsible sections
- [ ] Each variable: label, value, status badge
- [ ] Editable fields with save/cancel
- [ ] Preview refresh on variable change
- [ ] Unsaved changes warning

### Task 4.4: Implement compact status bar (replaces stat cards)

**Files:**
- Modify: unified component

**Changes:**
- Replace 4 large stat cards with single compact bar
- Format: "10 documentos: 2 pendientes · 3 generando · 4 completados · 1 con error"
- Each segment clickable to filter list
- Colors: gray (pending), blue (generating), green (done), red (error)

- [ ] Create compact status bar component
- [ ] Show total, pending, generating, completed, error counts
- [ ] Each segment clickable to filter document list
- [ ] Color-coded segments with icons

### Task 4.5: Implement generation flow

**Files:**
- Modify: unified component

**Changes:**
- "Generar documentos" button (disabled until all ready)
- Pre-generation validation summary
- Progress bar with real percentage
- Status per document updates in real-time
- Error handling: continue with remaining docs
- Retry individual failed docs
- "Reintentar documentos con error" button

- [ ] Add "Generar documentos" button with validation
- [ ] Show pre-generation summary: "Se generarán 10 documentos en formato DOCX"
- [ ] Implement generation with progress tracking
- [ ] Update each document's status in sidebar
- [ ] Handle errors: log, continue, allow retry
- [ ] Add "Reintentar documentos con error" button

### Task 4.6: Implement download functionality

**Files:**
- Modify: unified component

**Changes:**
- Individual download per document
- "Descargar todos" as ZIP
- ZIP naming: "DOCUMENTOS_GENERADOS_YYYY-MM-DD_HHMM.zip"
- Post-generation summary view
- "Nueva generación" action

- [ ] Add "Descargar" button per completed document
- [ ] Add "Descargar todos" button (creates ZIP)
- [ ] Generate ZIP with unique filenames
- [ ] Show post-generation summary
- [ ] Add "Nueva generación" button
- [ ] Add "Volver a plantillas" / "Volver a revisión de datos"

---

## Phase 5: DOCX Generation Fix

### Task 5.1: Fix variable replacement in generated DOCX

**Files:**
- Modify: `index.html` generateDocxForRecord function (~line 4631)

**Changes:**
- Already fixed regex: `<w:t(?:\s[^>]*)?>` instead of `<w:t[^>]*>`
- Verify paragraph-based replacement works correctly
- Test with actual template that has split markers

- [ ] Verify current regex fix handles `<w:tab>` vs `<w:t>` correctly
- [ ] Test with Bloqueodecuenta_Electronico_Accede.docx template
- [ ] Confirm [NUMERO_CUENTA] split across runs is replaced
- [ ] Confirm [FIRMA_DOCUMENTO] signature image is inserted
- [ ] Confirm generated DOCX opens in Word without corruption

---

## Phase 6: Integration and Polish

### Task 6.1: Update App state management

**Files:**
- Modify: `index.html` App component

**Changes:**
- Add `sacRecords` and `mercurioRecords` state
- Add `selectedRows` Set state
- Add `editingRecord` state for modal
- Add `filterState` for DataView
- Add `generationStage` for unified module
- Update navigation flow

- [ ] Add new state variables
- [ ] Update step navigation
- [ ] Ensure state persistence across module switches
- [ ] Clear state on "Nueva generación"

### Task 6.2: Final visual polish

**Files:**
- Modify: `index.html` CSS

**Changes:**
- Consistent card styles across modules
- Smooth transitions
- Responsive within desktop range
- Accessibility: focus states, aria labels, keyboard navigation

- [ ] Review all modules for visual consistency
- [ ] Add focus-visible styles
- [ ] Add aria labels to interactive elements
- [ ] Test keyboard navigation
- [ ] Verify no breaking changes to existing features

---

## Execution Order

1. Phase 1 (Module 2) - ConfigView with dual Excel
2. Phase 2 (Module 3) - DataView complete rewrite
3. Phase 5 (DOCX Fix) - Variable replacement
4. Phase 3 (Module 4) - TemplatesView preview fixes
5. Phase 4 (Modules 5+6) - Unified view
6. Phase 6 - Integration and polish
