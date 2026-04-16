import type { StateCreator } from 'zustand';
import type { Cell, HpRange, TurnState } from '../../core/types';

export type TurnSlice = {
  turn: TurnState;
  setHpRange: (range: HpRange) => void;
  setMeleeHits: (n: number) => void;
  setTargetCell: (cell: Cell | null) => void;
  resetTurn: () => void;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

export const createTurnSlice: StateCreator<TurnSlice, [], [], TurnSlice> = (set) => ({
  turn: { hpRange: 'r100_90', meleeHits: 0, targetCell: null },
  setHpRange: (range) => set((s) => ({ turn: { ...s.turn, hpRange: range } })),
  setMeleeHits: (n) => set((s) => ({ turn: { ...s.turn, meleeHits: clamp(n, 0, 10) } })),
  setTargetCell: (cell) => set((s) => ({ turn: { ...s.turn, targetCell: cell } })),
  resetTurn: () =>
    set((s) => ({ turn: { hpRange: s.turn.hpRange, meleeHits: 0, targetCell: null } })),
});
