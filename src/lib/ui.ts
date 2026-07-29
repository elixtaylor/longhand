/** Shared UI types + theme metadata for the settings panel. */

export type ThemeId = 'mono' | 'editorial' | 'notebook' | 'warm';
export type RevealMode = 'all' | 'step';
export type TextSize = 'sm' | 'md' | 'lg';
export type DisplayMode = 'exact' | 'decimal';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  note: string;
  swatch: { bg: string; accent: string; ink: string };
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'mono',
    name: 'Mono',
    note: 'Black and white',
    swatch: { bg: '#f4f4f2', accent: '#111111', ink: '#111111' },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    note: 'Clean textbook',
    swatch: { bg: '#f7f5ef', accent: '#14594f', ink: '#211d17' },
  },
  {
    id: 'notebook',
    name: 'Notebook',
    note: 'Squared paper',
    swatch: { bg: '#e9eef4', accent: '#26467e', ink: '#17233f' },
  },
  {
    id: 'warm',
    name: 'Warm',
    note: 'Study app',
    swatch: { bg: '#fbf4ea', accent: '#2f7d63', ink: '#2c2823' },
  },
];
