// src/pages/managers.jsx
import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import Layout from "../components/Layout";
import { nhlLogos } from "../constants/nhlLogos";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Fixed hex values matching the dark theme tokens — Recharts renders raw
// SVG, so CSS vars aren't available here. Same limitation as the original.
const CHART = {
  win: "#3ddc84",
  loss: "#ff6161",
  tie: "#f2b705",
  accent: "#3fc6ff",
  grid: "#1c3a52",
  surface: "#122a3d",
  border: "#3fc6ff",
};

export default function ManagerProfile() {
  const navigate = useNavigate();
  const { managerId } = useParams();

  const [manager, setManager] = useState(null);
  const [allManagers, setAllManagers] = useState([]);
  const [rows, setRows] = useState([]);
  const [h2hRows, setH2hRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [h2hOpen, setH2hOpen] = useState(false);
  const [seasonChartData, setSeasonChartData] = useState([]);
  const [currentSeasonStats, setCurrentSeasonStats] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: seasonData } = await supabase
        .from("pnpl_standings")
        .select("season")
        .order("season", { ascending: false })
        .limit(1)
        .single();

      if (!seasonData?.season) {
        setLoading(false);
        return;
      }
      const currentSeason = seasonData.season;

      const { data: managersData } = await supabase
        .from("managers")
        .select("id, name, discord_avatar_url")
        .order("name", { ascending: true });

      setAllManagers(managersData || []);

      let targetManager = null;

      if (managerId && managersData) {
        targetManager = managersData.find((m) => String(m.id) === String(managerId));
      }

      if (!targetManager) {
        const { data: activeManagers } = await supabase
          .from("pnpl_standings")
          .select("manager")
          .eq("season", currentSeason)
          .order("manager", { ascending: true });

        if (!activeManagers?.length) {
          setLoading(false);
          return;
        }

        const firstManagerName = activeManagers[0].manager;
        targetManager = managersData.find((m) => m.name === firstManagerName);

        if (targetManager) {
          navigate(`/managers/${targetManager.id}`, { replace: true });
        }
      }

      if (!targetManager) {
        setLoading(false);
        return;
      }

      setManager(targetManager);

      const { data: standingsData } = await supabase
        .from("pnpl_standings")
        .select("*")
        .eq("manager", targetManager.name)
        .order("season", { ascending: false });

      const mergedRows = (standingsData || []).map((r) => {
        const gp = r.w + r.l + (r.t || 0);
        const pts_percent = gp > 0 ? ((r.pts || 0) / (gp * 2)).toFixed(3) : "0.000";
        return {
          ...r,
          key: r.season + r.nhl_team,
          logo_url: nhlLogos[r.nhl_team?.toUpperCase()] || "/images/nhl-logos/default.webp",
          gp,
          pts_percent,
        };
      });

      const historyRowsDesc = [...mergedRows].sort((a, b) => b.season - a.season);
      setRows(historyRowsDesc);

      const currentSeasonRow = mergedRows.find((r) => r.season === currentSeason);
      setCurrentSeasonStats(
        currentSeasonRow || {
          notPlaying: true,
          gp: 0,
          w: 0,
          l: 0,
          t: 0,
          pts_percent: "0.000",
          gf: 0,
          ga: 0,
          gd: 0,
          season_rank: "-",
        }
      );

      const chartDataAsc = [...mergedRows]
        .sort((a, b) => a.season - b.season)
        .map((r) => ({
          season: r.season,
          W: r.w,
          L: r.l,
          T: r.t,
          nhlTeam: r.nhl_team,
          logo: nhlLogos[r.nhl_team?.toUpperCase()],
          champ: r.champ,
        }));

      setSeasonChartData(chartDataAsc);

      const { data: h2hData } = await supabase.rpc("get_h2h_stats", {
        p_manager_name: targetManager.name,
      });

      const avatarMap = {};
      (managersData || []).forEach((m) => {
        avatarMap[m.name.toLowerCase()] = m.discord_avatar_url;
      });

      setH2hRows(
        (h2hData || []).map((row) => ({
          key: row.opponent,
          opponent: row.opponent,
          avatar_url: avatarMap[row.opponent?.toLowerCase()] || null,
          GP: row.gp,
          W: row.w,
          L: row.l,
          T: row.t,
          PTS: row.pts,
          pts_percent: Number(row.pts_percent).toFixed(3),
          GF: row.gf,
          GA: row.ga,
          GD: row.gd,
        }))
      );

      setLoading(false);
    }

    loadData();
  }, [managerId, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="stats-loading">Loading…</div>
      </Layout>
    );
  }

  if (!manager) {
    return (
      <Layout>
        <div className="stats-loading manager-not-found">Manager not found</div>
      </Layout>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const order = ["W", "L", "T"];
    const orderedPayload = order.map((key) => payload.find((p) => p.dataKey === key)).filter(Boolean);

    return (
      <div className="manager-chart-tooltip">
        <div className="manager-chart-tooltip-title">{label}</div>
        {orderedPayload.map((p) => (
          <div key={p.dataKey} className="manager-chart-tooltip-row">
            <span>{p.dataKey}</span>
            <span>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const CustomXAxisWithTrophy = ({ x, y, payload }) => {
    if (!payload) return null;
    const seasonData = rows.find((r) => r.season === payload.value);
    if (!seasonData) return null;

    const logo = seasonData.logo_url;
    const isChamp = seasonData.champ;

    return (
      <g transform={`translate(${x},${y + 20})`} key={payload.value}>
        <text x={0} y={0} dy={0} textAnchor="middle" fill={CHART.accent} fontSize={12}>
          {payload.value}
        </text>

        {logo && (
  <g>
    {isChamp && (
      <rect
        x={-18}
        y={16}
        width={36}
        height={36}
        rx={6}
        ry={6}
        fill={CHART.surface}
        stroke="#f2b705"
        strokeWidth={2}
        filter="url(#glow)"
      />
    )}

    <image
      href={logo}
      x={-18}
      y={16}
      width={36}
      height={36}
    />

    {isChamp && (
      <text
        x={15}
        y={25}
        fontSize={16}
        textAnchor="middle"
      >
        🏆
      </text>
    )}
  </g>
)}
      </g>
    );
  };

  const CustomLegend = () => (
    <div className="manager-chart-legend">
      <span>
        <span className="manager-legend-swatch" style={{ background: CHART.win }} />W
      </span>
      <span>
        <span className="manager-legend-swatch" style={{ background: CHART.loss }} />L
      </span>
      <span>
        <span className="manager-legend-swatch" style={{ background: CHART.tie }} />T
      </span>
    </div>
  );

  return (
    <Layout>
      <div className="page">
        {/* Selector + avatar */}
        <div className="manager-hero">
          <img
            src={manager.discord_avatar_url}
            alt={manager.name}
            className="manager-hero-avatar"
          />
          <select
            className="manager-hero-select"
            value={manager.id}
            onChange={(e) => navigate(`/managers/${e.target.value}`)}
          >
            {allManagers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Current season snapshot */}
        {currentSeasonStats && (
          <div className="panel schedule-stats-panel manager-season-panel">
            <h2 className="manager-season-heading">
              {currentSeasonStats.notPlaying ? "Not Playing This Season" : "Current Season"}
              {!currentSeasonStats.notPlaying && currentSeasonStats.nhl_team && (
                <img
                  src={nhlLogos[currentSeasonStats.nhl_team?.toUpperCase()]}
                  alt={currentSeasonStats.nhl_team}
                  className={`manager-season-logo ${currentSeasonStats.champ ? "is-champ" : ""}`}
                />
              )}
            </h2>

            {!currentSeasonStats.notPlaying && (
              <>
                <div className="schedule-stat">
                  <div className="schedule-stat-value">{currentSeasonStats.season_rank}</div>
                  <div className="schedule-stat-label">Rank</div>
                </div>
                <div className="schedule-stat">
                  <div className="schedule-stat-value">{currentSeasonStats.gp}</div>
                  <div className="schedule-stat-label">GP</div>
                </div>
                <div className="schedule-stat">
                  <div className="schedule-stat-value">
                    {currentSeasonStats.w}-{currentSeasonStats.l}-{currentSeasonStats.t}
                  </div>
                  <div className="schedule-stat-label">W-L-T</div>
                </div>
                <div className="schedule-stat">
                  <div className="schedule-stat-value">{currentSeasonStats.pts_percent}</div>
                  <div className="schedule-stat-label">PTS%</div>
                </div>
                <div className="schedule-stat">
                  <div className="schedule-stat-value">{currentSeasonStats.gf}</div>
                  <div className="schedule-stat-label">GF</div>
                </div>
                <div className="schedule-stat">
                  <div className="schedule-stat-value">{currentSeasonStats.ga}</div>
                  <div className="schedule-stat-label">GA</div>
                </div>
                <div className="schedule-stat">
                  <div className="schedule-stat-value">{currentSeasonStats.gd}</div>
                  <div className="schedule-stat-label">GD</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Season trend chart */}
        <div className="panel manager-chart-panel">
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={seasonChartData} margin={{ top: 40, right: 20, left: 0, bottom: 60 }}>
              <defs>
                <linearGradient id="winGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.win} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={CHART.win} stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.loss} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={CHART.loss} stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="tieGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.tie} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART.tie} stopOpacity={0.1} />
                </linearGradient>
                <filter id="glow" height="200%" width="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f2b705" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="season" tick={<CustomXAxisWithTrophy />} interval={0} />
              <YAxis stroke={CHART.accent} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="W" stroke={CHART.win} fill="url(#winGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="L" stroke={CHART.loss} fill="url(#lossGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="T" stroke={CHART.tie} fill="url(#tieGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <CustomLegend />
        </div>

        {/* Season history */}
        <div className="manager-section">
          <button className="manager-toggle-btn" onClick={() => setHistoryOpen(!historyOpen)}>
            {historyOpen ? "Hide Season History" : "Show Season History"}
          </button>

          {historyOpen && (
            <div className="panel home-panel stats-table-panel">
              <div className="stats-table-scroll">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Team</th>
                      <th>GP</th>
                      <th>W</th>
                      <th>L</th>
                      <th>T</th>
                      <th>PTS</th>
                      <th>PTS%</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.season}</td>
                        <td>
                          <div className="manager-team-cell">
                            <img
                              src={row.logo_url}
                              alt={row.nhl_team}
                              className={`manager-team-logo ${row.champ ? "is-champ" : ""}`}
                            />
                            {row.champ && <span className="manager-champ-trophy">🏆</span>}
                          </div>
                        </td>
                        <td>{row.gp}</td>
                        <td>{row.w}</td>
                        <td>{row.l}</td>
                        <td>{row.t}</td>
                        <td>{row.pts}</td>
                        <td>{row.pts_percent}</td>
                        <td>{row.gf}</td>
                        <td>{row.ga}</td>
                        <td>{row.gd}</td>
                        <td>{row.season_rank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Head to head */}
        <div className="manager-section">
          <button className="manager-toggle-btn" onClick={() => setH2hOpen(!h2hOpen)}>
            {h2hOpen ? "Hide Head-to-Head" : "Show Head-to-Head"}
          </button>

          {h2hOpen && (
            <div className="panel home-panel stats-table-panel">
              <div className="stats-table-scroll">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Opponent</th>
                      <th>GP</th>
                      <th>W</th>
                      <th>L</th>
                      <th>T</th>
                      <th>PTS</th>
                      <th>PTS%</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h2hRows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ textAlign: "left" }}>
                          <div className="manager-opponent-cell">
                            {row.avatar_url && (
                              <img src={row.avatar_url} alt={row.opponent} className="manager-opponent-avatar" />
                            )}
                            <span>{row.opponent}</span>
                          </div>
                        </td>
                        <td>{row.GP}</td>
                        <td>{row.W}</td>
                        <td>{row.L}</td>
                        <td>{row.T}</td>
                        <td>{row.PTS}</td>
                        <td>{row.pts_percent}</td>
                        <td>{row.GF}</td>
                        <td>{row.GA}</td>
                        <td>{row.GD}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}