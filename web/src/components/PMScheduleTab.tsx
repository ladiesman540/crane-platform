import { useState } from "react";
import { api } from "../api/client";

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

export default function PMScheduleTab({ craneId, schedules, onRefresh }: {
  craneId: string;
  schedules: PMSchedule[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle(""); setDueDate(""); setDescription(""); setAssignedTo("");
    setShowForm(false); setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!title || !dueDate) return;
    setSaving(true);
    const body = { title, due_date: dueDate, description: description || null, assigned_to: assignedTo || null };

    if (editingId) {
      await api(`/api/v1/cranes/${craneId}/pm-schedules/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } else {
      await api(`/api/v1/cranes/${craneId}/pm-schedules`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    resetForm();
    onRefresh();
  };

  const handleComplete = async (pmId: string) => {
    await api(`/api/v1/cranes/${craneId}/pm-schedules/${pmId}`, {
      method: "PUT",
      body: JSON.stringify({ status: "completed" }),
    });
    onRefresh();
  };

  const handleDelete = async (pmId: string) => {
    await api(`/api/v1/cranes/${craneId}/pm-schedules/${pmId}`, { method: "DELETE" });
    onRefresh();
  };

  const startEdit = (pm: PMSchedule) => {
    setEditingId(pm.id);
    setTitle(pm.title);
    setDueDate(pm.due_date);
    setDescription(pm.description || "");
    setAssignedTo(pm.assigned_to || "");
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Maintenance Schedule</h3>
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
            + Add Task
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
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Inspect bridge girder" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Due Date *</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
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
              disabled={saving || !title || !dueDate}
              style={{
                padding: "8px 16px", borderRadius: "var(--radius)", border: "none",
                background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-display)", opacity: (!title || !dueDate) ? 0.5 : 1,
              }}
            >{saving ? "Saving..." : editingId ? "Update" : "Create"}</button>
          </div>
        </div>
      )}

      {/* Task list */}
      {schedules.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)", fontSize: 14 }}>
          No maintenance tasks scheduled yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {schedules.map((pm) => (
            <div
              key={pm.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 18px",
                background: pm.overdue ? "var(--health-attention-bg)" : "var(--bg-surface)",
                border: `1px solid ${pm.overdue ? "rgba(220,38,38,0.15)" : "var(--border)"}`,
                borderRadius: "var(--radius)",
              }}
            >
              {/* Status check */}
              <button
                onClick={() => pm.status === "pending" ? handleComplete(pm.id) : undefined}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: pm.status === "completed" ? "none" : "2px solid var(--border-strong)",
                  background: pm.status === "completed" ? "var(--health-good)" : "transparent",
                  cursor: pm.status === "pending" ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {pm.status === "completed" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: pm.status === "completed" ? "var(--text-tertiary)" : "var(--text-primary)",
                  textDecoration: pm.status === "completed" ? "line-through" : "none",
                }}>
                  {pm.title}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    color: pm.overdue ? "var(--health-attention)" : undefined,
                    fontWeight: pm.overdue ? 600 : 400,
                  }}>
                    {pm.overdue ? "Overdue \u2014 " : ""}Due {new Date(pm.due_date + "T00:00:00").toLocaleDateString()}
                  </span>
                  {pm.assigned_to && <span>{pm.assigned_to}</span>}
                </div>
              </div>

              {/* Actions */}
              {pm.status === "pending" && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => startEdit(pm)}
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
                  <button
                    onClick={() => handleDelete(pm.id)}
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
