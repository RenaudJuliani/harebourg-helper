import { create } from 'zustand';
import { type EntitySlice, createEntitySlice } from './slices/entitySlice';
import { type MapSlice, createMapSlice } from './slices/mapSlice';
import { type SettingsSlice, createSettingsSlice } from './slices/settingsSlice';
import { type TurnSlice, createTurnSlice } from './slices/turnSlice';

export type AppStore = MapSlice & EntitySlice & TurnSlice & SettingsSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createMapSlice(...a),
  ...createEntitySlice(...a),
  ...createTurnSlice(...a),
  ...createSettingsSlice(...a),
}));
