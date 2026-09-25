import { useRef, useState, useCallback, useEffect } from 'react';
import { animate } from 'animejs';
import { prefersReducedMotion } from '@/utils/motion';
import type { DragEvent, ChangeEvent } from 'react';
import { useExcelStore } from '@/store/excelStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useExcelParser } from '@/hooks/useExcelParser';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { fileToTemplate } from '@/utils/docxHelpers';
import { parseMercurioFile } from '@/utils/excelParser';
import { useProfileStore } from '@/store/profileStore';
import { ProfileModal } from '@/components/features/ProfileModal';
import ExcelUploadCard from '@/components/features/ExcelUploadCard';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const SAC_URL =
  'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/SAC_TRAMITE_EXCEL_COMPARTIDO?d=wc7d2ddae58bf4835affc2ac2eb9d5791&csf=1&web=1&e=vwn0sV';
const MERCURIO_URL =
  'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/MERCURIO_TRAMITE_EXCEL_COMPARTIDO?d=wecd9b18ce9a0467ba0689edaca9a58c7&csf=1&web=1&e=TDZGI5';
const PLANTILLAS_URL =
  'https://epmco-my.sharepoint.com/:f:/r/personal/atencionclientes_essa_com_co/Documents/PLANTILAS_SOPORTE%20CLIENTES?d=wbb247310e4a14457bc93016440b8ecb0&csf=1&web=1&e=Cin5Ow';

