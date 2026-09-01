import { Link } from "react-router-dom";
import { useState, useRef } from "react";

export default function Layout({ children }) {
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const submenuTimeoutRef = useRef(null);

  const menuItems = [
    { name: "Home", path: "/" },
    { name: "Standings", path: "/standings" },
    { name: "Schedule", path: "/schedule" },
    {
      name: "Stats",
      subMenu: [
        { name: "Manager", path: "/manager-stats" },
        { name: "Team", path: "/team-stats" },
      ],
    },
    { name: "Champions", path: "/champions" },
    { name: "Managers", path: "/manager" }, 
    { name: "Analytics", path: "/analytics" },
    
  ];

  const handleMouseEnter = (idx) => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
    setOpenSubmenu(idx);
  };

  const handleMouseLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setOpenSubmenu(null);
    }, 150);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#0B1C2D",
        fontFamily: "monospace",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 40px",
          background: "#091421",
          boxShadow: "0 0 25px rgba(0,255,234,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link to="/">
            <img
              src="/images/logo.jpg"
              alt="League Logo"
              style={{
                width: "80px",
                height: "80px",
                objectFit: "contain",
                marginRight: "16px",
              }}
            />
          </Link>
          <h1
            style={{
              color: "#00FFFF",
              fontSize: "2.5rem",
              fontWeight: "bold",
              textShadow: "0 0 12px #00FFFF",
              margin: 0,
            }}
          >
            NHL 95 Online
          </h1>
        </div>
      </header>

      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          background: "#0E2A44",
          padding: "12px 0",
          boxShadow: "0 0 15px rgba(0,255,255,0.3)",
        }}
      >
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            style={{ position: "relative", margin: "0 20px" }}
            onMouseEnter={() => handleMouseEnter(idx)}
            onMouseLeave={handleMouseLeave}
          >
            <Link
              to={item.path}
              style={{
                color: "#00FFFF",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "1.1rem",
                padding: "6px 12px",
                borderRadius: "6px",
                transition: "all 0.3s ease",
                boxShadow: "0 0 8px rgba(0,255,255,0.3)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 0 10px #00FFFF, 0 0 20px #00FFFF")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 0 8px rgba(0,255,255,0.3)")
              }
            >
              {item.name}
            </Link>

            {/* Submenu */}
            {item.subMenu && openSubmenu === idx && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  background: "#0A2337",
                  padding: "8px 0",
                  borderRadius: "6px",
                  boxShadow: "0 0 15px rgba(0,255,255,0.5)",
                  minWidth: "160px",
                  zIndex: 100,
                }}
              >
                {item.subMenu.map((sub, sidx) => (
                  <Link
                    key={sidx}
                    to={sub.path}
                    style={{
                      display: "block",
                      padding: "8px 16px",
                      color: "#00FFFF",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(0,255,255,0.2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Page Content */}
      
<div
  style={{
    position: "absolute",
    top: "20px",
    right: "20px",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "linear-gradient(135deg, #00FFFF, #0B1C2D)",
    borderRadius: "40px",
    boxShadow: "0 0 20px rgba(0,255,255,0.5), 0 0 40px rgba(0,255,255,0.3)",
    cursor: "pointer",
    transition: "transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "scale(1.05)";
    e.currentTarget.style.boxShadow =
      "0 0 30px rgba(0,255,255,0.8), 0 0 50px rgba(0,255,255,0.5)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow =
      "0 0 20px rgba(0,255,255,0.5), 0 0 40px rgba(0,255,255,0.3)";
  }}
  onClick={() => window.open("https://discord.gg/KvPFzMNs", "_blank")}
>
  {/* Discord Icon */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 71 55"
    fill="currentColor"
    style={{
      color: "#FFFFFF",
      animation: "pulseGlowDiscord 2.6s ease-in-out infinite",
    }}
  >
    <path d="M60.104 4.552A58.32 58.32 0 0045.152 0a39.73 39.73 0 00-1.858 4.052 55.933 55.933 0 00-16.706 0A39.73 39.73 0 0024.73 0 58.318 58.318 0 009.778 4.552C2.856 20.136-.598 35.504.888 50.824a58.08 58.08 0 0017.08 4.368c1.36-1.856 2.592-3.84 3.664-5.92a38.223 38.223 0 01-5.392-2.528c.456-.336.904-.688 1.344-1.024 10.688 4.96 22.336 4.96 33.024 0 .44.336.888.688 1.344 1.024a38.223 38.223 0 01-5.392 2.528c1.072 2.08 2.304 4.064 3.664 5.92a58.08 58.08 0 0017.08-4.368c1.48-15.344-2.976-30.712-9.888-46.272zM23.04 37.04c-3.2 0-5.824-2.88-5.824-6.4 0-3.52 2.592-6.4 5.824-6.4 3.248 0 5.856 2.88 5.824 6.4 0 3.52-2.592 6.4-5.824 6.4zm24.896 0c-3.2 0-5.824-2.88-5.824-6.4 0-3.52 2.592-6.4 5.824-6.4 3.248 0 5.824 2.88 5.824 6.4 0 3.52-2.576 6.4-5.824 6.4z"/>
  </svg>

  {/* Text */}
  <span
    style={{
      color: "#FFFFFF",
      fontWeight: "bold",
      fontSize: "0.85rem",
    }}
  >
    Join Discord
  </span>
</div>

{/* Add this at the bottom of Layout for the pulse animation */}
<style>{`
  @keyframes pulseGlowDiscord {
    0%, 100% {
      filter: drop-shadow(0 0 10px rgba(0,255,255,0.45))
              drop-shadow(0 0 20px rgba(0,255,255,0.25))
              drop-shadow(0 0 40px rgba(0,255,255,0.15));
    }
    50% {
      filter: drop-shadow(0 0 14px rgba(0,255,255,0.65))
              drop-shadow(0 0 28px rgba(0,255,255,0.45))
              drop-shadow(0 0 50px rgba(0,255,255,0.25));
    }
  }
`}</style>
             



      <main
        style={{
          padding: "40px 16px",
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "16px",
          borderTop: "2px solid #00FFFF",
          color: "#00FFFF",
          marginTop: "auto",
        }}
      >
        © {new Date().getFullYear()} PNPL League
      </footer>
    </div>
  );
}
