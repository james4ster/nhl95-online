import { db, ensureState } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.DRAFT_ADMIN_KEY || req.headers["x-admin-key"] !== process.env.DRAFT_ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { action, season } = req.body || {};
  if (!season) return res.status(400).json({ error: "season required" });
  const st = await ensureState(season);

  if (action === "unlock") {
    await db.from("draft_state")
      .update({ phase: "idle", active_manager: null, locked_until: null, version: st.version + 1 })
      .eq("season", season);
    return res.status(200).json({ ok: true });
  }

  if (action === "undo") {
    const { data: ev } = await db
      .from("draft_events").select("id, manager, attempt")
      .eq("season", season).order("id", { ascending: false }).limit(1).maybeSingle();
    if (!ev) return res.status(404).json({ error: "No drops to undo" });
    await db.from("draft_events").delete().eq("id", ev.id);
    const back = ev.attempt === 2
      ? { phase: "retry_ready", active_manager: ev.manager }
      : { phase: "idle", active_manager: null };
    await db.from("draft_state")
      .update({ ...back, locked_until: null, version: st.version + 1 })
      .eq("season", season);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "action must be undo or unlock" });
}