import { memo } from 'react';
import { DAMIER_ORIGIN_PARITY } from '../../data/harebourg-map';
import type { CellKind } from '../../core/types';
import { theme } from '../theme';
import { TILE_H, TILE_W } from './iso';

type Props = {
  px: number;
  py: number;
  x: number;
  y: number;
  kind: CellKind;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
};

function fillFor(kind: CellKind, x: number, y: number): string {
  if (kind === 'hole') return theme.hole;
  if (kind === 'obstacle') return theme.obstacle;
  const evenParity = (x + y) % 2 === 0;
  const isLight = evenParity === (DAMIER_ORIGIN_PARITY === 'light');
  return isLight ? theme.floorLight : theme.floorDark;
}

function CellImpl({ px, py, x, y, kind, onClick, onContextMenu, onMouseDown, onMouseEnter }: Props) {
  const hx = TILE_W / 2;
  const hy = TILE_H / 2;
  const points = `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
  const blocking = kind !== 'floor';
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: SVG grid tile, non-focusable by design
    <polygon
      points={points}
      fill={fillFor(kind, x, y)}
      stroke={theme.floorEdge}
      strokeWidth={1}
      style={{ cursor: blocking ? 'not-allowed' : 'pointer' }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
    />
  );
}

export const Cell = memo(CellImpl);
