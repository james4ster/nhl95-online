import * as echarts from "echarts";
import { nhlLogos } from "../../../constants/nhlLogos";


/*============ 
The variables below are used by the BarChartRace component

- seasonColors
- totalSeasons
- baseHue

*/
// --- Generate visually distinct colors for up to 25 seasons ---

const totalSeasons = 25;

// --- Generate completely random colors for up to 25 seasons ---
const seasonColors = {};
for (let s = 1; s <= totalSeasons; s++) {
  const hue = Math.floor(Math.random() * 360); // fully random hue
  seasonColors[s] = `hsl(${hue}, 70%, 50%)`;
}


/*======================================================================================================
getBarRaceChartOption is for the racing chart that shows the logo and accumulates GF across all teams/seasons
*======================================================================================================*/

export function getBarRaceChartOption(barRaceFrames, barRaceFrame, rows) {
  if (!barRaceFrames || barRaceFrames.length === 0) return {};

  const safeFrameIndex = Math.min(barRaceFrame, barRaceFrames.length - 1);
  const frame = barRaceFrames[safeFrameIndex];

  // --- Top managers based on final frame ---
  const finalFrame = barRaceFrames[barRaceFrames.length - 1];
  const topManagers = Object.entries(finalFrame.managerStats || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([manager]) => manager);

  // --- Build delta per season for all managers ---
  const seasonSeriesMap = {}; // { seasonNumber: [deltaForManager1, deltaForManager2, ...] }
  const managerTeamMap = {}; // { manager: { season: team } }

  let totalGamesSoFar = 0; // cumulative games across frames
  topManagers.forEach((manager, idx) => {
    let cumulative = 0;
    const managerSeasons = rows.filter(r => r.manager === manager);
    managerTeamMap[manager] = {};
    for (let i = 0; i <= safeFrameIndex; i++) {
      const f = barRaceFrames[i];
      const season = f.season || 1;
      const value = f.managerStats[manager] || 0;
      const delta = value - cumulative;
      cumulative = value;

      if (!seasonSeriesMap[season]) {
        seasonSeriesMap[season] = Array(topManagers.length).fill(0);
      }
      seasonSeriesMap[season][idx] += delta;

      const row = managerSeasons.find(r => r.season === season);
      managerTeamMap[manager][season] = row?.nhl_team || null;

      totalGamesSoFar += 1; // count each frame as a game
    }
  });

  // --- Build series ---
  const series = Object.entries(seasonSeriesMap).map(([season, data]) => ({
    type: "bar",
    stack: "total",
    barWidth: 45,
    data: data.map((v, idx) => ({
      value: v,
      season: Number(season),
      manager: topManagers[idx],
      itemStyle: { color: seasonColors[season], borderRadius: [0, 22, 22, 0] },
    })),
    
    animationEasing: "cubicOut",
    animationDuration: 500,
  }));

  // --- Custom series for logos ---
  const logoSeriesData = [];
  const sortedSeasons = Object.keys(seasonSeriesMap)
    .map(Number)
    .sort((a, b) => a - b);

  sortedSeasons.forEach(season => {
    const dataArr = seasonSeriesMap[season];
    dataArr.forEach((value, idx) => {
      if (!value) return;
      const cumulative = sortedSeasons
        .filter(s => s < season)
        .reduce((sum, s) => sum + seasonSeriesMap[s][idx], 0);
      const manager = topManagers[idx];
      const team = managerTeamMap[manager][season];
      if (!team) return;
      logoSeriesData.push({ managerIdx: idx, cumulative, value, nhlTeam: team });
    });
  });

  series.push({
    type: "custom",
    coordinateSystem: "cartesian2d",
    z: 100,
    zlevel: 2,
    silent: true,
    renderItem: (params, api) => {
      const data = logoSeriesData[params.dataIndex];
      if (!data || !data.nhlTeam) return null;
      const yCenter = api.coord([0, data.managerIdx])[1];
      const xStart = api.coord([data.cumulative, data.managerIdx])[0];
      const xEnd = api.coord([data.cumulative + data.value, data.managerIdx])[0];
      const width = xEnd - xStart;
      if (width < 20) return null;
      const segmentCenterX = (xStart + xEnd) / 2;
      const logoSize = Math.min(width * 0.7, 36);
      return {
        type: "image",
        style: {
          image: nhlLogos[data.nhlTeam?.toUpperCase()] || "/images/nhl-logos/default.png",
          x: segmentCenterX - logoSize / 2,
          y: yCenter - logoSize / 2,
          width: logoSize,
          height: logoSize,
        },
      };
    },
    data: logoSeriesData,
  });

  // --- x-axis max as integer ---
  const trueMaxValue = Math.ceil(Math.max(...Object.values(finalFrame.managerStats || {})));

  return {
    backgroundColor: "transparent",
    animationDuration: 500,
    animationEasing: "cubicOut",
    animationDurationUpdate: 500,
    animationEasingUpdate: "cubicOut",
    grid: { left: 180, right: 160, top: 40, bottom: 40, containLabel: false },
    tooltip: {
      trigger: 'item',
      enterable: true,
      formatter: (params) => {
        // For standard bar series (season bars)
        const { value, data } = params;
    
        if (!data) return '';
    
        const manager = data.manager || 'Unknown';
        const season = data.season || 'N/A';
        const goals = value || 0;
    
        // Compute rank for this season across all managers
        // We'll use seasonSeriesMap
        const seasonData = seasonSeriesMap[season] || [];
        const sorted = [...seasonData].sort((a, b) => b - a);
        const rank = sorted.indexOf(value) + 1;
    
        return `
          <b>${manager}</b><br/>
          Season: ${season}<br/>
          Goals: ${goals}<br/>
          Rank: ${rank}
        `;
      },
    },
    
    
    xAxis: {
      type: "value",
      max: trueMaxValue,
      name: "Goals",                     // <-- add axis name
      nameLocation: "middle",            // position along axis
      nameGap: 40,
      nameTextStyle: {
        color: "#FF6B6B",               // <-- x-axis name color
        fontSize: 14,
        fontWeight: "bold",
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { 
        color: "#fff",                   // make numbers white
        fontSize: 12 
      },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.15)" } },
    },
    yAxis: {
      type: "category",
      data: topManagers,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#fff", fontSize: 14, fontWeight: "bold" },
      splitLine: { show: false },
    },
    series,
    // --- subtitle for your h2 ---
    __subtitle: {
      totalGamesSoFar: totalGamesSoFar,
      totalGamesInSeason: barRaceFrames.length
    }
  };
}





