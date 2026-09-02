import { useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { prefersReducedMotion } from '@/utils/motion';

interface Props {
  className?: string;
}

export function EnergyIllustration({ className = '' }: Props): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);

  // Floating clouds ambient animation
  useEffect(() => {
    if (prefersReducedMotion() || !svgRef.current) return;
    const clouds = svgRef.current.querySelectorAll('g[opacity]');
    if (clouds.length === 0) return;
    animate(clouds, {
      x: [0, 8, -6, 0],
      y: [0, -4, 3, 0],
      duration: 15000,
      ease: 'linear',
      loop: true,
    });
  }, []);
  return (
    <div
      className={`energy-illustration ${className}`}
      style={{ width: '100%', overflow: 'hidden' }}
      data-testid="energy-illustration"
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 800 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto' }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Ilustración infraestructura eléctrica"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#f0f9ff" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
        </defs>

        <rect width="800" height="300" fill="url(#skyGrad)" />

        <path
          d="M0 220 Q100 180 200 200 Q350 170 500 190 Q650 160 800 195 L800 300 L0 300 Z"
          fill="#e0f2fe"
          opacity="0.5"
        />
        <path
          d="M0 240 Q150 210 300 230 Q450 200 600 225 Q700 210 800 220 L800 300 L0 300 Z"
          fill="#dbeafe"
          opacity="0.4"
        />

        <g opacity="0.6">
          <ellipse cx="120" cy="60" rx="40" ry="18" fill="white" />
          <ellipse cx="150" cy="55" rx="35" ry="20" fill="white" />
          <ellipse cx="175" cy="62" rx="30" ry="15" fill="white" />
        </g>
        <g opacity="0.5">
          <ellipse cx="500" cy="45" rx="45" ry="20" fill="white" />
          <ellipse cx="535" cy="40" rx="38" ry="22" fill="white" />
          <ellipse cx="565" cy="48" rx="32" ry="16" fill="white" />
        </g>
        <g opacity="0.4">
          <ellipse cx="700" cy="70" rx="35" ry="16" fill="white" />
          <ellipse cx="725" cy="65" rx="30" ry="18" fill="white" />
        </g>

        <g transform="translate(100, 100)">
          <line x1="0" y1="0" x2="0" y2="120" stroke="#1d4ed8" strokeWidth="4" />
          <circle cx="0" cy="0" r="4" fill="#1d4ed8" />
          <line
            x1="0"
            y1="0"
            x2="-30"
            y2="-50"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="35"
            y2="-40"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="-5"
            y2="55"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        <g transform="translate(200, 115)">
          <line x1="0" y1="0" x2="0" y2="105" stroke="#1d4ed8" strokeWidth="3" />
          <circle cx="0" cy="0" r="3" fill="#1d4ed8" />
          <line
            x1="0"
            y1="0"
            x2="-25"
            y2="-42"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="28"
            y2="-35"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="-4"
            y2="45"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        <g transform="translate(340, 80)">
          <line x1="0" y1="0" x2="0" y2="140" stroke="#1e40af" strokeWidth="5" />
          <line x1="-20" y1="30" x2="20" y2="60" stroke="#1e40af" strokeWidth="2" />
          <line x1="20" y1="30" x2="-20" y2="60" stroke="#1e40af" strokeWidth="2" />
          <line x1="-18" y1="70" x2="18" y2="100" stroke="#1e40af" strokeWidth="2" />
          <line x1="18" y1="70" x2="-18" y2="100" stroke="#1e40af" strokeWidth="2" />
          <line x1="-30" y1="15" x2="30" y2="15" stroke="#1e40af" strokeWidth="3" />
          <line x1="-25" y1="55" x2="25" y2="55" stroke="#1e40af" strokeWidth="3" />
          <rect x="-32" y="10" width="4" height="12" rx="2" fill="#1d4ed8" />
          <rect x="28" y="10" width="4" height="12" rx="2" fill="#1d4ed8" />
          <rect x="-27" y="50" width="4" height="12" rx="2" fill="#1d4ed8" />
          <rect x="23" y="50" width="4" height="12" rx="2" fill="#1d4ed8" />
        </g>

        <path
          d="M310 95 Q280 85 200 115"
          stroke="#3b82f6"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M310 98 Q280 88 200 118"
          stroke="#3b82f6"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />

        <g transform="translate(550, 90)">
          <line x1="0" y1="0" x2="0" y2="130" stroke="#1e40af" strokeWidth="5" />
          <line x1="-18" y1="25" x2="18" y2="55" stroke="#1e40af" strokeWidth="2" />
          <line x1="18" y1="25" x2="-18" y2="55" stroke="#1e40af" strokeWidth="2" />
          <line x1="-15" y1="65" x2="15" y2="95" stroke="#1e40af" strokeWidth="2" />
          <line x1="15" y1="65" x2="-15" y2="95" stroke="#1e40af" strokeWidth="2" />
          <line x1="-28" y1="12" x2="28" y2="12" stroke="#1e40af" strokeWidth="3" />
          <line x1="-22" y1="50" x2="22" y2="50" stroke="#1e40af" strokeWidth="3" />
          <rect x="-30" y="7" width="4" height="12" rx="2" fill="#1d4ed8" />
          <rect x="26" y="7" width="4" height="12" rx="2" fill="#1d4ed8" />
          <rect x="-24" y="45" width="4" height="12" rx="2" fill="#1d4ed8" />
          <rect x="20" y="45" width="4" height="12" rx="2" fill="#1d4ed8" />
        </g>

        <path
          d="M522 102 Q490 92 420 100"
          stroke="#3b82f6"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M522 105 Q490 95 420 103"
          stroke="#3b82f6"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />

        <g transform="translate(420, 140)">
          <rect
            x="-25"
            y="10"
            width="50"
            height="35"
            rx="3"
            fill="#1e40af"
            opacity="0.15"
            stroke="#1e40af"
            strokeWidth="1.5"
          />
          <rect x="-18" y="15" width="12" height="25" rx="2" fill="#1d4ed8" opacity="0.4" />
          <rect x="6" y="15" width="12" height="25" rx="2" fill="#1d4ed8" opacity="0.4" />
          <line x1="-12" y1="10" x2="-12" y2="2" stroke="#1e40af" strokeWidth="2" />
          <line x1="12" y1="10" x2="12" y2="2" stroke="#1e40af" strokeWidth="2" />
          <circle cx="-12" cy="0" r="3" fill="#1e40af" opacity="0.6" />
          <circle cx="12" cy="0" r="3" fill="#1e40af" opacity="0.6" />
        </g>

        <g transform="translate(600, 130)">
          <rect x="0" y="30" width="22" height="90" rx="2" fill="#1d4ed8" opacity="0.25" />
          <rect x="3" y="35" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="10" y="35" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="3" y="45" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="10" y="45" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="3" y="55" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="10" y="55" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="3" y="65" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="10" y="65" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="3" y="75" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="10" y="75" width="5" height="6" rx="1" fill="#3b82f6" opacity="0.5" />

          <rect x="28" y="10" width="26" height="110" rx="2" fill="#1e40af" opacity="0.3" />
          <rect x="31" y="15" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="40" y="15" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="31" y="26" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="40" y="26" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="31" y="37" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="40" y="37" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="31" y="48" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="40" y="48" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="31" y="59" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="40" y="59" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="31" y="70" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="40" y="70" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="31" y="81" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />
          <rect x="40" y="81" width="6" height="7" rx="1" fill="#3b82f6" opacity="0.5" />

          <rect x="60" y="45" width="18" height="75" rx="2" fill="#1d4ed8" opacity="0.2" />
          <rect x="63" y="50" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="70" y="50" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="63" y="59" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="70" y="59" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="63" y="68" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="70" y="68" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="63" y="77" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="70" y="77" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />

          <rect x="84" y="65" width="16" height="55" rx="2" fill="#1e40af" opacity="0.2" />
          <rect x="87" y="70" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="94" y="70" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="87" y="79" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
          <rect x="94" y="79" width="4" height="5" rx="1" fill="#3b82f6" opacity="0.4" />
        </g>

        <g transform="translate(280, 195)">
          <rect x="-2" y="0" width="4" height="18" fill="#166534" />
          <circle cx="0" cy="-6" r="12" fill="#22c55e" opacity="0.6" />
          <circle cx="-6" cy="-2" r="8" fill="#16a34a" opacity="0.5" />
          <circle cx="6" cy="-2" r="9" fill="#22c55e" opacity="0.5" />
        </g>
        <g transform="translate(310, 200)">
          <rect x="-2" y="0" width="4" height="14" fill="#166534" />
          <circle cx="0" cy="-4" r="9" fill="#22c55e" opacity="0.5" />
          <circle cx="-5" cy="0" r="6" fill="#16a34a" opacity="0.4" />
        </g>
        <g transform="translate(680, 210)">
          <rect x="-2" y="0" width="4" height="16" fill="#166534" />
          <circle cx="0" cy="-5" r="10" fill="#22c55e" opacity="0.5" />
          <circle cx="-5" cy="-1" r="7" fill="#16a34a" opacity="0.4" />
          <circle cx="5" cy="-1" r="8" fill="#22c55e" opacity="0.4" />
        </g>

        <path
          d="M0 225 Q100 220 200 225 Q300 218 400 222 Q500 215 600 220 Q700 218 800 222"
          stroke="#16a34a"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />
        <rect x="0" y="225" width="800" height="75" fill="url(#groundGrad)" opacity="0.5" />
      </svg>
    </div>
  );
}

export default EnergyIllustration;
