import React from "react";
import ReactECharts from "echarts-for-react";
import { getRankingChartOption } from "../utils/chartConfigs";

export function RankingWidget({ widget, rows, onExpand, onHover, isHovered }) {
  const getWidgetData = (limit = 5) => {
    const filtered = rows.filter((r) => r.gp > 0);

    const sorted = [...filtered].sort((a, b) => {
      if (widget.reverse)
        return (
          (parseFloat(a[widget.stat]) || 0) - (parseFloat(b[widget.stat]) || 0)
        );
      return (
        (parseFloat(b[widget.stat]) || 0) - (parseFloat(a[widget.stat]) || 0)
      );
    });
    return sorted.slice(0, limit);
  };

  const data = getWidgetData(5);

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
        <ReactECharts
          option={getRankingChartOption(widget, data, false)}
          style={{ height: "200px" }}
        />
      </div>
    </div>
  );
}
