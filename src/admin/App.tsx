import React, { useState, useEffect } from 'react';
import { ViewType } from './types/admin';
import { useAuth } from './context/AuthContext';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { TicketsView } from './views/TicketsView';
import { CommentsView } from './views/CommentsView';
import { CmsView } from './views/CmsView';
import { SettingsView } from './views/SettingsView';
import { UnauthorizedView } from './views/UnauthorizedView';
import { SearchModal } from './views/SearchModal';

const VIEW_PERMISSIONS: Record<ViewType, string | null> = {
  dashboard: null,
  tickets: 'messages.read',
  comments: 'comments.read',
  cms: 'posts.read',
  settings: 'settings.manage'
};

export const AppContent: React.FC = () => {
  const { isAuthenticated, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const requiredPerm = VIEW_PERMISSIONS[currentView];
  const isAuthorizedForCurrentView = !requiredPerm || hasPermission(requiredPerm);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <OfflineBanner />
        <LoginView />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <div id="app-root">
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="admin-main">
          <Header
            currentView={currentView}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
            onOpenSearch={() => setIsSearchOpen(true)}
          />

          <div className="admin-content">
            {!isAuthorizedForCurrentView ? (
              <UnauthorizedView
                onReturnDashboard={() => setCurrentView('dashboard')}
                requiredPermission={requiredPerm || undefined}
              />
            ) : (
              <>
                {currentView === 'dashboard' && <DashboardView />}
                {currentView === 'tickets' && <TicketsView />}
                {currentView === 'comments' && <CommentsView />}
                {currentView === 'cms' && <CmsView />}
                {currentView === 'settings' && <SettingsView />}
              </>
            )}
          </div>
        </main>

        <MobileBottomNav
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
        />

        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
};
