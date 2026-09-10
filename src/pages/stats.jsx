// src/pages/stats.jsx
import React from "react";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Layout from "../components/Layout";
import TeamBadge from "../components/TeamBadge";
import ManagerAvatar from "../components/ManagerAvatar";

// key: column key, label: header text, align, defaultDir: sort direction on first click
const TEAM_COLUMNS = [
  { key: "nhl_team", label: "Team", align: "left", defaultDir: "asc", isTeam: true },
  { key: "gp", label: "GP", defaultDir: "desc" },
  { key: "w", label: "W", defaultDir: "desc" },
  { key: "l", label: "L", defaultDir: "asc" },
  { key: "t", label: "T", defaultDir: "desc" },
  { key: "pts", label: "PTS", defaultDir: "desc" },
  { key: "pts_fraction", label: "PTS %", defaultDir: "desc", isPct: true },
  { key: "gf", label: "GF", defaultDir: "desc" },
  { key: "ga", label: "GA", defaultDir: "asc" },
  { key: "gd", label: "GD", defaultDir: "desc", isGD: true },
  { key: "gf_per_game", label: "GF/G", defaultDir: "desc", isDecimal: true },
  { key: "ga_per_game", label: "GA/G", defaultDir: "asc", isDecimal: true },
  { key: "so", label: "SO", defaultDir: "desc" },
  { key: "titles", label: "Titles", defaultDir: "desc", isTitles: true },
];

