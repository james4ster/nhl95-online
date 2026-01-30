// src/pages/pnplStandings.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";


export default function StandingsPage() {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [standings, setStandings] = useState([]);

  // Fetch seasons
  useEffect(() => {
    async function fetchSeasons() {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("season", { ascending: false });
      if (!error && data.length > 0) {
        setSeasons(data);
        setSelectedSeason(data[0].season);
      }
    }
    fetchSeasons();
  }, []);

  // Fetch standings for selected season
  useEffect(() => {
    if (!selectedSeason) return;

    async function fetchStandings() {
      const { data: teams } = await supabase
        .from("nhl_teams")
        .select("code, logo_url");
      const logosMap = {};
      teams?.forEach((t) => (logosMap[t.code] = t.logo_url));

      const { data: standingsData } = await supabase
        .from("pnpl_standings")
        .select("*")
        .eq("season", Number(selectedSeason));

      if (standingsData) {
        setStandings(
          standingsData.map((row) => ({
            ...row,
            logo_url: logosMap[row.nhl_team] || null,
            gp: row.w + row.l + (row.t || 0),
            wins: row.w,
            losses: row.l,
            ties: row.t || 0,
            points: row.pts,
            goals_for: row.gf,
            goals_against: row.ga,
          }))
        );
      }
    }

    fetchStandings();
  }, [selectedSeason]);

  // Export CSV
  const handleExport = () => {
    const csv = [
      ["#", "Team", "Manager", "GP", "W", "L", "T", "PTS", "GF", "GA"],
      ...standings.map((row, i) => [
        i + 1,
        row.nhl_team,
        row.manager,
        row.gp,
        row.wins,
        row.losses,
        row.ties,
        row.points,
        row.goals_for,
        row.goals_against,
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnpl_standings_season_${selectedSeason}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      {/* Page Title */}
      <h1
        style={{
          textAlign: "center",
          fontSize: "5rem",
          fontWeight: "bold",
          color: "#00FFFF",
          textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF",
          marginBottom: "50px",
        }}
      >
        Standings
      </h1>

      {/* Season Dropdown */}
      <div
        style={{
          maxWidth: "400px",
          margin: "0 auto 30px",
          textAlign: "center",
        }}
      >
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "1.2rem",
            borderRadius: "6px",
            border: "2px solid #00FFFF",
            background: "#0B1C2D",
            color: "#FFFFFF",
            appearance: "none",
            cursor: "pointer",
            textAlign: "center",
            boxShadow: "0 0 10px rgba(0,255,255,0.4)",
          }}
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.season}>
              Season {season.season}
            </option>
          ))}
        </select>
      </div>

      {/* Standings Table */}
      <PnplTable
  columns={[
    { key: "rank", label: "#" },
    {
      key: "logo_url",
      label: "Team",
      render: (row) =>
        row.logo_url ? (
          <img
            src={row.logo_url}
            alt={row.nhl_team}
            style={{ width: "80px", height: "80px", objectFit: "contain" }}
          />
        ) : (
          row.nhl_team
        ),
    },
    { key: "manager", label: "Manager" },
    { key: "gp", label: "GP" },
    { key: "wins", label: "W" },
    { key: "losses", label: "L" },
    { key: "ties", label: "T" },
    { key: "points", label: "PTS", bold: true, color: "#FFD700" },
    { key: "goals_for", label: "GF" },
    { key: "goals_against", label: "GA" },
  ]}
  data={standings
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }))}
/>



      {/* Export Button */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <button
          onClick={handleExport}
          style={{
            padding: "10px 20px",
            fontSize: "1rem",
            borderRadius: "6px",
            border: "2px solid #00FFFF",
            background: "#0B1C2D",
            color: "#00FFFF",
            cursor: "pointer",
            boxShadow: "0 0 10px rgba(0,255,255,0.4)",
          }}
        >
          Export CSV
        </button>
      </div>
    </Layout>
  );
}
