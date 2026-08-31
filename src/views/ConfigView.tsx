import { useRef, useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { useExcelStore } from '@/store/excelStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useExcelParser } from '@/hooks/useExcelParser';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { fileToTemplate } from '@/utils/docxHelpers';
import { parseMercurioFile } from '@/utils/excelParser';
import ExcelUploadCard from '@/components/features/ExcelUploadCard';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const SAC_URL =
  'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/SAC_TRAMITE_EXCEL_COMPARTIDO?d=wc7d2ddae58bf4835affc2ac2eb9d5791&csf=1&web=1&e=vwn0sV';
const MERCURIO_URL =
  'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/MERCURIO_TRAMITE_EXCEL_COMPARTIDO?d=wecd9b18ce9a0467ba0689edaca9a58c7&csf=1&web=1&e=TDZGI5';
const PLANTILLAS_URL =
  'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/PLANTILAS_SOPORTE%20CLIENTES?d=wbb247310e4a14457bc93016440b8ecb0&csf=1&web=1&e=Cin5Ow';

interface FolderTpl {
  name: string;
  size: number;
}

export function ConfigView() {
  const sacFile = useExcelStore((s) => s.sacFile);
  const mercurioFile = useExcelStore((s) => s.mercurioFile);
  const templateFolder = useExcelStore((s) => s.templateFolder);
  const setSacFile = useExcelStore((s) => s.setSacFile);
  const setMercurioFile = useExcelStore((s) => s.setMercurioFile);
  const setTemplateFolder = useExcelStore((s) => s.setTemplateFolder);
  const clearAll = useExcelStore((s) => s.clearAll);
  const allReady = useExcelStore((s) => s.allReady);

  const goTo = useNavigationStore((s) => s.goTo);
  const complete = useNavigationStore((s) => s.complete);

  const [dragSac, setDragSac] = useState(false);
  const [dragMercurio, setDragMercurio] = useState(false);
  const [dragFolder, setDragFolder] = useState(false);
  const [folderTemplates, setFolderTemplates] = useState<FolderTpl[]>([]);
  const [folderName, setFolderName] = useState('');

  const sacRef = useRef<HTMLInputElement>(null);
  const mercurioRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const { parseWithProgress } = useExcelParser();
  const setSacRecords = useDataStore((s) => s.setSacRecords);
  const setMercurioRecords = useDataStore((s) => s.setMercurioRecords);

  const handleSacFile = useCallback(
    async (file: File) => {
      try {
        const records = await parseWithProgress(file, setSacFile);
        if (records.length > 0) setSacRecords(records);
      } catch {
        // error already set in store via hook
      }
    },
    [parseWithProgress, setSacFile, setSacRecords]
  );

  const handleMercurioFile = useCallback(
    async (file: File) => {
      try {
        const records = await parseWithProgress(
          file,
          setMercurioFile,
          undefined,
          parseMercurioFile
        );
        if (records.length > 0) setMercurioRecords(records);
      } catch {
        // handled
      }
    },
    [parseWithProgress, setMercurioFile, setMercurioRecords]
  );

  const handleFolderFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      const docx = arr.filter((f) => f.name.toLowerCase().endsWith('.docx'));
      const name =
        (arr[0] as unknown as { webkitRelativePath?: string })?.webkitRelativePath?.split('/')[0] ||
        'Plantillas';
      setFolderName(name);
      setFolderTemplates(docx.map((f) => ({ name: f.name, size: f.size })));
      if (docx.length === 0) {
        setTemplateFolder({
          file: null,
          loading: false,
          progress: 0,
          stage: 'Sin plantillas válidas',
          error: 'No se encontraron plantillas .docx en la carpeta',
          recordCount: 0,
        });
        useTemplateStore.getState().clearTemplates();
        return;
      }
      // create pseudo file for store — use first docx or synthetic
      const pseudo = docx[0] ?? arr[0] ?? null;
      const folderFile = pseudo ? new File([pseudo], name, { type: pseudo.type }) : null;

      const totalBytes = docx.reduce((acc, f) => acc + (f.size || 0), 0);
      setTemplateFolder({
        file: folderFile as unknown as File,
        loading: true,
        progress: 15,
        stage: `Analizando ${docx.length} plantillas DOCX...`,
        error: null,
        recordCount: 0,
        bytesProcessed: 0,
        totalBytes,
      });

      try {
        const templates = [];
        for (let i = 0; i < docx.length; i++) {
          const f = docx[i];
          const pct = Math.min(95, 15 + Math.round(((i + 1) / docx.length) * 80));
          setTemplateFolder({
            file: folderFile as unknown as File,
            loading: true,
            progress: pct,
            stage: `Extrayendo variables: ${f.name} (${i + 1}/${docx.length})`,
            error: null,
            recordCount: i + 1,
            totalBytes,
          });
          const tpl = await fileToTemplate(f, i);
          templates.push(tpl);
          await new Promise((r) => setTimeout(r, 0));
        }

        useTemplateStore.getState().setTemplates(templates);
        if (templates.length > 0) useTemplateStore.getState().selectTemplate(templates[0].id);

        setTemplateFolder({
          file: folderFile as unknown as File,
          loading: false,
          progress: 100,
          stage: `${docx.length} plantillas procesadas correctamente`,
          error: null,
          recordCount: docx.length,
          bytesProcessed: totalBytes,
          totalBytes,
        });
      } catch (e) {
        console.error('ConfigView: fileToTemplate failed', e);
        setTemplateFolder({
          file: folderFile as unknown as File,
          loading: false,
          progress: 0,
          stage: 'Error al procesar plantillas',
          error: 'Error al procesar las plantillas DOCX',
          recordCount: 0,
        });
      }
    },
    [setTemplateFolder]
  );

  const onSacDrop = (e: DragEvent<HTMLDivElement>) => {
    const f = e.dataTransfer.files?.[0];
    if (f) void handleSacFile(f);
  };
  const onMercurioDrop = (e: DragEvent<HTMLDivElement>) => {
    const f = e.dataTransfer.files?.[0];
    if (f) void handleMercurioFile(f);
  };
  const onFolderDrop = (e: DragEvent<HTMLDivElement>) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFolderFiles(files);
  };

  const onSacSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleSacFile(f);
  };
  const onMercurioSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleMercurioFile(f);
  };
  const onFolderSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFolderFiles(files);
  };

  const readyCount =
    (sacFile?.file && !sacFile.loading && !sacFile.error ? 1 : 0) +
    (mercurioFile?.file && !mercurioFile.loading && !mercurioFile.error ? 1 : 0) +
    (templateFolder?.file &&
    !templateFolder.loading &&
    !templateFolder.error &&
    (templateFolder.recordCount > 0 || !!templateFolder.file)
      ? 1
      : 0);
  const progressPct = Math.round((readyCount / 3) * 100);

  const handleContinuar = () => {
    if (!allReady) return;
    complete('configuracion');
    goTo('datos');
  };

  const handleCancelar = () => {
    clearAll();
    useTemplateStore.getState().clearTemplates();
    setFolderTemplates([]);
    setFolderName('');
    if (sacRef.current) sacRef.current.value = '';
    if (mercurioRef.current) mercurioRef.current.value = '';
    if (folderRef.current) folderRef.current.value = '';
    goTo('inicio');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} data-testid="config-view">
      <style>{`
        .m2-hero { position:relative; overflow:hidden; border-radius:16px; padding:26px 28px; background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 45%, #F0FDF4 100%); border:1px solid #E0F2FE; }
        .m2-blur { position:absolute; border-radius:999px; filter: blur(32px); opacity:0.55; pointer-events:none; }
        .m2-grid { display:grid; grid-template-columns: 1fr 1fr; gap:18px; }
        @media (max-width: 860px) { .m2-grid { grid-template-columns: 1fr; } }
        .m2-segment { flex:1; height:100%; border-radius:999px; transition: background 220ms ease-out, opacity 220ms ease-out; }
      `}</style>

      {/* HERO */}
      <div className="m2-hero" data-testid="m2-hero">
        <div
          className="m2-blur"
          style={{
            width: 280,
            height: 280,
            background: 'radial-gradient(circle at 30% 30%, #bfdbfe 0%, transparent 62%)',
            right: -40,
            top: -60,
          }}
          aria-hidden
        />
        <div
          className="m2-blur"
          style={{
            width: 220,
            height: 220,
            background: 'radial-gradient(circle at 30% 30%, #bbf7d0 0%, transparent 62%)',
            left: -30,
            bottom: -50,
            opacity: 0.5,
          }}
          aria-hidden
        />
        <div
          className="m2-blur"
          style={{
            width: 160,
            height: 160,
            background: 'radial-gradient(circle at 30% 30%, #e9d5ff 0%, transparent 62%)',
            right: 120,
            bottom: -30,
            opacity: 0.32,
          }}
          aria-hidden
        />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Badge
              variant="info"
              style={{
                background: '#fff',
                borderColor: '#bfdbfe',
                color: '#1e40af',
                fontSize: '0.66rem',
                letterSpacing: '0.08em',
              }}
            >
              MÓDULO 2: CONFIGURACIÓN DE RECURSOS
            </Badge>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '1.55rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                }}
              >
                Configuración de Recursos
              </h1>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#475569',
                  marginTop: 6,
                  maxWidth: 640,
                  lineHeight: 1.5,
                }}
              >
                Carga los archivos Excel de <strong style={{ color: '#004B93' }}>SAC</strong> y{' '}
                <strong style={{ color: '#0284C7' }}>Mercurio</strong> y selecciona la carpeta de
                plantillas Word. El flujo continúa cuando los tres recursos estén listos.
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 999,
                padding: '6px 10px',
                boxShadow: 'var(--shadow-xs)',
                alignSelf: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--neutral-500)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Progreso
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: readyCount === 3 ? '#15803d' : '#334155',
                }}
              >
                {readyCount}/3
              </span>
              <span
                style={{
                  width: 1,
                  height: 14,
                  background: 'var(--border)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: readyCount === 3 ? '#15803d' : 'var(--neutral-600)',
                }}
              >
                {progressPct}%
              </span>
            </div>
          </div>

          {/* progress track 3 segments 33.33% each */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div
              data-testid="m2-progress-track"
              aria-label={`Progreso ${readyCount} de 3`}
              style={{
                flex: 1,
                height: 10,
                background: '#fff',
                borderRadius: 999,
                border: '1px solid #e2e8f0',
                padding: 3,
                display: 'flex',
                gap: 6,
                boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06)',
              }}
            >
              {[
                !!(sacFile?.file && !sacFile.loading && !sacFile.error),
                !!(mercurioFile?.file && !mercurioFile.loading && !mercurioFile.error),
                !!(
                  templateFolder?.file &&
                  !templateFolder.loading &&
                  !templateFolder.error &&
                  (templateFolder.recordCount > 0 || !!templateFolder.file)
                ),
              ].map((filled, i) => (
                <div
                  key={i}
                  data-testid={`m2-segment-${i}`}
                  className="m2-segment"
                  style={{
                    background: filled
                      ? i === 0
                        ? '#004B93'
                        : i === 1
                          ? '#0284C7'
                          : '#76BC21'
                      : '#f1f5f9',
                    opacity: filled ? 1 : 0.85,
                    boxShadow: filled ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                  }}
                  aria-label={filled ? 'completado' : 'pendiente'}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--neutral-500)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              33.33% por recurso
            </span>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="m2-grid" data-testid="m2-grid">
        <ExcelUploadCard
          title="Archivo SAC"
          subtitle="Base principal de trámites — 119 columnas"
          fileState={sacFile}
          setFileState={setSacFile}
          dragOver={dragSac}
          setDragOver={setDragSac}
          inputRef={sacRef}
          onDrop={onSacDrop}
          onSelect={onSacSelect}
          accent="sac"
          locationUrl={SAC_URL}
          locationLabel="Consultar archivo SAC"
        />
        <ExcelUploadCard
          title="Archivo Mercurio"
          subtitle="Base complementaria de correspondencia"
          fileState={mercurioFile}
          setFileState={setMercurioFile}
          dragOver={dragMercurio}
          setDragOver={setDragMercurio}
          inputRef={mercurioRef}
          onDrop={onMercurioDrop}
          onSelect={onMercurioSelect}
          accent="mercurio"
          locationUrl={MERCURIO_URL}
          locationLabel="Consultar archivo Mercurio"
        />

        {/* folder full-width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <ExcelUploadCard
            title="Carpeta de Plantillas"
            subtitle="Selecciona la carpeta que contiene los .docx — se listarán automáticamente"
            fileState={templateFolder}
            setFileState={(s) => {
              setTemplateFolder(s);
              if (!s) {
                setFolderTemplates([]);
                setFolderName('');
                useTemplateStore.getState().clearTemplates();
                if (folderRef.current) folderRef.current.value = '';
              }
            }}
            dragOver={dragFolder}
            setDragOver={setDragFolder}
            inputRef={folderRef}
            onDrop={onFolderDrop}
            onSelect={onFolderSelect}
            accent="folder"
            locationUrl={PLANTILLAS_URL}
            locationLabel="Consultar carpeta de Plantillas"
          />

          {/* templates list when selected */}
          {templateFolder?.file &&
            !templateFolder.loading &&
            !templateFolder.error &&
            folderTemplates.length > 0 && (
              <div
                data-testid="m2-templates-list"
                style={{
                  marginTop: 12,
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  padding: 14,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--neutral-700)' }}>
                    Plantillas detectadas{' '}
                    <span style={{ color: 'var(--neutral-500)', fontWeight: 600 }}>
                      — {folderName || 'Carpeta'} · {folderTemplates.length} .docx
                    </span>
                  </div>
                  <Badge variant="accent" style={{ fontSize: '0.68rem' }}>
                    {folderTemplates.length} archivos
                  </Badge>
                </div>
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingRight: 4,
                  }}
                >
                  {folderTemplates.map((tpl, i) => (
                    <div
                      key={`${tpl.name}-${i}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: '#004B93',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          flexShrink: 0,
                        }}
                      >
                        W
                      </span>
                      <span
                        style={{
                          flex: 1,
                          color: '#334155',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={tpl.name}
                      >
                        {tpl.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#94a3b8',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {(tpl.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {templateFolder?.file &&
            !templateFolder.loading &&
            !templateFolder.error &&
            folderTemplates.length === 0 &&
            templateFolder.recordCount === 0 && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: '0.78rem',
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '8px 12px',
                }}
              >
                No se encontraron plantillas .docx en la carpeta seleccionada.
              </div>
            )}
        </div>
      </div>

      {/* bottom actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <Button variant="ghost" onClick={handleCancelar} data-testid="m2-cancelar">
          Cancelar
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          {!allReady && (
            <span
              style={{
                fontSize: '0.76rem',
                color: 'var(--neutral-500)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: '#f59e0b',
                  display: 'inline-block',
                }}
                aria-hidden
              />
              Faltan recursos por cargar
            </span>
          )}
          <Button
            variant="primary"
            disabled={!allReady}
            onClick={handleContinuar}
            data-testid="m2-continuar"
            title={
              !allReady ? 'Carga SAC, Mercurio y carpeta para continuar' : 'Continuar al Módulo 3'
            }
          >
            Continuar al Módulo 3
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              style={{ marginLeft: 6 }}
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfigView;
