import { db, ensureState, isBusy, LEAD_MS, BUFFER_MS } from "./lib/lib.js";
import { simulateDrop, shuffle } from "./lib/sim.js";
import { BOARD } from "../src/utils/plinkoLayout.js";
import { notifyTeamFinalized } from "./lib/discord.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { season, manager, dropX } = req.body || {};
  if (!season || !manager) return res.status(400).json({ error: "season and manager required" });

  const { data: part } = await db
    .from("draft_participants").select("*")
    .eq("season", season).eq("manager", manager).maybeSingle();
  if (!part) return res.status(404).json({ error: "Not a participant this season" });

  const { data: events } = await db
    .from("draft_events").select("id, manager, attempt, landed_team, is_final, decision")
    .eq("season", season).order("id");

  const mine = (events || []).filter((e) => e.manager === manager);
  if (mine.some((e) => e.is_final)) return res.status(409).json({ error: "You already have a team" });
  const lastMine = mine[mine.length - 1];
  let attempt = 1;
  if (lastMine) {
    if (lastMine.decision !== "retry") return res.status(409).json({ error: "Keep or try again first" });
    attempt = 2;
  }

  const taken = new Set((events || []).filter((e) => e.is_final).map((e) => e.landed_team));
  const { data: teamRows } = await db.from("draft_teams").select("nhl_team").eq("season", season);
  const pool = (teamRows || []).map((t) => t.nhl_team).filter((t) => !taken.has(t));
  if (pool.length === 0) return res.status(409).json({ error: "No teams left" });

  const st = await ensureState(season);
  const mayDrop =
    (st.phase === "ready" && st.active_manager === manager) ||
    (!isBusy(st) && st.phase === "retry_ready" && st.active_manager === manager);
  if (!mayDrop) return res.status(409).json({ error: "Click Go next to your name first, or wait for your turn." });

  const now = Date.now();
  const { data: claimed } = await db
    .from("draft_state")
    .update({
      phase: "dropping",
      active_manager: manager,
      locked_until: new Date(now + 60000).toISOString(),
      version: st.version + 1,
    })
    .eq("season", season).eq("version", st.version)
    .select().maybeSingle();
  if (!claimed) return res.status(409).json({ error: "Someone else just dropped. Try again." });

  try {
    const validSet = new Set(pool);
    const binOrder =
      Array.isArray(st.bin_order) &&
      st.bin_order.length === pool.length &&
      st.bin_order.every((t) => validSet.has(t))
        ? st.bin_order
        : shuffle(pool);

    const x0 = Math.max(30, Math.min(BOARD.W - 30, Number(dropX) || BOARD.W / 2));
    const sim = simulateDrop({ binOrder, dropX: x0 });
    const landed = binOrder[sim.binIndex];
    const isFinal = attempt === 2 || !part.has_retry;
    const startedAt = new Date(now + LEAD_MS);

    const { error: insErr } = await db.from("draft_events").insert({
      season, manager, attempt,
      bin_order: binOrder,
      landed_team: landed,
      trajectory: sim.trajectory,
      duration_ms: sim.durationMs,
      is_final: isFinal,
      started_at: startedAt.toISOString(),
    });
    if (insErr) throw insErr;

    await db.from("draft_state").update({
      phase: isFinal ? "idle" : "deciding",
      active_manager: manager,
      bin_order: isFinal ? null : binOrder,
      locked_until: new Date(startedAt.getTime() + sim.durationMs + BUFFER_MS).toISOString(),
      version: claimed.version + 1,
    }).eq("season", season);


        if (isFinal) {
    await notifyTeamFinalized({
      season,
      manager,
      team: landed,
      req,
      delayMs: sim.durationMs + 1500,
    });
  }



    return res.status(200).json({ ok: true });
  } catch (e) {
    await db.from("draft_state").update({
      phase: st.phase,
      active_manager: st.active_manager,
      locked_until: st.locked_until,
      version: claimed.version + 1,
    }).eq("season", season);
    return res.status(500).json({ error: e.message || "Drop failed" });
  }
}