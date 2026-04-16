import type { CellKind, GameMap } from '../core/types';

const W = 15;
const H = 17;

function build(): CellKind[][] {
  const grid: CellKind[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return 'obstacle';
      return 'floor';
    }),
  );
  const holes: Array<[number, number]> = [
    [3, 4],
    [4, 4],
    [10, 4],
    [11, 4],
    [3, 12],
    [4, 12],
    [10, 12],
    [11, 12],
  ];
  for (const [x, y] of holes) grid[y][x] = 'hole';
  return grid;
}

export const HAREBOURG_MAP: GameMap = {
  id: 'harebourg-v1',
  name: 'Comte Harebourg',
  width: W,
  height: H,
  cells: build(),
};
