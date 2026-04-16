import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import {
  DEFAULT_SHORTCUTS,
  type SettingsSlice,
  createSettingsSlice,
} from '../../src/state/slices/settingsSlice';

function makeStore() {
  return create<SettingsSlice>()((...a) => ({ ...createSettingsSlice(...a) }));
}

describe('settingsSlice', () => {
  it('defaults: combat mode, always-on-top off, default shortcuts', () => {
    const s = makeStore().getState();
    expect(s.settings.mode).toBe('combat');
    expect(s.settings.alwaysOnTop).toBe(false);
    expect(s.settings.shortcuts).toEqual(DEFAULT_SHORTCUTS);
  });

  it('setMode toggles', () => {
    const s = makeStore();
    s.getState().setMode('edit');
    expect(s.getState().settings.mode).toBe('edit');
  });

  it('setShortcut rebinds a single action', () => {
    const s = makeStore();
    s.getState().setShortcut('resetTurn', 'CmdOrCtrl+Shift+R');
    expect(s.getState().settings.shortcuts.resetTurn).toBe('CmdOrCtrl+Shift+R');
  });

  it('setAlwaysOnTop toggles', () => {
    const s = makeStore();
    s.getState().setAlwaysOnTop(true);
    expect(s.getState().settings.alwaysOnTop).toBe(true);
  });
});
