import React from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";


export function MostGoalsWidget({
  widget,
  blowoutGames,
  onExpand,
  onHover,
  isHovered,
}) {
  const topGame = [...blowoutGames].sort((a, b) => b.totalGoals - a.totalGoals)[0];

  return (
    <div
      style={{
        gridColumn: "span 1",
        minHeight: "120px", // smaller collapsed height
        background: `linear-gradient(135deg, ${widget.color}20, rgba(9, 20, 33, 0.8))`,
        borderRadius: "20px",
        padding: "12px",
        border: `2px solid ${widget.color}40`,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s ease",
        transform: isHovered ? "scale(1.02)" : "scale(1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
      onMouseEnter={() => onHover(widget.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onExpand}
    >
      <h3
        style={{
          color: "#FFF",
          fontWeight: "800",
          marginBottom: "4px",
          fontSize: "1rem",
        }}
      >
        {widget.title}
      </h3>
      <p
        style={{
          color: "#888",
          fontSize: "0.75rem",
          marginBottom: "8px",
        }}
      >
        {widget.description}
      </p>

      {topGame ? (
        <div
          data-tip
          data-for={`top-game-${widget.id}`}
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: "#FFF",
          }}
        >
          {topGame.totalGoals}
        </div>
      ) : (
        <div style={{ color: "#888", fontSize: "24px" }}>Loading...</div>
      )}

      {topGame && (
        <ReactTooltip id={`top-game-${widget.id}`} place="top" effect="solid">
          {`${topGame.homeTeam} vs ${topGame.awayTeam}\nTotal Goals: ${topGame.totalGoals}\nDate: ${topGame.date}`}
        </ReactTooltip>
      )}
    </div>
  );
}
