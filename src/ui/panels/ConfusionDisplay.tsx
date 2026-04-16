import { useMemo } from 'react';
import { computeConfusion } from '../../core/confusion';
import { useAppStore } from '../../state/store';

export function ConfusionDisplay() {
  const turn = useAppStore((s) => s.turn);
  const r = useMemo(() => computeConfusion(turn), [turn]);
  const arrow = r.direction === 'cw' ? '⟳' : '⟲';
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Confusion</div>
      <div style={{ fontSize: 24 }}>
        {r.degrees}° {arrow}
      </div>
    </div>
  );
}
