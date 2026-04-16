export const theme = {
  bg: '#0e1116',
  panel: '#161b22',
  panelBorder: '#30363d',
  text: '#c9d1d9',
  textDim: '#8b949e',
  accent: '#58a6ff',
  floor: '#1e2530',
  floorEdge: '#2b3542',
  hole: '#0b0d11',
  obstacle: '#3d2a2a',
  me: '#58a6ff',
  meStart: '#9aa6b2',
  harebourg: '#d1656b',
  ally: '#56d364',
  neutral: '#d29922',
  target: '#ff4d4f',
  greenAim: '#3fb950',
  losWarn: '#e0a93b',
} as const;

export type Theme = typeof theme;
