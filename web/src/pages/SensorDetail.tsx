import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";

interface Reading {
  id: number;
  timestamp: string;
  temperature: number | null;
  x_velocity_mm_sec: number | null;
  y_velocity_mm_sec: number | null;
  z_velocity_mm_sec: number | null;
  battery_percent: number | null;
  x_rms_ACC_G: number | null;
  y_rms_ACC_G: number | null;
  z_rms_ACC_G: number | null;
  mA1: number | null;
  mA2: number | null;
  roll: number | null;
  pitch: number | null;
  channel_1: number | null;
  channel_2: number | null;
  channel_3: number | null;
}

function getZone(vel: number | null) {
  if (vel === null) return { name: "N/A", color: "var(--text-tertiary)", level: "--" };
  if (vel < 0.71) return { name: "A", color: "var(--zone-a)", level: "Excellent" };
  if (vel < 1.12) return { name: "B", color: "var(--zone-b)", level: "Acceptable" };
  if (vel < 1.8) return { name: "C", color: "var(--zone-c)", level: "Warning" };
  return { name: "D", color: "var(--zone-d)", level: "Danger" };
}

type TimeRange = "1h" | "6h" | "24h" | "7d" | "all";

const RANGES: { key: TimeRange; label: string; hours: number | null }[] = [
  { key: "1h", label: "1H", hours: 1 },
  { key: "6h", label: "6H", hours: 6 },
  { key: "24h", label: "24H", hours: 24 },
  { key: "7d", label: "7D", hours: 168 },
  { key: "all", label: "ALL", hours: null },
];

