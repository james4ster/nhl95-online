import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Layout from "../components/Layout";
import PnplTable from "../components/PnplTable";

export default function ChampionsPage() {
  const [champions, setChampions] = useState([]);

  useEffect(() => {
    async function fetchChampions() {
      // Fetch NHL team logos
      const { data: teams } = await supabase
        .from("nhl_teams")
        .select("code, logo_url");
      const logosMap = {};
      teams?.forEach((t) => (logosMap[t.code] = t.logo_url));

      // Fetch champions
      const { data: champData, error } = await supabase
        .from("pnpl_standings")
        .select("season, manager, nhl_team") // <-- include nhl_team
        .not("champ", "is", null)
        .order("season", { ascending: false });

      if (!error && champData) {
        setChampions(
          champData.map((row) => ({
            ...row,
            logo_url: logosMap[row.nhl_team] || null,
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
          { key: "logo_url", label: "Team", type: "logo" },
          { key: "manager", label: "Manager" },
        ]}
        data={champions
          .sort((a, b) => b.season - a.season)
          .map((row) => ({ ...row }))} // no champ key included
      />
    </Layout>
  );
}
