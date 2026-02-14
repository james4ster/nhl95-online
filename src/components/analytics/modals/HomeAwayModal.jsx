import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";

export function HomeAwayModal({ widget, rows, onClose }) {
  const [selectedManager, setSelectedManager] = useState(""); // empty = all managers
  const [activeTab, setActiveTab] = useState("record"); // record, goals, other

  // Filter rows to only include games with scores
  const validRows = useMemo(() => {
    return rows.filter(r => r.home_score !== null && r.away_score !== null);
  }, [rows]);

  // Compute unique managers for dropdown
  const uniqueManagers = useMemo(() => {
    const mgrs = rows.flatMap(r => [r.home, r.away].filter(Boolean));
    return [...new Set(mgrs)].sort();
  }, [rows]);

  // Aggregate stats by home/away
  const aggregatedStats = useMemo(() => {
    const home = { W: 0, L: 0, T: 0, GF: 0, GA: 0, GD: 0, SO: 0, ptsPercent: 0 };
    const away = { ...home };

    validRows.forEach((r) => {
      if (selectedManager) {
        // SPECIFIC MANAGER: only count their games
        
        // HOME games - only when selected manager was HOME
        if (r.home === selectedManager) {
          if (r.home_score > r.away_score) home.W += 1;
          else if (r.home_score < r.away_score) home.L += 1;
          else home.T += 1;
          
          home.GF += r.home_score;
          home.GA += r.away_score;
          home.GD += r.home_score - r.away_score;
          if (r.away_score === 0) home.SO += 1;
        }
        
        // AWAY games - only when selected manager was AWAY
        if (r.away === selectedManager) {
          if (r.away_score > r.home_score) away.W += 1;
          else if (r.away_score < r.home_score) away.L += 1;
          else away.T += 1;
          
          away.GF += r.away_score;
          away.GA += r.home_score;
          away.GD += r.away_score - r.home_score;
          if (r.home_score === 0) away.SO += 1;
        }
      } else {
        // ALL MANAGERS: aggregate all home games vs all away games
        
        // Home perspective (all managers playing at home)
        if (r.home_score > r.away_score) home.W += 1;
        else if (r.home_score < r.away_score) home.L += 1;
        else home.T += 1;
        home.GF += r.home_score;
        home.GA += r.away_score;
        home.GD += r.home_score - r.away_score;
        if (r.away_score === 0) home.SO += 1;
        
        // Away perspective (all managers playing away)
        if (r.away_score > r.home_score) away.W += 1;
        else if (r.away_score < r.home_score) away.L += 1;
        else away.T += 1;
        away.GF += r.away_score;
        away.GA += r.home_score;
        away.GD += r.away_score - r.home_score;
        if (r.home_score === 0) away.SO += 1;
      }
    });

    // Points % = (Wins + 0.5*T) / total games
    const totalHomeGames = home.W + home.L + home.T || 1;
    const totalAwayGames = away.W + away.L + away.T || 1;
    home.ptsPercent = ((home.W + 0.5 * home.T) / totalHomeGames) * 100;
    away.ptsPercent = ((away.W + 0.5 * away.T) / totalAwayGames) * 100;

    return { home, away };
  }, [validRows, selectedManager]);

  // Build chart options based on active tab
  const chartOption = useMemo(() => {
    let metrics, homeData, awayData, title;

    switch (activeTab) {
      case "record":
        metrics = ["W", "L", "T"];
        homeData = metrics.map(m => aggregatedStats.home[m]);
        awayData = metrics.map(m => aggregatedStats.away[m]);
        title = "Win/Loss/Tie Record";
        break;
      
      case "goals":
        metrics = ["GF", "GA", "GD"];
        homeData = metrics.map(m => aggregatedStats.home[m]);
        awayData = metrics.map(m => aggregatedStats.away[m]);
        title = "Goals Statistics";
        break;
      
      case "other":
        metrics = ["SO", "Pts%"];
        homeData = metrics.map(m => {
          if (m === "Pts%") return parseFloat((aggregatedStats.home.ptsPercent / 100).toFixed(3));
          return aggregatedStats.home[m];
        });
        awayData = metrics.map(m => {
          if (m === "Pts%") return parseFloat((aggregatedStats.away.ptsPercent / 100).toFixed(3));
          return aggregatedStats.away[m];
        });
        title = "Additional Stats";
        break;
      
      default:
        metrics = [];
        homeData = [];
        awayData = [];
        title = "";
    }

    return {
      title: {
        text: title,
        left: "center",
        textStyle: { color: "#FF1744", fontSize: 20, fontWeight: "bold" },
      },
      tooltip: { 
        trigger: "axis",
        backgroundColor: "rgba(0,0,0,0.9)",
        borderColor: "#FF1744",
        borderWidth: 2,
        textStyle: { color: "#fff" },
      },
      legend: { 
        data: ["Home", "Away"], 
        textStyle: { color: "#fff", fontSize: 14 },
        bottom: 10,
      },
      grid: { left: "8%", right: "8%", bottom: "15%", top: "20%", containLabel: true },
      xAxis: {
        type: "category",
        data: metrics,
        axisLine: { lineStyle: { color: "#666" } },
        axisLabel: { 
          rotate: 0,
          color: "#fff",
          fontSize: 14,
          fontWeight: "bold",
        },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#666" } },
        axisLabel: { color: "#fff" },
        splitLine: { lineStyle: { color: "#333" } },
      },
      series: [
        {
          name: "Home",
          type: "bar",
          data: homeData,
          itemStyle: {
            color: { 
              type: "linear", 
              x: 0, y: 0, x2: 0, y2: 1, 
              colorStops: [
                { offset: 0, color: "#FF6A88" },
                { offset: 1, color: "#FF1744" }
              ]
            },
            shadowColor: "rgba(255,23,68,0.6)",
            shadowBlur: 10,
            borderRadius: [8, 8, 0, 0],
          },
          label: { 
            show: true, 
            position: "top", 
            color: "#fff",
            fontSize: 13,
            fontWeight: "bold",
          },
          barWidth: "35%",
        },
        {
          name: "Away",
          type: "bar",
          data: awayData,
          itemStyle: {
            color: { 
              type: "linear", 
              x: 0, y: 0, x2: 0, y2: 1, 
              colorStops: [
                { offset: 0, color: "#6A91FF" },
                { offset: 1, color: "#1744FF" }
              ]
            },
            shadowColor: "rgba(23,68,255,0.6)",
            shadowBlur: 10,
            borderRadius: [8, 8, 0, 0],
          },
          label: { 
            show: true, 
            position: "top", 
            color: "#fff",
            fontSize: 13,
            fontWeight: "bold",
          },
          barWidth: "35%",
        },
      ],
    };
  }, [aggregatedStats, activeTab]);

  const tabs = [
    { id: "record", label: "W/L/T", icon: "🏆" },
    { id: "goals", label: "Goals", icon: "⚽" },
    { id: "other", label: "Stats", icon: "📊" },
  ];

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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95%",
          maxWidth: "1400px",
          maxHeight: "90vh",
          background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
          borderRadius: "24px",
          padding: "30px",
          overflow: "auto",
          border: "3px solid #FF1744",
          boxShadow: "0 0 60px rgba(255,23,68,0.4), inset 0 0 40px rgba(255,23,68,0.1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
          <h2 style={{ 
            color: "#FF1744", 
            margin: 0,
            fontSize: "2rem",
            textShadow: "0 0 20px rgba(255,23,68,0.6)",
          }}>
            Home/Away Breakdown
          </h2>
          <button
            onClick={onClose}
            style={{
              width: "45px",
              height: "45px",
              borderRadius: "50%",
              border: "none",
              background: "linear-gradient(135deg, #FF1744, #FF6A88)",
              color: "#fff",
              fontWeight: "900",
              fontSize: "1.5rem",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(255,23,68,0.4)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.1) rotate(90deg)";
              e.target.style.boxShadow = "0 6px 20px rgba(255,23,68,0.6)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1) rotate(0deg)";
              e.target.style.boxShadow = "0 4px 15px rgba(255,23,68,0.4)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div style={{ marginBottom: "25px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ color: "#888", fontSize: "1.1rem", fontWeight: "600" }}>Manager:</label>
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            style={{
              padding: "12px 20px",
              borderRadius: "12px",
              background: "#222",
              color: "#fff",
              border: `2px solid ${widget.color || "#FF1744"}`,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
            }}
          >
            <option value="">All Managers</option>
            {uniqueManagers.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: "flex", 
          gap: "15px", 
          marginBottom: "30px",
          borderBottom: "2px solid #333",
          paddingBottom: "10px",
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 28px",
                borderRadius: "12px 12px 0 0",
                border: "none",
                background: activeTab === tab.id 
                  ? "linear-gradient(135deg, #FF1744, #FF6A88)" 
                  : "#222",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: activeTab === tab.id 
                  ? "0 -4px 15px rgba(255,23,68,0.4)" 
                  : "none",
                transform: activeTab === tab.id ? "translateY(-2px)" : "translateY(0)",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = "#333";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = "#222";
                }
              }}
            >
              <span style={{ marginRight: "8px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div style={{
          background: "#0a0a0a",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
        }}>
          <ReactECharts
            option={chartOption}
            style={{ height: "500px", width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}