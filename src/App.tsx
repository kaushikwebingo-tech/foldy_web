import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import DashboardPage     from '@/pages/DashboardPage';
import LoginPage         from '@/pages/LoginPage';
import OnboardingPage    from '@/pages/OnboardingPage';
import GstProfilePage    from '@/pages/GstProfilePage';
import TdsPage           from '@/pages/TdsPage';
import StoragePage       from '@/pages/StoragePage';
import ManualUploadsPage from '@/pages/ManualUploadsPage';
import PaymentsPage      from '@/pages/PaymentsPage';
import DigilockerPage    from '@/pages/DigilockerPage';
import AdminPage         from '@/pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"               element={<DashboardPage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/onboarding"     element={<OnboardingPage />} />
          <Route path="/gst-profile"    element={<GstProfilePage />} />
          <Route path="/tds"            element={<TdsPage />} />
          <Route path="/storage"        element={<StoragePage />} />
          <Route path="/manual-uploads" element={<ManualUploadsPage />} />
          <Route path="/payments"       element={<PaymentsPage />} />
          <Route path="/digilocker"     element={<DigilockerPage />} />
          <Route path="/admin"          element={<AdminPage />} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
