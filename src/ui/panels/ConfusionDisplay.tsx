import { selectConfusion } from '../../state/selectors';
import { useAppStore } from '../../state/store';

export function ConfusionDisplay() {
  const r = useAppStore(selectConfusion);
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
