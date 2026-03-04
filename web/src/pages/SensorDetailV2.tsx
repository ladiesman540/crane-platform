import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";
import HealthBadge from "../components/HealthBadge";

interface Reading {
  id: number;
  timestamp: string;
  temperature: number | null;
  x_velocity_mm_sec: number | null;
  y_velocity_mm_sec: number | null;
  z_velocity_mm_sec: number | null;
  battery_percent: number | null;
  mA1: number | null;
  mA2: number | null;
  roll: number | null;
  pitch: number | null;
  channel_1: number | null;
  channel_2: number | null;
  channel_3: number | null;
}

const SENSOR_TYPE_LABELS: Record<number, string> = {
  114: "Vibration Sensor",
  39: "Temperature Sensor",
  47: "Tilt Sensor",
  52: "4-20mA Analog Sensor",
  28: "3-Channel Current Monitor",
};

type TimeRange = "1h" | "6h" | "24h" | "7d" | "all";

const RANGES: { key: TimeRange; label: string; hours: number | null }[] = [
  { key: "1h", label: "1H", hours: 1 },
  { key: "6h", label: "6H", hours: 6 },
  { key: "24h", label: "24H", hours: 24 },
  { key: "7d", label: "7D", hours: 168 },
  { key: "all", label: "ALL", hours: null },
];

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SensorDetailV2() {
  const { craneId, sensorId } = useParams<{ craneId: string; sensorId: string }>();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [sensor, setSensor] = useState<any>(null);
  const [crane, setCrane] = useState<any>(null);
  const [range, setRange] = useState<TimeRange>("24h");

  useEffect(() => {
    if (!sensorId) return;
    api(`/api/v1/sensors/${sensorId}`).then((r) => r.json()).then(setSensor);
  }, [sensorId]);

  useEffect(() => {
    if (!craneId) return;
    api(`/api/v1/cranes/${craneId}/detail`).then((r) => r.json()).then(setCrane);
  }, [craneId]);

  useEffect(() => {
    if (!sensorId) return;
    const selected = RANGES.find((r) => r.key === range)!;
    const params = new URLSearchParams({ sensor_id: sensorId, limit: "10000" });
    if (selected.hours !== null) {
      params.set("start", new Date(Date.now() - selected.hours * 3600000).toISOString());
    }
    api(`/api/v1/readings?${params}`)
      .then((r) => r.json())
      .then((data: Reading[]) => setReadings(data.reverse()));
  }, [sensorId, range]);

  useWebSocket((data) => {
    if (data.event === "sensor.reading" && data.sensor_id === sensorId) {
      setReadings((prev) => [...prev, data]);
    }
  });

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;
  const sensorType = sensor?.sensor_type || 114;

  // Compute health from latest reading
  let health = "offline";
  if (latest) {
    const ms = Date.now() - new Date(latest.timestamp).getTime();
    if (ms < 3600000) {
      if (sensorType === 39) {
        health = (latest.temperature ?? 0) >= 80 ? "needs_attention" : (latest.temperature ?? 0) >= 60 ? "fair" : "good";
      } else if (sensorType === 47) {
        const worst = Math.max(Math.abs(latest.roll ?? 0), Math.abs(latest.pitch ?? 0));
        health = worst >= 5 ? "needs_attention" : worst >= 2 ? "fair" : "good";
      } else if (sensorType === 52) {
        health = (latest.mA1 !== null && latest.mA1 >= 4 && latest.mA1 <= 20) ? "good" : "needs_attention";
      } else if (sensorType === 28) {
        health = [latest.channel_1, latest.channel_2, latest.channel_3].some((c) => c === null || c === 0) ? "needs_attention" : "good";
      } else {
        const maxVel = Math.max(latest.x_velocity_mm_sec ?? 0, latest.y_velocity_mm_sec ?? 0, latest.z_velocity_mm_sec ?? 0);
        health = maxVel >= 1.12 ? "needs_attention" : maxVel >= 0.71 ? "fair" : "good";
      }
    }
  }

  // Build metric cards and chart config based on sensor type
  let metrics: { label: string; value: string; unit: string }[] = [];
  let chartConfig: { dataKey: string; color: string; label: string }[] = [];
  let refLines: { y: number; color: string }[] = [];

  if (sensorType === 39) {
    metrics = [
      { label: "Temperature", value: latest?.temperature?.toFixed(1) || "--", unit: "\u00B0C" },
      { label: "Battery", value: latest?.battery_percent?.toString() || "--", unit: "%" },
    ];
    chartConfig = [{ dataKey: "temperature", color: "#f59e0b", label: "Temperature" }];
  } else if (sensorType === 47) {
    metrics = [
      { label: "Roll", value: latest?.roll?.toFixed(2) || "--", unit: "\u00B0" },
      { label: "Pitch", value: latest?.pitch?.toFixed(2) || "--", unit: "\u00B0" },
    ];
    chartConfig = [
      { dataKey: "roll", color: "#ef4444", label: "Roll" },
      { dataKey: "pitch", color: "#3b82f6", label: "Pitch" },
    ];
  } else if (sensorType === 52) {
    metrics = [
      { label: "Channel 1", value: latest?.mA1?.toFixed(2) || "--", unit: "mA" },
      { label: "Channel 2", value: latest?.mA2?.toFixed(2) || "--", unit: "mA" },
    ];
    chartConfig = [
      { dataKey: "mA1", color: "var(--accent)", label: "CH1" },
      { dataKey: "mA2", color: "#8b5cf6", label: "CH2" },
    ];
  } else if (sensorType === 28) {
    metrics = [
      { label: "CH1", value: latest?.channel_1?.toFixed(1) || "--", unit: "mA" },
      { label: "CH2", value: latest?.channel_2?.toFixed(1) || "--", unit: "mA" },
      { label: "CH3", value: latest?.channel_3?.toFixed(1) || "--", unit: "mA" },
    ];
    chartConfig = [
      { dataKey: "channel_1", color: "#ef4444", label: "CH1" },
      { dataKey: "channel_2", color: "#3b82f6", label: "CH2" },
      { dataKey: "channel_3", color: "#10b981", label: "CH3" },
    ];
  } else {
    // Vibration
    metrics = [
      { label: "X Velocity", value: latest?.x_velocity_mm_sec?.toFixed(3) || "--", unit: "mm/s" },
      { label: "Y Velocity", value: latest?.y_velocity_mm_sec?.toFixed(3) || "--", unit: "mm/s" },
      { label: "Z Velocity", value: latest?.z_velocity_mm_sec?.toFixed(3) || "--", unit: "mm/s" },
      { label: "Temperature", value: latest?.temperature?.toFixed(1) || "--", unit: "\u00B0C" },
    ];
    chartConfig = [
      { dataKey: "x_velocity_mm_sec", color: "#ef4444", label: "X" },
      { dataKey: "y_velocity_mm_sec", color: "#3b82f6", label: "Y" },
      { dataKey: "z_velocity_mm_sec", color: "#10b981", label: "Z" },
    ];
    refLines = [
      { y: 0.71, color: "var(--zone-b)" },
      { y: 1.12, color: "var(--zone-c)" },
      { y: 1.80, color: "var(--zone-d)" },
    ];
  }

  const chartData = readings.map((r) => ({
    ...r,
    time: formatTime(r.timestamp),
  }));

  const interval = Math.max(0, Math.floor(chartData.length / 8) - 1);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <Link to="/" style={{ color: "var(--accent)", textDecoration: "none" }}>Fleet</Link>
        <span style={{ color: "var(--text-tertiary)" }}>/</span>
        {crane && (
          <>
            <span>{crane.facility_name}</span>
            <span style={{ color: "var(--text-tertiary)" }}>/</span>
            <Link to={`/cranes/${craneId}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{crane.name}</Link>
            <span style={{ color: "var(--text-tertiary)" }}>/</span>
          </>
        )}
        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {sensor?.label || SENSOR_TYPE_LABELS[sensorType] || "Sensor"}
        </span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {sensor?.label || SENSOR_TYPE_LABELS[sensorType] || "Sensor"}
          </h1>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {SENSOR_TYPE_LABELS[sensorType]}
            {latest && <span> \u00B7 Last reading {timeAgo(latest.timestamp)}</span>}
          </span>
        </div>
        <HealthBadge status={health} />
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)`, gap: 14, marginBottom: 28 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "18px 20px",
          }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{m.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {m.value}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Time range selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Trend</h3>
        <div style={{ display: "flex", gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: range === r.key ? "var(--accent)" : "var(--bg-hover)",
                color: range === r.key ? "white" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px 20px 12px",
        marginBottom: 28,
      }}>
        {chartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-tertiary)", fontSize: 14 }}>
            No data for this time range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--text-tertiary)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                interval={interval}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--text-tertiary)" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              />
              {refLines.map((rl) => (
                <ReferenceLine key={rl.y} y={rl.y} stroke={rl.color} strokeDasharray="4 4" strokeOpacity={0.6} />
              ))}
              {chartConfig.map((c) => (
                <Line
                  key={c.dataKey}
                  type="monotone"
                  dataKey={c.dataKey}
                  stroke={c.color}
                  strokeWidth={1.5}
                  dot={false}
                  name={c.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
