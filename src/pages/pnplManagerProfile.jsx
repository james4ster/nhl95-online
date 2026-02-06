// src/pages/ManagerProfile.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";
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

      // 1️⃣ Current season
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

      // 2️⃣ All managers (dropdown)
      const { data: managersData } = await supabase
        .from("managers")
        .select("id, name, discord_avatar_url")
        .order("name", { ascending: true });

      setAllManagers(managersData || []);

      // 3️⃣ Determine target manager
      let targetManager = null;

      if (managerId && managersData) {
        targetManager = managersData.find(m => String(m.id) === String(managerId));
      }

      if (!targetManager) {
        // First alphabetical manager playing this season
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
        targetManager = managersData.find(m => m.name === firstManagerName);

        if (targetManager) {
          navigate(`/manager/${targetManager.id}`, { replace: true });
        }
      }

      if (!targetManager) {
        setLoading(false);
        return;
      }

      setManager(targetManager);

      // 4️⃣ Season history
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
          logo_url: nhlLogos[r.nhl_team?.toUpperCase()] || "/images/nhl-logos/default.png",
          gp,
          pts_percent,
        };
      });

      const historyRowsDesc = [...mergedRows].sort(
        (a, b) => b.season - a.season
      );
      
      setRows(historyRowsDesc);

      // 5️⃣ Current season card
      const currentSeasonRow = mergedRows.find(r => r.season === currentSeason);

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

      // 6️⃣ Chart data
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

      // 7️⃣ Head-to-head
      const { data: h2hData } = await supabase.rpc("get_h2h_stats", {
        p_manager_name: targetManager.name,
      });

      const avatarMap = {};
      (managersData || []).forEach(m => {
        avatarMap[m.name.toLowerCase()] = m.discord_avatar_url;
      });

      setH2hRows(
        (h2hData || []).map(row => ({
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
        <div style={{ padding: "80px", textAlign: "center", color: "#00FFFF" }}>
          Loading…
        </div>
      </Layout>
    );
  }

  if (!manager) {
    return (
      <Layout>
        <div style={{ padding: "80px", textAlign: "center", color: "#FF5555" }}>
          Manager not found
        </div>
      </Layout>
    );
  }

  // ⬇️ EVERYTHING BELOW IS UNCHANGED ⬇️


  // Tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const order = ["W", "L", "T"];
    const orderedPayload = order.map((key) => payload.find((p) => p.dataKey === key)).filter(Boolean);

    return (
      <div style={{ backgroundColor: "#001F2F", border: "1px solid #00FFFF", padding: "8px", color: "#00FFFF" }}>
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{label}</div>
        {orderedPayload.map((p) => (
          <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
            <span>{p.dataKey}</span>
            <span>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // XAxis with logos + trophy
  const CustomXAxisWithTrophy = ({ x, y, payload }) => {
    if (!payload) return null;
    const seasonData = rows.find((r) => r.season === payload.value);
    if (!seasonData) return null;

    const logo = seasonData.logo_url;
    const isChamp = seasonData.champ;

    return (
      <g transform={`translate(${x},${y + 20})`} key={payload.value}>
        <text x={0} y={0} dy={0} textAnchor="middle" fill="#00FFFF" fontSize={12}>
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
                fill="#091421"
                stroke="gold"
                strokeWidth={2}
                filter="url(#glow)"
              />
            )}
            <image href={logo} x={-18} y={16} width={36} height={36} />
            {isChamp && (
              <image
                href="/images/goldTrophy.png"
                x={-18 + 36 - 22}
                y={16 - 6}
                width={28}
                height={28}
              />
            )}
          </g>
        )}
      </g>
    );
  };

  const CustomLegend = () => (
    <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "8px", color: "#00FFFF" }}>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ width: "12px", height: "12px", background: "#00FF00" }}></div>W
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ width: "12px", height: "12px", background: "#FF5555" }}></div>L
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ width: "12px", height: "12px", background: "#FFFF00" }}></div>T
      </span>
    </div>
  );

  return (
    <Layout>
      {/* Manager selection dropdown + hero card */}
      <div style={{ position: "relative", flex: 1, minWidth: 300, marginBottom: "24px" }}>
        <select
          value={manager.id}
          onChange={(e) => navigate(`/manager/${e.target.value}`)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            cursor: "pointer",
            width: "100%",
            padding: "16px 40px 16px 120px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #0E3C5F, #091421)",
            boxShadow: "0 6px 24px rgba(0,255,255,0.25)",
            color: "#00FFFF",
            fontSize: "1.2rem",
            fontWeight: "bold",
          }}
        >
          {allManagers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Avatar on left */}
        {manager && (
          <img
            src={manager.discord_avatar_url}
            alt={manager.name}
            style={{
              position: "absolute",
              top: "50%",
              left: "16px",
              transform: "translateY(-50%)",
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              border: "2px solid #00FFFF",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Dropdown arrow on right */}
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="#00FFFF"
          style={{
            position: "absolute",
            top: "50%",
            right: "16px",
            pointerEvents: "none",
            transform: "translateY(-50%)",
          }}
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </div>

   


      {/* Current Season Stats Card */}
      {currentSeasonStats && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px",
          borderRadius: "14px",
          background: "linear-gradient(135deg, #0E3C5F, #091421)",
          boxShadow: "0 6px 24px rgba(0,255,255,0.25)",
          minWidth: 220,
          flex: 1,
          marginBottom: "32px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <h2 style={{ color: "#00FFFF", margin: 0 }}>
              {currentSeasonStats.notPlaying ? "Not Playing This Season" : "Current Season"}
            </h2>
            {!currentSeasonStats.notPlaying && currentSeasonStats.nhl_team && (
              <img
                src={nhlLogos[currentSeasonStats.nhl_team?.toUpperCase()]}
                alt={currentSeasonStats.nhl_team}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "6px",
                  boxShadow: currentSeasonStats.champ ? "0 0 12px gold" : "none",
                }}
              />
            )}
          </div>

          {!currentSeasonStats.notPlaying && (
            <div style={{ display: "flex", justifyContent: "space-around", width: "100%", gap: "12px", marginBottom: "12px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#00FFFF" }}>Rank</div>
                <div>{currentSeasonStats.season_rank}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#00FFFF" }}>GP</div>
                <div>{currentSeasonStats.gp}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#00FFFF" }}>W-L-T</div>
                <div>{`${currentSeasonStats.w}-${currentSeasonStats.l}-${currentSeasonStats.t}`}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#00FFFF" }}>PTS%</div>
                <div>{currentSeasonStats.pts_percent}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#00FFFF" }}>GF</div>
                <div>{currentSeasonStats.gf}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#00FFFF" }}>GA</div>
                <div>{currentSeasonStats.ga}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", color: "#00FFFF" }}>GD</div>
                <div>{currentSeasonStats.gd}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEASON TREND CHART */}
      <div style={{ marginTop: "32px", marginBottom: "48px", height: "400px", width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={seasonChartData} margin={{ top: 40, right: 20, left: 0, bottom: 60 }}>
            <defs>
              <linearGradient id="winGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF00" stopOpacity={0.6}/>
                <stop offset="100%" stopColor="#00FF00" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF5555" stopOpacity={0.6}/>
                <stop offset="100%" stopColor="#FF5555" stopOpacity={0.2}/>
              </linearGradient>
              <filter id="glow" height="200%" width="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="gold" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#004466" />
            <XAxis dataKey="season" tick={<CustomXAxisWithTrophy />} interval={0} />
            <YAxis stroke="#00FFFF" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="W" stroke="#00FF00" fill="url(#winGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="L" stroke="#FF5555" fill="url(#lossGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="T" stroke="#FFFF00" fill="rgba(255,255,0,0.3)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <CustomLegend />
      </div>

      {/* SEASON HISTORY TABLE */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          style={{
            background: "linear-gradient(135deg, #0E3C5F, #091421)",
            color: "#00FFFF",
            border: "2px solid #00FFFF",
            borderRadius: "8px",
            padding: "8px 16px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          {historyOpen ? "Hide Season History" : "Show Season History"}
        </button>

        {historyOpen && (
          <PnplTable
            columns={[
              { key: "season", label: "Season" },
              {
                key: "team_display",
                label: "Team",
                render: (row) => (
                  <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", height: "48px" }}>
                    <div style={{ position: "relative" }}>
                      <img
                        src={row.logo_url}
                        alt={row.nhl_team}
                        style={{
                          width: "36px",
                          height: "36px",
                          objectFit: "contain",
                          border: row.champ ? "2px solid gold" : "none",
                          boxShadow: row.champ ? "0 0 12px gold" : "none",
                          borderRadius: "6px",
                        }}
                      />
                      {row.champ && (
                        <img
                          src="/images/goldTrophy.png"
                          alt="Championship"
                          title="Won the championship this season!"
                          style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-6px",
                            width: "28px",
                            height: "28px",
                            filter: "drop-shadow(0 0 4px gold)",
                          }}
                        />
                      )}
                    </div>
                  </div>
                ),
              },
              { key: "gp", label: "GP" },
              { key: "w", label: "W" },
              { key: "l", label: "L" },
              { key: "t", label: "T" },
              { key: "pts", label: "PTS" },
              { key: "pts_percent", label: "PTS%" },
              { key: "gf", label: "GF" },
              { key: "ga", label: "GA" },
              { key: "gd", label: "GD" },
              { key: "season_rank", label: "Rank" },
            ]}
            data={rows}
            numericColumns={["gp","w","l","t","pts","pts_percent","gf","ga","gd","season_rank"]}
          />
        )}
      </div>

      {/* HEAD TO HEAD TABLE */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => setH2hOpen(!h2hOpen)}
          style={{
            background: "linear-gradient(135deg, #0E3C5F, #091421)",
            color: "#00FFFF",
            border: "2px solid #00FFFF",
            borderRadius: "8px",
            padding: "8px 16px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          {h2hOpen ? "Hide Head-to-Head" : "Show Head-to-Head"}
        </button>

        {h2hOpen && (
          <PnplTable
            columns={[
              {
                key: "opponent",
                label: "Opponent",
                align: "left",
                render: (row) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {row.avatar_url && (
                      <img
                        src={row.avatar_url}
                        alt={row.opponent}
                        style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #00FFFF" }}
                      />
                    )}
                    <span>{row.opponent}</span>
                  </div>
                ),
              },
              { key: "GP", label: "GP" },
              { key: "W", label: "W" },
              { key: "L", label: "L" },
              { key: "T", label: "T" },
              { key: "PTS", label: "PTS" },
              { key: "pts_percent", label: "PTS%" },
              { key: "GF", label: "GF" },
              { key: "GA", label: "GA" },
              { key: "GD", label: "GD" },
            ]}
            data={h2hRows}
            numericColumns={["GP","W","L","T","PTS","pts_percent","GF","GA","GD"]}
          />
        )}
      </div>
    </Layout>
  );
}
