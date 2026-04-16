import { describe, expect, it } from 'vitest';
import { canPlaceEntity } from '../../src/core/placement';
import type { GameMap } from '../../src/core/types';

const map: GameMap = {
  id: 't',
  name: 't',
  width: 3,
  height: 3,
  cells: [
    ['floor', 'hole', 'obstacle'],
    ['floor', 'floor', 'floor'],
    ['floor', 'floor', 'floor'],
  ],
};

describe('canPlaceEntity', () => {
  it('allows floor', () => {
    expect(canPlaceEntity({ x: 0, y: 0 }, map)).toBe(true);
  });
  it('rejects hole', () => {
    expect(canPlaceEntity({ x: 1, y: 0 }, map)).toBe(false);
  });
  it('rejects obstacle', () => {
    expect(canPlaceEntity({ x: 2, y: 0 }, map)).toBe(false);
  });
  it('rejects out of bounds', () => {
    expect(canPlaceEntity({ x: -1, y: 0 }, map)).toBe(false);
    expect(canPlaceEntity({ x: 3, y: 0 }, map)).toBe(false);
  });
});
