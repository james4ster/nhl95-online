import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

export function useBarRaceData() {
  const [barRaceFrames, setBarRaceFrames] = useState([]);
  const [barRaceFrame, setBarRaceFrame] = useState(0);

  useEffect(() => {
    async function loadBarRaceData() {
      const { data: allGames, error } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .order("game_id", { ascending: true });

      if (error || !allGames || allGames.length === 0) {
        console.error("Error fetching games for bar race:", error);
        setBarRaceFrames([]);
        return;
      }

      const cumulativeGF = {};
      const frames = [];

      allGames.forEach((game) => {
        if (game.home) {
          cumulativeGF[game.home] =
            (cumulativeGF[game.home] || 0) + (game.home_score || 0);
        }
        if (game.away) {
          cumulativeGF[game.away] =
            (cumulativeGF[game.away] || 0) + (game.away_score || 0);
        }

        frames.push({
          gameId: game.game_id,
          season: game.season,
          managerStats: { ...cumulativeGF },
        });
      });

      setBarRaceFrames(frames);
    }

    loadBarRaceData();
  }, []);

  return { barRaceFrames, barRaceFrame, setBarRaceFrame };
}
