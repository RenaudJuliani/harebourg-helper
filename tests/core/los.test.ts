import { describe, expect, it } from 'vitest';
import { hasLineOfSight } from '../../src/core/los';
import type { GameMap } from '../../src/core/types';

function makeMap(
  w: number,
  h: number,
  obstacles: Array<[number, number]> = [],
  holes: Array<[number, number]> = [],
): GameMap {
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as const));
  const out: GameMap = { id: 't', name: 't', width: w, height: h, cells };
  for (const [x, y] of obstacles) out.cells[y][x] = 'obstacle';
  for (const [x, y] of holes) out.cells[y][x] = 'hole';
  return out;
}

describe('hasLineOfSight', () => {
  it('A == B is always true', () => {
    expect(hasLineOfSight({ x: 2, y: 2 }, { x: 2, y: 2 }, makeMap(5, 5))).toBe(true);
  });

  it('clear horizontal line', () => {
    expect(hasLineOfSight({ x: 0, y: 2 }, { x: 4, y: 2 }, makeMap(5, 5))).toBe(true);
  });

  it('obstacle on the line blocks', () => {
    const map = makeMap(5, 5, [[2, 2]]);
    expect(hasLineOfSight({ x: 0, y: 2 }, { x: 4, y: 2 }, map)).toBe(false);
  });

  it('hole on the line does NOT block', () => {
    const map = makeMap(5, 5, [], [[2, 2]]);
    expect(hasLineOfSight({ x: 0, y: 2 }, { x: 4, y: 2 }, map)).toBe(true);
  });

  it('obstacle outside the line does not block', () => {
    const map = makeMap(5, 5, [[3, 3]]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, map)).toBe(true);
  });

  it('diagonal clear', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 4 }, makeMap(5, 5))).toBe(true);
  });

  it('diagonal blocked by obstacle on the diagonal', () => {
    const map = makeMap(5, 5, [[2, 2]]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 4 }, map)).toBe(false);
  });

  it('source or destination being obstacle is fine (only traversed cells matter)', () => {
    const map = makeMap(5, 5, [
      [0, 0],
      [4, 4],
    ]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 4 }, map)).toBe(true);
  });
});
