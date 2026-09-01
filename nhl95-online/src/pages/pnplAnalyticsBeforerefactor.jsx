// src/pages/DashboardAnalytics.jsx
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../supabaseClient";
import { nhlLogos } from "../constants/nhlLogos";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

// --- Animated number counter for live stats ---
function AnimatedNumber({ value, duration = 300 }) {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    let start = display;
    const diff = value - start;
    if (diff === 0) return;

    let startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplay(Math.floor(start + diff * progress));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [value]);

  return <>{display}</>;
}

// --- WIDGETS CONFIGURATION ---
const WIDGETS = [
  {
    id: "top-scorers",
    title: "🔥 Goals Timeline",
    type: "bar-race",
    stat: "gf",
    color: "#FF6B6B",
    size: "small",
    description: "Click to view",
    showPreview: false,
  },
  {
    id: "h2h-history",
    title: "🏁 H2H Timeline",
    type: "h2h",
    color: "#FF1744",
    size: "small",
    description: "Click to view",
    showPreview: false,
  },
  {
    id: "defensive-wall",
    title: "🛡️ Best Defensive Seasons",
    type: "ranking",
    stat: "ga_per_game",
    color: "#4ECDC4",
    size: "medium",
    description: "Goals against per game",
    reverse: true,
    showPreview: true,
  },
  {
    id: "points-race",
    title: "🏆 Best Points % Seasons",
    type: "ranking",
    stat: "pts_percent",
    color: "#FFD93D",
    size: "medium",
    description: "Win percentage leaders",
    showPreview: true,
  },
  {
    id: "goal-diff",
    title: "📊 Best Goal Differential",
    type: "ranking",
    stat: "gd",
    color: "#A8E6CF",
    size: "medium",
    description: "Season goal differential",
    showPreview: true,
  },
  {
    id: "biggest-blowouts",
    title: "💥 Biggest Blowouts",
    type: "blowouts",
    color: "#FF6B9D",
    size: "medium",
    description: "Largest margins of victory",
    showPreview: true,
  },
  {
    id: "scoring-trends",
    title: "📈 Scoring Trends",
    type: "scoring-trends",
    stat: "gf_per_game",
    color: "#FFDAC1",
    size: "large",
    description: "Goals per game by season",
    showPreview: true,
  },
 
  {
    id: "most-goals-game",
    title: "🎯 Most Goals",
    type: "single-stat",
    color: "#B4A7D6",
    size: "small",
    description: "Single game record",
    showPreview: true,
  },
];

