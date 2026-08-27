import React from 'react';
import { Check } from 'lucide-react';
import { StepId } from '../types';

interface StepperBarProps {
  currentStep: StepId;
  onSelectStep: (step: StepId) => void;
}

export const StepperBar: React.FC<StepperBarProps> = ({ currentStep, onSelectStep }) => {
  const steps: { id: StepId; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'perfil', label: 'Perfil de trabajo' },
    { id: 'configuracion', label: 'Configuración' },
    { id: 'datos', label: 'Datos del documento' },
    { id: 'plantillas', label: 'Galería de plantillas' },
    { id: 'generacion', label: 'Generación' },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full bg-[#002f6c] text-white py-3 px-6 shadow-inner hidden md:block">
      <div className="max-w-5xl mx-auto flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-blue-400/40 z-0" />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-blue-400 text-[#002f6c] ring-2 ring-blue-300'
                    : isCurrent
                    ? 'bg-white text-[#002f6c] ring-4 ring-blue-300/40 scale-110'
                    : 'bg-[#003d8a] text-blue-200 border border-blue-400/50'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
              </div>
              <span
                className={`text-[11px] mt-1 font-medium transition-colors ${
                  isCurrent
                    ? 'text-white font-bold underline underline-offset-4 decoration-2 decoration-blue-300'
                    : isCompleted
                    ? 'text-blue-100'
                    : 'text-blue-300/70 group-hover:text-blue-100'
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
