import React from "react";
import { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import TeamBadge from "../components/TeamBadge";
import { supabase } from "../utils/supabaseClient";

export default function SchedulePage() {
  const managerDropdownRef = useRef(null);

  const [seasons, setSeasons] = useState([]);
  //const [selectedSeason, setSelectedSeason] = useState(null);

  const [selectedSeason, setSelectedSeason] = useState(
    () => localStorage.getItem("scheduleSeason") || ""
  );

  const [teams, setTeams] = useState([]);
  const [teamToManager, setTeamToManager] = useState({});

  const [managerAvatars, setManagerAvatars] = useState({});

  const [selectedTeam, setSelectedTeam] = useState("");
  //const [selectedManager, setSelectedManager] = useState("");
  const [selectedManager, setSelectedManager] = useState(
    () => localStorage.getItem("scheduleManager") || ""
  );
  const [games, setGames] = useState([]);

  const [upcomingGames, setUpcomingGames] = useState([]);
  const [completedGames, setCompletedGames] = useState([]);

  const [h2hCache, setH2hCache] = useState({});
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  const [seasonStats, setSeasonStats] = useState(null);

  /* ---------- CLICK OUTSIDE MANAGER DROPDOWN ---------- */
  useEffect(() => {
    function handleClickOutside(event) {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target)) {
        setManagerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- SEASONS ---------- */
  useEffect(() => {
    async function fetchSeasons() {
      const { data } = await supabase
        .from("seasons")
        .select("season")
        .order("season", { ascending: true });

        if (data?.length) {
          const seasonsArr = data.map((s) => s.season);
          setSeasons(seasonsArr);
        
          const savedSeason = Number(localStorage.getItem("scheduleSeason"));
        
          if (savedSeason && seasonsArr.includes(savedSeason)) {
            setSelectedSeason(savedSeason);
          } else {
            const newestSeason = Math.max(...seasonsArr);
            setSelectedSeason(newestSeason);
            localStorage.setItem("scheduleSeason", newestSeason);
          }
        }
    }
    fetchSeasons();
  }, []);

  /* ---------- TEAMS / MANAGERS ---------- */
  useEffect(() => {
    if (!selectedSeason) return;

    async function fetchTeams() {
      const { data } = await supabase
        .from("pnpl_standings")
        .select("nhl_team, manager")
        .eq("season", selectedSeason);

      if (!data || !data.length) {
        setTeams([]);
        setSelectedTeam("");
        return;
      }

      setTeams(data);

      const map = {};
      data.forEach((r) => {
        map[r.nhl_team] = r.manager;
      });
      setTeamToManager(map);

      const existingTeam = data.find((t) => t.manager === selectedManager);
      if (existingTeam) {
        setSelectedTeam(existingTeam.nhl_team);
      } else {
        setSelectedTeam(data[0].nhl_team);
        setSelectedManager(data[0].manager);
      }
    }

    fetchTeams();
  }, [selectedSeason]);

  /* ---------- MANAGER AVATARS ---------- */
  useEffect(() => {
    async function fetchAvatars() {
      const { data } = await supabase
        .from("managers")
        .select("name, discord_avatar_url");

      if (!data) return;

      const map = {};
      data.forEach((m) => {
        map[m.name] = m.discord_avatar_url;
      });
      setManagerAvatars(map);
    }

    fetchAvatars();
  }, []);

  /* ---------- SCHEDULE ---------- */
  useEffect(() => {
    if (!selectedSeason) return;

    async function fetchGames() {
      const { data } = await supabase
        .from("pnpl_raw_schedule")
        .select(`
          game_id,
          season,
          home,
          away,
          home_team,
          away_team,
          home_score,
          away_score
        `)
        .eq("season", selectedSeason)
        .order("game_id");

      if (!data) return;

      setGames(
        data.map((g) => ({
          ...g,
          played: g.home_score !== null && g.away_score !== null,
        }))
      );
    }

    fetchGames();
  }, [selectedSeason]);

  /* ---------- FILTER ---------- */
  useEffect(() => {
    if (!selectedTeam) {
      setUpcomingGames([]);
      setCompletedGames([]);
      setH2hCache({});
      setSeasonStats(null);
      return;
    }

    const filtered = games.filter(
      (g) => g.home_team === selectedTeam || g.away_team === selectedTeam
    );

    setUpcomingGames(filtered.filter((g) => !g.played));
    setCompletedGames(filtered.filter((g) => g.played));
  }, [selectedTeam, games]);

  /* ---------- H2H ---------- */
  useEffect(() => {
    if (!selectedTeam) return;

    const manager = teamToManager[selectedTeam];
    if (!manager) return;

    async function fetchH2H() {
      const { data } = await supabase.rpc("get_h2h_stats", {
        p_manager_name: manager,
      });

      const cache = {};
      (data || []).forEach((row) => {
        cache[row.opponent] = {
          w: row.w,
          l: row.l,
          t: row.t,
          gf: row.gf,
          ga: row.ga,
          gd: row.gf - row.ga,
        };
      });

      setH2hCache(cache);
    }

    fetchH2H();
  }, [selectedTeam, teamToManager]);

  /* ---------- SEASON STATS CARD ---------- */
  useEffect(() => {
    if (!selectedManager || !selectedSeason) {
      setSeasonStats(null);
      return;
    }

    async function fetchStats() {
      const { data } = await supabase
        .from("pnpl_standings")
        .select("season_rank, w, l, t, pts_percent, gf, ga, gd")
        .eq("season", selectedSeason)
        .eq("manager", selectedManager)
        .single();

      setSeasonStats(data || null);
    }

    fetchStats();
  }, [selectedSeason, selectedManager]);

  /* ---------- GROUPING ---------- */
  const upcomingByOpponent = {};
  upcomingGames.forEach((g) => {
    const oppTeam = g.home_team === selectedTeam ? g.away_team : g.home_team;
    if (!upcomingByOpponent[oppTeam]) upcomingByOpponent[oppTeam] = g;
  });

  const completedByOpponent = {};
  completedGames.forEach((g) => {
    const oppTeam = g.home_team === selectedTeam ? g.away_team : g.home_team;
    if (!completedByOpponent[oppTeam]) completedByOpponent[oppTeam] = [];
    completedByOpponent[oppTeam].push(g);
  });

  /* ---------- RESULT COLOR ---------- */
  function resultClass(g) {
    if (g.home_score === null || g.away_score === null) return "";
    if (g.home_score === g.away_score) return "is-tie";
    const teamWon =
      (selectedTeam === g.home_team && g.home_score > g.away_score) ||
      (selectedTeam === g.away_team && g.away_score > g.home_score);
    return teamWon ? "is-win" : "is-loss";
  }

  /* ---------- OPPONENT CARD ---------- */
  function renderOpponentCard(oppTeam, oppGames = []) {
    const oppManager = teamToManager[oppTeam];
    const h2h = oppManager && h2hCache[oppManager];

    return (
      <div className="panel schedule-opponent-card" key={oppTeam}>
        <div className="schedule-opponent-info">
          <TeamBadge team={oppTeam} size="md" />
          <div className="schedule-opponent-names">
            <span className="schedule-opponent-name">{oppTeam}</span>
            {oppManager && <span className="schedule-opponent-manager">{oppManager}</span>}
          </div>
        </div>

        <div className="schedule-results">
          {oppGames.length ? (
            oppGames.map((g) => (
              <div className={`schedule-result-row ${resultClass(g)}`} key={g.game_id}>
                <TeamBadge team={g.away_team} size="md" />
                <span>{g.away_score}</span>
                <span className="schedule-result-dash">–</span>
                <span>{g.home_score}</span>
                <TeamBadge team={g.home_team} size="md" />
              </div>
            ))
          ) : (
            <span className="schedule-no-games">—</span>
          )}
        </div>

        {h2h && (
          <div className="schedule-h2h">
            {managerAvatars[oppManager] && (
              <img src={managerAvatars[oppManager]} alt={oppManager} className="schedule-h2h-avatar" />
            )}
            <div>
              <div className="schedule-h2h-record">
                {h2h.w}-{h2h.l}-{h2h.t}
              </div>
              <div className="schedule-h2h-detail">
                GF {h2h.gf} • GA {h2h.ga} • GD {h2h.gd}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout>
      <div className="page schedule-page">
        <h1 className="page-title">Schedule</h1>

        {/* ---------- CONTROLS ---------- */}
        <div className="panel schedule-controls">
          <div className="schedule-control">
            <label className="schedule-control-label">Season</label>
            <select
              className="season-select"
              value={selectedSeason || ""}
              onChange={(e) => {
                const season = Number(e.target.value);
                setSelectedSeason(season);
                localStorage.setItem("scheduleSeason", season);
              }}
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="schedule-control" ref={managerDropdownRef}>
            <label className="schedule-control-label">Manager</label>
            <div className={`manager-select ${managerDropdownOpen ? "is-open" : ""}`}>
              <div className="manager-select-trigger" onClick={() => setManagerDropdownOpen((o) => !o)}>
                <span className="manager-select-trigger-label">
                  {selectedTeam ? teamToManager[selectedTeam] : "-- Choose --"}
                </span>
                {selectedTeam && <TeamBadge team={selectedTeam} size="md" />}
                <span className="manager-select-caret" />
              </div>

              {managerDropdownOpen && (
                <ul className="manager-select-menu">
                  {teams
                    .slice()
                    .sort((a, b) => a.manager.localeCompare(b.manager))
                    .map((t) => (
                      <li
                        key={t.nhl_team}
                        className={`manager-select-option ${t.nhl_team === selectedTeam ? "is-active" : ""}`}
                        onClick={() => {
                          setSelectedTeam(t.nhl_team);
                          setSelectedManager(t.manager);
                        
                          localStorage.setItem("scheduleTeam", t.nhl_team);
                          localStorage.setItem("scheduleManager", t.manager);
                        
                          setManagerDropdownOpen(false);
                        }}
                      >
                        <span>{t.manager}</span>
                        <TeamBadge team={t.nhl_team} size="md" />
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ---------- SEASON STATS ---------- */}
        <div className="panel schedule-stats-panel">
          {seasonStats ? (
            <>
              <div className="schedule-stat">
                <div className="schedule-stat-value">{seasonStats.season_rank}</div>
                <div className="schedule-stat-label">Rank</div>
              </div>
              <div className="schedule-stat">
                <div className="schedule-stat-value">
                  {seasonStats.w} / {seasonStats.l} / {seasonStats.t}
                </div>
                <div className="schedule-stat-label">W / L / T</div>
              </div>
              <div className="schedule-stat">
                <div className="schedule-stat-value">
                  {seasonStats.pts_percent != null ? seasonStats.pts_percent.toFixed(3) : "—"}
                </div>
                <div className="schedule-stat-label">Pts%</div>
              </div>
              <div className="schedule-stat">
                <div className="schedule-stat-value">{seasonStats.gf}</div>
                <div className="schedule-stat-label">GF</div>
              </div>
              <div className="schedule-stat">
                <div className="schedule-stat-value">{seasonStats.ga}</div>
                <div className="schedule-stat-label">GA</div>
              </div>
              <div className="schedule-stat">
                <div className="schedule-stat-value">{seasonStats.gd}</div>
                <div className="schedule-stat-label">GD</div>
              </div>
            </>
          ) : (
            <div className="schedule-stats-empty">No manager data for this season</div>
          )}
        </div>

        {/* ---------- GAME LISTS ---------- */}
        {selectedTeam && (
          <>
            {Object.keys(upcomingByOpponent).length > 0 && (
              <>
                <div className="schedule-section-title">
                  <span className="icon">📅</span>
                  Remaining Games
                </div>
                <div className="schedule-list-header">
  <span className="schedule-list-header-col schedule-list-header-info">
    Opponent
  </span>
  <span className="schedule-list-header-col schedule-list-header-results"></span>
  <span className="schedule-list-header-col schedule-list-header-h2h">
    All-Time H2H
  </span>
</div>
                <div className="schedule-opponent-list">
                  {Object.keys(upcomingByOpponent).map((opp) => renderOpponentCard(opp, []))}
                </div>
              </>
            )}

            {Object.keys(completedByOpponent).length > 0 && (
              <>
                <div className="schedule-section-title is-complete">
                  <span className="icon">✅</span>
                  Completed Games
                </div>
                <div className="schedule-list-header">
                  <span className="schedule-list-header-col schedule-list-header-info">Opponent</span>
                  <span className="schedule-list-header-col schedule-list-header-results">
                    <span className="schedule-score-header">Score</span>
                    </span>
                  <span className="schedule-list-header-col schedule-list-header-h2h">All-Time H2H</span>
                </div>
                <div className="schedule-opponent-list">
                  {Object.keys(completedByOpponent).map((opp) =>
                    renderOpponentCard(opp, completedByOpponent[opp])
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}