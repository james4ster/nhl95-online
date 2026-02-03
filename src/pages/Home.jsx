// src/pages/HomePage.jsx
import { useEffect, useState, memo } from "react";
import Layout from "../components/Layout";
import { supabase } from "../supabaseClient";
import { nhlLogos } from "../constants/nhlLogos";

// Animated Stat, memoized so it only animates on value change
const AnimatedStat = memo(({ value }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = Number(value ?? 0);
    setCount(0);

    if (end === 0) {
      setCount(0);
      return;
    }

    let start = 0;
    const stepTime = 50;
    const increment = Math.ceil(end / 20);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span style={{ color: "#FFD700", fontWeight: "bold" }}>{count}</span>;
});

export default function HomePage() {
  const [seasonEnd, setSeasonEnd] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [lastGames, setLastGames] = useState([]);
  const [topManagers, setTopManagers] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState(null);

  // --- Load all data ---
  useEffect(() => {
    async function loadData() {
      // Get current season
      const { data: currentSeason } = await supabase
        .from("seasons")
        .select("season, end_date")
        .order("season", { ascending: false })
        .limit(1)
        .single();

      setCurrentSeasonNumber(currentSeason?.season ?? null);

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

      // Ensure currentSeason is valid
      if (currentSeason?.season) {
        const { data: standings, error } = await supabase
          .from("pnpl_standings")
          .select("manager, gp, total_games")
          .eq("season", currentSeason.season);
      
        if (error) console.error("Error fetching standings:", error);
      
        const managersCount = standings?.length ?? 0;
        const gamesPlayed = standings?.reduce((sum, s) => sum + (Number(s.gp) || 0), 0) / 2 || 0;
        const gamesRemaining =
          standings?.reduce((sum, s) => sum + ((Number(s.total_games) || 0) - (Number(s.gp) || 0)), 0) / 2 || 0;
      
        setHighlights([
          { title: "Current Season", value: currentSeason.season },
          { title: "Teams", value: managersCount },
          { title: "Games Played", value: gamesPlayed },
          { title: "Games Remaining", value: gamesRemaining },
        ]);
      }
      


      // Last 5 games
      const { data: lastGamesData } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .not("updated", "is", null)
        .order("updated", { ascending: false })
        .limit(5);

      setLastGames(
        lastGamesData?.map((g) => ({
          ...g,
          homeLogo: nhlLogos[g.home_team],
          awayLogo: nhlLogos[g.away_team],
        })) || []
      );

      // Top 3 managers
      const { data: topManagersData } = await supabase
        .from("pnpl_standings")
        .select("*")
        .order("pts", { ascending: false })
        .limit(3);

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

  // Countdown timer
  useEffect(() => {
    if (!seasonEnd) return;

    const computeCountdown = () => {
      const now = new Date();
      const end = new Date(seasonEnd);
      const diff = end - now;

      if (diff <= 0) return "Season Ended";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    setCountdown(computeCountdown());

    const timer = setInterval(() => {
      setCountdown(computeCountdown());
    }, 1000);

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
          gap: "40px",
        }}
      >
        <style>{`
          @keyframes pulseShadow {
            0% { box-shadow: 0 0 10px #00FFFF; }
            50% { box-shadow: 0 0 25px #00FFFF; }
            100% { box-shadow: 0 0 10px #00FFFF; }
          }
        `}</style>

        {/* Hero Section */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/images/logo.jpg"
            alt="NHL95 League Logo"
            style={{
              width: "220px",
              height: "220px",
              objectFit: "contain",
              animation: "icyPulse 2.6s ease-in-out infinite",
              filter: `
                drop-shadow(0 0 14px rgba(0,255,255,0.45))
                drop-shadow(0 0 28px rgba(0,255,255,0.25))
                drop-shadow(0 0 50px rgba(0,255,255,0.15))
              `,
            }}
          />

          <h1
            style={{
              color: "#00FFFF",
              fontSize: "3rem",
              textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF",
            }}
          >
            PNPL NHL95 League
          </h1>

          {seasonEnd && (
            <p style={{ color: "#FFD700", fontWeight: "bold", fontSize: "1.2rem" }}>
              Season ends in: {countdown}
            </p>
          )}
        </div>

        {/* Season Overview + Top Managers */}
        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", justifyContent: "center" }}>
          <div
            style={{
              flex: "1 1 300px",
              minWidth: "250px",
              background: "#0E3C5F",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 0 15px rgba(0,255,255,0.5)",
            }}
          >
            <h2 style={{ color: "#00FFFF", textAlign: "center", marginBottom: "15px" }}>Season Overview</h2>
            {highlights.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  color: "#FFFFFF",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                }}
              >
                <span>{h.title}</span>
                <AnimatedStat value={h.value} />
              </div>
            ))}

            <h3 style={{ color: "#FFD700", textAlign: "center", marginTop: "20px" }}>Top Managers</h3>
            {topManagers.map((m, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}
              >
                <img src={m.logo} style={{ width: "32px", height: "32px" }} />
                <span style={{ color: "#FFFFFF", fontWeight: "bold" }}>{m.manager}</span>
                <span style={{ marginLeft: "auto", color: "#FFD700", fontWeight: "bold" }}>
                  {m.pts} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Last 5 Games Card */}
        <div
          style={{
            background: "#0E3C5F",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 0 15px rgba(0,255,255,0.5)",
            color: "#FFFFFF",
          }}
        >
          <h2 style={{ color: "#00FFFF", textAlign: "center", marginBottom: "15px" }}>Last 5 Games</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {lastGames.map((g, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px",
                  borderRadius: "8px",
                  background: "rgba(0,255,255,0.05)",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Away Team */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img
                    src={g.awayLogo}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: g.away_score > g.home_score ? "2px solid #FFFFFF" : "none",
                    }}
                  />
                  <span style={{ color: "#FFFFFF", fontWeight: "bold" }}>
                    {g.away_manager ?? g.away_team}
                  </span>
                </div>

                {/* Score */}
                <div style={{ color: "#FFFFFF", fontWeight: "bold" }}>
                  {g.away_score ?? "--"} - {g.home_score ?? "--"}
                </div>

                {/* Home Team */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#FFFFFF", fontWeight: "bold" }}>
                    {g.home_manager ?? g.home_team}
                  </span>
                  <img
                    src={g.homeLogo}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: g.home_score > g.away_score ? "2px solid #FFFFFF" : "none",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
