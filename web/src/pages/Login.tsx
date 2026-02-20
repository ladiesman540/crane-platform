import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      navigate("/");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "var(--bg-root)",
      overflow: "hidden",
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "64px 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Blueprint grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(6, 182, 212, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        {/* Radial glow */}
        <div style={{
          position: "absolute",
          top: "15%",
          left: "25%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />

        {/* Secondary glow */}
        <div style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 56,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent) 0%, #0891b2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 30px rgba(6, 182, 212, 0.3)",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 20h20M6 20V8l6-4 6 4v12M10 20v-6h4v6" />
              </svg>
            </div>
            <span style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--text-primary)",
              letterSpacing: "0.14em",
            }}>
              CRANE
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: 20,
          }}>
            Predictive<br />
            <span style={{
              color: "var(--accent)",
              textShadow: "0 0 40px rgba(6, 182, 212, 0.3)",
            }}>Maintenance</span>
          </h1>
          <p style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: 17,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            maxWidth: 440,
          }}>
            Real-time vibration monitoring and failure prediction for overhead cranes.
            Know what needs attention before it breaks.
          </p>

          {/* Stats row */}
          <div style={{
            display: "flex",
            gap: 48,
            marginTop: 56,
            paddingTop: 28,
            borderTop: "1px solid var(--border-strong)",
          }}>
            {[
              { value: "$260K", label: "Avg. cost per hour of downtime" },
              { value: "40-60%", label: "Reduction in unplanned stops" },
              { value: "3x", label: "Customer ROI in 12 months" },
            ].map((stat, i) => (
              <div key={i}>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--accent)",
                  marginBottom: 6,
                  textShadow: "0 0 20px rgba(6, 182, 212, 0.2)",
                }}>{stat.value}</div>
                <div style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  maxWidth: 130,
                  lineHeight: 1.4,
                  fontFamily: "var(--font-display)",
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 460,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderLeft: "1px solid var(--border-strong)",
        background: "var(--bg-surface)",
      }}>
        <form onSubmit={handleSubmit} style={{
          width: 320,
          animation: "fade-in 0.5s ease-out",
        }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 22,
            marginBottom: 8,
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}>Sign in</h2>
          <p style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 32,
            fontFamily: "var(--font-display)",
          }}>Enter your credentials to access the dashboard</p>

          {error && (
            <div style={{
              background: "var(--zone-d-glow)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--zone-d)",
              marginBottom: 20,
              fontFamily: "var(--font-display)",
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "var(--font-mono)",
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@acme.com"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--accent)";
                e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.1)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{
              display: "block",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "var(--font-mono)",
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--accent)";
                e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.1)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 0",
              background: loading
                ? "var(--bg-hover)"
                : "linear-gradient(135deg, var(--accent) 0%, #0891b2 100%)",
              color: loading ? "var(--text-secondary)" : "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              letterSpacing: "0.04em",
              boxShadow: loading ? "none" : "0 0 24px rgba(6, 182, 212, 0.2)",
            }}
          >
            {loading ? "Authenticating..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
