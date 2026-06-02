import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import DashboardPage     from '@/pages/DashboardPage';
import LoginPage         from '@/pages/LoginPage';
import OnboardingPage    from '@/pages/OnboardingPage';
import GstProfilePage    from '@/pages/GstProfilePage';
import FinanceStatusPage from '@/pages/FinanceStatusPage';
import GstTaxpayerPage   from '@/pages/GstTaxpayerPage';
import TdsPage           from '@/pages/TdsPage';
import StoragePage       from '@/pages/StoragePage';
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
          <Route path="/finance-status" element={<FinanceStatusPage />} />
          <Route path="/gst-taxpayer"   element={<GstTaxpayerPage />} />
          <Route path="/tds"            element={<TdsPage />} />
          <Route path="/storage"        element={<StoragePage />} />
          <Route path="/payments"       element={<PaymentsPage />} />
          <Route path="/digilocker"     element={<DigilockerPage />} />
          <Route path="/admin"          element={<AdminPage />} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
