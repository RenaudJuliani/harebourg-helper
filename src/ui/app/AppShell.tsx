import { useState } from 'react';
import type { EntityKind } from '../../core/types';
import { GridView } from '../grid/GridView';
import { LeftPanel } from '../panels/LeftPanel';
import { RightPanel } from '../panels/RightPanel';
import { MeBanner } from './MeBanner';
import { ToastStack } from './Toast';

export function AppShell() {
  const [paletteKind, setPaletteKind] = useState<EntityKind>('harebourg');
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <LeftPanel />
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <MeBanner />
        <div style={{ flex: 1, position: 'relative' }}>
          <GridView paletteKind={paletteKind} />
        </div>
      </div>
      <RightPanel paletteKind={paletteKind} onPaletteChange={setPaletteKind} />
      <ToastStack />
    </div>
  );
}
