import { useState } from 'react';
import { SettingsModal } from './SettingsModal';

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Paramètres
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
