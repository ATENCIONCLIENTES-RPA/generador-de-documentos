import { create } from 'zustand';
import type { Template } from '@/types/template';

interface TemplateStore {
  templates: Template[];
  selectedTemplate: Template | null;
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplate: (template: Template | null) => void;
  selectTemplate: (id: string) => void;
  addTemplate: (template: Template) => void;
  removeTemplate: (id: string) => void;
  clearTemplates: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  selectedTemplate: null,

  setTemplates: (templates) => set({ templates }),

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  selectTemplate: (id) =>
    set((s) => {
      const found = s.templates.find((t) => t.id === id) ?? null;
      return { selectedTemplate: found };
    }),

  addTemplate: (template) =>
    set((s) => ({
      templates: [...s.templates, template],
    })),

  removeTemplate: (id) =>
    set((s) => {
      const templates = s.templates.filter((t) => t.id !== id);
      const selectedTemplate = s.selectedTemplate?.id === id ? null : s.selectedTemplate;
      return { templates, selectedTemplate };
    }),

  clearTemplates: () => set({ templates: [], selectedTemplate: null }),
}));

if (typeof window !== 'undefined' && import.meta.env.DEV) (window as unknown as Record<string, unknown>).__templateStore = useTemplateStore;
