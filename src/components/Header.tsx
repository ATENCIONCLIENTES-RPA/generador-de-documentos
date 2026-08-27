import React, { useState } from 'react';
import { 
  Home, 
  User, 
  PenTool, 
  FileSpreadsheet, 
  Table, 
  CloudDownload, 
  ChevronDown,
  Settings,
  CheckCheck,
  FileSpreadsheet as ExcelIcon
} from 'lucide-react';
import { EssaLogo } from './EssaLogo';
import { StepId, UserProfile } from '../types';

interface HeaderProps {
  currentStep: StepId;
  onSelectStep: (step: StepId) => void;
  excelCount: number;
  markedCount: number;
  profile: UserProfile;
  completedSteps?: StepId[];
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onSelectStep,
  excelCount,
  markedCount,
  profile,
  completedSteps = [],
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems: { id: StepId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'perfil', label: 'Perfil de trabajo', icon: User },
    { id: 'configuracion', label: 'Configuración', icon: PenTool },
    { id: 'datos', label: 'Datos del documento', icon: Table },
    { id: 'plantillas', label: 'Galería de plantillas', icon: FileSpreadsheet },
    { id: 'generacion', label: 'Generación', icon: CloudDownload },
  ];

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('es-CO').format(num || 0);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'JR';
  };

  const percentageMarked = excelCount > 0 ? Math.round((markedCount / excelCount) * 100) : 0;

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      <div className="flex items-center justify-between h-16 max-w-[1600px] mx-auto px-2 sm:px-4">
        {/* ESSA Corporate Logo */}
        <div 
          onClick={() => onSelectStep('inicio')} 
          className="group cursor-pointer h-full flex items-center shrink-0 pr-3 sm:pr-4 pl-1 hover:opacity-95 transition-all"
          title="Ir al Inicio - ESSA Grupo EPM"
        >
          <EssaLogo />
        </div>

        {/* Brand Divider */}
        <div className="h-8 w-px bg-slate-200 hidden md:block shrink-0 mr-2" />

        {/* Navigation Tabs */}
        <nav className="flex items-center h-full space-x-1 lg:space-x-2 px-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentStep === item.id;
            const isDone = completedSteps.includes(item.id);

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onSelectStep(item.id)}
                className={`relative flex flex-col items-center justify-center px-3 py-2 h-full text-xs font-semibold transition-all group shrink-0 ${
                  isActive
                    ? 'text-[#004b93] font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-full mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-100/80 text-[#004b93]'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="whitespace-nowrap">{item.label}</span>

                {/* Active Underline indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#004b93] rounded-t-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Cards & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 shrink-0">
          
          {/* Card 1: Registros de Excel */}
          <div 
            onClick={() => onSelectStep('datos')}
            className="group relative flex items-center gap-2.5 bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-400/80 rounded-xl px-3 py-1.5 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.98]"
            title="Total de registros cargados desde el archivo Excel"
          >
            {/* Excel Icon Container */}
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shadow-2xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
              <ExcelIcon className="w-4 h-4" />
            </div>

            {/* Content info */}
            <div className="flex flex-col min-w-[68px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 group-hover:text-emerald-900 transition-colors leading-none">
                  Registros
                </span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded-xs hidden sm:inline-block">
                  Excel
                </span>
              </div>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5 tabular-nums">
                {formatNumber(excelCount)}
              </span>
            </div>
          </div>

          {/* Card 2: Marcados */}
          <div 
            onClick={() => onSelectStep('datos')}
            className="group relative flex items-center gap-2.5 bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-blue-400/80 rounded-xl px-3 py-1.5 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.98]"
            title="Registros seleccionados y listos para generar documentos"
          >
            {/* Checkmark Icon Container */}
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/70 text-[#004b93] flex items-center justify-center shadow-2xs shrink-0 group-hover:bg-[#004b93] group-hover:text-white transition-colors duration-200">
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            </div>

            {/* Content info */}
            <div className="flex flex-col min-w-[68px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 group-hover:text-blue-900 transition-colors leading-none">
                  Marcados
                </span>
                <span className="text-[9px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded-full hidden sm:inline-block tabular-nums">
                  {percentageMarked}%
                </span>
              </div>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5 tabular-nums">
                {formatNumber(markedCount)}
              </span>
            </div>
          </div>

          {/* Subtle separator */}
          <div className="h-7 w-px bg-slate-200/80 hidden sm:block mx-0.5" />

          {/* User Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200 shadow-2xs cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#004b93] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(profile.name)}
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden md:inline-block max-w-[100px] truncate">
                {profile.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{profile.name}</p>
                  <p className="text-[11px] text-slate-500">{profile.position}</p>
                  <p className="text-[10px] text-blue-600 truncate">{profile.email}</p>
                </div>
                <div className="py-1 text-xs">
                  <button
                    onClick={() => {
                      onSelectStep('perfil');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Editar Perfil de Trabajo
                  </button>
                  <button
                    onClick={() => {
                      onSelectStep('configuracion');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Configuración de Recursos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
