import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import DashboardPage     from '@/pages/DashboardPage';
import LoginPage         from '@/pages/LoginPage';
import OnboardingPage    from '@/pages/OnboardingPage';
import ProfilePage       from '@/pages/ProfilePage';
import GstProfilePage    from '@/pages/GstProfilePage';
import TdsPage           from '@/pages/TdsPage';
import IncomeTaxPage     from '@/pages/IncomeTaxPage';
import RocDocumentsPage  from '@/pages/RocDocumentsPage';
import MoneyOnePage      from '@/pages/MoneyOnePage';
import SupportPage       from '@/pages/SupportPage';
import StoragePage       from '@/pages/StoragePage';
import ManualUploadsPage from '@/pages/ManualUploadsPage';
import PaymentsPage      from '@/pages/PaymentsPage';
import DigilockerPage    from '@/pages/DigilockerPage';
import AdminPage         from '@/pages/AdminPage';
import LoadTestPage      from '@/pages/LoadTestPage';
import ReportsPage       from '@/pages/ReportsPage';
import CalendarPage      from '@/pages/CalendarPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"               element={<DashboardPage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/onboarding"     element={<OnboardingPage />} />
          <Route path="/profile"        element={<ProfilePage />} />
          <Route path="/gst-profile"    element={<GstProfilePage />} />
          <Route path="/tds"            element={<TdsPage />} />
          <Route path="/income-tax"     element={<IncomeTaxPage />} />
          <Route path="/roc-documents"  element={<RocDocumentsPage />} />
          <Route path="/investment"     element={<MoneyOnePage />} />
          <Route path="/support"        element={<SupportPage />} />
          <Route path="/storage"        element={<StoragePage />} />
          <Route path="/manual-uploads" element={<ManualUploadsPage />} />
          <Route path="/payments"       element={<PaymentsPage />} />
          <Route path="/digilocker"     element={<DigilockerPage />} />
          <Route path="/admin"          element={<AdminPage />} />
          <Route path="/reports"        element={<ReportsPage />} />
          <Route path="/calendar"       element={<CalendarPage />} />
          <Route path="/load-testing"   element={<LoadTestPage />} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
