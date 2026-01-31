import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";

export default function ManagerStatsPage() {
  const [managerStats, setManagerStats] = useState([]);

  useEffect(() => {
    async function fetchManagerStats() {
      const { data, error } = await supabase
        .from("pnpl_manager_stats")
        .select("*")
        .order("pts", { ascending: false }); // default sort by points

      if (!error && data?.length) {
        setManagerStats(data);
      }
    }
    fetchManagerStats();
  }, []);

  const sortableColumns = [
    { key: "rank", label: "#" },
    { key: "manager", label: "Manager" },
    { key: "gp", label: "GP" },
    { key: "w", label: "W" },
    { key: "l", label: "L" },
    { key: "t", label: "T" },
    { key: "pts", label: "PTS", bold: true, color: "#FFD700" },
    { key: "pts_pct", label: "PTS %" },
    { key: "gf", label: "GF" },
    { key: "ga", label: "GA" },
    { key: "gd", label: "GD" },
    { key: "gf_per_game", label: "GF/G" },
    { key: "ga_per_game", label: "GA/G" },
  ];

  // Add rank numbers dynamically
  const dataWithRank = managerStats
    .sort((a, b) => b.pts - a.pts)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return (
    <Layout>
      <h1
        style={{
          textAlign: "center",
          fontSize: "5rem",
          fontWeight: "bold",
          color: "#00FFFF",
          textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF",
          marginBottom: "50px",
        }}
      >
        Manager Stats
      </h1>

      <PnplTable
        columns={sortableColumns}
        data={dataWithRank}
      />
    </Layout>
  );
}
