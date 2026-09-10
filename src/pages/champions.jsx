// src/pages/ChampionsPage.jsx
import React from "react";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Layout from "../components/Layout";
import TeamBadge from "../components/TeamBadge";
import { nhlLogos } from "../constants/nhlLogos";

export default function ChampionsPage() {
  const [champions, setChampions] = useState([]);
  const [managerStats, setManagerStats] = useState([]);

  useEffect(() => {
    async function fetchChampions() {
      const { data: champData, error } = await supabase
        .from("pnpl_standings")
        .select("season, manager, nhl_team")
        .not("champ", "is", null)
        .order("season", { ascending: false });

      if (error) {
        console.error("Error fetching champions:", error);
        return;
      }

      if (champData) {
        const enriched = champData.map((row) => ({
          ...row,
          logo_url: nhlLogos[row.nhl_team?.toUpperCase()] || "/images/nhl-logos/default.webp",
        }));
        setChampions(enriched);

        const managerCounts = {};
        enriched.forEach((champ) => {
          if (!managerCounts[champ.manager]) {
            managerCounts[champ.manager] = {
              manager: champ.manager,
              titles: 0,
              seasons: [],
            };
          }
          managerCounts[champ.manager].titles += 1;
          managerCounts[champ.manager].seasons.push({
            season: champ.season,
            team: champ.nhl_team,
          });
        });

        const statsArray = Object.values(managerCounts).sort((a, b) => b.titles - a.titles);
        setManagerStats(statsArray);
      }
    }
    fetchChampions();
  }, []);

  const topTitles = managerStats[0]?.titles || 0;
  const tiedLeaders = managerStats.filter((m) => m.titles === topTitles);
  const reigningChamp = champions[0]?.manager || "N/A";
  const distinctChampions = new Set(champions.map((c) => c.manager)).size;

  return (
    <Layout>
      <div className="page">
        <h1 className="page-title">Champions</h1>

        <div className="panel champions-intro">
          <div className="champions-count">{champions.length}</div>
          <div className="champions-count-label">Seasons of Glory</div>
        </div>

        {/* Timeline */}
        <h2 className="section-heading">Championship History</h2>
        <div className="champ-timeline">
          {champions.map((champ, idx) => (
            <div
              key={`${champ.season}-${champ.manager}`}
              className={`panel champ-timeline-card ${idx === 0 ? "is-latest" : ""}`}
            >
              <div className="champ-season-num">{champ.season}</div>
              <div className="champ-timeline-main">
                <TeamBadge team={champ.nhl_team} size="lg" />
                <div className="champ-manager">{champ.manager}</div>
              </div>
              {idx === 0 && (
                <div className="champ-latest-tag">
                  <span className="champ-latest-icon">🏆</span> Reigning
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <h2 className="section-heading">All-Time Leaders</h2>
        <div className="panel champ-leaders-panel">
          {managerStats.map((stat, idx) => (
            <div key={stat.manager} className={`champ-leader-row ${idx === 0 ? "is-leader" : ""}`}>
              <div className="champ-leader-rank">#{idx + 1}</div>
              <div className="champ-leader-manager">{stat.manager}</div>
              <div className="champ-leader-seasons">
                {stat.seasons
                  .sort((a, b) => b.season - a.season)
                  .map((s) => (
                    <div className="champ-season-chip" key={s.season}>
                      <TeamBadge team={s.team} size="sm" />
                      <span className="champ-season-chip-label">S{s.season}</span>
                    </div>
                  ))}
              </div>
              <div className="champ-leader-titles">
                {stat.titles}
                <span className="champ-leader-titles-label">
                  {stat.titles === 1 ? "Title" : "Titles"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Facts */}
        <h2 className="section-heading">Championship Facts</h2>
        <div className="champ-facts-grid">
          <div className="panel champ-fact-card">
            <div className="champ-fact-value">
              {tiedLeaders.length > 1 ? tiedLeaders.map((m) => m.manager).join(" & ") : tiedLeaders[0]?.manager || "N/A"}
            </div>
            <div className="champ-fact-label">
              {tiedLeaders.length > 1 ? `Tied — Most Titles (${topTitles})` : `Most Titles (${topTitles})`}
            </div>
          </div>
          <div className="panel champ-fact-card">
            <div className="champ-fact-value">{reigningChamp}</div>
            <div className="champ-fact-label">Reigning Champion</div>
          </div>
          <div className="panel champ-fact-card">
            <div className="champ-fact-value">{distinctChampions}</div>
            <div className="champ-fact-label">Different Champions</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}