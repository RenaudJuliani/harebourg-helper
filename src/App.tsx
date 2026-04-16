import { useState } from 'react';
import type { EntityKind } from './core/types';
import { GridView } from './ui/grid/GridView';
import { LeftPanel } from './ui/panels/LeftPanel';
import { RightPanel } from './ui/panels/RightPanel';

export default function App() {
  const [paletteKind, setPaletteKind] = useState<EntityKind>('harebourg');
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <LeftPanel />
      <div style={{ flex: 1 }}>
        <GridView paletteKind={paletteKind} />
      </div>
      <RightPanel paletteKind={paletteKind} onPaletteChange={setPaletteKind} />
    </div>
  );
}
