import { useNavigate } from "react-router-dom";
import HealthBadge from "./HealthBadge";

interface SensorSummary {
  id: string;
  label: string | null;
  sensor_type: number;
  health: string;
  last_reading_at: string | null;
}

const SENSOR_TYPE_LABELS: Record<number, string> = {
  114: "Vibration",
  39: "Temperature",
  47: "Tilt",
  52: "4-20mA Analog",
  28: "3-Ch Current",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CraneOverviewTab({ craneId, sensors, health, overrideNote }: {
  craneId: string;
  sensors: SensorSummary[];
  health: string;
  overrideNote: string | null;
}) {
  const navigate = useNavigate();
  const counts = { good: 0, fair: 0, needs_attention: 0, offline: 0 };
  sensors.forEach((s) => { counts[s.health as keyof typeof counts]++; });

  return (
    <div>
      {/* Health summary */}
      <div style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        padding: 24,
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Overall Health</h3>
          <HealthBadge status={health} />
        </div>
        {overrideNote && (
          <p style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            fontStyle: "italic",
            marginBottom: 12,
            padding: "8px 12px",
            background: "var(--bg-hover)",
            borderRadius: "var(--radius-sm)",
          }}>
            Manual override: {overrideNote}
          </p>
        )}
        <div style={{ display: "flex", gap: 20, fontSize: 14 }}>
          {counts.good > 0 && (
            <span style={{ color: "var(--health-good)" }}>
              <strong>{counts.good}</strong> Good
            </span>
          )}
          {counts.fair > 0 && (
            <span style={{ color: "var(--health-fair)" }}>
              <strong>{counts.fair}</strong> Fair
            </span>
          )}
          {counts.needs_attention > 0 && (
            <span style={{ color: "var(--health-attention)" }}>
              <strong>{counts.needs_attention}</strong> Needs Attention
            </span>
          )}
          {counts.offline > 0 && (
            <span style={{ color: "var(--health-offline)" }}>
              <strong>{counts.offline}</strong> Offline
            </span>
          )}
        </div>
      </div>

      {/* Sensor key metrics */}
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Sensors</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {sensors.map((s) => (
          <div
            key={s.id}
            onClick={() => navigate(`/cranes/${craneId}/sensors/${s.id}`)}
            style={{
              background: "var(--bg-surface)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              padding: "16px 18px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {s.label || SENSOR_TYPE_LABELS[s.sensor_type] || `Sensor`}
              </span>
              <HealthBadge status={s.health} size="sm" />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {SENSOR_TYPE_LABELS[s.sensor_type] || `Type ${s.sensor_type}`}
              {s.last_reading_at && (
                <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)" }}>
                  {timeAgo(s.last_reading_at)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
