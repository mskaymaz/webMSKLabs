import React from 'react';
import { ViewType } from '../../types/admin';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { LayoutDashboard, Ticket, MessageSquare, FileText, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile
}) => {
  const { logout } = useAuth();
  const { dir, toggleDir } = useI18n();

  const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Genel Bakış', icon: <LayoutDashboard size={18} /> },
    { view: 'tickets', label: 'Destek Biletleri', icon: <Ticket size={18} /> },
    { view: 'comments', label: 'Yorum Yönetimi', icon: <MessageSquare size={18} /> },
    { view: 'cms', label: 'Headless CMS', icon: <FileText size={18} /> },
    { view: 'settings', label: 'Sistem Ayarları', icon: <Settings size={18} /> }
  ];

  return (
    <aside
      className={`admin-sidebar ${isOpenMobile ? 'open' : ''}`}
      aria-label="Ana Navigasyon"
    >
      <div className="sidebar-brand">
        <span>DevAdmin</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <a
            key={item.view}
            href={`#${item.view}`}
            className={`nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.view);
              onCloseMobile();
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {item.icon}
              {item.label}
            </span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={toggleDir}
          className="btn btn-secondary btn-block"
          style={{ marginBottom: 'var(--space-2)' }}
        >
          {dir === 'ltr' ? 'RTL Modu' : 'LTR Modu'}
        </button>
        <button onClick={logout} className="btn btn-danger btn-block">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Çıkış Yap
          </span>
        </button>
      </div>
    </aside>
  );
};
