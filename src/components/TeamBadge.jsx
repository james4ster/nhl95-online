import React from "react";
import { nhlLogos, defaultTeamLogo } from "../constants/nhlLogos";

const SIZES = { sm: 22, md: 28, lg: 40, xl: 64 };

export default function TeamBadge({ team, size = "md" }) {
  const px = SIZES[size] || size;
  const src = nhlLogos[team?.toUpperCase?.()] || nhlLogos[team] || defaultTeamLogo;

  return <img src={src} alt={team || "Team"} width={px} height={px} className="team-badge" />;
}