import { useAppStore } from '../../state/store';

export function MeBanner() {
  const entities = useAppStore((s) => s.entities);
  const lastDetection = useAppStore((s) => s.lastDetection);

  const hasMe = entities.some((e) => e.kind === 'me');
  const hasAlly = entities.some((e) => e.kind === 'ally');

  if (hasMe || !hasAlly || !lastDetection) return null;

  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#2962ff',
        color: 'white',
        fontWeight: 500,
        textAlign: 'center',
      }}
    >
      👇 Clique sur ta case (un allié) pour te désigner
    </div>
  );
}
