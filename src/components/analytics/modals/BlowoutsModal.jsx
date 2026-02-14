import React from "react";
import { nhlLogos } from "../../../constants/nhlLogos";

export function BlowoutsModal({ widget, blowoutGames, onClose }) {
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
        style={{
          width: "95%",
          maxWidth: "1600px",
          height: "90vh",
          padding: "30px",
          background: "linear-gradient(135deg, #1a0a14 0%, #0a0a1a 100%)",
          borderRadius: "20px",
          position: "relative",
          border: "3px solid " + widget.color,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            color: widget.color,
            marginBottom: "20px",
            textAlign: "center",
            fontSize: "2.5rem",
            fontWeight: "900",
            textShadow: "0 0 20px rgba(255,107,157,0.5)",
          }}
        >
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
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0 8px",
              color: "#FFF",
              fontSize: "0.95rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #555",
                  textAlign: "left",
                  position: "sticky",
                  top: 0,
                  background: "#0a0a1a",
                  zIndex: 10,
                }}
              >
                <th style={{ padding: "12px 8px", fontWeight: "900" }}>#</th>
                <th style={{ padding: "12px 8px", fontWeight: "900" }}>Winner</th>
                <th
                  style={{
                    padding: "12px 8px",
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  NHL Team
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  Score
                </th>
                <th style={{ padding: "12px 8px", fontWeight: "900" }}>Loser</th>
                <th
                  style={{
                    padding: "12px 8px",
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  NHL Team
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  GD
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  Season
                </th>
              </tr>
            </thead>
            <tbody>
              {[...blowoutGames]
                .sort((a, b) => b.margin - a.margin)
                .slice(0, 30)
                .map((game, i) => {
                  const winnerLogo =
                    nhlLogos[game.winnerNHL?.toUpperCase()] ||
                    "/images/nhl-logos/default.png";
                  const loserLogo =
                    nhlLogos[game.loserNHL?.toUpperCase()] ||
                    "/images/nhl-logos/default.png";
                  return (
                    <tr
                      key={`${game.game_id}-${i}`}
                      style={{
                        background:
                          i % 2 === 0
                            ? "rgba(255,107,157,0.08)"
                            : "rgba(0,0,0,0.3)",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,107,157,0.2)";
                        e.currentTarget.style.transform = "scale(1.01)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          i % 2 === 0
                            ? "rgba(255,107,157,0.08)"
                            : "rgba(0,0,0,0.3)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 8px",
                          fontWeight: "bold",
                          color: i < 3 ? "#FFD700" : "#FFF",
                          fontSize: i < 3 ? "1.1rem" : "0.95rem",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          fontWeight: "600",
                        }}
                      >
                        {game.winner}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                        }}
                      >
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
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                          fontWeight: "900",
                          fontSize: "1.1rem",
                          color: "#00FF88",
                        }}
                      >
                        {game.winnerScore} - {game.loserScore}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          fontWeight: "600",
                        }}
                      >
                        {game.loser}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                        }}
                      >
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
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                          fontWeight: "900",
                          fontSize: "1.2rem",
                          color: widget.color,
                        }}
                      >
                        {game.margin}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                          color: "#999",
                        }}
                      >
                        {game.season}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "10px 16px",
            borderRadius: "10px",
            background: widget.color,
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
  );
}
