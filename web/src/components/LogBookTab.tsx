import { useState } from "react";
import { api } from "../api/client";

interface LogEntry {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export default function LogBookTab({ craneId, entries, onRefresh }: {
  craneId: string;
  entries: LogEntry[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle(""); setDescription("");
    setShowForm(false); setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!title) return;
    setSaving(true);
    const body = { title, description: description || null };

    if (editingId) {
      await api(`/api/v1/cranes/${craneId}/log-entries/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } else {
      await api(`/api/v1/cranes/${craneId}/log-entries`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    resetForm();
    onRefresh();
  };

  const handleDelete = async (entryId: string) => {
    await api(`/api/v1/cranes/${craneId}/log-entries/${entryId}`, { method: "DELETE" });
    onRefresh();
  };

  const startEdit = (entry: LogEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setDescription(entry.description || "");
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
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Log Book</h3>
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
            + Add Entry
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
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly inspection completed" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details, observations, notes..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
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

      {/* Entry list */}
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)", fontSize: 14 }}>
          No log entries yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: "14px 18px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                  {entry.title}
                </div>
                {entry.description && (
                  <div style={{
                    fontSize: 13, color: "var(--text-secondary)", marginTop: 4,
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  }}>
                    {entry.description}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => startEdit(entry)}
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
                  onClick={() => handleDelete(entry.id)}
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
