import { useNavigate } from "react-router-dom";
import { clearTokens } from "../api/client";

export default function TopNav() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  return (
    <nav style={{
      height: 64,
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none" }}
        onClick={() => navigate("/")}
      >
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--accent) 0%, #0891b2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 20h20M6 20V8l6-4 6 4v12M10 20v-6h4v6" />
          </svg>
        </div>
        <div>
          <div style={{
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "0.12em",
            color: "var(--text-primary)",
          }}>CRANE</div>
          <div style={{
            fontSize: 9,
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontWeight: 500,
          }}>Predictive Mx</div>
        </div>
      </div>

      {/* Right side */}
      <button
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 16px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--text-secondary)",
          fontSize: 13,
          fontFamily: "var(--font-display)",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign out
      </button>
    </nav>
  );
}
