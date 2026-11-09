import { db, ensureState, isBusy } from "./lib/lib.js";

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
    .from("draft_events").select("id, is_final, decision")
    .eq("season", season).eq("manager", manager)
    .order("id", { ascending: false }).limit(1).single();
  if (!ev || ev.is_final || ev.decision) return res.status(409).json({ error: "Already decided" });

  const { data: claimed } = await db
    .from("draft_state")
    .update({
      phase: decision === "keep" ? "idle" : "retry_ready",
      locked_until: null,
      version: st.version + 1,
    })
    .eq("season", season).eq("version", st.version)
    .select().maybeSingle();
  if (!claimed) return res.status(409).json({ error: "State changed. Try again." });

  await db.from("draft_events")
    .update({ decision, is_final: decision === "keep" })
    .eq("id", ev.id);

  return res.status(200).json({ ok: true });
}