import React from "react";
import { useEffect, useState } from "react";

function computeParts(endIso) {
  const diff = new Date(endIso) - new Date();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return {
    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
    h: Math.floor((diff / (1000 * 60 * 60)) % 24),
    m: Math.floor((diff / (1000 * 60)) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

const pad = (n) => String(n).padStart(2, "0");

export default function CountdownTimer({ endIso, label = "Season Ends In" }) {
  const [parts, setParts] = useState(() => computeParts(endIso));

  useEffect(() => {
    if (!endIso) return;
    setParts(computeParts(endIso));
    const timer = setInterval(() => setParts(computeParts(endIso)), 1000);
    return () => clearInterval(timer);
  }, [endIso]);

  if (!endIso) return null;

  return (
    <div className="countdown-banner">
      <span className="countdown-banner-label">{label}</span>
      <div className="countdown-banner-time">
        <span className="countdown-banner-segment">
          {pad(parts.d)}<small>d</small>
        </span>
        <span className="countdown-banner-segment">
          {pad(parts.h)}<small>h</small>
        </span>
        <span className="countdown-banner-segment">
          {pad(parts.m)}<small>m</small>
        </span>
        <span className="countdown-banner-segment">
          {pad(parts.s)}<small>s</small>
        </span>
      </div>
    </div>
  );
}