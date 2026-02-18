import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useWebSocket } from "../hooks/useWebSocket";

interface SensorSummary {
  id: string;
  label: string | null;
  mac_address: string;
  latest?: {
    temperature: number | null;
    x_velocity_mm_sec: number | null;
    y_velocity_mm_sec: number | null;
    z_velocity_mm_sec: number | null;
    battery_percent: number | null;
    timestamp: string;
  };
}

function getZone(vel: number | null): { name: string; color: string; glow: string; level: string } {
  if (vel === null) return { name: "OFFLINE", color: "var(--text-tertiary)", glow: "transparent", level: "--" };
  if (vel < 0.71) return { name: "ZONE A", color: "var(--zone-a)", glow: "var(--zone-a-glow)", level: "Excellent" };
  if (vel < 1.12) return { name: "ZONE B", color: "var(--zone-b)", glow: "var(--zone-b-glow)", level: "Acceptable" };
  if (vel < 1.8) return { name: "ZONE C", color: "var(--zone-c)", glow: "var(--zone-c-glow)", level: "Warning" };
  return { name: "ZONE D", color: "var(--zone-d)", glow: "var(--zone-d-glow)", level: "Danger" };
}

export default function Dashboard() {
  const [sensors, setSensors] = useState<SensorSummary[]>([]);

  useEffect(() => {
    api("/api/v1/sensors")
      .then((r) => r.json())
      .then(async (sensorList: any[]) => {
        const summaries = await Promise.all(
          sensorList.map(async (s) => {
            try {
              const res = await api(`/api/v1/readings/${s.id}/latest`);
              const latest = res.ok ? await res.json() : undefined;
              return { ...s, latest };
            } catch {
              return { ...s, latest: undefined };
            }
          })
        );
        setSensors(summaries);
      });
  }, []);

  useWebSocket((data) => {
    if (data.event === "sensor.reading") {
      setSensors((prev) =>
        prev.map((s) =>
          s.id === data.sensor_id
            ? {
                ...s,
                latest: {
                  temperature: data.temperature,
                  x_velocity_mm_sec: data.x_velocity_mm_sec,
                  y_velocity_mm_sec: data.y_velocity_mm_sec,
                  z_velocity_mm_sec: data.z_velocity_mm_sec,
                  battery_percent: data.battery_percent,
                  timestamp: new Date().toISOString(),
                },
              }
            : s
        )
      );
    }
  });

  const zoneCounts = sensors.reduce(
    (acc, s) => {
      const maxVel = s.latest
        ? Math.max(s.latest.x_velocity_mm_sec ?? 0, s.latest.y_velocity_mm_sec ?? 0, s.latest.z_velocity_mm_sec ?? 0)
        : null;
      const zone = getZone(maxVel);
      if (zone.name === "ZONE A") acc.a++;
      else if (zone.name === "ZONE B") acc.b++;
      else if (zone.name === "ZONE C") acc.c++;
      else if (zone.name === "ZONE D") acc.d++;
      else acc.offline++;
      return acc;
    },
    { a: 0, b: 0, c: 0, d: 0, offline: 0 }
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.03em",
          marginBottom: 6,
        }}>System Overview</h1>
        <p style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-display)",
        }}>
          Real-time monitoring across {sensors.length} sensors
        </p>
      </div>

      {/* Zone summary strip */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 28,
      }}>
        {[
          { label: "Excellent", count: zoneCounts.a, color: "var(--zone-a)", glow: "var(--zone-a-glow)" },
          { label: "Acceptable", count: zoneCounts.b, color: "var(--zone-b)", glow: "var(--zone-b-glow)" },
          { label: "Warning", count: zoneCounts.c, color: "var(--zone-c)", glow: "var(--zone-c-glow)" },
          { label: "Danger", count: zoneCounts.d, color: "var(--zone-d)", glow: "var(--zone-d-glow)" },
          { label: "Offline", count: zoneCounts.offline, color: "var(--text-tertiary)", glow: "transparent" },
        ].map((z, i) => (
          <div
            key={i}
            className={`animate-in animate-in-delay-${i + 1}`}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: "var(--radius)",
              background: z.glow,
              border: `1px solid ${z.count > 0 ? z.color : "var(--border)"}`,
              borderColor: z.count > 0 ? undefined : "var(--border)",
              opacity: z.count > 0 ? 1 : 0.5,
              transition: "all 0.3s",
            }}
          >
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              fontWeight: 500,
              color: z.count > 0 ? z.color : "var(--text-tertiary)",
              lineHeight: 1,
              marginBottom: 4,
            }}>{z.count}</div>
            <div style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>{z.label}</div>
          </div>
        ))}
      </div>

      {/* Sensor cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: 16,
      }}>
        {sensors.map((sensor, i) => (
          <SensorCard key={sensor.id} sensor={sensor} delay={i} />
        ))}
        {sensors.length === 0 && (
          <div style={{
            gridColumn: "1 / -1",
            padding: 60,
            textAlign: "center",
            color: "var(--text-tertiary)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>No sensors detected</div>
            <div style={{ fontSize: 14 }}>Register sensors via the API to begin monitoring</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SensorCard({ sensor, delay }: { sensor: SensorSummary; delay: number }) {
  const latest = sensor.latest;
  const maxVel = latest
    ? Math.max(latest.x_velocity_mm_sec ?? 0, latest.y_velocity_mm_sec ?? 0, latest.z_velocity_mm_sec ?? 0)
    : null;
  const zone = getZone(maxVel);

  const timeSince = latest
    ? Math.round((Date.now() - new Date(latest.timestamp).getTime()) / 60000)
    : null;
  let statusColor = "var(--text-tertiary)";
  let statusLabel = "Offline";
  if (timeSince !== null) {
    if (timeSince < 5) { statusColor = "var(--zone-a)"; statusLabel = "Live"; }
    else if (timeSince < 30) { statusColor = "var(--zone-c)"; statusLabel = `${timeSince}m ago`; }
    else { statusColor = "var(--zone-d)"; statusLabel = "Offline"; }
  }

  return (
    <Link
      to={`/sensors/${sensor.id}`}
      className={`animate-in animate-in-delay-${Math.min(delay + 1, 5)}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 0,
        overflow: "hidden",
        transition: "all 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.08)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Zone bar at top */}
      <div style={{
        height: 3,
        background: zone.color,
        opacity: 0.8,
      }} />

      <div style={{ padding: "16px 20px 20px" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}>
          <div>
            <div style={{
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "-0.01em",
              marginBottom: 3,
            }}>{sensor.label || sensor.mac_address}</div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-tertiary)",
            }}>{sensor.mac_address}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: statusColor,
                animation: statusLabel === "Live" ? "pulse-live 2s ease-in-out infinite" : "none",
              }} />
              <span style={{
                fontSize: 11,
                color: statusColor,
                fontFamily: "var(--font-mono)",
              }}>{statusLabel}</span>
            </div>
            {/* Zone badge */}
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              color: zone.color,
              background: zone.glow,
              padding: "3px 8px",
              borderRadius: 4,
              letterSpacing: "0.05em",
            }}>{zone.name}</div>
          </div>
        </div>

        {/* Data grid */}
        {latest ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px 16px",
          }}>
            <DataCell label="X VEL" value={latest.x_velocity_mm_sec} unit="mm/s" color={getZone(latest.x_velocity_mm_sec).color} />
            <DataCell label="Y VEL" value={latest.y_velocity_mm_sec} unit="mm/s" color={getZone(latest.y_velocity_mm_sec).color} />
            <DataCell label="Z VEL" value={latest.z_velocity_mm_sec} unit="mm/s" color={getZone(latest.z_velocity_mm_sec).color} />
            <DataCell label="TEMP" value={latest.temperature} unit="°C" />
            <DataCell label="BATTERY" value={latest.battery_percent} unit="%" warn={latest.battery_percent !== null && latest.battery_percent < 20} />
            <DataCell label="MAX VEL" value={maxVel} unit="mm/s" color={zone.color} />
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "20px 0",
            color: "var(--text-tertiary)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
          }}>AWAITING FIRST READING</div>
        )}
      </div>
    </Link>
  );
}

function DataCell({ label, value, unit, color, warn }: {
  label: string;
  value: number | null | undefined;
  unit: string;
  color?: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div style={{
        fontSize: 10,
        color: "var(--text-tertiary)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.06em",
        marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 16,
        fontWeight: 500,
        color: warn ? "var(--zone-c)" : (color || "var(--text-primary)"),
        lineHeight: 1,
      }}>
        {value !== null && value !== undefined ? value.toFixed(value >= 100 ? 0 : 2) : "--"}
        <span style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          marginLeft: 3,
        }}>{unit}</span>
      </div>
    </div>
  );
}
