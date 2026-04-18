import { computeConfusion } from '../core/confusion';
import { forwardRedirection } from '../core/redirection';
import { reverseSolve } from '../core/solver';
import type { Cell, Entity, RedirectionResult, Rotation } from '../core/types';
import type { AppStore } from './store';

export const selectMe = (s: AppStore): Entity | undefined =>
  s.entities.find((e) => e.kind === 'me');

export const selectHarebourg = (s: AppStore): Entity | undefined =>
  s.entities.find((e) => e.kind === 'harebourg');

export const selectConfusion = (s: AppStore): Rotation => computeConfusion(s.turn);

export function selectReverseResult(s: AppStore): RedirectionResult | null {
  const me = selectMe(s);
  const target = s.turn.targetCell;
  if (!me || !target) return null;
  return reverseSolve(me.cell, target, selectConfusion(s), s.map);
}

export function selectHoverForward(hover: Cell | null) {
  return (s: AppStore): RedirectionResult | null => {
    const me = selectMe(s);
    if (!me || !hover) return null;
    return forwardRedirection(me.cell, hover, selectConfusion(s), s.map);
  };
}
