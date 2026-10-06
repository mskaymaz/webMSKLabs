import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="view-container">
      <div className="card">
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>
          Sistem Ayarları Modülü
        </h2>
        <div className="empty-state" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>
            <Settings size={48} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
            Sistem Ayarları Altyapısı Hazır
          </h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Sistem ve reklam alanları yapılandırma modülü aktif altyapı üzerindedir.
          </p>
        </div>
      </div>
    </div>
  );
};
