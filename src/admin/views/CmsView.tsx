import React from 'react';
import { FileText } from 'lucide-react';

export const CmsView: React.FC = () => {
  return (
    <div className="view-container">
      <div className="card">
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>
          Headless CMS Modülü
        </h2>
        <div className="empty-state" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>
            <FileText size={48} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
            CMS Modülü Kurulumu Hazır
          </h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Blog yazıları, kanallar ve medya içerikleri yönetimi sonraki modül adımında bağlanacaktır.
          </p>
        </div>
      </div>
    </div>
  );
};
