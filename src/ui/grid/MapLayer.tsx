import { useAppStore } from '../../state/store';
import { Cell } from './Cell';
import { cartesianToIso } from './iso';

type Props = {
  onCellClick: (cell: { x: number; y: number }, e: React.MouseEvent) => void;
  onCellRightClick: (cell: { x: number; y: number }) => void;
  onCellMiddleClick: (cell: { x: number; y: number }) => void;
  onCellHover: (cell: { x: number; y: number }) => void;
};

export function MapLayer({ onCellClick, onCellRightClick, onCellMiddleClick, onCellHover }: Props) {
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
          x={x}
          y={y}
          kind={map.cells[y][x]}
          onClick={(e) => onCellClick({ x, y }, e)}
          onContextMenu={(e) => {
            e.preventDefault();
            onCellRightClick({ x, y });
          }}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              onCellMiddleClick({ x, y });
            }
          }}
          onMouseEnter={() => onCellHover({ x, y })}
        />,
      );
    }
  }
  return <g>{nodes}</g>;
}
