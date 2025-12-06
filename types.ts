export enum AssetType {
  MERCHANDISE = 'MERCHANDISE',
  MARKETING = 'MARKETING',
  DIGITAL = 'DIGITAL',
  VIDEO = 'VIDEO'
}

export interface BrandDNA {
  name: string;
  description: string;
  websiteUrl?: string;
  colors: string[];
  typography: string;
  visualEssence: string;
  designSystem: string;
  keywords: string[];
  logoImage?: string; // Base64 string of the logo
}

export interface Inspiration {
  id: string;
  imageUrl: string; // Base64
  description: string;
  extractedCues: string[]; // Cues extracted by Gemini
}

export interface GeneratedAsset {
  id: string;
  type: AssetType;
  subtype: string;
  url: string;
  promptUsed: string;
  createdAt: number;
  isDraft: boolean;
  baseImage?: string; // If this was edited from another image
}

export interface BrandState {
  dna: BrandDNA | null;
  inspirations: Inspiration[];
  assets: GeneratedAsset[];
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}