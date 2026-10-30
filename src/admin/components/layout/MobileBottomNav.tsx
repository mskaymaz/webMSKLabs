import React from 'react';
import { ViewType } from '../../types/admin';
import { LayoutDashboard, Ticket, MessageSquare, FileText, Settings } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate
}) => {
  const items: { view: ViewType; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Özet', icon: <LayoutDashboard size={20} /> },
    { view: 'tickets', label: 'Biletler', icon: <Ticket size={20} /> },
    { view: 'comments', label: 'Yorumlar', icon: <MessageSquare size={20} /> },
    { view: 'cms', label: 'CMS', icon: <FileText size={20} /> },
    { view: 'settings', label: 'Ayarlar', icon: <Settings size={20} /> }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {items.map((item) => (
        <a
          key={item.view}
          href={`#${item.view}`}
          className={`nav-item ${currentView === item.view ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(item.view);
          }}
          aria-label={item.label}
        >
          {item.icon}
        </a>
      ))}
    </nav>
  );
};
