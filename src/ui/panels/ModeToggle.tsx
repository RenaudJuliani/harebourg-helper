import { useAppStore } from '../../state/store';

export function ModeToggle() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  return (
    <button type="button" onClick={() => setMode(mode === 'combat' ? 'edit' : 'combat')}>
      Mode : {mode === 'combat' ? 'Combat' : 'Édition'}
    </button>
  );
}
