import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

function getHtmlInputs() {
  const inputs: Record<string, string> = {};

  // 1. Root HTML files
  const rootFiles = fs.readdirSync(__dirname);
  for (const file of rootFiles) {
    if (file.endsWith('.html')) {
      const name = file === 'index.html' ? 'main' : file.replace('.html', '');
      inputs[name] = path.resolve(__dirname, file);
    }
  }

  // 2. Subdirectories with HTML: admin, blog, apps
  const subdirs = ['admin', 'blog', 'apps'];
  for (const dir of subdirs) {
    const dirPath = path.resolve(__dirname, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.endsWith('.html')) {
          const key = `${dir}_${file.replace('.html', '').replace(/[^a-zA-Z0-9_]/g, '_')}`;
          inputs[key] = path.resolve(dirPath, file);
        }
      }
    }
  }

  return inputs;
}

function copyStaticAssetsPlugin(): Plugin {
  return {
    name: 'copy-static-assets-plugin',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');

      const copyDir = (src: string, dest: string) => {
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true, force: true });
        }
      };

      const copyFile = (src: string, dest: string) => {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      };

      // 1. Static assets directory (assets/js, assets/css, assets/data, assets/img)
      copyDir(path.resolve(__dirname, 'assets'), path.resolve(outDir, 'assets'));

      // 2. Top-level img and media directories
      copyDir(path.resolve(__dirname, 'img'), path.resolve(outDir, 'img'));
      copyDir(path.resolve(__dirname, 'media'), path.resolve(outDir, 'media'));

      // 3. Blog auxiliary scripts and assets (blog.js, comments.js, etc.)
      const blogDir = path.resolve(__dirname, 'blog');
      const distBlogDir = path.resolve(outDir, 'blog');
      if (fs.existsSync(blogDir)) {
        if (!fs.existsSync(distBlogDir)) fs.mkdirSync(distBlogDir, { recursive: true });
        for (const file of fs.readdirSync(blogDir)) {
          if (file.endsWith('.js') || file.endsWith('.json')) {
            copyFile(path.resolve(blogDir, file), path.resolve(distBlogDir, file));
          }
        }
      }

      // 4. Root static metadata files
      const rootFiles = ['announcements.json', 'CNAME', 'robots.txt', 'sitemap.xml', 'manifest.json'];
      for (const f of rootFiles) {
        copyFile(path.resolve(__dirname, f), path.resolve(outDir, f));
      }
    }
  };
}

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
    allowedHosts: true,
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
    copyStaticAssetsPlugin(),
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
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024
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
      input: getHtmlInputs(),
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react']
        }
      }
    }
  }
});
