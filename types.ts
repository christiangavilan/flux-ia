
export type BackgroundType = 'pure_white' | 'neutral_gray' | 'themed' | 'automatic';
export type LightingStyle = 'sharp' | 'soft';
export type AspectRatio = '1:1' | '4:5' | '16:9';
export type OutputSize = '2k' | '4k';
export type ProductView = 'original' | 'enhanced';

export interface GenerationConfig {
  backgroundType: BackgroundType;
  backgroundKeywords: string;
  lightingStyle: LightingStyle;
  aspectRatio: AspectRatio;
  outputSize: OutputSize;
  productView: ProductView;
}

// FIX: Add Preset type.
export interface Preset {
  name: string;
  config: GenerationConfig;
}

export interface UploadedFile {
  base64: string;
  name: string;
  type: string;
}