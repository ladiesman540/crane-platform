const CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  good: { label: "Good", color: "var(--health-good)", bg: "var(--health-good-bg)" },
  fair: { label: "Fair", color: "var(--health-fair)", bg: "var(--health-fair-bg)" },
  needs_attention: { label: "Needs Attention", color: "var(--health-attention)", bg: "var(--health-attention-bg)" },
  offline: { label: "Offline", color: "var(--health-offline)", bg: "var(--health-offline-bg)" },
};

export default function HealthBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const c = CONFIG[status] || CONFIG.offline;
  const fontSize = size === "sm" ? 11 : 13;
  const padding = size === "sm" ? "3px 10px" : "5px 14px";
  const dotSize = size === "sm" ? 6 : 7;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding,
      borderRadius: 20,
      background: c.bg,
      color: c.color,
      fontSize,
      fontWeight: 600,
      fontFamily: "var(--font-display)",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: dotSize,
        height: dotSize,
        borderRadius: "50%",
        background: c.color,
        flexShrink: 0,
      }} />
      {c.label}
    </span>
  );
}
