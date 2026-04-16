import { GridView } from './ui/grid/GridView';
import { LeftPanel } from './ui/panels/LeftPanel';

export default function App() {
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <LeftPanel />
      <div style={{ flex: 1 }}>
        <GridView />
      </div>
    </div>
  );
}
