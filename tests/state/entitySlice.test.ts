import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { type EntitySlice, createEntitySlice } from '../../src/state/slices/entitySlice';
import { type MapSlice, createMapSlice } from '../../src/state/slices/mapSlice';

type Combined = MapSlice & EntitySlice;

function makeStore() {
  return create<Combined>()((...a) => ({
    ...createMapSlice(...a),
    ...createEntitySlice(...a),
  }));
}

describe('entitySlice', () => {
  it('starts empty', () => {
    expect(makeStore().getState().entities).toEqual([]);
  });

  it('placeEntity on floor succeeds', () => {
    const s = makeStore();
    s.getState().placeEntity('harebourg', { x: 5, y: 5 });
    expect(s.getState().entities).toHaveLength(1);
    expect(s.getState().entities[0].kind).toBe('harebourg');
  });

  it('placeEntity on obstacle is rejected silently', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 5, y: 5 }, 'obstacle');
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    expect(s.getState().entities).toEqual([]);
  });

  it('placeEntity on hole is rejected', () => {
    const s = makeStore();
    s.getState().setCellKind({ x: 5, y: 5 }, 'hole');
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    expect(s.getState().entities).toEqual([]);
  });

  it('unique kinds (me, meStart, harebourg) replace existing', () => {
    const s = makeStore();
    s.getState().placeEntity('me', { x: 5, y: 5 });
    s.getState().placeEntity('me', { x: 6, y: 5 });
    const me = s.getState().entities.filter((e) => e.kind === 'me');
    expect(me).toHaveLength(1);
    expect(me[0].cell).toEqual({ x: 6, y: 5 });
  });

  it('multiple allies coexist', () => {
    const s = makeStore();
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    s.getState().placeEntity('ally', { x: 6, y: 5 });
    expect(s.getState().entities.filter((e) => e.kind === 'ally')).toHaveLength(2);
  });

  it('removeEntity by id', () => {
    const s = makeStore();
    s.getState().placeEntity('ally', { x: 5, y: 5 });
    const id = s.getState().entities[0].id;
    s.getState().removeEntity(id);
    expect(s.getState().entities).toEqual([]);
  });
});
