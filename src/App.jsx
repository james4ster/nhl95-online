import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react"; // ✅ SPA compatible

import HomePage from "./pages/home.jsx";

function App() {
  return (
    <Router>
      {/* Vercel Analytics automatically tracks page views in SPA */}
      <Analytics />

      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Add routes back in as each page gets built:
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/schedule" element={<PnplSchedule />} />
        <Route path="/champions" element={<ChampionsPage />} />
        <Route path="/manager-stats" element={<ManagerStatsPage />} />
        <Route path="/team-stats" element={<TeamStatsPage />} />
        */}
      </Routes>
    </Router>
  );
}

export default App;