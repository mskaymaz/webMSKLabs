/**
 * MSK Labs - Dynamic Announcement & Banner Loader
 * Fetches active announcements from /api/v1/templates (key_name: 'announcement_bar')
 * Supports:
 *  1. 'top_hanging': Hanging directly beneath the sticky header
 *  2. 'right_floating': Floating card pinned to the right edge (overlays right ad / alongside scroll)
 * Rich content: HTML, images, designs, clickable URLs, dismissable 'X'.
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'msk_announcement_dismissed_v1';

  var BANNER_THEMES = {
    info: {
      bgDark: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      bgLight: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      textDark: '#bfdbfe',
      textLight: '#1e3a8a',
      borderDark: '1px solid rgba(59, 130, 246, 0.4)',
      borderLight: '1px solid #93c5fd',
      accent: '#3b82f6',
    },
    success: {
      bgDark: 'linear-gradient(135deg, #022c22 0%, #065f46 100%)',
      bgLight: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      textDark: '#a7f3d0',
      textLight: '#065f46',
      borderDark: '1px solid rgba(16, 185, 129, 0.4)',
      borderLight: '1px solid #6ee7b7',
      accent: '#10b981',
    },
    warning: {
      bgDark: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)',
      bgLight: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      textDark: '#fef08a',
      textLight: '#92400e',
      borderDark: '1px solid rgba(245, 158, 11, 0.4)',
      borderLight: '1px solid #fde047',
      accent: '#f59e0b',
    },
    purple: {
      bgDark: 'linear-gradient(135deg, #2e1065 0%, #581c87 100%)',
      bgLight: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
      textDark: '#e9d5ff',
      textLight: '#581c87',
      borderDark: '1px solid rgba(168, 85, 247, 0.4)',
      borderLight: '1px solid #d8b4fe',
      accent: '#8b5cf6',
    },
  };

  function getLang() {
    return document.documentElement.getAttribute('lang') || localStorage.getItem('user_lang') || 'tr';
  }

  function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function injectStyles() {
    if (document.getElementById('msk-announcement-styles')) return;
    var style = document.createElement('style');
    style.id = 'msk-announcement-styles';
    style.textContent = `
      .msk-announcement-hanging {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 18px;
        position: relative;
        z-index: 95;
        border-bottom-width: 1px;
        border-bottom-style: solid;
        box-shadow: 0 2px 10px rgba(0,0,0,0.06);
        transition: all 0.25s ease;
      }
      .msk-announcement-hanging .msk-ann-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        font-size: 13px;
        line-height: 1.5;
      }
      .msk-announcement-floating {
        position: fixed;
        right: 20px;
        top: 130px;
        width: 310px;
        max-width: calc(100vw - 32px);
        box-sizing: border-box;
        padding: 16px;
        border-radius: 12px;
        border-width: 1px;
        border-style: solid;
        z-index: 1000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        backdrop-filter: blur(8px);
        animation: mskSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        transition: all 0.25s ease;
      }
      /* Tema Renkleri - Varsayılan Açık Mod (Light Mode) */
      .msk-theme-info {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
        color: #1e40af !important;
        border-color: #bfdbfe !important;
      }
      .msk-theme-success {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
        color: #166534 !important;
        border-color: #bbf7d0 !important;
      }
      .msk-theme-warning {
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
        color: #92400e !important;
        border-color: #fde68a !important;
      }
      .msk-theme-purple {
        background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%) !important;
        color: #6b21a8 !important;
        border-color: #e9d5ff !important;
      }

      /* Tema Renkleri - Koyu Mod Geçişi (Dark Mode) */
      [data-theme="dark"] .msk-theme-info,
      .dark-theme .msk-theme-info {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%) !important;
        color: #bfdbfe !important;
        border-color: rgba(59, 130, 246, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-success,
      .dark-theme .msk-theme-success {
        background: linear-gradient(135deg, #022c22 0%, #065f46 100%) !important;
        color: #a7f3d0 !important;
        border-color: rgba(16, 185, 129, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-warning,
      .dark-theme .msk-theme-warning {
        background: linear-gradient(135deg, #451a03 0%, #78350f 100%) !important;
        color: #fef08a !important;
        border-color: rgba(245, 158, 11, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-purple,
      .dark-theme .msk-theme-purple {
        background: linear-gradient(135deg, #2e1065 0%, #581c87 100%) !important;
        color: #e9d5ff !important;
        border-color: rgba(168, 85, 247, 0.4) !important;
      }
      @keyframes mskSlideIn {
        from { transform: translateX(40px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .msk-ann-content img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 6px;
        margin: 6px 0;
      }
      .msk-ann-content p {
        margin: 4px 0;
      }
      .msk-ann-content a {
        color: inherit;
        text-decoration: underline;
        font-weight: 700;
      }
      .msk-ann-close-btn {
        background: transparent;
        border: none;
        color: inherit;
        opacity: 0.7;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 4px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.15s ease, background 0.15s ease;
        flex-shrink: 0;
      }
      .msk-ann-close-btn:hover {
        opacity: 1;
        background: rgba(128, 128, 128, 0.2);
      }
      .msk-ann-cta-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none !important;
        cursor: pointer;
        transition: transform 0.15s ease, opacity 0.15s ease;
        flex-shrink: 0;
      }
      .msk-ann-cta-btn:hover {
        transform: translateY(-1px);
        opacity: 0.95;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function initAnnouncementLoader() {
    var apiUrl = (window.SITE_CONFIG && window.SITE_CONFIG.apiUrl)
      ? window.SITE_CONFIG.apiUrl
      : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8787/api'
        : 'https://api.msklabs.org/api');

    fetch(apiUrl + '/v1/templates?_t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Templates API HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var templates = data.templates || [];
        var ann = null;
        for (var i = 0; i < templates.length; i++) {
          if (templates[i].key_name === 'announcement_bar') {
            ann = templates[i];
            break;
          }
        }

        if (!ann || !ann.is_active) return;

        var meta = {};
        if (ann.meta_json) {
          try {
            meta = typeof ann.meta_json === 'string' ? JSON.parse(ann.meta_json) : ann.meta_json;
          } catch (_) {}
        }

        // Dismiss check
        var lastDismissed = localStorage.getItem(DISMISS_KEY);
        if (meta.isDismissable && lastDismissed && ann.updated_at && lastDismissed >= ann.updated_at) {
          return; // Previously dismissed and not updated since
        }

        var lang = getLang();
        var content = (lang === 'ar' ? ann.content_ar : lang === 'en' ? ann.content_en : ann.content_tr) || ann.content_tr || '';
        if (!content || !content.trim()) return;

        injectStyles();

        var placement = meta.placement || 'top_hanging'; // 'top_hanging' | 'right_floating'
        var themeKey = meta.bannerType || 'info';
        var theme = BANNER_THEMES[themeKey] || BANNER_THEMES.info;
        var dark = isDarkTheme();

        var container = document.createElement('div');
        container.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

        var bg = dark ? theme.bgDark : theme.bgLight;
        var text = dark ? theme.textDark : theme.textLight;
        var border = dark ? theme.borderDark : theme.borderLight;

        var ctaHtml = '';
        if (meta.ctaText && meta.ctaUrl) {
          ctaHtml = '<a href="' + meta.ctaUrl + '" class="msk-ann-cta-btn" style="background:' + theme.accent + '; color:#ffffff;">' +
            '<span>' + meta.ctaText + '</span> ➔</a>';
        }

        var closeBtnHtml = '';
        if (meta.isDismissable) {
          closeBtnHtml = '<button type="button" class="msk-ann-close-btn" aria-label="Kapat" title="Kapat">✕</button>';
        }

        if (placement === 'right_floating') {
          // 1. Sağ Kenar / Sağ Reklam Üzeri Kayan Kart (Floating Card)
          container.className = 'msk-announcement-floating msk-theme-' + themeKey;

          container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
              <div style="font-size:11px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">
                Duyuru & Kampanya
              </div>
              ${closeBtnHtml}
            </div>
            <div class="msk-ann-content" style="font-size:13px; line-height:1.5;">
              ${content}
            </div>
            ${ctaHtml ? '<div style="margin-top:12px; display:flex; justify-content:flex-end;">' + ctaHtml + '</div>' : ''}
          `;

          // If targetUrl exists on the whole card
          if (meta.targetUrl) {
            container.style.cursor = 'pointer';
            container.addEventListener('click', function(e) {
              if (e.target.closest('.msk-ann-close-btn') || e.target.closest('a')) return;
              window.location.href = meta.targetUrl;
            });
          }

          document.body.appendChild(container);
        } else {
          // 2. Üst Sabit Panel Altı Askılı Şerit (Top Hanging Banner)
          container.className = 'msk-announcement-hanging msk-theme-' + themeKey;

          container.innerHTML = `
            <div class="msk-ann-inner">
              <div class="msk-ann-content" style="flex:1; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                ${content}
              </div>
              <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                ${ctaHtml}
                ${closeBtnHtml}
              </div>
            </div>
          `;

          var headerEl = document.querySelector('.site-header-sticky') || document.querySelector('header');
          if (headerEl && headerEl.parentNode) {
            headerEl.parentNode.insertBefore(container, headerEl.nextSibling);
          } else {
            document.body.insertBefore(container, document.body.firstChild);
          }
        }

        // Close button click handler
        var closeBtn = container.querySelector('.msk-ann-close-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            container.style.opacity = '0';
            container.style.transform = placement === 'right_floating' ? 'translateX(30px)' : 'translateY(-10px)';
            setTimeout(function () {
              if (container.parentNode) container.parentNode.removeChild(container);
            }, 250);
            localStorage.setItem(DISMISS_KEY, ann.updated_at || new Date().toISOString());
          });
        }
      })
      .catch(function (err) {
        console.warn('[MSK Announcement] Duyuru yüklenemedi:', err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnouncementLoader);
  } else {
    initAnnouncementLoader();
  }
})();
