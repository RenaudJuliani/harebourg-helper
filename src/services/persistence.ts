import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { CellKind } from '../core/types';
import type { AppSettings } from '../state/slices/settingsSlice';

const DIR = 'harebourg-helper';
const SETTINGS_FILE = `${DIR}/settings.json`;
const MAP_DIFF_FILE = `${DIR}/custom-maps.json`;

export type MapDiff = {
  mapId: string;
  changes: Array<{ x: number; y: number; kind: CellKind }>;
};

async function ensureDir() {
  const ok = await exists(DIR, { baseDir: BaseDirectory.AppConfig });
  if (!ok) await mkdir(DIR, { baseDir: BaseDirectory.AppConfig, recursive: true });
}

export async function loadSettings(): Promise<AppSettings | null> {
  try {
    const raw = await readTextFile(SETTINGS_FILE, { baseDir: BaseDirectory.AppConfig });
    return JSON.parse(raw) as AppSettings;
  } catch {
    return null;
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await ensureDir();
  await writeTextFile(SETTINGS_FILE, JSON.stringify(s, null, 2), {
    baseDir: BaseDirectory.AppConfig,
  });
}

export async function loadMapDiff(): Promise<MapDiff | null> {
  try {
    const raw = await readTextFile(MAP_DIFF_FILE, { baseDir: BaseDirectory.AppConfig });
    return JSON.parse(raw) as MapDiff;
  } catch {
    return null;
  }
}

export async function saveMapDiff(d: MapDiff): Promise<void> {
  await ensureDir();
  await writeTextFile(MAP_DIFF_FILE, JSON.stringify(d, null, 2), {
    baseDir: BaseDirectory.AppConfig,
  });
}
