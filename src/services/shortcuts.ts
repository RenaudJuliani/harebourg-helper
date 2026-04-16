import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
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

const registered = new Map<ShortcutAction, string>();

async function bindOne(action: ShortcutAction, key: string) {
  try {
    if (await isRegistered(key)) await unregister(key);
    await register(key, () => HANDLERS[action]());
    registered.set(action, key);
  } catch (e) {
    console.warn('failed to bind', action, key, e);
  }
}

export async function bindAll() {
  const bindings = useAppStore.getState().settings.shortcuts;
  for (const action of Object.keys(HANDLERS) as ShortcutAction[]) {
    const key = bindings[action];
    if (key) await bindOne(action, key);
  }
}

export async function rebind(action: ShortcutAction, key: string | null) {
  const prev = registered.get(action);
  if (prev) {
    try {
      await unregister(prev);
    } catch {
      /* noop */
    }
    registered.delete(action);
  }
  if (key) await bindOne(action, key);
}
