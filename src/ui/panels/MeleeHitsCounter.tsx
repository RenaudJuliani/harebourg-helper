import { useAppStore } from '../../state/store';

export function MeleeHitsCounter() {
  const hits = useAppStore((s) => s.turn.meleeHits);
  const setMeleeHits = useAppStore((s) => s.setMeleeHits);
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Coups CàC reçus</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" onClick={() => setMeleeHits(hits - 1)} disabled={hits <= 0}>
          −
        </button>
        <span style={{ minWidth: 24, textAlign: 'center' }}>{hits}</span>
        <button type="button" onClick={() => setMeleeHits(hits + 1)} disabled={hits >= 10}>
          +
        </button>
      </div>
    </div>
  );
}
