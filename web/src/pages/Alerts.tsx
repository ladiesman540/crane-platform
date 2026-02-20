export default function Alerts() {
  const mockAlerts = [
    { id: 1, severity: "critical", sensor: "Hoist Vibration", message: "X velocity exceeded Zone D threshold (1.82 mm/s)", time: "2 min ago", status: "open" },
    { id: 2, severity: "warning", sensor: "Bridge Vibration", message: "Y velocity trending upward — 18% increase over 7 days", time: "1 hr ago", status: "open" },
    { id: 3, severity: "info", sensor: "Gearbox Vibration", message: "Sensor came online after 45 min offline period", time: "3 hr ago", status: "acknowledged" },
  ];

  const severityConfig: Record<string, { color: string; glow: string; label: string }> = {
    critical: { color: "var(--zone-d)", glow: "var(--zone-d-glow)", label: "CRITICAL" },
    warning: { color: "var(--zone-c)", glow: "var(--zone-c-glow)", label: "WARNING" },
    info: { color: "var(--zone-b)", glow: "var(--zone-b-glow)", label: "INFO" },
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: "0.02em",
          marginBottom: 4,
          color: "var(--text-primary)",
        }}>Alerts</h1>
        <p style={{
          fontSize: 13,
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-mono)",
        }}>
          {mockAlerts.filter(a => a.status === "open").length} active alerts requiring attention
        </p>
      </div>

      {/* Alert list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {mockAlerts.map((alert, i) => {
          const sev = severityConfig[alert.severity];
          return (
            <div
              key={alert.id}
              className={`animate-in animate-in-delay-${i + 1}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 20px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderLeft: `2px solid ${sev.color}`,
                borderRadius: "var(--radius)",
                transition: "all 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.borderLeftColor = sev.color;
                e.currentTarget.style.background = "var(--bg-elevated)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.borderLeftColor = sev.color;
                e.currentTarget.style.background = "var(--bg-surface)";
              }}
            >
              {/* Severity badge */}
              <div style={{
                fontSize: 9,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: sev.color,
                background: sev.glow,
                padding: "3px 8px",
                borderRadius: 3,
                letterSpacing: "0.08em",
                flexShrink: 0,
                width: 72,
                textAlign: "center",
                border: `1px solid ${sev.color}22`,
              }}>{sev.label}</div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 3,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                }}>{alert.message}</div>
                <div style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-tertiary)",
                }}>{alert.sensor}</div>
              </div>

              {/* Time */}
              <div style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)",
                flexShrink: 0,
              }}>{alert.time}</div>

              {/* Status */}
              <div style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                color: alert.status === "open" ? "var(--zone-c)" : "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                flexShrink: 0,
                width: 90,
                textAlign: "right",
              }}>
                {alert.status === "open" ? "Needs action" : "Acknowledged"}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 24,
        padding: "14px 20px",
        background: "var(--bg-surface)",
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius)",
        fontSize: 12,
        color: "var(--text-tertiary)",
        textAlign: "center",
        fontFamily: "var(--font-mono)",
      }}>
        Alert engine with SMS/email delivery shipping in M2 (FR-005)
      </div>
    </div>
  );
}
