import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import HealthBadge from "../components/HealthBadge";
import TabBar from "../components/TabBar";
import CraneOverviewTab from "../components/CraneOverviewTab";
import SensorListTab from "../components/SensorListTab";
import PMScheduleTab from "../components/PMScheduleTab";
import LogBookTab from "../components/LogBookTab";
import ServiceCallTab from "../components/ServiceCallTab";
import HealthOverrideModal from "../components/HealthOverrideModal";

interface SensorSummary {
  id: string;
  label: string | null;
  sensor_type: number;
  health: string;
  last_reading_at: string | null;
}

interface PMSchedule {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_to: string | null;
  status: string;
  completed_at: string | null;
  overdue: boolean;
}

interface LogEntry {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface ServiceCall {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface CraneDetail {
  id: string;
  name: string;
  crane_type: string | null;
  capacity_tons: number | null;
  facility_id: string;
  facility_name: string;
  health: string;
  health_override: { status: string; note: string | null; updated_at: string } | null;
  sensors: SensorSummary[];
  pm_schedules: PMSchedule[];
  log_entries: LogEntry[];
  service_calls: ServiceCall[];
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "sensors", label: "Sensors" },
  { key: "pm", label: "PM Schedule" },
  { key: "logbooks", label: "Log Books" },
  { key: "service", label: "Service Calls" },
];

export default function CraneDetailPage() {
  const { craneId } = useParams<{ craneId: string }>();
  const [crane, setCrane] = useState<CraneDetail | null>(null);
  const [tab, setTab] = useState("overview");
  const [showOverride, setShowOverride] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCrane = useCallback(() => {
    if (!craneId) return;
    api(`/api/v1/cranes/${craneId}/detail`)
      .then((r) => r.json())
      .then((data) => { if (data.id) setCrane(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [craneId]);

  useEffect(() => { fetchCrane(); }, [fetchCrane]);

  if (loading || !crane) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
          {loading ? "Loading..." : "Crane not found"}
        </span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <Link to="/" style={{ color: "var(--accent)", textDecoration: "none" }}>Fleet</Link>
        <span style={{ color: "var(--text-tertiary)" }}>/</span>
        <span>{crane.facility_name}</span>
        <span style={{ color: "var(--text-tertiary)" }}>/</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{crane.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{crane.name}</h1>
          {crane.crane_type && (
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {crane.crane_type}{crane.capacity_tons ? ` \u00B7 ${crane.capacity_tons}T` : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <HealthBadge status={crane.health} />
          <button
            onClick={() => setShowOverride(true)}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
            }}
          >
            {crane.health_override ? "Edit Override" : "Override"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === "overview" && (
        <CraneOverviewTab
          craneId={crane.id}
          sensors={crane.sensors}
          health={crane.health}
          overrideNote={crane.health_override?.note || null}
        />
      )}
      {tab === "sensors" && (
        <SensorListTab craneId={crane.id} sensors={crane.sensors} />
      )}
      {tab === "pm" && (
        <PMScheduleTab
          craneId={crane.id}
          schedules={crane.pm_schedules}
          onRefresh={fetchCrane}
        />
      )}
      {tab === "logbooks" && (
        <LogBookTab
          craneId={crane.id}
          entries={crane.log_entries || []}
          onRefresh={fetchCrane}
        />
      )}
      {tab === "service" && (
        <ServiceCallTab
          craneId={crane.id}
          calls={crane.service_calls || []}
          onRefresh={fetchCrane}
        />
      )}

      {/* Override modal */}
      {showOverride && (
        <HealthOverrideModal
          craneId={crane.id}
          current={crane.health_override}
          onClose={() => setShowOverride(false)}
          onSaved={() => { setShowOverride(false); fetchCrane(); }}
        />
      )}
    </div>
  );
}
