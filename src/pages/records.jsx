// src/pages/records.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Layout from "../components/Layout";
import TeamBadge from "../components/TeamBadge";

const REGULAR_CATEGORIES = [
  { key: "w", label: "Wins", direction: "desc", format: (v) => v },
  { key: "l", label: "Losses", direction: "desc", format: (v) => v },
  { key: "pts", label: "Points", direction: "desc", format: (v) => v },
  { key: "pts_percent", label: "Points %", direction: "desc", format: (v) => Number(v).toFixed(3) },
  { key: "gf", label: "GF", direction: "desc", format: (v) => v },
  { key: "ga", label: "GA", direction: "desc", format: (v) => v },
  { key: "gf_per_game", label: "GF/Game", direction: "desc", format: (v) => v.toFixed(2) },
  { key: "ga_per_game", label: "GA/Game", direction: "asc", format: (v) => v.toFixed(2) },
  { key: "gd", label: "Goal Diff.", direction: "desc", format: (v) => (v > 0 ? `+${v}` : v) },
  { key: "shutouts", label: "Shutouts", direction: "desc", format: (v) => v },
];

// Playoffs have no points system, so those two categories are dropped.
const PLAYOFF_CATEGORIES = [
  { key: "w", label: "Wins", direction: "desc", format: (v) => v },
  { key: "l", label: "Losses", direction: "desc", format: (v) => v },
  { key: "gf", label: "GF", direction: "desc", format: (v) => v },
  { key: "ga", label: "GA", direction: "desc", format: (v) => v },
  { key: "gf_per_game", label: "GF/Game", direction: "desc", format: (v) => v.toFixed(2) },
  { key: "ga_per_game", label: "GA/Game", direction: "asc", format: (v) => v.toFixed(2) },
  { key: "gd", label: "Goal Diff.", direction: "desc", format: (v) => (v > 0 ? `+${v}` : v) },
  { key: "shutouts", label: "Shutouts", direction: "desc", format: (v) => v },
];

