/**
 * MSK Labs - Dynamic Multi-Announcement & Ticker Loader (Flyout Engine v2)
 * Features:
 *  - Round-Robin queue across multi-announcements (different announcement per visit)
 *  - Static multi-line vs. Ticker (kayan yazı) mode with pause-on-hover & speed/direction
 *  - Flyout top_hanging banner (0 layout shift, never pushes page down)
 *  - Header 📢 announcement button with badge & popover list to view/reopen any announcement
 *  - Dismiss persistence per item with auto-advance to next announcement
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'msk_dismissed_items_v2';
  var SEEN_KEY = 'msk_seen_items_v2';

  var BANNER_THEMES = {
    info: {
      bgDark: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,58,138,0.95) 100%)',
      bgLight: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      textDark: '#bfdbfe',
      textLight: '#1e40af',
      borderDark: '1px solid rgba(59, 130, 246, 0.4)',
      borderLight: '1px solid #bfdbfe',
      accent: '#2563eb',
    },
    success: {
      bgDark: 'linear-gradient(135deg, rgba(2,44,34,0.95) 0%, rgba(6,95,70,0.95) 100%)',
      bgLight: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      textDark: '#a7f3d0',
      textLight: '#166534',
      borderDark: '1px solid rgba(16, 185, 129, 0.4)',
      borderLight: '1px solid #bbf7d0',
      accent: '#16a34a',
    },
    warning: {
      bgDark: 'linear-gradient(135deg, rgba(69,26,3,0.95) 0%, rgba(120,53,15,0.95) 100%)',
      bgLight: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      textDark: '#fef08a',
      textLight: '#92400e',
      borderDark: '1px solid rgba(245, 158, 11, 0.4)',
      borderLight: '1px solid #fde68a',
      accent: '#d97706',
    },
    purple: {
      bgDark: 'linear-gradient(135deg, rgba(46,16,101,0.95) 0%, rgba(88,28,135,0.95) 100%)',
      bgLight: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
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
        overflow: hidden;
      }

      /* Kayan Yazı (Ticker / Marquee) */
      .msk-ticker-wrap {
        width: 100%;
        overflow: hidden;
        white-space: nowrap;
        position: relative;
        display: flex;
        align-items: center;
      }
      .msk-ticker-track {
        display: inline-block;
        white-space: nowrap;
        will-change: transform;
      }
      .msk-ticker-track:hover {
        animation-play-state: paused !important;
      }
      @keyframes mskMarqueeRTL {
        0% { transform: translateX(100vw); }
        100% { transform: translateX(-100%); }
      }
      @keyframes mskMarqueeLTR {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100vw); }
      }

      /* Flyout Sağ Kayan Kart */
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

      /* Tema Renkleri */
      .msk-theme-info {
        background: linear-gradient(135deg, rgba(239, 246, 255, 0.94) 0%, rgba(219, 234, 254, 0.94) 100%) !important;
        color: #1e40af !important; border-color: #bfdbfe !important;
      }
      .msk-theme-success {
        background: linear-gradient(135deg, rgba(240, 253, 244, 0.94) 0%, rgba(220, 252, 231, 0.94) 100%) !important;
        color: #166534 !important; border-color: #bbf7d0 !important;
      }
      .msk-theme-warning {
        background: linear-gradient(135deg, rgba(255, 251, 235, 0.94) 0%, rgba(254, 243, 199, 0.94) 100%) !important;
        color: #92400e !important; border-color: #fde68a !important;
      }
      .msk-theme-purple {
        background: linear-gradient(135deg, rgba(250, 245, 255, 0.94) 0%, rgba(243, 232, 255, 0.94) 100%) !important;
        color: #6b21a8 !important; border-color: #e9d5ff !important;
      }

      [data-theme="dark"] .msk-theme-info, .dark-theme .msk-theme-info {
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 58, 138, 0.92) 100%) !important;
        color: #bfdbfe !important; border-color: rgba(59, 130, 246, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-success, .dark-theme .msk-theme-success {
        background: linear-gradient(135deg, rgba(2, 44, 34, 0.92) 0%, rgba(6, 95, 70, 0.92) 100%) !important;
        color: #a7f3d0 !important; border-color: rgba(16, 185, 129, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-warning, .dark-theme .msk-theme-warning {
        background: linear-gradient(135deg, rgba(69, 26, 3, 0.92) 0%, rgba(120, 53, 15, 0.92) 100%) !important;
        color: #fef08a !important; border-color: rgba(245, 158, 11, 0.4) !important;
      }
      [data-theme="dark"] .msk-theme-purple, .dark-theme .msk-theme-purple {
        background: linear-gradient(135deg, rgba(46, 16, 101, 0.92) 0%, rgba(88, 28, 135, 0.92) 100%) !important;
        color: #e9d5ff !important; border-color: rgba(168, 85, 247, 0.4) !important;
      }

      /* Header 📢 Tetikleyici Buton Sıfırlama */
      .header-nav-right {
        position: absolute !important;
        right: 0 !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        margin: 0 !important;
        z-index: 10 !important;
      }
      html[dir="rtl"] .header-nav-right,
      body.lang-ar .header-nav-right {
        right: auto !important;
        left: 0 !important;
      }
      .announcement-trigger-btn {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        cursor: pointer !important;
        font-size: 18px !important;
        line-height: 1 !important;
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        min-height: 24px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        transition: transform 0.15s ease, opacity 0.15s ease !important;
      }
      .announcement-trigger-btn:hover {
        transform: scale(1.1) !important;
        opacity: 0.9 !important;
      }
      .announcement-trigger-btn .ann-icon-svg {
        display: block !important;
        width: 18px !important;
        height: 18px !important;
        stroke: #f59e0b !important;
        transition: transform 0.15s ease, stroke 0.15s ease !important;
      }
      .announcement-trigger-btn:hover .ann-icon-svg {
        transform: scale(1.1) !important;
        stroke: #d97706 !important;
      }
      [data-theme="dark"] .announcement-trigger-btn:hover .ann-icon-svg {
        stroke: #fbbf24 !important;
      }
      #mskAnnBadge {
        position: absolute !important;
        top: -5px !important;
        right: -7px !important;
        background: #ef4444 !important;
        color: #ffffff !important;
        font-size: 9px !important;
        font-weight: 800 !important;
        border-radius: 999px !important;
        padding: 1px 4px !important;
        line-height: 1 !important;
        pointer-events: none !important;
      }

      /* Header 📢 Popover Dropdown */
      .msk-ann-popover {
        position: fixed;
        right: 20px;
        top: 76px;
        width: 320px;
        max-width: calc(100vw - 32px);
        background: var(--bg-card, #ffffff);
        color: var(--text-main, #0f172a);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 12px;
        box-shadow: 0 14px 40px rgba(0,0,0,0.22);
        z-index: 10001;
        overflow: hidden;
        animation: mskFlyoutDown 0.2s ease;
      }
      [data-theme="dark"] .msk-ann-popover {
        background: #0f172a;
        color: #f8fafc;
        border-color: #334155;
      }
      .msk-ann-popover-item {
        padding: 10px 14px;
        border-bottom: 1px solid rgba(128,128,128,0.15);
        cursor: pointer;
        transition: background 0.15s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      .msk-ann-popover-item:hover {
        background: rgba(59, 130, 246, 0.1);
      }
      .msk-ann-close-btn {
        background: transparent; border: none; color: inherit; opacity: 0.75; cursor: pointer;
        font-size: 16px; line-height: 1; padding: 4px; border-radius: 4px; display: inline-flex;
        align-items: center; justify-content: center; flex-shrink: 0;
      }
      .msk-ann-close-btn:hover { opacity: 1; background: rgba(128, 128, 128, 0.2); }
      .msk-ann-cta-btn {
        display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px;
        font-size: 11px; font-weight: 700; text-decoration: none !important; cursor: pointer; flex-shrink: 0;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function renderAnnouncementBanner(item, meta, allActiveItems) {
    var existing = document.getElementById('mskActiveAnnouncementContainer');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var lang = getLang();
    var content = (lang === 'ar' ? item.content_ar : lang === 'en' ? item.content_en : item.content_tr) || item.content_tr || '';
    if (!content || !content.trim()) return;

    injectStyles();

    var placement = item.placement || meta.placement || 'top_hanging';
    var themeKey = item.bannerType || meta.bannerType || 'info';
    var theme = BANNER_THEMES[themeKey] || BANNER_THEMES.info;

    var container = document.createElement('div');
    container.id = 'mskActiveAnnouncementContainer';
    container.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    var opacityVal = (typeof item.opacity === 'number' && item.opacity >= 30) ? (item.opacity / 100) : 0.95;
    container.style.opacity = opacityVal.toString();

    var ctaHtml = '';
    var ctaText = item.ctaText || meta.ctaText;
    var ctaUrl = item.ctaUrl || meta.ctaUrl;
    if (ctaText && ctaUrl) {
      ctaHtml = '<a href="' + ctaUrl + '" class="msk-ann-cta-btn" style="background:' + theme.accent + '; color:#ffffff;">' +
        '<span>' + ctaText + '</span> ➔</a>';
    }

    var closeBtnHtml = '';
    var isDismissable = item.isDismissable !== false && meta.isDismissable !== false;
    if (isDismissable) {
      closeBtnHtml = '<button type="button" class="msk-ann-close-btn" aria-label="Kapat" title="Kapat">✕</button>';
    }

    var sizePreset = item.sizePreset || meta.sizePreset || 'standard';
    var isTicker = meta.displayMode === 'ticker';

    if (placement === 'right_floating') {
      var cardW = item.cardWidth || (sizePreset === 'compact' ? 260 : sizePreset === 'large' ? 380 : 310);
      var padCard = sizePreset === 'compact' ? '10px 12px' : sizePreset === 'large' ? '16px 18px' : '13px 15px';
      var fontCard = sizePreset === 'compact' ? '11px' : sizePreset === 'large' ? '14px' : '12.5px';

      container.className = 'msk-announcement-floating msk-theme-' + themeKey;
      container.style.width = cardW + 'px';
      container.style.padding = padCard;
      container.style.fontSize = fontCard;

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
          <div style="font-size:11px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">
            ${item.title || 'Duyuru & Kampanya'}
          </div>
          ${closeBtnHtml}
        </div>
        <div class="msk-ann-content">${content}</div>
        ${ctaHtml ? '<div style="margin-top:10px; display:flex; justify-content:flex-end;">' + ctaHtml + '</div>' : ''}
      `;

      if (item.targetUrl) {
        container.style.cursor = 'pointer';
        container.addEventListener('click', function(e) {
          if (e.target.closest('.msk-ann-close-btn') || e.target.closest('a')) return;
          window.location.href = item.targetUrl;
        });
      }
      document.body.appendChild(container);
    } else {
      // Üst Askılı Şerit (Sayfayı asla aşağı itmez)
      var minH = item.customHeight || (sizePreset === 'compact' ? 36 : sizePreset === 'large' ? 62 : 46);
      var padHang = sizePreset === 'compact' ? '6px 14px' : sizePreset === 'large' ? '12px 20px' : '9px 16px';
      var fontHang = sizePreset === 'compact' ? '11px' : sizePreset === 'large' ? '14px' : '12.5px';

      container.className = 'msk-announcement-hanging msk-theme-' + themeKey;
      container.style.minHeight = minH + 'px';
      container.style.padding = padHang;
      container.style.fontSize = fontHang;

      var headerEl = document.querySelector('header.site-header-sticky') || document.querySelector('header');
      var topPos = headerEl ? headerEl.offsetHeight : 84;
      container.style.top = topPos + 'px';

      var bodyHtml = '';
      if (isTicker) {
        // Ticker / Kayan Yazı Modu
        var speedSec = meta.tickerSpeed === 'slow' ? '30s' : meta.tickerSpeed === 'fast' ? '12s' : '20s';
        var animName = (meta.tickerDirection === 'ltr') ? 'mskMarqueeLTR' : 'mskMarqueeRTL';
        bodyHtml = `
          <div class="msk-ticker-wrap">
            <div class="msk-ticker-track" style="animation: ${animName} ${speedSec} linear infinite;">
              ${content}
            </div>
          </div>
        `;
      } else {
        bodyHtml = `<div class="msk-ann-content" style="flex:1; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">${content}</div>`;
      }

      container.innerHTML = `
        <div class="msk-ann-inner">
          ${bodyHtml}
          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
            ${ctaHtml}
            ${closeBtnHtml}
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    // Kapatma Aksiyonu
    var closeBtn = container.querySelector('.msk-ann-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        container.style.opacity = '0';
        container.style.transform = placement === 'right_floating' ? 'translateX(40px)' : 'translateY(-100%)';
        setTimeout(function () {
          if (container.parentNode) container.parentNode.removeChild(container);
        }, 260);

        try {
          var dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
          if (dismissed.indexOf(item.id) === -1) dismissed.push(item.id);
          localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
        } catch (_) {}
      });
    }
  }

  function setupHeaderTrigger(activeItems, meta, currentItem) {
    var triggerBtn = document.getElementById('mskAnnTriggerBtn');
    var badge = document.getElementById('mskAnnBadge');
    if (!triggerBtn) return;

    if (!activeItems || activeItems.length === 0) {
      triggerBtn.style.display = 'none';
      return;
    }

    triggerBtn.style.display = 'inline-flex';
    if (badge) {
      badge.style.display = 'inline-block';
      badge.textContent = activeItems.length.toString();
    }

    triggerBtn.onclick = function (e) {
      e.stopPropagation();
      var existingPop = document.getElementById('mskAnnPopoverMenu');
      if (existingPop) {
        existingPop.parentNode.removeChild(existingPop);
        return;
      }

      var popover = document.createElement('div');
      popover.id = 'mskAnnPopoverMenu';
      popover.className = 'msk-ann-popover';
      try {
        var rect = triggerBtn.getBoundingClientRect();
        popover.style.top = (rect.bottom + 8) + 'px';
        popover.style.right = Math.max(12, Math.round(window.innerWidth - rect.right)) + 'px';
      } catch (_) {}

      var listHtml = activeItems.map(function (it, idx) {
        var dotColor = it.bannerType === 'success' ? '#10b981' : it.bannerType === 'warning' ? '#f59e0b' : it.bannerType === 'purple' ? '#8b5cf6' : '#3b82f6';
        var isCurrent = it.id === currentItem.id;
        return `
          <div class="msk-ann-popover-item" data-ann-id="${it.id}">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${dotColor}; flex-shrink:0;"></span>
            <span style="flex:1; font-weight:${isCurrent ? '700' : '500'};">${it.title || ('Duyuru #' + (idx + 1))}</span>
            ${isCurrent ? '<span style="font-size:10px; opacity:0.7;">(Aktif)</span>' : ''}
          </div>
        `;
      }).join('');

      popover.innerHTML = `
        <div style="padding:10px 14px; background:rgba(128,128,128,0.08); font-size:11px; font-weight:800; display:flex; justify-content:space-between; align-items:center;">
          <span style="display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block; flex-shrink:0;">
              <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
              <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/>
              <path d="M8 6v8"/>
            </svg>
            DUYURULAR & KAMPANYALAR (${activeItems.length})
          </span>
          <button type="button" id="mskClosePopBtn" style="background:none; border:none; cursor:pointer; font-size:14px; color:inherit;">✕</button>
        </div>
        <div style="max-height:220px; overflow-y:auto;">${listHtml}</div>
        <div style="padding:8px 12px; background:rgba(128,128,128,0.05); text-align:center;">
          <button type="button" id="mskToggleBannerVisibilityBtn" style="font-size:11px; padding:4px 10px; border-radius:6px; border:1px solid rgba(128,128,128,0.3); background:transparent; color:inherit; cursor:pointer;">
            Şeridi Yeniden Göster / Gizle
          </button>
        </div>
      `;

      document.body.appendChild(popover);

      // Event handlers
      popover.querySelector('#mskClosePopBtn').onclick = function () {
        popover.parentNode.removeChild(popover);
      };

      popover.querySelector('#mskToggleBannerVisibilityBtn').onclick = function () {
        var banner = document.getElementById('mskActiveAnnouncementContainer');
        if (banner) {
          banner.parentNode.removeChild(banner);
        } else {
          renderAnnouncementBanner(currentItem, meta, activeItems);
        }
        popover.parentNode.removeChild(popover);
      };

      popover.querySelectorAll('.msk-ann-popover-item').forEach(function (el) {
        el.onclick = function () {
          var targetId = el.getAttribute('data-ann-id');
          var selected = activeItems.find(function (x) { return x.id === targetId; }) || activeItems[0];
          currentItem = selected;
          renderAnnouncementBanner(selected, meta, activeItems);
          popover.parentNode.removeChild(popover);
        };
      });

      document.addEventListener('click', function closeOut(ev) {
        if (!popover.contains(ev.target) && ev.target !== triggerBtn) {
          if (popover.parentNode) popover.parentNode.removeChild(popover);
          document.removeEventListener('click', closeOut);
        }
      });
    };
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

        if (!ann || (ann.is_active !== undefined && (ann.is_active === 0 || ann.is_active === false))) return;

        var meta = {};
        if (ann.meta_json) {
          try {
            meta = typeof ann.meta_json === 'string' ? JSON.parse(ann.meta_json) : ann.meta_json;
          } catch (_) {}
        }

        // Çoklu Havuz ve Varsayılan Dönüşümü
        var pool = (meta.items && Array.isArray(meta.items) && meta.items.length > 0)
          ? meta.items
          : [{
              id: 'ann_default',
              title: 'Ana Duyuru',
              content_tr: ann.content_tr || '',
              content_en: ann.content_en || '',
              content_ar: ann.content_ar || '',
              bannerType: meta.bannerType || 'info',
              placement: meta.placement || 'top_hanging',
              sizePreset: meta.sizePreset || 'standard',
              customHeight: meta.customHeight,
              cardWidth: meta.cardWidth,
              opacity: meta.opacity,
              isDismissable: meta.isDismissable !== false,
              ctaText: meta.ctaText,
              ctaUrl: meta.ctaUrl,
              targetUrl: meta.targetUrl,
              isActive: true,
            }];

        var activeItems = pool.filter(function (it) { return it.isActive !== false; });
        if (activeItems.length === 0) return;

        // Round-Robin Queue (Sırayla ve Farklı Duyuru Gösterimi)
        var seenIds = [];
        try { seenIds = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (_) {}

        var dismissedIds = [];
        try { dismissedIds = JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch (_) {}

        // Dismiss edilmemiş ve henüz görülmemiş olan sıradaki duyuruyu bul
        var chosenItem = null;
        for (var k = 0; k < activeItems.length; k++) {
          var candidate = activeItems[k];
          if (dismissedIds.indexOf(candidate.id) === -1 && seenIds.indexOf(candidate.id) === -1) {
            chosenItem = candidate;
            break;
          }
        }

        // Eğer hepsi görülmüş ama dismiss edilmemiş varsa sıfırla ve baştan seç
        if (!chosenItem) {
          var undismissed = activeItems.filter(function (x) { return dismissedIds.indexOf(x.id) === -1; });
          if (undismissed.length > 0) {
            chosenItem = undismissed[0];
            seenIds = [chosenItem.id];
          } else {
            // Tümü kapatılmışsa flyout açılmaz ama Header 📢 butonunda hazır bekler
            chosenItem = activeItems[0];
          }
        } else {
          seenIds.push(chosenItem.id);
        }
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(seenIds)); } catch (_) {}

        // Eğer bu duyuru henüz dismiss edilmemişse ekrana flyout olarak bas
        if (dismissedIds.indexOf(chosenItem.id) === -1) {
          renderAnnouncementBanner(chosenItem, meta, activeItems);
        }

        // Header sağ megafon / zil butonunu hazırla
        setupHeaderTrigger(activeItems, meta, chosenItem);
      })
      .catch(function (err) {
        console.warn('[MSK Announcement] Hata:', err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnouncementLoader);
  } else {
    initAnnouncementLoader();
  }
})();
