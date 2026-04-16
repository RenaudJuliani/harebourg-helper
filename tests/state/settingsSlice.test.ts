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
  it('defaults mode to combat', () => {
    expect(makeStore().getState().mode).toBe('combat');
  });

  it('toggles mode combat <-> edit', () => {
    const s = makeStore();
    s.getState().setMode('edit');
    expect(s.getState().mode).toBe('edit');
    s.getState().setMode('combat');
    expect(s.getState().mode).toBe('combat');
  });

  it('default shortcuts contain resetTurn', () => {
    const s = makeStore().getState();
    expect(s.settings.shortcuts.resetTurn).toBe(DEFAULT_SHORTCUTS.resetTurn);
  });

  it('updateShortcut overrides a single binding', () => {
    const s = makeStore();
    s.getState().updateShortcut('resetTurn', 'F5');
    expect(s.getState().settings.shortcuts.resetTurn).toBe('F5');
  });

  it('updateShortcut to null disables a binding', () => {
    const s = makeStore();
    s.getState().updateShortcut('resetTurn', null);
    expect(s.getState().settings.shortcuts.resetTurn).toBeNull();
  });

  it('resetShortcutsToDefault restores all bindings', () => {
    const s = makeStore();
    s.getState().updateShortcut('resetTurn', 'F5');
    s.getState().resetShortcutsToDefault();
    expect(s.getState().settings.shortcuts).toEqual(DEFAULT_SHORTCUTS);
  });
});
