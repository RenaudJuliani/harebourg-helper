import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { type MapSlice, createMapSlice } from '../../src/state/slices/mapSlice';

function makeStore() {
  return create<MapSlice>()((...a) => ({ ...createMapSlice(...a) }));
}

describe('mapSlice', () => {
  it('initializes with the Harebourg preset', () => {
    const s = makeStore().getState();
    expect(s.map.id).toBe('harebourg-v2');
    expect(s.map.width).toBeGreaterThan(0);
  });

  it('setCellKind updates a cell', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 8, y: 5 }, 'obstacle');
    expect(s.getState().map.cells[5][8]).toBe('obstacle');
  });

  it('setCellKind ignores out-of-bounds', () => {
    const s = makeStore();
    const before = JSON.stringify(s.getState().map.cells);
    s.getState().setCellKind({ x: -1, y: 0 }, 'obstacle');
    expect(JSON.stringify(s.getState().map.cells)).toBe(before);
  });

  it('resetMapToDefault restores the preset', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 8, y: 5 }, 'obstacle');
    s.getState().resetMapToDefault();
    const original = s.getState().map.cells[5][8];
    expect(original).toBe('floor');
  });
});
