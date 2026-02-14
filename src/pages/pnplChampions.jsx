// src/pages/ChampionsPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
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

        // Calculate manager championship counts
        const managerCounts = {};
        enriched.forEach(champ => {
          if (!managerCounts[champ.manager]) {
            managerCounts[champ.manager] = {
              manager: champ.manager,
              titles: 0,
              seasons: [],
              teams: []
            };
          }
          managerCounts[champ.manager].titles += 1;
          managerCounts[champ.manager].seasons.push(champ.season);
          managerCounts[champ.manager].teams.push(champ.nhl_team);
        });

        const statsArray = Object.values(managerCounts).sort((a, b) => b.titles - a.titles);
        setManagerStats(statsArray);
      }
    }
    fetchChampions();
  }, []);

  const getMedalEmoji = (idx) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return "🏅";
  };

  return (
    <Layout>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "60px" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          <img 
            src="/images/goldTrophy.png" 
            alt="Trophy"
            style={{ 
              width: "80px", 
              height: "80px",
              filter: "drop-shadow(0 0 20px #00FFFF)",
              animation: "float 3s ease-in-out infinite"
            }}
          />
          <h1
            style={{
              fontSize: "5rem",
              fontWeight: "bold",
              color: "#00FFFF",
              textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF",
              margin: 0,
            }}
          >
            Champions
          </h1>
          <img 
            src="/images/goldTrophy.png" 
            alt="Trophy"
            style={{ 
              width: "80px", 
              height: "80px",
              filter: "drop-shadow(0 0 20px #00FFFF)",
              animation: "float 3s ease-in-out infinite",
              animationDelay: "1.5s"
            }}
          />
        </div>
        <p style={{ color: "#00FFFF", fontSize: "1.3rem", fontWeight: "600", opacity: 0.8 }}>
          {champions.length} Seasons of Glory
        </p>
      </div>

      {/* Vertical Championship Timeline */}
      <div style={{ marginBottom: "60px", maxWidth: "900px", margin: "0 auto 60px" }}>
        <div style={{ position: "relative", paddingLeft: "60px" }}>
          {/* Vertical Line */}
          <div
            style={{
              position: "absolute",
              left: "30px",
              top: "0",
              bottom: "0",
              width: "4px",
              background: "linear-gradient(180deg, #00FFFF, #0080FF)",
              boxShadow: "0 0 10px #00FFFF",
            }}
          />

          {champions.map((champ, idx) => (
            <div
              key={`${champ.season}-${champ.manager}`}
              style={{
                position: "relative",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {/* Timeline Dot */}
              <div
                style={{
                  position: "absolute",
                  left: "-42px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#00FFFF",
                  border: "3px solid #0B1C2D",
                  boxShadow: "0 0 15px #00FFFF",
                  zIndex: 2,
                }}
              />

              {/* Championship Card */}
              <div
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
                  borderRadius: "12px",
                  padding: "16px 24px",
                  border: "2px solid #00BFFF",
                  boxShadow: "0 4px 16px rgba(0,191,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(8px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,255,255,0.4)";
                  e.currentTarget.style.borderColor = "#00FFFF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,191,255,0.2)";
                  e.currentTarget.style.borderColor = "#00BFFF";
                }}
              >
                {/* Season */}
                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: "bold",
                    color: "#00FFFF",
                    minWidth: "100px",
                    flexShrink: 0,
                  }}
                >
                  Season {champ.season}
                </div>

                {/* NHL Team Logo */}
                <img
                  src={champ.logo_url}
                  alt={champ.nhl_team}
                  style={{
                    width: "48px",
                    height: "48px",
                    objectFit: "contain",
                    filter: "drop-shadow(0 0 8px #00FFFF)",
                    flexShrink: 0,
                  }}
                />

                {/* Manager Name */}
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#fff",
                    flex: 1,
                  }}
                >
                  {champ.manager}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manager Dynasty Rankings - REDESIGNED */}
      <div style={{ marginBottom: "60px" }}>
        <h2
          style={{
            color: "#00FFFF",
            fontSize: "2.5rem",
            textAlign: "center",
            marginBottom: "30px",
            textShadow: "0 0 10px #00FFFF",
          }}
        >
          Championship Leaderboard
        </h2>
        
       {/* Podium - Top 3 */}
