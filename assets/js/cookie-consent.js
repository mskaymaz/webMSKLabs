/**
 * MSKLabs — Çerez & GDPR/KVKK Rıza Bildirimi (Cookie Consent Banner)
 * Google AdSense & AB Kullanıcı Rızası Politikası Uyumlu
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'msk_cookie_consent';
  if (localStorage.getItem(STORAGE_KEY) === 'accepted') return;

  function getLang() {
    var urlParams = new URLSearchParams(window.location.search);
    var langParam = urlParams.get('lang');
    if (langParam && ['tr', 'en', 'ar'].indexOf(langParam.toLowerCase()) !== -1) {
      return langParam.toLowerCase();
    }
    var htmlLang = document.documentElement.getAttribute('lang') || 'tr';
    return ['tr', 'en', 'ar'].indexOf(htmlLang.toLowerCase()) !== -1 ? htmlLang.toLowerCase() : 'tr';
  }

  var i18n = {
    tr: {
      text: 'Sitemizde kullanıcı deneyimini iyileştirmek, temel işlevleri sunmak ve analitik/reklam hizmetleri sağlamak amacıyla çerezler kullanılmaktadır.',
      linkText: 'Gizlilik ve Çerez Politikası',
      accept: 'Kabul Et'
    },
    en: {
      text: 'We use cookies to improve user experience, deliver essential features, and provide analytics and advertising.',
      linkText: 'Privacy & Cookie Policy',
      accept: 'Accept All'
    },
    ar: {
      text: 'نستخدم ملفات تعريف الارتباط لتحسين تجربة المستخدم وتوفير الميزات الأساسية والتحليلات وخدمات الإعلانات.',
      linkText: 'سياسة الخصوصية وملفات تعريف الارتباط',
      accept: 'قبول الكل'
    }
  };

  function initBanner() {
    if (document.getElementById('mskCookieConsentBanner')) return;

    var lang = getLang();
    var t = i18n[lang] || i18n.tr;
    var isRTL = lang === 'ar';

    var basePath = window.location.pathname.indexOf('/apps/') !== -1 || window.location.pathname.indexOf('/blog/') !== -1 ? '../' : '';

    var banner = document.createElement('div');
    banner.id = 'mskCookieConsentBanner';
    banner.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    banner.style.cssText = [
      'position: fixed',
      'bottom: 20px',
      'left: 50%',
      'transform: translateX(-50%)',
      'width: calc(100% - 32px)',
      'max-width: 760px',
      'padding: 16px 20px',
      'background: var(--bg-card, #ffffff)',
      'color: var(--text-main, #0f172a)',
      'border: 1px solid var(--border-color, #cbd5e1)',
      'border-radius: 16px',
      'box-shadow: 0 10px 30px rgba(0,0,0,0.15)',
      'display: flex',
      'align-items: center',
      'justify-content: space-between',
      'gap: 16px',
      'z-index: 999999',
      'font-family: inherit',
      'font-size: 0.88rem',
      'line-height: 1.4',
      'backdrop-filter: blur(12px)',
      'transition: opacity 0.3s ease, transform 0.3s ease'
    ].join(';');

    var content = document.createElement('div');
    content.style.cssText = 'flex: 1;';
    content.innerHTML = '<span>🍪 ' + t.text + ' </span><a href="' + basePath + 'privacy.html" style="color: var(--primary-color, #0284c7); text-decoration: underline; font-weight: 600;">' + t.linkText + '</a>';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = t.accept;
    btn.style.cssText = [
      'background: var(--primary-color, #0284c7)',
      'color: #ffffff',
      'border: none',
      'padding: 10px 22px',
      'border-radius: 9999px',
      'font-weight: 700',
      'font-size: 0.88rem',
      'cursor: pointer',
      'white-space: nowrap',
      'transition: opacity 0.2s ease, transform 0.2s ease'
    ].join(';');

    btn.addEventListener('mouseenter', function() { btn.style.opacity = '0.9'; });
    btn.addEventListener('mouseleave', function() { btn.style.opacity = '1'; });

    btn.addEventListener('click', function() {
      localStorage.setItem(STORAGE_KEY, 'accepted');
      banner.style.opacity = '0';
      banner.style.transform = 'translate(-50%, 20px)';
      setTimeout(function() {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
      }, 300);
    });

    banner.appendChild(content);
    banner.appendChild(btn);

    // Responsive mobilde buton alta insin
    if (window.innerWidth <= 600) {
      banner.style.flexDirection = 'column';
      banner.style.alignItems = 'stretch';
      btn.style.textAlign = 'center';
      btn.style.width = '100%';
    }

    document.body.appendChild(banner);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBanner);
  } else {
    initBanner();
  }
})();
