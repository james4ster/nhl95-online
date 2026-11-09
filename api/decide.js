import { db, ensureState, isBusy } from "./lib/lib.js";
import { shuffle } from "./lib/sim.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { season, manager, decision } = req.body || {};
  if (!season || !manager || !["keep", "retry"].includes(decision)) {
    return res.status(400).json({ error: "season, manager and decision (keep|retry) required" });
  }

  const st = await ensureState(season);
  if (st.phase !== "deciding" || st.active_manager !== manager) {
    return res.status(409).json({ error: "Nothing to decide right now" });
  }
  if (isBusy(st)) return res.status(409).json({ error: "Wait for the puck to settle" });

  const { data: ev } = await db
    .from("draft_events")
    .select("id, is_final, decision")
    .eq("season", season)
    .eq("manager", manager)
    .order("id", { ascending: false })
    .limit(1)
    .single();
  if (!ev || ev.is_final || ev.decision) return res.status(409).json({ error: "Already decided" });

  let nextBinOrder = null;
  if (decision === "retry") {
    const { data: allEvents } = await db
      .from("draft_events")
      .select("landed_team, is_final")
      .eq("season", season);
    const taken = new Set((allEvents || []).filter((e) => e.is_final).map((e) => e.landed_team));

    const { data: teamRows } = await db
      .from("draft_teams")
      .select("nhl_team")
      .eq("season", season);
    const pool = (teamRows || []).map((t) => t.nhl_team).filter((t) => !taken.has(t));
    nextBinOrder = shuffle(pool);
  }

  const { data: claimed } = await db
    .from("draft_state")
    .update({
      phase: decision === "keep" ? "idle" : "retry_ready",
      bin_order: nextBinOrder,
      locked_until: null,
      version: st.version + 1,
    })
    .eq("season", season)
    .eq("version", st.version)
    .select()
    .maybeSingle();
  if (!claimed) return res.status(409).json({ error: "State changed. Try again." });

  await db
    .from("draft_events")
    .update({ decision, is_final: decision === "keep" })
    .eq("id", ev.id);

  return res.status(200).json({ ok: true });
}
