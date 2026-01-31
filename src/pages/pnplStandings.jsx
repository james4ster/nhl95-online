import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";

export default function StandingsPage() {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [standings, setStandings] = useState([]);
  const [playoffSeries, setPlayoffSeries] = useState([]);
  const [activeTab, setActiveTab] = useState("regular"); // "regular" or "playoffs"

  // --- Fetch seasons ---
  useEffect(() => {
    async function fetchSeasons() {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("season", { ascending: false });

      if (!error && data?.length) {
        setSeasons(data);
        setSelectedSeason(data[0].season);
      }
    }
    fetchSeasons();
  }, []);

  // --- Fetch standings ---
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
            gf_per_game: ((row.gf || 0) / (row.w + row.l + (row.t || 0))).toFixed(2),
            ga_per_game: ((row.ga || 0) / (row.w + row.l + (row.t || 0))).toFixed(2),
            tpr: row.possible_points || 0,
            max_pts: row.pts + (row.possible_points || 0),
          }))
        );
      }
    }

    fetchStandings();
  }, [selectedSeason]);

  // --- Fetch playoffs ---
  useEffect(() => {
    if (!selectedSeason) return;

    async function fetchPlayoffs() {
      const { data: teams } = await supabase
        .from("nhl_teams")
        .select("code, logo_url");

      const logosMap = {};
      teams?.forEach((t) => (logosMap[t.code] = t.logo_url));

      const { data: games } = await supabase
        .from("pnpl_raw_playoff_schedule")
        .select(`
          round,
          series_seed_home,
          home_team_code,
          home_result,
          score_home,
          series_seed_away,
          away_team_code,
          away_result,
          score_away,
          game_number
        `)
        .eq("season", selectedSeason)
        .order("round", { ascending: true })
        .order("game_number", { ascending: true });

      if (!games) return;

      const seriesMap = {};

      games.forEach((g) => {
        const lowSeed = Math.min(g.series_seed_home, g.series_seed_away);
        const highSeed = Math.max(g.series_seed_home, g.series_seed_away);
        const key = `${g.round}-${lowSeed}-${highSeed}`;

        if (!seriesMap[key]) seriesMap[key] = [];
        seriesMap[key].push(g);
      });

      const seriesList = Object.values(seriesMap).map((seriesGames) => {
        const winCount = {};
        const firstGame = seriesGames[0];

        const mappedGames = seriesGames.map((g) => {
          if (g.home_result === "W")
            winCount[g.home_team_code] =
              (winCount[g.home_team_code] || 0) + 1;

          if (g.away_result === "W")
            winCount[g.away_team_code] =
              (winCount[g.away_team_code] || 0) + 1;

          return {
            homeTeam: g.home_team_code,
            awayTeam: g.away_team_code,
            homeSeed: g.series_seed_home,
            awaySeed: g.series_seed_away,
            homeScore: g.score_home,
            awayScore: g.score_away,
            homeTeamLogo: logosMap[g.home_team_code] || null,
            awayTeamLogo: logosMap[g.away_team_code] || null,
          };
        });

        const winner =
          Object.keys(winCount).length > 0
            ? Object.keys(winCount).reduce((a, b) =>
                winCount[a] >= winCount[b] ? a : b
              )
            : null;

        return {
          round: firstGame.round,
          games: mappedGames,
          winner,
        };
      });

      setPlayoffSeries(seriesList);
    }

    fetchPlayoffs();
  }, [selectedSeason]);

  // --- Helpers ---
  const padScore = (score) =>
    score === null || score === undefined
      ? "--"
      : String(score).padStart(2, "0");

  const maxRound = Math.max(...playoffSeries.map((s) => s.round || 0));
  const finalSeries = playoffSeries.find((s) => s.round === maxRound);
  const championTeam = finalSeries?.winner;
  const championStanding = standings.find((s) => s.nhl_team === championTeam);

  // --- Export CSV ---
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

      {/* Season Dropdown & Tabs */}
      <div style={{ maxWidth: "400px", margin: "0 auto 30px", textAlign: "center" }}>
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
            textAlign: "center",
          }}
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.season}>
              Season {season.season}
            </option>
          ))}
        </select>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px" }}>
          <button
            onClick={() => setActiveTab("regular")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: activeTab === "regular" ? "2px solid #00FFFF" : "2px solid transparent",
              background: activeTab === "regular" ? "#0B1C2D" : "rgba(0,255,255,0.1)",
              color: "#00FFFF",
              cursor: "pointer",
              fontWeight: activeTab === "regular" ? "bold" : "normal",
            }}
          >
            Regular Season
          </button>
          <button
            onClick={() => setActiveTab("playoffs")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: activeTab === "playoffs" ? "2px solid #00FFFF" : "2px solid transparent",
              background: activeTab === "playoffs" ? "#0B1C2D" : "rgba(0,255,255,0.1)",
              color: "#00FFFF",
              cursor: "pointer",
              fontWeight: activeTab === "playoffs" ? "bold" : "normal",
            }}
          >
            Playoffs
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: "40px" }}>
        {activeTab === "regular" && (
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
              { key: "gf_per_game", label: "GF/G" },
              { key: "ga_per_game", label: "GA/G" },
              { key: "tpr", label: "TPR" },
              { key: "max_pts", label: "MAX" },
            ]}
            data={standings
              .sort((a, b) => b.points - a.points)
              .map((row, i) => ({ ...row, rank: i + 1 }))}
          />
        )}

