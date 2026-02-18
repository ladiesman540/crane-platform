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
        {/* Decorative grid */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(11,114,133,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

        {/* Glowing orb */}
        <div style={{
          position: "absolute",
          top: "20%",
          left: "30%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(11,114,133,0.07) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 48,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--accent) 0%, #0891b2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 20h20M6 20V8l6-4 6 4v12M10 20v-6h4v6" />
              </svg>
            </div>
            <span style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}>
              CRANE
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 56,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            marginBottom: 20,
          }}>
            Predictive<br />
            <span style={{ color: "var(--accent)" }}>Maintenance</span>
          </h1>
          <p style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: 18,
            lineHeight: 1.6,
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
            paddingTop: 32,
            borderTop: "1px solid var(--border)",
          }}>
            {[
              { value: "$260K", label: "Avg. cost per hour of downtime" },
              { value: "40-60%", label: "Reduction in unplanned stops" },
              { value: "3x", label: "Customer ROI in 12 months" },
            ].map((stat, i) => (
              <div key={i}>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 24,
                  fontWeight: 500,
                  color: "var(--accent)",
                  marginBottom: 4,
                }}>{stat.value}</div>
                <div style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  maxWidth: 140,
                  lineHeight: 1.4,
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderLeft: "1px solid var(--border)",
        background: "#ffffff",
      }}>
        <form onSubmit={handleSubmit} style={{
          width: 340,
          animation: "fade-in 0.5s ease-out",
        }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 24,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>Sign in</h2>
          <p style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            marginBottom: 32,
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
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "var(--font-display)",
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
                background: "var(--bg-root)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "var(--font-display)",
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
                background: "var(--bg-root)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.12)"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 0",
              background: loading ? "var(--bg-hover)" : "linear-gradient(135deg, var(--accent) 0%, #0891b2 100%)",
              color: loading ? "var(--text-secondary)" : "var(--text-inverse)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              letterSpacing: "-0.01em",
            }}
          >
            {loading ? "Authenticating..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
