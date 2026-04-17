import type { ShortcutAction } from '../state/slices/settingsSlice';
import { useAppStore } from '../state/store';

const HP_ORDER = ['r100_90', 'r89_75', 'r74_45', 'r44_30', 'r29_0'] as const;

const HANDLERS: Record<ShortcutAction, () => void> = {
  resetTurn: () => useAppStore.getState().resetTurn(),
  toggleMode: () => {
    const s = useAppStore.getState();
    s.setMode(s.mode === 'combat' ? 'edit' : 'combat');
  },
  swapPositions: () => {
    const s = useAppStore.getState();
    const me = s.entities.find((e) => e.kind === 'me');
    const meStart = s.entities.find((e) => e.kind === 'meStart');
    if (!me || !meStart) return;
    s.removeEntity(me.id);
    s.removeEntity(meStart.id);
    s.placeEntity('me', meStart.cell);
    s.placeEntity('meStart', me.cell);
  },
  cycleHpRangeDown: () => {
    const s = useAppStore.getState();
    const idx = HP_ORDER.indexOf(s.turn.hpRange);
    const next = HP_ORDER[(idx + 1) % HP_ORDER.length];
    s.setHpRange(next);
  },
  incrementMeleeHits: () => {
    const s = useAppStore.getState();
    s.setMeleeHits(s.turn.meleeHits + 1);
  },
  decrementMeleeHits: () => {
    const s = useAppStore.getState();
    s.setMeleeHits(s.turn.meleeHits - 1);
  },
};

function keyToAction(e: KeyboardEvent): ShortcutAction | null {
  const bindings = useAppStore.getState().settings.shortcuts;
  for (const [action, key] of Object.entries(bindings)) {
    if (!key) continue;
    if (matchKey(e, key)) return action as ShortcutAction;
  }
  return null;
}

function matchKey(e: KeyboardEvent, binding: string): boolean {
  const parts = binding.toLowerCase().split('+');
  const key = parts.pop()!;
  const needCtrl = parts.includes('ctrl') || parts.includes('cmdorctrl');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt');

  if (needCtrl !== (e.ctrlKey || e.metaKey)) return false;
  if (needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;

  return e.key.toLowerCase() === key || e.code.toLowerCase() === key;
}

function onKeyDown(e: KeyboardEvent) {
  const action = keyToAction(e);
  if (!action) return;
  e.preventDefault();
  HANDLERS[action]();
}

let installed = false;

export function installShortcuts() {
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', onKeyDown);
}

export function uninstallShortcuts() {
  installed = false;
  window.removeEventListener('keydown', onKeyDown);
}
