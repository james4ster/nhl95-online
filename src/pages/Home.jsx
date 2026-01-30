import Layout from "../components/Layout";

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

  return (
    <Layout>
      {/* Outer page border reflecting NHL95 ice */}
      <div
        style={{
          minHeight: "calc(100vh - 80px)", // leaving room for header/footer
          border: "20px solid #A0E5FF",
          borderImage: "url('/images/ice_border.png') 30 stretch", // optional ice texture
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
            src="/images/logo.jpg" // <-- fixed: just public path, no import
            alt="NHL95 League Logo"
            style={{
              width: "200px",
              height: "200px",
              objectFit: "contain",
              marginBottom: "20px",
              filter: "drop-shadow(0 0 20px #00FFFF)",
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

        {/* Main Content: Left = Highlights, Right = News/Discord */}
        <div
          style={{
            display: "flex",
            gap: "30px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Left Panel: Highlights */}
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
            <h2 style={{ color: "#00FFFF", marginBottom: "15px", textAlign: "center" }}>
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
                <span style={{ color: "#FFD700" }}>{h.value}</span>
              </div>
            ))}
          </div>

          {/* Right Panel: News / Discord */}
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
            <h2 style={{ color: "#00FFFF", marginBottom: "15px", textAlign: "center" }}>
              News & Community
            </h2>
            <ul style={{ color: "#FFFFFF", paddingLeft: "20px" }}>
              {news.map((n, i) => (
                <li key={i} style={{ marginBottom: "8px" }}>
                  {n}
                </li>
              ))}
            </ul>

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
                  e.currentTarget.style.boxShadow = "0 0 20px #00FFFF";
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
