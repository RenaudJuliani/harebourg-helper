import { describe, expect, it } from 'vitest';
import { addRotations, inverseRotation, rotateCellAround } from '../../src/core/geometry';
import type { Rotation } from '../../src/core/types';

const cw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'cw' });
const ccw = (d: 0 | 90 | 180 | 270): Rotation => ({ degrees: d, direction: 'ccw' });

describe('rotateCellAround', () => {
  const pivot = { x: 5, y: 5 };

  it('returns the target unchanged for 0°', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, cw(0))).toEqual({ x: 6, y: 5 });
  });

  it('cw 90°: (1, 0) offset -> (0, 1) offset', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, cw(90))).toEqual({ x: 5, y: 6 });
  });

  it('cw 180°: negates offsets', () => {
    expect(rotateCellAround(pivot, { x: 7, y: 5 }, cw(180))).toEqual({ x: 3, y: 5 });
  });

  it('cw 270°: (1, 0) offset -> (0, -1) offset', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, cw(270))).toEqual({ x: 5, y: 4 });
  });

  it('ccw 90° equals cw 270°', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, ccw(90))).toEqual(
      rotateCellAround(pivot, { x: 6, y: 5 }, cw(270)),
    );
  });

  it('ccw 270° equals cw 90°', () => {
    expect(rotateCellAround(pivot, { x: 6, y: 5 }, ccw(270))).toEqual(
      rotateCellAround(pivot, { x: 6, y: 5 }, cw(90)),
    );
  });

  it('pivot maps to itself', () => {
    expect(rotateCellAround(pivot, pivot, cw(90))).toEqual(pivot);
  });
});

describe('inverseRotation', () => {
  it('flips direction, keeps degrees', () => {
    expect(inverseRotation(cw(90))).toEqual(ccw(90));
    expect(inverseRotation(ccw(270))).toEqual(cw(270));
  });

  it('composing a rotation with its inverse yields identity', () => {
    const r = cw(90);
    const p = { x: 0, y: 0 };
    const t = { x: 3, y: 4 };
    const rotated = rotateCellAround(p, t, r);
    const back = rotateCellAround(p, rotated, inverseRotation(r));
    expect(back).toEqual(t);
  });
});

describe('addRotations', () => {
  it('cw 90 + cw 90 = cw 180', () => {
    expect(addRotations(cw(90), cw(90))).toEqual(cw(180));
  });

  it('cw 90 + ccw 90 = cw 0', () => {
    expect(addRotations(cw(90), ccw(90))).toEqual(cw(0));
  });

  it('cw 180 + cw 180 = cw 0', () => {
    expect(addRotations(cw(180), cw(180))).toEqual(cw(0));
  });

  it('ccw 90 + ccw 90 = cw 180 (canonical cw form)', () => {
    expect(addRotations(ccw(90), ccw(90))).toEqual(cw(180));
  });
});
