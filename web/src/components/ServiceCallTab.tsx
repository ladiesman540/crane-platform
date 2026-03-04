import { useState } from "react";
import { api } from "../api/client";

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

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  medium: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  high: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  critical: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  in_progress: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  resolved: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function ServiceCallTab({ craneId, calls, onRefresh }: {
  craneId: string;
  calls: ServiceCall[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle(""); setDescription(""); setPriority("medium"); setAssignedTo("");
    setShowForm(false); setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!title) return;
    setSaving(true);
    const body = {
      title,
      description: description || null,
      priority,
      assigned_to: assignedTo || null,
    };

    if (editingId) {
      await api(`/api/v1/cranes/${craneId}/service-calls/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } else {
      await api(`/api/v1/cranes/${craneId}/service-calls`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    resetForm();
    onRefresh();
  };

  const handleStatusChange = async (callId: string, newStatus: string) => {
    await api(`/api/v1/cranes/${craneId}/service-calls/${callId}`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    onRefresh();
  };

  const handleDelete = async (callId: string) => {
    await api(`/api/v1/cranes/${craneId}/service-calls/${callId}`, { method: "DELETE" });
    onRefresh();
  };

  const startEdit = (sc: ServiceCall) => {
    setEditingId(sc.id);
    setTitle(sc.title);
    setDescription(sc.description || "");
    setPriority(sc.priority);
    setAssignedTo(sc.assigned_to || "");
    setShowForm(true);
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    fontSize: 14,
    fontFamily: "var(--font-display)",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
  };

  const badgeStyle = (colors: { bg: string; text: string }): React.CSSProperties => ({
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    background: colors.bg,
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Service Calls</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius)",
              border: "none",
              background: "var(--accent)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
            }}
          >
            + New Service Call
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hoist motor overheating" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Assigned To</label>
              <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="e.g. Mike Johnson" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={resetForm}
              style={{
                padding: "8px 16px", borderRadius: "var(--radius)", border: "1px solid var(--border)",
                background: "transparent", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
                fontFamily: "var(--font-display)",
              }}
            >Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving || !title}
              style={{
                padding: "8px 16px", borderRadius: "var(--radius)", border: "none",
                background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-display)", opacity: !title ? 0.5 : 1,
              }}
            >{saving ? "Saving..." : editingId ? "Update" : "Create"}</button>
          </div>
        </div>
      )}

      {/* Call list */}
      {calls.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)", fontSize: 14 }}>
          No service calls yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {calls.map((sc) => (
            <div
              key={sc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 18px",
                background: "var(--bg-surface)",
                border: `1px solid ${sc.priority === "critical" && sc.status !== "resolved" ? "rgba(239,68,68,0.15)" : "var(--border)"}`,
                borderRadius: "var(--radius)",
                opacity: sc.status === "resolved" ? 0.7 : 1,
              }}
            >
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 500,
                    color: sc.status === "resolved" ? "var(--text-tertiary)" : "var(--text-primary)",
                    textDecoration: sc.status === "resolved" ? "line-through" : "none",
                  }}>
                    {sc.title}
                  </span>
                  <span style={badgeStyle(PRIORITY_COLORS[sc.priority] || PRIORITY_COLORS.medium)}>
                    {sc.priority}
                  </span>
                  <span style={badgeStyle(STATUS_COLORS[sc.status] || STATUS_COLORS.open)}>
                    {STATUS_LABELS[sc.status] || sc.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                  <span style={{ fontFamily: "var(--font-mono)" }}>
                    {new Date(sc.created_at).toLocaleDateString()}
                  </span>
                  {sc.assigned_to && <span>{sc.assigned_to}</span>}
                  {sc.resolved_at && (
                    <span style={{ color: "var(--health-good)" }}>
                      Resolved {new Date(sc.resolved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                {sc.status !== "resolved" && (
                  <select
                    value={sc.status}
                    onChange={(e) => handleStatusChange(sc.id, e.target.value)}
                    style={{
                      padding: "4px 8px", borderRadius: 4,
                      border: "1px solid var(--border)",
                      background: "var(--bg-input)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      fontFamily: "var(--font-display)",
                      cursor: "pointer",
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                )}
                {sc.status !== "resolved" && (
                  <button
                    onClick={() => startEdit(sc)}
                    title="Edit"
                    style={{
                      padding: "6px 8px", background: "transparent", border: "none",
                      color: "var(--text-tertiary)", cursor: "pointer", borderRadius: 4,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(sc.id)}
                  title="Delete"
                  style={{
                    padding: "6px 8px", background: "transparent", border: "none",
                    color: "var(--text-tertiary)", cursor: "pointer", borderRadius: 4,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
