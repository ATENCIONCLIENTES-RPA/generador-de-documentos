import React, { useState, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Eye, 
  Code2, 
  User, 
  FileSpreadsheet, 
  PenTool, 
  Calculator, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileCheck2
} from 'lucide-react';
import { DocumentTemplate, StepId, UserProfile, DocumentRecord } from '../types';
import { extractFirstName, formatApplicantName, cleanSpecialCharacters } from '../utils/nameParser';

interface TemplatesViewProps {
  templates: DocumentTemplate[];
  selectedTemplate: DocumentTemplate | null;
  onSelectTemplate: (template: DocumentTemplate) => void;
  onNavigate: (step: StepId) => void;
  profile: UserProfile;
  records: DocumentRecord[];
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onNavigate,
  profile,
  records,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [previewMode, setPreviewMode] = useState<'merged' | 'raw'>('merged');
  const [activeRecordIndex, setActiveRecordIndex] = useState<number>(0);

  const categories = ['Todas', 'Cartas', 'Contratos', 'Informes', 'Formularios'];

  // Records selected in Módulo 3: Datos del Documento
  const selectedRecords = useMemo(() => (records || []).filter((r) => r.selected), [records]);
  const availableRecords = useMemo(() => (selectedRecords.length > 0 ? selectedRecords : records || []), [selectedRecords, records]);

  // Current active record for previewing substitutions from user's Excel
  const activeRecord = useMemo(() => {
    if (availableRecords && availableRecords.length > 0) {
      return availableRecords[Math.min(activeRecordIndex, availableRecords.length - 1)];
    }
    return null;
  }, [availableRecords, activeRecordIndex]);

