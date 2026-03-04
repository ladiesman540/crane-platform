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

export default function SensorListTab({ craneId, sensors }: {
  craneId: string;
  sensors: SensorSummary[];
}) {
  const navigate = useNavigate();

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        {sensors.length} Sensor{sensors.length !== 1 ? "s" : ""}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sensors.map((s) => (
          <div
            key={s.id}
            onClick={() => navigate(`/cranes/${craneId}/sensors/${s.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
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
            {/* Icon */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--bg-hover)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                {s.label || `Sensor ${s.sensor_type}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {SENSOR_TYPE_LABELS[s.sensor_type] || `Type ${s.sensor_type}`}
                {s.last_reading_at && (
                  <span style={{ marginLeft: 12, fontFamily: "var(--font-mono)" }}>
                    Last reading {timeAgo(s.last_reading_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Health */}
            <HealthBadge status={s.health} size="sm" />

            {/* Arrow */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
