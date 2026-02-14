import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

export function useBlowoutData() {
  const [blowoutGames, setBlowoutGames] = useState([]);

  useEffect(() => {
    async function loadBlowouts() {
      const { data: allGames, error } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .order("game_id", { ascending: true });

      if (error || !allGames) {
        console.error("Error fetching blowouts:", error);
        return;
      }

      const gamesWithMargin = allGames.map((game) => {
        const gameData = {
          ...game,
          margin: Math.abs(game.home_score - game.away_score),
          totalGoals: game.home_score + game.away_score,
          winner: game.home_score > game.away_score ? game.home : game.away,
          loser: game.home_score > game.away_score ? game.away : game.home,
          winnerScore: Math.max(game.home_score, game.away_score),
          loserScore: Math.min(game.home_score, game.away_score),
          winnerNHL:
            game.home_score > game.away_score
              ? game.home_team
              : game.away_team,
          loserNHL:
            game.home_score > game.away_score
              ? game.away_team
              : game.home_team,
          homeTeamGoals: game.home_score,
          awayTeamGoals: game.away_score,
          homeNHL: game.home_team,
          awayNHL: game.away_team,
        };

        return gameData;
      });

      setBlowoutGames(gamesWithMargin);
    }

    loadBlowouts();
  }, []);

  return { blowoutGames };
}