  const filteredTemplates = templates.filter((tpl) => {
    const matchesCategory =
      selectedCategory === 'Todas' || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate Primer Nombre dynamically using Spanish name extraction
  const primerNombre = useMemo(() => {
    return extractFirstName(activeRecord?.nombreSolicitante || '');
  }, [activeRecord]);

  // Formatted applicant full name in Title Case (sentence style)
  const nombreSolicitanteFormateado = useMemo(() => {
    return formatApplicantName(activeRecord?.nombreSolicitante || '');
  }, [activeRecord]);

  // Dictionary of resolved variable values and metadata
  const variableDefinitions = useMemo(() => {
    const cuenta = activeRecord?.numeroCuenta || activeRecord?.cuenta || '';
    return {
      '[NOMBRE_SOLICITANTE]': {
        label: 'Nombre del Solicitante',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: nombreSolicitanteFormateado,
        description: 'Nombre completo normalizado en formato tipo oración (ej. Juan Carlos Carrillo Palacio)',
      },
      '[CORREO_SOLICITANTE]': {
        label: 'Correo del Solicitante',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.correoSolicitante || '',
        description: 'Correo electrónico para notificaciones oficiales',
      },
      '[RADICADO_ENTRADA]': {
        label: 'Radicado de Entrada',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.radicadoEntrada || '',
        description: 'Número de radicación de la PQR / Reclamación en ESSA',
      },
      '[FECHA_SOLICITUD]': {
        label: 'Fecha de Solicitud',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.fechaSolicitud || '',
        description: 'Fecha en la que fue radicada la solicitud',
      },
      '[NUMERO_CUENTA]': {
        label: 'Número de Cuenta',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: cuenta,
        description: 'Cuenta contractual de suministro de energía eléctrica',
      },
      '[NUMERO_PROCESO]': {
        label: 'Número de Proceso',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.numeroProceso || '',
        description: 'Código del expediente o proceso institucional',
      },
      '[PRIMER_NOMBRE]': {
        label: 'Primer Nombre Solicitante',
        source: 'Calculado (Fórmula)' as const,
        sourceType: 'calculated' as const,
        value: primerNombre,
        description: 'Identificado inteligentemente a partir de NOMBRE_SOLICITANTE (ej. Juan, Diego, Sergio)',
      },
      '[FIRMA_DOCUMENTO]': {
        label: 'Firma Digital del Documento',
        source: 'Firma (Perfil)' as const,
        sourceType: 'signature' as const,
        value: profile?.signatureUrl || '',
        description: 'Imagen de firma configurada en el perfil de trabajo',
      },
      '[NOMBRE_FIRMANTE]': {
        label: 'Nombre del Firmante',
        source: 'Perfil de Trabajo' as const,
        sourceType: 'profile' as const,
        value: profile?.name || 'Jaime Arley Rizo Morales',
        description: 'Nombre del funcionario registrado en el perfil de trabajo',
      },
      '[CARGO_FIRMANTE]': {
        label: 'Cargo del Firmante',
        source: 'Perfil de Trabajo' as const,
        sourceType: 'profile' as const,
        value: profile?.position || 'Técnico',
        description: 'Cargo oficial del usuario en ESSA',
      },
      '[CEDULA_SOLICITANTE]': {
        label: 'Cédula del Solicitante',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.cedulaSolicitante || '',
        description: 'Documento de identidad del titular',
      },
      '[DIRECCION_SOLICITANTE]': {
        label: 'Dirección del Inmueble',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.direccionSolicitante || '',
        description: 'Dirección predial de la cuenta',
      },
      '[MUNICIPIO_SOLICITANTE]': {
        label: 'Municipio Solicitante',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.municipioSolicitante || '',
        description: 'Municipio de radicación',
      },
      '[DEPARTAMENTO_SOLICITANTE]': {
        label: 'Departamento Solicitante',
        source: 'Excel (Columna)' as const,
        sourceType: 'excel' as const,
        value: activeRecord?.departamentoSolicitante || '',
        description: 'Departamento de ubicación',
      },
    };
  }, [activeRecord, primerNombre, profile]);

  // Extract all bracketed variables from template content
  const detectedVariablesInTemplate = useMemo(() => {
    if (!selectedTemplate?.sampleContent) return [];
    const matches = selectedTemplate.sampleContent.match(/\[[A-Z0-9_ÁÉÍÓÚÑ]+\]/gi) || [];
    const uniqueTags: string[] = Array.from(new Set<string>(matches));
    
    return uniqueTags.map((tag: string) => {
      const upperTag = tag.toUpperCase();
      const def = variableDefinitions[upperTag as keyof typeof variableDefinitions];
      if (def) {
        return {
          tag: upperTag,
          label: def.label,
          source: def.source,
          sourceType: def.sourceType,
          value: def.value,
          description: def.description,
          isAvailable: Boolean(def.value && String(def.value).trim().length > 0),
        };
      }
      return {
        tag: upperTag,
        label: upperTag.replace(/[\[\]_]/g, ' '),
        source: 'Plantilla' as const,
        sourceType: 'excel' as const,
        value: '',
        description: 'Variable detectada en la plantilla',
        isAvailable: false,
      };
    });
  }, [selectedTemplate, variableDefinitions]);

  // Render text with highlighting or live substitution
  const renderDocumentContent = (content: string) => {
    if (!content) return null;

    const parts = content.split(/(\[[A-Z0-9_ÁÉÍÓÚÑ]+\])/gi);

    return parts.map((part, index) => {
      const isVariable = part.startsWith('[') && part.endsWith(']');
      if (!isVariable) {
        return <span key={index}>{part}</span>;
      }

      const upperVar = part.toUpperCase();
      const def = variableDefinitions[upperVar as keyof typeof variableDefinitions];

      // If Raw mode, show highlighted token
      if (previewMode === 'raw') {
        let badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
        if (upperVar === '[PRIMER_NOMBRE]') badgeColor = 'bg-purple-100 text-purple-900 border-purple-300';
        if (upperVar === '[FIRMA_DOCUMENTO]') badgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
        if (upperVar === '[NOMBRE_FIRMANTE]') badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';

        return (
          <span 
            key={index} 
            title={`Variable: ${upperVar} (${def?.source || 'No mapeado'})`}
            className={`inline-block px-1.5 py-0.5 mx-0.5 rounded font-mono font-bold text-[11px] border ${badgeColor} shadow-2xs`}
          >
            {upperVar}
          </span>
        );
      }

      // Merged Mode: replace with real value!
      if (upperVar === '[FIRMA_DOCUMENTO]') {
        const signatureUrl = profile?.signatureUrl;
        if (!signatureUrl) return null;
        return (
          <img
            key={index}
            src={signatureUrl}
            alt="Firma"
            className="max-h-16 max-w-[200px] object-contain inline-block my-1 align-middle"
            referrerPolicy="no-referrer"
          />
        );
      }

      const val = def?.value;
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return (
          <span 
            key={index} 
            className="font-bold text-[#002f6c] bg-blue-50/60 px-1 py-0.5 rounded border-b border-blue-300 transition-colors"
            title={`Variable sustituida: ${upperVar}`}
          >
            {String(val)}
          </span>
        );
      }

      // If variable has no data, show non-breaking clear tag
      return (
        <span 
          key={index} 
          className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-sans font-medium"
          title={`Sin información en el registro actual para ${upperVar}`}
        >
          [{upperVar.replace(/[\[\]]/g, '')}: Sin dato]
        </span>
      );
    });
  };

  if (templates.length === 0) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
            Módulo 4: Selección de Plantillas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Seleccione la plantilla que desea utilizar para su documento.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#004b93] flex items-center justify-center mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            No se han cargado plantillas
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md">
            Para continuar, por favor regrese a la configuración y seleccione una carpeta de su equipo que contenga los documentos a utilizar.
          </p>
          <button
            onClick={() => onNavigate('configuracion')}
            className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-102"
          >
            Ir a Configuración
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Title & Top Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight flex items-center gap-2.5">
            Módulo 4: Selección de Plantillas
            <span className="text-xs font-bold text-[#004b93] bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full">
              {templates.length} plantillas disponibles
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Seleccione una plantilla para visualizar su estructura original y comprobar en tiempo real la sustitución de variables con los datos seleccionados en el Módulo 3 y su perfil de trabajo.
          </p>
        </div>

        {/* Global summary badge */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-slate-600 font-medium">
            Firmante activo: <strong className="text-slate-900 font-bold">{profile.name}</strong> ({profile.position})
          </span>
        </div>
      </div>

      {/* Search and Category Filter Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Buscar plantilla por título, tipo o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs placeholder:text-slate-400 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full sm:w-auto">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#004b93] text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Templates Catalog (6 cols) + Right Vista Previa y Variables (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Templates Cards Grid (5 cols on large screens) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004b93]" />
              Catálogo de Documentos ({filteredTemplates.length})
            </h2>
            <span className="text-xs text-slate-500">Haga clic para previsualizar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  className={`relative bg-white rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'border-2 border-[#004b93] shadow-md ring-2 ring-blue-100/60 bg-blue-50/10'
                      : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
                  }`}
                >
                  {/* Selected Checkmark Badge */}
                  {isSelected && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#004b93] text-white flex items-center justify-center shadow-xs animate-in zoom-in-75">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  <div className="flex items-start gap-3.5">
                    {/* DOCX Graphic Icon */}
                    <div className={`w-14 h-16 rounded-xl border flex flex-col items-center justify-center p-2 relative shrink-0 transition-colors shadow-2xs ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-slate-50 border-slate-200 group-hover:bg-blue-50/60 group-hover:border-blue-200'
                    }`}>
                      <FileText className={`w-6 h-6 mb-1 ${isSelected ? 'text-[#004b93]' : 'text-slate-500 group-hover:text-[#004b93]'}`} />
                      <span className="text-[9px] font-black tracking-wider text-white bg-[#004b93] px-1.5 py-0.2 rounded-xs">
                        DOCX
                      </span>
                    </div>

                    {/* Template details */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#004b93] bg-blue-50 px-2 py-0.5 rounded-md">
                          {template.category}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {template.variables?.length || 9} variables
                        </span>
                      </div>
                      
                      <h3 
                        className={`text-sm font-bold leading-snug line-clamp-1 transition-colors ${
                          isSelected ? 'text-[#004b93]' : 'text-slate-800 group-hover:text-[#004b93]'
                        }`}
                      >
                        {template.title}
                      </h3>
                      
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>

                      <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <span className="truncate">{template.fileName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Select button */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {isSelected ? '✓ Plantilla activa' : 'Plantilla disponible'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                      className={`py-1 px-3.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#004b93] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Seleccionada' : 'Seleccionar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Vista Previa y Variables (7 cols on large screens) */}
        <div className="lg:col-span-7 xl:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          {selectedTemplate ? (
            <div className="space-y-5">
              
              {/* Header with Title & Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Vista Previa y Variables
                    </h3>
                    <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {detectedVariablesInTemplate.length} variables detectadas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Documento: <strong className="text-slate-800">{selectedTemplate.title}</strong>
                  </p>
                </div>

                {/* Mode Selector Tabs (Merged vs Raw) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('merged')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewMode === 'merged'
                        ? 'bg-white text-[#004b93] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Fusión en Vivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('raw')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewMode === 'raw'
                        ? 'bg-white text-[#004b93] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Variables [TAGS]</span>
                  </button>
                </div>
              </div>

              {/* Record Selector when in merged mode */}
              {previewMode === 'merged' && availableRecords && availableRecords.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-blue-50/70 border border-blue-200/80 px-3.5 py-2 rounded-xl text-xs gap-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileSpreadsheet className="w-4 h-4 text-[#004b93] shrink-0" />
                    <span>
                      {selectedRecords.length > 0 ? (
                        <>
                          Datos del registro seleccionado en <strong>Módulo 3</strong>: <strong className="text-[#002f6c] font-bold">{nombreSolicitanteFormateado || 'Registro 1'}</strong> (Primer Nombre: <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">{primerNombre || '—'}</span> | Radicado: {activeRecord?.radicadoEntrada || '—'})
                        </>
                      ) : (
                        <>
                          Probando con registro del Excel: <strong className="text-[#002f6c] font-bold">{nombreSolicitanteFormateado || 'Registro 1'}</strong> (Primer Nombre: <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">{primerNombre || '—'}</span> | Radicado: {activeRecord?.radicadoEntrada || '—'})
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <span className="text-[11px] font-medium text-slate-500">
                      {activeRecordIndex + 1} de {availableRecords.length} {selectedRecords.length > 0 ? 'seleccionados' : 'registros'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveRecordIndex((prev) => Math.max(0, prev - 1))}
                      disabled={activeRecordIndex === 0}
                      className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                      title="Registro anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRecordIndex((prev) => Math.min(availableRecords.length - 1, prev + 1))}
                      disabled={activeRecordIndex === availableRecords.length - 1}
                      className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                      title="Registro siguiente"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Document Canvas (Paper Look) */}
              <div className="bg-[#fcfdfe] border border-slate-300/80 rounded-xl p-6 shadow-sm max-h-[380px] overflow-y-auto font-serif text-[12px] leading-relaxed text-slate-800 relative whitespace-pre-wrap">
                {/* Header letterhead emblem */}
                <div className="border-b-2 border-[#004b93]/20 pb-3 mb-4 flex items-center justify-between font-sans">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#004b93] text-white flex items-center justify-center font-black text-xs">
                      E
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#002f6c] tracking-tight">ESSA GRUPO EPM</div>
                      <div className="text-[9px] text-slate-500 font-medium">Electrificadora de Santander S.A. E.S.P.</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    {selectedTemplate.fileName}
                  </span>
                </div>

                {/* Rendered content */}
                <div>
                  {renderDocumentContent(selectedTemplate.sampleContent)}
                </div>
              </div>

              {/* Detected Variables Breakdown List */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Mapeo de Variables ({detectedVariablesInTemplate.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Sustitución automática activa
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {detectedVariablesInTemplate.map((v) => {
                    let sourceBadge = (
                      <span className="text-[10px] font-bold text-[#004b93] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <FileSpreadsheet className="w-2.5 h-2.5" /> Excel
                      </span>
                    );

                    if (v.sourceType === 'calculated') {
                      sourceBadge = (
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Calculator className="w-2.5 h-2.5" /> Calculado
                        </span>
                      );
                    } else if (v.sourceType === 'profile') {
                      sourceBadge = (
                        <span className="text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> Perfil
                        </span>
                      );
                    } else if (v.sourceType === 'signature') {
                      sourceBadge = (
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <PenTool className="w-2.5 h-2.5" /> Firma
                        </span>
                      );
                    }

                    return (
                      <div
                        key={v.tag}
                        className="p-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs space-y-1 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                            {v.tag}
                          </span>
                          {sourceBadge}
                        </div>
                        
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-500 truncate mr-2 font-medium" title={v.label}>
                            {v.label}
                          </span>
                          <span className="font-bold text-[#004b93] truncate max-w-[130px]" title={String(v.value)}>
                            {v.value ? String(v.value) : <span className="text-amber-600 font-normal italic">Sin dato</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 space-y-3 opacity-60 py-16 text-center">
              <FileCheck2 className="w-14 h-14 text-slate-400 stroke-1" />
              <div>
                <h4 className="text-base font-bold text-slate-700">Ninguna plantilla seleccionada</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Haga clic en una de las plantillas del catálogo de la izquierda para ver su contenido y sus variables dinámicas.
                </p>
              </div>
            </div>
          )}

          {/* Bottom Step Navigation Buttons */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('datos')}
              className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              ← Modificar datos en Módulo 3
            </button>
            <button
              onClick={() => onNavigate('generacion')}
              disabled={!selectedTemplate}
              className={`flex-1 w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-101 cursor-pointer ${
                selectedTemplate 
                  ? 'bg-[#004b93] hover:bg-[#003870] text-white shadow-md' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed hover:scale-100'
              }`}
            >
              Continuar al Módulo 5: Generación y Vista Previa
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
