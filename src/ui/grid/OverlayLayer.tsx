import { useMemo } from 'react';
import { computeConfusion } from '../../core/confusion';
import { reverseSolve } from '../../core/solver';
import { useAppStore } from '../../state/store';
import { theme } from '../theme';
import { TILE_H, TILE_W, cartesianToIso } from './iso';

function diamond(px: number, py: number): string {
  const hx = TILE_W / 2;
  const hy = TILE_H / 2;
  return `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
}

export function OverlayLayer() {
  const target = useAppStore((s) => s.turn.targetCell);
  const me = useAppStore((s) => s.entities.find((e) => e.kind === 'me'));
  const turn = useAppStore((s) => s.turn);
  const map = useAppStore((s) => s.map);

  const result = useMemo(() => {
    if (!me || !target) return null;
    return reverseSolve(me.cell, target, computeConfusion(turn), map);
  }, [me, target, turn, map]);

  return (
    <g pointerEvents="none">
      {target &&
        (() => {
          const { px, py } = cartesianToIso(target);
          return (
            <polygon
              points={diamond(px, py)}
              fill={theme.target}
              fillOpacity={0.55}
              stroke={theme.target}
              strokeWidth={2}
            />
          );
        })()}
      {result?.kind === 'ok' &&
        (() => {
          const { px, py } = cartesianToIso(result.aimCell);
          return (
            <polygon
              points={diamond(px, py)}
              fill={theme.greenAim}
              fillOpacity={0.6}
              stroke={theme.greenAim}
              strokeWidth={2}
            />
          );
        })()}
      {result?.kind === 'blocked' && result.reason === 'los' && (
        <text x={0} y={0} fill={theme.losWarn} fontSize={14}>
          LOS bloquée
        </text>
      )}
    </g>
  );
}
