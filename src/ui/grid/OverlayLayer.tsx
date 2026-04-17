import { useMemo } from 'react';
import { computeConfusion } from '../../core/confusion';
import { forwardRedirection } from '../../core/redirection';
import { reverseSolve } from '../../core/solver';
import type { Cell } from '../../core/types';
import { useAppStore } from '../../state/store';
import { theme } from '../theme';
import { TILE_H, TILE_W, cartesianToIso } from './iso';

function diamond(px: number, py: number): string {
  const hx = TILE_W / 2;
  const hy = TILE_H / 2;
  return `${px},${py - hy} ${px + hx},${py} ${px},${py + hy} ${px - hx},${py}`;
}

export function OverlayLayer({ hover }: { hover: Cell | null }) {
  const target = useAppStore((s) => s.turn.targetCell);
  const me = useAppStore((s) => s.entities.find((e) => e.kind === 'me'));
  const turn = useAppStore((s) => s.turn);
  const map = useAppStore((s) => s.map);

  const confusion = useMemo(() => computeConfusion(turn), [turn]);

  const result = useMemo(() => {
    if (!me || !target) return null;
    return reverseSolve(me.cell, target, confusion, map);
  }, [me, target, confusion, map]);

  const hoverImpact = useMemo(() => {
    if (!me || !hover) return null;
    if (target && hover.x === target.x && hover.y === target.y) return null;
    const fwd = forwardRedirection(me.cell, hover, confusion, map);
    if (fwd.kind !== 'ok') return null;
    return fwd.impactCell;
  }, [me, hover, target, confusion, map]);

  return (
    <g pointerEvents="none">
      {hoverImpact &&
        (() => {
          const { px, py } = cartesianToIso(hoverImpact);
          return (
            <polygon
              points={diamond(px, py)}
              fill={theme.target}
              fillOpacity={0.3}
              stroke={theme.target}
              strokeWidth={1}
            />
          );
        })()}
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
