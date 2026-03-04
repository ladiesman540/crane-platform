import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./api/client";
import Layout from "./components/Layout";
import CustomerLayout from "./components/CustomerLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SensorDetail from "./pages/SensorDetail";
import Alerts from "./pages/Alerts";
import CraneFleet from "./pages/CraneFleet";
import CraneDetail from "./pages/CraneDetail";
import SensorDetailV2 from "./pages/SensorDetailV2";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Customer-facing routes (top nav layout) */}
        <Route
          element={
            <ProtectedRoute>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<CraneFleet />} />
          <Route path="/cranes/:craneId" element={<CraneDetail />} />
          <Route path="/cranes/:craneId/sensors/:sensorId" element={<SensorDetailV2 />} />
        </Route>

        {/* Legacy routes (sidebar layout) */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/legacy/dashboard" element={<Dashboard />} />
          <Route path="/legacy/sensors/:sensorId" element={<SensorDetail />} />
          <Route path="/legacy/alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
