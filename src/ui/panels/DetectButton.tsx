import { useAppStore } from '../../state/store';

export function DetectButton() {
  const status = useAppStore((s) => s.detectionStatus);
  const runDetection = useAppStore((s) => s.runDetection);

  const busy = status === 'detecting';

  return (
    <button
      type="button"
      onClick={() => runDetection()}
      disabled={busy}
      style={{
        width: '100%',
        padding: '8px 12px',
        background: busy ? '#2b3542' : '#2962ff',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: busy ? 'wait' : 'pointer',
        fontWeight: 600,
      }}
    >
      {busy ? 'Détection en cours…' : '📷 Détecter'}
    </button>
  );
}
