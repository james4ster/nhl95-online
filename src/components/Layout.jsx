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
