import React from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../ThemeContext";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/standings", label: "Standings", icon: "📊" },
  { to: "/schedule", label: "Schedule", icon: "🗓️" },
  { to: "/manager-stats", label: "Managers", icon: "👤" },
  { to: "/team-stats", label: "Teams", icon: "🏒" },
  { to: "/champions", label: "Champions", icon: "🏆" },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">{isDark ? "🌙" : "☀️"}</span>
      </span>
    </button>
  );
}

function DiscordLink() { return ( <a href="https://discord.gg/UGWggyVzM" className="discord-link" target="_blank" rel="noopener noreferrer" aria-label="Join our Discord server" title="Join our Discord server" > <svg className="discord-icon" viewBox="0 0 24 24" aria-hidden="true" > <path fill="currentColor"d="M19.54 5.06A16.94 16.94 0 0 0 15.42 3.8a11.9 11.9 0 0 0-.53 1.08 15.6 15.6 0 0 0-4.78 0A11.9 11.9 0 0 0 9.58 3.8a16.94 16.94 0 0 0-4.12 1.26C2.85 9.3 2.15 13.45 2.5 17.54a16.99 16.99 0 0 0 5.07 2.56c.62-.85 1.17-1.76 1.64-2.72a10.7 10.7 0 0 1-1.02-.49l.25-.19a12.1 12.1 0 0 0 9.12 0l.25.19c-.33.18-.67.35-1.02.49.47.96 1.02 1.87 1.64 2.72a16.99 16.99 0 0 0 5.07-2.56c.41-4.74-.7-8.85-3.96-12.48ZM8.73 15.6c-.99 0-1.8-.91-1.8-2.03s.79-2.03 1.8-2.03 1.81.91 1.8 2.03c0 1.12-.8 2.03-1.8 2.03Zm6.54 0c-.99 0-1.8-.91-1.8-2.03s.79-2.03 1.8-2.03 1.81.91 1.8 2.03c0 1.12-.8 2.03-1.8 2.03Z" /> </svg> </a> ); }

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="brand" end>
          <img src="/images/logo.jpg" alt="" className="brand-mark" />
          <span className="brand-name">PNPL League</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                "desktop-nav-link" + (isActive ? " is-active" : "")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <DiscordLink />
          <div className="header-actions"> 
          <ThemeToggle /> </div>
        </div> 
      </header>
           
      <main className="app-main">{children}</main>

      <nav className="mobile-tabbar" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              "tabbar-link" + (isActive ? " is-active" : "")
            }
          >
            <span className="tabbar-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="tabbar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