function formatTimeAgo(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SensorDetail() {
  const { sensorId } = useParams<{ sensorId: string }>();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [sensor, setSensor] = useState<any>(null);
  const [range, setRange] = useState<TimeRange>("24h");

  useEffect(() => {
    if (!sensorId) return;
    api(`/api/v1/sensors/${sensorId}`).then((r) => r.json()).then(setSensor);
  }, [sensorId]);

  useEffect(() => {
    if (!sensorId) return;
    const selected = RANGES.find((r) => r.key === range)!;
    const params = new URLSearchParams({ sensor_id: sensorId, limit: "10000" });
    if (selected.hours !== null) {
      const start = new Date(Date.now() - selected.hours * 3600000).toISOString();
      params.set("start", start);
    }
    api(`/api/v1/readings?${params}`)
      .then((r) => r.json())
      .then((data: Reading[]) => setReadings(data.reverse()));
  }, [sensorId, range]);

  useWebSocket((data) => {
    if (data.event === "sensor.reading" && data.sensor_id === sensorId) {
      setReadings((prev) => [
        ...prev.slice(-199),
        {
          id: data.reading_id,
          timestamp: new Date().toISOString(),
          temperature: data.temperature,
          x_velocity_mm_sec: data.x_velocity_mm_sec,
          y_velocity_mm_sec: data.y_velocity_mm_sec,
          z_velocity_mm_sec: data.z_velocity_mm_sec,
          battery_percent: data.battery_percent,
          x_rms_ACC_G: null, y_rms_ACC_G: null, z_rms_ACC_G: null,
          mA1: data.mA1, mA2: data.mA2, roll: data.roll, pitch: data.pitch, channel_1: data.channel_1, channel_2: data.channel_2, channel_3: data.channel_3,
        },
      ]);
    }
  });

  const showDate = range !== "1h";
  const chartData = readings.map((r) => {
    const d = new Date(r.timestamp);
    const time = showDate
      ? d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return { time, x: r.x_velocity_mm_sec, y: r.y_velocity_mm_sec, z: r.z_velocity_mm_sec, temp: r.temperature, mA1: r.mA1, mA2: r.mA2, roll: r.roll, pitch: r.pitch, ch1: r.channel_1, ch2: r.channel_2, ch3: r.channel_3 };
  });

  const latest = readings[readings.length - 1];
  const maxVel = latest
    ? Math.max(latest.x_velocity_mm_sec ?? 0, latest.y_velocity_mm_sec ?? 0, latest.z_velocity_mm_sec ?? 0)
    : null;
  const zone = getZone(maxVel);

  const chartCardStyle: React.CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 20px 14px",
    marginBottom: 14,
  };

  const VelocityTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
      }}>
        <div style={{ color: "var(--text-tertiary)", marginBottom: 6 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 2, background: p.color, borderRadius: 1 }} />
            <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.value?.toFixed(3)} mm/s</span>
          </div>
        ))}
      </div>
    );
  };

  const TempTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.[0]) return null;
    return (
      <div style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
      }}>
        <div style={{ color: "var(--text-tertiary)", marginBottom: 6 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 2, background: "#f59e0b", borderRadius: 1 }} />
          <span style={{ color: "var(--text-secondary)" }}>Temp:</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {payload[0].value?.toFixed(1)}°C
          </span>
        </div>
      </div>
    );
  };

  const axisTickStyle = { fontSize: 10, fill: "#94a3b8", fontFamily: "IBM Plex Mono" };

  return (
    <div className="animate-in">
      {/* Breadcrumb */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
        fontSize: 12,
        fontFamily: "var(--font-mono)",
      }}>
        <Link to="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Overview</Link>
        <span style={{ color: "var(--text-tertiary)", opacity: 0.4 }}>/</span>
        <span style={{ color: "var(--text-secondary)" }}>{sensor?.label || "..."}</span>
      </div>

      {/* Header with zone indicator */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "0.02em",
            marginBottom: 4,
            color: "var(--text-primary)",
          }}>
            {sensor?.label || "Loading..."}
          </h1>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginBottom: latest ? 4 : 0,
          }}>
            {sensor?.mac_address}
          </div>
          {latest && (
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: (() => {
                const mins = Math.round((Date.now() - new Date(latest.timestamp).getTime()) / 60000);
                if (mins < 5) return "var(--zone-a)";
                if (mins < 30) return "var(--zone-c)";
                return "var(--zone-d)";
              })(),
            }}>
              Last reading: {new Date(latest.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })} {new Date(latest.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({formatTimeAgo(latest.timestamp)})
            </div>
          )}
        </div>

        {/* Zone display — only for vibration sensors */}
        {sensor?.sensor_type === 114 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 18px",
            background: "var(--bg-surface)",
            border: `1px solid ${zone.name !== "N/A" ? zone.color + "33" : "var(--border)"}`,
            borderRadius: "var(--radius)",
          }}>
            <div>
              <div style={{
                fontSize: 9,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                marginBottom: 2,
              }}>ISO 10816</div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 600,
                color: zone.color,
                lineHeight: 1,
                textShadow: `0 0 16px ${zone.color}33`,
              }}>ZONE {zone.name}</div>
            </div>
            <div style={{
              width: 1,
              height: 28,
              background: "var(--border-strong)",
            }} />
            <div>
              <div style={{
                fontSize: 9,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                marginBottom: 2,
              }}>STATUS</div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: zone.color,
                fontFamily: "var(--font-display)",
              }}>{zone.level}</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats row — sensor-type-specific */}
      {latest && (() => {
        const sType = sensor?.sensor_type;
        const stats: { label: string; value: number | null | undefined; unit: string; zone?: ReturnType<typeof getZone> }[] =
          sType === 28 ? [
            { label: "CHANNEL 1", value: latest.channel_1, unit: "mA" },
            { label: "CHANNEL 2", value: latest.channel_2, unit: "mA" },
            { label: "CHANNEL 3", value: latest.channel_3, unit: "mA" },
            { label: "BATTERY", value: latest.battery_percent, unit: "%" },
          ] : sType === 52 ? [
            { label: "mA CHANNEL 1", value: latest.mA1, unit: "mA" },
            { label: "mA CHANNEL 2", value: latest.mA2, unit: "mA" },
            { label: "BATTERY", value: latest.battery_percent, unit: "%" },
          ] : sType === 47 ? [
            { label: "ROLL", value: latest.roll, unit: "°" },
            { label: "PITCH", value: latest.pitch, unit: "°" },
            { label: "BATTERY", value: latest.battery_percent, unit: "%" },
          ] : sType === 39 ? [
            { label: "TEMPERATURE", value: latest.temperature, unit: "°C" },
            { label: "BATTERY", value: latest.battery_percent, unit: "%" },
          ] : [
            { label: "X VELOCITY", value: latest.x_velocity_mm_sec, unit: "mm/s", zone: getZone(latest.x_velocity_mm_sec) },
            { label: "Y VELOCITY", value: latest.y_velocity_mm_sec, unit: "mm/s", zone: getZone(latest.y_velocity_mm_sec) },
            { label: "Z VELOCITY", value: latest.z_velocity_mm_sec, unit: "mm/s", zone: getZone(latest.z_velocity_mm_sec) },
            { label: "TEMPERATURE", value: latest.temperature, unit: "°C" },
            { label: "BATTERY", value: latest.battery_percent, unit: "%" },
          ];
        return (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
            gap: 10,
            marginBottom: 20,
          }}>
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`animate-in animate-in-delay-${i + 1}`}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                }}
              >
                <div style={{
                  fontSize: 9,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  marginBottom: 8,
                }}>{stat.label}</div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 24,
                  fontWeight: 600,
                  color: stat.zone?.color || "var(--text-primary)",
                  lineHeight: 1,
                  textShadow: stat.zone ? `0 0 16px ${stat.zone.color}22` : "none",
                }}>
                  {stat.value !== null && stat.value !== undefined ? stat.value.toFixed(stat.value >= 100 ? 0 : 2) : "--"}
                  <span style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginLeft: 4,
                    fontWeight: 400,
                  }}>{stat.unit}</span>
                </div>
                {stat.zone && (
                  <div style={{
                    marginTop: 6,
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    color: stat.zone.color,
                    letterSpacing: "0.06em",
                  }}>Zone {stat.zone.name} — {stat.zone.level}</div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Time range selector */}
      <div className="animate-in animate-in-delay-3" style={{ marginBottom: 14 }}>
        <div style={{
          display: "inline-flex",
          gap: 2,
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-sm)",
          padding: 2,
          border: "1px solid var(--border)",
        }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                padding: "4px 10px",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                background: range === r.key ? "var(--accent)" : "transparent",
                color: range === r.key ? "#000" : "var(--text-tertiary)",
                transition: "all 0.15s",
                letterSpacing: "0.04em",
              }}
            >{r.label}</button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", marginLeft: 12 }}>
          {readings.length} readings
        </span>
      </div>

      {/* Sensor-type-specific charts */}
      {sensor?.sensor_type === 28 ? (
        /* 3-Channel Current Monitor Chart */
        <div className="animate-in animate-in-delay-4" style={chartCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Current Monitor Trend</h2>
            <div style={{ display: "flex", gap: 14, fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "#ef4444" }}>━ CH1</span>
              <span style={{ color: "#3b82f6" }}>━ CH2</span>
              <span style={{ color: "#10b981" }}>━ CH3</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="time" tick={axisTickStyle} axisLine={{ stroke: "rgba(0,0,0,0.1)" }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} domain={["dataMin - 10", "dataMax + 10"]} tickFormatter={(v: number) => `${v}`} />
              <Tooltip content={({ active, payload, label }: any) => {
                if (!active || !payload) return null;
                return (
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    <div style={{ color: "var(--text-tertiary)", marginBottom: 6 }}>{label}</div>
                    {payload.map((p: any) => (
                      <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 8, height: 2, background: p.color, borderRadius: 1 }} />
                        <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.value?.toFixed(0)} mA</span>
                      </div>
                    ))}
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="ch1" stroke="#ef4444" strokeWidth={1.5} dot={false} name="CH1" connectNulls />
              <Line type="monotone" dataKey="ch2" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="CH2" connectNulls />
              <Line type="monotone" dataKey="ch3" stroke="#10b981" strokeWidth={1.5} dot={false} name="CH3" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : sensor?.sensor_type === 52 ? (
        /* 4-20mA Current Chart */
        <div className="animate-in animate-in-delay-4" style={chartCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Current Trend (mA)</h2>
            <div style={{ display: "flex", gap: 14, fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "#06b6d4" }}>━ CH1</span>
              <span style={{ color: "#8b5cf6" }}>━ CH2</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="time" tick={axisTickStyle} axisLine={{ stroke: "rgba(0,0,0,0.1)" }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} domain={["dataMin - 0.5", "dataMax + 0.5"]} tickFormatter={(v: number) => `${v} mA`} />
              <Tooltip content={({ active, payload, label }: any) => {
                if (!active || !payload) return null;
                return (
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    <div style={{ color: "var(--text-tertiary)", marginBottom: 6 }}>{label}</div>
                    {payload.map((p: any) => (
                      <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 8, height: 2, background: p.color, borderRadius: 1 }} />
                        <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.value?.toFixed(2)} mA</span>
                      </div>
                    ))}
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="mA1" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="CH1" connectNulls />
              <Line type="monotone" dataKey="mA2" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="CH2" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : sensor?.sensor_type === 47 ? (
        /* Tilt Chart */
        <div className="animate-in animate-in-delay-4" style={chartCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Tilt Trend</h2>
            <div style={{ display: "flex", gap: 14, fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "#ef4444" }}>━ Roll</span>
              <span style={{ color: "#3b82f6" }}>━ Pitch</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="time" tick={axisTickStyle} axisLine={{ stroke: "rgba(0,0,0,0.1)" }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v: number) => `${v}°`} />
              <Tooltip content={({ active, payload, label }: any) => {
                if (!active || !payload) return null;
                return (
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    <div style={{ color: "var(--text-tertiary)", marginBottom: 6 }}>{label}</div>
                    {payload.map((p: any) => (
                      <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 8, height: 2, background: p.color, borderRadius: 1 }} />
                        <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{p.value?.toFixed(2)}°</span>
                      </div>
                    ))}
                  </div>
                );
              }} />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.1)" strokeDasharray="6 4" />
              <Line type="monotone" dataKey="roll" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Roll" connectNulls />
              <Line type="monotone" dataKey="pitch" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Pitch" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : sensor?.sensor_type === 39 ? (
        /* RTD Temperature Chart */
        <div className="animate-in animate-in-delay-4" style={chartCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Temperature Trend</h2>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#f59e0b" }}>━ Temperature</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="time" tick={axisTickStyle} axisLine={{ stroke: "rgba(0,0,0,0.1)" }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v: number) => `${v}°`} />
              <Tooltip content={<TempTooltip />} />
              <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Temperature" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Vibration charts (default) */
        <>
          <div className="animate-in animate-in-delay-4" style={chartCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Velocity Trend</h2>
              <div style={{ display: "flex", gap: 14, fontSize: 10, fontFamily: "var(--font-mono)" }}>
                <span style={{ color: "#ef4444" }}>━ X</span>
                <span style={{ color: "#3b82f6" }}>━ Y</span>
                <span style={{ color: "#10b981" }}>━ Z</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="time" tick={axisTickStyle} axisLine={{ stroke: "rgba(0,0,0,0.1)" }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} domain={[0, "auto"]} />
                <Tooltip content={<VelocityTooltip />} />
                <ReferenceLine y={0.71} stroke="rgba(16,185,129,0.3)" strokeDasharray="6 4" />
                <ReferenceLine y={1.12} stroke="rgba(6,182,212,0.3)" strokeDasharray="6 4" />
                <ReferenceLine y={1.8} stroke="rgba(245,158,11,0.35)" strokeDasharray="6 4" />
                <Line type="monotone" dataKey="x" stroke="#ef4444" strokeWidth={1.5} dot={false} name="X axis" />
                <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Y axis" />
                <Line type="monotone" dataKey="z" stroke="#10b981" strokeWidth={1.5} dot={false} name="Z axis" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 8 }}>
              {[
                { zone: "A", label: "<0.71", color: "var(--zone-a)" },
                { zone: "B", label: "0.71–1.12", color: "var(--zone-b)" },
                { zone: "C", label: "1.12–1.80", color: "var(--zone-c)" },
                { zone: "D", label: ">1.80", color: "var(--zone-d)" },
              ].map((z) => (
                <div key={z.zone} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: z.color, opacity: 0.7 }} />
                  Zone {z.zone} <span style={{ opacity: 0.5 }}>({z.label})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Temperature chart for vibration sensors */}
          {chartData.some((d) => d.temp !== null && d.temp !== undefined && d.temp !== 0) && (
            <div className="animate-in animate-in-delay-4" style={chartCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Temperature Trend</h2>
                <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#f59e0b" }}>━ Temperature</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="time" tick={axisTickStyle} axisLine={{ stroke: "rgba(0,0,0,0.1)" }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                  <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v: number) => `${v}°`} />
                  <Tooltip content={<TempTooltip />} />
                  <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Temperature" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
