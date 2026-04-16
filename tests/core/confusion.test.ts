import { describe, expect, it } from 'vitest';
import { BASE_CONFUSION, computeConfusion } from '../../src/core/confusion';
import type { HpRange, TurnState } from '../../src/core/types';

const make = (hpRange: HpRange, meleeHits: number): TurnState => ({
  hpRange,
  meleeHits,
  targetCell: null,
});

describe('computeConfusion', () => {
  it('returns base rotation at 0 melee hits', () => {
    expect(computeConfusion(make('r100_90', 0))).toEqual(BASE_CONFUSION.r100_90);
    expect(computeConfusion(make('r74_45', 0))).toEqual(BASE_CONFUSION.r74_45);
  });

  it('each melee hit adds 90° ccw', () => {
    // r100_90 base = cw 90. +1 ccw 90 = cw 0.
    expect(computeConfusion(make('r100_90', 1))).toEqual({ degrees: 0, direction: 'cw' });
    // +2 ccw = cw 270
    expect(computeConfusion(make('r100_90', 2))).toEqual({ degrees: 270, direction: 'cw' });
  });

  it('caps at 10 melee hits', () => {
    const at10 = computeConfusion(make('r74_45', 10));
    const at15 = computeConfusion(make('r74_45', 15));
    expect(at15).toEqual(at10);
  });

  it('negative hits clamp to 0', () => {
    expect(computeConfusion(make('r100_90', -3))).toEqual(BASE_CONFUSION.r100_90);
  });

  it('full table × 0..10 hits is a total function (no throws)', () => {
    const ranges: HpRange[] = ['r100_90', 'r89_75', 'r74_45', 'r44_30', 'r29_0'];
    for (const r of ranges) {
      for (let h = 0; h <= 10; h++) {
        const result = computeConfusion(make(r, h));
        expect([0, 90, 180, 270]).toContain(result.degrees);
      }
    }
  });
});
