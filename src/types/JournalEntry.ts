export type CipherType = 'none' | 'caesar' | 'vigenere' | 'atbash' | 'rot13' | 'substitution' | 'pigpen';

export type EncryptionMethod = 'AES-256-CTR' | 'AES-256-CBC';

export interface CipherMetadata {
  type: CipherType;
  key: string | number;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  encrypted: boolean;
  encryptionMethod?: string;
  cipher?: CipherMetadata | null;
  tags?: string[];
}

export interface SymbolImage {
  id: string;
  name: string;
  data: Blob;
  mimeType: string;
  uploadedAt: number;
}

export interface GlyphMapping {
  id: string;
  symbolId: string;
  character: string;
}

export interface FontEntry {
  id: string;
  name: string;
  data: Blob;
  mappings: GlyphMapping[];
  createdAt: number;
}
