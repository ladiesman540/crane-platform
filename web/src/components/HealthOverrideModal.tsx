import { useState } from "react";
import { api } from "../api/client";

const OPTIONS = [
  { value: "good", label: "Good", color: "var(--health-good)" },
  { value: "fair", label: "Fair", color: "var(--health-fair)" },
  { value: "needs_attention", label: "Needs Attention", color: "var(--health-attention)" },
];

export default function HealthOverrideModal({ craneId, current, onClose, onSaved }: {
  craneId: string;
  current: { status: string; note: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(current?.status || "good");
  const [note, setNote] = useState(current?.note || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await api(`/api/v1/cranes/${craneId}/health-override`, {
      method: "PUT",
      body: JSON.stringify({ status, note: note || null }),
    });
    setSaving(false);
    onSaved();
  };

  const handleClear = async () => {
    setSaving(true);
    await api(`/api/v1/cranes/${craneId}/health-override`, { method: "DELETE" });
    setSaving(false);
    onSaved();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          padding: 28,
          width: 420,
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Health Override</h3>

        {/* Status selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: "var(--radius)",
                border: status === opt.value ? `2px solid ${opt.color}` : "2px solid var(--border)",
                background: status === opt.value ? `${opt.color}10` : "transparent",
                color: status === opt.value ? opt.color : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "var(--font-display)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note..."
          style={{
            width: "100%",
            height: 80,
            padding: 12,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--bg-input)",
            fontSize: 14,
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
            resize: "vertical",
            outline: "none",
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          {current && (
            <button
              onClick={handleClear}
              disabled={saving}
              style={{
                padding: "9px 18px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--health-attention)",
                background: "transparent",
                color: "var(--health-attention)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-display)",
                marginRight: "auto",
              }}
            >
              Clear Override
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 18px",
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
            {saving ? "Saving..." : "Save Override"}
          </button>
        </div>
      </div>
    </div>
  );
}
