/**
 * MSK Labs - Dynamic Ad Loader & Display Manager
 * Fetches active ad configurations from CMS API (/api/v1/ads) and applies
 * real-time dimensions, margins, alignment, and AdSense units to the web vitrine.
 */
(function () {
  'use strict';

  var SLOT_SELECTORS = {
    ad_header_top: ['.top-ad-banner', '.header-ad-container', '[data-ad-slot="header_top"]'],
    ad_sidebar_left: ['.desktop-ad-left-1', '[data-ad-slot="sidebar_left_1"]', '.desktop-ad-left', '[data-ad-slot="sidebar_left"]'],
    ad_sidebar_left_2: ['.desktop-ad-left-2', '[data-ad-slot="sidebar_left_2"]'],
    ad_sidebar_right: ['.desktop-ad-right-1', '[data-ad-slot="sidebar_right_1"]', '.desktop-ad-right', '[data-ad-slot="sidebar_right"]'],
    ad_sidebar_right_2: ['.desktop-ad-right-2', '[data-ad-slot="sidebar_right_2"]'],
    ad_in_content: ['.in-content-ad-1', '.in-content-ad:not(.in-content-ad-2)', '[data-ad-slot="in_content"]', '.infeed-ad-between'],
    ad_in_content_2: ['.in-content-ad-2', '[data-ad-slot="in_content_2"]'],
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
    if (key === 'ad_sidebar_left_2') {
      var leftAside = document.querySelector('aside.desktop-ad-left');
      if (leftAside) {
        var elL2 = document.createElement('div');
        elL2.className = 'desktop-ad-left-2';
        elL2.setAttribute('data-ad-slot', 'sidebar_left_2');
        elL2.innerHTML = '<div class="ad-placeholder">Sol Dikey Reklam 2</div>';
        leftAside.appendChild(elL2);
        return [elL2];
      }
    }
    if (key === 'ad_sidebar_right_2') {
      var rightAside = document.querySelector('aside.desktop-ad-right');
      if (rightAside) {
        var elR2 = document.createElement('div');
        elR2.className = 'desktop-ad-right-2';
        elR2.setAttribute('data-ad-slot', 'sidebar_right_2');
        elR2.innerHTML = '<div class="ad-placeholder">Sağ Dikey Reklam 2</div>';
        rightAside.appendChild(elR2);
        return [elR2];
      }
    }
    if (key === 'ad_in_content_2') {
      var contentParent = document.querySelector('.blog-content-body') ||
        document.querySelector('.static-page-card') ||
        document.querySelector('.portfolio-container');
      if (contentParent) {
        var elC2 = document.createElement('div');
        elC2.className = 'in-content-ad in-content-ad-2';
        elC2.setAttribute('data-ad-slot', 'in_content_2');
        elC2.innerHTML = '<div class="ad-placeholder">Sayfa Ortası Reklam 2</div>';
        contentParent.appendChild(elC2);
        return [elC2];
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
    if (!adConfig) return false;
    var pageKey = getCurrentPageKey();

    // 1. Sayfa-Reklam Dağılım Matrisi Kontrolü (Varsa doğrudan bağlayıcıdır)
    if (matrix && matrix[pageKey] && typeof matrix[pageKey][key] === 'boolean') {
      return matrix[pageKey][key] && (adConfig.is_enabled !== false);
    }

    // 2. Matriste tanımlı değilse adConfig bazlı kapsam kontrolü
    if (!adConfig.is_enabled) return false;
    return isAdAllowedOnCurrentPage(adConfig);
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
      // Kullanıcı "Özel Sayfalar" seçip alt yolu boş bıraktıysa kurumsal sayfaları hedefler
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

        var matrix = data.matrix || null;

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
              if (isAllowed) {
                applyAdToElement(containers[c], adConfig, isMobile);
              } else {
                // Pasife alınmış reklam yerleşimini vitrinde sıfır boşlukla gizle
                collapseElement(containers[c]);
              }
            }
          }
        }

        // Yan Sütun Temizliği: Sol veya sağ sütunun tüm reklamları pasifse sütunu sıfırla
        var isLeftActive = isSlotActiveForCurrentPage('ad_sidebar_left', adsMap['ad_sidebar_left'], matrix) ||
                           isSlotActiveForCurrentPage('ad_sidebar_left_2', adsMap['ad_sidebar_left_2'], matrix);
        var leftAside = document.querySelector('aside.desktop-ad-left');
        if (leftAside && !isLeftActive) {
          collapseElement(leftAside);
          leftAside.style.width = '0px';
        }

        var isRightActive = isSlotActiveForCurrentPage('ad_sidebar_right', adsMap['ad_sidebar_right'], matrix) ||
                            isSlotActiveForCurrentPage('ad_sidebar_right_2', adsMap['ad_sidebar_right_2'], matrix);
        var rightAside = document.querySelector('aside.desktop-ad-right');
        if (rightAside && !isRightActive) {
          collapseElement(rightAside);
          rightAside.style.width = '0px';
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
