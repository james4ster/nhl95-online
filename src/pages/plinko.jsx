import React, { useEffect, useRef, useState, useMemo } from "react";
import Layout from "../components/Layout";
import TeamBadge from "../components/TeamBadge";
import ManagerAvatar from "../components/ManagerAvatar";
import { nhlLogos, defaultTeamLogo } from "../constants/nhlLogos";
import { supabase } from "../utils/supabaseClient";
import { BOARD, FRAME_MS, buildPegs } from "../utils/plinkoLayout";

const API_BASE = "/api";

const getTeamLogoUrl = (teamAbbr) =>
  nhlLogos[teamAbbr?.toUpperCase?.()] || nhlLogos[teamAbbr] || defaultTeamLogo;

const resolveDiscordAvatar = (mgr) => {
  if (!mgr) return null;
  const raw = mgr.discord_avatar_url;
  if (raw && raw.startsWith("http")) return raw;
  if (raw && mgr.discord_id) {
    const ext = raw.startsWith("a_") ? "gif" : "png";
    return "https://discordapp.com" + mgr.discord_id + "/" + raw + "." + ext + "?size=128";
  }
  if (mgr.discord_id) {
    const idx = Number(BigInt(mgr.discord_id) >> 22n) % 6;
    return "https://discordapp.com" + idx + ".png";
  }
  return null;
};

