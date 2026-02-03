// src/pages/ManagerProfile.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";
import { nhlLogos } from "../constants/nhlLogos";

export default function ManagerProfile() {
  const { managerId } = useParams();

  const [manager, setManager] = useState(null);
  const [rows, setRows] = useState([]);
  const [h2hRows, setH2hRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [h2hOpen, setH2hOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1️⃣ Fetch manager info
      const { data: managerData, error: managerError } = await supabase
        .from("managers")
        .select("id, name, discord_avatar_url")
        .eq("id", managerId)
        .single();

      if (managerError || !managerData) {
        console.error(managerError);
        setLoading(false);
        return;
      }

      setManager(managerData);

      // 2️⃣ Fetch manager season history
      const { data: standingsData } = await supabase
        .from("pnpl_standings")
        .select("*")
        .eq("manager", managerData.name)
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

      setRows(mergedRows);

      // 3️⃣ Fetch all managers for avatar lookup
      const { data: managersData } = await supabase
        .from("managers")
        .select("name, discord_avatar_url");

      const avatarMap = {};
      (managersData || []).forEach((m) => {
        avatarMap[m.name.toLowerCase()] = m.discord_avatar_url;
      });

      // 4️⃣ Head-to-Head via RPC
      const { data: h2hData, error: h2hError } = await supabase.rpc(
        "get_h2h_stats",
        { p_manager_name: managerData.name }
      );

      if (h2hError) console.error("H2H RPC error:", h2hError);

      const h2hArray = (h2hData || []).map((row) => ({
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
      }));

      setH2hRows(h2hArray);
      setLoading(false);
    }

    loadData();
  }, [managerId]);

  if (loading)
    return (
      <Layout>
        <div style={{ padding: "80px", textAlign: "center", color: "#00FFFF" }}>Loading…</div>
      </Layout>
    );

  if (!manager)
    return (
      <Layout>
        <div style={{ padding: "80px", textAlign: "center", color: "#FF5555" }}>Manager not found</div>
      </Layout>
    );

  return (
    <Layout>
      <Link
        to="/managers"
        style={{
          color: "#00FFFF",
          fontWeight: "bold",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "16px",
        }}
      >
        ← Back to Managers
      </Link>

      {/* HERO CARD */}
      {/* HERO CARD */}
<div
  style={{
    display: "flex",
    gap: "16px",
    alignItems: "center",
    marginTop: "16px",
    marginBottom: "32px",
    padding: "16px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #0E3C5F, #091421)",
    boxShadow: "0 6px 24px rgba(0,255,255,0.25)",
    maxWidth: "600px",  // slightly bigger container
    width: "100%",
  }}
>
  <img
    src={manager.discord_avatar_url}
    alt={manager.name}
    style={{ width: "96px", height: "96px", borderRadius: "50%", border: "2px solid #00FFFF" }}
  />
  <h1
    style={{
      color: "#00FFFF",
      margin: 0,
      fontSize: "clamp(1.5rem, 5vw, 2.5rem)", // dynamic sizing
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    }}
  >
    {manager.name}
  </h1>
</div>


      {/* Season History */}
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
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "48px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <img
                        src={row.logo_url}
                        alt={row.nhl_team}
                        style={{
                          width: "36px",
                          height: "36px",
                          objectFit: "contain",
                          borderRadius: "6px",
                          border: row.champ ? "2px solid gold" : "none",
                          boxShadow: row.champ ? "0 0 12px gold" : "none",
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
              { key: "h_record", label: "Home" },
              { key: "a_record", label: "Away" },
              { key: "season_rank", label: "Rank" },
            ]}
            data={rows}
            numericColumns={[
              "gp",
              "w",
              "l",
              "t",
              "pts",
              "pts_percent",
              "gf",
              "ga",
              "gd",
              "season_rank",
            ]}
          />
        )}
      </div>

      {/* Head-to-Head */}
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
            numericColumns={["GP", "W", "L", "T", "PTS", "pts_percent", "GF", "GA", "GD"]}
          />
        )}
      </div>
    </Layout>
  );
}
