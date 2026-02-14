// Widget configuration
export const WIDGETS = [
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
    title: "🛡️ Best GA/G Seasons",
    type: "ranking",
    stat: "ga_per_game",
    color: "#4ECDC4",
    size: "medium",
    description: "All Time",
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
    description: "All Time",
    showPreview: true,
  },
  {
    id: "goal-diff",
    title: "📊 Best Goal Differential Seasons",
    type: "ranking",
    stat: "gd",
    color: "#F97316",
    size: "large",
    description: "All Time",
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
    color: "#22C55E",
    size: "large",
    description: "Goals per game by season",
    showPreview: true,
  },
  {
    id: "most-goals-game",
    title: "🎯 Single Game Record",
    type: "single-stat",
    color: "#B4A7D6",
    size: "medium",
    description: "Most Goals Scored",
    showPreview: true,
  },
  {
    id: "home-away",
    name: "Home/Away Record",
    color: "#FF1744",
  }
  
];

export function getGridSize(size) {
  switch (size) {
    case "small":
      return { gridColumn: "span 1", minHeight: "220px" };
    case "medium":
      return { gridColumn: "span 1", minHeight: "350px" };
    case "large":
      return { gridColumn: "span 2", minHeight: "400px" };
    default:
      return { gridColumn: "span 1", minHeight: "300px" };
  }
}
