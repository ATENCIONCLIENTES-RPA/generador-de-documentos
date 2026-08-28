import { create } from 'zustand';

export type StepId = 'inicio' | 'perfil' | 'configuracion' | 'datos' | 'plantillas' | 'generacion';

interface NavigationStore {
  currentStep: StepId;
  completed: Set<StepId>;
  goTo: (step: StepId) => void;
  complete: (step: StepId) => void;
  reset: () => void;
  isCompleted: (step: StepId) => boolean;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  currentStep: 'inicio',
  completed: new Set<StepId>(),

  goTo: (step) => set({ currentStep: step }),

  complete: (step) =>
    set((s) => {
      const next = new Set(s.completed);
      next.add(step);
      return { completed: next };
    }),

  reset: () => set({ currentStep: 'inicio', completed: new Set<StepId>() }),

  isCompleted: (step) => get().completed.has(step),
}));
