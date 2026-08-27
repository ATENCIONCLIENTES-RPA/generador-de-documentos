import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Calendar,
  Layers, 
  Sparkles, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  CheckSquare, 
  Square, 
  FileSpreadsheet,
  Upload,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import { DocumentRecord, StepId } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import { formatApplicantName } from '../utils/nameParser';

interface DataViewProps {
  records: DocumentRecord[];
  onUpdateRecords: (records: DocumentRecord[]) => void;
  onNavigate: (step: StepId) => void;
}

export const DataView: React.FC<DataViewProps> = ({
  records,
  onUpdateRecords,
  onNavigate,
}) => {
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [filterNumeroCuenta, setFilterNumeroCuenta] = useState('');
  const [filterProceso, setFilterProceso] = useState('');
  const [filterRadicado, setFilterRadicado] = useState('');
  const [filterFechaSolicitud, setFilterFechaSolicitud] = useState('');
  const [filterFechaVencimiento, setFilterFechaVencimiento] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // 20 records per page as requested
  const ITEMS_PER_PAGE = 20;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const { records: parsedRecords, rawCount } = parseExcelFile(bstr);

        if (parsedRecords.length === 0) {
          setUploadError(`El archivo "${file.name}" se leyó (${rawCount} filas), pero no contiene registros válidos para el proceso.`);
          setIsProcessingFile(false);
          return;
        }

        onUpdateRecords(parsedRecords);
        setCurrentPage(1);
        setIsProcessingFile(false);
      } catch (err) {
        console.error(err);
        setUploadError('Error al procesar el archivo Excel. Verifique que sea un formato .xlsx o .xls válido.');
        setIsProcessingFile(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredRecords = records.filter(
    (r) =>
      (!filterNumeroCuenta || (r.numeroCuenta || r.cuenta || '')?.toLowerCase().includes(filterNumeroCuenta.toLowerCase())) &&
      (!filterProceso || r.numeroProceso?.toLowerCase().includes(filterProceso.toLowerCase())) &&
      (!filterRadicado || r.radicadoEntrada?.toLowerCase().includes(filterRadicado.toLowerCase())) &&
      (!filterFechaSolicitud || r.fechaSolicitud?.toLowerCase().includes(filterFechaSolicitud.toLowerCase())) &&
      (!filterFechaVencimiento || r.fechaVencimiento?.toLowerCase().includes(filterFechaVencimiento.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const allSelected = filteredRecords.length > 0 && filteredRecords.every((r) => r.selected);
  const pageSelectedCount = paginatedRecords.filter((r) => r.selected).length;
  const totalSelectedCount = records.filter((r) => r.selected).length;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-CO').format(num);
  };

  const startRecord = filteredRecords.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endRecord = Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length);

  const changePage = (newPage: number) => {
    const clampedPage = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(clampedPage);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const toggleSelectAll = () => {
    const nextState = !allSelected;
    const filteredIds = new Set(filteredRecords.map((r) => r.id));
    onUpdateRecords(records.map((r) => filteredIds.has(r.id) ? { ...r, selected: nextState } : r));
  };

  const toggleSelectPage = () => {
    const allPageSelected = paginatedRecords.length > 0 && paginatedRecords.every((r) => r.selected);
    const pageIds = new Set(paginatedRecords.map((r) => r.id));
    onUpdateRecords(records.map((r) => pageIds.has(r.id) ? { ...r, selected: !allPageSelected } : r));
  };

  const toggleSelectRow = (id: number) => {
    onUpdateRecords(
      records.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleValidateAll = () => {
    onUpdateRecords(
      records.map((r) => (r.selected ? { ...r, status: 'Validado' } : r))
    );
    setValidationSuccess(true);
    setTimeout(() => setValidationSuccess(false), 3000);
  };

  const handleMergeAndProceed = () => {
    onUpdateRecords(
      records.map((r) => (r.selected ? { ...r, status: 'Fusionado' } : r))
    );
    onNavigate('plantillas');
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      changePage(p);
      setJumpPageInput('');
    }
  };

  // If no records are loaded from Excel, show clean empty state requiring file upload
  if (records.length === 0) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-300">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".xlsx, .xls" 
          className="hidden" 
        />

        {/* Title & Description Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
              Módulo 3: Datos del Documento
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Plataforma de generación documental automatizada para la empresa ESSA.
            </p>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[#004b93] mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            No se han cargado datos desde Excel
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mt-2 mb-6">
            La tabla se alimenta <strong className="text-slate-700">exclusivamente de la información real</strong> de su archivo Excel oficial. Cargue su archivo <span className="font-semibold text-slate-700">.xlsx / .xls</span> para iniciar la selección, validación y fusión de documentos.
          </p>

          {uploadError && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2 max-w-md text-left">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile}
              className="px-6 py-3 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isProcessingFile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando Excel...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Cargar Archivo Excel (.xlsx)
                </>
              )}
            </button>

            <button
              onClick={() => onNavigate('configuracion')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              Ir a Módulo 2: Configuración
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reusable Pagination Bar
  const renderPaginationBar = (position: 'top' | 'bottom') => (
    <div 
      className={`px-4 py-3 bg-slate-50/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 ${
        position === 'top' 
          ? 'border-b border-slate-200 sticky top-0 z-30 shadow-xs' 
          : 'border-t border-slate-200 sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)]'
      }`}
    >
      {/* Range Info & Selection Badge */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-[#004b93]" />
          Mostrando <strong className="text-slate-900 font-bold">{formatNumber(startRecord)}–{formatNumber(endRecord)}</strong> de <strong className="text-[#002f6c] font-bold">{formatNumber(filteredRecords.length)}</strong> registros
        </span>
        
        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md">
          {pageSelectedCount} de 20 seleccionados en pág. ({formatNumber(totalSelectedCount)} total)
        </span>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Select All on Current Page */}
        <button
          onClick={toggleSelectPage}
          title="Marcar / Desmarcar los 20 registros de esta página"
          className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          {paginatedRecords.length > 0 && paginatedRecords.every((r) => r.selected) ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-[#004b93]" />
              <span>Desmarcar pág.</span>
            </>
          ) : (
            <>
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>Marcar pág. (20)</span>
            </>
          )}
        </button>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

        {/* Quick Page Jump */}
        {totalPages > 3 && (
          <form onSubmit={handleJumpPage} className="flex items-center gap-1 mr-1">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Ir a:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              placeholder={String(currentPage)}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-14 px-2 py-1 text-xs text-center font-bold bg-white border border-slate-200 rounded-lg focus:border-[#004b93] outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 text-[11px] font-bold text-white bg-[#004b93] hover:bg-[#003870] rounded-lg transition-colors cursor-pointer"
            >
              Ir
            </button>
          </form>
        )}

        {/* First Page */}
        <button
          onClick={() => changePage(1)}
          disabled={currentPage === 1}
          title="Primera página"
          className="p-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        {/* Current / Total indicator */}
        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 shadow-2xs">
          Página <span className="text-[#004b93] font-black">{formatNumber(currentPage)}</span> de <span className="text-slate-600">{formatNumber(totalPages)}</span>
        </div>

        {/* Next Page */}
        <button
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => changePage(totalPages)}
          disabled={currentPage === totalPages}
          title="Última página"
          className="p-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />

      {/* Title & Description Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
            Módulo 3: Datos del Documento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Plataforma de generación documental automatizada para la empresa ESSA. Seleccione los registros a procesar con las plantillas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Cargar o reemplazar con otro archivo Excel"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004b93]" />
            <span>Cargar otro Excel</span>
          </button>

          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700">
              {formatNumber(filteredRecords.length)} registros del Excel
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Status Notification */}
      {validationSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>¡Todos los registros seleccionados han sido validados exitosamente! Datos listos para seleccionar plantilla.</span>
          </div>
          <button 
            onClick={() => onNavigate('plantillas')}
            className="underline font-bold hover:text-emerald-950 cursor-pointer"
          >
            Ir a Módulo 4: Plantillas &rarr;
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filtro Número de Cuenta */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Número de Cuenta</span>
              {filterNumeroCuenta && (
                <span className="text-[10px] text-[#004b93] font-semibold bg-blue-50 px-1.5 py-0.5 rounded">Activo</span>
              )}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cuenta..."
                value={filterNumeroCuenta}
                onChange={(e) => { setFilterNumeroCuenta(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93] outline-none transition-all"
              />
            </div>
          </div>

          {/* Filtro Número Proceso */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Número Proceso</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar proceso..."
                value={filterProceso}
                onChange={(e) => { setFilterProceso(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93] outline-none transition-all"
              />
            </div>
          </div>

          {/* Filtro Radicado Entrada */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Radicado Entrada</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar radicado..."
                value={filterRadicado}
                onChange={(e) => { setFilterRadicado(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93] outline-none transition-all"
              />
            </div>
          </div>

          {/* Filtro Fecha Solicitud */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Fecha Solicitud</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ej: 26/08/2026"
                value={filterFechaSolicitud}
                onChange={(e) => { setFilterFechaSolicitud(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93] outline-none transition-all"
              />
            </div>
          </div>

          {/* Filtro Fecha Vencimiento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Fecha Vencimiento</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ej: 26/08/2026"
                value={filterFechaVencimiento}
                onChange={(e) => { setFilterFechaVencimiento(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#004b93] focus:ring-1 focus:ring-[#004b93] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(filterNumeroCuenta || filterProceso || filterRadicado || filterFechaSolicitud || filterFechaVencimiento) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Mostrando <strong className="text-slate-800">{formatNumber(filteredRecords.length)}</strong> registros coincidentes con los filtros.
            </span>
            <button
              onClick={() => {
                setFilterNumeroCuenta('');
                setFilterProceso('');
                setFilterRadicado('');
                setFilterFechaSolicitud('');
                setFilterFechaVencimiento('');
                setCurrentPage(1);
              }}
              className="text-[#004b93] hover:underline font-semibold cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card with Dual-Sticky Pagination */}
      <div 
        ref={tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col relative"
      >
        {/* Top Pagination Toolbar (Sticky) - always accessible immediately */}
        {renderPaginationBar('top')}

        {/* Responsive Table Container */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                {/* Select All Checkbox Header */}
                <th className="py-3 px-4 w-12 text-center sticky left-0 bg-slate-100/90 backdrop-blur-xs z-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Seleccionar / Deseleccionar todos los registros filtrados"
                    className="w-4 h-4 rounded border-slate-300 text-[#004b93] focus:ring-[#004b93] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Fecha Solicitud</th>
                <th className="py-3 px-4">Fecha Vencimiento</th>
                <th className="py-3 px-4">Número Proceso</th>
                <th className="py-3 px-4">Radicado Entrada</th>
                <th className="py-3 px-4">Número de Cuenta</th>
                <th className="py-3 px-4">Nombre Solicitante</th>
                <th className="py-3 px-4">Cédula Solicitante</th>
                <th className="py-3 px-4">Dirección Solicitante</th>
                <th className="py-3 px-4">Depto. Solicitante</th>
                <th className="py-3 px-4">Municipio Solicitante</th>
                <th className="py-3 px-4">Correo Solicitante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => {
                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        record.selected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3 px-4 text-center sticky left-0 bg-inherit z-10">
                        <input
                          type="checkbox"
                          checked={record.selected}
                          onChange={() => toggleSelectRow(record.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#004b93] focus:ring-[#004b93] cursor-pointer"
                        />
                      </td>

                      {/* Fecha Solicitud */}
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {record.fechaSolicitud || '—'}
                      </td>

                      {/* Fecha Vencimiento */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {record.fechaVencimiento || '—'}
                      </td>

                      {/* Número Proceso */}
                      <td className="py-3 px-4 text-slate-700 font-semibold whitespace-nowrap">
                        {record.numeroProceso || '—'}
                      </td>

                      {/* Radicado Entrada */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {record.radicadoEntrada || '—'}
                      </td>

                      {/* Número de Cuenta */}
                      <td className="py-3 px-4 text-slate-700 font-mono text-[11px] whitespace-nowrap font-medium">
                        {record.numeroCuenta || record.cuenta || '—'}
                      </td>

                      {/* Nombre Solicitante */}
                      <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                        {formatApplicantName(record.nombreSolicitante) || '—'}
                      </td>

                      {/* Cédula Solicitante */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {record.cedulaSolicitante || '—'}
                      </td>

                      {/* Dirección Solicitante */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {record.direccionSolicitante || '—'}
                      </td>

                      {/* Departamento Solicitante */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {record.departamentoSolicitante || '—'}
                      </td>

                      {/* Municipio Solicitante */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {record.municipioSolicitante || '—'}
                      </td>

                      {/* Correo Solicitante */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {record.correoSolicitante || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No se encontraron registros que coincidan con los filtros aplicados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Toolbar (Sticky) */}
        {renderPaginationBar('bottom')}
      </div>

      {/* Bottom Actions Buttons (Continuar a Plantillas, Validar) */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <button
          onClick={handleMergeAndProceed}
          className="px-8 py-3 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-md transition-all hover:scale-102 flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Continuar al Módulo 4: Selección de Plantillas
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleValidateAll}
          className="px-8 py-3 bg-white hover:bg-slate-50 border-2 border-[#004b93] text-[#004b93] text-sm font-bold rounded-xl transition-all hover:scale-102 flex items-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          Validar Seleccionados
        </button>
      </div>

    </div>
  );
};
