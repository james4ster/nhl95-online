import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout";
import { supabase } from "../supabaseClient";
import { nhlLogos } from "../constants/nhlLogos";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

/* ---------------- CONFIG ---------------- */

const STAT_OPTIONS = [
  { key: "gf_per_game", label: "Goals For / Game", asc: false },
  { key: "ga_per_game", label: "Goals Against / Game", asc: true },
  { key: "gf", label: "Goals For (Season)", asc: false },
  { key: "ga", label: "Goals Against (Season)", asc: true },
  { key: "shutouts", label: "Shutouts", asc: false },
  { key: "pts", label: "Points", asc: false },
  { key: "pts_percent", label: "Points %", asc: false },
  { key: "gd", label: "Goal Differential", asc: false },
];

const TOP_OPTIONS = [5, 10, 15, 20, 25];

const SELECT_STYLE = {
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
  padding: "12px 16px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #0E3C5F, #091421)",
  boxShadow: "0 6px 24px rgba(0,255,255,0.25)",
  color: "#00FFFF",
  fontSize: "1rem",
  fontWeight: "bold",
  border: "2px solid #00FFFF",
};

/* ---------------- COMPONENT ---------------- */

export default function PnplAnalytics() {
  const [rows, setRows] = useState([]);
  const [statKey, setStatKey] = useState("gf_per_game");
  const [topX, setTopX] = useState(10);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD DATA ---------- */

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: standings } = await supabase
        .from("pnpl_standings")
        .select("*")
        .not("manager", "is", null)
        .eq("possible_points", 0);

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
      }));

      setRows(cleaned);
      setLoading(false);
    }

    load();
  }, []);

  /* ---------- DERIVED DATA ---------- */

  const chartData = useMemo(() => {
    const statConfig = STAT_OPTIONS.find((s) => s.key === statKey);
    if (!statConfig) return [];

    const filtered = rows.filter(
      (r) => r[statKey] !== null && r[statKey] !== undefined
    );

    const sorted = [...filtered].sort((a, b) =>
      statConfig.asc
        ? a[statKey] - b[statKey]
        : b[statKey] - a[statKey]
    );

    return sorted.slice(0, topX);
  }, [rows, statKey, topX]);

  const chartHeight = Math.max(400, chartData.length * 60);

  /* ---------- TOOLTIP ---------- */

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
      <div
        style={{
          background: "#001F2F",
          border: "1px solid #00FFFF",
          padding: "10px",
          borderRadius: "8px",
          color: "#00FFFF",
        }}
      >
        <strong>{d.manager}</strong>
        <div style={{ marginTop: "6px" }}>
          {statKey}: {Number(d[statKey]).toFixed(2)}
        </div>
      </div>
    );
  };

  /* ---------- Y AXIS TICK ---------- */

  const YAxisTick = ({ y, payload }) => {
    const row = chartData[payload.index];
    if (!row) return null;

    return (
      <g transform={`translate(0,${y - 16})`}>
        {row.avatar && (
          <image
            href={row.avatar}
            x={0}
            y={0}
            width={32}
            height={32}
            style={{ borderRadius: "50%" }}
          />
        )}
        <text
          x={42}
          y={22}
          fill="#00FFFF"
          fontSize={14}
          fontWeight="bold"
        >
          {row.manager}
        </text>
      </g>
    );
  };

  /* ---------- RENDER ---------- */

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "80px", textAlign: "center", color: "#00FFFF" }}>
          Loading analytics…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* TITLE */}
      <h2
        style={{
          color: "#00FFFF",
          fontSize: "1.8rem",
          fontWeight: "bold",
          marginBottom: "24px",
        }}
      >
        Season Records
      </h2>

      {/* CONTROLS */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <select
          value={statKey}
          onChange={(e) => setStatKey(e.target.value)}
          style={SELECT_STYLE}
        >
          {STAT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={topX}
          onChange={(e) => setTopX(Number(e.target.value))}
          style={SELECT_STYLE}
        >
          {TOP_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </select>
      </div>

      {/* CHART */}
      <div
        style={{
          width: "100%",
          height: chartHeight,
          background: "linear-gradient(135deg, #0E3C5F, #091421)",
          borderRadius: "16px",
          padding: "16px",
          boxShadow: "0 6px 24px rgba(0,255,255,0.25)",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 120, right: 32, top: 20, bottom: 20 }}
          >
            <XAxis
              type="number"
              stroke="#00FFFF"
              tick={{ fill: "#00FFFF" }}
            />
            <YAxis
              type="category"
              dataKey="manager"
              tick={<YAxisTick />}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={statKey} radius={[8, 8, 8, 8]}>
  {chartData.map((row, i) => (
    <Cell key={i} fill="rgba(0,255,255,0.6)" />
  ))}

  {/* Stat value inside the bar */}
  <LabelList
    dataKey={statKey}
    position="insideRight"
    formatter={(value) => Number(value).toFixed(2)}
    style={{ fill: "#001F2F", fontWeight: "bold" }}
  />

  {/* NHL logos at end of bars */}
  <LabelList
    dataKey="logo"
    position="right"
    content={({ x, y, width, height, value }) => (
      <image
        href={value}
        x={x + width + 8}
        y={y + height / 2 - 16}
        width={32}
        height={32}
      />
    )}
  />
</Bar>

          </BarChart>
        </ResponsiveContainer>
      </div>
    </Layout>
  );
}
