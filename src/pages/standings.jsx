// src/pages/standings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Layout from "../components/Layout";
import TeamBadge from "../components/TeamBadge";
import { nhlLogos } from "../constants/nhlLogos";

export default function StandingsPage() {
  const [seasons, setSeasons] = useState([]);
  
  //const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(
    () => Number(localStorage.getItem("standingsSeason")) || ""
  );
  
  const [standings, setStandings] = useState([]);
  const [playoffSeries, setPlayoffSeries] = useState([]);
  const [activeTab, setActiveTab] = useState("regular");
  const [sortField, setSortField] = useState("points");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    async function fetchSeasons() {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("season", { ascending: false });

        if (!error && data?.length) {
          setSeasons(data);
        
          const savedSeason = Number(localStorage.getItem("standingsSeason"));
        
          if (savedSeason && data.some((s) => s.season === savedSeason)) {
            setSelectedSeason(savedSeason);
          } else {
            const newestSeason = data[0].season;
            setSelectedSeason(newestSeason);
            localStorage.setItem("standingsSeason", newestSeason);
          }
        }
    }
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;

    async function fetchStandings() {
      const logosMap = nhlLogos;

      const { data: standingsData } = await supabase
        .from("pnpl_standings")
        .select("*")
        .eq("season", Number(selectedSeason));

      if (standingsData) {
        setStandings(
          standingsData.map((row) => {
            const gp = row.w + row.l + (row.t || 0);
            return {
              ...row,
              logo_url: logosMap[row.nhl_team?.toUpperCase()] || "/images/nhl-logos/default.webp",
              gp,
              wins: row.w,
              losses: row.l,
              ties: row.t || 0,
              points: row.pts,
              streak: row.streak,
              streak_value: streakValue(row.streak),
              goals_for: row.gf,
              goals_against: row.ga,
              gf_per_game: (row.gf || 0) / (gp || 1),
              ga_per_game: (row.ga || 0) / (gp || 1),
              tpr: row.possible_points || 0,
              max_pts: row.pts + (row.possible_points || 0),
            };
          })
        );
      }
    }

    fetchStandings();
  }, [selectedSeason]);

  useEffect(() => {
    if (!selectedSeason) return;

    async function fetchPlayoffs() {
      const logosMap = nhlLogos;

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
          if (g.home_result === "W") winCount[g.home_team_code] = (winCount[g.home_team_code] || 0) + 1;
          if (g.away_result === "W") winCount[g.away_team_code] = (winCount[g.away_team_code] || 0) + 1;

          return {
            homeTeam: g.home_team_code,
            awayTeam: g.away_team_code,
            homeSeed: g.series_seed_home,
            awaySeed: g.series_seed_away,
            homeScore: g.score_home,
            awayScore: g.score_away,
            gameNumber: g.game_number,
            homeTeamLogo: logosMap[g.home_team_code?.toUpperCase()] || "/images/nhl-logos/default.webp",
            awayTeamLogo: logosMap[g.away_team_code?.toUpperCase()] || "/images/nhl-logos/default.webp",
          };
        });

        const winner =
          Object.keys(winCount).length > 0
            ? Object.keys(winCount).reduce((a, b) => (winCount[a] >= winCount[b] ? a : b))
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
  const teamToManager = {};
  standings.forEach((s) => (teamToManager[s.nhl_team] = s.manager));

  const padScore = (score) =>
    score === null || score === undefined ? "–" : String(score);

  const maxRound = Math.max(...playoffSeries.map((s) => s.round || 0));
  const finalSeries = playoffSeries.find((s) => s.round === maxRound);
  const championTeam = finalSeries?.winner;
  const championStanding = standings.find((s) => s.nhl_team === championTeam);

  const roundsGrouped = Array.from(
    playoffSeries.reduce((acc, series) => {
      if (!acc.has(series.round)) acc.set(series.round, []);
      acc.get(series.round).push(series);
      return acc;
    }, new Map())
  );

  //--------- Streaks Helpers--------
  function streakClass(streak) {
    if (!streak) return "";
    const type = streak.slice(-1).toUpperCase();
    if (type === "W") return "is-win";
    if (type === "L") return "is-loss";
    if (type === "T") return "is-tie";
    return "";
  }

  function streakValue(streak) {
    if (!streak) return 0;
    const match = streak.match(/^(\d+)([WLT])$/i);
    if (!match) return 0;
    const num = parseInt(match[1], 10);
    const type = match[2].toUpperCase();
    if (type === "W") return num;
    if (type === "L") return -num;
    return 0; // ties treated as neutral
  }
  
  function streakClass(streak) {
    if (!streak) return "";
    const type = streak.slice(-1).toUpperCase();
    if (type === "W") return "is-win";
    if (type === "L") return "is-loss";
    if (type === "T") return "is-tie";
    return "";
  }

  // --- Sorting ---
  function handleSort(field, numeric) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(numeric ? "desc" : "asc");
    }
  }

  const arrow = (field) =>
    sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const rankedStandings = [...standings]
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  const sortedStandings = [...rankedStandings].sort((a, b) => {
    let av = a[sortField];
    let bv = b[sortField];
    if (typeof av === "string") {
      av = av.toLowerCase();
      bv = (bv || "").toLowerCase();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <Layout>
      <div className="page">
        <h1 className="page-title">Standings</h1>

        <div className="panel standings-controls">
          <select
            className="season-select"
            value={selectedSeason}
            onChange={(e) => {
              const season = Number(e.target.value);
              setSelectedSeason(season);
              localStorage.setItem("standingsSeason", season);
            }}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.season}>
                Season {season.season}
              </option>
            ))}
          </select>

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

        {/* Regular season */}
        {activeTab === "regular" && (
          <div className="panel home-panel standings-table-panel">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className={sortField === "rank" ? "is-sorted" : ""} onClick={() => handleSort("rank", true)}>
                    #{arrow("rank")}
                  </th>
                  <th className={sortField === "nhl_team" ? "is-sorted" : ""} onClick={() => handleSort("nhl_team", false)}>
                    Team{arrow("nhl_team")}
                  </th>
                  <th className={sortField === "manager" ? "is-sorted" : ""} onClick={() => handleSort("manager", false)}>
                    Manager{arrow("manager")}
                  </th>
                  <th className={sortField === "gp" ? "is-sorted" : ""} onClick={() => handleSort("gp", true)}>
                    GP{arrow("gp")}
                  </th>
                  <th className={sortField === "wins" ? "is-sorted" : ""} onClick={() => handleSort("wins", true)}>
                    W{arrow("wins")}
                  </th>
                  <th className={sortField === "losses" ? "is-sorted" : ""} onClick={() => handleSort("losses", true)}>
                    L{arrow("losses")}
                  </th>
                  <th className={sortField === "ties" ? "is-sorted" : ""} onClick={() => handleSort("ties", true)}>
                    T{arrow("ties")}
                  </th>
                  <th className={sortField === "points" ? "is-sorted" : ""} onClick={() => handleSort("points", true)}>
                    PTS{arrow("points")}
                  </th>
                  <th className={`col-extra ${sortField === "goals_for" ? "is-sorted" : ""}`} onClick={() => handleSort("goals_for", true)}>
                    GF{arrow("goals_for")}
                  </th>
                  <th className={`col-extra ${sortField === "goals_against" ? "is-sorted" : ""}`} onClick={() => handleSort("goals_against", true)}>
                    GA{arrow("goals_against")}
                  </th>
                  <th className={`col-extra ${sortField === "gf_per_game" ? "is-sorted" : ""}`} onClick={() => handleSort("gf_per_game", true)}>
                    GF/G{arrow("gf_per_game")}
                  </th>
                  <th className={`col-extra ${sortField === "ga_per_game" ? "is-sorted" : ""}`} onClick={() => handleSort("ga_per_game", true)}>
                    GA/G{arrow("ga_per_game")}
                  </th>
                  <th className={`col-extra ${sortField === "tpr" ? "is-sorted" : ""}`} onClick={() => handleSort("tpr", true)}>
                    TPR{arrow("tpr")}
                  </th>
                  <th className={`col-extra ${sortField === "max_pts" ? "is-sorted" : ""}`} onClick={() => handleSort("max_pts", true)}>
                    MAX{arrow("max_pts")}
                  </th>
                  <th className={`col-extra ${sortField === "streak_value" ? "is-sorted" : ""}`} onClick={() => handleSort("streak_value", true)}> STRK{arrow("streak_value")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((row) => (
                  <tr key={row.nhl_team}>
                    <td>{row.rank}</td>
                    <td>
                      <TeamBadge team={row.nhl_team} size="lg" />
                    </td>
                    <td className="standings-manager">{row.manager}</td>
                    <td>{row.gp}</td>
                    <td>{row.wins}</td>
                    <td>{row.losses}</td>
                    <td>{row.ties}</td>
                    <td className="standings-pts">{row.points}</td>
                    <td className="col-extra">{row.goals_for}</td>
                    <td className="col-extra">{row.goals_against}</td>
                    <td className="col-extra">{row.gf_per_game.toFixed(2)}</td>
                    <td className="col-extra">{row.ga_per_game.toFixed(2)}</td>
                    <td className="col-extra">{row.tpr}</td>
                    <td className="col-extra">{row.max_pts}</td>
                    <td className={`col-extra standings-streak ${streakClass(row.streak)}`}> {row.streak || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Playoffs */}
        {activeTab === "playoffs" && (
          <div className="playoff-wrap">
            <div className="playoff-bracket">
              {roundsGrouped.map(([round, seriesArr]) => (
                <div className="playoff-round" key={round}>
                  <div className="playoff-round-title">
                    {round === maxRound ? "Finals" : `Round ${round}`}
                  </div>

                  {seriesArr.map((series, idx) => {
                    const firstGame = series.games[0];
                    const awayManager = teamToManager[firstGame.awayTeam];
                    const homeManager = teamToManager[firstGame.homeTeam];
                    const isComplete = !!series.winner;
                    const awayWon = series.winner === firstGame.awayTeam;
                    const homeWon = series.winner === firstGame.homeTeam;

                    return (
                      <div
                        className={`panel playoff-series-card ${isComplete ? "is-complete" : ""}`}
                        key={idx}
                      >
                        <div className="playoff-matchup">
                          <div className={`playoff-side ${awayWon ? "is-winner" : ""}`}>
                            <span className="playoff-seed">#{firstGame.awaySeed}</span>
                            <TeamBadge team={firstGame.awayTeam} size="md" />
                            <span className="playoff-manager">{awayManager}</span>
                          </div>

                          <div className="playoff-vs">VS</div>

                          <div className={`playoff-side ${homeWon ? "is-winner" : ""}`}>
                            <span className="playoff-seed">#{firstGame.homeSeed}</span>
                            <TeamBadge team={firstGame.homeTeam} size="md" />
                            <span className="playoff-manager">{homeManager}</span>
                          </div>
                        </div>

                        <div className="playoff-games">
                          {series.games.map((game, i) => {
                            const played = game.awayScore !== null && game.awayScore !== undefined;
                            const awayGameWin = played && game.awayScore > game.homeScore;
                            const homeGameWin = played && game.homeScore > game.awayScore;
                            return (
                              <div className="game-chip" key={i}>
                                <span className="game-chip-num">G{game.gameNumber ?? i + 1}</span>
                                <div className="game-chip-team">
                                  <img
                                    src={game.awayTeamLogo}
                                    alt=""
                                    className={`gc-logo ${awayGameWin ? "is-win" : ""}`}
                                  />
                                  <span className={`gc-score ${awayGameWin ? "is-win" : ""}`}>
                                    {padScore(game.awayScore)}
                                  </span>
                                </div>
                                <span className="game-chip-at">@</span>
                                <div className="game-chip-team">
                                  <img
                                    src={game.homeTeamLogo}
                                    alt=""
                                    className={`gc-logo ${homeGameWin ? "is-win" : ""}`}
                                  />
                                  <span className={`gc-score ${homeGameWin ? "is-win" : ""}`}>
                                    {padScore(game.homeScore)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {championStanding && (
                <div className="playoff-round champion-column">
                  <div className="playoff-round-title champion-round-title">Champion</div>
                  <div className="panel champion-panel">
                    <div className="champion-trophy">🏆</div>
                    <TeamBadge team={championStanding.nhl_team} size="xl" />
                    <div className="champion-name">{championStanding.manager}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}