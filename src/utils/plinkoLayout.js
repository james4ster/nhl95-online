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

export const FRAME_MS = 1000 / 30;

export function buildPegs() {
  const pegs = [];
  const edgeOffset = 5; // Flush with the wall on even rows (no gap behind peg to wedge!)
  const innerW = BOARD.W - edgeOffset * 2;
  const colsEven = 17; // 57.8px spacing
  const step = innerW / (colsEven - 1);

  for (let r = 0; r < BOARD.ROWS; r++) {
    const y = BOARD.FIRST_ROW_Y + r * BOARD.ROW_DY;
    if (r % 2 === 0) {
      for (let k = 0; k < colsEven; k++) {
        pegs.push({ x: Math.round(edgeOffset + step * k), y });
      }
    } else {
      for (let k = 0; k < colsEven - 1; k++) {
        pegs.push({ x: Math.round(edgeOffset + step * (k + 0.5)), y });
      }
    }
  }
  return pegs;
}
