import { db } from "./lib.js";

const NHL_EMOJIS = {
  ANA: "<:NHLDucks:1398008027252002856>",
  BOS: "<:NHLBruins:1355923862528983141>",
  BUF: "<:NHLSabres:1355924171192008734>",
  CAL: "<:NHLFlames:1355924219124519074>",
  CGY: "<:NHLFlames:1355924219124519074>",
  CHI: "<:NHLBlackhawks:1355924264641106092>",
  DAL: "<:NHLStars:1355924768171360406>",
  DET: "<:NHLRedWings:1355924622469496902>",
  EDM: "<:NHLOilers:1355924672461406238>",
  FLA: "<:NHLPanthers:1355924822319824926>",
  HFD: "<:NHLWhalers:1355924921439752254>",
  LAK: "<:NHLKings:1401179110612533400>",
  MTL: "<:NHLCanadiens:1355925588908707961>",
  NJD: "<:NHLDevils:1355925606600278279>",
  NYI: "<:NHLIslanders:1355925619031932960>",
  NYR: "<:NHLRangers:1355925634232356865>",
  OTT: "<:NHLSenators:1355925770786308247>",
  PHI: "<:NHLFlyers:1355925798728765641>",
  PIT: "<:NHLPenguins:1398023491168763975>",
  QUE: "<:NHLNordiques:1398007404247122031>",
  SJS: "<:NHLSanJose:1355926534120145136>",
  STL: "<:NHLBlues:1355926552994381824>",
  TBL: "<:NHLLightning:1355926614361505894>",
  TOR: "<:NHLLeafs:1355926631021281410>",
  VAN: "<:NHLCanucks:1355926650017157190>",
  WSH: "<:NHLCapitals:1398022419171508264>",
  WPG: "<:NHLJets:1398021506008879185>",
};

function getAvatarUrl(mgr) {
  if (!mgr) return null;
  const raw = mgr.discord_avatar_url;
  if (raw && raw.startsWith("http")) return raw;
    if (raw && mgr.discord_id) {
    const ext = raw.startsWith("a_") ? "gif" : "png";
    return `https://discordapp.com{mgr.discord_id}/${raw}.${ext}?size=128`;
  }
  if (mgr.discord_id) {
    const idx = Number(BigInt(mgr.discord_id) >> 22n) % 6;
    return `https://discordapp.com{idx}.png`;
  }

  return null;
}

export async function notifyTurnStarted({ season, manager, req }) {
  const url = process.env.DISCORD_TEST_URL;
  if (!url) return;

  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const watchUrl = host ? `https://${host}/plinko` : "";

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `<@582240735793774618> 🚨 **${manager}** just clicked **Go** and is about to drop in **Season ${season} Team Plinko**!\n👀 Watch live: ${watchUrl}`,
        allowed_mentions: { parse: ["users"] },
      }),
    });
  } catch (err) {
    console.error("Discord turn webhook error:", err);
  }
}


export async function notifyTeamFinalized({ season, manager, team, req, delayMs = 0 }) {
  const url = process.env.DISCORD_TEST_URL;
  if (!url) return;

  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }

  try {
    const { data: mgr } = await db
      .from("managers")
      .select("discord_id, discord_avatar_url")
      .eq("name", manager)
      .maybeSingle();

    const avatarUrl = getAvatarUrl(mgr);
    const abbr = team?.toUpperCase() || "";
    const emoji = NHL_EMOJIS[abbr] || "🏒";

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `${emoji} **${manager}** locked in **${abbr}** for Season ${season}!`,
        embeds: [
          {
            title: `${manager} drafted ${abbr}`,
            description: `${emoji} Official Season ${season} Team Plinko selection`,
            color: 0x16a34a,
            thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Discord result webhook error:", err);
  }
}
