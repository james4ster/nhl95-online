// src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../supabaseClient";
import { nhlLogos } from "../constants/nhlLogos";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [seasonEnd, setSeasonEnd] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [lastGames, setLastGames] = useState([]);
  const [topManagers, setTopManagers] = useState([]);
  const [highlights, setHighlights] = useState([]);

  // --- Load all data ---
  useEffect(() => {
    async function loadData() {
      // Current season
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

      // --- Highlights for current season ---
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
        gamesPlayed =
          (standings?.reduce((sum, s) => sum + (Number(s.gp) || 0), 0) / 2) || 0;
        const totalGames =
          (standings?.reduce(
            (sum, s) => sum + (Number(s.total_games) || 0),
            0
          ) / 2) || 0;
        gamesRemaining = totalGames - gamesPlayed;
      }

      setHighlights([
        { title: "Current Season", value: currentSeason?.season ?? 0 },
        { title: "Teams", value: managersCount },
        { title: "Games Played", value: gamesPlayed },
        { title: "Games Remaining", value: gamesRemaining },
      ]);

      // --- Last 5 games ---
      const { data: lastGamesData } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .not("updated", "is", null)
        .order("game_timestamp", { ascending: false })
        .limit(5);

      // Fetch manager avatars separately
      const { data: managersData } = await supabase
        .from("managers")
        .select("name, discord_avatar_url");

      // Create a lookup map for quick access
      const managerAvatarMap = {};
      managersData?.forEach((m) => {
        managerAvatarMap[m.name] = m.discord_avatar_url;
      });

      setLastGames(
        lastGamesData?.map((g) => ({
          ...g,
          homeLogo: nhlLogos[g.home_team],
          awayLogo: nhlLogos[g.away_team],
          homeAvatar: managerAvatarMap[g.home],
          awayAvatar: managerAvatarMap[g.away],
        })) || []
      );

      // --- Top 3 managers ---
      const { data: topManagersData } = await supabase
        .from("pnpl_standings")
        .select("*")
        .eq("season", currentSeason.season)
        .order("pts", { ascending: false })
        .limit(8);

      setTopManagers(
        topManagersData?.map((s) => ({
          manager: s.manager,
          logo: nhlLogos[s.nhl_team],
          pts: s.pts,
        })) || []
      );
    }

    loadData();
  }, []);

  // --- Countdown timer ---
  useEffect(() => {
    if (!seasonEnd) return;

    const computeCountdown = () => {
      const now = new Date();
      const end = new Date(seasonEnd);
      const diff = end - now;

      if (diff <= 0) return "0d 0h 0m 0s";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    setCountdown(computeCountdown());
    const timer = setInterval(() => setCountdown(computeCountdown()), 1000);
    return () => clearInterval(timer);
  }, [seasonEnd]);

  return (
    <Layout>
      <div
        style={{
          minHeight: "calc(100vh - 80px)",
          border: "20px solid #A0E5FF",
          borderImage: "url('/images/ice_border.png') 30 stretch",
          padding: "20px",
          background: "linear-gradient(to bottom, #0B1C2D, #071026)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "30px",
        }}
      >




        {/* Hero Section */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/images/logo.jpg"
            alt="NHL95 League Logo"
            style={{
              width: "220px",
              height: "220px",
              objectFit: "contain",
              animation: "pulseGlowLogo 2.6s ease-in-out infinite",
            }}
          />
          <h1
            style={{
              color: "#00FFFF",
              fontSize: "3rem",
              textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF",
            }}
          >
            PNPL League
          </h1>
        </div>

        {/* Panels Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            justifyContent: "center",
          }}
        >
          {/* Season Overview Panel */}
          <div
            style={{
              background: "#0E3C5F",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 0 15px rgba(0,255,255,0.5)",
            }}
          >
            <h2
              style={{
                color: "#00FFFF",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              Season Overview
            </h2>
            {highlights.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  color: "#FFFFFF",
                  fontWeight: "bold",
                  fontSize: "1rem",
                }}
              >
                <span>{h.title}</span>
                <span>{h.value}</span>
              </div>
            ))}

            {/* Countdown Timer inside Season Overview */}
            {seasonEnd && (
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(0,255,255,0.2)" }}>
                <div
                  style={{
                    color: "#00FFFF",
                    textAlign: "center",
                    marginBottom: "8px",
                    fontWeight: "bold",
                  }}
                >
                  Season Ends In:
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {(() => {
                    const [d, h, m, s] = countdown
                      .split(/d|h|m|s/)
                      .map((v) => v.trim())
                      .filter(Boolean);
                    return [
                      { label: "Days", value: d },
                      { label: "Hours", value: h },
                      { label: "Min", value: m },
                      { label: "Sec", value: s },
                    ].map((t, i) => (
                      <div
                        key={i}
                        style={{
                          background: "rgba(0,255,255,0.1)",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          minWidth: "45px",
                          textAlign: "center",
                          color: "#FFFFFF",
                          fontWeight: "bold",
                          fontSize: "0.9rem",
                        }}
                      >
                        <div style={{ fontSize: "1.2rem", color: "#FFD700" }}>
                          {t.value}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "#FFFFFF" }}>
                          {t.label}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Top Managers Panel */}
          <div
            style={{
              background: "#0E3C5F",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 0 15px rgba(0,255,255,0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h2
              style={{
                color: "#00FFFF",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              Current Standings
            </h2>
            <div style={{ flex: 1 }}>
              {topManagers.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                  }}
                >
                  <img src={m.logo} style={{ width: "28px", height: "28px" }} />
                  <span style={{ color: "#FFFFFF", fontWeight: "bold" }}>
                    {m.manager}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "#FFFFFF",
                      fontWeight: "bold",
                    }}
                  >
                    {m.pts} pts
                  </span>
                </div>
              ))}
            </div>
            
            {/* View Full Standings Link */}
            <Link
              to="/standings"
              style={{
                marginTop: "auto",
                alignSelf: "flex-end",
                padding: "4px 8px",
                color: "#00FFFF",
                textDecoration: "none",
                fontSize: "0.7rem",
                opacity: 0.6,
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = "1";
                e.target.style.textShadow = "0 0 8px rgba(0,255,255,0.8)";
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = "0.6";
                e.target.style.textShadow = "none";
              }}
            >
              <span>view all</span>
              <span style={{ fontSize: "0.6rem" }}>→</span>
            </Link>
          </div>

          {/* Last 5 Games Panel */}
          <div
            style={{
              background: "#0E3C5F",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 0 15px rgba(0,255,255,0.5)",
              color: "#FFFFFF",
              overflowX: "auto",
            }}
          >
            <h2
              style={{
                color: "#00FFFF",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              Last 5 Games
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {lastGames.map((g, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    background: "rgba(0,255,255,0.05)",
                  }}
                >
                  {/* Away Discord Avatar - far left */}
                  {g.awayAvatar && (
                    <img
                      src={g.awayAvatar}
                      alt={g.away}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  {/* Center cluster: NHL logos and scores */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, justifyContent: "center" }}>
                    {/* Away NHL Logo */}
                    <img
                      src={g.awayLogo}
                      alt={g.away_team}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                      }}
                    />
                    {/* Away Score */}
                    <span style={{ color: "#FFFFFF", fontWeight: "bold", minWidth: "20px", textAlign: "center" }}>
                      {g.away_score ?? "--"}
                    </span>
                    {/* Dash */}
                    <span style={{ color: "#FFFFFF", fontWeight: "bold", padding: "0 4px" }}>
                      -
                    </span>
                    {/* Home Score */}
                    <span style={{ color: "#FFFFFF", fontWeight: "bold", minWidth: "20px", textAlign: "center" }}>
                      {g.home_score ?? "--"}
                    </span>
                    {/* Home NHL Logo */}
                    <img
                      src={g.homeLogo}
                      alt={g.home_team}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                      }}
                    />
                  </div>

                  {/* Home Discord Avatar - far right */}
                  {g.homeAvatar && (
                    <img
                      src={g.homeAvatar}
                      alt={g.home}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}