/*============================
H2H Racing Chart
=============================*/


export function getH2HChartOption(racingData, currentSeason) {
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

  const maxWins = Math.max(
    ...racingData.map((g) => Math.max(g.teamAWins, g.teamBWins))
  );

  return {
    title: {
      subtext: `Season ${currentData.season} • Game #${currentSeason + 1} of ${racingData.length}`,
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
      trigger: "axis",
      backgroundColor: "rgba(0,0,0,0.85)",
      borderColor: "#FF1744",
      borderWidth: 2,
      textStyle: { color: "#FFF", fontWeight: "bold" },
      formatter: (params) => {
        if (!params || params.length === 0) return "";
        const idx = params[0].dataIndex;
        const game = racingData[idx];
        if (!game) return "";
        return `
          <div style="text-align:center; font-size:14px;">
            <strong>Season ${game.season} • Game ${game.gameNumber}</strong><br/>
            <span style="color:#FF3B30;">${game.teamA}</span>: W:${game.teamAWins} L:${game.teamBWins}${game.teamATies > 0 ? ` T:${game.teamATies}` : ""}<br/>
            GF:${game.teamAGF} • GA:${game.teamAGA} • GD:${game.teamAGD}<br/>
            <span style="color:#007AFF;">${game.teamB}</span>: W:${game.teamBWins} L:${game.teamAWins}${game.teamBTies > 0 ? ` T:${game.teamBTies}` : ""}<br/>
            GF:${game.teamBGF} • GA:${game.teamBGA} • GD:${game.teamBGD}
          </div>
        `;
      },
    },
    series: [
      {
        name: currentData.teamA,
        type: "line",
        data: teamAData,
        smooth: 0.3,
        lineStyle: {
          width: 5,
          color: "#FF3B30",
          shadowBlur: 20,
          shadowColor: "rgba(255,59,48,0.6)",
        },
        itemStyle: {
          color: "#FF3B30",
          borderWidth: 3,
          borderColor: "#0a0a1a",
          shadowBlur: 15,
          shadowColor: "rgba(255,59,48,0.8)",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(255,59,48,0.4)" },
              { offset: 0.5, color: "rgba(255,59,48,0.2)" },
              { offset: 1, color: "rgba(255,59,48,0)" },
            ],
          },
        },
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
        lineStyle: {
          width: 5,
          color: "#007AFF",
          shadowBlur: 20,
          shadowColor: "rgba(0,122,255,0.6)",
        },
        itemStyle: {
          color: "#007AFF",
          borderWidth: 3,
          borderColor: "#0a0a1a",
          shadowBlur: 15,
          shadowColor: "rgba(0,122,255,0.8)",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(0,122,255,0.4)" },
              { offset: 0.5, color: "rgba(0,122,255,0.2)" },
              { offset: 1, color: "rgba(0,122,255,0)" },
            ],
          },
        },
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


