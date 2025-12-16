
export type BackgroundType = 'pure_white' | 'neutral_gray' | 'themed' | 'automatic';
export type LightingStyle = 'soft' | 'sharp';
export type AspectRatio = '1:1' | '4:5' | '16:9';
export type ProductView = 'original' | 'enhanced';

export interface GenerationConfig {
  backgroundType: BackgroundType;
  backgroundKeywords: string;
  lightingStyle: LightingStyle;
  aspectRatio: AspectRatio;
  productView: ProductView;
  addReflection: boolean;
  separateProducts: boolean;
  productSeparation: number;
  backgroundBlur: number;
}

export interface UploadedFile {
  base64: string;
  name: string;
  type: string;
}

export interface Preset {
  name: string;
  config: GenerationConfig;
}