<div style={{ 
  display: "flex", 
  justifyContent: "center", 
  alignItems: "flex-end", 
  gap: "20px",
  marginBottom: "40px",
  flexWrap: "wrap",
}}>
  {/* 2nd Place */}
  {managerStats[1] && (
    <div style={{ 
      textAlign: "center",
      flex: "0 1 250px",
    }}>
      <div style={{ fontSize: "4rem", marginBottom: "10px" }}>🥈</div>
      <div
        style={{
          background: "linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)",
          borderRadius: "16px",
          padding: "30px 20px",
          border: "3px solid #C0C0C0",
          boxShadow: "0 8px 32px rgba(192,192,192,0.5)",
          minHeight: "180px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#000" }}>
          {managerStats[1].manager}
        </div>
        <div>
          <div style={{ fontSize: "3rem", fontWeight: "900", color: "#000", lineHeight: "1" }}>
            {managerStats[1].titles}
          </div>
          <div style={{ fontSize: "0.95rem", color: "#333", fontWeight: "600", marginTop: "8px" }}>
            {managerStats[1].titles === 1 ? "Championship" : "Championships"}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* 1st Place - Tallest */}
  {managerStats[0] && (
    <div style={{ 
      textAlign: "center",
      flex: "0 1 280px",
    }}>
      <div style={{ fontSize: "5rem", marginBottom: "10px" }}>🥇</div>
      <div
        style={{
          background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
          borderRadius: "16px",
          padding: "40px 20px",
          border: "3px solid #FFD700",
          boxShadow: "0 12px 48px rgba(255,215,0,0.6)",
          minHeight: "220px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: "2.2rem", fontWeight: "bold", color: "#000" }}>
          {managerStats[0].manager}
        </div>
        <div>
          <div style={{ fontSize: "4rem", fontWeight: "900", color: "#000", lineHeight: "1" }}>
            {managerStats[0].titles}
          </div>
          <div style={{ fontSize: "1.05rem", color: "#333", fontWeight: "600", marginTop: "10px" }}>
            {managerStats[0].titles === 1 ? "Championship" : "Championships"}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* 3rd Place */}
  {managerStats[2] && (
    <div style={{ 
      textAlign: "center",
      flex: "0 1 250px",
    }}>
      <div style={{ fontSize: "4rem", marginBottom: "10px" }}>🥉</div>
      <div
        style={{
          background: "linear-gradient(135deg, #CD7F32 0%, #B8733A 100%)",
          borderRadius: "16px",
          padding: "30px 20px",
          border: "3px solid #CD7F32",
          boxShadow: "0 8px 32px rgba(205,127,50,0.5)",
          minHeight: "180px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#000" }}>
          {managerStats[2].manager}
        </div>
        <div>
          <div style={{ fontSize: "3rem", fontWeight: "900", color: "#000", lineHeight: "1" }}>
            {managerStats[2].titles}
          </div>
          <div style={{ fontSize: "0.95rem", color: "#333", fontWeight: "600", marginTop: "8px" }}>
            {managerStats[2].titles === 1 ? "Championship" : "Championships"}
          </div>
        </div>
      </div>
    </div>
  )}
</div>

        {/* Rest of Rankings - Table Style */}
        {managerStats.length > 3 && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {managerStats.slice(3).map((stat, idx) => (
              <div
                key={stat.manager}
                style={{
                  background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
                  borderRadius: "12px",
                  padding: "20px 30px",
                  border: "2px solid #00BFFF",
                  boxShadow: "0 4px 16px rgba(0,191,255,0.2)",
                  marginBottom: "15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(8px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,255,255,0.4)";
                  e.currentTarget.style.borderColor = "#00FFFF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,191,255,0.2)";
                  e.currentTarget.style.borderColor = "#00BFFF";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "20px", flex: 1 }}>
                  <div style={{ 
                    fontSize: "1.5rem", 
                    fontWeight: "bold", 
                    color: "#888",
                    minWidth: "50px",
                  }}>
                    #{idx + 4}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#00FFFF" }}>
                    {stat.manager}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#00FFFF" }}>
                    {stat.titles}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#888", fontWeight: "600" }}>
                    {stat.titles === 1 ? "Title" : "Titles"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fun Stats */}
      <div style={{ marginTop: "60px", textAlign: "center" }}>
        <h2
          style={{
            color: "#00FFFF",
            fontSize: "2rem",
            marginBottom: "20px",
            textShadow: "0 0 10px #00FFFF",
          }}
        >
          Championship Facts
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          <div style={{ 
            background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)", 
            padding: "20px", 
            borderRadius: "12px", 
            border: "2px solid #00FFFF",
            boxShadow: "0 4px 16px rgba(0,255,255,0.2)"
          }}>
            <div style={{ fontSize: "2.5rem", color: "#00FFFF", fontWeight: "bold" }}>
              {managerStats[0]?.manager || "N/A"}
            </div>
            <div style={{ color: "#888", marginTop: "8px", fontSize: "1rem" }}>Most Titles ({managerStats[0]?.titles || 0})</div>
          </div>
          <div style={{ 
            background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)", 
            padding: "20px", 
            borderRadius: "12px", 
            border: "2px solid #00FFFF",
            boxShadow: "0 4px 16px rgba(0,255,255,0.2)"
          }}>
            <div style={{ fontSize: "2.5rem", color: "#00FFFF", fontWeight: "bold" }}>
              {champions[0]?.manager || "N/A"}
            </div>
            <div style={{ color: "#888", marginTop: "8px", fontSize: "1rem" }}>Reigning Champion</div>
          </div>
          <div style={{ 
            background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)", 
            padding: "20px", 
            borderRadius: "12px", 
            border: "2px solid #00FFFF",
            boxShadow: "0 4px 16px rgba(0,255,255,0.2)"
          }}>
            <div style={{ fontSize: "2.5rem", color: "#00FFFF", fontWeight: "bold" }}>
              {new Set(champions.map(c => c.manager)).size}
            </div>
            <div style={{ color: "#888", marginTop: "8px", fontSize: "1rem" }}>Different Champions</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </Layout>
  );
}