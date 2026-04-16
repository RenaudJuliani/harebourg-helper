import { memo } from 'react';
import type { CellKind } from '../../core/types';
import { theme } from '../theme';
import { TILE_H, TILE_W } from './iso';

type Props = {
  px: number;
  py: number;
  kind: CellKind;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
};

function fillFor(kind: CellKind): string {
  switch (kind) {
    case 'floor':
      return theme.floor;
    case 'hole':
      return theme.hole;
    case 'obstacle':
      return theme.obstacle;
  }
}

function CellImpl({ px, py, kind, onClick, onContextMenu, onMouseEnter }: Props) {
  const hx = TILE_W / 2;
  const hy = TILE_H / 2;
  const points = `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
  const blocking = kind !== 'floor';
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: SVG grid tile, non-focusable by design
    <polygon
      points={points}
      fill={fillFor(kind)}
      stroke={theme.floorEdge}
      strokeWidth={1}
      style={{ cursor: blocking ? 'not-allowed' : 'pointer' }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
    />
  );
}

export const Cell = memo(CellImpl);
