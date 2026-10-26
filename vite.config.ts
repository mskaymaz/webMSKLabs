import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

function adminRewritePlugin(): Plugin {
  return {
    name: 'admin-rewrite-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const urlPath = req.url.split('?')[0];
          if (urlPath === '/admin' || urlPath === '/admin/' || (urlPath.startsWith('/admin/') && !urlPath.includes('.') && !urlPath.startsWith('/admin/modules/'))) {
            const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
            const target = '/admin/index.html' + query;
            req.url = target;
            (req as any).originalUrl = target;
          }
        }
        next();
      });
    }
  };
}

function blogRewritePlugin(): Plugin {
  return {
    name: 'blog-rewrite-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const urlPath = req.url.split('?')[0];
          if (urlPath === '/blog' || urlPath === '/blog/' || (urlPath.startsWith('/blog/') && !urlPath.includes('.'))) {
            const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
            const target = '/blog/blog.html' + query;
            req.url = target;
            (req as any).originalUrl = target;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  plugins: [
    react(),
    adminRewritePlugin(),
    blogRewritePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'MSKLabs DevAdmin',
        short_name: 'DevAdmin',
        description: 'MSKLabs DevAdmin Yönetim Portalı',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/admin/',
        scope: '/admin/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin/index.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react']
        }
      }
    }
  }
});
