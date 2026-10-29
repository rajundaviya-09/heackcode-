import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { LandingPage } from './pages/LandingPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { ResourceDetailPage } from './pages/ResourceDetailPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OwnerApprovalsPage } from './pages/OwnerApprovalsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ResetModal } from './pages/ResetModal';
import { AuthModal } from './components/AuthModal';
import { AiPlannerPage } from './pages/AiPlannerPage';
import { LoginPage } from './pages/LoginPage';

const AppContent: React.FC = () => {
  const { currentPage, setCurrentPage, authModalOpen, setAuthModalOpen, isAuthenticated } = useApp();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  // When user opens website, if not authenticated (or on login page), show the Two-Category Login Page first!
  if ((!isAuthenticated && !guestMode) || currentPage === 'login') {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <LoginPage
          onGuestContinue={() => {
            setGuestMode(true);
            setCurrentPage('discovery');
          }}
        />
        <ToastContainer />
        {resetModalOpen && (
          <ResetModal onClose={() => setResetModalOpen(false)} />
        )}
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage />;
      case 'discovery':
        return <DiscoveryPage />;
      case 'ai-planner':
        return <AiPlannerPage />;
      case 'details':
        return <ResourceDetailPage />;
      case 'bookings':
        return <MyBookingsPage />;
      case 'approvals':
        return <OwnerApprovalsPage />;
      case 'incidents':
        return <IncidentsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'audit':
        return <AuditLogPage />;
      default:
        return <DiscoveryPage />;
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        onOpenResetModal={() => setResetModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Body with Sidebar + Dynamic View */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 70px)' }}>
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="main-content" style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          {renderCurrentPage()}
        </main>
      </div>

      {/* Global Toasts */}
      <ToastContainer />

      {/* Factory Reset Modal */}
      {resetModalOpen && (
        <ResetModal onClose={() => setResetModalOpen(false)} />
      )}

      {/* Authentication Modal */}
      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
