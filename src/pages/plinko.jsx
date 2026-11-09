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

// Lightweight Web Audio API sound effects (no external audio files needed)
function createSoundEngine() {
  let ctx = null;
  const ensureCtx = () => {
    if (!ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  };

  return {
    unlock: () => ensureCtx(),
    playPegHit: (pitchBoost = 0) => {
      const ac = ensureCtx();
      if (!ac) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      const baseFreq = 520 + Math.min(400, pitchBoost * 18);
      osc.frequency.setValueAtTime(baseFreq, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.055);
      gain.gain.setValueAtTime(0.14, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.055);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.06);
    },
    playLanded: () => {
      const ac = ensureCtx();
      if (!ac) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        const t0 = ac.currentTime + idx * 0.075;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.16, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.3);
      });
    },
  };
}

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
  const [soundEnabled, setSoundEnabled] = useState(true);

  const canvasRef = useRef(null);
  const imagesRef = useRef({});
  const soundRef = useRef(null);
  const soundStateRef = useRef({ eventId: null, lastTickMs: 0, prevVxSign: 0, landedPlayed: false });
  const pegs = useMemo(() => buildPegs(), []);

  if (!soundRef.current) soundRef.current = createSoundEngine();
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
  if (
    (draftState?.phase === "ready" || draftState?.phase === "retry_ready") &&
    Array.isArray(draftState?.bin_order) &&
    draftState.bin_order.length === availableTeams.length
  ) {
    return draftState.bin_order;
  }
  return availableTeams;
}, [latestEvent, isAnimating, draftState?.phase, draftState?.bin_order, availableTeams]);

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
                draftState?.phase === "deciding" &&
                latestEvent.manager === draftState?.active_manager &&
                latestEvent.landed_team === teamAbbr
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
            const iconSize = Math.min(binW - 3, 46);
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

          if (soundStateRef.current.eventId !== latestEvent.id) {
            soundStateRef.current = {
              eventId: latestEvent.id,
              lastTickMs: 0,
              prevVxSign: 0,
              landedPlayed: now >= eventEndMs,
            };
          }

          if (now <= eventStartMs) {
            puckX = traj[0];
            puckY = traj[1];
            puckAngle = traj[2];
          } else if (now >= eventEndMs) {
            const last = (totalFrames - 1) * 3;
            puckX = traj[last];
            puckY = traj[last + 1];
            puckAngle = traj[last + 2];
            if (soundEnabled && !soundStateRef.current.landedPlayed && now - eventEndMs < 1000) {
              soundStateRef.current.landedPlayed = true;
              soundRef.current.playLanded();
            }
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

            // Trigger subtle peg bounce sound when horizontal velocity flips sign
            const vx = traj[i1] - traj[i0];
            const vxSign = Math.abs(vx) > 0.25 ? Math.sign(vx) : 0;
            if (
              soundEnabled &&
              vxSign !== 0 &&
              vxSign !== soundStateRef.current.prevVxSign &&
              now - soundStateRef.current.lastTickMs > 75 &&
              puckY < BIN_TOP
            ) {
              soundStateRef.current.lastTickMs = now;
              soundRef.current.playPegHit(Math.floor(puckY / 45));
            }
            if (vxSign !== 0) soundStateRef.current.prevVxSign = vxSign;
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
    soundEnabled,
  ]);

  async function handleDrop() {
    if (!selectedManager || submitting) return;
    soundRef.current.unlock();
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
    soundRef.current.unlock();
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
    soundRef.current.unlock();
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = BOARD.W / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    setDropX(Math.max(30, Math.min(BOARD.W - 30, Math.round(clickX))));
  }
   const isBoardBusy =
    isAnimating ||
    (draftState?.phase === "dropping" &&
      draftState?.locked_until &&
      Date.parse(draftState.locked_until) > serverNow);

  const isClaimExpired =
    draftState?.phase === "ready" &&
    (!draftState?.locked_until || Date.parse(draftState.locked_until) <= serverNow);

  const activeTurnManager =
    draftState?.phase === "idle" || isClaimExpired ? null : draftState?.active_manager;

  // Step 1: Can click "Go" only when board is idle (or previous Go timed out)
  const canClaimGo = (mgrName) =>
    !finalizedByManager[mgrName] &&
    !isBoardBusy &&
    (draftState?.phase === "idle" || isClaimExpired);

  // Step 2: Can aim & click "Drop Puck" only for the manager who clicked Go (or Retry)
  const canReleasePuck = (mgrName) =>
    !finalizedByManager[mgrName] &&
    !isBoardBusy &&
    ((draftState?.phase === "ready" && !isClaimExpired && draftState?.active_manager === mgrName) ||
      (draftState?.phase === "retry_ready" && draftState?.active_manager === mgrName));

  const isDecidingFor = (mgrName) =>
    draftState?.phase === "deciding" &&
    draftState?.active_manager === mgrName &&
    !isAnimating;

  async function handleClaimGo(mgrName) {
    if (submitting || !canClaimGo(mgrName)) return;
    soundRef.current.unlock();
    setSelectedManager(mgrName);
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(API_BASE + "/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, manager: mgrName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not claim turn");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReleaseDrop(mgrName) {
    if (submitting || !canReleasePuck(mgrName)) return;
    soundRef.current.unlock();
    setSelectedManager(mgrName);
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(API_BASE + "/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, manager: mgrName, dropX }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to drop puck");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRowDecision(mgrName, decision) {
    if (submitting || !isDecidingFor(mgrName)) return;
    soundRef.current.unlock();
    setSelectedManager(mgrName);
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(API_BASE + "/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, manager: mgrName, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit decision");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }
  const activeAimingManager =
    activeTurnManager && canReleasePuck(activeTurnManager) ? activeTurnManager : null;

  return (
    <Layout>
      <div
        className="page plinko-draft-page"
        style={{
          maxWidth: "1640px",
          width: "100%",
          margin: "0 auto",
          padding: "0.75rem 1.25rem 1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(340px, 420px) minmax(0, 1fr)",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h1 className="home-hero-title" style={{ margin: 0, fontSize: "1.65rem" }}>
                Team Plinko
              </h1>
              <button
                type="button"
                onClick={() => {
                  soundRef.current.unlock();
                  setSoundEnabled((v) => !v);
                }}
                style={{
                  padding: "0.35rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#f8fafc",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                {soundEnabled ? "🔊 Sound On" : "🔇 Muted"}
              </button>
            </div>

            <div className="panel home-panel" style={{ padding: "0.75rem 0.9rem" }}>
              <div style={{ fontSize: "0.88rem", marginBottom: activeAimingManager ? "0.55rem" : 0 }}>
                {isAnimating && (
                  <strong>
                    LIVE: {latestEvent.manager} dropping (#{latestEvent.attempt})...
                  </strong>
                )}
                {!isAnimating && draftState?.phase === "deciding" && (
                  <strong>
                    {draftState.active_manager} landed on {latestEvent?.landed_team} — keep or
                    retry?
                  </strong>
                )}
                {!isAnimating && activeAimingManager && (
                  <strong>
                    🎯 {activeAimingManager} is up! Aim your puck on the board, then click Drop!
                  </strong>
                )}
                {!isAnimating && !activeTurnManager && (
                  <span>Click <strong>Go</strong> next to your name when you are ready to drop!</span>
                )}
              </div>

              {activeAimingManager && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
                    <span style={{ opacity: 0.85, whiteSpace: "nowrap" }}>Aim ({dropX}px):</span>
                    <input
                    type="range"
                    min={30}
                    max={BOARD.W - 30}
                    value={dropX}
                    disabled={submitting || !activeAimingManager}
                    onChange={(e) => setDropX(Number(e.target.value))}
                    style={{ width: "100%" }}
                    />

                  </div>
                  <button
                    type="button"
                    onClick={() => handleReleaseDrop(activeAimingManager)}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      padding: "0.6rem 1rem",
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: "0.95rem",
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    {draftState?.phase === "retry_ready"
                      ? "Drop 2nd Puck (Final)"
                      : "Drop Puck"}
                  </button>
                </div>
              )}

              {errorMsg && (
                <div style={{ color: "#ef4444", marginTop: "0.4rem", fontSize: "0.85rem", fontWeight: "bold" }}>
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="panel home-panel" style={{ padding: "0.85rem" }}>
              <h2 className="home-panel-title" style={{ marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                Season {season} Managers ({Object.keys(finalizedByManager).length}/{participants.length})
              </h2>
              <div
                className="home-standings-list"
                style={{ maxHeight: "calc(100vh - 285px)", overflowY: "auto" }}
              >
                {participants.map((p, idx) => {
                  const assignedTeam = finalizedByManager[p.manager];
                  const mgr = managersMap[p.manager];
                  const showGo = canClaimGo(p.manager);
                  const showDecide = isDecidingFor(p.manager);
                  const isCurrentTurn = activeTurnManager === p.manager;

                  return (
                    <div
                      className="home-standings-row"
                      key={p.manager}
                      style={{
                        padding: "0.4rem 0.5rem",
                        gap: "0.5rem",
                        background: isCurrentTurn ? "rgba(37, 99, 235, 0.2)" : undefined,
                        borderRadius: "6px",
                      }}
                    >
                      <span className="home-standings-rank">{p.draft_position ?? idx + 1}</span>
                      {mgr?.discord_avatar_url && (
                        <ManagerAvatar
                          src={mgr.discord_avatar_url}
                          discordId={mgr.discord_id}
                          alt={p.manager}
                          className="game-row-avatar"
                        />
                      )}
                      <span className="home-standings-name" style={{ flex: 1 }}>
                        {p.manager}
                      </span>

                      {assignedTeam ? (
                        <TeamBadge team={assignedTeam} size="md" />
                      ) : showDecide ? (
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button
                            type="button"
                            onClick={() => handleRowDecision(p.manager, "keep")}
                            disabled={submitting}
                            style={{
                              padding: "0.3rem 0.55rem",
                              background: "#16a34a",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "0.78rem",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                            }}
                          >
                            Keep {latestEvent?.landed_team}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRowDecision(p.manager, "retry")}
                            disabled={submitting}
                            style={{
                              padding: "0.3rem 0.55rem",
                              background: "#dc2626",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "0.78rem",
                              border: "none",
                              borderRadius: "5px",
                              cursor: "pointer",
                            }}
                          >
                            Retry
                          </button>
                        </div>
                      ) : isCurrentTurn ? (
                        <span
                          style={{
                            padding: "0.25rem 0.55rem",
                            background: "#2563eb",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            borderRadius: "5px",
                          }}
                        >
                          Dropping...
                        </span>
                      ) : showGo ? (
                        <button
                          type="button"
                          onClick={() => handleClaimGo(p.manager)}
                          disabled={submitting}
                          style={{
                            padding: "0.32rem 0.75rem",
                            background: "#2563eb",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: "0.82rem",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                          }}
                        >
                          Go
                        </button>
                      ) : (
                        <span style={{ opacity: 0.45, fontSize: "0.78rem" }}>Locked</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="panel home-panel"
            style={{
              padding: "0.65rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <canvas
              ref={canvasRef}
              width={BOARD.W}
              height={BOARD.H}
              onClick={handleCanvasClick}
              style={{
                width: "auto",
                maxWidth: "100%",
                height: "calc(100vh - 95px)",
                display: "block",
                borderRadius: "8px",
                cursor: activeAimingManager ? "crosshair" : "default",
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
