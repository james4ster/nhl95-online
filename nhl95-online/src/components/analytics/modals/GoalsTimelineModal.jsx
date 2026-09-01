import React, { useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { useBarRaceData } from "../hooks/useBarRaceData";
import { getBarRaceChartOption } from "../utils/chartConfigs";

export function GoalsTimelineModal({ widget, onClose, rows }) {
  const { barRaceFrames, barRaceFrame, setBarRaceFrame } = useBarRaceData();
  const chartOption = getBarRaceChartOption(barRaceFrames, barRaceFrame, rows);



  useEffect(() => {
    if (!barRaceFrames || barRaceFrames.length === 0) return;

    let frameIndex = 0;
    const interval = setInterval(() => {
      frameIndex++;
      if (frameIndex >= barRaceFrames.length) {
        clearInterval(interval);
      } else {
        setBarRaceFrame(frameIndex);
      }
    }, 50); // 150ms = fast progression but smooth animation

    return () => clearInterval(interval);
  }, [barRaceFrames, setBarRaceFrame]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={() => {
        onClose();
        setBarRaceFrame(0);
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "1400px",
          height: "85%",
          padding: "30px",
          background: "linear-gradient(135deg, #1a0a1a 0%, #0a0a1a 100%)",
          borderRadius: "24px",
          position: "relative",
          border: "3px solid #FF6B6B",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            color: "#FF6B6B",
            marginBottom: "5px",
            textAlign: "center",
            fontSize: "2.5rem",
            fontWeight: "900",
            textShadow: "0 0 20px rgba(255,107,107,0.5)",
          }}
        >
          🔥 Goals Timeline Race
        </h2>

        {barRaceFrames && barRaceFrames.length > 0 && (
  <div
    style={{
      textAlign: "center",
      fontSize: "1.1rem",
      fontWeight: "600",
      color: "#FFD93D",
      marginBottom: "15px",
    }}
  >
    Game #{barRaceFrame + 1} of {barRaceFrames.length}
  </div>
)}

<ReactECharts
  option={chartOption}
  style={{ height: "calc(100% - 120px)", width: "100%" }}
  notMerge={true}
  lazyUpdate={false}
/>


        <button
          onClick={() => {
            onClose();
            setBarRaceFrame(0);
          }}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "12px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #FF6B6B, #FF9A9E)",
            color: "#FFF",
            fontWeight: "bold",
            fontSize: "1rem",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(255,107,107,0.4)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(255,107,107,0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(255,107,107,0.4)";
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}