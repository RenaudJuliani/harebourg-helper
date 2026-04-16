import { rotateCellAround } from './geometry';
import { hasLineOfSight } from './los';
import type { Cell, GameMap, RedirectionResult, Rotation } from './types';

function isInside(cell: Cell, map: GameMap): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height;
}

export function forwardRedirection(
  source: Cell,
  aim: Cell,
  rotation: Rotation,
  map: GameMap,
): RedirectionResult {
  if (!isInside(aim, map)) return { kind: 'blocked', reason: 'out_of_map' };
  if (!hasLineOfSight(source, aim, map)) return { kind: 'blocked', reason: 'los' };

  const impact = rotateCellAround(source, aim, rotation);
  if (!isInside(impact, map)) return { kind: 'blocked', reason: 'out_of_map' };
  if (map.cells[impact.y][impact.x] === 'obstacle')
    return { kind: 'blocked', reason: 'no_solution' };

  return { kind: 'ok', aimCell: aim, impactCell: impact };
}