export default function DashboardAnalytics() {
  // --- State hooks ---
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWidget, setExpandedWidget] = useState(null);
  const [hoveredWidget, setHoveredWidget] = useState(null);
  const [selectedTeams, setSelectedTeams] = useState({ teamA: "", teamB: "" });
  const [racingData, setRacingData] = useState([]);
  const [isRacing, setIsRacing] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(0);
  const [barRaceFrame, setBarRaceFrame] = useState(0);
  const [barRaceFrames, setBarRaceFrames] = useState([]);
  const [blowoutGames, setBlowoutGames] = useState([]);
  const [selectedManagerForTrends, setSelectedManagerForTrends] = useState("all");
  const [mostGoalsViewMode, setMostGoalsViewMode] = useState("total"); // "total" or "single-team"

  // ✅ Load bar race data on mount
  useEffect(() => {
    async function loadBarRaceData() {
      const { data: allGames, error } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .order("game_id", { ascending: true });

      if (error || !allGames || allGames.length === 0) {
        console.error("Error fetching games for bar race:", error);
        setBarRaceFrames([]);
        return;
      }

      const cumulativeGF = {};
      const frames = [];

      allGames.forEach((game) => {
        if (game.home) {
          cumulativeGF[game.home] = (cumulativeGF[game.home] || 0) + (game.home_score || 0);
        }
        if (game.away) {
          cumulativeGF[game.away] = (cumulativeGF[game.away] || 0) + (game.away_score || 0);
        }

        frames.push({
          gameId: game.game_id,
          season: game.season,
          managerStats: { ...cumulativeGF },
        });
      });

      setBarRaceFrames(frames);
    }

    loadBarRaceData();
  }, []);

  // Load blowout games data - FIXED VERSION
  useEffect(() => {
    async function loadBlowouts() {
      const { data: allGames, error } = await supabase
        .from("pnpl_raw_schedule")
        .select("*")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .order("game_id", { ascending: true });

      if (error || !allGames) {
        console.error("Error fetching blowouts:", error);
        return;
      }

      console.log("Total games loaded:", allGames.length);
      
      // Enhanced game data with NHL team info
      const gamesWithMargin = allGames.map(game => {
        const gameData = {
          ...game,
          margin: Math.abs(game.home_score - game.away_score),
          totalGoals: game.home_score + game.away_score,
          winner: game.home_score > game.away_score ? game.home : game.away,
          loser: game.home_score > game.away_score ? game.away : game.home,
          winnerScore: Math.max(game.home_score, game.away_score),
          loserScore: Math.min(game.home_score, game.away_score),
          winnerNHL: game.home_score > game.away_score ? game.home_team : game.away_team,
          loserNHL: game.home_score > game.away_score ? game.away_team : game.home_team,
          // For single team scoring records
          homeTeamGoals: game.home_score,
          awayTeamGoals: game.away_score,
          homeNHL: game.home_team,
          awayNHL: game.away_team,
        };
        
        // Debug the 11-goal games
        if (gameData.margin === 11) {
          console.log("11-goal game found:", {
            game_id: game.game_id,
            season: game.season,
            winner: gameData.winner,
            loser: gameData.loser,
            winnerNHL: gameData.winnerNHL,
            loserNHL: gameData.loserNHL,
            score: `${gameData.winnerScore}-${gameData.loserScore}`
          });
        }
        
        // Debug 14-goal performance
        if (game.home_score === 14 || game.away_score === 14) {
          console.log("14-goal performance found:", {
            game_id: game.game_id,
            season: game.season,
            home: game.home,
            away: game.away,
            homeNHL: game.home_team,
            awayNHL: game.away_team,
            score: `${game.home_score}-${game.away_score}`
          });
        }
        
        return gameData;
      });

      console.log("Games with 11+ goal margin:", gamesWithMargin.filter(g => g.margin >= 11).length);
      console.log("Games with 14+ goals by one team:", gamesWithMargin.filter(g => g.homeTeamGoals >= 14 || g.awayTeamGoals >= 14).length);

      setBlowoutGames(gamesWithMargin);
    }

    loadBlowouts();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: standings } = await supabase
        .from("pnpl_standings")
        .select("*")
        .not("manager", "is", null);

      const { data: managersData } = await supabase
        .from("managers")
        .select("name, discord_avatar_url");

      const avatarMap = {};
      (managersData || []).forEach(
        (m) => (avatarMap[m.name.toLowerCase()] = m.discord_avatar_url)
      );

      const cleaned = (standings || []).map((r) => ({
        ...r,
        avatar: avatarMap[r.manager?.toLowerCase()] || null,
        logo: nhlLogos[r.nhl_team?.toUpperCase()] || "/images/nhl-logos/default.png",
        ga_per_game: r.gp > 0 ? (r.ga / r.gp).toFixed(2) : 0,
        gf_per_game: r.gp > 0 ? (r.gf / r.gp).toFixed(2) : 0,
        pts_percent: r.pts_percent !== null
          ? Number(r.pts_percent).toFixed(3)
          : null,
      }));
      

      setRows(cleaned);
      setLoading(false);
    }
    load();
  }, []);

  const getWidgetData = (widget, limit = null) => {
    if (widget.type === "h2h" || widget.type === "bar-race") return [];

    const filtered = rows.filter(r => r.gp > 0); // Only seasons with games played
    
    const sorted = [...filtered].sort((a, b) => {
      if (widget.reverse) return (parseFloat(a[widget.stat]) || 0) - (parseFloat(b[widget.stat]) || 0);
      return (parseFloat(b[widget.stat]) || 0) - (parseFloat(a[widget.stat]) || 0);
    });
    return limit ? sorted.slice(0, limit) : sorted;
  };

  // --- Fetch H2H Racing data ---
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
  
      let teamAWins = 0, teamBWins = 0, teamATies = 0, teamBTies = 0;
      let teamAGF = 0, teamAGA = 0;
      let teamBGF = 0, teamBGA = 0;
  
      const processed = games.map((game, index) => {
        const isTeamAHome = game.home === selectedTeams.teamA;
        const teamAScore = isTeamAHome ? game.home_score : game.away_score;
        const teamBScore = isTeamAHome ? game.away_score : game.home_score;
  
        if (teamAScore > teamBScore) teamAWins++;
        else if (teamBScore > teamAScore) teamBWins++;
        else { teamATies++; teamBTies++; }
  
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

  useEffect(() => {
    if (!expandedWidget || expandedWidget.id !== "top-scorers") return;
    if (!barRaceFrames || barRaceFrames.length === 0) return;
  
    let frameIndex = 0;
    const interval = setInterval(() => {
      frameIndex++;
      if (frameIndex >= barRaceFrames.length) {
        clearInterval(interval);
      } else {
        setBarRaceFrame(frameIndex);
      }
    }, 220);
  
    return () => clearInterval(interval);
  }, [expandedWidget, barRaceFrames]);
  
  const getChartOption = (widget, isExpanded = false) => {
    // Bar race chart (goals timeline)
    if (widget.type === "bar-race") {
      if (!barRaceFrames || barRaceFrames.length === 0) return {};
    
      const frame = barRaceFrames[barRaceFrame] || barRaceFrames[0];
    
      const topManagersFinal = Object.entries(
        barRaceFrames[barRaceFrames.length - 1]?.managerStats || {}
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([manager]) => manager);
    
      const avatarMap = rows.reduce((acc, r) => {
        if (r.manager && r.avatar) acc[r.manager] = r.avatar;
        return acc;
      }, {});
    
      const barData = topManagersFinal.map((manager) => ({
        value: frame.managerStats[manager] || 0,
        manager,
        avatar: avatarMap[manager],
      }));
    
      return {
        grid: {
          left: 140,
          right: 100,
          top: 60,
          bottom: 40,
        },
        xAxis: {
          type: "value",
          axisLabel: { color: "#888", fontSize: 13 },
          splitLine: { lineStyle: { color: "#333" } },
        },
        yAxis: {
          type: "category",
          inverse: true,
          data: topManagersFinal,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: "#FFF",
            fontSize: 13,
            fontWeight: "bold",
          },
        },
        series: [
          {
            type: "bar",
            data: barData.map(d => d.value),
            barWidth: 40,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: "#FF6B6B" },
                { offset: 1, color: "#FFD93D" },
              ]),
              borderRadius: [0, 20, 20, 0],
            },
            label: {
              show: true,
              position: "insideRight",
              formatter: "{c}",
              color: "#000",
              fontWeight: "bold",
            },
            animationDuration: 400,
            animationEasing: "cubicOut",
          },
          {
            type: "scatter",
            coordinateSystem: "cartesian2d",
            data: barData.map((d, idx) => ({
              value: [d.value + 4, idx],
              avatar: d.avatar,
              manager: d.manager,
            })),
            symbol: (value, params) =>
              params.data.avatar ? `image://${params.data.avatar}` : "circle",
            symbolSize: 36,
            itemStyle: { borderWidth: 2, borderColor: "#FFF" },
            z: 10,
            animationDuration: 400,
            animationEasing: "cubicOut",
          },
        ],
      };
    }

    // H2H Timeline
    if (widget.type === "h2h") {
      if (!racingData || racingData.length === 0) {
        return {
          title: {
            text: "Select teams to start racing",
            left: "center",
            top: "center",
            textStyle: { color: "#888", fontSize: 18 },
          },
        };
      }
      
      const dataUpToCurrent = racingData.slice(0, currentSeason + 1);
      const currentData = racingData[currentSeason];
  
      const xAxisData = dataUpToCurrent.map((game, idx) => {
        const gameNumInSeason = dataUpToCurrent
          .filter((g, i) => g.season === game.season && i <= idx)
          .length;
        return `S${game.season}-G${gameNumInSeason}`;
      });
  
      const teamAData = dataUpToCurrent.map((g) => g.teamAWins);
      const teamBData = dataUpToCurrent.map((g) => g.teamBWins);
  
      const maxWins = Math.max(...racingData.map((g) => Math.max(g.teamAWins, g.teamBWins)));
  
      return {
        title: {
          subtext: `Season ${currentData.season} • Game ${currentData.gameNumber} of ${racingData.length}`,
          left: "center",
          top: 15,
          textStyle: {
            color: "#FFF",
            fontSize: 32,
            fontWeight: "900",
            textShadowBlur: 10,
            textShadowColor: "rgba(255,255,255,0.3)",
          },
          subtextStyle: { color: "#999", fontSize: 14 },
        },
        grid: { left: 70, right: 100, top: 120, bottom: 60 },
        xAxis: {
          type: "category",
          data: xAxisData,
          axisLabel: { color: "#666", fontSize: 10, rotate: 45 },
          axisLine: { lineStyle: { color: "#333", width: 2 } },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          name: "WINS",
          max: maxWins + 2,
          axisLabel: { color: "#666", fontSize: 13, fontWeight: "bold" },
          splitLine: { lineStyle: { color: "#222", width: 1 } },
          axisLine: { lineStyle: { color: "#333", width: 2 } },
          nameTextStyle: { color: "#666", fontSize: 12, fontWeight: "bold" },
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(0,0,0,0.85)',
          borderColor: '#FF1744',
          borderWidth: 2,
          textStyle: { color: '#FFF', fontWeight: 'bold' },
          formatter: (params) => {
            if (!params || params.length === 0) return '';
            const idx = params[0].dataIndex;
            const game = racingData[idx];
            if (!game) return '';
            return `
              <div style="text-align:center; font-size:14px;">
                <strong>Season ${game.season} • Game ${game.gameNumber}</strong><br/>
                <span style="color:#FF3B30;">${game.teamA}</span>: W:${game.teamAWins} L:${game.teamBWins}${game.teamATies>0?` T:${game.teamATies}`:""}<br/>
                GF:${game.teamAGF} • GA:${game.teamAGA} • GD:${game.teamAGD}<br/>
                <span style="color:#007AFF;">${game.teamB}</span>: W:${game.teamBWins} L:${game.teamAWins}${game.teamBTies>0?` T:${game.teamBTies}`:""}<br/>
                GF:${game.teamBGF} • GA:${game.teamBGA} • GD:${game.teamBGD}
              </div>
            `;
          }
        },
        series: [
          {
            name: currentData.teamA,
            type: "line",
            data: teamAData,
            smooth: 0.3,
            lineStyle: { width: 5, color: "#FF3B30", shadowBlur: 20, shadowColor: "rgba(255,59,48,0.6)" },
            itemStyle: { color: "#FF3B30", borderWidth: 3, borderColor: "#0a0a1a", shadowBlur: 15, shadowColor: "rgba(255,59,48,0.8)" },
            areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(255,59,48,0.4)" }, { offset: 0.5, color: "rgba(255,59,48,0.2)" }, { offset: 1, color: "rgba(255,59,48,0)" }] } },
            symbol: "circle",
            symbolSize: 8,
            showSymbol: true,
            emphasis: { scale: 1.5, focus: "series" },
          },
          {
            name: currentData.teamB,
            type: "line",
            data: teamBData,
            smooth: 0.3,
            lineStyle: { width: 5, color: "#007AFF", shadowBlur: 20, shadowColor: "rgba(0,122,255,0.6)" },
            itemStyle: { color: "#007AFF", borderWidth: 3, borderColor: "#0a0a1a", shadowBlur: 15, shadowColor: "rgba(0,122,255,0.8)" },
            areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(0,122,255,0.4)" }, { offset: 0.5, color: "rgba(0,122,255,0.2)" }, { offset: 1, color: "rgba(0,122,255,0)" }] } },
            symbol: "circle",
            symbolSize: 8,
            showSymbol: true,
            emphasis: { scale: 1.5, focus: "series" },
          },
        ],
        animationDuration: 350,
        animationEasing: "cubicOut",
        animationDurationUpdate: 350,
        animationEasingUpdate: "cubicOut",
      };
    }

    // Ranking charts (defensive wall, points race, goal diff)
    if (widget.type === "ranking") {
      const limit = isExpanded ? 15 : 5;
      const data = getWidgetData(widget, limit);
    
    // build once per option (MUST be above return)
        const barData = data.map((r) => ({
        value: parseFloat(r[widget.stat]) || 0,
        logo: r.logo,
      }));
      
      
      return {
        tooltip: { 
          trigger: "axis",
          formatter: (params) => {
            const item = data[params[0].dataIndex];
            return `
              <div style="font-weight:bold;">
                ${item.manager}<br/>
                Season ${item.season}<br/>
                ${item.nhl_team}<br/>
                ${widget.stat === 'ga_per_game' ? 'GA/G' : widget.stat === 'pts_percent' ? 'Pts %' : 'GD'}: ${item[widget.stat]}
              </div>
            `;
          }
        },
        grid: { left: 100, right: 20, top: 30, bottom: 50 },
        xAxis: {
          type: "value",
          min: 0,
          axisLabel: { color: "#888" },
          splitLine: { lineStyle: { color: "#333" } },
        },
        
        yAxis: {
          type: "category",
          inverse: true,
          data: data.map((r) => `${r.manager.substring(0, 10)} • S${r.season}`),
          axisLabel: { color: "#888", fontSize: 11 },
        },
        
        series: [
          {
            type: "bar",
            data: barData,
            barWidth: "60%",
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: widget.color + "55" },
                { offset: 1, color: widget.color },
              ]),
              borderRadius: [8, 8, 8, 8],
            },
            label: {
              show: true,
              position: "insideT",
              distance: 6,
              formatter: (params) => {
                const i = params.dataIndex;
                return params.data.logo
                  ? `{logo${i}|}  ${params.value}`
                  : params.value;
              },
              rich: Object.fromEntries(
                barData.map((d, i) => [
                  `logo${i}`,
                  {
                    height: 18,
                    width: 18,
                    align: "center",
                    backgroundColor: {
                      image: d.logo,
                    },
                  },
                ])
              ),
            }
            
            
          },
        ],
        
        
        
        
      };
    }


    // Scoring trends
