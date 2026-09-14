import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import HomePage from "./pages/home.jsx";
import StandingsPage from "./pages/standings.jsx";
import SchedulePage from "./pages/schedule.jsx";
import ChampionsPage from "./pages/champions.jsx";
import StatsPage from "./pages/stats.jsx";
import ManagerProfile from "./pages/managers.jsx";
import RecordsPage from "./pages/records.jsx";

function App() {
  return (
    <Router>
      <Analytics />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/champions" element={<ChampionsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/managers" element={<ManagerProfile />} />
        <Route path="/managers/:managerId" element={<ManagerProfile />} />  
        <Route path="/records" element={<RecordsPage />} />
      </Routes>
    </Router>
  );
}

export default App;