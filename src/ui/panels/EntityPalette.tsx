import type { EntityKind } from '../../core/types';

type Props = {
  selected: EntityKind;
  onSelect: (kind: EntityKind) => void;
};

const PALETTE: Array<{ kind: EntityKind; label: string }> = [
  { kind: 'harebourg', label: 'Comte Harebourg' },
  { kind: 'ally', label: 'Allié' },
  { kind: 'neutral', label: 'Neutre' },
];

export function EntityPalette({ selected, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Placer (clic milieu)</div>
      {PALETTE.map((p) => (
        <button
          type="button"
          key={p.kind}
          aria-pressed={selected === p.kind}
          onClick={() => onSelect(p.kind)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