export default function PlinkoDraftPage() {
  const [season, setSeason] = useState(null);
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [managersMap, setManagersMap] = useState({});
  const [events, setEvents] = useState([]);
  const [draftState, setDraftState] = useState(null);

  const [selectedManager, setSelectedManager] = useState("");
  const [dropX, setDropX] = useState(BOARD.W / 2);
  const [clockOffset, setClockOffset] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef(null);
  const imagesRef = useRef({});
  const pegs = useMemo(() => buildPegs(), []);

  const getCachedImage = (url) => {
    if (!url) return null;
    if (!imagesRef.current[url]) {
      const img = new Image();
      img.src = url;
      imagesRef.current[url] = img;
    }
    return imagesRef.current[url].complete && imagesRef.current[url].naturalWidth > 0
      ? imagesRef.current[url]
      : null;
  };

    useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const t0 = Date.now();
        const res = await fetch(API_BASE + "/time");
        const { now } = await res.json();
        const rtt = Date.now() - t0;
        if (mounted && now) setClockOffset(now - (Date.now() - rtt / 2));
      } catch (e) {
        console.warn("Clock sync fallback:", e);
      }

      const { data: currentSeason } = await supabase
        .from("seasons")
        .select("season")
        .order("season", { ascending: false })
        .limit(1)
        .single();

      const activeSeason = currentSeason?.season;
      if (!activeSeason || !mounted) return;
      setSeason(activeSeason);

      const [teamsRes, partRes, mgrRes, evRes, stateRes] = await Promise.all([
        supabase.from("draft_teams").select("nhl_team").eq("season", activeSeason),
        supabase
          .from("draft_participants")
          .select("*")
          .eq("season", activeSeason)
          .order("draft_position", { ascending: true }),
        supabase.from("managers").select("name, discord_id, discord_avatar_url"),
        supabase
          .from("draft_events")
          .select("*")
          .eq("season", activeSeason)
          .order("id", { ascending: true }),
        supabase.from("draft_state").select("*").eq("season", activeSeason).maybeSingle(),
      ]);

      if (!mounted) return;

      const teamList = (teamsRes.data || []).map((t) => t.nhl_team);
      setTeams(teamList);
      teamList.forEach((abbr) => getCachedImage(getTeamLogoUrl(abbr)));

      setParticipants(partRes.data || []);

      const mMap = {};
      (mgrRes.data || []).forEach((m) => {
        mMap[m.name] = m;
        const avatar = resolveDiscordAvatar(m);
        if (avatar) getCachedImage(avatar);
      });
      setManagersMap(mMap);

      setEvents(evRes.data || []);
      setDraftState(stateRes.data || { season: activeSeason, phase: "idle" });
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!season) return;

    const channel = supabase
      .channel("plinko-draft-" + season)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_events", filter: "season=eq." + season },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEvents((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setEvents((prev) => prev.map((e) => (e.id === payload.new.id ? payload.new : e)));
          } else if (payload.eventType === "DELETE") {
            setEvents((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_state", filter: "season=eq." + season },
        (payload) => {
          if (payload.new) setDraftState(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [season]);

  const latestEvent = events[events.length - 1] || null;
  const finalizedByManager = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (e.is_final) map[e.manager] = e.landed_team;
    });
    return map;
  }, [events]);

  const takenTeams = useMemo(() => new Set(Object.values(finalizedByManager)), [finalizedByManager]);
  const availableTeams = useMemo(() => teams.filter((t) => !takenTeams.has(t)), [teams, takenTeams]);

  const serverNow = nowTick + clockOffset;
  const eventStartMs = latestEvent ? Date.parse(latestEvent.started_at) : 0;
  const eventEndMs = latestEvent ? eventStartMs + latestEvent.duration_ms : 0;
  const isAnimating = latestEvent && serverNow < eventEndMs;

  const activeBins = useMemo(() => {
    if (latestEvent && (isAnimating || draftState?.phase === "deciding")) {
      return latestEvent.bin_order;
    }
    return availableTeams;
  }, [latestEvent, isAnimating, draftState?.phase, availableTeams]);
  useEffect(() => {
    let rafId;

    const render = () => {
      const now = Date.now() + clockOffset;
      setNowTick(Date.now());

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const { W, H, BIN_TOP, PUCK_R, PEG_R, DROP_Y } = BOARD;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#0b1324";
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(30, DROP_Y);
        ctx.lineTo(W - 30, DROP_Y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#e2e8f0";
        for (const p of pegs) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2);
          ctx.fill();
        }

        const n = activeBins.length;
        if (n > 0) {
          const binW = W / n;
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, BIN_TOP);
          ctx.lineTo(W, BIN_TOP);
          ctx.stroke();

          for (let i = 0; i < n; i++) {
            const x0 = i * binW;
            const teamAbbr = activeBins[i];

            ctx.fillStyle = i % 2 === 0 ? "rgba(30, 41, 59, 0.55)" : "rgba(15, 23, 42, 0.55)";
            ctx.fillRect(x0, BIN_TOP, binW, H - BIN_TOP);

            if (
              latestEvent &&
              now >= eventEndMs &&
              latestEvent.landed_team === teamAbbr &&
              (isAnimating || draftState?.phase === "deciding")
            ) {
              ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
              ctx.fillRect(x0, BIN_TOP, binW, H - BIN_TOP);
            }

            if (i > 0) {
              ctx.strokeStyle = "#475569";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x0, BIN_TOP);
              ctx.lineTo(x0, H);
              ctx.stroke();
            }

            const logoImg = getCachedImage(getTeamLogoUrl(teamAbbr));
            const iconSize = Math.min(binW - 3, 44);
            const cx = x0 + binW / 2;
            const cy = BIN_TOP + (H - BIN_TOP) / 2;

            if (logoImg && iconSize >= 14) {
              ctx.drawImage(logoImg, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
            } else {
              ctx.fillStyle = "#f8fafc";
              ctx.font = "bold 10px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(teamAbbr, cx, cy);
            }
          }
        }

        let puckX = dropX;
        let puckY = DROP_Y;
        let puckAngle = 0;
        let activeMgr = selectedManager;

        const showEventPuck =
          latestEvent && (now < eventEndMs + 2500 || draftState?.phase === "deciding");

        if (showEventPuck) {
          activeMgr = latestEvent.manager;
          const traj = latestEvent.trajectory;
          const totalFrames = traj.length / 3;

          if (now <= eventStartMs) {
            puckX = traj[0];
            puckY = traj[1];
            puckAngle = traj[2];
          } else if (now >= eventEndMs) {
            const last = (totalFrames - 1) * 3;
            puckX = traj[last];
            puckY = traj[last + 1];
            puckAngle = traj[last + 2];
          } else {
            const exactFrame = (now - eventStartMs) / FRAME_MS;
            const f0 = Math.min(totalFrames - 1, Math.floor(exactFrame));
            const f1 = Math.min(totalFrames - 1, f0 + 1);
            const alpha = exactFrame - f0;

            const i0 = f0 * 3;
            const i1 = f1 * 3;
            puckX = traj[i0] + (traj[i1] - traj[i0]) * alpha;
            puckY = traj[i0 + 1] + (traj[i1 + 1] - traj[i0 + 1]) * alpha;
            puckAngle = traj[i0 + 2] + (traj[i1 + 2] - traj[i0 + 2]) * alpha;
          }
        }

        if (activeMgr) {
          ctx.save();
          ctx.translate(puckX, puckY);
          ctx.rotate(puckAngle);

          ctx.beginPath();
          ctx.arc(0, 0, PUCK_R, 0, Math.PI * 2);
          ctx.fillStyle = "#38bdf8";
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          const avatarUrl = resolveDiscordAvatar(managersMap[activeMgr]);
          const avatarImg = getCachedImage(avatarUrl);
          if (avatarImg) {
            ctx.beginPath();
            ctx.arc(0, 0, PUCK_R - 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
              avatarImg,
              -(PUCK_R - 2),
              -(PUCK_R - 2),
              (PUCK_R - 2) * 2,
              (PUCK_R - 2) * 2
            );
          } else {
            ctx.fillStyle = "#0f172a";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(activeMgr.slice(0, 2).toUpperCase(), 0, 0);
          }
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [
    clockOffset,
    pegs,
    activeBins,
    latestEvent,
    eventStartMs,
    eventEndMs,
    isAnimating,
    draftState?.phase,
    dropX,
    selectedManager,
    managersMap,
  ]);

  async function handleDrop() {
    if (!selectedManager || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(API_BASE + "/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, manager: selectedManager, dropX }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to drop puck");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(decision) {
    if (!selectedManager || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(API_BASE + "/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, manager: selectedManager, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit decision");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCanvasClick(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = BOARD.W / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    setDropX(Math.max(30, Math.min(BOARD.W - 30, Math.round(clickX))));
  }
  const selectedParticipant = participants.find((p) => p.manager === selectedManager);
  const alreadyHasTeam = !!finalizedByManager[selectedManager];
  const isBoardBusy =
    isAnimating || (draftState?.locked_until && Date.parse(draftState.locked_until) > serverNow);

  const canDrop =
    selectedManager &&
    !alreadyHasTeam &&
    !isBoardBusy &&
    (draftState?.phase === "idle" ||
      (draftState?.phase === "retry_ready" && draftState?.active_manager === selectedManager));

  const showDecisionButtons =
    draftState?.phase === "deciding" &&
    draftState?.active_manager === selectedManager &&
    !isAnimating;

  return (
    <Layout>
      <div
        className="page plinko-draft-page"
        style={{ maxWidth: "1520px", width: "100%", margin: "0 auto", padding: "0 1.25rem 2rem" }}
      >
        <div className="home-hero" style={{ marginBottom: "1rem" }}>
          <h1 className="home-hero-title">Season {season} NHL Team Draft</h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2.3fr) minmax(320px, 1fr)",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
          <div className="panel home-panel" style={{ padding: "0.75rem" }}>
            <canvas
              ref={canvasRef}
              width={BOARD.W}
              height={BOARD.H}
              onClick={handleCanvasClick}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "8px",
                cursor: canDrop ? "crosshair" : "default",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="panel home-panel" style={{ padding: "1.1rem" }}>
              <h2 className="home-panel-title" style={{ marginBottom: "0.75rem" }}>
                Drop Controls
              </h2>

              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
                Select Manager
              </label>
              <select
                value={selectedManager}
                onChange={(e) => {
                  setSelectedManager(e.target.value);
                  setErrorMsg("");
                }}
                style={{ width: "100%", padding: "0.55rem", borderRadius: "6px", marginBottom: "0.85rem" }}
              >
                <option value="">-- Choose Your Name --</option>
                {participants.map((p) => (
                  <option
                    key={p.manager}
                    value={p.manager}
                    disabled={!!finalizedByManager[p.manager]}
                  >
                    {p.manager}
                    {finalizedByManager[p.manager]
                      ? " (" + finalizedByManager[p.manager] + ")"
                      : p.has_retry
                      ? " [Has Retry]"
                      : ""}
                  </option>
                ))}
              </select>

              {selectedManager && !alreadyHasTeam && (
                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                    Drop Position (or click board): <strong>{dropX}px</strong>
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={BOARD.W - 30}
                    value={dropX}
                    onChange={(e) => setDropX(Number(e.target.value))}
                    disabled={!canDrop}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {canDrop && (
                <button
                  onClick={handleDrop}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "#2563eb",
                    color: "#fff",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {draftState?.phase === "retry_ready" ? "Drop 2nd Puck (Final)" : "Drop Puck"}
                </button>
              )}

              {showDecisionButtons && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleDecision("keep")}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: "1rem",
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Keep {latestEvent?.landed_team}
                  </button>
                  <button
                    onClick={() => handleDecision("retry")}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: "0.95rem",
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Try Again (Must Keep 2nd!)
                  </button>
                </div>
              )}

              <div
                style={{
                  marginTop: "0.85rem",
                  padding: "0.65rem",
                  borderRadius: "6px",
                  background: "rgba(15, 23, 42, 0.55)",
                  fontSize: "0.9rem",
                }}
              >
                {isAnimating && (
                  <strong>
                    LIVE: {latestEvent.manager} is dropping (Attempt #{latestEvent.attempt})...
                  </strong>
                )}
                {!isAnimating && draftState?.phase === "deciding" && (
                  <strong>
                    {draftState.active_manager} landed on {latestEvent?.landed_team} — deciding
                    whether to keep or retry...
                  </strong>
                )}
                {!isAnimating && draftState?.phase === "retry_ready" && (
                  <strong>
                    {draftState.active_manager} opted for a retry! Waiting for their 2nd drop...
                  </strong>
                )}
                {!isAnimating && draftState?.phase === "idle" && (
                  <span>Board is open. Select your name to drop!</span>
                )}
                {selectedParticipant && !alreadyHasTeam && (
                  <div style={{ marginTop: "0.35rem", opacity: 0.85 }}>
                    Retry token: <strong>{selectedParticipant.has_retry ? "Yes" : "No"}</strong>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div style={{ color: "#ef4444", marginTop: "0.5rem", fontWeight: "bold" }}>
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="panel home-panel">
              <h2 className="home-panel-title">
                Draft Results ({Object.keys(finalizedByManager).length}/{participants.length})
              </h2>
              <div className="home-standings-list">
                {participants.map((p, idx) => {
                  const assignedTeam = finalizedByManager[p.manager];
                  const mgr = managersMap[p.manager];
                  return (
                    <div className="home-standings-row" key={p.manager}>
                      <span className="home-standings-rank">{p.draft_position ?? idx + 1}</span>
                      {mgr?.discord_avatar_url && (
                        <ManagerAvatar
                          src={mgr.discord_avatar_url}
                          discordId={mgr.discord_id}
                          alt={p.manager}
                          className="game-row-avatar"
                        />
                      )}
                      <span className="home-standings-name">{p.manager}</span>
                      {assignedTeam ? (
                        <TeamBadge team={assignedTeam} size="lg" />
                      ) : (
                        <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>
                          {p.has_retry ? "Pending (2x)" : "Pending"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
