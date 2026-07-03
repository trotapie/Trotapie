export type FlyerElementType = 'text' | 'image' | 'rectangle' | 'circle' | 'line' | 'price' | 'qr' | 'icon';

export interface FlyerElement {
  id: string;
  type: FlyerElementType;
  fabricConfig: Record<string, any>;
  locked?: boolean;
  visible?: boolean;
}

export interface FlyerBackground {
  type: 'color' | 'image' | 'gradient';
  value: string;
}
