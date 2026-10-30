// Defines which page shows for each URL.
// Pages inside the <Layout> route share the sidebar and header.
// The login page sits outside it, so it is shown without the sidebar.

import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MedicationsPage from './pages/MedicationsPage';
import AddMedicationPage from './pages/AddMedicationPage';
import HistoryPage from './pages/HistoryPage';
import PharmaciesPage from './pages/PharmaciesPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';

function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <p className="p-8 text-slate-600">Restoring your sign-in…</p>;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          {/* The home address "/" redirects to the medications page */}
          <Route path="/" element={<Navigate to="/medications" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/medications" element={<MedicationsPage />} />
          <Route path="/medications/new" element={<AddMedicationPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/pharmacies" element={<PharmaciesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}