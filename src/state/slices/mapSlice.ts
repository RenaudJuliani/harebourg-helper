import { produce } from 'immer';
import type { StateCreator } from 'zustand';
import type { Cell, CellKind, GameMap } from '../../core/types';
import { HAREBOURG_MAP } from '../../data/harebourg-map';

export type MapSlice = {
  map: GameMap;
  setCellKind: (cell: Cell, kind: CellKind) => void;
  resetMapToDefault: () => void;
};

function clone(map: GameMap): GameMap {
  return { ...map, cells: map.cells.map((row) => [...row]) };
}

export const createMapSlice: StateCreator<MapSlice, [], [], MapSlice> = (set) => ({
  map: clone(HAREBOURG_MAP),
  setCellKind: (cell, kind) =>
    set(
      produce<MapSlice>((s) => {
        if (cell.x < 0 || cell.y < 0 || cell.x >= s.map.width || cell.y >= s.map.height) return;
        s.map.cells[cell.y][cell.x] = kind;
      }),
    ),
  resetMapToDefault: () => set({ map: clone(HAREBOURG_MAP) }),
});
