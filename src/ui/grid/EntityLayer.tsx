import { memo } from 'react';
import type { Cell, Entity, EntityKind } from '../../core/types';
import { useAppStore } from '../../state/store';
import { theme } from '../theme';
import { TILE_H, TILE_W, cartesianToIso } from './iso';

function outlineColorForConfidence(conf: number): string | null {
  if (conf >= 0.8) return null;
  if (conf >= 0.5) return '#f5c518';
  return '#d93636';
}

const ConfidenceOutline = memo(function ConfidenceOutline({
  cell,
  confidence,
}: {
  cell: Cell;
  confidence: number;
}) {
  const color = outlineColorForConfidence(confidence);
  if (!color) return null;
  const { px, py } = cartesianToIso(cell);
  const hx = TILE_W / 2 + 2;
  const hy = TILE_H / 2 + 2;
  const points = `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
  return (
    <g pointerEvents="none">
      <polygon
        points={points}
        fill="transparent"
        stroke={color}
        strokeWidth={3}
        strokeDasharray="4 2"
      />
      {confidence < 0.5 && (
        <text
          x={px}
          y={py - hy - 4}
          fill="#d93636"
          fontSize={18}
          fontWeight={700}
          textAnchor="middle"
        >
          ?
        </text>
      )}
    </g>
  );
});

function colorFor(kind: EntityKind): string {
  switch (kind) {
    case 'me':
      return theme.me;
    case 'harebourg':
      return theme.harebourg;
    case 'ally':
      return theme.ally;
    case 'enemy':
      return theme.enemy;
  }
}

function labelFor(kind: EntityKind): string {
  switch (kind) {
    case 'me':
      return 'M';
    case 'harebourg':
      return 'H';
    case 'ally':
      return 'A';
    case 'enemy':
      return 'E';
  }
}

function diamond(px: number, py: number): string {
  const hx = TILE_W / 2;
  const hy = TILE_H / 2;
  return `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
}

const CellMarker = memo(function CellMarker({ entity }: { entity: Entity }) {
  const { px, py } = cartesianToIso(entity.cell);
  const opacity = 0.85;
  return (
    <g pointerEvents="none">
      <polygon
        points={diamond(px, py)}
        fill={colorFor(entity.kind)}
        fillOpacity={opacity}
        stroke={colorFor(entity.kind)}
        strokeWidth={1.5}
      />
      <text x={px} y={py + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0e1116">
        {labelFor(entity.kind)}
      </text>
    </g>
  );
});

const CircleMarker = memo(function CircleMarker({ entity }: { entity: Entity }) {
  const { px, py } = cartesianToIso(entity.cell);
  const removeEntity = useAppStore((s) => s.removeEntity);
  const confirmEntityDetection = useAppStore((s) => s.confirmEntityDetection);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: SVG entity marker, non-focusable by design
    <g
      onClick={(e) => {
        if (e.shiftKey) return;
        e.stopPropagation();
        confirmEntityDetection(entity.cell);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        removeEntity(entity.id);
      }}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={px}
        cy={py - 6}
        r={10}
        fill={colorFor(entity.kind)}
        stroke="#000"
        strokeWidth={1}
      />
      <text x={px} y={py - 2} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0e1116">
        {labelFor(entity.kind)}
      </text>
    </g>
  );
});

export function EntityLayer() {
  const entities = useAppStore((s) => s.entities);
  const lastDetection = useAppStore((s) => s.lastDetection);
  return (
    <g>
      {lastDetection?.entities.map((d) => (
        <ConfidenceOutline
          key={`conf-${d.cell.x}-${d.cell.y}`}
          cell={d.cell}
          confidence={d.confidence}
        />
      ))}
      {entities.map((e) =>
        e.kind === 'me' ? (
          <CellMarker key={e.id} entity={e} />
        ) : (
          <CircleMarker key={e.id} entity={e} />
        ),
      )}
    </g>
  );
}
