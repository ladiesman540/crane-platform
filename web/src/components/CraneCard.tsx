import { useNavigate } from "react-router-dom";
import HealthBadge from "./HealthBadge";

interface CraneFleetItem {
  id: string;
  name: string;
  crane_type: string | null;
  capacity_tons: number | null;
  health: string;
  sensor_count: number;
  last_reading_at: string | null;
  next_pm_due: string | null;
}

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

export default function CraneCard({ crane }: { crane: CraneFleetItem }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/cranes/${crane.id}`)}
      style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
        cursor: "pointer",
        border: "1px solid var(--border)",
        transition: "all 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            {crane.name}
          </h3>
          {crane.crane_type && (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {crane.crane_type}{crane.capacity_tons ? ` \u00B7 ${crane.capacity_tons}T` : ""}
            </span>
          )}
        </div>
        <HealthBadge status={crane.health} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--text-secondary)" }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--text-primary)" }}>
            {crane.sensor_count}
          </span>{" "}
          sensor{crane.sensor_count !== 1 ? "s" : ""}
        </div>
        {crane.last_reading_at && (
          <div>
            Last reading{" "}
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--text-primary)" }}>
              {timeAgo(crane.last_reading_at)}
            </span>
          </div>
        )}
        {crane.next_pm_due && (
          <div>
            Next PM{" "}
            <span style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: new Date(crane.next_pm_due) < new Date() ? "var(--health-attention)" : "var(--text-primary)",
            }}>
              {new Date(crane.next_pm_due).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
