import type { StateCreator } from 'zustand';
import { canPlaceEntity } from '../../core/placement';
import type { Cell, DetectedEntity, Entity, EntityKind, GameMap } from '../../core/types';

export type EntitySlice = {
  entities: Entity[];
  placeEntity: (kind: EntityKind, cell: Cell) => void;
  removeEntity: (id: string) => void;
  clearAllEntities: () => void;
  entitiesReplaced: (detected: DetectedEntity[]) => void;
  designateMe: (entityId: string) => void;
};

const UNIQUE: ReadonlySet<EntityKind> = new Set(['me', 'harebourg']);

let counter = 0;
const nextId = () => `e${++counter}`;

const detectedKindToEntityKind = (detected: DetectedEntity): EntityKind => {
  if (detected.kind === 'harebourg') return 'harebourg';
  return detected.team === 'ally' ? 'ally' : 'enemy';
};

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
  clearAllEntities: () => set({ entities: [] }),
  entitiesReplaced: (detected) =>
    set(() => ({
      entities: detected.map((d) => ({
        id: nextId(),
        kind: detectedKindToEntityKind(d),
        cell: d.cell,
      })),
    })),
  designateMe: (entityId) =>
    set((state) => ({
      entities: state.entities
        .filter((e) => e.kind !== 'me')
        .map((e) => (e.id === entityId ? { ...e, kind: 'me' as const } : e)),
    })),
});