{activeTab === "playoffs" && (
  <div style={{ display: "flex", gap: "60px", alignItems: "flex-start" }}>
    {/* Rounds */}
    {Array.from(
      playoffSeries.reduce((acc, series) => {
        if (!acc.has(series.round)) acc.set(series.round, []);
        acc.get(series.round).push(series);
        return acc;
      }, new Map())
    ).map(([round, seriesArr]) => (
      <div key={round} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <h3 style={{ textAlign: "center" }}>Round {round}</h3>
        {seriesArr.map((series, idx) => (
          <div
            key={idx}
            style={{
              padding: "12px",
              background: "rgba(0,255,255,0.1)",
              borderRadius: "8px",
              minWidth: "200px",
              border: "2px solid #00FFFF",
            }}
          >
            {series.games.map((game, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  padding: "4px 8px",
                  minWidth: "200px",
                }}
              >
                {/* Away */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>({game.awaySeed})</span>
                  {game.awayTeamLogo && (
                    <img src={game.awayTeamLogo} style={{ width: "28px", height: "28px" }} />
                  )}
                  <span
                    style={{
                      fontWeight: game.awayScore > game.homeScore ? "bold" : "normal",
                      fontFamily: "monospace",
                      minWidth: "28px",
                      textAlign: "right",
                    }}
                  >
                    {padScore(game.awayScore)}
                  </span>
                </div>

                <div style={{ width: "40px" }} />

                {/* Home */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontWeight: game.homeScore > game.awayScore ? "bold" : "normal",
                      fontFamily: "monospace",
                      minWidth: "28px",
                      textAlign: "left",
                    }}
                  >
                    {padScore(game.homeScore)}
                  </span>
                  <span>({game.homeSeed})</span>
                  {game.homeTeamLogo && (
                    <img src={game.homeTeamLogo} style={{ width: "28px", height: "28px" }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ))}

    {/* Champion Panel aligned right */}
    {championStanding && (
      <div style={{ minWidth: "220px", marginTop: "60px" /* adjust to align vertically */ }}>
        <h3 style={{ textAlign: "center", color: "#FFD700" }}>Champion</h3>
        <div
          style={{
            padding: "16px",
            borderRadius: "10px",
            background: "rgba(255,215,0,.15)",
            textAlign: "center",
            border: "2px solid #FFD700",
          }}
        >
          {championStanding.logo_url && (
            <img src={championStanding.logo_url} style={{ width: "100px" }} />
          )}
          <div>{championStanding.manager}</div>
        </div>
      </div>
    )}
  </div>
)}

      </div>
    </Layout>
  );
}
