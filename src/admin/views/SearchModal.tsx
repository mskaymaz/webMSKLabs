import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Search size={20} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Aramak istediğiniz terimi yazın... (Biletler, Yorumlar, CMS)"
              style={{ border: 'none', fontSize: 'var(--font-size-lg)', width: '100%', outline: 'none' }}
              autoFocus
            />
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ minWidth: '44px' }}>
            ✕
          </button>
        </div>
        <div style={{ padding: 'var(--space-4)', maxHeight: '300px', overflowY: 'auto' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Örnek Aramalar: Destek biletleri, Yorum onayları, Blog içerikleri...
          </p>
        </div>
      </div>
    </div>
  );
};
