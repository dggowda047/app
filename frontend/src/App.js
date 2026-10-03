import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import PropertyWizard from "@/pages/PropertyWizard";
import PropertyDetail from "@/pages/PropertyDetail";
import Customers from "@/pages/Customers";
import CustomerForm from "@/pages/CustomerForm";
import CustomerDetail from "@/pages/CustomerDetail";
import Followups from "@/pages/Followups";
import Deals from "@/pages/Deals";
import SharedProperties from "@/pages/SharedProperties";
import Notifications from "@/pages/Notifications";
import Bin from "@/pages/Bin";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import More from "@/pages/More";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Routed() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/properties" element={<Protected><Properties /></Protected>} />
      <Route path="/properties/new" element={<Protected><PropertyWizard /></Protected>} />
      <Route path="/properties/:id/edit" element={<Protected><PropertyWizard /></Protected>} />
      <Route path="/properties/:id" element={<Protected><PropertyDetail /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/customers/new" element={<Protected><CustomerForm /></Protected>} />
      <Route path="/customers/:id/edit" element={<Protected><CustomerForm /></Protected>} />
      <Route path="/customers/:id" element={<Protected><CustomerDetail /></Protected>} />
      <Route path="/followups" element={<Protected><Followups /></Protected>} />
      <Route path="/deals" element={<Protected><Deals /></Protected>} />
      <Route path="/shared" element={<Protected><SharedProperties /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/bin" element={<Protected><Bin /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/more" element={<Protected><More /></Protected>} />
      <Route path="*" element={<Navigate to={loading ? "/login" : "/dashboard"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routed />
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
