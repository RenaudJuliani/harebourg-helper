import type { Cell } from '../../core/types';

export const TILE_W = 64;
export const TILE_H = 32;

export function cartesianToIso(c: Cell): { px: number; py: number } {
  return {
    px: (c.x - c.y) * (TILE_W / 2),
    py: (c.x + c.y) * (TILE_H / 2),
  };
}

export function isoToCartesian(px: number, py: number): Cell {
  const fx = px / (TILE_W / 2);
  const fy = py / (TILE_H / 2);
  const x = Math.round((fx + fy) / 2);
  const y = Math.round((fy - fx) / 2);
  return { x, y };
}
