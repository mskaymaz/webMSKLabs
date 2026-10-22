/**
 * MSK Labs - Dynamic Ad Loader & Display Manager
 * Fetches active ad configurations from CMS API (/api/v1/ads) and applies
 * real-time dimensions, margins, alignment, and AdSense units to the web vitrine.
 */
(function () {
  'use strict';

  var SLOT_SELECTORS = {
    ad_header_top: ['.top-ad-banner', '.header-ad-container', '[data-ad-slot="header_top"]', '[data-ad-slot="ad_header_top"]'],
    ad_sidebar_left: ['[data-ad-slot="ad_sidebar_left"]', '.desktop-ad-left-1'],
    ad_sidebar_left_2: ['[data-ad-slot="ad_sidebar_left_2"]', '.desktop-ad-left-2'],
    ad_sidebar_right: ['[data-ad-slot="ad_sidebar_right"]', '.desktop-ad-right-1'],
    ad_sidebar_right_2: ['[data-ad-slot="ad_sidebar_right_2"]', '.desktop-ad-right-2'],
    ad_in_content: ['[data-ad-slot="in_content"]', '[data-ad-slot="ad_in_content"]', '.in-content-ad-1', '.in-content-ad:not(.in-content-ad-2)', '.infeed-ad-between'],
    ad_in_content_2: ['[data-ad-slot="in_content_2"]', '[data-ad-slot="ad_in_content_2"]', '.in-content-ad-2'],
    ad_footer_bottom: ['[data-ad-slot="footer_bottom"]', '[data-ad-slot="ad_footer_bottom"]', '.infeed-ad-container', '.desktop-ad-footer'],
  };

  function parseDimensions(presetSize, customW, customH, isMobile) {
    var preset = (presetSize || 'RESPONSIVE').trim();
    if (preset === 'CUSTOM') {
      return {
        w: Number(customW) || (isMobile ? 320 : 300),
        h: Number(customH) || (isMobile ? 50 : 250),
        isResponsive: false,
      };
    }
    if (preset === 'RESPONSIVE') {
      return { w: isMobile ? 320 : 728, h: isMobile ? 50 : 90, isResponsive: true };
    }
    var m = preset.match(/^(\d+)x(\d+)$/);
    if (m) {
      return { w: parseInt(m[1], 10), h: parseInt(m[2], 10), isResponsive: false };
    }
    return { w: isMobile ? 320 : 300, h: isMobile ? 50 : 250, isResponsive: false };
  }

  function findContainers(selectors) {
    var found = [];
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        if (found.indexOf(nodes[j]) === -1) {
          found.push(nodes[j]);
        }
      }
    }
    return found;
  }

  var CORPORATE_PAGES = [
    'contact.html', 'about.html', 'destek.html', 'bizkimiz.html',
    'who-we-are.html', 'faq.html', 'privacy.html', 'terms.html',
    'iletisim.html', 'hakkimizda.html'
  ];

  function collapseElement(el) {
    if (!el) return;
    el.style.display = 'none';
    el.style.marginTop = '0px';
    el.style.marginBottom = '0px';
    el.style.marginLeft = '0px';
    el.style.marginRight = '0px';
    el.style.padding = '0px';
    el.style.height = '0px';
    el.style.minHeight = '0px';
    el.style.border = 'none';
    el.setAttribute('data-ad-disabled', 'true');
  }

  function getCurrentPageKey() {
    var rawPath = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    if (rawPath === '' || rawPath === '/' || rawPath.endsWith('/')) {
      return 'index.html';
    }
    var segments = rawPath.split('/').filter(Boolean);
    var file = segments.length ? segments[segments.length - 1] : 'index.html';
    if (file.indexOf('.html') === -1) file = file + '.html';
    if (rawPath.indexOf('/blog/') !== -1 || file === 'blog.html') return 'blog.html';
    if (rawPath.indexOf('/apps/') !== -1 || file === 'apps.html' || file === 'app.html') return 'apps.html';
    if (file === 'bizkimiz.html') return 'who-we-are.html';
    return file;
  }

  function setupSidebarSlots(asideSelector, slot1Key, slot2Key) {
    var aside = document.querySelector(asideSelector);
    if (!aside) return;

    var isLeft = slot1Key === 'ad_sidebar_left';
    var slot1 = aside.querySelector('[data-ad-slot="' + slot1Key + '"]');
    if (!slot1) {
      slot1 = document.createElement('div');
      slot1.className = 'desktop-ad-slot ' + (isLeft ? 'desktop-ad-left-1' : 'desktop-ad-right-1');
      slot1.setAttribute('data-ad-slot', slot1Key);
      var existingPh = aside.querySelector('.ad-placeholder');
      if (existingPh && !existingPh.closest('[data-ad-slot]')) {
        slot1.appendChild(existingPh);
      } else {
        slot1.innerHTML = '<div class="ad-placeholder">' + (isLeft ? 'Sol Dikey Reklam 1' : 'Sağ Dikey Reklam 1') + '</div>';
      }
      aside.appendChild(slot1);
    }

    var slot2 = aside.querySelector('[data-ad-slot="' + slot2Key + '"]');
    if (!slot2) {
      slot2 = document.createElement('div');
      slot2.className = 'desktop-ad-slot ' + (isLeft ? 'desktop-ad-left-2' : 'desktop-ad-right-2');
      slot2.setAttribute('data-ad-slot', slot2Key);
      slot2.innerHTML = '<div class="ad-placeholder">' + (isLeft ? 'Sol Dikey Reklam 2 (Askılı)' : 'Sağ Dikey Reklam 2 (Askılı)') + '</div>';
      aside.appendChild(slot2);
    }
  }

  function ensureContainer(key) {
    if (key === 'ad_header_top') {
      var headerEl = document.querySelector('.site-header-sticky') || document.querySelector('header');
      if (headerEl && headerEl.parentNode) {
        var elTop = document.createElement('div');
        elTop.className = 'top-ad-banner';
        elTop.setAttribute('data-ad-slot', 'header_top');
        elTop.innerHTML = '<div class="ad-placeholder">Sayfa Başı Reklam (Top Banner)</div>';
        headerEl.parentNode.insertBefore(elTop, headerEl.nextSibling);
        return [elTop];
      }
    }
    if (key === 'ad_in_content_2') {
      var hubGrid = document.querySelector('.hub-grid');
      if (hubGrid && hubGrid.children.length >= 2) {
        var elC2 = document.createElement('div');
        elC2.className = 'in-content-ad in-content-ad-2';
        elC2.setAttribute('data-ad-slot', 'in_content_2');
        elC2.style.gridColumn = '1 / -1';
        elC2.innerHTML = '<div class="ad-placeholder">Sayfa Ortası Reklam 2 (In-Content 2)</div>';
        hubGrid.insertBefore(elC2, hubGrid.children[2]);
        return [elC2];
      }
      var contentParent = document.querySelector('.blog-content-body') ||
        document.querySelector('.static-page-card') ||
        document.querySelector('.portfolio-container');
      if (contentParent) {
        var elC2Alt = document.createElement('div');
        elC2Alt.className = 'in-content-ad in-content-ad-2';
        elC2Alt.setAttribute('data-ad-slot', 'in_content_2');
        elC2Alt.innerHTML = '<div class="ad-placeholder">Sayfa Ortası Reklam 2</div>';
        contentParent.appendChild(elC2Alt);
        return [elC2Alt];
      }
    }
    if (key === 'ad_footer_bottom') {
      var targetParent = document.querySelector('.portfolio-container') ||
        document.querySelector('.blog-detail-container') ||
        document.querySelector('.blog-container') ||
        document.querySelector('main');
      if (targetParent) {
        var el = document.createElement('div');
        el.className = 'infeed-ad-container';
        el.setAttribute('data-ad-slot', 'footer_bottom');
        var ph = document.createElement('div');
        ph.className = 'ad-placeholder';
        ph.textContent = 'Sayfa Sonu Reklamı (Bottom Banner)';
        el.appendChild(ph);
        targetParent.appendChild(el);
        return [el];
      }
    }
    return [];
  }

  function isSlotActiveForCurrentPage(key, adConfig, matrix) {
    if (!adConfig || adConfig.is_deleted) return false;
    var pageKey = getCurrentPageKey();

    // 1. Sayfa-Reklam Dağılım Matrisi Kontrolü (Öncelikli ve doğrudan bağlayıcı)
    if (matrix && matrix[pageKey] && typeof matrix[pageKey][key] === 'boolean') {
      return matrix[pageKey][key];
    }

    // 2. Matriste bu sayfa/yuva tanımlı değilse adConfig genel ayarını kullan
    return Boolean(adConfig.is_enabled) && isAdAllowedOnCurrentPage(adConfig);
  }

  function isAdAllowedOnCurrentPage(ad) {
    if (!ad) return false;

    var rawPath = (window.location.pathname || '').replace(/\\/g, '/');
    var path = rawPath;
    if (path === '' || path === '/' || path.endsWith('/')) {
      path = path + 'index.html';
    }
    if (path.indexOf('/') !== 0) path = '/' + path;

    // 1. Hariç tutulan sayfalar (Blacklist) kontrolü
    var excluded = ad.excluded_paths || [];
    for (var i = 0; i < excluded.length; i++) {
      var ex = (excluded[i] || '').trim().toLowerCase();
      if (!ex) continue;
      if (ex.indexOf('/') !== 0) ex = '/' + ex;
      if (path.toLowerCase().indexOf(ex) !== -1 || (ex === '/index.html' && (rawPath === '/' || rawPath === ''))) {
        return false;
      }
    }

    var lowerPath = path.toLowerCase();
    var isCorporatePage = false;
    for (var k = 0; k < CORPORATE_PAGES.length; k++) {
      if (lowerPath.indexOf(CORPORATE_PAGES[k]) !== -1) {
        isCorporatePage = true;
        break;
      }
    }

    // 2. Kapsam (Target Scope) kontrolü
    var scope = ad.target_scope || 'all';
    if (scope === 'all') return true;
    if (scope === 'home') {
      return path.endsWith('/index.html') && path.indexOf('/blog/') === -1 && path.indexOf('/apps/') === -1;
    }
    if (scope === 'blog') {
      return path.indexOf('/blog/') !== -1 || path.indexOf('blog.html') !== -1;
    }
    if (scope === 'apps') {
      return path.indexOf('/apps/') !== -1 || path.indexOf('apps.html') !== -1;
    }
    if (scope === 'corporate') {
      return isCorporatePage;
    }
    if (scope === 'custom') {
      var targets = ad.target_paths || [];
      if (!targets || targets.length === 0) {
        return isCorporatePage;
      }
      for (var j = 0; j < targets.length; j++) {
        var tgt = (targets[j] || '').trim().toLowerCase();
        if (!tgt) continue;
        var cleanTgt = tgt.replace(/^\//, '');
        if (cleanTgt && lowerPath.indexOf(cleanTgt) !== -1) return true;
      }
      return false;
    }

    return true;
  }

  function applyAdToElement(el, ad, isMobile) {
    var isVertical = (ad.slot_key || '').indexOf('sidebar') !== -1;

    // Mobilde dikey sütun reklamları gizlenir
    if (isMobile && isVertical) {
      collapseElement(el);
      return;
    }

    var cfg = isMobile ? ad.mobile : ad.desktop;
    var dim = parseDimensions(cfg ? cfg.preset_size : null, cfg ? cfg.custom_width : null, cfg ? cfg.custom_height : null, isMobile);

    var mTop = Number(cfg ? cfg.margin_top : 0) || 0;
    var mBottom = Number(cfg ? cfg.margin_bottom : 0) || 0;
    var mLeft = Number(cfg ? cfg.margin_left : 0) || 0;
    var mRight = Number(cfg ? cfg.margin_right : 0) || 0;
    var align = (cfg && cfg.align) ? cfg.align : 'center';

    if (isVertical) {
      el.style.display = 'block';
      el.style.width = dim.isResponsive ? '100%' : dim.w + 'px';
      el.style.marginTop = mTop + 'px';
      el.style.marginBottom = mBottom + 'px';
      el.style.marginLeft = mLeft + 'px';
      el.style.marginRight = mRight + 'px';
      el.style.position = 'static';
      el.style.top = 'auto';
    } else {
      el.style.display = 'flex';
      el.style.width = '100%';
      el.style.boxSizing = 'border-box';
      el.style.marginTop = mTop + 'px';
      el.style.marginBottom = mBottom + 'px';

      if (align === 'center') {
        el.style.justifyContent = 'center';
        el.style.marginLeft = 'auto';
        el.style.marginRight = 'auto';
      } else if (align === 'left') {
        el.style.justifyContent = 'flex-start';
        el.style.marginLeft = mLeft + 'px';
        el.style.marginRight = 'auto';
      } else if (align === 'right') {
        el.style.justifyContent = 'flex-end';
        el.style.marginLeft = 'auto';
        el.style.marginRight = mRight + 'px';
      }
    }

    // Yer tutucu veya Google AdSense içeriği
    var ph = el.querySelector('.ad-placeholder');
    if (ad.ad_client && ad.ad_slot) {
      el.innerHTML = '<ins class="adsbygoogle" style="display:inline-block;width:' +
        (dim.isResponsive ? '100%' : dim.w + 'px') + ';height:' + dim.h + 'px" data-ad-client="' +
        ad.ad_client + '" data-ad-slot="' + ad.ad_slot + '"></ins>';
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {}
    } else if (ph) {
      ph.style.width = dim.isResponsive ? '100%' : dim.w + 'px';
      ph.style.maxWidth = '100%';
      ph.style.height = dim.h + 'px';
      ph.style.minHeight = dim.h + 'px';
      ph.style.boxSizing = 'border-box';
      ph.style.display = 'flex';
      ph.style.flexDirection = 'column';
      ph.style.alignItems = 'center';
      ph.style.justifyContent = 'center';
      ph.innerHTML = (ad.title || 'Reklam Alanı') + '<br><small>(' + dim.w + 'x' + dim.h + ' px)</small>';
    }
  }

  function finalizeSidebar(asideSelector, slot1Key, slot2Key, adsMap, matrix, isMobile) {
    var aside = document.querySelector(asideSelector);
    if (!aside) return;

    var ad1 = adsMap[slot1Key];
    var ad2 = adsMap[slot2Key];
    var is1Active = isSlotActiveForCurrentPage(slot1Key, ad1, matrix);
    var is2Active = isSlotActiveForCurrentPage(slot2Key, ad2, matrix);

    if (isMobile || (!is1Active && !is2Active)) {
      collapseElement(aside);
      aside.style.width = '0px';
      return;
    }

    aside.style.display = 'block';
    aside.style.visibility = 'visible';
    aside.style.margin = '0';
    aside.style.padding = '0';

    var w1 = (is1Active && ad1) ? parseDimensions(ad1.desktop ? ad1.desktop.preset_size : null, ad1.desktop ? ad1.desktop.custom_width : null, ad1.desktop ? ad1.desktop.custom_height : null, false).w : 0;
    var w2 = (is2Active && ad2) ? parseDimensions(ad2.desktop ? ad2.desktop.preset_size : null, ad2.desktop ? ad2.desktop.custom_width : null, ad2.desktop ? ad2.desktop.custom_height : null, false).w : 0;
    var maxW = Math.max(w1, w2, 120);
    aside.style.width = maxW + 'px';

    var headerEl = document.querySelector('.site-header-sticky') || document.querySelector('header');
    var headerH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 136;
    var isSticky = (is1Active && ad1 && ad1.desktop && ad1.desktop.is_sticky) ||
                   (is2Active && ad2 && ad2.desktop && ad2.desktop.is_sticky);

    if (isSticky) {
      var topMargin = (is1Active && ad1 && ad1.desktop) ? (Number(ad1.desktop.margin_top) || 0) : 0;
      aside.style.position = 'sticky';
      aside.style.top = (headerH + topMargin) + 'px';
    } else {
      aside.style.position = 'static';
      aside.style.top = 'auto';
    }
  }

  function initAdsLoader() {
    var apiUrl = (window.SITE_CONFIG && window.SITE_CONFIG.apiUrl)
      ? window.SITE_CONFIG.apiUrl
      : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8787/api'
        : 'https://api.msklabs.org/api');

    // Tarayıcı önbelleğini atlayarak anlık güncellemeyi sağlar
    fetch(apiUrl + '/v1/ads?_t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Ads API HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var ads = data.ads || [];
        var adsMap = {};
        for (var i = 0; i < ads.length; i++) {
          if (ads[i].slot_key) {
            adsMap[ads[i].slot_key] = ads[i];
          }
        }

        var isMobile = window.innerWidth <= 850;
        var matrix = data.matrix || null;

        // Yan sütunları çift askılı yuva yapısına hazırla
        setupSidebarSlots('aside.desktop-ad-left', 'ad_sidebar_left', 'ad_sidebar_left_2');
        setupSidebarSlots('aside.desktop-ad-right', 'ad_sidebar_right', 'ad_sidebar_right_2');

        // Tanımlı tüm yerleşimleri tara ve uygula
        for (var key in SLOT_SELECTORS) {
          if (Object.prototype.hasOwnProperty.call(SLOT_SELECTORS, key)) {
            var containers = findContainers(SLOT_SELECTORS[key]);
            var adConfig = adsMap[key];
            var isAllowed = isSlotActiveForCurrentPage(key, adConfig, matrix);

            if (isAllowed && containers.length === 0) {
              containers = ensureContainer(key);
            }

            for (var c = 0; c < containers.length; c++) {
              if (isAllowed && adConfig) {
                applyAdToElement(containers[c], adConfig, isMobile);
              } else {
                collapseElement(containers[c]);
              }
            }
          }
        }

        // Yan Sütun Temizliği ve Sticky / Statik Sonlandırma
        finalizeSidebar('aside.desktop-ad-left', 'ad_sidebar_left', 'ad_sidebar_left_2', adsMap, matrix, isMobile);
        finalizeSidebar('aside.desktop-ad-right', 'ad_sidebar_right', 'ad_sidebar_right_2', adsMap, matrix, isMobile);
      })
      .catch(function (err) {
        console.warn('[MSK Ads Loader] Reklam ayarları yüklenemedi:', err.message);
      });
  }

  // DOM Yüklendiğinde Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdsLoader);
  } else {
    initAdsLoader();
  }

  // Ekran boyutu değiştiğinde marj ve gizleme kurallarını tazele
  var resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initAdsLoader, 250);
  });
})();
