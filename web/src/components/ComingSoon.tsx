export default function ComingSoon({ feature }: { feature: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 24px",
      textAlign: "center",
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: "var(--bg-hover)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
      </div>
      <h3 style={{
        fontSize: 18,
        fontWeight: 600,
        color: "var(--text-primary)",
        marginBottom: 8,
      }}>{feature}</h3>
      <p style={{
        fontSize: 14,
        color: "var(--text-secondary)",
        maxWidth: 320,
      }}>
        This feature is coming soon. We're building it to help you manage your equipment more effectively.
      </p>
    </div>
  );
}
