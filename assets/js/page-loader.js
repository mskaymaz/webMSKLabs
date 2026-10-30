/**
 * MSK Labs - Dynamic Corporate Page Content Loader
 * File: page-loader.js
 * Automatically hydrates static corporate pages (about, privacy, terms, contact, etc.)
 * with live published content managed from MSKLabsDesk Headless CMS.
 */

(function () {
  'use strict';

  var pathname = window.location.pathname.replace(/\\/g, '/');
  var pageName = pathname.substring(pathname.lastIndexOf('/') + 1).toLowerCase() || 'index.html';

  var SLUG_MAP = {
    'about.html': 'about',
    'who-we-are.html': 'about',
    'bizkimiz.html': 'about',
    'destek.html': 'support',
    'support.html': 'support',
    'faq.html': 'faq',
  };

  var slug = SLUG_MAP[pageName];
  if (!slug && (pageName === 'page.html' || pageName === 'pages.html')) {
    var params = new URLSearchParams(window.location.search);
    slug = params.get('slug');
  }

  if (!slug) return; // İlgili kurumsal sayfa değilse sonlandır

  var apiUrl = (window.SITE_CONFIG && window.SITE_CONFIG.apiUrl)
    ? window.SITE_CONFIG.apiUrl
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787/api'
    : 'https://msklabsdesk-backend.msklabs-org.workers.dev/api';

  var endpoint = apiUrl + '/v1/pages/' + encodeURIComponent(slug);

  function applyPageData(page) {
    if (!page) return;

    // 1. Kapak / Hero Görseli Güncellemesi
    if (page.hero_image) {
      var heroImg = document.querySelector('.about-hero-img, .page-hero-img, [data-page-hero]');
      if (heroImg) {
        heroImg.src = page.hero_image;
      }
    }

    // 2. Başlık Güncellemesi
    if (page.title_tr) {
      var titleTrEl = document.querySelector('h1.page-title .lang-tr, .page-title-text .lang-tr');
      if (titleTrEl) titleTrEl.textContent = page.title_tr;
    }
    if (page.title_en) {
      var titleEnEl = document.querySelector('h1.page-title .lang-en, .page-title-text .lang-en');
      if (titleEnEl) titleEnEl.textContent = page.title_en;
    }
    if (page.title_ar) {
      var titleArEl = document.querySelector('h1.page-title .lang-ar, .page-title-text .lang-ar');
      if (titleArEl) titleArEl.textContent = page.title_ar;
    }

    // 3. Statik İçerik Kartı Güncellemesi
    var card = document.querySelector('.static-page-card, .corporate-page-content');
    if (card) {
      if (card.hasAttribute('data-static-locked') || card.classList.contains('legal-content')) {
        return;
      }
      var trContentEl = card.querySelector('.lang-tr, [data-lang="tr"]');
      if (trContentEl && page.content_tr) {
        trContentEl.innerHTML = page.content_tr;
      }

      var enContentEl = card.querySelector('.lang-en, [data-lang="en"]');
      if (enContentEl && page.content_en) {
        enContentEl.innerHTML = page.content_en;
      }

      var arContentEl = card.querySelector('.lang-ar, [data-lang="ar"]');
      if (arContentEl && page.content_ar) {
        arContentEl.innerHTML = page.content_ar;
      }
    }

    // 4. Sayfa Özeti / Bilgi Kartı
    if (page.summary_tr) {
      var subTrEl = document.querySelector('#appMetaSub .lang-tr, .page-summary .lang-tr');
      if (subTrEl) subTrEl.textContent = page.summary_tr;
    }
    if (page.summary_en) {
      var subEnEl = document.querySelector('#appMetaSub .lang-en, .page-summary .lang-en');
      if (subEnEl) subEnEl.textContent = page.summary_en;
    }
    if (page.summary_ar) {
      var subArEl = document.querySelector('#appMetaSub .lang-ar, .page-summary .lang-ar');
      if (subArEl) subArEl.textContent = page.summary_ar;
    }
  }

  function fetchPageContent() {
    fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.success && data.page) {
          applyPageData(data.page);
        }
      })
      .catch(function (err) {
        // İstemci tarafında sunucu yoksa veya çevrim dışıysa mevcut statik HTML korunur
        console.info('[MSK PageLoader] Canlı içerik yüklenemedi, statik HTML devrede:', err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchPageContent);
  } else {
    fetchPageContent();
  }
})();
