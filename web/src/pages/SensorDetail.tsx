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
}

function getZone(vel: number | null) {
  if (vel === null) return { name: "N/A", color: "var(--text-tertiary)", level: "--" };
  if (vel < 0.71) return { name: "A", color: "var(--zone-a)", level: "Excellent" };
  if (vel < 1.12) return { name: "B", color: "var(--zone-b)", level: "Acceptable" };
  if (vel < 1.8) return { name: "C", color: "var(--zone-c)", level: "Warning" };
  return { name: "D", color: "var(--zone-d)", level: "Danger" };
}

export default function SensorDetail() {
  const { sensorId } = useParams<{ sensorId: string }>();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [sensor, setSensor] = useState<any>(null);

  useEffect(() => {
    if (!sensorId) return;
    api(`/api/v1/sensors/${sensorId}`).then((r) => r.json()).then(setSensor);
    api(`/api/v1/readings?sensor_id=${sensorId}&limit=200`)
      .then((r) => r.json())
      .then((data: Reading[]) => setReadings(data.reverse()));
  }, [sensorId]);

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
        },
      ]);
    }
  });

  const chartData = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    x: r.x_velocity_mm_sec,
    y: r.y_velocity_mm_sec,
    z: r.z_velocity_mm_sec,
    temp: r.temperature,
  }));

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
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
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
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
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

  const axisTickStyle = { fontSize: 10, fill: "#455068", fontFamily: "IBM Plex Mono" };

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
          }}>
            {sensor?.mac_address}
          </div>
        </div>

        {/* Zone display */}
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
      </div>

      {/* Stats row */}
      {latest && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}>
          {[
            { label: "X VELOCITY", value: latest.x_velocity_mm_sec, unit: "mm/s", zone: getZone(latest.x_velocity_mm_sec) },
            { label: "Y VELOCITY", value: latest.y_velocity_mm_sec, unit: "mm/s", zone: getZone(latest.y_velocity_mm_sec) },
            { label: "Z VELOCITY", value: latest.z_velocity_mm_sec, unit: "mm/s", zone: getZone(latest.z_velocity_mm_sec) },
            { label: "TEMPERATURE", value: latest.temperature, unit: "°C", zone: null },
            { label: "BATTERY", value: latest.battery_percent, unit: "%", zone: null },
          ].map((stat, i) => (
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
      )}

      {/* Velocity trend chart */}
      <div className="animate-in animate-in-delay-3" style={chartCardStyle}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "0.01em",
              marginBottom: 2,
              color: "var(--text-primary)",
            }}>Velocity Trend</h2>
            <span style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}>{readings.length} readings</span>
          </div>
          <div style={{
            display: "flex",
            gap: 14,
            fontSize: 10,
            fontFamily: "var(--font-mono)",
          }}>
            <span style={{ color: "#ef4444" }}>━ X</span>
            <span style={{ color: "#3b82f6" }}>━ Y</span>
            <span style={{ color: "#10b981" }}>━ Z</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={axisTickStyle}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
            />
            <YAxis
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip content={<VelocityTooltip />} />
            <ReferenceLine y={0.71} stroke="rgba(16,185,129,0.2)" strokeDasharray="6 4" />
            <ReferenceLine y={1.12} stroke="rgba(6,182,212,0.2)" strokeDasharray="6 4" />
            <ReferenceLine y={1.8} stroke="rgba(245,158,11,0.25)" strokeDasharray="6 4" />
            <Line type="monotone" dataKey="x" stroke="#ef4444" strokeWidth={1.5} dot={false} name="X axis" />
            <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Y axis" />
            <Line type="monotone" dataKey="z" stroke="#10b981" strokeWidth={1.5} dot={false} name="Z axis" />
          </LineChart>
        </ResponsiveContainer>

        {/* Zone legend */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
          marginTop: 8,
        }}>
          {[
            { zone: "A", label: "<0.71", color: "var(--zone-a)" },
            { zone: "B", label: "0.71–1.12", color: "var(--zone-b)" },
            { zone: "C", label: "1.12–1.80", color: "var(--zone-c)" },
            { zone: "D", label: ">1.80", color: "var(--zone-d)" },
          ].map((z) => (
            <div key={z.zone} style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: 2,
                background: z.color,
                opacity: 0.7,
              }} />
              Zone {z.zone}
              <span style={{ opacity: 0.5 }}>({z.label})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Temperature trend chart */}
      {chartData.some((d) => d.temp !== null && d.temp !== undefined && d.temp !== 0) && (
        <div className="animate-in animate-in-delay-4" style={chartCardStyle}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}>
            <div>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "0.01em",
                marginBottom: 2,
                color: "var(--text-primary)",
              }}>Temperature Trend</h2>
              <span style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
              }}>
                {latest?.temperature !== null && latest?.temperature !== undefined
                  ? `Current: ${latest.temperature.toFixed(1)}°C`
                  : "No data"}
              </span>
            </div>
            <div style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "#f59e0b",
            }}>━ Temperature</div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={axisTickStyle}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
              />
              <YAxis
                tick={axisTickStyle}
                axisLine={false}
                tickLine={false}
                domain={["dataMin - 1", "dataMax + 1"]}
                tickFormatter={(v: number) => `${v}°`}
              />
              <Tooltip content={<TempTooltip />} />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                name="Temperature"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
