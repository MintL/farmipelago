export const STARTER_ISLAND_ID = 0;
export const NORTH_ISLAND_ID = 1;
export const WORKSHOP_YAW = Math.PI * 1.5;
export const ISLAND_LAYOUT_SCALE = 1.5;

export const BASE_ISLAND_LAYOUT = [
  { cx: 0, cz: 0, h: 0, r: 7.2 },
  { cx: 1, cz: -16, h: 1, r: 7.0 },
  { cx: 15, cz: -6, h: 2, r: 4.8 },
  { cx: 14, cz: 10, h: 1, r: 3.5 },
  { cx: 0, cz: 16, h: 2, r: 5.6 },
  { cx: -14, cz: 10, h: 3, r: 3.8 },
  { cx: -15, cz: -8, h: 1, r: 4.6 },
];

export const ISLAND_CONNECTION_PAIRS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [4, 5],
  [1, 6],
];
