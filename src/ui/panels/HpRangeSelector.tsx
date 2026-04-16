import type { HpRange } from '../../core/types';
import { useAppStore } from '../../state/store';

const RANGES: Array<{ value: HpRange; label: string }> = [
  { value: 'r100_90', label: '100–90%' },
  { value: 'r89_75', label: '89–75%' },
  { value: 'r74_45', label: '74–45%' },
  { value: 'r44_30', label: '44–30%' },
  { value: 'r29_0', label: '29–0%' },
];

export function HpRangeSelector() {
  const hpRange = useAppStore((s) => s.turn.hpRange);
  const setHpRange = useAppStore((s) => s.setHpRange);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Plage PV</div>
      {RANGES.map((r) => (
        <button
          type="button"
          key={r.value}
          aria-pressed={hpRange === r.value}
          onClick={() => setHpRange(r.value)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
