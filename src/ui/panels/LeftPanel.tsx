import { ConfusionDisplay } from './ConfusionDisplay';
import { HpRangeSelector } from './HpRangeSelector';
import { MeleeHitsCounter } from './MeleeHitsCounter';
import { ModeToggle } from './ModeToggle';

export function LeftPanel() {
  return (
    <aside
      style={{
        width: 220,
        padding: 12,
        borderRight: '1px solid #30363d',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <HpRangeSelector />
      <MeleeHitsCounter />
      <ConfusionDisplay />
      <ModeToggle />
    </aside>
  );
}
