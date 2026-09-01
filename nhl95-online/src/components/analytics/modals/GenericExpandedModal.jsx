import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  getRankingChartOption,
  getScoringTrendsChartOption,
} from "../utils/chartConfigs";

export function GenericExpandedModal({ widget, rows, onClose }) {
  const [selectedManagerForTrends, setSelectedManagerForTrends] =
    useState("all");

  const uniqueManagers = [
    ...new Set(rows.map((r) => r.manager).filter(Boolean)),
  ].sort();

  const getWidgetData = (limit = 15) => {
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

  const getChartOption = () => {
    if (widget.type === "ranking") {
      const data = getWidgetData(15);
      return getRankingChartOption(widget, data, true);
    } else if (widget.type === "scoring-trends") {
      return getScoringTrendsChartOption(
        widget,
        rows,
        true,
        selectedManagerForTrends
      );
    }
    return {};
  };

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
          background: "#111",
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
          }}
        >
          {widget.title}
        </h2>

        {widget.type === "scoring-trends" && (
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                color: "#888",
                fontSize: "0.9rem",
                marginBottom: "8px",
                display: "block",
              }}
            >
              Filter by Manager
            </label>
            <select
              value={selectedManagerForTrends}
              onChange={(e) => setSelectedManagerForTrends(e.target.value)}
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "#222",
                color: "#FFF",
                border: "2px solid " + widget.color,
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: "pointer",
                minWidth: "200px",
              }}
            >
              <option value="all">All Managers</option>
              {uniqueManagers.map((manager) => (
                <option key={manager} value={manager}>
                  {manager}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ height: "500px" }}>
          <ReactECharts
            option={getChartOption()}
            style={{ height: "100%", width: "100%" }}
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
