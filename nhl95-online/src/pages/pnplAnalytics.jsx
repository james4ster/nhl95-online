import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { supabase } from "../supabaseClient";
import { nhlLogos } from "../constants/nhlLogos";
import { WIDGETS, getGridSize } from "../components/analytics/utils/widgetConfig";
import { useBlowoutData } from "../components/analytics/hooks/useBlowoutData";

// Widget Components
import { GoalsTimelineWidget } from "../components/analytics/widgets/GoalsTimelineWidget";
import { H2HTimelineWidget } from "../components/analytics/widgets/H2HTimelineWidget";
import { RankingWidget } from "../components/analytics/widgets/RankingWidget";
import { BlowoutsWidget } from "../components/analytics/widgets/BlowoutsWidget";
import { ScoringTrendsWidget } from "../components/analytics/widgets/ScoringTrendsWidget";
import { MostGoalsWidget } from "../components/analytics/widgets/MostGoalsWidget";
import { HomeAwayWidget } from "../components/analytics/widgets/HomeAwayWidget";


// Modal Components
import { GoalsTimelineModal } from "../components/analytics/modals/GoalsTimelineModal";
import { H2HTimelineModal } from "../components/analytics/modals/H2HTimelineModal";
import { BlowoutsModal } from "../components/analytics/modals/BlowoutsModal";
import { MostGoalsModal } from "../components/analytics/modals/MostGoalsModal";
import { GenericExpandedModal } from "../components/analytics/modals/GenericExpandedModal";
import { HomeAwayModal } from "../components/analytics/modals/HomeAwayModal";

export default function DashboardAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWidget, setExpandedWidget] = useState(null);
  const [hoveredWidget, setHoveredWidget] = useState(null);

  const { blowoutGames } = useBlowoutData();

  const [scheduleRows, setScheduleRows] = useState([]);  // needed for home-away widget


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
        logo:
          nhlLogos[r.nhl_team?.toUpperCase()] ||
          "/images/nhl-logos/default.png",
        ga_per_game: r.gp > 0 ? (r.ga / r.gp).toFixed(2) : 0,
        gf_per_game: r.gp > 0 ? (r.gf / r.gp).toFixed(2) : 0,
        pts_percent:
          r.pts_percent !== null ? Number(r.pts_percent).toFixed(3) : null,
          homeWins: r.homeWins || 0,
          homeLosses: r.homeLosses || 0,
          homeTies: r.homeTies || 0,
          awayWins: r.awayWins || 0,
          awayLosses: r.awayLosses || 0,
          awayTies: r.awayTies || 0,
          homeGF: r.homeGF || 0,
          awayGF: r.awayGF || 0,
          homeGA: r.homeGA || 0,
          awayGA: r.awayGA || 0,
          homeGD: r.homeGD || 0,
          awayGD: r.awayGD || 0,
          homeSO: r.homeSO || 0,
          awaySO: r.awaySO || 0,
      }
      ));

      const { data: schedule } = await supabase
  .from("pnpl_raw_schedule")
  .select("*")
  .not("home_score", "is", null)
  .not("away_score", "is", null);

const scheduleWithManagers = (schedule || []).map((g) => {
  const homeManager = standings.find(s => s.nhl_team === g.home_team)?.manager || null;
  const awayManager = standings.find(s => s.nhl_team === g.away_team)?.manager || null;

  return {
    ...g,
    homeManager,
    awayManager,
  };
});

setScheduleRows(scheduleWithManagers);


      setRows(cleaned);
      setLoading(false);
    }
    load();
  }, []);

  const renderWidget = (widget) => {
    const commonProps = {
      widget,
      onExpand: () => setExpandedWidget(widget),
      onHover: setHoveredWidget,
      isHovered: hoveredWidget === widget.id,
    };

    switch (widget.id) {
      case "top-scorers":
        return <GoalsTimelineWidget key={widget.id} {...commonProps} />;

      case "h2h-history":
        return <H2HTimelineWidget key={widget.id} {...commonProps} />;

      case "defensive-wall":
      case "points-race":
      case "goal-diff":
        return <RankingWidget key={widget.id} {...commonProps} rows={rows} />;

        case "biggest-blowouts":
        return (
          <BlowoutsWidget
            key={widget.id}
            {...commonProps}
            blowoutGames={blowoutGames}
          />
         
        );

      case "scoring-trends":
        return <ScoringTrendsWidget key={widget.id} {...commonProps} rows={rows} />;

      case "most-goals-game":
        return (
          <MostGoalsWidget
            key={widget.id}
            {...commonProps}
            blowoutGames={blowoutGames}
          />
        )
        
      case "home-away":
          return (
            <HomeAwayWidget
              key={widget.id}
              widget={widget}
              rows={scheduleRows}
              onExpand={() => setExpandedWidget(widget)}
    />
  );

          

      default:
        return null;
    }
  };

  const renderModal = () => {
    if (!expandedWidget) return null;

    switch (expandedWidget.id) {
      case "top-scorers":
        return (
          <GoalsTimelineModal
            widget={expandedWidget}
            onClose={() => setExpandedWidget(null)}
            rows={rows}
          />
        );

      case "h2h-history":
        return (
          <H2HTimelineModal
            widget={expandedWidget}
            onClose={() => setExpandedWidget(null)}
            rows={rows}
          />
        );

      case "biggest-blowouts":
        return (
          <BlowoutsModal
            widget={expandedWidget}
            blowoutGames={blowoutGames}
            onClose={() => setExpandedWidget(null)}
          />
        );

      case "most-goals-game":
        return (
          <MostGoalsModal
            widget={expandedWidget}
            blowoutGames={blowoutGames}
            onClose={() => setExpandedWidget(null)}
          />
        );

      case "defensive-wall":
      case "points-race":
      case "goal-diff":
      case "scoring-trends":
        return (
          <GenericExpandedModal
            widget={expandedWidget}
            rows={rows}
            onClose={() => setExpandedWidget(null)}
          />
        )
        
        case "home-away":
  return (
    <HomeAwayModal
      widget={expandedWidget}
      rows={scheduleRows} // pass the game-level data here
      onClose={() => setExpandedWidget(null)}
    />
  );


      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "80vh",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              border: "6px solid rgba(0,255,255,0.2)",
              borderTop: "6px solid #00FFFF",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div
            style={{
              color: "#00FFFF",
              fontSize: "1.5rem",
              fontWeight: "700",
            }}
          >
            Loading Dashboard...
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Widgets Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        {WIDGETS.map(renderWidget)}
      </div>

      {/* Modals */}
      {renderModal()}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
