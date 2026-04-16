import type { EntityKind } from '../../core/types';
import { useAppStore } from '../../state/store';
import { EntityPalette } from './EntityPalette';

type Props = {
  paletteKind: EntityKind;
  onPaletteChange: (k: EntityKind) => void;
};

export function RightPanel({ paletteKind, onPaletteChange }: Props) {
  const resetTurn = useAppStore((s) => s.resetTurn);
  const resetMapToDefault = useAppStore((s) => s.resetMapToDefault);
  const mode = useAppStore((s) => s.mode);
  return (
    <aside
      style={{
        width: 220,
        padding: 12,
        borderLeft: '1px solid #30363d',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {mode === 'combat' ? (
        <>
          <EntityPalette selected={paletteKind} onSelect={onPaletteChange} />
          <button type="button" onClick={resetTurn}>
            Reset tour
          </button>
          <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.5 }}>
            Clic gauche : moi (tir)
            <br />
            Shift+clic : début de tour
            <br />
            Clic droit : cible
            <br />
            Clic milieu : entité sélectionnée
            <br />
            Double-clic entité : supprimer
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
            Mode édition :
            <br />
            Clic gauche : obstacle on/off
            <br />
            Clic droit : trou on/off
          </div>
          <button type="button" onClick={resetMapToDefault}>
            Réinitialiser la map
          </button>
        </>
      )}
    </aside>
  );
}
