import React from 'react';
import { ViewType } from '../../types/admin';
import { useAuth } from '../../context/AuthContext';
import { Search, Menu } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  currentView: ViewType;
  onToggleMobileSidebar: () => void;
  onOpenSearch: () => void;
}

const titles: Record<ViewType, string> = {
  dashboard: 'Genel Bakış',
  tickets: 'Destek Biletleri',
  comments: 'Yorum Yönetimi',
  cms: 'Headless CMS',
  settings: 'Sistem Ayarları'
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onToggleMobileSidebar,
  onOpenSearch
}) => {
  const { user } = useAuth();

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          onClick={onToggleMobileSidebar}
          className="btn btn-secondary"
          style={{ minWidth: '44px' }}
          aria-label="Menüyü Aç/Kapat"
        >
          <Menu size={20} />
        </button>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
          {titles[currentView] || 'Yönetim Paneli'}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button onClick={onOpenSearch} className="header-search-btn">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} /> Hızlı Arama...
          </span>
          <kbd style={{ background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
            Cmd+K
          </kbd>
        </button>
        <Badge variant="primary" style={{ fontSize: 'var(--font-size-sm)', padding: '6px 12px' }}>
          {user?.username || 'admin'}
        </Badge>
      </div>
    </header>
  );
};