export function ConfigView() {
  const sacFile = useExcelStore((s) => s.sacFile);
  const mercurioFile = useExcelStore((s) => s.mercurioFile);
  const templateFolder = useExcelStore((s) => s.templateFolder);
  const templateFolderPath = useExcelStore((s) => s.templateFolderPath);
  const setSacFile = useExcelStore((s) => s.setSacFile);
  const setMercurioFile = useExcelStore((s) => s.setMercurioFile);
  const setTemplateFolder = useExcelStore((s) => s.setTemplateFolder);
  const clearAll = useExcelStore((s) => s.clearAll);
  const allReady = useExcelStore((s) => s.allReady);

  const goTo = useNavigationStore((s) => s.goTo);
  const complete = useNavigationStore((s) => s.complete);

  const profile = useProfileStore((s) => s.profile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [dragSac, setDragSac] = useState(false);
  const [dragMercurio, setDragMercurio] = useState(false);
  const [dragFolder, setDragFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const folderFilesRef = useRef<File[]>([]);

  const sacRef = useRef<HTMLInputElement>(null);
  const mercurioRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const { parseWithProgress } = useExcelParser();
  const setSacRecords = useDataStore((s) => s.setSacRecords);
  const setMercurioRecords = useDataStore((s) => s.setMercurioRecords);
  const heroRef = useRef<HTMLDivElement>(null);

  // Hero entrance animation
  useEffect(() => {
    if (prefersReducedMotion() || !heroRef.current) return;
    animate(heroRef.current, {
      y: [20, 0],
      opacity: [0, 1],
      duration: 400,
      ease: 'power3.out',
    });
  }, []);

  // Conservar y reflejar la ruta de la carpeta de plantillas almacenada en el store
  useEffect(() => {
    const storedPath = templateFolder?.folderPath ?? templateFolderPath ?? '';
    if (storedPath && storedPath !== folderName) {
      setFolderName(storedPath);
    }
    if (!storedPath && folderName && !templateFolder) {
      // No hacer nada, folderName ya fue limpiado por reset
    }
  }, [templateFolder?.folderPath, templateFolderPath, folderName, templateFolder]);

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
      // Ruta conservada: webkitRelativePath brinda la ruta seleccionada por el usuario (p. ej. "Plantillas/plantilla.docx")
      const rawPath =
        (arr[0] as unknown as { webkitRelativePath?: string })?.webkitRelativePath || '';
      const name = rawPath.split('/')[0] || 'Plantillas';
      const folderPath = rawPath ? rawPath.split('/').slice(0, -1).join('/') || name : name;
      setFolderName(folderPath);
      folderFilesRef.current = docx;
      // Actualizar inmediatamente la ruta en el store para conservarla incluso durante el loading
      // y permitir reemplazo del valor previo
      if (docx.length === 0) {
        setTemplateFolder({
          file: null,
          loading: false,
          progress: 0,
          stage: 'Sin plantillas válidas',
          error: 'No se encontraron plantillas .docx en la carpeta',
          recordCount: 0,
          folderPath,
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
        folderPath,
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
            folderPath,
          });
          const tpl = await fileToTemplate(f, i);
          templates.push(tpl);
          await new Promise((r) => setTimeout(r, 0));
        }

        // Reemplazar plantillas previas por las más recientes — actualización del recurso
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
          folderPath,
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
          folderPath,
        });
      } finally {
        // Permitir recargar la misma carpeta: resetear el input para que onChange vuelva a dispararse
        if (folderRef.current) folderRef.current.value = '';
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
    if (f)
      handleSacFile(f).finally(() => {
        // Permitir volver a cargar el mismo archivo y que el sistema actualice con la info más reciente
        if (e.target) e.target.value = '';
      });
    else if (e.target) e.target.value = '';
  };
  const onMercurioSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f)
      handleMercurioFile(f).finally(() => {
        if (e.target) e.target.value = '';
      });
    else if (e.target) e.target.value = '';
  };
  const onFolderSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFolderFiles(files);
    // handleFolderFiles ya resetea folderRef, pero asegurar reset para actualización
  };

  const isSacReady = sacFile?.file && !sacFile.loading && !sacFile.error ? 1 : 0;
  const isMercurioReady =
    mercurioFile?.file && !mercurioFile.loading && !mercurioFile.error ? 1 : 0;
  const isFolderReady =
    templateFolder?.file &&
    !templateFolder.loading &&
    !templateFolder.error &&
    (templateFolder.recordCount > 0 || !!templateFolder.file)
      ? 1
      : 0;
  const readyCount = isSacReady + isFolderReady;
  const totalRequired = 2;
  const progressPct = Math.round((readyCount / totalRequired) * 100);

  const handleContinuar = () => {
    if (!allReady) return;
    // Iniciar revisión sin selección predeterminada.
    useDataStore.getState().clearSelection();
    complete('configuracion');
    goTo('datos');
  };

  const handleCancelar = () => {
    clearAll();
    useTemplateStore.getState().clearTemplates();
    setFolderName('');
    folderFilesRef.current = [];
    if (sacRef.current) sacRef.current.value = '';
    if (mercurioRef.current) mercurioRef.current.value = '';
    if (folderRef.current) folderRef.current.value = '';
    goTo('inicio');
  };

  const handleActualizarDatos = async () => {
    if (isUpdating) return;
    const hasAnyResource = !!(sacFile?.file || mercurioFile?.file || templateFolder?.file);
    if (!hasAnyResource) {
      setUpdateMessage('No hay recursos cargados para actualizar');
      setTimeout(() => setUpdateMessage(null), 2500);
      return;
    }
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
      const tasks: Promise<void>[] = [];

      if (sacFile?.file) {
        tasks.push(
          (async () => {
            try {
              const records = await parseWithProgress(sacFile.file as File, setSacFile);
              if (records.length > 0) setSacRecords(records);
            } catch {
              // error ya reflejado en el store
            }
          })()
        );
      }

      if (mercurioFile?.file) {
        tasks.push(
          (async () => {
            try {
              const records = await parseWithProgress(
                mercurioFile.file as File,
                setMercurioFile,
                undefined,
                parseMercurioFile
              );
              if (records.length > 0) setMercurioRecords(records);
            } catch {
              // handled
            }
          })()
        );
      }

      if (folderFilesRef.current.length > 0) {
        tasks.push(
          (async () => {
            try {
              await handleFolderFiles(folderFilesRef.current);
            } catch {
              // handled inside
            }
          })()
        );
      } else if (templateFolder?.file && folderFilesRef.current.length === 0) {
        // Si no hay referencia de FileList pero hay templates en store, revalidar estado
        setUpdateMessage(
          'Carpeta sin referencia de archivos — vuelva a seleccionar la carpeta si agregó archivos'
        );
      }

      await Promise.allSettled(tasks);

      const hasError = !!(sacFile?.error || mercurioFile?.error || templateFolder?.error);
      if (hasError) {
        setUpdateMessage('Actualización completada con advertencias');
      } else {
        setUpdateMessage('Recursos actualizados correctamente');
      }
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch {
      setUpdateMessage('Error al actualizar los recursos');
      setTimeout(() => setUpdateMessage(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="config-view">
      <style>{`
        .m2-hero { position:relative; overflow:hidden; border-radius:14px; padding:16px 20px; background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 45%, #F0FDF4 100%); border:1px solid #E0F2FE; flex-shrink:0; }
        .m2-blur { position:absolute; border-radius:999px; filter: blur(28px); opacity:0.45; pointer-events:none; }
        .m2-grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; flex-shrink:0; }
        @media (max-width: 860px) { .m2-grid { grid-template-columns: 1fr; } }
        .m2-segment { flex:1; height:100%; border-radius:999px; transition: background 220ms ease-out, opacity 220ms ease-out; }
        .m2-scroll-area { display:flex; flex-direction:column; gap:14px; }
        .m2-profile-btn { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #fed7aa; border-radius:999px; padding:5px 12px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:all 180ms ease; }
        .m2-profile-btn:hover { background:#fff7ed; border-color:#ee7419; transform:translateY(-1px); box-shadow:0 3px 8px rgba(238,116,25,0.15); }
        .m2-cancelar-btn:hover:not(:disabled) { background: #f8fafc !important; border-color: #cbd5e1 !important; color: #0f172a !important; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(15,23,42,0.06) !important; }
        .m2-cancelar-btn:hover .m2-cancelar-icon { background: #e2e8f0 !important; transform: rotate(90deg); }
        .m2-cancelar-btn:active:not(:disabled) { transform: translateY(0) scale(0.97) !important; }
        .m2-actualizar-btn:hover:not(:disabled) { border-color: #93c5fd !important; background: #eff6ff !important; color: #0f172a !important; box-shadow: 0 2px 10px rgba(14,106,209,0.12) !important; transform: translateY(-1px); }
        .m2-actualizar-btn:hover:not(:disabled) .m2-actualizar-icon { background: #dbeafe !important; border-color: #bfdbfe !important; transform: rotate(180deg); }
        .m2-actualizar-btn:active:not(:disabled) { transform: translateY(0) scale(0.97) !important; }
        .m2-actualizar-btn:disabled { cursor: not-allowed !important; }
        .m2-actualizar-icon, .m2-cancelar-icon { transition: transform 300ms ease, background 200ms ease, border-color 200ms ease; }
        .m2-actualizar-icon--spin { animation: m2-spin 0.9s linear infinite; }
        @keyframes m2-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="m2-scroll-area">
        <div className="m2-hero" data-testid="m2-hero" ref={heroRef}>
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

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <Badge
                variant="info"
                style={{
                  background: '#fff',
                  borderColor: '#bfdbfe',
                  color: '#1e40af',
                  fontSize: '0.62rem',
                  letterSpacing: '0.07em',
                }}
              >
                MÓDULO 1: CONFIGURACIÓN DE RECURSOS
              </Badge>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: '1.35rem',
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
                    fontSize: '0.82rem',
                    color: '#475569',
                    marginTop: 4,
                    maxWidth: 640,
                    lineHeight: 1.45,
                  }}
                >
                  Carga el archivo Excel de <strong style={{ color: '#004B93' }}>SAC</strong>{' '}
                  <span style={{ color: '#64748b', fontWeight: 600 }}>(obligatorio)</span>,
                  selecciona la carpeta de plantillas Word{' '}
                  <span style={{ color: '#64748b', fontWeight: 600 }}>(obligatorio)</span> y,
                  opcionalmente, el archivo de{' '}
                  <strong style={{ color: '#0284C7' }}>Mercurio</strong> para habilitar la columna{' '}
                  <strong style={{ color: '#0284C7' }}>PQR</strong>. El flujo continúa cuando los
                  recursos obligatorios estén listos.
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  alignSelf: 'flex-start',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  data-testid="config-open-profile-btn"
                  className="m2-profile-btn"
                  title="Configurar Perfil y Firma del Funcionario"
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: profile.name ? '#dbeafe' : '#f1f5f9',
                      color: profile.name ? '#004B93' : '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    {profile.name ? profile.name.charAt(0).toUpperCase() : '👤'}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      lineHeight: 1.15,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Perfil del Funcionario
                    </span>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {profile.name || 'Configurar Perfil y Firma'}
                    </span>
                  </div>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>

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
                      color: readyCount === totalRequired ? '#15803d' : '#334155',
                    }}
                  >
                    {readyCount}/{totalRequired}
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
                      color: readyCount === totalRequired ? '#15803d' : 'var(--neutral-600)',
                    }}
                  >
                    {progressPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* progress track 2 segmentos obligatorios (50% c/u) + Mercurio opcional no cuenta para progreso */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div
                data-testid="m2-progress-track"
                aria-label={`Progreso ${readyCount} de ${totalRequired}`}
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
                      background: filled ? (i === 0 ? '#004B93' : '#76BC21') : '#f1f5f9',
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
                50% por recurso requerido
              </span>
              {isMercurioReady ? (
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: '#0284C7',
                    fontWeight: 700,
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: 999,
                    padding: '2px 7px',
                    whiteSpace: 'nowrap',
                  }}
                  data-testid="m2-mercurio-opcional-ok"
                >
                  Mercurio OK
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: '#64748b',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Mercurio opcional
                </span>
              )}
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="m2-grid" data-testid="m2-grid">
          <ExcelUploadCard
            title="Archivo SAC"
            subtitle="Base principal de trámites"
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

          <ExcelUploadCard
            title="Carpeta de Plantillas"
            subtitle="Selecciona la carpeta que contiene los .docx — se listarán automáticamente"
            fileState={templateFolder}
            setFileState={(s) => {
              setTemplateFolder(s);
              if (!s) {
                setFolderName('');
                folderFilesRef.current = [];
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

          {/* Tarjeta de Perfil y Firma del Funcionario */}
          <div
            className="m2-card m2-profile-card"
            data-testid="config-profile-card"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderTop: '3.5px solid #EE7419',
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 14,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              minHeight: 180,
              transition:
                'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease',
              animation: 'm2-enter 280ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 8px 20px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(238, 116, 25, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 11,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    className="m2-icon-box"
                    style={{
                      background: '#FFF7ED',
                      color: '#EE7419',
                      border: '1px solid #FED7AA',
                      boxShadow: '0 2px 6px rgba(238, 116, 25, 0.2)',
                    }}
                    aria-hidden
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#EE7419"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '0.96rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1.25,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Perfil del Funcionario
                    </h3>
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: '0.76rem',
                        color: '#64748b',
                        lineHeight: 1.4,
                      }}
                    >
                      Datos del firmante y firma digital para los documentos
                    </p>
                  </div>
                </div>
                {profile.name ? (
                  <span
                    className="m2-badge m2-pop-in"
                    style={{
                      background: '#f0fdf4',
                      color: '#15803d',
                      borderColor: '#bbf7d0',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#15803d"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Configurado
                  </span>
                ) : (
                  <span
                    className="m2-badge"
                    style={{
                      background: '#fffbeb',
                      color: '#b45309',
                      borderColor: '#fde68a',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#f59e0b',
                        display: 'inline-block',
                      }}
                      aria-hidden
                    />
                    Pendiente
                  </span>
                )}
              </div>

              {/* Detalle del perfil */}
              <div
                style={{
                  background: 'linear-gradient(180deg, #FFFDF9 0%, #FFF8EE 100%)',
                  border: '1.5px solid #FED7AA',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow:
                    '0 2px 6px rgba(238, 116, 25, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#78350f', fontWeight: 700 }}>
                    Nombre:
                  </span>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: profile.name ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    {profile.name || 'Sin nombre registrado'}
                  </span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#78350f', fontWeight: 700 }}>
                    Cargo:
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: profile.position ? '#334155' : '#94a3b8',
                    }}
                  >
                    {profile.position || 'Sin cargo especificado'}
                  </span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#78350f', fontWeight: 700 }}>
                    Firma digital:
                  </span>
                  {profile.signatureUrl ? (
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#15803d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Cargada ({profile.signatureScale ?? 100}%)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#94a3b8' }}>
                      Sin firma digital
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              data-testid="config-open-profile"
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 10,
                background: '#FFF7ED',
                border: '1px solid #EE7419',
                color: '#C2410C',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'all 180ms ease',
                boxShadow: '0 1px 3px rgba(238, 116, 25, 0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EE7419';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(238, 116, 25, 0.28)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFF7ED';
                e.currentTarget.style.color = '#C2410C';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(238, 116, 25, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {profile.name ? 'Modificar Perfil y Firma' : 'Configurar Perfil y Firma'}
            </button>
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
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: 'var(--shadow-xs)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCancelar}
              data-testid="m2-cancelar"
              className="m2-cancelar-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                borderRadius: 999,
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 200ms ease',
                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: '#f1f5f9',
                  transition: 'all 200ms ease',
                }}
                className="m2-cancelar-icon"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block' }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleActualizarDatos}
              disabled={
                isUpdating || (!sacFile?.file && !mercurioFile?.file && !templateFolder?.file)
              }
              data-testid="m2-actualizar"
              title="Volver a cargar y sincronizar los recursos configurados"
              className="m2-actualizar-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 16px',
                borderRadius: 999,
                border: '1px solid #bfdbfe',
                background: isUpdating ? '#f0f9ff' : '#fff',
                color: isUpdating ? '#64748b' : '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: isUpdating ? 'wait' : 'pointer',
                opacity:
                  isUpdating || (!sacFile?.file && !mercurioFile?.file && !templateFolder?.file)
                    ? 0.6
                    : 1,
                transition: 'all 200ms ease',
                boxShadow: isUpdating
                  ? '0 1px 2px rgba(15,23,42,0.04)'
                  : '0 1px 3px rgba(15,23,42,0.06)',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: isUpdating ? '#e0f2fe' : '#eff6ff',
                  border: '1px solid #dbeafe',
                  transition: 'all 300ms ease',
                  transform: isUpdating ? 'rotate(360deg)' : 'rotate(0deg)',
                }}
                className={isUpdating ? 'm2-actualizar-icon--spin' : 'm2-actualizar-icon'}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block' }}
                >
                  <path d="M21 12a9 9 0 1 1-9-9" stroke="#0284C7" />
                  <polyline points="21 3 21 9 15 9" stroke="#0284C7" />
                  <path d="M3 12a9 9 0 1 0 9 9" stroke="#0f172a" opacity="0.9" />
                  <polyline points="3 21 3 15 9 15" stroke="#0f172a" opacity="0.9" />
                </svg>
              </span>
              {isUpdating ? 'Actualizando...' : 'Actualizar Datos'}
            </button>
            {isUpdating && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid #e2e8f0',
                  borderTopColor: '#0f172a',
                  borderRadius: 999,
                  display: 'inline-block',
                  animation: 'm2-spin 0.8s linear infinite',
                }}
                aria-hidden
              />
            )}
            {updateMessage && (
              <span
                data-testid="m2-update-message"
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: updateMessage.includes('correctamente') ? '#15803d' : '#b45309',
                  background: updateMessage.includes('correctamente') ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${updateMessage.includes('correctamente') ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: 999,
                  padding: '4px 10px',
                  whiteSpace: 'nowrap',
                }}
              >
                {updateMessage.includes('correctamente') ? '✓ ' : ''}
                {updateMessage}
              </span>
            )}
          </div>
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
                Faltan recursos obligatorios (SAC y Plantillas)
              </span>
            )}
            <Button
              variant="primary"
              disabled={!allReady}
              onClick={handleContinuar}
              data-testid="m2-continuar"
              title={
                !allReady
                  ? 'Carga SAC y carpeta de plantillas para continuar (Mercurio es opcional)'
                  : 'Continuar a Revisión de Datos'
              }
            >
              Continuar a Revisión de Datos
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

      {/* Modal de Configuración de Perfil y Firma */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
}

export default ConfigView;
