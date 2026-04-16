import { inverseRotation, rotateCellAround } from './geometry';
import { hasLineOfSight } from './los';
import type { Cell, GameMap, RedirectionResult, Rotation } from './types';

function isInside(cell: Cell, map: GameMap): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height;
}

export function reverseSolve(
  source: Cell,
  target: Cell,
  rotation: Rotation,
  map: GameMap,
): RedirectionResult {
  const aim = rotateCellAround(source, target, inverseRotation(rotation));
  if (!isInside(aim, map)) return { kind: 'blocked', reason: 'out_of_map' };
  if (map.cells[aim.y][aim.x] === 'obstacle') return { kind: 'blocked', reason: 'no_solution' };
  if (!hasLineOfSight(source, aim, map)) return { kind: 'blocked', reason: 'los' };
  return { kind: 'ok', aimCell: aim, impactCell: target };
}
