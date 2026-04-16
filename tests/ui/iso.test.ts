import { describe, expect, it } from 'vitest';
import { TILE_H, TILE_W, cartesianToIso, isoToCartesian } from '../../src/ui/grid/iso';

describe('iso projection', () => {
  it('origin maps to (0, 0)', () => {
    expect(cartesianToIso({ x: 0, y: 0 })).toEqual({ px: 0, py: 0 });
  });

  it('round-trips', () => {
    const c = { x: 4, y: 3 };
    const p = cartesianToIso(c);
    expect(isoToCartesian(p.px, p.py)).toEqual(c);
  });

  it('moving +x goes right and down by half tile', () => {
    const a = cartesianToIso({ x: 0, y: 0 });
    const b = cartesianToIso({ x: 1, y: 0 });
    expect(b.px - a.px).toBe(TILE_W / 2);
    expect(b.py - a.py).toBe(TILE_H / 2);
  });
});
