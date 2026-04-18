export type Cell = { x: number; y: number };

export type CellKind = 'floor' | 'hole' | 'obstacle';

export type GameMap = {
  id: string;
  name: string;
  width: number;
  height: number;
  cells: CellKind[][]; // [y][x]
};

export type EntityKind = 'me' | 'ally' | 'harebourg' | 'enemy';

export type Entity = {
  id: string;
  kind: EntityKind;
  cell: Cell;
  label?: string;
};

export type HpRange = 'r100_90' | 'r89_75' | 'r74_45' | 'r44_30' | 'r29_0';

export type Rotation = {
  degrees: 0 | 90 | 180 | 270;
  direction: 'cw' | 'ccw';
};

export type TurnState = {
  hpRange: HpRange;
  meleeHits: number;
  targetCell: Cell | null;
};

export type RedirectionResult =
  | { kind: 'ok'; aimCell: Cell; impactCell: Cell }
  | { kind: 'blocked'; reason: 'los' | 'out_of_map' | 'no_solution' };

export type AppMode = 'combat' | 'edit';

export type DetectedTeam = 'ally' | 'enemy';
export type DetectedKind = 'generic' | 'harebourg';

export type DetectedEntity = {
  cell: Cell;
  team: DetectedTeam;
  kind: DetectedKind;
  confidence: number;
};

export type DetectionResult = {
  entities: DetectedEntity[];
  warnings: string[];
};

export type DetectionErrorKind =
  | 'WindowNotFound'
  | 'WindowMinimized'
  | 'PermissionDenied'
  | 'CaptureFailed'
  | 'NotInCombat'
  | 'UnexpectedShape'
  | 'Unknown';

export type DetectionError = {
  kind: DetectionErrorKind;
  detail?: string;
};