// Standard competition ranking: ties share a rank, next rank skips ahead
// (1, 2, 2, 4) — matches how the spreadsheet ranks ties.
function topTenRanked(rows, key, direction) {
  const sorted = [...rows].sort((a, b) =>
    direction === "asc" ? a[key] - b[key] : b[key] - a[key]
  );
  let rank = 0;
  let prevValue = null;
  const ranked = sorted.map((row, i) => {
    if (row[key] !== prevValue) {
      rank = i + 1;
      prevValue = row[key];
    }
    return { ...row, _rank: rank };
  });
  return ranked.slice(0, 10);
}

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState("regular");
  const [regularRows, setRegularRows] = useState([]);
  const [playoffRows, setPlayoffRows] = useState([]);
  const [regularBlowouts, setRegularBlowouts] = useState([]);
  const [playoffBlowouts, setPlayoffBlowouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [{ data: standings }, { data: games }, { data: playoffGames }] = await Promise.all([
        supabase
          .from("pnpl_standings")
          .select(
            "season, manager, nhl_team, w, l, t, pts, pts_percent, gf, ga, gd, gp, total_games"
          ),
        supabase
          .from("pnpl_raw_schedule")
          .select("season, home, away, home_team, away_team, home_score, away_score"),
        supabase
          .from("pnpl_raw_playoff_schedule")
          .select(
            "season, round, home_manager, away_manager, home_team_code, away_team_code, home_result, away_result, score_home, score_away"
          ),
      ]);

      // ---------- Regular season ----------

      const shutoutsByManagerSeason = {};
      (games || []).forEach((g) => {
        if (g.home_score === null || g.away_score === null) return;
        if (g.home_score === 0) {
          const key = `${g.away}-${g.season}`;
          shutoutsByManagerSeason[key] = (shutoutsByManagerSeason[key] || 0) + 1;
        }
        if (g.away_score === 0) {
          const key = `${g.home}-${g.season}`;
          shutoutsByManagerSeason[key] = (shutoutsByManagerSeason[key] || 0) + 1;
        }
      });

      const withRates = (standings || []).map((r) => {
        const gp = r.gp ?? (r.w || 0) + (r.l || 0) + (r.t || 0);
        return {
          ...r,
          gf_per_game: gp > 0 ? r.gf / gp : 0,
          ga_per_game: gp > 0 ? r.ga / gp : 0,
          shutouts: shutoutsByManagerSeason[`${r.manager}-${r.season}`] || 0,
        };
      });

            // Only exclude the current season until a champion has been crowned.
      // Historical seasons always count, even if an individual row has
      // stale/incomplete GP or total_games data.
      const champBySeason = new Set();

      withRates.forEach((r) => {
        if (r.champ) champBySeason.add(r.season);
      });

      const maxSeason = withRates.length
        ? Math.max(...withRates.map((r) => r.season))
        : null;

      setRegularRows(
        withRates.filter(
          (r) => r.season !== maxSeason || champBySeason.has(r.season)
        )
      );

      const regularBlowoutRows = (games || [])
        .filter((g) => g.home_score !== null && g.away_score !== null)
        .map((g) => ({
          season: g.season,
          homeManager: g.home,
          awayManager: g.away,
          homeTeam: g.home_team,
          awayTeam: g.away_team,
          homeScore: g.home_score,
          awayScore: g.away_score,
          gd_abs: Math.abs(g.home_score - g.away_score),
        }));
      setRegularBlowouts(regularBlowoutRows);

      // ---------- Playoffs ----------

      const incompletePlayoffSeasons = new Set();
      (playoffGames || []).forEach((g) => {
        if (g.score_home == null || g.score_away == null) incompletePlayoffSeasons.add(g.season);
      });

      const completedPlayoffGames = (playoffGames || []).filter(
        (g) => g.score_home != null && g.score_away != null
      );

      const playoffAgg = {};
      completedPlayoffGames.forEach((g) => {
        [
          { name: g.home_manager, team: g.home_team_code, gf: g.score_home, ga: g.score_away, result: g.home_result },
          { name: g.away_manager, team: g.away_team_code, gf: g.score_away, ga: g.score_home, result: g.away_result },
        ].forEach(({ name, team, gf, ga, result }) => {
          if (!name) return;
          const key = `${name}-${g.season}`;
          if (!playoffAgg[key]) {
            playoffAgg[key] = {
              manager: name,
              season: g.season,
              nhl_team: team,
              gp: 0,
              w: 0,
              l: 0,
              gf: 0,
              ga: 0,
              shutouts: 0,
            };
          }
          const s = playoffAgg[key];
          s.gp++;
          if (result === "W") s.w++;
          else if (result === "L") s.l++;
          s.gf += gf;
          s.ga += ga;
          if (ga === 0) s.shutouts++;
        });
      });

      const playoffAggRows = Object.values(playoffAgg).map((s) => ({
        ...s,
        gd: s.gf - s.ga,
        gf_per_game: s.gp > 0 ? s.gf / s.gp : 0,
        ga_per_game: s.gp > 0 ? s.ga / s.gp : 0,
      }));
      setPlayoffRows(playoffAggRows);

      const playoffBlowoutRows = completedPlayoffGames.map((g) => ({
        season: g.season,
        homeManager: g.home_manager,
        awayManager: g.away_manager,
        homeTeam: g.home_team_code,
        awayTeam: g.away_team_code,
        homeScore: g.score_home,
        awayScore: g.score_away,
        gd_abs: Math.abs(g.score_home - g.score_away),
      }));
      setPlayoffBlowouts(playoffBlowoutRows);

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="stats-loading">Loading…</div>
      </Layout>
    );
  }

  const categories =
  activeTab === "regular"
    ? REGULAR_CATEGORIES
    : PLAYOFF_CATEGORIES.filter(
        (cat) => cat.key !== "w" && cat.key !== "l"
      );
      
  const rows = activeTab === "regular" ? regularRows : playoffRows;
  const blowouts = activeTab === "regular" ? regularBlowouts : playoffBlowouts;
  const topBlowouts = topTenRanked(blowouts, "gd_abs", "desc");

  return (
    <Layout>
      <div className="page">
        <h1 className="page-title">Records</h1>
        <p className="records-subtitle">All-time top 10, single-season</p>

        <div className="panel standings-controls">
          <div className="view-tabs">
            <button
              className={`view-tab ${activeTab === "regular" ? "is-active" : ""}`}
              onClick={() => setActiveTab("regular")}
            >
              Regular Season
            </button>
            <button
              className={`view-tab ${activeTab === "playoffs" ? "is-active" : ""}`}
              onClick={() => setActiveTab("playoffs")}
            >
              Playoffs
            </button>
          </div>
        </div>

        <div className="records-grid">
          {categories.map((cat) => {
            const ranked = topTenRanked(rows, cat.key, cat.direction);
            return (
              <div className="panel record-panel" key={cat.key}>
                <h2 className="record-panel-title">{cat.label}</h2>
                <table className="record-table">
                  <thead>
                    <tr>
                      <th className="record-rank">#</th>
                      <th>{cat.label}</th>
                      <th>Szn</th>
                      <th>Manager</th>
                      <th>Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((row, i) => (
                      <tr key={`${cat.key}-${row.season}-${row.manager}-${i}`}>
                        <td className="record-rank">{row._rank}</td>
                        <td className="record-value">{cat.format(row[cat.key])}</td>
                        <td className="record-season">S{row.season}</td>
                        <td className="record-manager">{row.manager}</td>
                        <td className="record-team">
                          <TeamBadge team={row.nhl_team} size="md" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Largest margin of victory */}
        <h2 className="section-heading">Largest Margins of Victory</h2>
        <div className="panel record-panel record-panel-wide">
          <table className="record-table record-table-wide">
            <thead>
              <tr>
                <th className="record-rank">#</th>
                <th>GD</th>
                <th>Szn</th>
                <th>Home</th>
                <th className="record-score-col">Score</th>
                <th>Away</th>
                <th className="record-score-col">Score</th>
              </tr>
            </thead>
            <tbody>
              {topBlowouts.map((g, i) => (
                <tr key={`blowout-${g.season}-${i}`}>
                  <td className="record-rank">{g._rank}</td>
                  <td className="record-value">{g.gd_abs}</td>
                  <td className="record-season">S{g.season}</td>
                  <td className="record-team-cell">
                    <TeamBadge team={g.homeTeam} size="md" />
                    <span>{g.homeManager}</span>
                  </td>
                  <td className="record-score-col">{g.homeScore}</td>
                  <td className="record-team-cell">
                    <TeamBadge team={g.awayTeam} size="md" />
                    <span>{g.awayManager}</span>
                  </td>
                  <td className="record-score-col">{g.awayScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}