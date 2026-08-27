import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-5 border-t border-slate-200 bg-white/70 backdrop-blur-xs text-xs text-slate-500">
      <div className="max-w-[1500px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          © 2025 ESSA - Electrificadora de Santander S.A. E.S.P. | Todos los derechos reservados.
        </div>
        <div className="font-medium text-slate-400">
          Versión 1.0.0
        </div>
      </div>
    </footer>
  );
};
