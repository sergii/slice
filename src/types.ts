export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutNode {
  index: number;
  parentIndex: number;
  tagName: string;
  attributes: Record<string, string>;
  rect: Rect;
  styles: Record<string, string>;
  paintOrder: number;
  isVisible: boolean;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Issue {
  type: 'horizontal-overflow';
  selector: string;
  overflowPx: number;
  side: 'right' | 'left';
  bbox: [number, number, number, number];
  tagName: string;
}
