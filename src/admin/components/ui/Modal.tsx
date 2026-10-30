import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  maxWidth = '680px',
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>{title}</h3>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ minWidth: '36px', minHeight: '36px', padding: 0 }}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: 'var(--space-6)', maxHeight: '80vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
