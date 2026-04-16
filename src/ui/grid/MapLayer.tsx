import { useAppStore } from '../../state/store';
import { Cell } from './Cell';
import { cartesianToIso } from './iso';

type Props = {
  onCellClick: (cell: { x: number; y: number }) => void;
  onCellRightClick: (cell: { x: number; y: number }) => void;
  onCellHover: (cell: { x: number; y: number }) => void;
};

export function MapLayer({ onCellClick, onCellRightClick, onCellHover }: Props) {
  const map = useAppStore((s) => s.map);
  const nodes = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const { px, py } = cartesianToIso({ x, y });
      nodes.push(
        <Cell
          key={`${x},${y}`}
          px={px}
          py={py}
          kind={map.cells[y][x]}
          onClick={() => onCellClick({ x, y })}
          onContextMenu={(e) => {
            e.preventDefault();
            onCellRightClick({ x, y });
          }}
          onMouseEnter={() => onCellHover({ x, y })}
        />,
      );
    }
  }
  return <g>{nodes}</g>;
}
