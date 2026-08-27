import React from 'react';

interface EnergyIllustrationProps {
  className?: string;
}

export const EnergyIllustration: React.FC<EnergyIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative overflow-hidden pointer-events-none select-none flex items-end justify-end ${className}`}>
      <svg
        viewBox="0 0 700 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[220px] object-contain opacity-90"
      >
        {/* Soft background sky hill */}
        <path
          d="M 50 210 Q 200 130 450 180 T 700 160 L 700 240 L 0 240 Z"
          fill="#e2effa"
          opacity="0.6"
        />
        <path
          d="M 280 200 Q 420 140 600 170 T 700 190 L 700 240 L 280 240 Z"
          fill="#cbe3f7"
          opacity="0.5"
        />

        {/* Clouds */}
        <path
          d="M 380 70 C 390 50 420 50 435 65 C 445 55 470 60 475 75 C 485 75 495 85 490 95 L 370 95 C 365 85 372 75 380 70 Z"
          fill="#ffffff"
          stroke="#93c5fd"
          strokeWidth="1.5"
        />
        <path
          d="M 580 40 C 590 25 615 25 625 38 C 635 30 655 35 660 48 C 670 48 678 56 675 64 L 570 64 C 565 56 572 45 580 40 Z"
          fill="#ffffff"
          stroke="#93c5fd"
          strokeWidth="1.5"
        />

        {/* Distant City Skyline Buildings */}
        <rect x="520" y="100" width="32" height="120" rx="2" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="528" y1="115" x2="544" y2="115" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1="528" y1="130" x2="544" y2="130" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1="528" y1="145" x2="544" y2="145" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1="528" y1="160" x2="544" y2="160" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1="528" y1="175" x2="544" y2="175" stroke="#60a5fa" strokeWidth="1.5" />
        <line x1="528" y1="190" x2="544" y2="190" stroke="#60a5fa" strokeWidth="1.5" />

        <rect x="556" y="115" width="28" height="105" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <rect x="562" y="125" width="6" height="8" fill="#3b82f6" opacity="0.6" />
        <rect x="572" y="125" width="6" height="8" fill="#3b82f6" opacity="0.6" />
        <rect x="562" y="140" width="6" height="8" fill="#3b82f6" opacity="0.6" />
        <rect x="572" y="140" width="6" height="8" fill="#3b82f6" opacity="0.6" />
        <rect x="562" y="155" width="6" height="8" fill="#3b82f6" opacity="0.6" />
        <rect x="572" y="155" width="6" height="8" fill="#3b82f6" opacity="0.6" />

        <rect x="588" y="130" width="30" height="90" rx="2" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
        <rect x="594" y="140" width="6" height="6" fill="#60a5fa" />
        <rect x="606" y="140" width="6" height="6" fill="#60a5fa" />
        <rect x="594" y="152" width="6" height="6" fill="#60a5fa" />
        <rect x="606" y="152" width="6" height="6" fill="#60a5fa" />

        {/* Substation building */}
        <rect x="475" y="165" width="36" height="55" rx="2" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="480" y="175" width="6" height="6" fill="#2563eb" />
        <rect x="490" y="175" width="6" height="6" fill="#2563eb" />
        <rect x="500" y="175" width="6" height="6" fill="#2563eb" />
        <rect x="485" y="195" width="16" height="25" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="1" />

        {/* Wind Turbine 1 (Left background) */}
        <g transform="translate(110, 40)">
          <path d="M 30 180 L 36 60 L 40 60 L 46 180 Z" fill="#ffffff" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="38" cy="60" r="5" fill="#1e40af" />
          {/* Blades */}
          <path d="M 38 60 Q 34 20 38 0 Q 42 20 38 60" fill="#ffffff" stroke="#1e40af" strokeWidth="1.5" />
          <path d="M 38 60 Q 72 80 88 95 Q 68 85 38 60" fill="#ffffff" stroke="#1e40af" strokeWidth="1.5" />
          <path d="M 38 60 Q 10 95 -12 110 Q 15 85 38 60" fill="#ffffff" stroke="#1e40af" strokeWidth="1.5" />
        </g>

        {/* Wind Turbine 2 (Middle foreground) */}
        <g transform="translate(150, 20)">
          <path d="M 40 200 L 47 45 L 51 45 L 58 200 Z" fill="#ffffff" stroke="#1e40af" strokeWidth="1.8" />
          <circle cx="49" cy="45" r="6" fill="#1e40af" />
          {/* Blades */}
          <path d="M 49 45 Q 44 5 49 -20 Q 54 5 49 45" fill="#ffffff" stroke="#1e40af" strokeWidth="1.8" />
          <path d="M 49 45 Q 90 70 110 88 Q 85 75 49 45" fill="#ffffff" stroke="#1e40af" strokeWidth="1.8" />
          <path d="M 49 45 Q 15 88 -10 105 Q 20 75 49 45" fill="#ffffff" stroke="#1e40af" strokeWidth="1.8" />
        </g>

        {/* Power Pylon / Transmission Tower 1 */}
        <g transform="translate(280, 70)">
          {/* Tower Base & Legs */}
          <path d="M 10 150 L 35 25 L 45 25 L 70 150" stroke="#1d4ed8" strokeWidth="1.8" fill="none" />
          <line x1="18" y1="120" x2="62" y2="120" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="25" y1="80" x2="55" y2="80" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="32" y1="45" x2="48" y2="45" stroke="#1d4ed8" strokeWidth="1.5" />
          {/* Cross bracings */}
          <line x1="18" y1="120" x2="55" y2="80" stroke="#1d4ed8" strokeWidth="1.2" />
          <line x1="62" y1="120" x2="25" y2="80" stroke="#1d4ed8" strokeWidth="1.2" />
          <line x1="25" y1="80" x2="48" y2="45" stroke="#1d4ed8" strokeWidth="1.2" />
          <line x1="55" y1="80" x2="32" y2="45" stroke="#1d4ed8" strokeWidth="1.2" />
          {/* Arms / Crossbars */}
          <line x1="5" y1="50" x2="75" y2="50" stroke="#1d4ed8" strokeWidth="2" />
          <line x1="15" y1="75" x2="65" y2="75" stroke="#1d4ed8" strokeWidth="2" />
          <path d="M 40 25 L 40 0" stroke="#1d4ed8" strokeWidth="1.8" />
          {/* Insulators */}
          <circle cx="8" cy="56" r="2.5" fill="#3b82f6" />
          <circle cx="72" cy="56" r="2.5" fill="#3b82f6" />
          <circle cx="18" cy="81" r="2.5" fill="#3b82f6" />
          <circle cx="62" cy="81" r="2.5" fill="#3b82f6" />
        </g>

        {/* Power Pylon / Transmission Tower 2 (Foreground Right) */}
        <g transform="translate(370, 50)">
          <path d="M 12 170 L 40 20 L 52 20 L 80 170" stroke="#1e3a8a" strokeWidth="2" fill="none" />
          <line x1="22" y1="135" x2="70" y2="135" stroke="#1e3a8a" strokeWidth="1.6" />
          <line x1="30" y1="90" x2="62" y2="90" stroke="#1e3a8a" strokeWidth="1.6" />
          <line x1="37" y1="50" x2="55" y2="50" stroke="#1e3a8a" strokeWidth="1.6" />
          {/* Cross bracings */}
          <line x1="22" y1="135" x2="62" y2="90" stroke="#1e3a8a" strokeWidth="1.3" />
          <line x1="70" y1="135" x2="30" y2="90" stroke="#1e3a8a" strokeWidth="1.3" />
          <line x1="30" y1="90" x2="55" y2="50" stroke="#1e3a8a" strokeWidth="1.3" />
          <line x1="62" y1="90" x2="37" y2="50" stroke="#1e3a8a" strokeWidth="1.3" />
          {/* Crossbars */}
          <line x1="2" y1="55" x2="90" y2="55" stroke="#1e3a8a" strokeWidth="2.2" />
          <line x1="12" y1="85" x2="80" y2="85" stroke="#1e3a8a" strokeWidth="2.2" />
          <path d="M 46 20 L 46 -8" stroke="#1e3a8a" strokeWidth="2" />
          {/* Insulators */}
          <circle cx="6" cy="62" r="3" fill="#1d4ed8" />
          <circle cx="86" cy="62" r="3" fill="#1d4ed8" />
          <circle cx="16" cy="92" r="3" fill="#1d4ed8" />
          <circle cx="76" cy="92" r="3" fill="#1d4ed8" />
        </g>

        {/* High voltage transmission cables */}
        <path d="M 180 120 Q 240 135 288 120" stroke="#3b82f6" strokeWidth="1.2" fill="none" opacity="0.8" />
        <path d="M 288 120 Q 330 135 376 105" stroke="#3b82f6" strokeWidth="1.2" fill="none" opacity="0.8" />
        <path d="M 352 120 Q 400 130 456 105" stroke="#3b82f6" strokeWidth="1.2" fill="none" opacity="0.8" />
        <path d="M 442 105 Q 490 120 540 110" stroke="#3b82f6" strokeWidth="1.2" fill="none" opacity="0.8" />

        {/* Small Trees / Bushes */}
        <circle cx="430" cy="215" r="10" fill="#22c55e" opacity="0.8" />
        <circle cx="442" cy="217" r="8" fill="#16a34a" opacity="0.9" />
        <circle cx="465" cy="218" r="7" fill="#15803d" opacity="0.85" />
        <circle cx="630" cy="216" r="9" fill="#22c55e" opacity="0.8" />

        {/* Ground base line */}
        <line x1="0" y1="220" x2="700" y2="220" stroke="#0284c7" strokeWidth="2" />
      </svg>
    </div>
  );
};