if (widget.type === "scoring-trends") {
  if (isExpanded && selectedManagerForTrends !== "all") {
    const managerSeasons = rows
      .filter(r => r.manager === selectedManagerForTrends && r.gp > 0)
      .sort((a, b) => parseInt(a.season) - parseInt(b.season));

    const barData = managerSeasons.map(r => ({
      value: r.gf_per_game,      // height of bar
      team: r.nhl_team,          // used for logo
      logo: r.logo || "/images/nhl-logos/default.png",
    }));

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const item = managerSeasons[params[0].dataIndex];
          return `
            <div style="font-weight:bold;">
              Season ${item.season}<br/>
              ${item.nhl_team}<br/>
              GF/G: ${item.gf_per_game}
            </div>
          `;
        },
      },
      grid: { left: 60, right: 80, top: 30, bottom: 80 },
      xAxis: {
        type: "category",
        data: managerSeasons.map(r => r.season),
        axisLabel: { color: "#888" },
      },      
      yAxis: {
        type: "value",
        name: "GF/G",
        axisLabel: { color: "#888" },
        splitLine: { lineStyle: { color: "#333" } },
      },
      series: [
        {
          type: "bar",
          data: barData.map(d => d.value),
          barWidth: "60%",
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: widget.color + "55" },
              { offset: 1, color: widget.color },
            ]),
            borderRadius: [8, 8, 8, 8],
          },
          label: {
            show: true,
            position: "insideRight",
            formatter: "{c}",
            color: "#000",
            fontWeight: "bold",
          },
        },
      
        {
          type: "custom",
          coordinateSystem: "cartesian2d",
        
          // EXPLICIT x-value binding
          data: managerSeasons.map((r, idx) => [
            idx,          // x category (MUST match xAxis data)
            0,            // y value (baseline)
            r.nhl_team    // payload
          ]),
          
        
          renderItem: (params, api) => {
            const seasonIdx = api.value(0);
            const nhlTeam = api.value(2);
          
            const point = api.coord([seasonIdx, 0]);
            if (!point) return null;
          
            return {
              type: 'image',
              style: {
                image: `/images/nhl-logos/${nhlTeam}.webp`,
                x: point[0] - 15,
                y: point[1] - 35,
                width: 30,
                height: 30,
                opacity: 1,       // keep fully opaque
                shadowBlur: 0,
              },
              zlevel: 10,         // <--- render on separate canvas layer
              emphasis: {
                style: { opacity: 1 }
              }
            };
          }
          
          
        }
        
      ]
      
      
      
    };
  } else {
    // fallback for "all managers" view
    const seasonGroups = {};
    rows.filter(r => r.gp > 0).forEach(r => {
      if (!seasonGroups[r.season]) seasonGroups[r.season] = [];
      seasonGroups[r.season].push(parseFloat(r.gf_per_game));
    });

    const seasonData = Object.entries(seasonGroups)
      .map(([season, values]) => ({
        season,
        avgGF: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      }))
      .sort((a, b) => parseInt(a.season) - parseInt(b.season));

    return {
      tooltip: { trigger: "axis" },
      grid: { left: 60, right: 20, top: 30, bottom: 60 },
      xAxis: {
        type: "category",
        data: seasonData.map(d => `${d.season}`),
        axisLabel: { color: "#888" },
      },
      yAxis: {
        type: "value",
        name: "Avg GF/G",
        axisLabel: { color: "#888" },
        splitLine: { lineStyle: { color: "#333" } },
      },
      series: [
        {
          type: "line",
          data: seasonData.map(d => d.avgGF),
          smooth: true,
          itemStyle: { color: widget.color },
          lineStyle: { color: widget.color, width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: widget.color + "80" },
                { offset: 1, color: widget.color + "10" },
              ],
            },
          },
          symbol: "circle",
          symbolSize: 8,
        },
      ],
    };
  }
}

    
    
  // Biggest blowouts - PREVIEW ONLY
  if (widget.type === "blowouts" && !isExpanded) {
    const topGame = [...blowoutGames]
      .sort((a, b) => b.margin - a.margin)[0];
  
    if (!topGame) return {};
  
    return {
      tooltip: {
        trigger: "axis",
        formatter: () => {
          const winnerLogo = nhlLogos[topGame.winnerNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
          const loserLogo = nhlLogos[topGame.loserNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
          return `
            <div style="font-weight:bold; text-align:center;">
              <img src="${winnerLogo}" style="width:20px; height:20px; margin-right:6px;" />
              ${topGame.winner} ${topGame.winnerScore} - ${topGame.loserScore} ${topGame.loser}
              <img src="${loserLogo}" style="width:20px; height:20px; margin-left:6px;" /><br/>
              Season ${topGame.season}<br/>
              GD: ${topGame.margin} goals
            </div>
          `;
        },
      },
      grid: { left: 80, right: 20, top: 30, bottom: 60 },
      xAxis: {
        type: "category",
        data: ["#1"],
        axisLabel: { color: "#888" },
      },
      yAxis: {
        type: "value",
        name: "Goal Diff",
        axisLabel: { color: "#888" },
        splitLine: { lineStyle: { color: "#333" } },
      },
      series: [
        {
          type: "bar",
          data: [topGame.margin],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
              { offset: 0, color: widget.color + "60" },
              { offset: 1, color: widget.color },
            ]),
            borderRadius: [5, 5, 0, 0],
          },
          label: {
            show: true,
            position: "top",
            color: "#FFF",
            fontWeight: "bold",
            formatter: "{c}",
          },
        },
      ],
    };
  }
  
  





    
    
    


    // Single stat (most goals in a game) - ENHANCED VERSION
    if (widget.type === "single-stat") {
      if (isExpanded) {
        if (mostGoalsViewMode === "total") {
          // Most total goals in a game
          const topGames = [...blowoutGames]
            .sort((a, b) => b.totalGoals - a.totalGoals)
            .slice(0, 15);
        
          return {
            tooltip: {
              trigger: "axis",
              formatter: (params) => {
                const game = topGames[params[0].dataIndex];
                const homeNHLLogo = nhlLogos[game.homeNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
                const awayNHLLogo = nhlLogos[game.awayNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
                return `
                  <div style="font-weight:bold; text-align:center;">
                    <div style="margin-bottom:8px;">
                      <img src="${homeNHLLogo}" style="width:28px; height:28px; vertical-align:middle; margin-right:6px;" />
                      <span style="font-size:15px;">${game.home}</span>
                    </div>
                    <div style="font-size:22px; font-weight:900; margin:10px 0; color:#00FF88;">
                      ${game.home_score} - ${game.away_score}
                    </div>
                    <div style="margin-top:8px;">
                      <img src="${awayNHLLogo}" style="width:28px; height:28px; vertical-align:middle; margin-right:6px;" />
                      <span style="font-size:15px;">${game.away}</span>
                    </div>
                    <div style="margin-top:10px; color:#999; font-size:13px;">
                      Season ${game.season} • Total: ${game.totalGoals} goals
                    </div>
                  </div>
                `;
              }
            },
            grid: { left: 60, right: 20, top: 30, bottom: 60 },
            xAxis: {
              type: "category",
              data: topGames.map((_, i) => `#${i+1}`),
              axisLabel: { color: "#888" },
            },
            yAxis: {
              type: "value",
              name: "Total Goals",
              axisLabel: { color: "#888" },
              splitLine: { lineStyle: { color: "#333" } },
            },
            series: [
              {
                type: "bar",
                data: topGames.map(g => g.totalGoals),
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
                    { offset: 0, color: widget.color + "60" },
                    { offset: 1, color: widget.color },
                  ]),
                  borderRadius: [5, 5, 0, 0],
                },
                label: {
                  show: true,
                  position: "top",
                  color: "#FFF",
                  fontWeight: "bold",
                  formatter: "{c}",
                },
              },
            ],
          };
        } else {
          // Most goals by a single team in a game
          const allTeamPerformances = [];
          
          blowoutGames.forEach(game => {
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
        
          return {
            tooltip: {
              trigger: "axis",
              formatter: (params) => {
                const perf = topPerformances[params[0].dataIndex];
                const teamLogo = nhlLogos[perf.nhlTeam?.toUpperCase()] || "/images/nhl-logos/default.png";
                const oppLogo = nhlLogos[perf.opponentNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
                return `
                  <div style="font-weight:bold; text-align:center;">
                    <div style="margin-bottom:10px;">
                      <img src="${teamLogo}" style="width:32px; height:32px; vertical-align:middle; margin-right:8px;" />
                      <span style="font-size:16px;">${perf.manager}</span>
                    </div>
                    <div style="font-size:28px; font-weight:900; margin:12px 0; color:#C77DFF;">
                      ${perf.goals} GOALS
                    </div>
                    <div style="color:#888; margin:8px 0;">vs</div>
                    <div style="margin-top:10px;">
                      <img src="${oppLogo}" style="width:32px; height:32px; vertical-align:middle; margin-right:8px;" />
                      <span style="font-size:16px;">${perf.opponent}</span>
                    </div>
                    <div style="margin-top:12px; color:#999; font-size:14px;">
                      Season ${perf.season} • Final: ${perf.goals}-${perf.opponentGoals}
                    </div>
                  </div>
                `;
              }
            },
            grid: { left: 60, right: 20, top: 30, bottom: 60 },
            xAxis: {
              type: "category",
              data: topPerformances.map((_, i) => `#${i+1}`),
              axisLabel: { color: "#888" },
            },
            yAxis: {
              type: "value",
              name: "Goals Scored",
              axisLabel: { color: "#888" },
              splitLine: { lineStyle: { color: "#333" } },
            },
            series: [
              {
                type: "bar",
                data: topPerformances.map(p => p.goals),
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
                    { offset: 0, color: "#9D4EDD" },
                    { offset: 1, color: "#C77DFF" },
                  ]),
                  borderRadius: [5, 5, 0, 0],
                },
                label: {
                  show: true,
                  position: "top",
                  color: "#FFF",
                  fontWeight: "bold",
                  formatter: "{c}",
                },
              },
            ],
          };
        }
      } else {
        // Preview mode - show top total
        const topGame = [...blowoutGames]
          .sort((a, b) => b.totalGoals - a.totalGoals)[0];
        
        if (!topGame) return {};
      
        return {
          tooltip: {
            trigger: "axis",
            formatter: () => {
              const homeNHLLogo = nhlLogos[topGame.homeNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
              const awayNHLLogo = nhlLogos[topGame.awayNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
              return `
                <div style="font-weight:bold; text-align:center;">
                  <div style="margin-bottom:8px;">
                    <img src="${homeNHLLogo}" style="width:24px; height:24px; vertical-align:middle; margin-right:6px;" />
                    <span>${topGame.home}</span>
                  </div>
                  <div style="font-size:20px; font-weight:900; margin:8px 0;">
                    ${topGame.home_score} - ${topGame.away_score}
                  </div>
                  <div style="margin-top:8px;">
                    <img src="${awayNHLLogo}" style="width:24px; height:24px; vertical-align:middle; margin-right:6px;" />
                    <span>${topGame.away}</span>
                  </div>
                  <div style="margin-top:8px; color:#999;">
                    Season ${topGame.season} • Total: ${topGame.totalGoals} goals
                  </div>
                </div>
              `;
            }
          },
          xAxis: {
            type: "category",
            data: ["#1"],
            axisLabel: { color: "#888" },
          },
          yAxis: {
            type: "value",
            name: "Total Goals",
            axisLabel: { color: "#888" },
            splitLine: { lineStyle: { color: "#333" } },
          },
          series: [
            {
              type: "bar",
              data: [topGame.totalGoals],
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
                  { offset: 0, color: widget.color + "60" },
                  { offset: 1, color: widget.color },
                ]),
                borderRadius: [5, 5, 0, 0],
              },
              label: {
                show: true,
                position: "top",
                color: "#FFF",
                fontWeight: "bold",
                formatter: "{c}",
              },
            },
          ],
        };
      }
    }
    

    return {};
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", flexDirection: "column", gap: "20px" }}>
          <div style={{ width: "80px", height: "80px", border: "6px solid rgba(0,255,255,0.2)", borderTop: "6px solid #00FFFF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ color: "#00FFFF", fontSize: "1.5rem", fontWeight: "700" }}>Loading Dashboard...</div>
        </div>
      </Layout>
    );
  }

  const getGridSize = (size) => {
    switch (size) {
      case "small": return { gridColumn: "span 1", minHeight: "220px" };
      case "medium": return { gridColumn: "span 1", minHeight: "350px" };
      case "large": return { gridColumn: "span 2", minHeight: "400px" };
      default: return { gridColumn: "span 1", minHeight: "300px" };
    }
  };

  const uniqueManagers = [...new Set(rows.map(r => r.manager).filter(Boolean))].sort();

  return (
    <Layout>

{/* Top Scorers Expanded Modal */}
{expandedWidget && expandedWidget.id === "top-scorers" && (
  <div 
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.95)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    }}
    onClick={() => {
      setExpandedWidget(null);
      setBarRaceFrame(0);
    }}
  >
    <div
      style={{
        width: "90%",
        maxWidth: "1200px",
        height: "80%",
        padding: "20px",
        background: "#111",
        borderRadius: "16px",
        position: "relative",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 style={{ color: "#FF6B6B", marginBottom: "10px", textAlign: "center", fontSize: "2rem", fontWeight: "900" }}>
        🔥 Goals Timeline
      </h2>

      {barRaceFrames && barRaceFrames.length > 0 && (
        <div style={{ 
          textAlign: "center", 
          fontSize: "1.25rem", 
          fontWeight: "700", 
          color: "#FFD93D", 
          marginBottom: "10px" 
        }}>
          Game #{barRaceFrames[barRaceFrame]?.gameId || 1} of {barRaceFrames.length}
        </div>
      )}

<ReactECharts
  option={getChartOption(expandedWidget, true)}
  style={{ height: "85vh", width: "100%" }}  // taller for more bars
  notMerge={true}
  lazyUpdate={false}
/>


      <button
        onClick={() => {
          setExpandedWidget(null);
          setBarRaceFrame(0);
        }}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "8px 12px",
          borderRadius: "8px",
          background: "#FF6B6B",
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
)}

      {/* Widgets Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}>
        {WIDGETS.map((widget) => (
          <div key={widget.id}
            style={{
              ...getGridSize(widget.size),
              background: `linear-gradient(135deg, ${widget.color}20, rgba(9, 20, 33, 0.8))`,
              borderRadius: "20px",
              padding: "24px",
              border: `2px solid ${widget.color}40`,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.3s ease",
            }}

            

            onMouseEnter={() => setHoveredWidget(widget.id)}
            onMouseLeave={() => setHoveredWidget(null)}
            onClick={() => {
              if (widget.id === "top-scorers") {
                setExpandedWidget(widget);
                setBarRaceFrame(0);
              } else {
                setExpandedWidget(widget);
              }
            }}
          >
            <div style={{ position: "relative", zIndex: 1 }}>
              <h3 style={{ 
                color: "#FFF", 
                fontWeight: "800",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                {widget.title}
              </h3>
              <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "16px" }}>
                {widget.description}
              </p>
              
              {!widget.showPreview ? (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: widget.size === "small" ? "120px" : "200px",
      color: "#FFF",
      fontWeight: "800",
      fontSize: "1.1rem",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "3rem", marginBottom: "8px" }}>
      {widget.id === "top-scorers" ? "🏒🥅" : "🏁"}
    </div>
    Click to View
  </div>
) : widget.type === "blowouts" && blowoutGames.length > 0 ? (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "120px",
      fontSize: "4rem",
      fontWeight: "900",
      color: widget.color,
    }}
  >
    {[...blowoutGames].sort((a, b) => b.margin - a.margin)[0]?.margin ?? 0}
  </div>
) : (
  <ReactECharts
    option={getChartOption(widget, false)}
    style={{ height: widget.size === "large" ? "300px" : "200px" }}
  />
)}

                   
                 
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Blowouts Modal with Table */}
      {expandedWidget && expandedWidget.id === "biggest-blowouts" && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}
          onClick={() => setExpandedWidget(null)}
        >
          <div
            style={{
              width: "95%",
              maxWidth: "1600px",
              height: "90vh",
              padding: "30px",
              background: "linear-gradient(135deg, #1a0a14 0%, #0a0a1a 100%)",
              borderRadius: "20px",
              position: "relative",
              border: "3px solid " + expandedWidget.color,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: expandedWidget.color,
              marginBottom: "20px",
              textAlign: "center",
              fontSize: "2.5rem",
              fontWeight: "900",
              textShadow: "0 0 20px rgba(255,107,157,0.5)",
            }}>
              💥 Biggest Blowouts in League History
            </h2>

            <div 
              style={{
                overflowY: "auto",
                maxHeight: "calc(100% - 100px)",
                padding: "10px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "12px",
              }}
            >
              <table style={{ 
                width: "100%", 
                borderCollapse: "separate",
                borderSpacing: "0 8px",
                color: "#FFF", 
                fontSize: "0.95rem" 
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: "2px solid #555", 
                    textAlign: "left",
                    position: "sticky",
                    top: 0,
                    background: "#0a0a1a",
                    zIndex: 10,
                  }}>
                    <th style={{ padding: "12px 8px", fontWeight: "900" }}>#</th>
                    <th style={{ padding: "12px 8px", fontWeight: "900" }}>Winner</th>
                    <th style={{ padding: "12px 8px", fontWeight: "900", textAlign: "center" }}>NHL Team</th>
                    <th style={{ padding: "12px 8px", fontWeight: "900", textAlign: "center" }}>Score</th>
                    <th style={{ padding: "12px 8px", fontWeight: "900" }}>Loser</th>
                    <th style={{ padding: "12px 8px", fontWeight: "900", textAlign: "center" }}>NHL Team</th>
                    <th style={{ padding: "12px 8px", fontWeight: "900", textAlign: "center" }}>GD</th>
                    <th style={{ padding: "12px 8px", fontWeight: "900", textAlign: "center" }}>Season</th>
                  </tr>
                </thead>
                <tbody>
                  {[...blowoutGames]
                    .sort((a, b) => b.margin - a.margin)
                    .slice(0, 30)
                    .map((game, i) => {
                      const winnerLogo = nhlLogos[game.winnerNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
                      const loserLogo = nhlLogos[game.loserNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
                      return (
                        <tr 
                          key={`${game.game_id}-${i}`}
                          style={{ 
                            background: i % 2 === 0 ? "rgba(255,107,157,0.08)" : "rgba(0,0,0,0.3)",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,107,157,0.2)";
                            e.currentTarget.style.transform = "scale(1.01)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,107,157,0.08)" : "rgba(0,0,0,0.3)";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          <td style={{ 
                            padding: "12px 8px", 
                            fontWeight: "bold",
                            color: i < 3 ? "#FFD700" : "#FFF",
                            fontSize: i < 3 ? "1.1rem" : "0.95rem",
                          }}>
                            {i + 1}
                          </td>
                          <td style={{ 
                            padding: "12px 8px",
                            fontWeight: "600",
                          }}>
                            {game.winner}
                          </td>
                          <td style={{ 
                            padding: "12px 8px", 
                            textAlign: "center" 
                          }}>
                            <img 
                              src={winnerLogo} 
                              alt={game.winnerNHL}
                              style={{ 
                                width: 32, 
                                height: 32,
                                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                              }} 
                            />
                          </td>
                          <td style={{ 
                            padding: "12px 8px", 
                            textAlign: "center",
                            fontWeight: "900",
                            fontSize: "1.1rem",
                            color: "#00FF88",
                          }}>
                            {game.winnerScore} - {game.loserScore}
                          </td>
                          <td style={{ 
                            padding: "12px 8px",
                            fontWeight: "600",
                          }}>
                            {game.loser}
                          </td>
                          <td style={{ 
                            padding: "12px 8px", 
                            textAlign: "center" 
                          }}>
                            <img 
                              src={loserLogo} 
                              alt={game.loserNHL}
                              style={{ 
                                width: 32, 
                                height: 32,
                                opacity: 0.7,
                                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                              }} 
                            />
                          </td>
                          <td style={{ 
                            padding: "12px 8px", 
                            textAlign: "center", 
                            fontWeight: "900",
                            fontSize: "1.2rem",
                            color: expandedWidget.color,
                          }}>
                            {game.margin}
                          </td>
                          <td style={{ 
                            padding: "12px 8px", 
                            textAlign: "center",
                            color: "#999",
                          }}>
                            {game.season}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setExpandedWidget(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                padding: "10px 16px",
                borderRadius: "10px",
                background: expandedWidget.color,
                color: "#FFF",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem",
                boxShadow: "0 4px 15px rgba(255,107,157,0.4)",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* H2H Racing Modal */}
      {expandedWidget && expandedWidget.type === "h2h" && (
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
            setExpandedWidget(null);
            setSelectedTeams({ teamA: "", teamB: "" });
            setIsRacing(false);
            setCurrentSeason(0);
          }}
        >
          <div 
            style={{ 
              background: "linear-gradient(135deg, #1a0a0a, #0a0a1a)", 
              borderRadius: "24px", 
              padding: "30px", 
              maxWidth: "1400px", 
              width: "95%",
              maxHeight: "90vh",
              overflow: "auto",
              border: "3px solid #FF1744",
              boxShadow: "0 0 50px rgba(255,23,68,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "20px",
            }}>
              <h2 style={{ 
                color: "#FF1744", 
                fontSize: "2rem",
                fontWeight: "900",
                textShadow: "0 0 20px rgba(255,23,68,0.8)",
              }}>
                🏁 H2H Timeline
              </h2>
              <button
                onClick={() => {
                  setExpandedWidget(null);
                  setSelectedTeams({ teamA: "", teamB: "" });
                  setIsRacing(false);
                  setCurrentSeason(0);
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

            {selectedTeams.teamA && selectedTeams.teamB && racingData.length > 0 && (() => {
              const currentData = racingData[currentSeason];
              const teamAInfo = rows.find(r => r.manager === selectedTeams.teamA);
              const teamBInfo = rows.find(r => r.manager === selectedTeams.teamB);

              return (
                <div style={{ 
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "80px",
                  marginBottom: "25px",
                  textAlign: "center",
                }}>
                  <div>
                    {teamAInfo?.avatar && (
                      <img 
                        src={teamAInfo.avatar} 
                        alt={selectedTeams.teamA} 
                        style={{
                          width: "70px",
                          height: "70px",
                          borderRadius: "50%",
                          border: "4px solid #FF3B30",
                          marginBottom: "10px",
                          boxShadow: "0 0 15px rgba(255,59,48,0.8)",
                        }}
                      />
                    )}
                    <div style={{ color: "#FF3B30", fontWeight: "900", fontSize: "1.2rem", marginBottom: "6px" }}>
                      {selectedTeams.teamA}
                    </div>
                    <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.95rem", marginBottom: "4px" }}>
                      GF: <span style={{ fontWeight: "bold" }}>{currentData.teamAGF}</span> • GA: <span style={{ fontWeight: "bold" }}>{currentData.teamAGA}</span> • GD: <span style={{ fontWeight: "bold" }}>{currentData.teamAGD}</span>
                    </div>
                    <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.9rem" }}>
                      Record: <span style={{ fontWeight: "bold" }}>{currentData.teamAWins}-{currentData.teamBWins}{currentData.teamATies > 0 ? `-${currentData.teamATies}` : ""}</span>
                    </div>
                  </div>

                  <div style={{ color: "#FF1744", fontWeight: "900", fontSize: "2rem" }}>VS</div>

                  <div>
                    {teamBInfo?.avatar && (
                      <img 
                        src={teamBInfo.avatar} 
                        alt={selectedTeams.teamB} 
                        style={{
                          width: "70px",
                          height: "70px",
                          borderRadius: "50%",
                          border: "4px solid #007AFF",
                          marginBottom: "10px",
                          boxShadow: "0 0 15px rgba(0,122,255,0.8)",
                        }}
                      />
                    )}
                    <div style={{ color: "#007AFF", fontWeight: "900", fontSize: "1.2rem", marginBottom: "6px" }}>
                      {selectedTeams.teamB}
                    </div>
                    <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.95rem", marginBottom: "4px" }}>
                      GF: <span style={{ fontWeight: "bold" }}>{currentData.teamBGF}</span> • GA: <span style={{ fontWeight: "bold" }}>{currentData.teamBGA}</span> • GD: <span style={{ fontWeight: "bold" }}>{currentData.teamBGD}</span>
                    </div>
                    <div style={{ color: "#FFF", fontWeight: "600", fontSize: "0.9rem" }}>
                      Record: <span style={{ fontWeight: "bold" }}>{currentData.teamBWins}-{currentData.teamAWins}{currentData.teamBTies > 0 ? `-${currentData.teamBTies}` : ""}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ 
              display: "flex", 
              gap: "20px", 
              marginBottom: "20px",
              alignItems: "center",
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: "#888", fontSize: "0.9rem", marginBottom: "8px", display: "block" }}>
                  Team
                </label>
                <select 
                  value={selectedTeams.teamA} 
                  onChange={(e) => setSelectedTeams({ ...selectedTeams, teamA: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#222",
                    color: "#FFF",
                    border: "2px solid #FF1744",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Team 1</option>
                  {uniqueManagers.map(manager => (
                    <option key={manager} value={manager} disabled={manager === selectedTeams.teamB}>
                      {manager}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ 
                fontSize: "2rem", 
                color: "#FF1744",
                fontWeight: "bold",
              }}>
                VS
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ color: "#888", fontSize: "0.9rem", marginBottom: "8px", display: "block" }}>
                  Team
                </label>
                <select 
                  value={selectedTeams.teamB} 
                  onChange={(e) => setSelectedTeams({ ...selectedTeams, teamB: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#222",
                    color: "#FFF",
                    border: "2px solid #007AFF",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Team 2</option>
                  {uniqueManagers.map(manager => (
                    <option key={manager} value={manager} disabled={manager === selectedTeams.teamA}>
                      {manager}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ 
              height: "550px",
              background: "rgba(0,0,0,0.5)",
              borderRadius: "16px",
              padding: "15px",
              border: "2px solid #333",
              position: "relative",
              marginBottom: "15px",
            }}>
              {racingData.length > 0 && (() => {
                const currentGame = racingData[currentSeason];
                const maxWins = Math.max(...racingData.map(g => Math.max(g.teamAWins, g.teamBWins)));
                
                const chartHeight = 430;
                const chartTop = 90;
                const teamAWinRatio = currentGame.teamAWins / (maxWins + 2);
                const teamBWinRatio = currentGame.teamBWins / (maxWins + 2);
                
                const teamATop = chartTop + (chartHeight * (1 - teamAWinRatio));
                const teamBTop = chartTop + (chartHeight * (1 - teamBWinRatio));

                return (
                  <>
                    <div style={{
                      position: "absolute",
                      right: "50px",
                      top: `${teamATop}px`,
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      zIndex: 10,
                      transition: "top 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}>
                      {rows.find(r => r.manager === selectedTeams.teamA)?.avatar && (
                       <img 
                       src={rows.find(r => r.manager === selectedTeams.teamA)?.avatar}
                       alt={selectedTeams.teamA}
                       style={{
                         width: "50px",
                         height: "50px",
                         borderRadius: "50%",
                         border: "4px solid #FF3B30",
                         boxShadow: "0 0 30px rgba(255,59,48,1)",
                         backgroundColor: "#000",
                       }}
                     />
                      )}
                    </div>
                    
                    <div style={{
                      position: "absolute",
                      right: "50px",
                      top: `${teamBTop}px`,
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      zIndex: 10,
                      transition: "top 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}>
                      {rows.find(r => r.manager === selectedTeams.teamB)?.avatar && (
                        <img 
                        src={rows.find(r => r.manager === selectedTeams.teamB)?.avatar}
                        alt={selectedTeams.teamB}
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          border: "4px solid #007AFF",
                          boxShadow: "0 0 30px rgba(0,122,255,1)",
                          backgroundColor: "#000",
                        }}
                      />
                      )}
                    </div>
                  </>
                );
              })()}
              
              <ReactECharts 
                option={getChartOption(expandedWidget, true)} 
                style={{ height: "100%", width: "100%" }}
                notMerge={true}
                lazyUpdate={false}
              />
            </div>

            {racingData.length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ 
                  color: "#666", 
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                }}>
                  Game {currentSeason + 1} of {racingData.length}
                </div>
                <div style={{
                  height: "6px",
                  background: "#222",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${((currentSeason + 1) / racingData.length) * 100}%`,
                    background: "linear-gradient(90deg, #FF1744, #FF9800)",
                    transition: "width 0.35s ease",
                    boxShadow: "0 0 10px rgba(255,23,68,0.6)",
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded Modal for Most Goals Widget */}
      {expandedWidget && expandedWidget.id === "most-goals-game" && (
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
          onClick={() => setExpandedWidget(null)}
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
              border: `3px solid ${expandedWidget.color}`,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              color: expandedWidget.color, 
              marginBottom: "20px", 
              fontSize: "2rem", 
              fontWeight: "900",
              textAlign: "center",
            }}>
              🎯 Most Goals in a Game
            </h2>

            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <label style={{ color: "#888", fontSize: "0.9rem", marginBottom: "8px", display: "block" }}>
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
                  border: "2px solid " + expandedWidget.color,
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
                option={getChartOption(expandedWidget, true)} 
                style={{ height: "100%", width: "100%" }}
                notMerge={true}
                lazyUpdate={false}
              />
            </div>

            <button
              onClick={() => setExpandedWidget(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                padding: "8px 12px",
                borderRadius: "8px",
                background: expandedWidget.color,
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
      )}

      {/* Expanded Modal for Other Widgets */}
      {expandedWidget && expandedWidget.type !== "h2h" && expandedWidget.type !== "bar-race" && expandedWidget.id !== "biggest-blowouts" && expandedWidget.id !== "most-goals-game" && (
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
          onClick={() => setExpandedWidget(null)}
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
              border: `3px solid ${expandedWidget.color}`,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: expandedWidget.color, marginBottom: "20px", fontSize: "2rem", fontWeight: "900" }}>
              {expandedWidget.title}
            </h2>

            {expandedWidget.type === "scoring-trends" && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{ color: "#888", fontSize: "0.9rem", marginBottom: "8px", display: "block" }}>
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
                    border: "2px solid " + expandedWidget.color,
                    fontSize: "1rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    minWidth: "200px",
                  }}
                >
                  <option value="all">All Managers</option>
                  {uniqueManagers.map(manager => (
                    <option key={manager} value={manager}>
                      {manager}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ height: "500px" }}>
              <ReactECharts 
                option={getChartOption(expandedWidget, true)} 
                style={{ height: "100%", width: "100%" }}
              />
            </div>

            <button
              onClick={() => setExpandedWidget(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                padding: "8px 12px",
                borderRadius: "8px",
                background: expandedWidget.color,
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
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}