// src/pages/pnplNHLTeamStats.jsx
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../supabaseClient";
import { nhlLogos } from "../constants/nhlLogos";

export default function TeamStatsPage() {
  const [teamStats, setTeamStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: "pts",
    direction: "desc",
  });

  useEffect(() => {
    async function fetchTeamStats() {
      const { data, error } = await supabase
        .from("pnpl_nhl_team_aggr_stats_vw")
        .select("*");

      if (!error && data?.length) {
        setTeamStats(data);
      }
      setLoading(false);
    }

    fetchTeamStats();
  }, []);

  const handleSort = (key) => {
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const sorted = [...teamStats].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const aNum = typeof aVal === "string" ? parseFloat(aVal) : aVal;
      const bNum = typeof bVal === "string" ? parseFloat(bVal) : bVal;

      if (sortConfig.direction === "asc") return aNum - bNum;
      return bNum - aNum;
    });

    // add rank column
    return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
  };

  const columns = [
    { key: "rank", label: "#" },
    { key: "logo", label: "Team", align: "left" },
    //{ key: "nhl_team", label: "Team", align: "left" },
    { key: "gp", label: "GP" },
    { key: "w", label: "W" },
    { key: "l", label: "L" },
    { key: "t", label: "T" },
    { key: "pts", label: "PTS" },
    { key: "pts_fraction", label: "PTS %" },
    { key: "gf", label: "GF" },
    { key: "ga", label: "GA" },
    { key: "gd", label: "GD" },
    { key: "gf_per_game", label: "GF/G" },
    { key: "ga_per_game", label: "GA/G" },
    { key: "so", label: "SO" },
    { key: "titles", label: "Titles" },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", color: "#00FFFF", fontSize: "1.5rem" }}>
          Loading team statistics...
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
        NHL Team Statistics
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
                  onClick={col.key !== "logo" && col.key !== "rank" ? () => handleSort(col.key) : undefined}

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
                >
                  {col.label}
                  {col.key !== "logo" && col.key !== "rank" && (
                    <>
                      {" "}
                      {sortConfig.key === col.key
                        ? sortConfig.direction === "asc"
                          ? " ↑"
                          : " ↓"
                        : " ↕"}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {getSortedData().map((team, idx) => (
              <tr
                key={team.nhl_team}
                style={{
                  background:
                    idx % 2 === 0
                      ? "rgba(0,255,255,0.05)"
                      : "rgba(0,255,255,0.02)",
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
                  let value = team[col.key];
                  let color = "#FFFFFF";
                  let fontWeight = "normal";

                  if (col.key === "gd") {
                    color = value >= 0 ? "#00FF00" : "#FF6B6B";
                    fontWeight = "bold";
                  }

                  if (col.key === "titles" && value > 0) {
                    value = `🏆 ${value}`;
                    fontWeight = "bold";
                  }

                  if (col.key === "pts_fraction") {
                    value = parseFloat(value).toFixed(3);
                  }

                  const background =
                    sortConfig.key === col.key
                      ? "rgba(0,255,255,0.08)"
                      : "transparent";

                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px",
                        textAlign: col.align || "center",
                        color,
                        fontWeight,
                        background,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.key === "logo" ? (
                        <img
                          src={nhlLogos[team.nhl_team]}
                          alt={team.nhl_team}
                          style={{
                            width: "36px",
                            height: "36px",
                            objectFit: "contain",
                          }}
                        />
                      ) : col.key === "gd" && value > 0 ? (
                        `+${value}`
                      ) : (
                        value
                      )}
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
