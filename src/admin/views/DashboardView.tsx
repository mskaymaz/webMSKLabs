import React from 'react';
import { Badge } from '../components/ui/Badge';
import { Ticket, MessageSquare, FileText } from 'lucide-react';

export const DashboardView: React.FC = () => {
  return (
    <div className="view-container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge variant="primary">Destek</Badge>
            <Ticket size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginTop: 'var(--space-2)' }}>3</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Aktif Destek Bileti</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge variant="warning">Onay Bekleyen</Badge>
            <MessageSquare size={24} style={{ color: 'var(--color-warning)' }} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginTop: 'var(--space-2)' }}>1</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Blog Yorumu</p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Badge variant="success">CMS</Badge>
            <FileText size={24} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', marginTop: 'var(--space-2)' }}>24</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Yayınlanmış Yazı</p>
        </div>
      </div>
    </div>
  );
};
