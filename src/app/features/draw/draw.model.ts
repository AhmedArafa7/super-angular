export type ToolType = 
  | 'pencil' 
  | 'brush' 
  | 'eraser' 
  | 'bucket' 
  | 'line' 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'triangle' 
  | 'star' 
  | 'arrow' 
  | 'text' 
  | 'select';

export type CanvasBackground = 
  | 'white' 
  | 'dark' 
  | 'grid' 
  | 'dots' 
  | 'isometric' 
  | 'parchment' 
  | 'transparent';

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface SavedLayerData {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  dataUrl: string;
}

export interface DrawProject {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  background: CanvasBackground;
  thumbnail: string;
  layers: SavedLayerData[];
}

export interface BrushSettings {
  size: number;
  opacity: number; // 0 to 1
  color: string;
  fillColor: string;
  isFilled: boolean;
  fontSize: number;
  fontFamily: string;
  smoothing: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export const COLOR_PALETTES = [
  {
    name: 'المظهر العصري (Modern)',
    colors: ['#000000', '#ffffff', '#6366f1', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  },
  {
    name: 'ألوان النيون (Neon)',
    colors: ['#00ffcc', '#ff007f', '#7928ca', '#ff0080', '#0070f3', '#f5a623', '#50e3c2', '#b800ff']
  },
  {
    name: 'باستيل ناعم (Pastel)',
    colors: ['#fbcfe8', '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fed7aa', '#f5d0fe', '#c7d2fe']
  },
  {
    name: 'طبيعي ترابي (Earth)',
    colors: ['#2d3748', '#744210', '#975a16', '#b7791f', '#d69e2e', '#2f855a', '#2b6cb0', '#4a5568']
  }
];
