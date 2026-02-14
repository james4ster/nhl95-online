import React from "react";

export function GoalsTimelineWidget({ widget, onExpand, onHover, isHovered }) {
  return (
    <div
      style={{
        gridColumn: "span 1",
        minHeight: "220px",
        background: `linear-gradient(135deg, ${widget.color}20, rgba(9, 20, 33, 0.8))`,
        borderRadius: "20px",
        padding: "24px",
        border: `2px solid ${widget.color}40`,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s ease",
        transform: isHovered ? "scale(1.02)" : "scale(1)",
      }}
      onMouseEnter={() => onHover(widget.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onExpand}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        <h3
          style={{
            color: "#FFF",
            fontWeight: "800",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {widget.title}
        </h3>
        <p
          style={{
            color: "#888",
            fontSize: "0.85rem",
            marginBottom: "16px",
          }}
        >
          {widget.description}
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "120px",
            color: "#FFF",
            fontWeight: "800",
            fontSize: "1.1rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>🏒🥅</div>
          Click to View
        </div>
      </div>
    </div>
  );
}
