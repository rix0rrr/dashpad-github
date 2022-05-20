// Booh! This should be imported from a shared package

export interface DashboardState {
  readonly tabs: Tab[];
}

export type Tab = {
  readonly color: Color;
  readonly selectedColor?: Color;
} & TabType;

export type TabType = {
  readonly tabType: 'list';
  readonly buttons: Button[];
};

export interface Button {
  readonly color: Color;
  readonly link?: string;
}

export type Color =
  | { type: 'solid'; paletteColor: number }
  | { type: 'flash'; paletteColor: number }
  | { type: 'pulse'; paletteColor: number }
  | { type: 'rgb'; r: number; g: number; b: number };