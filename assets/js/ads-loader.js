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

    // Reklam görünür yapılır
    el.style.display = isVertical ? 'block' : 'flex';

    // Marj ayarları uygulanır
    if (cfg.margin_top !== undefined) el.style.marginTop = cfg.margin_top + 'px';
    if (cfg.margin_bottom !== undefined) el.style.marginBottom = cfg.margin_bottom + 'px';
    if (cfg.margin_left !== undefined) el.style.marginLeft = cfg.margin_left + 'px';
    if (cfg.margin_right !== undefined) el.style.marginRight = cfg.margin_right + 'px';

    // Sticky ayarı (yalnızca masaüstü)
    if (!isMobile && cfg.is_sticky) {
      el.style.position = 'sticky';
      el.style.top = '20px';
    }

    // Hizalama (Yatay reklamlar için)
    if (!isVertical) {
      var alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
      el.style.justifyContent = alignMap[cfg.align || 'center'] || 'center';
    }

    // Boyut ayrıştırma
    var dim = parseDimensions(cfg.preset_size, cfg.custom_width, cfg.custom_height, isMobile);
    if (!dim.isResponsive && dim.w > 0) {
      if (isVertical) {
        el.style.width = dim.w + 'px';
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
      ph.style.minHeight = dim.h + 'px';
      ph.style.width = dim.isResponsive ? '100%' : dim.w + 'px';
      ph.innerHTML = (ad.title || 'Reklam Alanı') + '<br><small>(' + dim.w + 'x' + dim.h + ' px)</small>';
    }
  }

  function initAdsLoader() {
    var apiUrl = (window.SITE_CONFIG && window.SITE_CONFIG.apiUrl)
      ? window.SITE_CONFIG.apiUrl
      : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8787/api'
        : 'https://api.msklabs.org/api');

    fetch(apiUrl + '/v1/ads')
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
              if (adConfig && adConfig.is_enabled) {
                applyAdToElement(containers[c], adConfig, isMobile);
              } else {
                // Pasife alınmış veya silinmiş reklam yerleşimini vitrinde gizle
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
