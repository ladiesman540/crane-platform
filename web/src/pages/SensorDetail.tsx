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
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    x: r.x_velocity_mm_sec,
    y: r.y_velocity_mm_sec,
    z: r.z_velocity_mm_sec,
  }));

  const latest = readings[readings.length - 1];
  const maxVel = latest
    ? Math.max(latest.x_velocity_mm_sec ?? 0, latest.y_velocity_mm_sec ?? 0, latest.z_velocity_mm_sec ?? 0)
    : null;
  const zone = getZone(maxVel);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
      }}>
        <div style={{ color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
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

  return (
    <div className="animate-in">
      {/* Breadcrumb */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 24,
        fontSize: 13,
        fontFamily: "var(--font-mono)",
      }}>
        <Link to="/" style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>Overview</Link>
        <span style={{ color: "var(--text-tertiary)" }}>/</span>
        <span style={{ color: "var(--text-secondary)" }}>{sensor?.label || "..."}</span>
      </div>

      {/* Header with zone indicator */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}>
            {sensor?.label || "Loading..."}
          </h1>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-tertiary)",
          }}>
            {sensor?.mac_address}
          </div>
        </div>

        {/* Zone display */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          background: "var(--bg-surface)",
          border: `1px solid ${zone.name !== "N/A" ? "var(--border-strong)" : "var(--border)"}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          borderRadius: "var(--radius)",
        }}>
          <div>
            <div style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              marginBottom: 2,
            }}>ISO 10816</div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 20,
              fontWeight: 500,
              color: zone.color,
              lineHeight: 1,
            }}>ZONE {zone.name}</div>
          </div>
          <div style={{
            width: 1,
            height: 32,
            background: "var(--border)",
          }} />
          <div>
            <div style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              marginBottom: 2,
            }}>STATUS</div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: zone.color,
            }}>{zone.level}</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {latest && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 24,
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
                padding: "16px 18px",
              }}
            >
              <div style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}>{stat.label}</div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 26,
                fontWeight: 500,
                color: stat.zone?.color || "var(--text-primary)",
                lineHeight: 1,
              }}>
                {stat.value !== null && stat.value !== undefined ? stat.value.toFixed(stat.value >= 100 ? 0 : 2) : "--"}
                <span style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  marginLeft: 4,
                  fontWeight: 400,
                }}>{stat.unit}</span>
              </div>
              {stat.zone && (
                <div style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: stat.zone.color,
                  letterSpacing: "0.04em",
                }}>Zone {stat.zone.name} — {stat.zone.level}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Velocity trend chart */}
      <div
        className="animate-in animate-in-delay-3"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "24px 24px 16px",
          marginBottom: 16,
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}>
          <div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 16,
              letterSpacing: "-0.01em",
              marginBottom: 2,
            }}>Velocity Trend</h2>
            <span style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}>{readings.length} readings</span>
          </div>
          <div style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}>
            <span style={{ color: "#e04343" }}>━ X axis</span>
            <span style={{ color: "#3b82f6" }}>━ Y axis</span>
            <span style={{ color: "#0d9668" }}>━ Z axis</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#9099ad", fontFamily: "DM Mono" }}
              axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9099ad", fontFamily: "DM Mono" }}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* ISO Zone threshold lines */}
            <ReferenceLine y={0.71} stroke="rgba(13,150,104,0.25)" strokeDasharray="6 4" label="" />
            <ReferenceLine y={1.12} stroke="rgba(11,114,133,0.25)" strokeDasharray="6 4" label="" />
            <ReferenceLine y={1.8} stroke="rgba(217,119,6,0.3)" strokeDasharray="6 4" label="" />
            <Line type="monotone" dataKey="x" stroke="#e04343" strokeWidth={2} dot={false} name="X axis" />
            <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={2} dot={false} name="Y axis" />
            <Line type="monotone" dataKey="z" stroke="#0d9668" strokeWidth={2} dot={false} name="Z axis" />
          </LineChart>
        </ResponsiveContainer>

        {/* Zone legend under chart */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          paddingTop: 12,
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
              gap: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: z.color,
                opacity: 0.6,
              }} />
              Zone {z.zone}
              <span style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>({z.label} mm/s)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
