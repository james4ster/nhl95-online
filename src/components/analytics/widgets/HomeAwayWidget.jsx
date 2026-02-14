import React from "react";
import ReactECharts from "echarts-for-react";
import { getHomeAwayChartOption } from "../utils/chartConfigs";

export function HomeAwayWidget({ rows, onExpand, widget }) {
  return (
    <div
      onClick={onExpand}
      style={{
        background: `
          radial-gradient(circle at 30% 20%, rgba(255,23,68,0.15), transparent 60%),
          radial-gradient(circle at 70% 80%, rgba(33,150,243,0.15), transparent 60%),
          linear-gradient(145deg, #0f0f0f, #1a1a1a)
        `,
        borderRadius: "20px",
        padding: "20px",
        cursor: "pointer",
        border: "2px solid #333",
        transition: "0.25s ease",
        boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
      }}
    >
      <h3
        style={{
          color: widget.color,
          marginBottom: "10px",
          fontWeight: 700,
          letterSpacing: "0.5px",
        }}
      >
        🏠 Home vs Away
      </h3>

      <ReactECharts
        option={getHomeAwayChartOption(rows)}
        style={{ height: "260px", width: "100%" }}
      />
    </div>
  );
}
