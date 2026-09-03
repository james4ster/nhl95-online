import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import HomePage from "./pages/home.jsx";
import StandingsPage from "./pages/standings.jsx";
import SchedulePage from "./pages/schedule.jsx";
import ChampionsPage from "./pages/champions.jsx";

function App() {
  return (
    <Router>
      <Analytics />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/champions" element={<ChampionsPage />} />

        {/* Add routes back in as each page gets built:
        <Route path="/manager-stats" element={<ManagerStatsPage />} />
        <Route path="/team-stats" element={<TeamStatsPage />} />
        */}
      </Routes>
    </Router>
  );
}

export default App;