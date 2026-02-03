// src/pages/ChampionsPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";
import { nhlLogos } from "../constants/nhlLogos";

export default function ChampionsPage() {
  const [champions, setChampions] = useState([]);

  useEffect(() => {
    async function fetchChampions() {
      // Fetch champions
      const { data: champData, error } = await supabase
        .from("pnpl_standings")
        .select("season, manager, nhl_team") // include nhl_team
        .not("champ", "is", null)
        .order("season", { ascending: false });

      if (!error && champData) {
        setChampions(
          champData.map((row) => ({
            ...row,
            // Use local logos instead of DB URLs
            logo_url: nhlLogos[row.nhl_team?.toUpperCase()] || "/images/nhl-logos/default.webp",
          }))
        );
      }
    }

    fetchChampions();
  }, []);

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
        Champions
      </h1>

      <PnplTable
        columns={[
          { key: "season", label: "Season" },
          {
            key: "logo_url",
            label: "Team",
            render: (row) =>
              row.logo_url ? (
                <img
  src={row.logo_url}
  alt={row.nhl_team}
  style={{
    width: "36px",
    height: "36px",
    objectFit: "contain",
    display: "block",
    margin: "0 auto",
  }}
/>

              ) : (
                row.nhl_team
              ),
          },
          { key: "manager", label: "Manager" },
        ]}
        data={champions
          .sort((a, b) => b.season - a.season)
          .map((row) => ({ ...row }))}
      />
    </Layout>
  );
}
