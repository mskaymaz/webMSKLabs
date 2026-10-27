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
    custom: {
      bgDark: '#1e293b',
      bgLight: '#f8fafc',
      textDark: '#f8fafc',
      textLight: '#0f172a',
      borderDark: '1px solid #475569',
      borderLight: '1px solid #cbd5e1',
      accent: '#3b82f6',
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
        line-height: 1.15;
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
        display: inline-flex;
        align-items: center;
        white-space: pre;
        padding-left: 100%;
        will-change: transform;
        line-height: 1.15;
      }
      .msk-ticker-track p {
        display: inline-flex;
        align-items: center;
        margin: 0;
        white-space: pre;
        line-height: inherit;
      }
      .msk-ticker-track:hover {
        animation-play-state: paused !important;
      }
      @keyframes mskMarqueeRTL {
        0% { transform: translate3d(0, 0, 0); }
        100% { transform: translate3d(-100%, 0, 0); }
      }
      @keyframes mskMarqueeLTR {
        0% { transform: translate3d(-100%, 0, 0); }
        100% { transform: translate3d(0, 0, 0); }
      }
      .msk-ann-content {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        overflow-x: hidden !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .msk-ann-content img {
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        box-sizing: border-box !important;
        margin: 6px auto !important;
      }
      .msk-ann-content p {
        margin: 0 0 4px 0;
      }
      .msk-ann-content p:last-child {
        margin-bottom: 0;
      }

      /* Dikey Satır Dönüşümlü Akış (Rotator) */
      .msk-rotator-wrap {
        width: 100%;
        overflow: hidden;
        position: relative;
        display: flex;
        align-items: center;
      }
      .msk-rotator-item {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        width: 100%;
      }

      /* Flyout Sağ ve Sol Kayan Kart */
      .msk-announcement-floating {
        position: fixed !important;
        box-sizing: border-box !important;
        border-radius: 12px !important;
        border-width: 1px !important;
        border-style: solid !important;
        z-index: 9999 !important;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22) !important;
        transition: transform 0.25s ease, opacity 0.25s ease !important;
      }
      .msk-floating-right {
        left: auto !important;
        animation: mskFlyoutRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .msk-floating-left {
        right: auto !important;
        animation: mskFlyoutLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      @keyframes mskFlyoutRight {
        from { transform: translateX(40px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes mskFlyoutLeft {
        from { transform: translateX(-40px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      /* Dikey Kulakçık (Askı Rozet / Tab) */
      .msk-ann-tab {
        position: fixed !important;
        z-index: 9999 !important;
        box-sizing: border-box !important;
        display: none;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        writing-mode: vertical-rl !important;
        text-orientation: mixed !important;
        font-family: inherit !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 1px !important;
        padding: 10px 4px !important;
        cursor: pointer !important;
        user-select: none !important;
        border-width: 1px !important;
        border-style: solid !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18) !important;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, box-shadow 0.2s ease !important;
      }
      .msk-ann-tab:hover {
        transform: scale(1.06) !important;
        box-shadow: 0 6px 22px rgba(0, 0, 0, 0.28) !important;
      }
      .msk-ann-tab-left {
        border-radius: 0 8px 8px 0 !important;
        border-left: none !important;
      }
      .msk-ann-tab-right {
        border-radius: 8px 0 0 8px !important;
        border-right: none !important;
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
        font-size: 13px; line-height: 1; padding: 2px 4px; border-radius: 4px; display: inline-flex;
        align-items: center; justify-content: center; flex-shrink: 0; height: 18px; width: 18px;
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
    var placement = item.placement || meta.placement || 'top_hanging';
    var isFloating = placement === 'right_floating' || placement === 'left_floating';
    var containerId = isFloating ? 'mskActiveFloatingContainer' : 'mskActiveTopContainer';
    var existing = document.getElementById(containerId);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    if (isFloating) {
      var existingTab = document.getElementById('mskActiveFloatingTab');
      if (existingTab && existingTab.parentNode) existingTab.parentNode.removeChild(existingTab);
    }

    var lang = getLang();
    var content = (lang === 'ar' ? item.content_ar : lang === 'en' ? item.content_en : item.content_tr) || item.content_tr || '';
    if (!content || !content.trim()) return;

    injectStyles();

    var themeKey = item.bannerType || meta.bannerType || 'info';
    var theme = BANNER_THEMES[themeKey] || BANNER_THEMES.info;

    var container = document.createElement('div');
    container.id = containerId;
    container.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    var bgOpacityVal = (typeof item.bgOpacity === 'number') ? (item.bgOpacity / 100) : (typeof item.opacity === 'number' ? (item.opacity / 100) : 0.95);
    var textOpacityVal = (typeof item.textOpacity === 'number') ? (item.textOpacity / 100) : 1.0;

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark-theme');
    var currentBg = themeKey === 'custom' ? (item.customBg || (isDark ? '#1e293b' : '#f8fafc')) : (isDark ? theme.bgDark : theme.bgLight);
    var currentText = themeKey === 'custom' ? (item.customText || (isDark ? '#f8fafc' : '#0f172a')) : (isDark ? theme.textDark : theme.textLight);
    var currentBorder = isDark ? theme.borderDark : theme.borderLight;

    var ctaHtml = '';
    var ctaText = item.ctaText || meta.ctaText;
    var ctaUrl = item.ctaUrl || meta.ctaUrl;
    var activeUrl = item.targetUrl || ctaUrl;
    if (ctaText && ctaUrl) {
      ctaHtml = '<a href="' + ctaUrl + '" target="_blank" rel="noopener noreferrer" class="msk-ann-cta-btn" style="background:' + theme.accent + '; color:#ffffff;">' +
        '<span>' + ctaText + '</span> ➔</a>';
    }

    var closeBtnHtml = '';
    var isDismissable = item.isDismissable !== false && meta.isDismissable !== false;
    if (isDismissable) {
      closeBtnHtml = '<button type="button" class="msk-ann-close-btn" aria-label="Kapat" title="Kapat">✕</button>';
    }

    var sizePreset = item.sizePreset || meta.sizePreset || 'standard';
    var isTicker = (item.displayMode || meta.displayMode) === 'ticker';
    var isRotator = (item.displayMode || meta.displayMode) === 'rotator';

    if (isFloating) {
      var cardW = item.cardWidth || (sizePreset === 'compact' ? 260 : sizePreset === 'large' ? 380 : 310);
      var cardPadY = item.paddingY !== undefined ? item.paddingY : (sizePreset === 'compact' ? 8 : sizePreset === 'large' ? 14 : 10);
      var padCard = cardPadY + 'px ' + (sizePreset === 'compact' ? '10px' : sizePreset === 'large' ? '16px' : '12px');
      var fontCard = sizePreset === 'compact' ? '11px' : sizePreset === 'large' ? '14px' : '12px';
      var topOff = item.topOffset !== undefined ? item.topOffset : 110;
      var sideOff = item.sideOffset !== undefined ? item.sideOffset : 5;
      var tabText = item.tabText || 'SİZİN İÇİN';
      var autoDelay = (typeof item.autoCollapseDelay === 'number') ? item.autoCollapseDelay : 4;

      container.className = 'msk-announcement-floating ' + (placement === 'left_floating' ? 'msk-floating-left' : 'msk-floating-right');
      container.style.width = cardW + 'px';
      container.style.top = topOff + 'px';
      if (placement === 'left_floating') {
        container.style.left = sideOff + 'px';
        container.style.right = 'auto';
      } else {
        container.style.right = sideOff + 'px';
        container.style.left = 'auto';
      }
      container.style.fontSize = fontCard;
      container.style.color = currentText;
      container.style.overflow = 'hidden';
      if (currentBorder) container.style.border = currentBorder;
      if (item.cardHeight) container.style.height = item.cardHeight + 'px';

      var glassEffect = item.glassEffect || meta.glassEffect || 'none';
      if (glassEffect === 'blur') {
        container.style.backdropFilter = 'blur(10px)';
        container.style.webkitBackdropFilter = 'blur(10px)';
      }

      container.innerHTML = `
        <div class="msk-ann-bg-layer" style="position:absolute; inset:0; z-index:0; pointer-events:none; background:${currentBg}; opacity:${bgOpacityVal};"></div>
        <div class="msk-ann-floating-inner" style="position:relative; z-index:1; opacity:${textOpacityVal}; padding:${padCard}; height:100%; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
            <div style="font-size:11px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">
              ${item.title || 'Duyuru & Kampanya'}
            </div>
            ${closeBtnHtml}
          </div>
          <div class="msk-ann-content" style="flex:1;">${content}</div>
          ${ctaHtml ? '<div style="margin-top:10px; display:flex; justify-content:flex-end;">' + ctaHtml + '</div>' : ''}
        </div>
      `;

      // Dikey Kulakçık (Askı Rozet / Tab - İkonsuz, İnce ve Yalın)
      var tabEl = document.createElement('div');
      tabEl.id = 'mskActiveFloatingTab';
      tabEl.className = 'msk-ann-tab ' + (placement === 'left_floating' ? 'msk-ann-tab-left' : 'msk-ann-tab-right');
      tabEl.style.top = topOff + 'px';
      if (placement === 'left_floating') {
        tabEl.style.left = sideOff + 'px';
        tabEl.style.right = 'auto';
      } else {
        tabEl.style.right = sideOff + 'px';
        tabEl.style.left = 'auto';
      }
      tabEl.style.background = currentBg;
      tabEl.style.color = currentText;
      if (currentBorder) tabEl.style.borderColor = currentBorder;
      if (glassEffect === 'blur') {
        tabEl.style.backdropFilter = 'blur(10px)';
        tabEl.style.webkitBackdropFilter = 'blur(10px)';
      }

      tabEl.innerHTML = `<span style="line-height:1.2; padding:2px 0;">${tabText}</span>`;

      // İlk Başlangıç Görünürlüğü (DOM'a eklenmeden ÖNCE kesinlikle atanır)
      var isCollapsed = false;
      var collapseTimer = null;
      var isHovered = false;

      if (autoDelay <= 0) {
        // Doğrudan kulakçık başla
        isCollapsed = true;
        container.style.setProperty('display', 'none', 'important');
        tabEl.style.setProperty('display', 'flex', 'important');
        tabEl.style.opacity = '1';
      } else {
        // Açık başla, kulakçık kesinlikle gizli
        isCollapsed = false;
        container.style.setProperty('display', 'flex', 'important');
        container.style.opacity = '1';
        tabEl.style.setProperty('display', 'none', 'important');
        tabEl.style.opacity = '0';
      }

      document.body.appendChild(container);
      document.body.appendChild(tabEl);

      // Kart <-> Kulakçık Durum Yönetimi
      function collapseToTab() {
        if (isCollapsed) return;
        isCollapsed = true;
        container.style.opacity = '0';
        container.style.transform = (placement === 'right_floating') ? 'translateX(30px) scale(0.95)' : 'translateX(-30px) scale(0.95)';
        setTimeout(function () {
          container.style.setProperty('display', 'none', 'important');
          tabEl.style.setProperty('display', 'flex', 'important');
          tabEl.style.opacity = '0';
          tabEl.style.transform = (placement === 'right_floating') ? 'translateX(15px)' : 'translateX(-15px)';
          requestAnimationFrame(function () {
            tabEl.style.opacity = '1';
            tabEl.style.transform = 'translateX(0)';
          });
        }, 250);
      }

      function expandToCard() {
        if (!isCollapsed) return;
        isCollapsed = false;
        tabEl.style.opacity = '0';
        tabEl.style.transform = (placement === 'right_floating') ? 'translateX(15px)' : 'translateX(-15px)';
        setTimeout(function () {
          tabEl.style.setProperty('display', 'none', 'important');
          container.style.setProperty('display', 'flex', 'important');
          container.style.opacity = '0';
          container.style.transform = (placement === 'right_floating') ? 'translateX(30px) scale(0.95)' : 'translateX(-30px) scale(0.95)';
          requestAnimationFrame(function () {
            container.style.opacity = '1';
            container.style.transform = 'translateX(0) scale(1)';
          });
        }, 200);
      }

      tabEl.addEventListener('click', function (e) {
        e.stopPropagation();
        expandToCard();
      });

      if (autoDelay > 0) {
        container.addEventListener('mouseenter', function () {
          isHovered = true;
          if (collapseTimer) clearTimeout(collapseTimer);
        });
        container.addEventListener('mouseleave', function () {
          isHovered = false;
          collapseTimer = setTimeout(collapseToTab, 1500);
        });
        collapseTimer = setTimeout(function () {
          if (!isHovered) collapseToTab();
        }, autoDelay * 1000);
      }

      // Kapatma butonuna basıldığında kartı yok etmek yerine kulakçığa büzüştür
      var closeBtn = container.querySelector('.msk-ann-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          collapseToTab();
        });
      }
    } else {
      // Üst Askılı Şerit (Sayfayı asla aşağı itmez)
      var minH = item.customHeight || (sizePreset === 'compact' ? 26 : sizePreset === 'large' ? 48 : 34);
      var padY = item.paddingY !== undefined ? item.paddingY : (sizePreset === 'compact' ? 1 : sizePreset === 'large' ? 3 : 2);
      var padHang = padY + 'px ' + (sizePreset === 'compact' ? '10px' : sizePreset === 'large' ? '16px' : '12px');
      var fontHang = sizePreset === 'compact' ? '11px' : sizePreset === 'large' ? '14px' : '12px';

      container.className = 'msk-announcement-hanging';
      container.style.minHeight = minH + 'px';
      if (isTicker) {
        container.style.height = minH + 'px';
      }
      container.style.overflow = 'hidden';
      container.style.fontSize = fontHang;
      container.style.color = currentText;
      if (currentBorder) container.style.borderBottom = currentBorder;
      var glassEffect = item.glassEffect || meta.glassEffect || 'none';
      if (glassEffect === 'blur') {
        container.style.backdropFilter = 'blur(10px)';
        container.style.webkitBackdropFilter = 'blur(10px)';
      }

      var headerEl = document.querySelector('header.site-header-sticky') || document.querySelector('header');
      var topPos = headerEl ? headerEl.offsetHeight : 84;
      container.style.top = topPos + 'px';

      var bodyHtml = '';
      if (isTicker) {
        // Ticker / Kayan Yazı Modu (Çok satırlı metinlerde satırlar arası boşluk)
        var curSpeed = item.tickerSpeed || meta.tickerSpeed;
        var curDir = item.tickerDirection || meta.tickerDirection;
        var speedSec = curSpeed === 'slow' ? '30s' : curSpeed === 'fast' ? '12s' : '20s';
        var animName = (curDir === 'ltr') ? 'mskMarqueeLTR' : 'mskMarqueeRTL';
        var tickerHtml = content.replace(/<\/p>\s*<p[^>]*>/gi, '<span style="display:inline-block; margin:0 35px; opacity:0.6;">•</span>').trim();
        bodyHtml = '<div class="msk-ticker-wrap"><div class="msk-ticker-track" style="animation: ' + animName + ' ' + speedSec + ' linear infinite;">' + tickerHtml + '</div></div>';
      } else if (isRotator) {
        // Dikey Satır Satır Nöbetleşe / Fade Döngüsü (Rotator)
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        var pEls = tempDiv.querySelectorAll('p');
        var lines = [];
        if (pEls && pEls.length > 1) {
          pEls.forEach(function (p) { if (p.innerHTML.trim()) lines.push(p.innerHTML.trim()); });
        } else {
          var brSplit = tempDiv.innerHTML.split(/<br\s*[\/]?>/gi);
          if (brSplit.length > 1) {
            brSplit.forEach(function (s) { if (s.trim()) lines.push(s.trim()); });
          } else {
            lines.push(tempDiv.innerHTML.trim());
          }
        }

        bodyHtml = `
          <div class="msk-rotator-wrap" style="height:22px; flex:1; position:relative; overflow:hidden;">
            ${lines.map(function (ln, idx) {
              return `<div class="msk-rotator-item" style="transition: opacity 0.4s ease, transform 0.4s ease; position:${idx === 0 ? 'relative' : 'absolute'}; top:0; left:0; width:100%; opacity:${idx === 0 ? '1' : '0'}; transform:${idx === 0 ? 'translateY(0)' : 'translateY(8px)'}; pointer-events:${idx === 0 ? 'auto' : 'none'};">${ln}</div>`;
            }).join('')}
          </div>
        `;
      } else {
        bodyHtml = `<div class="msk-ann-content" style="flex:1; display:flex; align-items:center; line-height:1.25; margin:0;">${content}</div>`;
      }

      container.innerHTML = `
        <div class="msk-ann-bg-layer" style="position:absolute; inset:0; z-index:0; pointer-events:none; background:${currentBg}; opacity:${bgOpacityVal};"></div>
        <div class="msk-ann-inner" style="position:relative; z-index:1; opacity:${textOpacityVal}; padding:${padHang}; align-items:center; box-sizing:border-box;">
          ${bodyHtml}
          <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
            ${ctaHtml}
            ${closeBtnHtml}
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Rotator Zamanlayıcısı (4.5s döngü, hover durdurur)
      if (isRotator) {
        var rotItems = container.querySelectorAll('.msk-rotator-item');
        if (rotItems && rotItems.length > 1) {
          var rotIdx = 0;
          var isPaused = false;
          container.addEventListener('mouseenter', function () { isPaused = true; });
          container.addEventListener('mouseleave', function () { isPaused = false; });
          setInterval(function () {
            if (isPaused) return;
            var prev = rotItems[rotIdx];
            rotIdx = (rotIdx + 1) % rotItems.length;
            var next = rotItems[rotIdx];
            if (prev) {
              prev.style.opacity = '0';
              prev.style.transform = 'translateY(-8px)';
              prev.style.position = 'absolute';
              prev.style.pointerEvents = 'none';
            }
            if (next) {
              next.style.opacity = '1';
              next.style.transform = 'translateY(0)';
              next.style.position = 'relative';
              next.style.pointerEvents = 'auto';
            }
          }, 4500);
        }
      }
    }

    if (activeUrl) {
      container.style.cursor = 'pointer';
      container.addEventListener('click', function(e) {
        if (e.target.closest('.msk-ann-close-btn') || e.target.closest('a')) return;
        window.open(activeUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // Kapatma Aksiyonu (Yalnızca üst asılı bant için)
    if (!isFloating) {
      var closeBtn = container.querySelector('.msk-ann-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          container.style.opacity = '0';
          container.style.transform = 'translateY(-100%)';
          setTimeout(function () {
            if (container.parentNode) container.parentNode.removeChild(container);
          }, 260);

          try {
            sessionStorage.setItem('msk_dismissed_' + item.id, 'true');
          } catch (_) {}
        });
      }
    }
  }

  function setupHeaderTrigger(activeItems, meta, currentItem) {
    var triggerBtn = document.getElementById('mskAnnTriggerBtn');
    var badge = document.getElementById('mskAnnBadge');
    if (!triggerBtn) return;

    triggerBtn.style.display = 'inline-flex';
    if (!activeItems || activeItems.length === 0) {
      if (badge) badge.style.display = 'none';
      return;
    }
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

      injectStyles();
      var popover = document.createElement('div');
      popover.id = 'mskAnnPopoverMenu';
      popover.className = 'msk-ann-popover';
      popover.style.position = 'fixed';
      popover.style.zIndex = '10001';
      popover.style.top = '84px';
      popover.style.right = '20px';
      try {
        var rect = triggerBtn.getBoundingClientRect();
        if (rect && rect.bottom > 0) {
          popover.style.top = (Math.round(rect.bottom) + 8) + 'px';
          var rightDist = Math.max(16, Math.round(window.innerWidth - rect.right));
          popover.style.right = rightDist + 'px';
        }
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
        var topB = document.getElementById('mskActiveTopContainer');
        var floatB = document.getElementById('mskActiveFloatingContainer');
        var floatTab = document.getElementById('mskActiveFloatingTab');
        if (topB || floatB || floatTab) {
          if (topB && topB.parentNode) topB.parentNode.removeChild(topB);
          if (floatB && floatB.parentNode) floatB.parentNode.removeChild(floatB);
          if (floatTab && floatTab.parentNode) floatTab.parentNode.removeChild(floatTab);
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
        if (!popover.contains(ev.target) && !triggerBtn.contains(ev.target)) {
          if (popover.parentNode) popover.parentNode.removeChild(popover);
          document.removeEventListener('click', closeOut);
        }
      });
    };
  }

  function initAnnouncementLoader() {
    injectStyles();
    var apiUrl = (window.SITE_CONFIG && window.SITE_CONFIG.apiUrl)
      ? window.SITE_CONFIG.apiUrl
      : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8787/api'
        : 'https://msklabsdesk-backend.msklabs-org.workers.dev/api');

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

        // 1. Üst Şerit Kanalı (top_hanging) - Dizin Tabanlı Kusursuz Nöbetleşe (Round-Robin)
        var topPool = activeItems.filter(function (it) {
          return (it.placement || meta.placement || 'top_hanging') === 'top_hanging';
        });
        if (topPool.length > 0) {
          var lastTopIdx = -1;
          try { lastTopIdx = parseInt(localStorage.getItem('msk_last_top_idx') || '-1', 10); } catch (_) {}
          var nextTopIdx = (isNaN(lastTopIdx) || lastTopIdx < 0 || lastTopIdx >= topPool.length - 1) ? 0 : (lastTopIdx + 1);
          var chosenTop = topPool[nextTopIdx];
          try { localStorage.setItem('msk_last_top_idx', nextTopIdx.toString()); } catch (_) {}

          var isTopDismissed = false;
          try { isTopDismissed = sessionStorage.getItem('msk_dismissed_' + chosenTop.id) === 'true'; } catch (_) {}
          if (chosenTop && !isTopDismissed) {
            renderAnnouncementBanner(chosenTop, meta, activeItems);
          }
        }

        // 2. Sağ ve Sol Kart Kanalı (floating) - Dizin Tabanlı Kusursuz Nöbetleşe (Round-Robin)
        var floatPool = activeItems.filter(function (it) {
          return it.placement === 'left_floating' || it.placement === 'right_floating';
        });
        if (floatPool.length > 0) {
          var lastFloatIdx = -1;
          try { lastFloatIdx = parseInt(localStorage.getItem('msk_last_float_idx') || '-1', 10); } catch (_) {}
          var nextFloatIdx = (isNaN(lastFloatIdx) || lastFloatIdx < 0 || lastFloatIdx >= floatPool.length - 1) ? 0 : (lastFloatIdx + 1);
          var chosenFloat = floatPool[nextFloatIdx];
          try { localStorage.setItem('msk_last_float_idx', nextFloatIdx.toString()); } catch (_) {}

          var isFloatDismissed = false;
          try { isFloatDismissed = sessionStorage.getItem('msk_dismissed_' + chosenFloat.id) === 'true'; } catch (_) {}
          if (chosenFloat && !isFloatDismissed) {
            renderAnnouncementBanner(chosenFloat, meta, activeItems);
          }
        }

        // Header sağ megafon / zil butonunu hazırla
        setupHeaderTrigger(activeItems, meta, activeItems[0]);
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
