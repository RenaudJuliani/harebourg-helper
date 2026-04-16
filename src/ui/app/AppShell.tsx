import { useState } from 'react';
import type { EntityKind } from '../../core/types';
import { GridView } from '../grid/GridView';
import { LeftPanel } from '../panels/LeftPanel';
import { RightPanel } from '../panels/RightPanel';

export function AppShell() {
  const [paletteKind, setPaletteKind] = useState<EntityKind>('harebourg');
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <LeftPanel />
      <div style={{ flex: 1, position: 'relative' }}>
        <GridView paletteKind={paletteKind} />
      </div>
      <RightPanel paletteKind={paletteKind} onPaletteChange={setPaletteKind} />
    </div>
  );
}
