/**
 * MSKLabs — Çerez & GDPR/KVKK Rıza Bildirimi (Cookie Consent Center)
 * 3'lü Buton Mimarisi: [✔ Hepsini Kabul Et] [✖ Hepsini Reddet] [⚙ Ayarlar]
 * 3 Kategori Tercih Modalı: Zorunlu (Kilitli), Analitik (Toggle), Reklam/Pazarlama (Toggle)
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'msk_cookie_consent';
  // Kullanıcı önceden tercih yapmışsa banner'ı gösterme
  var savedConsent = localStorage.getItem(STORAGE_KEY);
  if (savedConsent) return;

  function getLang() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var langParam = urlParams.get('lang');
      if (langParam && ['tr', 'en', 'ar'].indexOf(langParam.toLowerCase()) !== -1) {
        return langParam.toLowerCase();
      }
      var htmlLang = document.documentElement.getAttribute('lang') || 'tr';
      return ['tr', 'en', 'ar'].indexOf(htmlLang.toLowerCase()) !== -1 ? htmlLang.toLowerCase() : 'tr';
    } catch (_) {
      return 'tr';
    }
  }

  var i18n = {
    tr: {
      title: 'Gizliliğinize önem veriyoruz',
      text: 'Sitemizde deneyiminizi iyileştirmek, tercihlerinizi hatırlamak ve reklam hizmetleri sunmak amacıyla çerezler kullanılmaktadır.',
      privacyLink: 'Gizlilik ve Çerez Politikası',
      acceptAll: 'Hepsini kabul et',
      rejectAll: 'Hepsini reddet',
      settings: 'Ayarlar',
      modalTitle: 'Çerez ve Gizlilik Tercihleri',
      modalDesc: 'Hangi çerez türlerine izin vereceğinizi aşağıdan özelleştirebilirsiniz. Zorunlu çerezler sitenin çalışması için kapatılamaz.',
      catEssentialTitle: 'Zorunlu Çerezler',
      catEssentialDesc: 'Sitenin güvenli çalışması, dil (TR/EN/AR), gece/gündüz teması ve temel oturum işlevleri için teknik olarak zorunludur.',
      catEssentialBadge: 'Her zaman etkin',
      catAnalyticsTitle: 'Performans ve Analitik',
      catAnalyticsDesc: 'Sayfa yükleme hızlarını optimize etmek ve anonim ziyaretçi istatistiklerini derlemek için kullanılır.',
      catMarketingTitle: 'Pazarlama ve Reklam Çerezleri',
      catMarketingDesc: 'Google AdSense aracılığıyla ilgi alanlarınıza uygun kişiselleştirilmiş reklamlar sunulmasını sağlar.',
      saveSettings: 'Tercihleri Kaydet',
      close: 'Kapat'
    },
    en: {
      title: 'We value your privacy',
      text: 'We use cookies to improve your experience, remember your preferences, and deliver relevant advertising.',
      privacyLink: 'Privacy & Cookie Policy',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      settings: 'Settings',
      modalTitle: 'Cookie & Privacy Preferences',
      modalDesc: 'Customize which cookies you wish to allow. Strictly necessary cookies cannot be disabled.',
      catEssentialTitle: 'Strictly Necessary Cookies',
      catEssentialDesc: 'Essential for site security, language settings, dark/light theme, and core navigation.',
      catEssentialBadge: 'Always active',
      catAnalyticsTitle: 'Performance & Analytics',
      catAnalyticsDesc: 'Used to measure site speed and aggregate anonymous traffic metrics for optimization.',
      catMarketingTitle: 'Marketing & Advertising Cookies',
      catMarketingDesc: 'Enables personalized and relevant Google AdSense advertising based on your interests.',
      saveSettings: 'Save Preferences',
      close: 'Close'
    },
    ar: {
      title: 'نحن نقدر خصوصيتك',
      text: 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتذكر تفضيلاتك وتقديم خدمات إعلانية مخصصة.',
      privacyLink: 'سياسة الخصوصية وملفات تعريف الارتباط',
      acceptAll: 'قبول الكل',
      rejectAll: 'رفض الكل',
      settings: 'الإعدادات',
      modalTitle: 'تفضيلات ملفات تعريف الارتباط والخصوصية',
      modalDesc: 'يمكنك تخصيص فئات ملفات تعريف الارتباط أدناه. لا يمكن تعطيل الملفات الضرورية لتشغيل الموقع.',
      catEssentialTitle: 'ملفات تعريف الارتباط الضرورية',
      catEssentialDesc: 'مطلوبة للأمان الفني، وتحديد اللغة، والمظهر الليلي/النهاري، والوظائف الأساسية.',
      catEssentialBadge: 'نشطة دائماً',
      catAnalyticsTitle: 'الأداء والتحليلات',
      catAnalyticsDesc: 'تُستخدم لقياس سرعة الموقع وجمع إحصاءات الزوار مجهولة الهوية لتحسين التجربة.',
      catMarketingTitle: 'ملفات الإعلانات والتسويق',
      catMarketingDesc: 'تتيح عرض إعلانات Google AdSense الملائمة لاهتماماتك.',
      saveSettings: 'حفظ التفضيلات',
      close: 'إغلاق'
    }
  };

  function initConsentCenter() {
    if (document.getElementById('mskConsentBanner')) return;

    var lang = getLang();
    var t = i18n[lang] || i18n.tr;
    var isRTL = lang === 'ar';
    var basePath = (window.location.pathname.indexOf('/apps/') !== -1 || window.location.pathname.indexOf('/blog/') !== -1) ? '../' : '';

    // Stil Ekleme
    var style = document.createElement('style');
    style.id = 'mskConsentStyles';
    style.textContent = [
      '/* Banner Kapsayıcı */',
      '#mskConsentBanner {',
      '  position: fixed;',
      '  bottom: 24px;',
      '  left: 24px;',
      '  width: calc(100% - 48px);',
      '  max-width: 580px;',
      '  background: var(--bg-card, #ffffff);',
      '  color: var(--text-main, #0f172a);',
      '  border: 1px solid var(--border-color, #e2e8f0);',
      '  border-radius: 18px;',
      '  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04);',
      '  padding: 20px 24px;',
      '  z-index: 999990;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;',
      '  font-size: 0.9rem;',
      '  line-height: 1.5;',
      '  box-sizing: border-box;',
      '  transition: opacity 0.25s ease, transform 0.25s ease;',
      '}',
      '#mskConsentBanner.msk-closing {',
      '  opacity: 0 !important;',
      '  transform: translateY(16px) !important;',
      '  pointer-events: none;',
      '}',
      '.msk-banner-header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  margin-bottom: 8px;',
      '}',
      '.msk-banner-title {',
      '  font-weight: 700;',
      '  font-size: 1rem;',
      '  color: var(--text-main, #0f172a);',
      '}',
      '.msk-banner-desc {',
      '  font-size: 0.88rem;',
      '  color: var(--text-muted, #475569);',
      '  line-height: 1.55;',
      '  margin: 0 0 16px 0;',
      '}',
      '.msk-banner-link {',
      '  color: #047857 !important;',
      '  font-weight: 600;',
      '  text-decoration: underline;',
      '  margin-left: 4px;',
      '}',
      '.msk-banner-link:hover {',
      '  color: #065f46 !important;',
      '}',
      '/* 3\'lü Buton Grubu */',
      '.msk-btn-group {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: flex-end;',
      '  gap: 10px;',
      '  flex-wrap: wrap;',
      '}',
      '.msk-btn {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 6px;',
      '  font-family: inherit;',
      '  font-size: 0.86rem;',
      '  font-weight: 600;',
      '  border-radius: 9999px;',
      '  padding: 8px 18px;',
      '  cursor: pointer;',
      '  transition: all 0.15s ease;',
      '  white-space: nowrap;',
      '  box-sizing: border-box;',
      '}',
      '/* Ayarlar Butonu (Nötr / Çerçeveli) */',
      '.msk-btn-settings {',
      '  background: transparent;',
      '  color: var(--text-main, #334155);',
      '  border: 1px solid var(--border-color, #cbd5e1);',
      '}',
      '.msk-btn-settings:hover {',
      '  background: var(--bg-hover, #f1f5f9);',
      '  color: var(--text-main, #0f172a);',
      '}',
      '/* Hepsini Reddet Butonu (Hafif Kırmızımsı / Çerçeveli) */',
      '.msk-btn-reject {',
      '  background: transparent;',
      '  color: #e11d48;',
      '  border: 1px solid #fecdd3;',
      '}',
      '.msk-btn-reject:hover {',
      '  background: #fff1f2;',
      '  border-color: #fda4af;',
      '}',
      '/* Hepsini Kabul Et Butonu (Öncelikli Koyu Dolgulu) */',
      '.msk-btn-accept {',
      '  background: #0f172a;',
      '  color: #ffffff !important;',
      '  border: 1px solid #0f172a;',
      '}',
      '.msk-btn-accept:hover {',
      '  opacity: 0.92;',
      '  transform: scale(1.02);',
      '}',
      '/* ================= Ayarlar Modalı ================= */',
      '#mskConsentModalOverlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(15, 23, 42, 0.6);',
      '  backdrop-filter: blur(4px);',
      '  z-index: 999999;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  padding: 16px;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: opacity 0.2s ease;',
      '}',
      '#mskConsentModalOverlay.msk-modal-open {',
      '  opacity: 1;',
      '  pointer-events: auto;',
      '}',
      '.msk-modal-card {',
      '  background: var(--bg-card, #ffffff);',
      '  color: var(--text-main, #0f172a);',
      '  border: 1px solid var(--border-color, #cbd5e1);',
      '  border-radius: 20px;',
      '  width: 100%;',
      '  max-width: 560px;',
      '  max-height: 90vh;',
      '  overflow-y: auto;',
      '  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);',
      '  padding: 24px;',
      '  box-sizing: border-box;',
      '  font-family: inherit;',
      '  transform: scale(0.96);',
      '  transition: transform 0.2s ease;',
      '}',
      '#mskConsentModalOverlay.msk-modal-open .msk-modal-card {',
      '  transform: scale(1);',
      '}',
      '.msk-modal-top {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  margin-bottom: 12px;',
      '  padding-bottom: 12px;',
      '  border-bottom: 1px solid var(--border-color, #e2e8f0);',
      '}',
      '.msk-modal-top h3 {',
      '  margin: 0;',
      '  font-size: 1.15rem;',
      '  font-weight: 700;',
      '}',
      '.msk-modal-close {',
      '  background: none;',
      '  border: none;',
      '  font-size: 1.4rem;',
      '  cursor: pointer;',
      '  color: var(--text-muted, #64748b);',
      '  padding: 4px;',
      '  line-height: 1;',
      '}',
      '.msk-modal-desc {',
      '  font-size: 0.88rem;',
      '  color: var(--text-muted, #475569);',
      '  line-height: 1.5;',
      '  margin-bottom: 20px;',
      '}',
      '.msk-category-item {',
      '  background: var(--bg-hover, #f8fafc);',
      '  border: 1px solid var(--border-color, #e2e8f0);',
      '  border-radius: 14px;',
      '  padding: 14px 16px;',
      '  margin-bottom: 12px;',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: flex-start;',
      '  gap: 14px;',
      '}',
      '.msk-category-info strong {',
      '  display: block;',
      '  font-size: 0.92rem;',
      '  font-weight: 700;',
      '  color: var(--text-main, #0f172a);',
      '  margin-bottom: 4px;',
      '}',
      '.msk-category-info p {',
      '  margin: 0;',
      '  font-size: 0.82rem;',
      '  color: var(--text-muted, #64748b);',
      '  line-height: 1.45;',
      '}',
      '.msk-badge-locked {',
      '  background: #e2e8f0;',
      '  color: #475569;',
      '  font-size: 0.74rem;',
      '  font-weight: 700;',
      '  padding: 4px 8px;',
      '  border-radius: 6px;',
      '  white-space: nowrap;',
      '}',
      '/* iOS Tarzı Toggle Switch */',
      '.msk-switch {',
      '  position: relative;',
      '  display: inline-block;',
      '  width: 44px;',
      '  height: 24px;',
      '  flex-shrink: 0;',
      '}',
      '.msk-switch input {',
      '  opacity: 0;',
      '  width: 0;',
      '  height: 0;',
      '}',
      '.msk-slider {',
      '  position: absolute;',
      '  cursor: pointer;',
      '  inset: 0;',
      '  background-color: #cbd5e1;',
      '  transition: 0.2s;',
      '  border-radius: 9999px;',
      '}',
      '.msk-slider:before {',
      '  position: absolute;',
      '  content: "";',
      '  height: 18px;',
      '  width: 18px;',
      '  left: 3px;',
      '  bottom: 3px;',
      '  background-color: white;',
      '  transition: 0.2s;',
      '  border-radius: 50%;',
      '}',
      'input:checked + .msk-slider {',
      '  background-color: #0284c7;',
      '}',
      'input:checked + .msk-slider:before {',
      '  transform: translateX(20px);',
      '}',
      '.msk-modal-footer {',
      '  display: flex;',
      '  justify-content: flex-end;',
      '  gap: 10px;',
      '  margin-top: 20px;',
      '  padding-top: 14px;',
      '  border-top: 1px solid var(--border-color, #e2e8f0);',
      '}',
      '/* ================= Dark Mode Uyumu ================= */',
      '[data-theme="dark"] #mskConsentBanner,',
      'body.dark #mskConsentBanner {',
      '  background: #1e293b;',
      '  color: #f8fafc;',
      '  border-color: #334155;',
      '  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);',
      '}',
      '[data-theme="dark"] .msk-banner-title,',
      'body.dark .msk-banner-title {',
      '  color: #f8fafc;',
      '}',
      '[data-theme="dark"] .msk-banner-desc,',
      'body.dark .msk-banner-desc {',
      '  color: #cbd5e1;',
      '}',
      '[data-theme="dark"] .msk-banner-link,',
      'body.dark .msk-banner-link {',
      '  color: #34d399 !important;',
      '}',
      '[data-theme="dark"] .msk-btn-settings,',
      'body.dark .msk-btn-settings {',
      '  color: #f8fafc;',
      '  border-color: #475569;',
      '}',
      '[data-theme="dark"] .msk-btn-settings:hover,',
      'body.dark .msk-btn-settings:hover {',
      '  background: #334155;',
      '}',
      '[data-theme="dark"] .msk-btn-reject,',
      'body.dark .msk-btn-reject {',
      '  background: rgba(225, 29, 72, 0.1);',
      '  color: #fb7185;',
      '  border-color: #9f1239;',
      '}',
      '[data-theme="dark"] .msk-btn-reject:hover,',
      'body.dark .msk-btn-reject:hover {',
      '  background: rgba(225, 29, 72, 0.2);',
      '}',
      '[data-theme="dark"] .msk-btn-accept,',
      'body.dark .msk-btn-accept {',
      '  background: #ffffff;',
      '  color: #0f172a !important;',
      '  border-color: #ffffff;',
      '}',
      '[data-theme="dark"] .msk-modal-card,',
      'body.dark .msk-modal-card {',
      '  background: #1e293b;',
      '  color: #f8fafc;',
      '  border-color: #334155;',
      '}',
      '[data-theme="dark"] .msk-category-item,',
      'body.dark .msk-category-item {',
      '  background: #0f172a;',
      '  border-color: #334155;',
      '}',
      '[data-theme="dark"] .msk-category-info strong,',
      'body.dark .msk-category-info strong {',
      '  color: #f8fafc;',
      '}',
      '[data-theme="dark"] .msk-category-info p,',
      'body.dark .msk-category-info p {',
      '  color: #94a3b8;',
      '}',
      '[data-theme="dark"] .msk-badge-locked,',
      'body.dark .msk-badge-locked {',
      '  background: #334155;',
      '  color: #cbd5e1;',
      '}',
      '@media (max-width: 600px) {',
      '  #mskConsentBanner {',
      '    bottom: 12px;',
      '    left: 12px;',
      '    width: calc(100% - 24px);',
      '    padding: 16px;',
      '  }',
      '  .msk-btn-group {',
      '    flex-direction: column;',
      '    align-items: stretch;',
      '  }',
      '  .msk-btn {',
      '    width: 100%;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);

    // ================= Banner Oluşturma =================
    var banner = document.createElement('div');
    banner.id = 'mskConsentBanner';
    banner.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    banner.innerHTML = [
      '<div class="msk-banner-header">',
      '  <span style="font-size:1.15rem;">🛡️</span>',
      '  <span class="msk-banner-title">' + t.title + '</span>',
      '</div>',
      '<p class="msk-banner-desc">',
      '  ' + t.text,
      '  <a href="' + basePath + 'cookies.html" class="msk-banner-link">' + t.privacyLink + '</a>',
      '</p>',
      '<div class="msk-btn-group">',
      '  <button type="button" class="msk-btn msk-btn-settings" id="mskBtnOpenSettings">',
      '    <span>⚙️</span> <span>' + t.settings + '</span>',
      '  </button>',
      '  <button type="button" class="msk-btn msk-btn-reject" id="mskBtnRejectAll">',
      '    <span>✖</span> <span>' + t.rejectAll + '</span>',
      '  </button>',
      '  <button type="button" class="msk-btn msk-btn-accept" id="mskBtnAcceptAll">',
      '    <span>✔</span> <span>' + t.acceptAll + '</span>',
      '  </button>',
      '</div>'
    ].join('');

    // ================= Ayarlar Modalı Oluşturma =================
    var modalOverlay = document.createElement('div');
    modalOverlay.id = 'mskConsentModalOverlay';
    modalOverlay.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    modalOverlay.innerHTML = [
      '<div class="msk-modal-card">',
      '  <div class="msk-modal-top">',
      '    <h3>' + t.modalTitle + '</h3>',
      '    <button type="button" class="msk-modal-close" id="mskModalCloseBtn" aria-label="Close">&times;</button>',
      '  </div>',
      '  <p class="msk-modal-desc">' + t.modalDesc + '</p>',
      '  ',
      '  <!-- 1. Zorunlu Çerezler -->',
      '  <div class="msk-category-item">',
      '    <div class="msk-category-info">',
      '      <strong>' + t.catEssentialTitle + '</strong>',
      '      <p>' + t.catEssentialDesc + '</p>',
      '    </div>',
      '    <span class="msk-badge-locked">' + t.catEssentialBadge + '</span>',
      '  </div>',
      '  ',
      '  <!-- 2. Performans ve Analitik -->',
      '  <div class="msk-category-item">',
      '    <div class="msk-category-info">',
      '      <strong>' + t.catAnalyticsTitle + '</strong>',
      '      <p>' + t.catAnalyticsDesc + '</p>',
      '    </div>',
      '    <label class="msk-switch">',
      '      <input type="checkbox" id="mskToggleAnalytics" checked>',
      '      <span class="msk-slider"></span>',
      '    </label>',
      '  </div>',
      '  ',
      '  <!-- 3. Pazarlama ve Reklam -->',
      '  <div class="msk-category-item">',
      '    <div class="msk-category-info">',
      '      <strong>' + t.catMarketingTitle + '</strong>',
      '      <p>' + t.catMarketingDesc + '</p>',
      '    </div>',
      '    <label class="msk-switch">',
      '      <input type="checkbox" id="mskToggleMarketing" checked>',
      '      <span class="msk-slider"></span>',
      '    </label>',
      '  </div>',
      '  ',
      '  <div class="msk-modal-footer">',
      '    <button type="button" class="msk-btn msk-btn-settings" id="mskModalCancelBtn">' + t.close + '</button>',
      '    <button type="button" class="msk-btn msk-btn-accept" id="mskModalSaveBtn">' + t.saveSettings + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(banner);
    document.body.appendChild(modalOverlay);

    // Kapatma ve Kaydetme Fonksiyonu
    function finalizeConsent(consentObj) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentObj));
      banner.classList.add('msk-closing');
      modalOverlay.classList.remove('msk-modal-open');
      setTimeout(function() {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
        if (modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
      }, 260);
      try {
        window.dispatchEvent(new CustomEvent('msk_cookie_consent_updated', { detail: consentObj }));
      } catch (_) {}
    }

    // Buton Dinleyicileri
    document.getElementById('mskBtnAcceptAll').addEventListener('click', function() {
      finalizeConsent({ essential: true, analytics: true, marketing: true, timestamp: Date.now() });
    });

    document.getElementById('mskBtnRejectAll').addEventListener('click', function() {
      finalizeConsent({ essential: true, analytics: false, marketing: false, timestamp: Date.now() });
    });

    // Modal Aç / Kapat
    function openModal() {
      modalOverlay.classList.add('msk-modal-open');
    }
    function closeModal() {
      modalOverlay.classList.remove('msk-modal-open');
    }

    document.getElementById('mskBtnOpenSettings').addEventListener('click', openModal);
    document.getElementById('mskModalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('mskModalCancelBtn').addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) closeModal();
    });

    // Modaldan Tercihleri Kaydetme
    document.getElementById('mskModalSaveBtn').addEventListener('click', function() {
      var isAnalytics = document.getElementById('mskToggleAnalytics').checked;
      var isMarketing = document.getElementById('mskToggleMarketing').checked;
      finalizeConsent({
        essential: true,
        analytics: isAnalytics,
        marketing: isMarketing,
        timestamp: Date.now()
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsentCenter);
  } else {
    initConsentCenter();
  }
})();
