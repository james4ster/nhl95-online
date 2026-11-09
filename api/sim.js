import * as planckNS from "planck";
import { BOARD, FRAME_MS, buildPegs } from "../src/utils/plinkoLayout.js";

const planck = planckNS.default ?? planckNS;
const { Vec2, World, Circle, Box } = planck;

const M = 0.01;          // px -> meters
const GRAVITY = 10;
const STEP = 1 / 120;
const REC_EVERY = 4;     // 120Hz / 4 = 30Hz samples

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function simulateDrop({ binOrder, dropX }) {
  const { W, H, BIN_TOP, PUCK_R, PEG_R, DROP_Y } = BOARD;
  const n = binOrder.length;
  const binW = W / n;

  const world = new World({ gravity: new Vec2(0, GRAVITY) });
  const fixed = world.createBody();
  const mat = { friction: 0.1, restitution: 0.45 };

  for (const p of buildPegs()) {
    fixed.createFixture({ shape: new Circle(new Vec2(p.x * M, p.y * M), PEG_R * M), ...mat });
  }
  // walls + floor
  fixed.createFixture({ shape: new Box(0.05, (H * M) / 2, new Vec2(-0.05, (H * M) / 2)), ...mat });
  fixed.createFixture({ shape: new Box(0.05, (H * M) / 2, new Vec2(W * M + 0.05, (H * M) / 2)), ...mat });
  fixed.createFixture({ shape: new Box((W * M) / 2, 0.05, new Vec2((W * M) / 2, H * M + 0.05)), ...mat });
  // bin dividers (1.5px half-width, rounded cap so pucks can't balance on top)
  const hh = ((H - BIN_TOP) * M) / 2;
  for (let i = 1; i < n; i++) {
    const x = i * binW * M;
    fixed.createFixture({ shape: new Box(0.015, hh, new Vec2(x, BIN_TOP * M + hh)), ...mat });
    fixed.createFixture({ shape: new Circle(new Vec2(x, BIN_TOP * M), 0.015), ...mat });
  }

  const jitter = (Math.random() - 0.5) * 12;
  const puck = world.createDynamicBody({
    position: new Vec2((dropX + jitter) * M, DROP_Y * M),
    bullet: true,
    angularDamping: 0.2,
  });
  puck.createFixture({ shape: new Circle(PUCK_R * M), density: 1, friction: 0.15, restitution: 0.5 });
  puck.setLinearVelocity(new Vec2((Math.random() - 0.5) * 0.6, 0));
  puck.setAngularVelocity((Math.random() - 0.5) * 6);

  const traj = [];
  const rec = () => {
    const p = puck.getPosition();
    traj.push(+(p.x / M).toFixed(1), +(p.y / M).toFixed(1), +puck.getAngle().toFixed(2));
  };
  rec();

  let step = 0, stall = 0, rest = 0, inBin = 0;
  const MAX_STEPS = 120 * 45;
  while (step < MAX_STEPS) {
    world.step(STEP, 8, 3);
    step++;
    const p = puck.getPosition();
    const py = p.y / M;
    const sp = puck.getLinearVelocity().length();
    if (step % REC_EVERY === 0) rec();

    if (py > BIN_TOP + PUCK_R) {
      inBin++;
      rest = sp < 0.05 ? rest + 1 : 0;
      if (rest > 30 || inBin > 360) break;
    } else {
      stall = sp < 0.04 ? stall + 1 : 0;
      if (stall > 40) {
        const dir = p.x < (W * M) / 2 ? 1 : -1; // nudge toward center if wedged
        puck.applyLinearImpulse(new Vec2(0.03 * dir, -0.02), puck.getWorldCenter(), true);
        stall = 0;
      }
    }
  }
  rec();

  const x = puck.getPosition().x / M;
  const binIndex = Math.max(0, Math.min(n - 1, Math.floor(x / binW)));
  const durationMs = Math.round((traj.length / 3 - 1) * FRAME_MS);
  return { trajectory: traj, durationMs, binIndex };
}