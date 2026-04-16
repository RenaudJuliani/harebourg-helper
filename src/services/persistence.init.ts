import { HAREBOURG_MAP } from '../data/harebourg-map';
import { useAppStore } from '../state/store';
import { loadMapDiff, loadSettings, saveMapDiff, saveSettings } from './persistence';

function debounce<T extends (...args: never[]) => unknown>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

function diffFromMap(current: typeof HAREBOURG_MAP) {
  const changes: Array<{
    x: number;
    y: number;
    kind: (typeof HAREBOURG_MAP)['cells'][number][number];
  }> = [];
  for (let y = 0; y < current.height; y++) {
    for (let x = 0; x < current.width; x++) {
      if (current.cells[y][x] !== HAREBOURG_MAP.cells[y][x]) {
        changes.push({ x, y, kind: current.cells[y][x] });
      }
    }
  }
  return { mapId: current.id, changes };
}

export async function hydrateFromDisk() {
  const [settings, diff] = await Promise.all([loadSettings(), loadMapDiff()]);
  useAppStore.setState((s) => ({
    settings: settings ?? s.settings,
  }));
  if (diff && diff.mapId === HAREBOURG_MAP.id) {
    const setCellKind = useAppStore.getState().setCellKind;
    for (const c of diff.changes) setCellKind({ x: c.x, y: c.y }, c.kind);
  }
}

export function installAutoSave() {
  const save = debounce(() => {
    const st = useAppStore.getState();
    void saveSettings(st.settings);
    void saveMapDiff(diffFromMap(st.map));
  }, 500);

  useAppStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings || state.map !== prev.map) save();
  });
}
