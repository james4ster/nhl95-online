// Shared by the browser (drawing) and the Vercel API (physics sim). Units are pixels.
export const BOARD = {
  W: 936,
  H: 890,
  BIN_TOP: 790,
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
  const innerW = BOARD.W - 92; // 46px clearance on both left and right walls (no puck wedging!)
  const colsEven = 17;
  const step = innerW / (colsEven - 1);

  for (let r = 0; r < BOARD.ROWS; r++) {
    const y = BOARD.FIRST_ROW_Y + r * BOARD.ROW_DY;
    if (r % 2 === 0) {
      for (let k = 0; k < colsEven; k++) {
        pegs.push({ x: Math.round(46 + step * k), y });
      }
    } else {
      for (let k = 0; k < colsEven - 1; k++) {
        pegs.push({ x: Math.round(46 + step * (k + 0.5)), y });
      }
      // Side wall kickers on odd rows to bounce edge pucks back into the action
      pegs.push({ x: 10, y });
      pegs.push({ x: BOARD.W - 10, y });
    }
  }
  return pegs;
}
