import type { ShortcutAction, ShortcutBindings } from '../state/slices/settingsSlice';
import { useAppStore } from '../state/store';
import { bindAll, rebind } from './shortcuts';

export async function installShortcuts() {
  await bindAll();

  let previous: ShortcutBindings = { ...useAppStore.getState().settings.shortcuts };
  useAppStore.subscribe(async (state) => {
    const current = state.settings.shortcuts;
    if (current === previous) return;
    for (const action of Object.keys(current) as ShortcutAction[]) {
      if (current[action] !== previous[action]) {
        await rebind(action, current[action]);
      }
    }
    previous = { ...current };
  });
}
