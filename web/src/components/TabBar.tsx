export default function TabBar({ tabs, active, onChange }: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      gap: 0,
      borderBottom: "1px solid var(--border)",
      marginBottom: 24,
    }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: "12px 20px",
              background: "transparent",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              fontFamily: "var(--font-display)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
