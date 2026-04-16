import type { StateCreator } from 'zustand';
import { canPlaceEntity } from '../../core/placement';
import type { Cell, Entity, EntityKind, GameMap } from '../../core/types';

export type EntitySlice = {
  entities: Entity[];
  placeEntity: (kind: EntityKind, cell: Cell) => void;
  removeEntity: (id: string) => void;
};

const UNIQUE: ReadonlySet<EntityKind> = new Set(['me', 'meStart', 'harebourg']);

let counter = 0;
const nextId = () => `e${++counter}`;

type Requires = { map: GameMap };

export const createEntitySlice: StateCreator<EntitySlice & Requires, [], [], EntitySlice> = (
  set,
  get,
) => ({
  entities: [],
  placeEntity: (kind, cell) =>
    set((state) => {
      if (!canPlaceEntity(cell, get().map)) return state;
      const filtered = UNIQUE.has(kind)
        ? state.entities.filter((e) => e.kind !== kind)
        : state.entities;
      return { entities: [...filtered, { id: nextId(), kind, cell }] };
    }),
  removeEntity: (id) => set((state) => ({ entities: state.entities.filter((e) => e.id !== id) })),
});
