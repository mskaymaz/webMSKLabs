/**
 * MSK Labs - Dynamic Ad Loader & Display Manager
 * Fetches active ad configurations from CMS API (/api/v1/ads) and applies
 * real-time dimensions, margins, alignment, and AdSense units to the web vitrine.
 */
(function () {
  'use strict';

  var SLOT_SELECTORS = {
    ad_sidebar_right: ['.desktop-ad-right', 'aside.desktop-ad-right', '[data-ad-slot="sidebar_right"]'],
    ad_sidebar_left: ['.desktop-ad-left', 'aside.desktop-ad-left', '[data-ad-slot="sidebar_left"]'],
    ad_in_content: ['.in-content-ad', '[data-ad-slot="in_content"]', '.infeed-ad-between'],
    ad_footer_bottom: ['.infeed-ad-container', '.desktop-ad-footer', '[data-ad-slot="footer_bottom"]'],
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
      return {
        w: isMobile ? 320 : 728,
        h: isMobile ? 50 : 90,
        isResponsive: true,
      };
    }
    var m = preset.match(/^(\d+)x(\d+)$/);
    if (m) {
      return {
        w: parseInt(m[1], 10),
        h: parseInt(m[2], 10),
        isResponsive: false,
      };
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
    if (scope === 'custom') {
      var targets = ad.target_paths || [];
      for (var j = 0; j < targets.length; j++) {
        var tgt = (targets[j] || '').trim().toLowerCase();
        if (!tgt) continue;
        if (tgt.indexOf('/') !== 0) tgt = '/' + tgt;
        if (path.toLowerCase().indexOf(tgt) !== -1) return true;
      }
      return false;
    }

    return true;
  }

  function applyAdToElement(el, ad, isMobile) {
    var isVertical = ad.slot_key === 'ad_sidebar_left' || ad.slot_key === 'ad_sidebar_right';

    // Mobilde dikey sütun reklamları gizlenir
    if (isMobile && isVertical) {
      el.style.display = 'none';
      return;
    }

    var cfg = isMobile ? ad.mobile : ad.desktop;
    var isDeviceActive = cfg ? (cfg.is_enabled !== false) : true;
    if (!isDeviceActive) {
      el.style.display = 'none';
      return;
    }

    // Boyut ayrıştırma
    var dim = parseDimensions(cfg.preset_size, cfg.custom_width, cfg.custom_height, isMobile);

    // Sabit duran hareketsiz üst panelin (header) yüksekliği
    var headerEl = document.querySelector('.site-header-sticky') || document.querySelector('header');
    var headerH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 136;

    var mTop = Number(cfg.margin_top) || 0;
    var mBottom = Number(cfg.margin_bottom) || 0;
    var mLeft = Number(cfg.margin_left) || 0;
    var mRight = Number(cfg.margin_right) || 0;
    var align = cfg.align || 'center';

    if (isVertical) {
      // 1. DİKEY REKLAMLAR: Üst marj sabit duran panelden (header) itibaren başlar
      el.style.display = 'block';
      el.style.width = dim.isResponsive ? '100%' : dim.w + 'px';
      el.style.marginTop = mTop + 'px';
      el.style.marginBottom = mBottom + 'px';
      el.style.marginLeft = mLeft + 'px';
      el.style.marginRight = mRight + 'px';

      // Sticky: Kaydırma sırasında da sabit üst panelin hemen altındaki marj mesafesinde kilitlenir
      if (!isMobile && cfg.is_sticky) {
        el.style.position = 'sticky';
        el.style.top = (headerH + mTop) + 'px';
      } else {
        el.style.position = 'static';
        el.style.top = 'auto';
      }
    } else {
      // 2. YATAY REKLAMLAR: Bölümler arası ve sayfa altı reklamları için kusursuz yatay ortalama
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
      // AdSense ins etiketi enjeksiyonu
      el.innerHTML = '<ins class="adsbygoogle" style="display:inline-block;width:' +
        (dim.isResponsive ? '100%' : dim.w + 'px') + ';height:' + dim.h + 'px" data-ad-client="' +
        ad.ad_client + '" data-ad-slot="' + ad.ad_slot + '"></ins>';
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {}
    } else if (ph) {
      // Geliştirme/Önizleme modu: Boyut ve başlık bilgisini güncelle
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

        // Tanımlı tüm yerleşimleri tara ve uygula
        for (var key in SLOT_SELECTORS) {
          if (Object.prototype.hasOwnProperty.call(SLOT_SELECTORS, key)) {
            var containers = findContainers(SLOT_SELECTORS[key]);
            var adConfig = adsMap[key];

            for (var c = 0; c < containers.length; c++) {
              if (adConfig && adConfig.is_enabled && isAdAllowedOnCurrentPage(adConfig)) {
                applyAdToElement(containers[c], adConfig, isMobile);
              } else {
                // Pasife alınmış, bu sayfada filtrelenmiş veya silinmiş reklam yerleşimini vitrinde gizle
                containers[c].style.display = 'none';
              }
            }
          }
        }
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
