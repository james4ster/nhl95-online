// Shared by the browser (drawing) and the Vercel API (physics sim). Units are pixels.
export const BOARD = {
  W: 936,
  H: 1100,
  BIN_TOP: 1020,
  PUCK_R: 11,
  PEG_R: 5,
  DROP_Y: 40,
  FIRST_ROW_Y: 150,
  ROW_DY: 46,
  ROWS: 19,
};

export const FRAME_MS = 1000 / 30; // trajectory sample rate

export function buildPegs() {
  const pegs = [];
  for (let r = 0; r < BOARD.ROWS; r++) {
    const y = BOARD.FIRST_ROW_Y + r * BOARD.ROW_DY;
    if (r % 2 === 0) {
      for (let k = 0; k < 18; k++) pegs.push({ x: 26 + 52 * k, y });
    } else {
      for (let k = 1; k < 18; k++) pegs.push({ x: 52 * k, y });
    }
  }
  return pegs;
}