import React from 'react';
import { FileText, Plus, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CmsView: React.FC = () => {
  const { hasPermission } = useAuth();

  return (
    <div className="view-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)' }}>
            Headless CMS Modülü
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {hasPermission('posts.create') && (
              <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} /> Yeni Yazı Ekle
              </button>
            )}
            {hasPermission('posts.publish') && (
              <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Send size={16} /> Yayınla
              </button>
            )}
          </div>
        </div>
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
