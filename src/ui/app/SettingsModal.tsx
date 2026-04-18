import { useEffect, useState } from 'react';
import { DEFAULT_SHORTCUTS, type ShortcutAction } from '../../state/slices/settingsSlice';
import { useAppStore } from '../../state/store';

type Props = { open: boolean; onClose: () => void };

const LABELS: Record<ShortcutAction, string> = {
  resetTurn: 'Reset tour',
  toggleMode: 'Toggle mode',
  cycleHpRangeDown: 'Cycler plage PV ↓',
  incrementMeleeHits: '+1 coup CàC',
  decrementMeleeHits: '−1 coup CàC',
};

function formatEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('CmdOrCtrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) parts.push(key);
  return parts.join('+');
}

export function SettingsModal({ open, onClose }: Props) {
  const shortcuts = useAppStore((s) => s.settings.shortcuts);
  const updateShortcut = useAppStore((s) => s.updateShortcut);
  const resetShortcutsToDefault = useAppStore((s) => s.resetShortcutsToDefault);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') {
        setCapturing(null);
        return;
      }
      if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return;
      updateShortcut(capturing, formatEvent(e));
      setCapturing(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [capturing, updateShortcut]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          padding: 20,
          width: 400,
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Raccourcis</h3>
          <button type="button" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {(Object.keys(DEFAULT_SHORTCUTS) as ShortcutAction[]).map((action) => (
            <div
              key={action}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{LABELS[action]}</span>
              <button
                type="button"
                onClick={() => setCapturing(action)}
                aria-pressed={capturing === action}
              >
                {capturing === action ? 'Appuie sur une touche…' : (shortcuts[action] ?? '—')}
              </button>
            </div>
          ))}
          <button type="button" onClick={resetShortcutsToDefault}>
            Réinitialiser aux défauts
          </button>
        </div>
      </div>
    </div>
  );
}
