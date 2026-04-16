import type { Cell, Rotation } from './types';

function toCwDegrees(r: Rotation): number {
  return r.direction === 'cw' ? r.degrees : (360 - r.degrees) % 360;
}

export function rotateCellAround(pivot: Cell, target: Cell, rotation: Rotation): Cell {
  const deg = toCwDegrees(rotation);
  const dx = target.x - pivot.x;
  const dy = target.y - pivot.y;
  let nx: number;
  let ny: number;
  switch (deg) {
    case 0:
      nx = dx;
      ny = dy;
      break;
    case 90:
      nx = -dy;
      ny = dx;
      break;
    case 180:
      nx = -dx;
      ny = -dy;
      break;
    case 270:
      nx = dy;
      ny = -dx;
      break;
    default:
      nx = dx;
      ny = dy;
  }
  return { x: pivot.x + nx, y: pivot.y + ny };
}

export function inverseRotation(r: Rotation): Rotation {
  return { degrees: r.degrees, direction: r.direction === 'cw' ? 'ccw' : 'cw' };
}

export function addRotations(a: Rotation, b: Rotation): Rotation {
  const total = (toCwDegrees(a) + toCwDegrees(b)) % 360;
  return { degrees: total as 0 | 90 | 180 | 270, direction: 'cw' };
}
