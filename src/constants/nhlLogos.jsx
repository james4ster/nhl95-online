// Maps NHL95-era team codes to their logo files in /public/images/nhl-logos.
// Add a new team by dropping a `<CODE>.webp` into that folder and adding a
// line below — everything else (TeamBadge, tables, etc.) picks it up automatically.

const codes = [
    "ANA", "BOS", "BUF", "CAL", "CHI", "DAL", "DET", "EDM", "FLA", "HFD",
    "LAK", "MTL", "NJD", "NYI", "NYR", "OTT", "PHL", "PIT", "QUE", "SJS",
    "STL", "TBL", "TOR", "VAN", "WAS", "WPG",
  ];
  
  export const nhlLogos = Object.fromEntries(
    codes.map((code) => [code, `/images/nhl-logos/${code}.webp`])
  );
  
  export const defaultTeamLogo = "/images/nhl-logos/default.png";