const MANAGER_COLUMNS = [
  { key: "manager", label: "Manager", align: "left", defaultDir: "asc" },
  { key: "gp", label: "GP", defaultDir: "desc" },
  { key: "w", label: "W", defaultDir: "desc" },
  { key: "l", label: "L", defaultDir: "asc" },
  { key: "t", label: "T", defaultDir: "desc" },
  { key: "pts", label: "PTS", defaultDir: "desc" },
  { key: "pts_pct", label: "PTS %", defaultDir: "desc", isPct: true },
  { key: "gf", label: "GF", defaultDir: "desc" },
  { key: "ga", label: "GA", defaultDir: "asc" },
  { key: "gd", label: "GD", defaultDir: "desc", isGD: true },
  { key: "gf_per_game", label: "GF/G", defaultDir: "desc", isDecimal: true },
  { key: "ga_per_game", label: "GA/G", defaultDir: "asc", isDecimal: true },
  { key: "shutouts", label: "SO", defaultDir: "desc" },
  { key: "champ_total", label: "Titles", defaultDir: "desc", isTitles: true },
];

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState("team");
  const [teamStats, setTeamStats] = useState([]);
  const [managerStats, setManagerStats] = useState([]);
  const [managerAvatars, setManagerAvatars] = useState({});
  const [loading, setLoading] = useState(true);

  const [teamSort, setTeamSort] = useState({ key: "pts", dir: "desc" });
  const [managerSort, setManagerSort] = useState({ key: "pts", dir: "desc" });

  useEffect(() => {
    async function fetchStats() {
      const [{ data: team }, { data: manager }, { data: managers }] = await Promise.all([
        supabase.from("pnpl_nhl_team_aggr_stats_vw").select("*"),
        supabase.from("pnpl_manager_stats_vw").select("*"),
        supabase.from("managers").select("name, discord_id, discord_avatar_url"),
      ]);
      
      if (team) setTeamStats(team);
      if (manager) setManagerStats(manager);
      
      const avatarMap = {};
      (managers || []).forEach((m) => {
        avatarMap[m.name] = {
          avatar_url: m.discord_avatar_url,
          discord_id: m.discord_id,
        };
      });
      
      setManagerAvatars(avatarMap);
      setLoading(false);
      if (team) setTeamStats(team);
      if (manager) setManagerStats(manager);
      setLoading(false);
    }
    fetchStats();
  }, []);

  function handleSort(columns, sort, setSort, key) {
    if (sort.key === key) {
      setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      const col = columns.find((c) => c.key === key);
      setSort({ key, dir: col?.defaultDir || "desc" });
    }
  }

  function sortRows(rows, sort) {
    return [...rows].sort((a, b) => {
      let av = a[sort.key];
      let bv = b[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && isNaN(parseFloat(av))) {
        av = av.toLowerCase();
        bv = (bv || "").toLowerCase();
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      }
      const an = typeof av === "string" ? parseFloat(av) : av;
      const bn = typeof bv === "string" ? parseFloat(bv) : bv;
      return sort.dir === "asc" ? an - bn : bn - an;
    });
  }

  function renderTable(rows, columns, sort, setSort, keyField) {
    const sorted = sortRows(rows, sort);

    return (
      <div className="panel home-panel stats-table-panel">
        <div className="stats-table-scroll">
          <table className="standings-table stats-table">
            <thead>
              <tr>
                <th className="col-sticky col-sticky-rank">#</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`${sort.key === col.key ? "is-sorted" : ""} ${
                      col.isTeam || col.align === "left" ? "col-sticky col-sticky-name" : ""
                    }`}
                    onClick={() => handleSort(columns, sort, setSort, col.key)}
                    style={col.align === "left" ? { textAlign: "left" } : undefined}
                  >
                    {col.label}
                    {sort.key === col.key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row[keyField] ?? i}>
                  <td className="col-sticky col-sticky-rank">{i + 1}</td>
                  {columns.map((col) => {
                    let value = row[col.key];
                    let cellClass = sort.key === col.key ? "stats-cell-sorted" : "";
                    if (col.isGD && value > 0) value = `+${value}`;
                    if (col.isGD) cellClass += value >= 0 ? " stats-gd-pos" : " stats-gd-neg";
                    if (col.isPct && value != null) value = parseFloat(value).toFixed(3);
                    if (col.isDecimal && value != null) value = parseFloat(value).toFixed(2);
                    if (col.isTitles && value > 0) {
                      return (
                        <td key={col.key} className={`stats-titles-cell ${cellClass}`}>
                          🏆 {value}
                        </td>
                      );
                    }
                    if (col.isTeam) {
                      return (
                        <td
                          key={col.key}
                          className={`stats-team-cell col-sticky col-sticky-name ${cellClass}`}
                        >
                          <TeamBadge team={row.nhl_team} size="md" />
                          <span>{row.nhl_team}</span>
                        </td>
                      );
                    }
                    if (col.key === "manager") {
                      const managerAvatar = managerAvatars[row.manager];
                    
                      return (
                        <td
                          key={col.key}
                          className={`stats-team-cell col-sticky col-sticky-name ${cellClass}`}
                        >
                          {managerAvatar && (
                            <ManagerAvatar
                              src={managerAvatar.avatar_url}
                              discordId={managerAvatar.discord_id}
                              alt={row.manager}
                              className="stats-manager-avatar"
                            />
                          )}
                          <span>{row.manager}</span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className={cellClass}
                        style={col.align === "left" ? { textAlign: "left" } : undefined}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="page">
        <h1 className="page-title">Stats</h1>

        <div className="panel standings-controls">
          <div className="view-tabs">
            <button
              className={`view-tab ${activeTab === "team" ? "is-active" : ""}`}
              onClick={() => setActiveTab("team")}
            >
              NHL Team Stats
            </button>
            <button
              className={`view-tab ${activeTab === "manager" ? "is-active" : ""}`}
              onClick={() => setActiveTab("manager")}
            >
              Manager Stats
            </button>
          </div>
        </div>

        {loading ? (
          <div className="stats-loading">Loading stats...</div>
        ) : activeTab === "team" ? (
          renderTable(teamStats, TEAM_COLUMNS, teamSort, setTeamSort, "nhl_team")
        ) : (
          renderTable(managerStats, MANAGER_COLUMNS, managerSort, setManagerSort, "manager")
        )}
      </div>
    </Layout>
  );
}