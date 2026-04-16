import { describe, expect, it } from 'vitest';
import { forwardRedirection } from '../../src/core/redirection';
import { reverseSolve } from '../../src/core/solver';
import type { GameMap, Rotation } from '../../src/core/types';

function makeMap(w: number, h: number, obstacles: Array<[number, number]> = []): GameMap {
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => 'floor' as const));
  const m: GameMap = { id: 't', name: 't', width: w, height: h, cells };
  for (const [x, y] of obstacles) m.cells[y][x] = 'obstacle';
  return m;
}

const cw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'cw' });

describe('reverseSolve', () => {
  it('identity rotation: aim == target', () => {
    const r = reverseSolve({ x: 2, y: 2 }, { x: 4, y: 2 }, cw(0), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 4, y: 2 } });
  });

  it('cw 90°: to hit target (2,4) from (2,2), click (4,2)', () => {
    const r = reverseSolve({ x: 2, y: 2 }, { x: 2, y: 4 }, cw(90), makeMap(10, 10));
    expect(r).toEqual({ kind: 'ok', aimCell: { x: 4, y: 2 }, impactCell: { x: 2, y: 4 } });
  });

  it('aim out of map returns out_of_map', () => {
    const r = reverseSolve({ x: 0, y: 0 }, { x: 0, y: 2 }, cw(90), makeMap(10, 10));
    // aim = rotate target by inverse cw 90 = ccw 90 around source. target (0,2), source (0,0). ccw 90: (dx,dy)->(dy,-dx). (0,2) -> (2,0). aim=(2,0). In map.
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.aimCell).toEqual({ x: 2, y: 0 });
  });

  it('LOS blocked to aim returns los', () => {
    const map = makeMap(10, 10, [[3, 2]]);
    // source (2,2), target (2,4), rot cw 90 -> aim (4,2). LOS (2,2)->(4,2) crosses (3,2) which is obstacle.
    const r = reverseSolve({ x: 2, y: 2 }, { x: 2, y: 4 }, cw(90), map);
    expect(r).toEqual({ kind: 'blocked', reason: 'los' });
  });

  it('reverseSolve is inverse of forward', () => {
    const map = makeMap(10, 10);
    const source = { x: 2, y: 2 };
    const aim = { x: 5, y: 3 };
    const rot = cw(90);
    const fwd = forwardRedirection(source, aim, rot, map);
    expect(fwd.kind).toBe('ok');
    if (fwd.kind !== 'ok') return;
    const rev = reverseSolve(source, fwd.impactCell, rot, map);
    expect(rev).toEqual({ kind: 'ok', aimCell: aim, impactCell: fwd.impactCell });
  });
});
