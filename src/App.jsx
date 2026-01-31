// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home.jsx";
import StandingsPage from "./pages/pnplStandings.jsx";
import ChampionsPage from "./pages/pnplChampions.jsx";
import ManagerStatsPage from "./pages/pnplManagerStats";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/champions" element={<ChampionsPage />} />
        <Route path="/manager-stats" element={<ManagerStatsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
