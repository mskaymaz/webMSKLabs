import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in UI Boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--space-6)', margin: 'var(--space-4)', background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}>
          <h2 style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-2)' }}>
            ⚠️ Bir Arayüz Hatası Oluştu
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {this.state.error?.message || 'Bilinmeyen uygulama hatası.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-primary"
            style={{ marginTop: 'var(--space-4)' }}
          >
            Yeniden Dene
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
