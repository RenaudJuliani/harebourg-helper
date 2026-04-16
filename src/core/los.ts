import type { Cell, GameMap } from './types';

export function hasLineOfSight(a: Cell, b: Cell, map: GameMap): boolean {
  if (a.x === b.x && a.y === b.y) return true;

  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    if (!(x0 === a.x && y0 === a.y) && !(x0 === b.x && y0 === b.y)) {
      if (x0 < 0 || y0 < 0 || x0 >= map.width || y0 >= map.height) return false;
      if (map.cells[y0][x0] === 'obstacle') return false;
    }
    if (x0 === x1 && y0 === y1) return true;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
