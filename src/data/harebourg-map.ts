import type { CellKind, GameMap } from '../core/types';

const W = 20;
const H = 20;

// Row widths define the oval playable area of the Harebourg arena.
// Floor cells are centered within the W-wide span; cells outside are
// 'obstacle' (non-walkable, outside the oval).
const ROW_WIDTHS = [
  4, 8, 12, 14, 16, 16, 18, 18, 20, 20, 20, 20, 18, 18, 16, 16, 14, 12, 8, 4,
] as const;

function build(): CellKind[][] {
  const grid: CellKind[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => 'obstacle' as CellKind),
  );

  for (let y = 0; y < H; y++) {
    const w = ROW_WIDTHS[y];
    const left = (W - w) / 2;
    for (let x = left; x < left + w; x++) {
      grid[y][x] = 'floor';
    }
  }

  const holes: ReadonlyArray<readonly [number, number]> = [
    [11, 2],
    [4, 8],
    [5, 8],
    [13, 11],
    [16, 11],
    [13, 12],
    [4, 14],
  ];
  for (const [x, y] of holes) grid[y][x] = 'hole';

  const obstacles: ReadonlyArray<readonly [number, number]> = [
    // 2x2 top
    [10, 0], [11, 0], [10, 1], [11, 1],
    // 2x3 mid-left
    [4, 5], [5, 5], [4, 6], [5, 6], [4, 7], [5, 7],
    // 2x2 center (blue pool)
    [9, 9], [10, 9], [9, 10], [10, 10],
    // 2x2 mid-right
    [14, 11], [15, 11], [14, 12], [15, 12],
    // 1x1 lower-left
    [3, 14],
    // 1x1 bottom-right edge
    [13, 18],
  ];
  for (const [x, y] of obstacles) grid[y][x] = 'obstacle';

  return grid;
}

export const HAREBOURG_MAP: GameMap = {
  id: 'harebourg-v2',
  name: 'Comte Harebourg',
  width: W,
  height: H,
  cells: build(),
};

export const DAMIER_ORIGIN_PARITY: 'light' | 'dark' = 'light';
