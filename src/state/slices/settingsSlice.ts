import type { StateCreator } from 'zustand';
import type { AppMode } from '../../core/types';

export type ShortcutAction =
  | 'resetTurn'
  | 'toggleMode'
  | 'swapPositions'
  | 'cycleHpRangeDown'
  | 'incrementMeleeHits'
  | 'decrementMeleeHits';

export type Shortcuts = Record<ShortcutAction, string>;

export const DEFAULT_SHORTCUTS: Shortcuts = {
  resetTurn: 'CmdOrCtrl+R',
  toggleMode: 'CmdOrCtrl+E',
  swapPositions: 'CmdOrCtrl+S',
  cycleHpRangeDown: 'CmdOrCtrl+Down',
  incrementMeleeHits: 'CmdOrCtrl+H',
  decrementMeleeHits: 'CmdOrCtrl+Shift+H',
};

export type Settings = {
  mode: AppMode;
  alwaysOnTop: boolean;
  shortcuts: Shortcuts;
};

export type SettingsSlice = {
  settings: Settings;
  setMode: (mode: AppMode) => void;
  setAlwaysOnTop: (on: boolean) => void;
  setShortcut: (action: ShortcutAction, accelerator: string) => void;
};

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  settings: { mode: 'combat', alwaysOnTop: false, shortcuts: { ...DEFAULT_SHORTCUTS } },
  setMode: (mode) => set((s) => ({ settings: { ...s.settings, mode } })),
  setAlwaysOnTop: (on) => set((s) => ({ settings: { ...s.settings, alwaysOnTop: on } })),
  setShortcut: (action, accelerator) =>
    set((s) => ({
      settings: { ...s.settings, shortcuts: { ...s.settings.shortcuts, [action]: accelerator } },
    })),
});
