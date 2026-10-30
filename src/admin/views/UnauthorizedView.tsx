import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { ViewType } from '../types/admin';

interface UnauthorizedViewProps {
  onReturnDashboard: () => void;
  requiredPermission?: string;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({ onReturnDashboard, requiredPermission }) => {
  return (
    <div style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '16px' }}>
        <ShieldAlert size={48} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>Erişim Engellendi (403 FORBIDDEN)</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Bu sayfayı veya kaynağı görüntülemek için gerekli yetkiniz ({requiredPermission || 'yetki yetersiz'}) bulunmamaktadır.
      </p>
      <button onClick={onReturnDashboard} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={16} /> Genel Bakışa Dön
      </button>
    </div>
  );
};
