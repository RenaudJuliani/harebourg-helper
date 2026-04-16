import { addRotations } from './geometry';
import type { HpRange, Rotation, TurnState } from './types';

export const BASE_CONFUSION: Record<HpRange, Rotation> = {
  r100_90: { degrees: 90, direction: 'cw' },
  r89_75: { degrees: 270, direction: 'ccw' },
  r74_45: { degrees: 180, direction: 'cw' },
  r44_30: { degrees: 90, direction: 'ccw' },
  r29_0: { degrees: 270, direction: 'cw' },
};

const HIT_INCREMENT: Rotation = { degrees: 90, direction: 'ccw' };
const MAX_HITS = 10;

export function computeConfusion(state: TurnState): Rotation {
  const base = BASE_CONFUSION[state.hpRange];
  const hits = Math.min(Math.max(state.meleeHits, 0), MAX_HITS);
  let result = base;
  for (let i = 0; i < hits; i++) {
    result = addRotations(result, HIT_INCREMENT);
  }
  return result;
}
