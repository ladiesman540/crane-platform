import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function CustomerLayout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-root)" }}>
      <TopNav />
      <main style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px 40px",
      }}>
        <Outlet />
      </main>
    </div>
  );
}
