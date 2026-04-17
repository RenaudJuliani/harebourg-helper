import type { StateCreator } from 'zustand';
import type { AppMode } from '../../core/types';

export type ShortcutAction =
  | 'resetTurn'
  | 'toggleMode'
  | 'swapPositions'
  | 'cycleHpRangeDown'
  | 'incrementMeleeHits'
  | 'decrementMeleeHits';

export type ShortcutBindings = Record<ShortcutAction, string | null>;

export const DEFAULT_SHORTCUTS: ShortcutBindings = {
  resetTurn: 'r',
  toggleMode: 'e',
  swapPositions: 's',
  cycleHpRangeDown: 'd',
  incrementMeleeHits: 'z',
  decrementMeleeHits: 'x',
};

export type AppSettings = {
  shortcuts: ShortcutBindings;
  alwaysOnTop: boolean;
};

export type SettingsSlice = {
  mode: AppMode;
  settings: AppSettings;
  setMode: (mode: AppMode) => void;
  updateShortcut: (action: ShortcutAction, binding: string | null) => void;
  resetShortcutsToDefault: () => void;
  setAlwaysOnTop: (v: boolean) => void;
};

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  mode: 'combat',
  settings: { shortcuts: { ...DEFAULT_SHORTCUTS }, alwaysOnTop: false },
  setMode: (mode) => set({ mode }),
  updateShortcut: (action, binding) =>
    set((s) => ({
      settings: { ...s.settings, shortcuts: { ...s.settings.shortcuts, [action]: binding } },
    })),
  resetShortcutsToDefault: () =>
    set((s) => ({ settings: { ...s.settings, shortcuts: { ...DEFAULT_SHORTCUTS } } })),
  setAlwaysOnTop: (v) => set((s) => ({ settings: { ...s.settings, alwaysOnTop: v } })),
});
