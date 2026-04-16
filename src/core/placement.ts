import type { Cell, GameMap } from './types';

export function canPlaceEntity(cell: Cell, map: GameMap): boolean {
  if (cell.x < 0 || cell.y < 0 || cell.x >= map.width || cell.y >= map.height) return false;
  return map.cells[cell.y][cell.x] === 'floor';
}
