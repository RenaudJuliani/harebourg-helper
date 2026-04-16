import { describe, expect, it } from 'vitest';
import { forwardRedirection } from '../../src/core/redirection';
import type { GameMap, Rotation } from '../../src/core/types';

function makeMap(w: number, h: number, obstacles: Array<[number, number]> = []): GameMap {
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as const));
  const m: GameMap = { id: 't', name: 't', width: w, height: h, cells };
  for (const [x, y] of obstacles) m.cells[y][x] = 'obstacle';
  return m;
}

const cw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'cw' });

describe('forwardRedirection', () => {
  it('identity rotation yields aim == impact', () => {
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(0), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 4, y: 2 } });
  });

  it('cw 90° around source (2,2): aim (4,2) -> impact (2,4)', () => {
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(90), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 2, y: 4 } });
  });

  it('impact out of map is blocked (out_of_map)', () => {
    const r = forwardRedirection({ x: 0, y: 0 }, { x: 2, y: 0 }, cw(180), makeMap(10, 10));
    expect(r).toEqual({ kind: 'blocked', reason: 'out_of_map' });
  });

  it('LOS blocked returns los', () => {
    const map = makeMap(10, 10, [[3, 2]]);
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 5, y: 2 }, cw(0), map);
    expect(r).toEqual({ kind: 'blocked', reason: 'los' });
  });

  it('impact on obstacle returns no_solution', () => {
    const map = makeMap(10, 10, [[2, 4]]);
    const r = forwardRedirection({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(90), map);
    expect(r).toEqual({ kind: 'blocked', reason: 'no_solution' });
  });
});
