import { useMemo, useState } from 'react';
import type { Cell } from '../../core/types';
import { useAppStore } from '../../state/store';
import { EntityLayer } from './EntityLayer';
import { MapLayer } from './MapLayer';
import { OverlayLayer } from './OverlayLayer';
import { TILE_H, TILE_W, cartesianToIso } from './iso';

export function GridView() {
  const map = useAppStore((s) => s.map);
  const mode = useAppStore((s) => s.mode);
  const placeEntity = useAppStore((s) => s.placeEntity);
  const setTargetCell = useAppStore((s) => s.setTargetCell);
  const setCellKind = useAppStore((s) => s.setCellKind);
  const [hover, setHover] = useState<Cell | null>(null);

  const { viewBox } = useMemo(() => {
    const corners = [
      cartesianToIso({ x: 0, y: 0 }),
      cartesianToIso({ x: map.width - 1, y: 0 }),
      cartesianToIso({ x: 0, y: map.height - 1 }),
      cartesianToIso({ x: map.width - 1, y: map.height - 1 }),
    ];
    const minX = Math.min(...corners.map((c) => c.px)) - TILE_W;
    const maxX = Math.max(...corners.map((c) => c.px)) + TILE_W;
    const minY = Math.min(...corners.map((c) => c.py)) - TILE_H;
    const maxY = Math.max(...corners.map((c) => c.py)) + TILE_H;
    return {
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    };
  }, [map.width, map.height]);

  const onCellClick = (cell: Cell, e: React.MouseEvent) => {
    if (mode === 'edit') {
      const current = map.cells[cell.y][cell.x];
      setCellKind(cell, current === 'obstacle' ? 'floor' : 'obstacle');
    } else if (e.shiftKey) {
      placeEntity('meStart', cell);
    } else {
      placeEntity('me', cell);
    }
  };
  const onCellRightClick = (cell: Cell) => {
    if (mode === 'edit') {
      const current = map.cells[cell.y][cell.x];
      setCellKind(cell, current === 'hole' ? 'floor' : 'hole');
    } else {
      setTargetCell(cell);
    }
  };

  return (
    <svg viewBox={viewBox} width="100%" height="100%" style={{ display: 'block' }}>
      <MapLayer
        onCellClick={onCellClick}
        onCellRightClick={onCellRightClick}
        onCellHover={setHover}
      />
      <EntityLayer />
      <OverlayLayer />
      <title>{hover ? `(${hover.x}, ${hover.y})` : ''}</title>
    </svg>
  );
}
