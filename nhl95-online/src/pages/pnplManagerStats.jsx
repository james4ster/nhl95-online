// src/pages/pnplManagerStats.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";

export default function ManagerStatsPage() {
  const [managerStats, setManagerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: "pts",
    direction: "desc",
  });

  useEffect(() => {
    async function fetchManagerStats() {
      const { data, error } = await supabase
        .from("pnpl_manager_stats_vw")
        .select("*");

      if (!error && data?.length) {
        setManagerStats(data);
      }
      setLoading(false);
    }
    fetchManagerStats();
  }, []);

  const handleSort = (key) => {
    let direction = "desc"; // default descending
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const sorted = [...managerStats].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const aNum = typeof aVal === "string" ? parseFloat(aVal) : aVal;
      const bNum = typeof bVal === "string" ? parseFloat(bVal) : bVal;

      if (sortConfig.direction === "asc") return aNum - bNum;
      else return bNum - aNum;
    });

    // Add dynamic rank for the first column
    return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
  };

  const columns = [
    { key: "rank", label: "#" },
    { key: "manager", label: "Manager", align: "left" },
    { key: "gp", label: "GP" },
    { key: "w", label: "W" },
    { key: "l", label: "L" },
    { key: "t", label: "T" },
    { key: "pts", label: "PTS" }, // no bold or gold
    { key: "pts_pct", label: "PTS %" },
    { key: "gf", label: "GF" },
    { key: "ga", label: "GA" },
    { key: "gd", label: "GD" },
    { key: "gf_per_game", label: "GF/G" },
    { key: "ga_per_game", label: "GA/G" },
    { key: "shutouts", label: "SO" },
    { key: "champ_total", label: "Titles" }
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", color: "#00FFFF", fontSize: "1.5rem" }}>
          Loading manager statistics...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1
        style={{
          textAlign: "center",
          fontSize: "2.5rem",
          fontWeight: "bold",
          color: "#00FFFF",
          textShadow: "0 0 10px #00FFFF",
          marginBottom: "30px",
        }}
      >
        Manager Statistics
      </h1>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#0E3C5F",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 0 20px rgba(0,255,255,0.3)",
          }}
        >
          <thead>
            <tr style={{ background: "#0A2337" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: "16px 12px",
                    color: "#00FFFF",
                    fontWeight: col.bold ? "bold" : "normal",
                    fontSize: "1rem",
                    textAlign: col.align || "center",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: "2px solid rgba(0,255,255,0.3)",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,255,255,0.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {col.label}{" "}
                  {sortConfig.key === col.key
                    ? sortConfig.direction === "asc"
                      ? " ↑"
                      : " ↓"
                    : " ↕"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getSortedData().map((manager, idx) => (
              <tr
                key={manager.manager}
                style={{
                  background:
                    idx % 2 === 0
                      ? "rgba(0,255,255,0.05)"
                      : "rgba(0,255,255,0.02)",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(0,255,255,0.15)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    idx % 2 === 0
                      ? "rgba(0,255,255,0.05)"
                      : "rgba(0,255,255,0.02)")
                }
              >
                {columns.map((col) => {
                  let value = manager[col.key];
                  let cellColor = "#FFFFFF";
                  let fontWeight = col.bold ? "bold" : "normal";

                  if (col.key === "gd") {
                    cellColor = manager.gd >= 0 ? "#00FF00" : "#FF6B6B";
                    fontWeight = "bold";
                  }
                  
                  if (col.key === "champ_total" && value > 0) {
                    value = `🏆 ${value}`;
                    fontWeight = "bold";
                  }

                  // subtle background if this column is the sorted one
                  const background =
                    sortConfig.key === col.key ? "rgba(0,255,255,0.08)" : "transparent";

                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px",
                        color: cellColor,
                        fontWeight: fontWeight,
                        textAlign: col.align || "center",
                        background,
                      }}
                    >
                      {col.key === "pts_pct"
                        ? parseFloat(manager.pts_pct).toFixed(3)
                        : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
