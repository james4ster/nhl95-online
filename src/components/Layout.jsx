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
              className={({ isActive }) => "desktop-nav-link" + (isActive ? " is-active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <ThemeToggle />
      </header>

      <main className="app-main">{children}</main>

      <nav className="mobile-tabbar" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => "tabbar-link" + (isActive ? " is-active" : "")}
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