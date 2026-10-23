/**
 * MSK Labs - Dynamic Announcement & Banner Loader (Flyout Engine)
 * Fetches active announcements from /api/v1/templates (key_name: 'announcement_bar')
 * Supports:
 *  1. 'top_hanging': Flyout floating banner pinned directly beneath the sticky header (0 layout shift, never pushes page down)
 *  2. 'right_floating': Flyout floating card pinned to right edge (0 layout shift, never pushes page to the left)
 * Features: Rich HTML, images, designs, clickable URLs, dismissable 'X', size presets, custom px dimensions, opacity/transparency.
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'msk_announcement_dismissed_v1';

  var BANNER_THEMES = {
    info: {
      bgDark: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
      bgLight: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      textDark: '#bfdbfe',
      textLight: '#1e40af',
      borderDark: '1px solid rgba(59, 130, 246, 0.4)',
      borderLight: '1px solid #bfdbfe',
      accent: '#2563eb',
    },
    success: {
      bgDark: 'linear-gradient(135deg, #022c22 0%, #065f46 100%)',
      bgLight: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      textDark: '#a7f3d0',
      textLight: '#166534',
      borderDark: '1px solid rgba(16, 185, 129, 0.4)',
      borderLight: '1px solid #bbf7d0',
      accent: '#16a34a',
    },
    warning: {
      bgDark: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)',
      bgLight: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      textDark: '#fef08a',
      textLight: '#92400e',
      borderDark: '1px solid rgba(245, 158, 11, 0.4)',
      borderLight: '1px solid #fde68a',
      accent: '#d97706',
    },
    purple: {
      bgDark: 'linear-gradient(135deg, #2e1065 0%, #581c87 100%)',
      bgLight: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
      textDark: '#e9d5ff',
      textLight: '#6b21a8',
      borderDark: '1px solid rgba(168, 85, 247, 0.4)',
      borderLight: '1px solid #e9d5ff',
      accent: '#9333ea',
    },
  };

  function getLang() {
    return document.documentElement.getAttribute('lang') || localStorage.getItem('user_lang') || 'tr';
  }

  function injectStyles() {
    if (document.getElementById('msk-announcement-styles')) return;
    var style = document.createElement('style');
    style.id = 'msk-announcement-styles';
    style.textContent = `
      /* Flyout Üst Şerit (Sayfayı asla aşağı itmez, sabit panelin altında yüzer) */
      .msk-announcement-hanging {
        position: fixed !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
        z-index: 995 !important;
        border-bottom-width: 1px !important;
        border-bottom-style: solid !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        animation: mskFlyoutDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        transition: transform 0.25s ease, opacity 0.25s ease !important;
      }
      @keyframes mskFlyoutDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .msk-announcement-hanging .msk-ann-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        line-height: 1.5;
      }

      /* Flyout Sağ Kayan Kart (Sayfayı asla sola itmez, sağ kenarda yüzer) */
      .msk-announcement-floating {
        position: fixed !important;
        right: 20px !important;
        top: 110px !important;
        box-sizing: border-box !important;
        border-radius: 12px !important;
        border-width: 1px !important;
        border-style: solid !important;
        z-index: 9999 !important;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        animation: mskFlyoutRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
        transition: transform 0.25s ease, opacity 0.25s ease !important;
      }
      @keyframes mskFlyoutRight {
        from { transform: translateX(40px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      /* Tema Renkleri - Açık Mod (Varsayılan Aydınlık) */
      .msk-theme-info {
        background: linear-gradient(135deg, rgba(239, 246, 255, 0.94) 0%, rgba(219, 234, 254, 0.94) 100%) !important;
        color: #1e40af !important;
        border-color: #bfdbfe !important;
      }
      .msk-theme-success {
        background: linear-gradient(135deg, rgba(240, 253, 244, 0.94) 0%, rgba(220, 252, 231, 0.94) 100%) !important;
        color: #166534 !important;
        border-color: #bbf7d0 !important;
      }
      .msk-theme-warning {
        background: linear-gradient(135deg, rgba(255, 251, 235, 0.94) 0%, rgba(254, 243, 199, 0.94) 100%) !important;
        color: #92400e !important;
        border-color: #fde68a !important;
      }
      .msk-theme-purple {
        background: linear-gradient(135deg, rgba(250, 245, 255, 0.94) 0%, rgba(243, 232, 255, 0.94) 100%) !important;
        color: #6b21a8 !important;
        border-color: #e9d5ff !important;
      }

      /* Tema Renkleri - Koyu Mod */
      [data-theme="dark"] .msk-theme-info,
      .dark-theme .msk-theme-info {
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 58, 138, 0.92) 100%) !important;
        color: #bfdbfe !important;
        border-color: rgba(59, 130, 246, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-success,
      .dark-theme .msk-theme-success {
        background: linear-gradient(135deg, rgba(2, 44, 34, 0.92) 0%, rgba(6, 95, 70, 0.92) 100%) !important;
        color: #a7f3d0 !important;
        border-color: rgba(16, 185, 129, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-warning,
      .dark-theme .msk-theme-warning {
        background: linear-gradient(135deg, rgba(69, 26, 3, 0.92) 0%, rgba(120, 53, 15, 0.92) 100%) !important;
        color: #fef08a !important;
        border-color: rgba(245, 158, 11, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-purple,
      .dark-theme .msk-theme-purple {
        background: linear-gradient(135deg, rgba(46, 16, 101, 0.92) 0%, rgba(88, 28, 135, 0.92) 100%) !important;
        color: #e9d5ff !important;
        border-color: rgba(168, 85, 247, 0.4) !important;
      }

      .msk-ann-content img {
        max-width: 100% !important;
        height: auto !important;
        border-radius: 6px;
        margin: 4px 0;
      }
      .msk-ann-content p {
        margin: 2px 0;
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
        opacity: 0.75;
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

        if (!ann) return;
        if (ann.is_active !== undefined && (ann.is_active === 0 || ann.is_active === false)) return;

        var meta = {};
        if (ann.meta_json) {
          try {
            meta = typeof ann.meta_json === 'string' ? JSON.parse(ann.meta_json) : ann.meta_json;
          } catch (_) {}
        }

        // Dismiss check - only dismiss if closed for this exact version
        var lastDismissed = localStorage.getItem(DISMISS_KEY);
        if (meta.isDismissable && lastDismissed && ann.updated_at && String(lastDismissed) === String(ann.updated_at)) {
          return;
        }

        var lang = getLang();
        var content = (lang === 'ar' ? ann.content_ar : lang === 'en' ? ann.content_en : ann.content_tr) || ann.content_tr || '';
        if (!content || !content.trim()) return;

        injectStyles();

        var placement = meta.placement || 'top_hanging'; // 'top_hanging' | 'right_floating'
        var themeKey = meta.bannerType || 'info';
        var theme = BANNER_THEMES[themeKey] || BANNER_THEMES.info;

        var container = document.createElement('div');
        container.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

        // Şeffaflık (Opacity) Ayarı
        var opacityVal = (typeof meta.opacity === 'number' && meta.opacity >= 30 && meta.opacity <= 100)
          ? (meta.opacity / 100)
          : 0.95;
        container.style.opacity = opacityVal.toString();

        var ctaHtml = '';
        if (meta.ctaText && meta.ctaUrl) {
          ctaHtml = '<a href="' + meta.ctaUrl + '" class="msk-ann-cta-btn" style="background:' + theme.accent + '; color:#ffffff;">' +
            '<span>' + meta.ctaText + '</span> ➔</a>';
        }

        var closeBtnHtml = '';
        if (meta.isDismissable) {
          closeBtnHtml = '<button type="button" class="msk-ann-close-btn" aria-label="Kapat" title="Kapat">✕</button>';
        }

        var sizePreset = meta.sizePreset || 'standard';

        if (placement === 'right_floating') {
          // 1. Sağ Kenar Flyout Kayan Kart (Sayfayı asla sola itmez)
          var cardW = meta.cardWidth || (sizePreset === 'compact' ? 260 : sizePreset === 'large' ? 380 : 310);
          var padCard = sizePreset === 'compact' ? '10px 12px' : sizePreset === 'large' ? '16px 18px' : '13px 15px';
          var fontCard = sizePreset === 'compact' ? '11px' : sizePreset === 'large' ? '14px' : '12.5px';

          container.className = 'msk-announcement-floating msk-theme-' + themeKey;
          container.style.width = cardW + 'px';
          container.style.padding = padCard;
          container.style.fontSize = fontCard;

          container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
              <div style="font-size:11px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">
                Duyuru & Kampanya
              </div>
              ${closeBtnHtml}
            </div>
            <div class="msk-ann-content">
              ${content}
            </div>
            ${ctaHtml ? '<div style="margin-top:10px; display:flex; justify-content:flex-end;">' + ctaHtml + '</div>' : ''}
          `;

          if (meta.targetUrl) {
            container.style.cursor = 'pointer';
            container.addEventListener('click', function(e) {
              if (e.target.closest('.msk-ann-close-btn') || e.target.closest('a')) return;
              window.location.href = meta.targetUrl;
            });
          }

          document.body.appendChild(container);
        } else {
          // 2. Üst Askılı Flyout Şerit (Sayfayı asla aşağı itmez, sabit panelin altında yüzer)
          var minH = meta.customHeight || (sizePreset === 'compact' ? 36 : sizePreset === 'large' ? 62 : 46);
          var padHang = sizePreset === 'compact' ? '6px 14px' : sizePreset === 'large' ? '12px 20px' : '9px 16px';
          var fontHang = sizePreset === 'compact' ? '11px' : sizePreset === 'large' ? '14px' : '12.5px';

          container.className = 'msk-announcement-hanging msk-theme-' + themeKey;
          container.style.minHeight = minH + 'px';
          container.style.padding = padHang;
          container.style.fontSize = fontHang;

          // Sabit header yüksekliğinin hemen altına yerleşir (Sayfayı aşağı itmez)
          var headerEl = document.querySelector('header.site-header-sticky') || document.querySelector('header');
          var topPos = headerEl ? headerEl.offsetHeight : 84;
          container.style.top = topPos + 'px';

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

          document.body.appendChild(container);
        }

        // Close button click handler
        var closeBtn = container.querySelector('.msk-ann-close-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            container.style.opacity = '0';
            container.style.transform = placement === 'right_floating' ? 'translateX(40px)' : 'translateY(-100%)';
            setTimeout(function () {
              if (container.parentNode) container.parentNode.removeChild(container);
            }, 260);
            localStorage.setItem(DISMISS_KEY, ann.updated_at || Date.now().toString());
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
