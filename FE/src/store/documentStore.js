import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const initialState = {
  documents: [],
  fields: [],
  fieldValues: [],
  selectedField: null,
  activePageNumber: 1,
  zoom: 1,
  mode: 'design',
};

export const useDocumentStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      setDocument: (document) => set({ documents: [document] }),
      setZoom: (zoom) => set({ zoom: Math.min(2.5, Math.max(0.5, zoom)) }),
      setMode: (mode) => set({ mode }),
      setActivePageNumber: (activePageNumber) => set({ activePageNumber }),
      setSelectedField: (selectedField) => set({ selectedField }),
      addField: (field) => {
        const activePageNumber = get().activePageNumber || 1;
        const nextField = {
          id: field?.id || createId(),
          pageNumber: field?.pageNumber || activePageNumber,
          x: field?.x ?? 0.1,
          y: field?.y ?? 0.1,
          width: field?.width ?? 0.28,
          height: field?.height ?? 0.06,
          placeholder: field?.placeholder || 'Text field',
          type: field?.type || 'text',
          questionId: field?.questionId || null,
          questionNumber: field?.questionNumber || null,
          options: Array.isArray(field?.options) ? field.options : [],
          required: Boolean(field?.required),
        };
        set((state) => ({ fields: [...state.fields, nextField], selectedField: nextField.id }));
        return nextField;
      },
      removeField: (fieldId) =>
        set((state) => ({
          fields: state.fields.filter((field) => field.id !== fieldId),
          fieldValues: state.fieldValues.filter((value) => value.fieldId !== fieldId),
          selectedField: state.selectedField === fieldId ? null : state.selectedField,
        })),
      updateFieldPosition: (fieldId, patch) =>
        set((state) => ({
          fields: state.fields.map((field) =>
            field.id === fieldId ? { ...field, ...patch } : field
          ),
        })),
      updateFieldSize: (fieldId, patch) =>
        set((state) => ({
          fields: state.fields.map((field) =>
            field.id === fieldId ? { ...field, ...patch } : field
          ),
        })),
      updateFieldValue: (fieldId, value) =>
        set((state) => {
          const existing = state.fieldValues.find((item) => item.fieldId === fieldId);
          if (existing) {
            return {
              fieldValues: state.fieldValues.map((item) =>
                item.fieldId === fieldId ? { ...item, value } : item
              ),
            };
          }
          return { fieldValues: [...state.fieldValues, { fieldId, value }] };
        }),
      setFieldValues: (fieldValues) => set({ fieldValues }),
      replaceFields: (fields) => set({ fields }),
      saveTemplate: () => {
        const snapshot = {
          documents: get().documents,
          fields: get().fields,
          fieldValues: get().fieldValues,
          activePageNumber: get().activePageNumber,
          zoom: get().zoom,
          savedAt: Date.now(),
        };
        localStorage.setItem('pdf-form-designer-template', JSON.stringify(snapshot));
        return snapshot;
      },
      loadTemplate: () => {
        const raw = localStorage.getItem('pdf-form-designer-template');
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          set({
            documents: parsed.documents || [],
            fields: parsed.fields || [],
            fieldValues: parsed.fieldValues || [],
            activePageNumber: parsed.activePageNumber || 1,
            zoom: parsed.zoom || 1,
          });
          return parsed;
        } catch {
          return null;
        }
      },
      resetDesigner: () => set(initialState),
    }),
    {
      name: 'pdf-form-designer-store',
      partialize: (state) => ({
        documents: state.documents,
        fields: state.fields,
        fieldValues: state.fieldValues,
        activePageNumber: state.activePageNumber,
        zoom: state.zoom,
        mode: state.mode,
      }),
    }
  )
);
