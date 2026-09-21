export interface Profile {
  name: string;
  position?: string;
  email?: string;
  signatureUrl?: string | null;
  /** Escala de la firma en % respecto al tamaño predeterminado (100 = 5×2 cm). */
  signatureScale?: number;
}
