import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react"; // ✅ SPA compatible

import HomePage from "./pages/Home.jsx";
import StandingsPage from "./pages/pnplStandings.jsx";
import ChampionsPage from "./pages/pnplChampions.jsx";
import ManagerStatsPage from "./pages/pnplManagerStats.jsx";
import ManagersOverview from "./pages/pnplManagersOverview.jsx";
import ManagerProfile from "./pages/pnplManagerProfile.jsx";
import TeamStatsPage from "./pages/pnplNHLTeamStats";
import PnplSchedule from "./pages/pnplSchedule.jsx";


function App() {
  return (
    <Router>
      {/* Vercel Analytics automatically tracks page views in SPA */}
      <Analytics />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/schedule" element={<PnplSchedule />} />
        <Route path="/champions" element={<ChampionsPage />} />
        <Route path="/manager-stats" element={<ManagerStatsPage />} />
        
        <Route path="/manager" element={<ManagerProfile />} />
<Route path="/manager/:managerId" element={<ManagerProfile />} />

        <Route path="/team-stats" element={<TeamStatsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
