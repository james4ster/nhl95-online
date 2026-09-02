/*
REDESIGNED HOMEPAGE
*/
import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import TeamBadge from "../components/TeamBadge";
import CountdownTimer from "../components/CountdownTimer";
import { supabase } from "../utils/supabaseClient";

const LAST_GAMES_COUNT = 10;

export default function HomePage() {
  const [seasonEnd, setSeasonEnd] = useState(null);
  const [lastGames, setLastGames] = useState([]);
  const [topManagers, setTopManagers] = useState([]);
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    async function loadData() {
      const { data: currentSeason } = await supabase
        .from("seasons")
        .select("season, end_date")
        .order("season", { ascending: false })
        .limit(1)
        .single();

      if (currentSeason?.end_date) {
        const end = new Date(currentSeason.end_date);
        end.setHours(23, 59, 59, 999);
        setSeasonEnd(end.toISOString());
      } else {
        setSeasonEnd(null);
      }

      let managersCount = 0;
      let gamesPlayed = 0;
      let gamesRemaining = 0;

      if (currentSeason?.season) {
        const { data: standings, error } = await supabase
          .from("pnpl_standings")
          .select("manager, gp, total_games")
          .eq("season", currentSeason.season);

        if (error) console.error("Error fetching standings:", error);

        managersCount = standings?.length ?? 0;
        gamesPlayed = (standings?.reduce((sum, s) => sum + (Number(s.gp) || 0), 0) / 2) || 0;
        const totalGames =
          (standings?.reduce((sum, s) => sum + (Number(s.total_games) || 0), 0) / 2) || 0;
        gamesRemaining = totalGames - gamesPlayed;
      }

      setHighlights([
        { title: "Season", value: currentSeason?.season ?? 0 },
        { title: "Teams", value: managersCount },
        { title: "Played", value: gamesPlayed },
        { title: "Remaining", value: gamesRemaining },
      ]);

      const { data: lastGamesData } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .not("updated", "is", null)
        .order("game_timestamp", { ascending: false })
        .limit(LAST_GAMES_COUNT);

      const { data: managersData } = await supabase.from("managers").select("name, discord_avatar_url");
      const managerAvatarMap = {};
      managersData?.forEach((m) => {
        managerAvatarMap[m.name] = m.discord_avatar_url;
      });

      setLastGames(
        lastGamesData?.map((g) => ({
          ...g,
          homeAvatar: managerAvatarMap[g.home],
          awayAvatar: managerAvatarMap[g.away],
        })) || []
      );

      const { data: topManagersData } = await supabase
          .from("pnpl_standings")
          .select("*")
          .eq("season", currentSeason.season)
          .order("pts", { ascending: false })
          .limit(LAST_GAMES_COUNT);

        setTopManagers(
          topManagersData?.map((s) => ({
            manager: s.manager,
            nhl_team: s.nhl_team,
            pts: s.pts,
            gp: s.gp,
            w: s.w,
            l: s.l,
            t: s.t,
          })) || []
        );
    }

    loadData();
  }, []);

  return (
    <Layout>
      <div className="page home-page">
        <div className="home-hero">
          <img src="/images/logo.jpg" alt="PNPL League" className="home-hero-logo" />
          <h1 className="home-hero-title">PNPL League</h1>
        </div>

        {/* Season banner — quick stats + countdown, one thin strip */}
        <div className="panel season-banner">
          <div className="season-banner-stats">
            {highlights.map((h) => (
              <div className="stat-highlight" key={h.title}>
                <div className="stat-highlight-value">{h.value}</div>
                <div className="stat-highlight-label">{h.title}</div>
              </div>
            ))}
          </div>
          {seasonEnd && (
            <>
              <div className="season-banner-divider" />
              <CountdownTimer endIso={seasonEnd} />
            </>
          )}
        </div>

        <div className="home-grid">
          {/* Standings */}
          <div className="panel home-panel">
            <h2 className="home-panel-title">Current Standings</h2>
            <div className="home-standings-list">
              {topManagers.map((m, i) => (
                <div className="home-standings-row" key={m.manager}>
                <span className="home-standings-rank">{i + 1}</span>
                <TeamBadge team={m.nhl_team} size="lg" />
                <span className="home-standings-name">{m.manager}</span>
                <div className="home-standings-record">
                <div className="home-standings-record-item">
                    <span className="home-standings-record-value">{m.gp}</span>
                    <span className="home-standings-record-label">GP</span>
                  </div>
                  <div className="home-standings-record-item">
                    <span className="home-standings-record-value">{m.w}</span>
                    <span className="home-standings-record-label">W</span>
                  </div>
                  <div className="home-standings-record-item">
                    <span className="home-standings-record-value">{m.l}</span>
                    <span className="home-standings-record-label">L</span>
                  </div>
                  <div className="home-standings-record-item">
                    <span className="home-standings-record-value">{m.t}</span>
                    <span className="home-standings-record-label">T</span>
                  </div>
                </div>
                <span className="home-standings-pts">{m.pts} pts</span>
              </div>
              ))}
            </div>
            <Link to="/standings" className="home-view-all">
              View full standings →
            </Link>
          </div>

          {/* Last N games — narrower column, count adjusted to roughly match standings' height */}
          <div className="panel home-panel home-panel-narrow">
            <h2 className="home-panel-title">Last {LAST_GAMES_COUNT} Games</h2>
            <div className="home-games-list">
              {lastGames.map((g) => {
                const played = g.away_score !== null && g.away_score !== undefined;
                return (
                  <div className="game-row" key={g.game_id ?? `${g.away_team}-${g.home_team}-${g.game_timestamp}`}>
                    {g.awayAvatar && (
                      <img
                        src={g.awayAvatar}
                        alt={g.away}
                        className="game-row-avatar"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    <div className="game-row-center">
                      <TeamBadge team={g.away_team} size="md" />
                      <span className="game-row-score">{played ? g.away_score : "–"}</span>
                      <span className="game-row-dash">at</span>
                      <span className="game-row-score">{played ? g.home_score : "–"}</span>
                      <TeamBadge team={g.home_team} size="md" />
                    </div>
                    {g.homeAvatar && (
                      <img
                        src={g.homeAvatar}
                        alt={g.home}
                        className="game-row-avatar"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
