import { memo } from 'react';
import type { Entity, EntityKind } from '../../core/types';
import { useAppStore } from '../../state/store';
import { theme } from '../theme';
import { cartesianToIso } from './iso';

function colorFor(kind: EntityKind): string {
  switch (kind) {
    case 'me':
      return theme.me;
    case 'meStart':
      return theme.meStart;
    case 'harebourg':
      return theme.harebourg;
    case 'ally':
      return theme.ally;
    case 'neutral':
      return theme.neutral;
  }
}

function labelFor(kind: EntityKind): string {
  switch (kind) {
    case 'me':
      return 'M';
    case 'meStart':
      return 'S';
    case 'harebourg':
      return 'H';
    case 'ally':
      return 'A';
    case 'neutral':
      return 'N';
  }
}

const Marker = memo(function Marker({ entity }: { entity: Entity }) {
  const { px, py } = cartesianToIso(entity.cell);
  const removeEntity = useAppStore((s) => s.removeEntity);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: SVG entity marker, non-focusable by design
    <g
      onClick={(e) => {
        if (e.shiftKey) return;
        e.stopPropagation();
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
  return (
    <g>
      {entities.map((e) => (
        <Marker key={e.id} entity={e} />
      ))}
    </g>
  );
}
