import React from "react";
import ReactECharts from "echarts-for-react";
import { getBlowoutsPreviewChartOption } from "../utils/chartConfigs";

export function BlowoutsWidget({
  widget,
  blowoutGames,
  onExpand,
  onHover,
  isHovered,
}) {
  const topGame = [...blowoutGames].sort((a, b) => b.margin - a.margin)[0];

  return (
    <div
      style={{
        gridColumn: "span 1",
        minHeight: "350px",
        background: `linear-gradient(135deg, ${widget.color}20, rgba(9, 20, 33, 0.8))`,
        borderRadius: "20px",
        padding: "24px",
        border: `2px solid ${widget.color}40`,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s ease",
        transform: isHovered ? "scale(1.02)" : "scale(1)",
      }}
      onMouseEnter={() => onHover(widget.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onExpand}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3
          style={{
            color: "#FFF",
            fontWeight: "800",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {widget.title}
        </h3>
        <p
          style={{
            color: "#888",
            fontSize: "0.85rem",
            marginBottom: "16px",
          }}
        >
          {widget.description}
        </p>
        {blowoutGames.length > 0 ? (
          <ReactECharts
            option={getBlowoutsPreviewChartOption(widget, topGame)}
            style={{ height: "200px" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
              color: "#888",
            }}
          >
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
