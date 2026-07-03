import { FlyerElement, FlyerBackground } from './flyer-element.interface';

export interface FlyerTemplate {
  id?: number | null;
  nombre: string;
  descripcion: string;
  orientacion: 'portrait' | 'landscape';
  ancho: number;
  alto: number;
  thumbnail: string;
  categoria: string;
  config: FlyerTemplateConfig;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FlyerTemplateConfig {
  elements: FlyerElement[];
  background: FlyerBackground;
}

export interface FlyerSavedConfig {
  id?: number | null;
  circuito_id: number;
  plantilla_id: number | null;
  config: FlyerTemplateConfig;
  created_at?: string;
  updated_at?: string;
}
