import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import { useH2HData } from "../hooks/useH2HData";
import { getH2HChartOption } from "../utils/chartConfigs";

export function H2HTimelineModal({ widget, onClose, rows }) {
  const [selectedTeams, setSelectedTeams] = useState({ teamA: "", teamB: "" });
  const { racingData, currentSeason } = useH2HData(selectedTeams);

  const uniqueManagers = [...new Set(rows.map((r) => r.manager).filter(Boolean))].sort();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.98)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backdropFilter: "blur(10px)",
      }}
      onClick={() => {
        onClose();
        setSelectedTeams({ teamA: "", teamB: "" });
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a0a0a, #0a0a1a)",
          borderRadius: "24px",
          padding: "20px 30px", // slightly smaller vertically
          maxWidth: "1400px",
          width: "95%",
          maxHeight: "90vh",
          overflow: "auto",
          border: "3px solid #FF1744",
          boxShadow: "0 0 50px rgba(255,23,68,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px", // shrink a bit
          }}
        >
          <h2
            style={{
              color: "#FF1744",
              fontSize: "2rem",
              fontWeight: "900",
              textShadow: "0 0 20px rgba(255,23,68,0.8)",
            }}
          >
            🏁 H2H Timeline
          </h2>
          <button
            onClick={() => {
              onClose();
              setSelectedTeams({ teamA: "", teamB: "" });
            }}
            style={{
              width: "45px",
              height: "45px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: "linear-gradient(135deg, #FF1744, #FF6A88)",
              color: "#FFF",
              fontSize: "1.5rem",
              fontWeight: "900",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(255,23,68,0.6)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Stats if teams selected */}
        {selectedTeams.teamA && selectedTeams.teamB && racingData.length > 0 && (() => {
          const currentData = racingData[currentSeason];
          const teamAInfo = rows.find((r) => r.manager === selectedTeams.teamA);
          const teamBInfo = rows.find((r) => r.manager === selectedTeams.teamB);

          return (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "60px", // slightly tighter horizontally
                marginBottom: "15px", // shrink vertical spacing
                textAlign: "center",
              }}
            >
              {/* Team A */}
              <div>
                {teamAInfo?.avatar && (
                  <img
                    src={teamAInfo.avatar}
                    alt={selectedTeams.teamA}
                    style={{
                      width: "65px", // slightly smaller
                      height: "65px",
                      borderRadius: "50%",
                      border: "4px solid #FF3B30",
                      marginBottom: "8px",
                      boxShadow: "0 0 12px rgba(255,59,48,0.8)",
                    }}
                  />
                )}
                <div style={{ color: "#FF3B30", fontWeight: "900", fontSize: "1.15rem", marginBottom: "4px" }}>
                  {selectedTeams.teamA}
                </div>
                <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.9rem", marginBottom: "3px" }}>
                  GF: <b>{currentData.teamAGF}</b> • GA: <b>{currentData.teamAGA}</b> • GD: <b>{currentData.teamAGD}</b>
                </div>
                <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.85rem" }}>
                  Record: <b>{currentData.teamAWins}-{currentData.teamBWins}{currentData.teamATies > 0 ? `-${currentData.teamATies}` : ""}</b>
                </div>
              </div>

              {/* VS */}
              <div style={{ color: "#FF1744", fontWeight: "900", fontSize: "1.8rem" }}>VS</div>

              {/* Team B */}
              <div>
                {teamBInfo?.avatar && (
                  <img
                    src={teamBInfo.avatar}
                    alt={selectedTeams.teamB}
                    style={{
                      width: "65px",
                      height: "65px",
                      borderRadius: "50%",
                      border: "4px solid #007AFF",
                      marginBottom: "8px",
                      boxShadow: "0 0 12px rgba(0,122,255,0.8)",
                    }}
                  />
                )}
                <div style={{ color: "#007AFF", fontWeight: "900", fontSize: "1.15rem", marginBottom: "4px" }}>
                  {selectedTeams.teamB}
                </div>
                <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.9rem", marginBottom: "3px" }}>
                  GF: <b>{currentData.teamBGF}</b> • GA: <b>{currentData.teamBGA}</b> • GD: <b>{currentData.teamBGD}</b>
                </div>
                <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.85rem" }}>
                  Record: <b>{currentData.teamBWins}-{currentData.teamAWins}{currentData.teamBTies > 0 ? `-${currentData.teamBTies}` : ""}</b>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dropdowns */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "15px", alignItems: "center" }}>
          {/* Team A */}
          <div style={{ flex: 1 }}>
            <label style={{ color: "#888", fontSize: "0.85rem", marginBottom: "6px", display: "block" }}>Team</label>
            <select
              value={selectedTeams.teamA}
              onChange={(e) => setSelectedTeams({ ...selectedTeams, teamA: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#222", color: "#FFF", border: "2px solid #FF1744", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" }}
            >
              <option value="">Team 1</option>
              {uniqueManagers.map((manager) => (
                <option key={manager} value={manager} disabled={manager === selectedTeams.teamB}>{manager}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: "1.8rem", color: "#FF1744", fontWeight: "bold" }}>VS</div>

          {/* Team B */}
          <div style={{ flex: 1 }}>
            <label style={{ color: "#888", fontSize: "0.85rem", marginBottom: "6px", display: "block" }}>Team</label>
            <select
              value={selectedTeams.teamB}
              onChange={(e) => setSelectedTeams({ ...selectedTeams, teamB: e.target.value })}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#222", color: "#FFF", border: "2px solid #007AFF", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" }}
            >
              <option value="">Team 2</option>
              {uniqueManagers.map((manager) => (
                <option key={manager} value={manager} disabled={manager === selectedTeams.teamA}>{manager}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart container */}
        <div style={{ height: "500px", background: "rgba(0,0,0,0.5)", borderRadius: "16px", padding: "12px", border: "2px solid #333", position: "relative", marginBottom: "10px" }}>
          {racingData.length > 0 && (() => {
            const currentGame = racingData[currentSeason];
            const maxWins = Math.max(...racingData.map((g) => Math.max(g.teamAWins, g.teamBWins)));

            const chartHeight = 400; // slightly smaller
            const chartTop = 60; // avatars start higher
            const teamAWinRatio = currentGame.teamAWins / (maxWins + 2);
            const teamBWinRatio = currentGame.teamBWins / (maxWins + 2);

            const teamATop = chartTop + chartHeight * (1 - teamAWinRatio);
            const teamBTop = chartTop + chartHeight * (1 - teamBWinRatio);

            return (
              <>
                {/* Team A Avatar */}
                <div style={{ position: "absolute", right: "50px", top: `${teamATop}px`, display: "flex", alignItems: "center", gap: "12px", zIndex: 10, transition: "top 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                  {rows.find((r) => r.manager === selectedTeams.teamA)?.avatar && (
                    <img
                      src={rows.find((r) => r.manager === selectedTeams.teamA)?.avatar}
                      alt={selectedTeams.teamA}
                      style={{ width: "50px", height: "50px", borderRadius: "50%", border: "4px solid #FF3B30", boxShadow: "0 0 30px rgba(255,59,48,1)", backgroundColor: "#000" }}
                    />
                  )}
                </div>

                {/* Team B Avatar */}
                <div style={{ position: "absolute", right: "50px", top: `${teamBTop}px`, display: "flex", alignItems: "center", gap: "12px", zIndex: 10, transition: "top 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                  {rows.find((r) => r.manager === selectedTeams.teamB)?.avatar && (
                    <img
                      src={rows.find((r) => r.manager === selectedTeams.teamB)?.avatar}
                      alt={selectedTeams.teamB}
                      style={{ width: "50px", height: "50px", borderRadius: "50%", border: "4px solid #007AFF", boxShadow: "0 0 30px rgba(0,122,255,1)", backgroundColor: "#000" }}
                    />
                  )}
                </div>
              </>
            );
          })()}

          <ReactECharts
            option={getH2HChartOption(racingData, currentSeason)}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={false}
          />
        </div>

        {/* Progress Bar */}
        {racingData.length > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#666", fontSize: "0.85rem", marginBottom: "5px" }}>
              Game {currentSeason + 1} of {racingData.length}
            </div>
            <div style={{ height: "6px", background: "#222", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${((currentSeason + 1) / racingData.length) * 100}%`, background: "linear-gradient(90deg, #FF1744, #FF9800)", transition: "width 0.35s ease", boxShadow: "0 0 10px rgba(255,23,68,0.6)" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
