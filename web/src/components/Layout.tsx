import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api, clearTokens } from "../api/client";
import "../App.css";

interface Facility { id: string; name: string; }
interface Crane { id: string; facility_id: string; name: string; }
interface Sensor { id: string; component_id: string; mac_address: string; label: string | null; }

const NAV_ITEMS = [
  { path: "/", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { path: "/alerts", label: "Alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [cranes, setCranes] = useState<Crane[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      api("/api/v1/facilities").then((r) => r.json()),
      api("/api/v1/cranes").then((r) => r.json()),
      api("/api/v1/sensors").then((r) => r.json()),
    ]).then(([f, c, s]) => {
      setFacilities(f);
      setCranes(c);
      setSensors(s);
      // Auto-expand first facility and crane
      if (f.length > 0) {
        const exp: Record<string, boolean> = { [f[0].id]: true };
        const firstCrane = c.find((cr: Crane) => cr.facility_id === f[0].id);
        if (firstCrane) exp[firstCrane.id] = true;
        setExpanded(exp);
      }
    });
  }, []);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-root)" }}>

      {/* ── Sidebar ── */}
      <nav style={{
        width: "var(--sidebar-width)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 32,
            height: 32,
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
              fontSize: 15,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}>CRANE</div>
            <div style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>Predictive Mx</div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ padding: "12px 10px 4px" }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "var(--bg-elevated)" : "transparent",
                  transition: "all 0.15s",
                  marginBottom: 2,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={active ? "var(--accent)" : "var(--text-tertiary)"}
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Asset tree */}
        <div style={{
          padding: "8px 10px",
          flex: 1,
          overflowY: "auto",
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            padding: "12px 12px 8px",
          }}>
            Asset Tree
          </div>

          {facilities.map((facility) => (
            <div key={facility.id} style={{ animation: "slide-in-left 0.3s ease-out" }}>
              <div
                onClick={() => toggle(facility.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m4-8h2m4 0h2m-8 4h2m4 0h2m-8-8h2m4 0h2" />
                </svg>
                <span style={{ flex: 1 }}>{facility.name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-tertiary)" strokeWidth="2"
                  style={{
                    transform: expanded[facility.id] ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform 0.2s",
                  }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>

              {expanded[facility.id] && cranes
                .filter((c) => c.facility_id === facility.id)
                .map((crane) => (
                  <div key={crane.id} style={{ paddingLeft: 12 }}>
                    <div
                      onClick={() => toggle(crane.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <span style={{ flex: 1 }}>{crane.name}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="var(--text-tertiary)" strokeWidth="2"
                        style={{
                          transform: expanded[crane.id] ? "rotate(90deg)" : "rotate(0)",
                          transition: "transform 0.2s",
                        }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>

                    {expanded[crane.id] && sensors.map((sensor) => {
                      const isActive = location.pathname === `/sensors/${sensor.id}`;
                      return (
                        <Link
                          key={sensor.id}
                          to={`/sensors/${sensor.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px 6px 24px",
                            marginLeft: 12,
                            borderRadius: "var(--radius-sm)",
                            textDecoration: "none",
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            color: isActive ? "var(--accent)" : "var(--text-tertiary)",
                            background: isActive ? "var(--accent-glow)" : "transparent",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--zone-a)",
                            animation: "pulse-live 2s ease-in-out infinite",
                            flexShrink: 0,
                          }} />
                          {sensor.label || sensor.mac_address}
                        </Link>
                      );
                    })}
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 10px",
          borderTop: "1px solid var(--border)",
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "8px 0",
              background: "transparent",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontFamily: "var(--font-display)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(220,38,38,0.4)";
              e.currentTarget.style.color = "var(--zone-d)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="grid-bg" style={{
        flex: 1,
        overflowY: "auto",
        padding: "28px 36px",
        position: "relative",
      }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
