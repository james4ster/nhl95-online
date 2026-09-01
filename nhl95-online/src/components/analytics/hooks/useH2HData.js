import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

export function useH2HData(selectedTeams) {
  const [racingData, setRacingData] = useState([]);
  const [isRacing, setIsRacing] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(0);

  useEffect(() => {
    let intervalId;

    async function loadRacing() {
      if (!selectedTeams.teamA || !selectedTeams.teamB) {
        setRacingData([]);
        return;
      }

      const { data: games, error } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .or(
          `and(home.eq.${selectedTeams.teamA},away.eq.${selectedTeams.teamB}),and(home.eq.${selectedTeams.teamB},away.eq.${selectedTeams.teamA})`
        )
        .order("season", { ascending: true })
        .order("game_id", { ascending: true });

      if (error || !games || games.length === 0) {
        console.error("Error fetching games:", error);
        setRacingData([]);
        setIsRacing(false);
        setCurrentSeason(0);
        return;
      }

      let teamAWins = 0,
        teamBWins = 0,
        teamATies = 0,
        teamBTies = 0;
      let teamAGF = 0,
        teamAGA = 0;
      let teamBGF = 0,
        teamBGA = 0;

      const processed = games.map((game, index) => {
        const isTeamAHome = game.home === selectedTeams.teamA;
        const teamAScore = isTeamAHome ? game.home_score : game.away_score;
        const teamBScore = isTeamAHome ? game.away_score : game.home_score;

        if (teamAScore > teamBScore) teamAWins++;
        else if (teamBScore > teamAScore) teamBWins++;
        else {
          teamATies++;
          teamBTies++;
        }

        teamAGF += teamAScore;
        teamAGA += teamBScore;
        teamBGF += teamBScore;
        teamBGA += teamAScore;

        return {
          season: game.season,
          gameId: game.game_id,
          idx: game.idx,
          gameNumber: index + 1,
          teamA: selectedTeams.teamA,
          teamB: selectedTeams.teamB,
          teamAWins,
          teamBWins,
          teamATies,
          teamBTies,
          teamAScore,
          teamBScore,
          teamAGF,
          teamAGA,
          teamBGF,
          teamBGA,
          teamAGD: teamAGF - teamAGA,
          teamBGD: teamBGF - teamBGA,
          isTeamAHome,
        };
      });

      setRacingData(processed);
      setCurrentSeason(0);
      setIsRacing(true);

      let gameIndex = 0;
      intervalId = setInterval(() => {
        gameIndex++;
        if (gameIndex >= processed.length) {
          clearInterval(intervalId);
          setIsRacing(false);
          setCurrentSeason(processed.length - 1);
        } else {
          setCurrentSeason(gameIndex);
        }
      }, 400);
    }

    loadRacing();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedTeams]);

  return { racingData, isRacing, currentSeason, setCurrentSeason };
}
