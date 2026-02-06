import { useEffect, useState, useRef } from "react";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";
import { supabase } from "../supabaseClient";
import { nhlLogos } from "../constants/nhlLogos";

export default function PnplSchedule() {
  const managerDropdownRef = useRef(null);

  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);

  const [teams, setTeams] = useState([]);
  const [teamToManager, setTeamToManager] = useState({});

  const [managerAvatars, setManagerAvatars] = useState({});

  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedManager, setSelectedManager] = useState("");
  const [games, setGames] = useState([]);

  const [upcomingGames, setUpcomingGames] = useState([]);
  const [completedGames, setCompletedGames] = useState([]);

  const [h2hCache, setH2hCache] = useState({});
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  const [seasonStats, setSeasonStats] = useState(null); // new state for aggregated stats

  const dropdownHeight = 40;
  const logoSize = 28;
  const winColor = "#00FF80";

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
        setSelectedSeason(Math.max(...seasonsArr));
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

      // Determine NHL team for currently selected manager if exists this season
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
          homeLogo: nhlLogos[g.home_team],
          awayLogo: nhlLogos[g.away_team],
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

  /* ---------- COLUMNS ---------- */
  const columns = [
    {
      key: "opponent",
      label: "Opponent",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={row.opponentLogo} width={28} />
          <strong>{row.opponent}</strong>
        </div>
      ),
    },
    {
      key: "results",
      label: "Results",
      render: (row) =>
        row.games.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {row.games.map((g) => {
              let color = "#FFFFFF";

              if (g.home_score !== null && g.away_score !== null) {
                if (g.home_score === g.away_score) color = "yellow";
                else if (
                  (selectedTeam === g.home_team && g.home_score > g.away_score) ||
                  (selectedTeam === g.away_team && g.away_score > g.home_score)
                )
                  color = winColor;
                else color = "red";
              }

              return (
                <div
                  key={g.game_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color,
                    fontWeight: color !== "#FFFFFF" ? "bold" : "normal",
                  }}
                >
                  <img src={g.awayLogo} width={20} height={20} />
                  <span>{g.away_score}</span>
                  <span style={{ opacity: 0.6 }}>–</span>
                  <span>{g.home_score}</span>
                  <img src={g.homeLogo} width={20} height={20} />
                </div>
              );
            })}
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "h2h",
      label: "All Time H2H",
      render: (row) => {
        if (!row.h2h) return "";

        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderLeft: "2px solid rgba(255,255,255,0.15)",
              paddingLeft: 12,
            }}
          >
            <img src={row.managerAvatar} width={32} style={{ borderRadius: "50%" }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: "bold" }}>
                {row.h2h.w}-{row.h2h.l}-{row.h2h.t}
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                GF {row.h2h.gf} • GA {row.h2h.ga} • GD {row.h2h.gd}
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  const buildRow = (oppTeam, games = []) => {
    const oppManager = teamToManager[oppTeam];
    const h2h = oppManager && h2hCache[oppManager];

    return {
      opponent: oppTeam,
      opponentLogo: nhlLogos[oppTeam],
      games,
      h2h,
      managerAvatar: managerAvatars[oppManager],
    };
  };

  /* ---------- SECTION HEADER COMPONENT ---------- */
  const SectionHeader = ({ title, color, icon }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 40,
        padding: "8px 16px",
        borderRadius: 12,
        background: `linear-gradient(90deg, ${color}44, ${color}22)`,
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        fontWeight: "bold",
        fontSize: "1.25rem",
        color: "#FFFFFF",
      }}
    >
      {icon && <span style={{ fontSize: "1.5rem" }}>{icon}</span>}
      {title}
    </div>
  );

  return (
    <Layout>
      <h1 style={{ textAlign: "center", color: "#00FFFF", fontSize: "3rem" }}>Schedule</h1>

      {/* ---------- DROPDOWNS ---------- */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 20, marginTop: 20, paddingLeft: 40 }}>
        {/* SEASON */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ fontWeight: "bold", color: "#00FFFF", marginBottom: 6 }}>Season:</label>
          <select
            value={selectedSeason || ""}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            style={{
              fontSize: "1rem",
              padding: "0 1rem",
              borderRadius: 8,
              border: "2px solid #00FFFF",
              backgroundColor: "rgba(0,255,255,0.1)",
              color: "#FFFFFF",
              fontWeight: "bold",
              outline: "none",
              cursor: "pointer",
              minWidth: 120,
              height: `${dropdownHeight}px`,
              lineHeight: `${dropdownHeight}px`,
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpolygon points='0,0 10,0 5,5' fill='white'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.5rem center",
              backgroundSize: "10px 10px",
            }}
          >
            {seasons.map((s) => (
              <option key={s} value={s} style={{ backgroundColor: "#001F2F", color: "#FFFFFF" }}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* MANAGER */}
        <div ref={managerDropdownRef} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 220, position: "relative" }}>
          <label style={{ fontWeight: "bold", color: "#00FFFF", marginBottom: 6 }}>Manager:</label>
          <div
            onClick={() => setManagerDropdownOpen((o) => !o)}
            style={{
              border: "2px solid #00FFFF",
              borderRadius: 8,
              backgroundColor: "rgba(0,255,255,0.1)",
              color: "#FFFFFF",
              fontWeight: "bold",
              cursor: "pointer",
              padding: "0 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              height: `${dropdownHeight}px`,
              lineHeight: `${dropdownHeight}px`,
              zIndex: 5,
              position: "relative",
            }}
          >
            <span>{selectedTeam ? teamToManager[selectedTeam] : "-- Choose --"}</span>
            {selectedTeam && <img src={nhlLogos[selectedTeam]} width={logoSize} height={logoSize} style={{ borderRadius: "50%" }} />}
            <span style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid white", marginLeft: "auto" }} />
          </div>

          {managerDropdownOpen && (
            <ul
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                backgroundColor: "#001F2F",
                listStyle: "none",
                padding: 0,
                margin: 0,
                border: "2px solid #00FFFF",
                borderRadius: 8,
                maxHeight: 250,
                overflowY: "auto",
                zIndex: 10,
              }}
            >
              {teams
                .slice()
                .sort((a, b) => a.manager.localeCompare(b.manager))
                .map((t) => (
                  <li
                    key={t.nhl_team}
                    onClick={() => {
                      setSelectedTeam(t.nhl_team);
                      setSelectedManager(t.manager);
                      setManagerDropdownOpen(false);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,255,255,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span>{t.manager}</span>
                    <img src={nhlLogos[t.nhl_team]} width={logoSize} height={logoSize} style={{ borderRadius: "50%" }} />
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- SEASON STATS CARD ---------- */}
<div
  style={{
    margin: "30px auto",
    maxWidth: 700,
    background: "#001F2F",             // same as tables
    borderRadius: 16,
    padding: "16px 24px",
    boxShadow: "0 8px 16px rgba(0, 255, 255, 0.3)", // cyan glow like tables
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "24px",
    color: "#FFFFFF",
    fontWeight: "500",
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
  }}
>
  {seasonStats ? (
    <>
      <div style={{ flex: "1 1 100px" }}>
        <div style={{ fontSize: "0.95rem", opacity: 0.6 }}>Rank</div>
        <div style={{ fontSize: "1.4rem", fontWeight: "700" }}>{seasonStats.season_rank}</div>
      </div>

      <div style={{ flex: "1 1 120px" }}>
        <div style={{ fontSize: "0.95rem", opacity: 0.6 }}>W / L / T</div>
        <div style={{ fontSize: "1.3rem", fontWeight: "600" }}>
          {seasonStats.w} / {seasonStats.l} / {seasonStats.t}
        </div>
      </div>

      <div style={{ flex: "1 1 100px" }}>
        <div style={{ fontSize: "0.95rem", opacity: 0.6 }}>Pts%</div>
        <div style={{ fontSize: "1.3rem", fontWeight: "600" }}>{seasonStats.pts_percent.toFixed(3)}</div>
      </div>

      <div style={{ flex: "1 1 100px" }}>
        <div style={{ fontSize: "0.95rem", opacity: 0.6 }}>GF</div>
        <div style={{ fontSize: "1.3rem", fontWeight: "600" }}>{seasonStats.gf}</div>
      </div>

      <div style={{ flex: "1 1 100px" }}>
        <div style={{ fontSize: "0.95rem", opacity: 0.6 }}>GA</div>
        <div style={{ fontSize: "1.3rem", fontWeight: "600" }}>{seasonStats.ga}</div>
      </div>

      <div style={{ flex: "1 1 100px" }}>
        <div style={{ fontSize: "0.95rem", opacity: 0.6 }}>GD</div>
        <div style={{ fontSize: "1.3rem", fontWeight: "600" }}>{seasonStats.gd}</div>
      </div>
    </>
  ) : (
    <div style={{ width: "100%", opacity: 0.6 }}>No manager data for this season</div>
  )}
</div>







      {/* ---------- TABLES ---------- */}
      {selectedTeam && (
        <>
          {Object.keys(upcomingByOpponent).length > 0 && <SectionHeader title="Remaining Games" color="#FFD700" icon="📅" />}
          {Object.keys(upcomingByOpponent).length > 0 && <PnplTable columns={columns} data={Object.keys(upcomingByOpponent).map((opp) => buildRow(opp, []))} />}

          {Object.keys(completedByOpponent).length > 0 && <SectionHeader title="Completed Games" color="#00FFAA" icon="✅" />}
          {Object.keys(completedByOpponent).length > 0 && <PnplTable columns={columns} data={Object.keys(completedByOpponent).map((opp) => buildRow(opp, completedByOpponent[opp]))} />}
        </>
      )}
    </Layout>
  );
}
