export interface Variable {
  key: string;
  label: string;
  type: string;
  source: string;
}

export interface Template {
  id: string;
  title: string;
  category?: string;
  description?: string;
  fileName: string;
  variables: Variable[];
  sampleContent?: string;
  file?: File;
}

export interface DocxGenerationResult {
  id: string;
  recordId?: string;
  templateId?: string;
  fileName: string;
  status: 'pending' | 'success' | 'error';
  blob?: Blob;
  error?: string;
}
