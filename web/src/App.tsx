import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./api/client";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SensorDetail from "./pages/SensorDetail";
import Alerts from "./pages/Alerts";

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
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/sensors/:sensorId" element={<SensorDetail />} />
          <Route path="/alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