/* =======================================================================
Used by ranking charts (best points %, best GA/g, best GD)
=======================================================================*/
export function getRankingChartOption(widget, data, isExpanded) {
  // Sort data based on stat
  const isReverseOrder = widget.id === "defensive-wall"; // GA/G smaller is better
  const sortedData = [...data].sort((a, b) => {
    const aVal = parseFloat(a[widget.stat]) || 0;
    const bVal = parseFloat(b[widget.stat]) || 0;
    return isReverseOrder ? aVal - bVal : bVal - aVal;
  });

  // Compute true rankings with ties
  let lastValue = null;
  let lastRank = 0;
  let tieCount = 0;

  const rankedData = sortedData.map((d, i) => {
    const val = parseFloat(d[widget.stat]) || 0;
    if (val === lastValue) {
      tieCount++;
    } else {
      lastRank = i + 1;
      tieCount = 0;
      lastValue = val;
    }
    return {
      ...d,
      rank: lastRank,
    };
  });

  const barData = rankedData.map((r) => ({
    value: parseFloat(r[widget.stat]) || 0,
    logo: r.logo,
  }));

  return {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const item = rankedData[params[0].dataIndex];
        return `
          <div style="font-weight:bold;">
            ${item.manager}<br/>
            Season ${item.season}<br/>
            ${item.nhl_team}<br/>
            ${widget.stat === "ga_per_game" ? "GA/G" : widget.stat === "pts_percent" ? "Pts %" : "GD"}: ${item[widget.stat]}
          </div>
        `;
      },
    },
    grid: {
      left: isExpanded ? 160 : 120,
      right: isExpanded ? 180 : 120,
      top: isExpanded ? 60 : 30,
      bottom: isExpanded ? 80 : 60, // moved down so x-axis doesn't hit bar
    },
    xAxis: {
      type: "value",
      min: 0,
      axisLabel: { color: "#fff", fontSize: isExpanded ? 14 : 12 },
      splitLine: { lineStyle: { color: "#333" } },
    },
    yAxis: [
      {
        type: "category",
        inverse: true,
        data: rankedData.map((r) => `#${r.rank}`),
        axisLabel: { color: "#FF1744", fontWeight: "900", fontSize: isExpanded ? 16 : 12 },
        axisTick: { show: false, alignWithLabel: true },
        axisLine: { show: false },
        boundaryGap: false,
      },
      {
        type: "category",
        inverse: true,
        data: rankedData.map((r) => `${r.manager} • S${r.season}`),
        axisLabel: { color: "#fff", fontSize: isExpanded ? 16 : 12 },
        axisTick: { show: false, alignWithLabel: true },
        axisLine: { show: false },
        boundaryGap: false,
      },
    ],
    series: [
      {
        type: "bar",
        data: barData,
        barWidth: isExpanded ? "90%" : "60%",
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
          fontSize: isExpanded ? 16 : 12,
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
                height: 22,
                width: 22,
                align: "center",
                backgroundColor: { image: d.logo },
              },
            ])
          ),
        },
      },
    ],
  };
}



/*===========================
Scoring Trends
=============================*/

