import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AppContent } from './App';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with cache update handler
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Yeni PWA sürümü mevcut, önbellek güncelleniyor...');
    },
    onOfflineReady() {
      console.log('PWA çevrimdışı kullanıma hazır.');
    }
  });
}

const container = document.getElementById('app-root') || document.getElementById('root');

if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}
