import { db, ensureState, isBusy } from "./lib/lib.js";
import { shuffle } from "./lib/sim.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { season, manager } = req.body || {};
  if (!season || !manager) return res.status(400).json({ error: "season and manager required" });

  const { data: part } = await db
    .from("draft_participants").select("*")
    .eq("season", season).eq("manager", manager).maybeSingle();
  if (!part) return res.status(404).json({ error: "Not a participant this season" });

  const { data: events } = await db
    .from("draft_events").select("manager, landed_team, is_final")
    .eq("season", season);
  if ((events || []).some((e) => e.manager === manager && e.is_final)) {
    return res.status(409).json({ error: "You already have a team" });
  }

  const st = await ensureState(season);
  const canClaim =
    st.phase === "idle" ||
    (st.phase === "ready" && (!isBusy(st) || st.active_manager === manager));
  if (!canClaim) {
    return res.status(409).json({ error: (st.active_manager || "Someone else") + " is currently up!" });
  }

  const taken = new Set((events || []).filter((e) => e.is_final).map((e) => e.landed_team));
  const { data: teamRows } = await db.from("draft_teams").select("nhl_team").eq("season", season);
  const pool = (teamRows || []).map((t) => t.nhl_team).filter((t) => !taken.has(t));
  const binOrder = shuffle(pool);

  const { data: claimed } = await db
    .from("draft_state")
    .update({
      phase: "ready",
      active_manager: manager,
      bin_order: binOrder,
      locked_until: new Date(Date.now() + 120000).toISOString(),
      version: st.version + 1,
    })
    .eq("season", season).eq("version", st.version)
    .select().maybeSingle();

  if (!claimed) return res.status(409).json({ error: "State changed, try clicking Go again." });
  return res.status(200).json({ ok: true });
}