export function getScoringTrendsChartOption(
  widget,
  rows,
  isExpanded,
  selectedManagerForTrends
) {
  if (isExpanded && selectedManagerForTrends !== "all") {
    const managerSeasons = rows
      .filter((r) => r.manager === selectedManagerForTrends && r.gp > 0)
      .sort((a, b) => parseInt(a.season) - parseInt(b.season));

    const barData = managerSeasons.map((r) => ({
      value: r.gf_per_game,
      team: r.nhl_team,
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
        data: managerSeasons.map((r) => r.season),
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
          data: barData.map((d) => d.value),
          barWidth: "60%",
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(34, 197, 94, 1)" },
              { offset: 1, color: "rgba(34, 197, 94, 0.6)" },
            ]),
            borderRadius: [8, 8, 8, 8],
          },
          label: {
            show: true,
            position: "inside",
            align: "center",
            verticalAlign: "middle",
            formatter: "{c}",
            color: "#000",
            fontWeight: "bold",
          },
        },
        {
          type: "custom",
          coordinateSystem: "cartesian2d",
          data: managerSeasons.map((r, idx) => [idx, 0, r.nhl_team]),
          renderItem: (params, api) => {
            const seasonIdx = api.value(0);
            const nhlTeam = api.value(2);
        
            const xPoint = api.coord([seasonIdx, 0])[0]; // X coordinate
            const yBottom = api.coord([0, 0])[1]; // Y coordinate at 0
        
            return {
              type: "image",
              style: {
                image: `/images/nhl-logos/${nhlTeam}.webp`,
                x: xPoint - 15,
                y: yBottom + 35, // Move below X axis (positive value goes down)
                width: 30,
                height: 30,
                opacity: 1,
              },
              zlevel: 10,
            };
          },
        }
        
      ],
    };
  } else {
    const seasonGroups = {};
    rows
      .filter((r) => r.gp > 0)
      .forEach((r) => {
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
        data: seasonData.map((d) => `${d.season}`),
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
          data: seasonData.map((d) => d.avgGF),
          smooth: true,
          itemStyle: { color: "#22C55E" },
lineStyle: { color: "#22C55E", width: 3 },
areaStyle: {
  color: {
    type: "linear",
    x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: "rgba(34, 197, 94, 0.8)" },
      { offset: 1, color: "rgba(34, 197, 94, 0.1)" },
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


/*=============================
Blowouts Charts
=============================*/
export function getBlowoutsPreviewChartOption(widget, topGame) {
  if (!topGame) return {};

  return {
    tooltip: {
      trigger: "axis",
      formatter: () => {
        const winnerLogo =
          nhlLogos[topGame.winnerNHL?.toUpperCase()] ||
          "/images/nhl-logos/default.png";
        const loserLogo =
          nhlLogos[topGame.loserNHL?.toUpperCase()] ||
          "/images/nhl-logos/default.png";
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


/* =============================
Most GF TOTAL Chart
=============================*/
export function getMostGoalsTotalChartOption(widget, topGames) {
  return {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const game = topGames[params[0].dataIndex];
        const homeNHLLogo =
          nhlLogos[game.homeNHL?.toUpperCase()] ||
          "/images/nhl-logos/default.png";
        const awayNHLLogo =
          nhlLogos[game.awayNHL?.toUpperCase()] ||
          "/images/nhl-logos/default.png";
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
      },
    },
    grid: { left: 60, right: 20, top: 30, bottom: 60 },
    xAxis: {
      type: "category",
      data: topGames.map((_, i) => `#${i + 1}`),
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
        data: topGames.map((g) => g.totalGoals),
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


/* =============================
Most GF by team
=============================*/
export function getMostGoalsSingleTeamChartOption(widget, topPerformances) {
  return {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const perf = topPerformances[params[0].dataIndex];
        const teamLogo =
          nhlLogos[perf.nhlTeam?.toUpperCase()] || "/images/nhl-logos/default.png";
        const oppLogo =
          nhlLogos[perf.opponentNHL?.toUpperCase()] || "/images/nhl-logos/default.png";
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
      },
    },
    grid: { left: 60, right: 20, top: 30, bottom: 60 },
    xAxis: {
      type: "category",
      data: topPerformances.map((_, i) => `#${i + 1}`),
      axisLabel: { color: "#FFF" },
    },
    yAxis: {
      type: "value",
      name: "Goals Scored",
      axisLabel: { color: "#FFF" },
      splitLine: { lineStyle: { color: "#333" } },
    },
    series: [
      {
        type: "bar",
        data: topPerformances.map((p) => p.goals),
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






/* =============================
Most Goals Scored Records
=============================*/
export function getMostGoalsPreviewChartOption(widget, topGame) {
  return {
    backgroundColor: "transparent",

    tooltip: {
      trigger: "item",
      formatter: `
        <div style="padding:6px 8px;">
          <strong>${topGame.homeTeam} ${topGame.homeScore} - ${topGame.awayScore} ${topGame.awayTeam}</strong><br/>
          Total Goals: ${topGame.totalGoals}
        </div>
      `,
    },

    xAxis: { show: false },
    yAxis: { show: false },

    series: [
      {
        type: "bar",
        data: [topGame.totalGoals],
        barWidth: 0, // invisible bar
        label: {
          show: true,
          position: "inside",
          formatter: topGame.totalGoals.toString(),
          fontSize: 48,
          fontWeight: "bold",
          color: widget.color,
        },
        itemStyle: {
          color: "transparent",
        },
      },
    ],
  };
}


/* =============================
Home/Away Charts
=============================*/
export function getHomeAwayChartOption(rows = []) {
  let homeWins = 0;
  let awayWins = 0;
  let ties = 0;

  rows.forEach((g) => {
    const home = Number(g?.home_score);
    const away = Number(g?.away_score);

    if (Number.isNaN(home) || Number.isNaN(away)) return;

    if (home > away) homeWins++;
    else if (away > home) awayWins++;
    else ties++;
  });

  const total = homeWins + awayWins + ties;

  if (total === 0) {
    return {
      graphic: {
        type: "text",
        left: "center",
        top: "middle",
        style: {
          text: "No Games Found",
          fill: "#fff",
          fontSize: 18,
        },
      },
    };
  }

  return {
    animation: true,
    animationDuration: 1000,
    animationEasing: "cubicOut",

    tooltip: {
      trigger: "item",
      backgroundColor: "#111",
      borderColor: "#444",
      borderWidth: 1,
      textStyle: { color: "#fff" },
      formatter: (params) => `
        <div style="font-weight:600">
          ${params.name}<br/>
          ${params.value} Games<br/>
          ${params.percent}%
        </div>
      `,
    },

    series: [
      // 🔥 Main Donut
      {
        type: "pie",
        radius: ["58%", "80%"],
        center: ["50%", "50%"],
        startAngle: 90,
        avoidLabelOverlap: false,

        itemStyle: {
          borderRadius: 16,
          borderColor: "#111",
          borderWidth: 4,
          shadowBlur: 20,
          shadowColor: "rgba(0,0,0,0.6)",
        },

        label: {
          show: true,
          position: "inside",
          formatter: "{d}%",
          fontSize: 18,
          fontWeight: 800,
          color: "#fff",
        },

        labelLine: { show: false },

        data: [
          {
            value: homeWins,
            name: "Home Wins",
            itemStyle: {
              color: {
                type: "radial",
                x: 0.3,
                y: 0.3,
                r: 1,
                colorStops: [
                  { offset: 0, color: "#ff758f" },
                  { offset: 1, color: "#FF1744" },
                ],
              },
            },
          },
          {
            value: awayWins,
            name: "Away Wins",
            itemStyle: {
              color: {
                type: "radial",
                x: 0.3,
                y: 0.3,
                r: 1,
                colorStops: [
                  { offset: 0, color: "#74c0fc" },
                  { offset: 1, color: "#2196F3" },
                ],
              },
            },
          },
          {
            value: ties,
            name: "Ties",
            itemStyle: {
              color: {
                type: "radial",
                x: 0.3,
                y: 0.3,
                r: 1,
                colorStops: [
                  { offset: 0, color: "#d0d0d0" },
                  { offset: 1, color: "#757575" },
                ],
              },
            },
          },
        ],

        emphasis: {
          scale: true,
          scaleSize: 12,
        },
      },

      // 💫 Subtle Outer Glow Ring
      {
        type: "pie",
        radius: ["83%", "88%"],
        center: ["50%", "50%"],
        silent: true,
        label: { show: false },
        data: [
          {
            value: total,
            itemStyle: {
              color: "rgba(255,255,255,0.05)",
            },
          },
        ],
      },
    ],

    graphic: [
      {
        type: "text",
        left: "center",
        top: "43%",
        style: {
          text: `${total}`,
          fill: "#fff",
          fontSize: 30,
          fontWeight: 900,
        },
      },
      {
        type: "text",
        left: "center",
        top: "56%",
        style: {
          text: "Total Games",
          fill: "#aaa",
          fontSize: 14,
          fontWeight: 500,
        },
      },
    ],
  };
}


/* =============================
Home/Away Expanded Chart
=============================*/
export function getHomeAwayExpandedChartOption(rows, metric, selectedManager = "") {
  const home = { W: 0, L: 0, T: 0, GF: 0, GA: 0, GD: 0, SO: 0, ptsPercent: 0 };
  const away = { ...home };
  
  // Filter rows to only include games with scores
  const validRows = rows.filter(r => r.home_score != null && r.away_score != null);
  
  if (selectedManager) {
    // SPECIFIC MANAGER SELECTED - only count their games
    validRows.forEach(r => {
      // HOME: When selected manager was playing HOME
      if (r.home === selectedManager) {
        // Win/Loss/Tie from home perspective
        if (r.home_score > r.away_score) home.W += 1;
        else if (r.home_score < r.away_score) home.L += 1;
        else home.T += 1;
        
        // Goals FOR this manager = home_score
        home.GF += r.home_score;
        // Goals AGAINST this manager = away_score
        home.GA += r.away_score;
        // Goal differential
        home.GD += r.home_score - r.away_score;
        // Shutouts (manager kept opponent to 0)
        if (r.away_score === 0) home.SO += 1;
      }
      
      // AWAY: When selected manager was playing AWAY
      if (r.away === selectedManager) {
        // Win/Loss/Tie from away manager's perspective
        if (r.away_score > r.home_score) away.W += 1;
        else if (r.away_score < r.home_score) away.L += 1;
        else away.T += 1;
        
        // Goals FOR this manager = away_score
        away.GF += r.away_score;
        // Goals AGAINST this manager = home_score
        away.GA += r.home_score;
        // Goal differential
        away.GD += r.away_score - r.home_score;
        // Shutouts (manager kept opponent to 0)
        if (r.home_score === 0) away.SO += 1;
      }
    });
  } else {
    // ALL MANAGERS - aggregate all home games vs all away games
    validRows.forEach(r => {
      // HOME stats (all managers playing at home)
      if (r.home_score > r.away_score) home.W += 1;
      else if (r.home_score < r.away_score) home.L += 1;
      else home.T += 1;
      home.GF += r.home_score;
      home.GA += r.away_score;
      home.GD += r.home_score - r.away_score;
      if (r.away_score === 0) home.SO += 1;
      
      // AWAY stats (all managers playing away)
      if (r.away_score > r.home_score) away.W += 1;
      else if (r.away_score < r.home_score) away.L += 1;
      else away.T += 1;
      away.GF += r.away_score;
      away.GA += r.home_score;
      away.GD += r.away_score - r.home_score;
      if (r.home_score === 0) away.SO += 1;
    });
  }
  
  // Points percentage = W + 0.5*T
  home.ptsPercent = home.W + home.T * 0.5;
  away.ptsPercent = away.W + away.T * 0.5;
  
  const xData = ["Home", "Away"];
  let series;
  
  switch (metric) {
    case "WLT":
      series = [
        { name: "Wins", type: "bar", stack: "total", data: [home.W, away.W], itemStyle: { color: "#4caf50" } },
        { name: "Losses", type: "bar", stack: "total", data: [home.L, away.L], itemStyle: { color: "#f44336" } },
        { name: "Ties", type: "bar", stack: "total", data: [home.T, away.T], itemStyle: { color: "#ffc107" } },
      ];
      break;
    case "Pts%":
      series = [
        { name: "Pts%", type: "bar", data: [home.ptsPercent, away.ptsPercent], itemStyle: { color: "#FF1744" } },
      ];
      break;
    case "GF":
    case "GA":
    case "GD":
    case "SO":
      series = [
        { name: metric, type: "bar", data: [home[metric], away[metric]], itemStyle: { color: "#FF1744" } },
      ];
      break;
    default:
      series = [];
  }
  
  return {
    tooltip: { show: true },
    xAxis: { type: "category", data: xData, axisLine: { lineStyle: { color: "#fff" } } },
    yAxis: { type: "value", axisLine: { lineStyle: { color: "#fff" } } },
    series,
  };
}