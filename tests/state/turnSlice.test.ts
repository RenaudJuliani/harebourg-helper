import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { type TurnSlice, createTurnSlice } from '../../src/state/slices/turnSlice';

function makeStore() {
  return create<TurnSlice>()((...a) => ({ ...createTurnSlice(...a) }));
}

describe('turnSlice', () => {
  it('defaults: r100_90, 0 hits, null target', () => {
    const s = makeStore().getState();
    expect(s.turn).toEqual({ hpRange: 'r100_90', meleeHits: 0, targetCell: null });
  });

  it('setHpRange updates', () => {
    const s = makeStore();
    s.getState().setHpRange('r74_45');
    expect(s.getState().turn.hpRange).toBe('r74_45');
  });

  it('setMeleeHits clamps to [0, 10]', () => {
    const s = makeStore();
    s.getState().setMeleeHits(-3);
    expect(s.getState().turn.meleeHits).toBe(0);
    s.getState().setMeleeHits(15);
    expect(s.getState().turn.meleeHits).toBe(10);
    s.getState().setMeleeHits(4);
    expect(s.getState().turn.meleeHits).toBe(4);
  });

  it('setTargetCell accepts cell or null', () => {
    const s = makeStore();
    s.getState().setTargetCell({ x: 3, y: 4 });
    expect(s.getState().turn.targetCell).toEqual({ x: 3, y: 4 });
    s.getState().setTargetCell(null);
    expect(s.getState().turn.targetCell).toBeNull();
  });

  it('resetTurn zeros meleeHits and clears target, keeps hpRange', () => {
    const s = makeStore();
    s.getState().setHpRange('r44_30');
    s.getState().setMeleeHits(5);
    s.getState().setTargetCell({ x: 1, y: 1 });
    s.getState().resetTurn();
    expect(s.getState().turn).toEqual({ hpRange: 'r44_30', meleeHits: 0, targetCell: null });
  });
});
