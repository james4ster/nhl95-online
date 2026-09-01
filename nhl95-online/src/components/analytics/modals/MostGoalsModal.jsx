import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  getMostGoalsTotalChartOption,
  getMostGoalsSingleTeamChartOption,
} from "../utils/chartConfigs";

export function MostGoalsModal({ widget, blowoutGames, onClose }) {
  const [mostGoalsViewMode, setMostGoalsViewMode] = useState("total");

  const getChartData = () => {
    if (mostGoalsViewMode === "total") {
      const topGames = [...blowoutGames]
        .sort((a, b) => b.totalGoals - a.totalGoals)
        .slice(0, 15);
      return { type: "total", data: topGames };
    } else {
      const allTeamPerformances = [];

      blowoutGames.forEach((game) => {
        allTeamPerformances.push({
          manager: game.home,
          nhlTeam: game.homeNHL,
          goals: game.homeTeamGoals,
          opponent: game.away,
          opponentNHL: game.awayNHL,
          opponentGoals: game.awayTeamGoals,
          season: game.season,
          gameId: game.game_id,
        });
        allTeamPerformances.push({
          manager: game.away,
          nhlTeam: game.awayNHL,
          goals: game.awayTeamGoals,
          opponent: game.home,
          opponentNHL: game.homeNHL,
          opponentGoals: game.homeTeamGoals,
          season: game.season,
          gameId: game.game_id,
        });
      });

      const topPerformances = allTeamPerformances
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 15);

      return { type: "single-team", data: topPerformances };
    }
  };

  const chartData = getChartData();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a0a1f, #0a0a1a)",
          borderRadius: "24px",
          padding: "30px",
          maxWidth: "1200px",
          width: "90%",
          maxHeight: "85vh",
          overflow: "auto",
          border: `3px solid ${widget.color}`,
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            color: widget.color,
            marginBottom: "20px",
            fontSize: "2rem",
            fontWeight: "900",
            textAlign: "center",
          }}
        >
          🎯 Most Goals in a Game
        </h2>

        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <label
            style={{
              color: "#888",
              fontSize: "0.9rem",
              marginBottom: "8px",
              display: "block",
            }}
          >
            View Mode
          </label>
          <select
            value={mostGoalsViewMode}
            onChange={(e) => setMostGoalsViewMode(e.target.value)}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              background: "#222",
              color: "#FFF",
              border: "2px solid " + widget.color,
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
              minWidth: "280px",
            }}
          >
            <option value="total">Most Total Goals in Game</option>
            <option value="single-team">Most Goals by Single Team</option>
          </select>
        </div>

        <div style={{ height: "500px" }}>
          <ReactECharts
            option={
              chartData.type === "total"
                ? getMostGoalsTotalChartOption(widget, chartData.data)
                : getMostGoalsSingleTeamChartOption(widget, chartData.data)
            }
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={false}
          />
        </div>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "8px 12px",
            borderRadius: "8px",
            background: widget.color,
            color: "#FFF",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
