/* testing*/
import { createClient } from "@supabase/supabase-js";

export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const LEAD_MS = 1200;   // delay so every viewer receives the drop before it starts
export const BUFFER_MS = 1500; // extra lock time after the puck settles

export async function ensureState(season) {
  await db
    .from("draft_state")
    .upsert({ season }, { onConflict: "season", ignoreDuplicates: true });
  const { data } = await db.from("draft_state").select("*").eq("season", season).single();
  return data;
}

export const isBusy = (st) => !!st.locked_until && Date.parse(st.locked_until) > Date.now();