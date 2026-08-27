import React from 'react';

interface EssaLogoProps {
  className?: string;
  variant?: 'header' | 'document' | 'compact' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export const EssaLogo: React.FC<EssaLogoProps> = ({ 
  className = '', 
  variant = 'header',
  size = 'md' 
}) => {
  // Document variant: High-contrast corporate presentation for letterheads and PDFs
  if (variant === 'document') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        {/* ESSA Vector Brandmark */}
        <svg
          className="w-10 h-10 shrink-0"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Blue Energy Arc */}
          <path
            d="M8 24C8 15.163 15.163 8 24 8C28.418 8 32.418 9.791 35.314 12.686L30.657 17.343C28.948 15.634 26.598 14.571 24 14.571C18.793 14.571 14.571 18.793 14.571 24C14.571 29.207 18.793 33.429 24 33.429C27.243 33.429 30.086 31.795 31.762 29.286H24V22.714H38.571V24C38.571 32.837 31.408 40 24 40C15.163 40 8 32.837 8 24Z"
            fill="#004B93"
          />
          {/* Green EPM Energy Spark Accent */}
          <path
            d="M36 10C36 10 40 14 40 20C40 21.5 39.5 22.8 38.6 24L33.8 19.2C34.4 17.8 34.8 16.3 34.8 14.7C34.8 12.9 34.2 11.3 33.2 10H36Z"
            fill="#76BC21"
          />
          <circle cx="39" cy="9" r="3.5" fill="#76BC21" />
        </svg>

        {/* Brand Text Block */}
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-2 leading-none">
            <span className="text-2xl font-black text-[#004B93] tracking-tighter font-sans">
              ESSA
            </span>
            <span className="text-xs font-semibold text-slate-500 tracking-tight">
              grupo<span className="text-[#76BC21] font-bold mx-0.5">•</span>epm
            </span>
          </div>
          <span className="text-[9.5px] font-semibold text-[#76BC21] tracking-wider uppercase mt-1">
            Electrificadora de Santander
          </span>
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <svg
          className="w-8 h-8 shrink-0"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 24C8 15.163 15.163 8 24 8C28.418 8 32.418 9.791 35.314 12.686L30.657 17.343C28.948 15.634 26.598 14.571 24 14.571C18.793 14.571 14.571 18.793 14.571 24C14.571 29.207 18.793 33.429 24 33.429C27.243 33.429 30.086 31.795 31.762 29.286H24V22.714H38.571V24C38.571 32.837 31.408 40 24 40C15.163 40 8 32.837 8 24Z"
            fill="#004B93"
          />
          <circle cx="39" cy="9" r="3.5" fill="#76BC21" />
        </svg>
        <span className="text-xl font-black text-[#004B93] tracking-tighter">
          ESSA
        </span>
      </div>
    );
  }

  // Default / Header variant: Sophisticated, clean, vector-crisp branding
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 py-1 px-1 select-none transition-all duration-200 ${className}`}>
      {/* Official ESSA Emblem Vector */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          className="w-9 h-9 sm:w-10 sm:h-10 transition-transform duration-200 group-hover:scale-105"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Blue Dynamic Energy Shield / Flow */}
          <path
            d="M9 24C9 15.716 15.716 9 24 9C28.142 9 31.892 10.679 34.607 13.393L30.243 17.757C28.641 16.155 26.438 15.16 24 15.16C19.118 15.16 15.16 19.118 15.16 24C15.16 28.882 19.118 32.84 24 32.84C27.04 32.84 29.706 31.304 31.277 28.95H24V22.79H38.034V24C38.034 32.284 31.284 39 24 39C15.716 39 9 32.284 9 24Z"
            fill="#004B93"
          />
          {/* Vibrant Green Leaf / Energy Accent for Grupo EPM endorsement */}
          <path
            d="M35.5 10.5C35.5 10.5 39 14.5 39 20C39 21.2 38.6 22.3 37.8 23.3L33.5 19C34 17.8 34.3 16.5 34.3 15C34.3 13.2 33.7 11.6 32.7 10.3L35.5 10.5Z"
            fill="#76BC21"
          />
          <circle cx="38.5" cy="9.5" r="3.2" fill="#76BC21" />
        </svg>
      </div>

      {/* Typography & Endorsement */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1.5 sm:gap-2 leading-none">
          <span className="text-xl sm:text-2xl font-black text-[#004B93] tracking-tight font-sans">
            ESSA
          </span>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 tracking-tight flex items-center">
            grupo<span className="text-[#76BC21] font-black text-sm leading-none mx-0.5">•</span>epm
          </span>
        </div>
        <span className="text-[9px] sm:text-[9.5px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors tracking-tight mt-0.5 leading-none hidden xs:inline-block">
          Electrificadora de Santander
        </span>
      </div>
    </div>
  );
};
