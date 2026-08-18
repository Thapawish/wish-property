import { useState } from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/Toast';
import * as Sentry from '@/lib/sentry';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AuthPage } from '@/pages/AuthPage';
import { AppShell, type PageKey } from '@/components/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { PropertiesPage } from '@/pages/PropertiesPage';
import { LeasesPage } from '@/pages/LeasesPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { RentReviewsPage } from '@/pages/RentReviewsPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { Spinner } from '@/components/ui';

function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[90] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium safe-top">
      <WifiOff className="w-4 h-4" />
      You're offline — changes may not save until you reconnect
    </div>
  );
}

function TokenExpiredPrompt() {
  const { tokenExpired, signOut } = useAuth();
  if (!tokenExpired) return null;
  return (
    <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 max-w-sm text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Session expired</h2>
        <p className="text-slate-400 text-sm mb-5">Your session has expired for security. Please sign in again to continue.</p>
        <button
          onClick={() => signOut()}
          className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-medium rounded-lg transition"
        >
          Sign in again
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { session, membership, loading, tokenExpired } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) return <AuthPage />;
  if (!membership) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-white text-lg font-semibold mb-2">No agency found</h2>
          <p className="text-slate-400 text-sm">Your account isn't linked to an agency yet. Please sign out and create a new agency.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      <AppShell current={page} onNavigate={setPage}>
        {page === 'dashboard' && <DashboardPage />}
        {page === 'properties' && <PropertiesPage />}
        {page === 'leases' && <LeasesPage />}
        {page === 'contacts' && <ContactsPage />}
        {page === 'payments' && <PaymentsPage />}
        {page === 'rent-reviews' && <RentReviewsPage />}
        {page === 'maintenance' && <MaintenancePage />}
      </AppShell>
      <TokenExpiredPrompt />
    </>
  );
}

export default function App() {
  return (
    <Sentry.Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </Sentry.Sentry.ErrorBoundary>
  );
}

function ErrorFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-white text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-4">An unexpected error occurred. Our team has been notified. Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}
