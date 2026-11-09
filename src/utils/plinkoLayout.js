// Shared by the browser (drawing) and the Vercel API (physics sim). Units are pixels.
export const BOARD = {
  W: 936,
  H: 890,
  BIN_TOP: 790,      // Last peg row is at y = 738 (52px clean gap above bins)
  PUCK_R: 15,
  PEG_R: 5,
  DROP_Y: 36,
  FIRST_ROW_Y: 108,
  ROW_DY: 42,
  ROWS: 16,
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
