import Layout from "../components/Layout";
import { useEffect, useState } from "react";

export default function HomePage() {
  // Placeholder data for highlights & news
  const highlights = [
    { title: "Current Season", value: "1" },
    { title: "Teams", value: "12" },
    { title: "Managers", value: "12" },
  ];

  const news = [
    "Draft coming next week!",
    "New rule update for penalty points.",
    "Check out the Champions page for last season's winner!",
  ];

  // --- Animated Stat Component ---
  const AnimatedStat = ({ value }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let start = 0;
      const end = Number(value);
      if (end === 0) return;

      const stepTime = 50; // ms per increment
      const increment = Math.ceil(end / 20); // 20 steps

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

    return <span style={{ color: "#FFD700" }}>{count}</span>;
  };

  return (
    <Layout>
      {/* Outer page border reflecting NHL95 ice */}
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
        <style>{`
          @keyframes pulse {
            0% { filter: drop-shadow(0 0 10px #00FFFF); }
            50% { filter: drop-shadow(0 0 25px #00FFFF); }
            100% { filter: drop-shadow(0 0 10px #00FFFF); }
          }

          @keyframes scrollNews {
            0% { top: 100%; }
            100% { top: -100%; }
          }
        `}</style>

        {/* Hero Section */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/images/logo.jpg"
            alt="NHL95 League Logo"
            style={{
              width: "200px",
              height: "200px",
              objectFit: "contain",
              marginBottom: "20px",
              filter: "drop-shadow(0 0 20px #00FFFF)",
              animation: "pulse 2s infinite alternate",
            }}
          />
          <h1
            style={{
              color: "#00FFFF",
              textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF",
              fontSize: "3rem",
            }}
          >
            Welcome to the PNPL!
          </h1>
          <p style={{ color: "#FFFFFF", fontSize: "1.2rem", marginTop: "8px" }}>
            The world's greatest NHL95 league!
          </p>
        </div>

        {/* Main Content: Highlights & News */}
        <div
          style={{
            display: "flex",
            gap: "30px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Highlights Panel */}
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
            <h2
              style={{
                color: "#00FFFF",
                marginBottom: "15px",
                textAlign: "center",
              }}
            >
              League Highlights
            </h2>
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
          </div>

          {/* News Panel */}
          <div
            style={{
              flex: "1 1 300px",
              minWidth: "250px",
              background: "#0E3C5F",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 0 15px rgba(0,255,255,0.5)",
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                color: "#00FFFF",
                marginBottom: "15px",
                textAlign: "center",
              }}
            >
              News & Community
            </h2>

            {/* News Ticker */}
            <div
              style={{
                overflow: "hidden",
                height: "80px",
                position: "relative",
              }}
            >
              <ul
                style={{
                  position: "absolute",
                  animation: "scrollNews 10s linear infinite",
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {news.map((n, i) => (
                  <li key={i} style={{ marginBottom: "15px", color: "#FFFFFF" }}>
                    {n}
                  </li>
                ))}
              </ul>
            </div>

            {/* Discord Button */}
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <a
                href="https://discord.gg/w3xey3EV"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "2px solid #00FFFF",
                  color: "#00FFFF",
                  textDecoration: "none",
                  fontWeight: "bold",
                  boxShadow: "0 0 10px rgba(0,255,255,0.5)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#00FFFF";
                  e.currentTarget.style.color = "#0B1C2D";
                  e.currentTarget.style.boxShadow =
                    "0 0 30px #00FFFF, 0 0 50px #FFD700";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#00FFFF";
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(0,255,255,0.5)";
                }}
              >
                Join our Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
