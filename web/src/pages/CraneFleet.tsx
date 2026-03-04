import { useState, useEffect } from "react";
import { api } from "../api/client";
import CraneCard from "../components/CraneCard";

interface CraneFleetItem {
  id: string;
  name: string;
  crane_type: string | null;
  capacity_tons: number | null;
  facility_id: string;
  facility_name: string;
  health: string;
  health_override: { status: string; note: string | null } | null;
  sensor_count: number;
  last_reading_at: string | null;
  next_pm_due: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function CraneFleet() {
  const [cranes, setCranes] = useState<CraneFleetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/v1/cranes/fleet")
      .then((r) => r.json())
      .then((data) => { setCranes(data.cranes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Group by facility
  const facilities = new Map<string, { name: string; cranes: CraneFleetItem[] }>();
  cranes.forEach((c) => {
    if (!facilities.has(c.facility_id)) {
      facilities.set(c.facility_id, { name: c.facility_name, cranes: [] });
    }
    facilities.get(c.facility_id)!.cranes.push(c);
  });

  // Summary counts
  const counts = { good: 0, fair: 0, needs_attention: 0, offline: 0 };
  cranes.forEach((c) => { counts[c.health as keyof typeof counts]++; });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Loading fleet...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
          {getGreeting()}
        </h1>
      </div>

      {/* Summary */}
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 32 }}>
        {cranes.length} crane{cranes.length !== 1 ? "s" : ""}
        {counts.good > 0 && <span> \u2014 <strong style={{ color: "var(--health-good)" }}>{counts.good} Good</strong></span>}
        {counts.fair > 0 && <span>, <strong style={{ color: "var(--health-fair)" }}>{counts.fair} Fair</strong></span>}
        {counts.needs_attention > 0 && <span>, <strong style={{ color: "var(--health-attention)" }}>{counts.needs_attention} Needs Attention</strong></span>}
        {counts.offline > 0 && <span>, <strong style={{ color: "var(--health-offline)" }}>{counts.offline} Offline</strong></span>}
      </p>

      {/* Crane cards grouped by facility */}
      {Array.from(facilities.entries()).map(([facId, fac]) => (
        <div key={facId} style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 14,
          }}>
            {fac.name}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
            {fac.cranes.map((crane) => (
              <CraneCard key={crane.id} crane={crane} />
            ))}
          </div>
        </div>
      ))}

      {cranes.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-tertiary)" }}>
          <p style={{ fontSize: 16 }}>No cranes found. Set up your fleet in the admin panel.</p>
        </div>
      )}
    </div>
  );
}
