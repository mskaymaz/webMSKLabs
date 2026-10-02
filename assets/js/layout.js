/**
 * MSK Labs - Layout & Language/Theme Component Module
 * 
 * Policy:
 * 1. Tip 1 (Static Core Pages): Injects layout navigation, 2-Row Footer, language switcher, and dark theme toggle.
 * 2. Tip 2 (Dynamic Template Pages): Shared layout components for app showcase and blog templates.
 * 3. Active Link Highlighting: Pure CSS class toggle (.active-nav-link) on navigation anchors.
 * 4. Unified Language & Theme Module: Combines language buttons and theme toggle into a seamless header module.
 */

(function () {
  // Path depth detection
  var pathname = window.location.pathname.replace(/\\/g, '/');
  var isSubfolder = pathname.indexOf('/blog/') !== -1 || pathname.indexOf('/apps/') !== -1;
  var basePath = isSubfolder ? '../' : './';
  var pageName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';

  // Helper to resolve current page title with multi-language support
  function getPageTitleHTML() {
    var p = pageName.toLowerCase();
    var bType = '';
    if (p.indexOf('blog') !== -1) {
      var bParams = new URLSearchParams(window.location.search);
      bType = (bParams.get('type') || bParams.get('cat') || 'bizce').toLowerCase();
    }

    if (bType === 'anilts') {
      return '<span class="lang-tr">📖 ANILTILAR</span><span class="lang-en">📖 MEMOIRS</span><span class="lang-ar">📖 ذكريات</span>';
    } else if (bType === 'guncel') {
      return '<span class="lang-tr">📰 GÜNCEL</span><span class="lang-en">📰 NEWS</span><span class="lang-ar">📰 الأخبار</span>';
    } else if (bType === 'bizce' || p.indexOf('blog') !== -1) {
      return '<span class="lang-tr">✍️ BİZCE</span><span class="lang-en">✍️ OPINIONS</span><span class="lang-ar">✍️ رأينا</span>';
    } else if (p === 'index.html' || p === '') {
      return '<span class="lang-tr">🏠 ANA SAYFA</span><span class="lang-en">🏠 HOME</span><span class="lang-ar">🏠 الرئيسية</span>';
    } else if (p.indexOf('apps') !== -1 || p.indexOf('app.html') !== -1 || pathname.indexOf('/apps/') !== -1) {
      return '<span class="lang-tr">📱 UYGULAMALARIMIZ</span><span class="lang-en">📱 OUR APPS</span><span class="lang-ar">📱 تطبيقاتنا</span>';
    } else if (p.indexOf('about') !== -1) {
      return '<span class="lang-tr">ℹ️ HAKKIMIZDA</span><span class="lang-en">ℹ️ ABOUT US</span><span class="lang-ar">ℹ️ عن الشركة</span>';
    } else if (p.indexOf('destek') !== -1) {
      return '<span class="lang-tr">🎫 DESTEK &amp; TALEP</span><span class="lang-en">🎫 SUPPORT</span><span class="lang-ar">🎫 الدعم والطلبات</span>';
    } else if (p.indexOf('contact') !== -1) {
      return '<span class="lang-tr">📞 İLETİŞİM</span><span class="lang-en">📞 CONTACT</span><span class="lang-ar">📞 اتصل بنا</span>';
    } else if (p.indexOf('bizkimiz') !== -1 || p.indexOf('who-we-are') !== -1) {
      return '<span class="lang-tr">👥 BİZ KİMİZ</span><span class="lang-en">👥 WHO WE ARE</span><span class="lang-ar">👥 من نحن</span>';
    } else if (p.indexOf('faq') !== -1) {
      return '<span class="lang-tr">❓ SSS</span><span class="lang-en">❓ FAQ</span><span class="lang-ar">❓ الأسئلة الشائعة</span>';
    } else if (p.indexOf('privacy') !== -1) {
      return '<span class="lang-tr">🔒 GİZLİLİK</span><span class="lang-en">🔒 PRIVACY</span><span class="lang-ar">🔒 الخصوصية</span>';
    } else if (p.indexOf('terms') !== -1) {
      return '<span class="lang-tr">📜 KULLANIM KOŞULLARI</span><span class="lang-en">📜 TERMS</span><span class="lang-ar">📜 شروط الخدمة</span>';
    } else if (p.indexOf('changelog') !== -1) {
      return '<span class="lang-tr">📝 DEĞİŞİKLİK GÜNLÜĞÜ</span><span class="lang-en">📝 CHANGELOG</span><span class="lang-ar">📝 سجل التغييرات</span>';
    } else if (p.indexOf('roadmap') !== -1) {
      return '<span class="lang-tr">🗺️ YOL HARİTASI</span><span class="lang-en">🗺️ ROADMAP</span><span class="lang-ar">🗺️ خريطة الطريق</span>';
    }
    return '<span>MSK LABS</span>';
  }

  // Mobile Drawer Toggle Handler
  window.toggleMobileMenu = function () {
    var drawer = document.getElementById('mobileDrawerMenu');
    var btn = document.getElementById('hamburgerToggleBtn');
    if (!drawer) return;
    drawer.classList.toggle('is-active');
    if (btn) {
      btn.innerHTML = drawer.classList.contains('is-active') ? '✕' : '☰';
    }
  };

  // Close Mobile Drawer on Outside Click
  document.addEventListener('click', function (e) {
    var drawer = document.getElementById('mobileDrawerMenu');
    var btn = document.getElementById('hamburgerToggleBtn');
    if (drawer && drawer.classList.contains('is-active')) {
      if (!drawer.contains(e.target) && (!btn || !btn.contains(e.target))) {
        drawer.classList.remove('is-active');
        if (btn) btn.innerHTML = '☰';
      }
    }
  });

  // Centralized Header Renderer (Sticky Header Bar + Nav Links + Mobile Drawer)
  function renderHeader() {
    var headerEl = document.querySelector('header.site-header-sticky') || document.querySelector('header.site-header') || document.getElementById('site-header');
    
    // If no header container exists, create and inject one at top of body or layout-wrapper
    if (!headerEl) {
      headerEl = document.createElement('header');
      headerEl.className = 'site-header-sticky';
      var wrapper = document.querySelector('.layout-wrapper') || document.body;
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.insertBefore(headerEl, wrapper);
      } else {
        document.body.insertBefore(headerEl, document.body.firstChild);
      }
    } else {
      headerEl.className = 'site-header-sticky';
    }

    var navLinksHTML = `
      <a href="${basePath}index.html">
        <span class="lang-tr">Ana Sayfa</span><span class="lang-en">Home</span><span class="lang-ar">الرئيسية</span>
      </a>
      <span class="nav-divider">|</span>
      <a href="${basePath}blog/blog.html?type=bizce">
        <span class="lang-tr">Bizce</span><span class="lang-en">Bizce</span><span class="lang-ar">بيزجه</span>
      </a>
      <span class="nav-divider">|</span>
      <a href="${basePath}blog/blog.html?type=anilts">
        <span class="lang-tr">Anıltılar</span><span class="lang-en">Memoirs</span><span class="lang-ar">ذكريات</span>
      </a>
      <span class="nav-divider">|</span>
      <a href="${basePath}blog/blog.html?type=guncel">
        <span class="lang-tr">Güncel</span><span class="lang-en">News</span><span class="lang-ar">الأخبار</span>
      </a>
      <span class="nav-divider">|</span>
      <a href="${basePath}apps.html">
        <span class="lang-tr">Uygulamalarımız</span><span class="lang-en">Our Apps</span><span class="lang-ar">تطبيقاتنا</span>
      </a>
      <span class="nav-divider">|</span>
      <a href="${basePath}about.html">
        <span class="lang-tr">Hakkımızda</span><span class="lang-en">About Us</span><span class="lang-ar">عن الشركة</span>
      </a>
      <span class="nav-divider">|</span>
      <a href="${basePath}destek.html">
        <span class="lang-tr">Destek &amp; Talep</span><span class="lang-en">Support &amp; Feedback</span><span class="lang-ar">الدعم والطلبات</span>
      </a>
      <span class="nav-divider">|</span>
      <a href="${basePath}contact.html">
        <span class="lang-tr">İletişim</span><span class="lang-en">Contact</span><span class="lang-ar">اتصل بنا</span>
      </a>
    `;

    var mobileLinksHTML = `
      <a href="${basePath}index.html"><span class="lang-tr">🏠 Ana Sayfa</span><span class="lang-en">🏠 Home</span><span class="lang-ar">🏠 الرئيسية</span></a>
      <a href="${basePath}blog/blog.html?type=bizce"><span class="lang-tr">✍️ Bizce</span><span class="lang-en">✍️ Bizce</span><span class="lang-ar">✍️ بيزجه</span></a>
      <a href="${basePath}blog/blog.html?type=anilts"><span class="lang-tr">📖 Anıltılar</span><span class="lang-en">📖 Memoirs</span><span class="lang-ar">📖 ذكريات</span></a>
      <a href="${basePath}blog/blog.html?type=guncel"><span class="lang-tr">📰 Güncel</span><span class="lang-en">📰 News</span><span class="lang-ar">📰 الأخبار</span></a>
      <a href="${basePath}apps.html"><span class="lang-tr">📱 Uygulamalarımız</span><span class="lang-en">📱 Our Apps</span><span class="lang-ar">📱 تطبيقاتنا</span></a>
      <a href="${basePath}about.html"><span class="lang-tr">ℹ️ Hakkımızda</span><span class="lang-en">ℹ️ About Us</span><span class="lang-ar">ℹ️ عن الشركة</span></a>
      <a href="${basePath}destek.html"><span class="lang-tr">🎫 Destek &amp; Talep</span><span class="lang-en">🎫 Support</span><span class="lang-ar">🎫 الدعم والطلبات</span></a>
      <a href="${basePath}contact.html"><span class="lang-tr">📞 İletişim</span><span class="lang-en">📞 Contact</span><span class="lang-ar">📞 اتصل بنا</span></a>
    `;

    headerEl.innerHTML = `
      <div class="header-sticky-container">
        <div class="header-top-row">
          <div class="header-page-title" id="stickyHeaderTitle">
            ${getPageTitleHTML()}
          </div>
          <div class="header-logo-center">
            <a href="${basePath}index.html" title="MSK Labs Ana Sayfa">
              <img src="${basePath}img/MSKLabsLogo.svg" alt="MSK Labs Logo" class="header-logo-img logo-light">
              <img src="${basePath}img/MSKLabsType_white.svg" alt="MSK Labs Logo" class="header-logo-img logo-dark">
            </a>
          </div>
          <div class="header-actions-right">
            <div class="lang-switcher">
              <button onclick="setLang('tr')" data-lang="tr" class="active" title="Türkçe">TR</button>
              <button onclick="setLang('en')" data-lang="en" title="English">EN</button>
              <button onclick="setLang('ar')" data-lang="ar" title="العربية" class="lang-btn-arabic"><img src="${basePath}img/ElArabiye.svg" alt="العربية" class="arabic-btn-icon"></button>
              <button id="themeToggleBtn" class="theme-toggle-btn" onclick="toggleTheme()" title="Gece Modu / Light Mode">🌙</button>
            </div>
            <button type="button" class="hamburger-toggle-btn" id="hamburgerToggleBtn" aria-label="Menüyü Aç/Kapat" onclick="toggleMobileMenu()">
              ☰
            </button>
          </div>
        </div>
        <nav class="top-main-nav">
          ${navLinksHTML}
        </nav>
      </div>
      <div class="mobile-drawer-menu" id="mobileDrawerMenu">
        ${mobileLinksHTML}
      </div>
    `;

    // Also populate standalone <nav class="top-main-nav"></nav> elements if any exist outside header
    var standaloneNavs = document.querySelectorAll('nav.top-main-nav:not(.header-sticky-container nav)');
    standaloneNavs.forEach(function(n) {
      n.innerHTML = navLinksHTML;
    });
  }

  // 2. Safe 2-Row Footer Injector
  function renderFooter() {
    var footerEl = document.querySelector('footer.site-footer') || document.getElementById('site-footer');
    if (!footerEl) return;

    function getLinkClass(keyword) {
      if (keyword === 'index' && (pageName === 'index.html' || pageName === '')) return ' active-nav-link';
      if (keyword !== 'index' && pageName.indexOf(keyword) !== -1) return ' active-nav-link';
      // Blog sayfasında URL type parametresine göre footer aktif link vurgulama
      if (pageName === 'blog.html') {
        var bParams = new URLSearchParams(window.location.search);
        var bType = (bParams.get('type') || bParams.get('cat') || 'bizce').toLowerCase();
        if (keyword === bType) return ' active-nav-link';
        if (!bParams.get('type') && !bParams.get('cat') && keyword === 'bizce') return ' active-nav-link';
      }
      return '';
    }

    var footerHTML = `
      <div class="footer-links-row1" style="margin-bottom: 0.4rem; font-weight: 600;">
        <a href="${basePath}index.html" class="${getLinkClass('index')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Ana Sayfa</span><span class="lang-en">Home</span><span class="lang-ar">الرئيسية</span></a> |
        <a href="${basePath}blog/blog.html?type=bizce" class="${getLinkClass('bizce')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Bizce</span><span class="lang-en">Bizce</span><span class="lang-ar">بيزجه</span></a> |
        <a href="${basePath}blog/blog.html?type=anilts" class="${getLinkClass('anilts')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Anıltılar</span><span class="lang-en">Memoirs</span><span class="lang-ar">ذكريات</span></a> |
        <a href="${basePath}blog/blog.html?type=guncel" class="${getLinkClass('guncel')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Güncel</span><span class="lang-en">News</span><span class="lang-ar">الأخبار</span></a> |
        <a href="${basePath}apps.html" class="${getLinkClass('apps')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Uygulamalarımız</span><span class="lang-en">Our Apps</span><span class="lang-ar">تطبيقاتنا</span></a> |
        <a href="${basePath}about.html" class="${getLinkClass('about')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Hakkımızda</span><span class="lang-en">About Us</span><span class="lang-ar">عن الشركة</span></a> |
        <a href="${basePath}bizkimiz.html" class="${getLinkClass('bizkimiz')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Biz Kimiz</span><span class="lang-en">Who We Are</span><span class="lang-ar">من نحن</span></a> |
        <a href="${basePath}contact.html" class="${getLinkClass('contact')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">İletişim</span><span class="lang-en">Contact</span><span class="lang-ar">اتصل بنا</span></a>
      </div>
      <div class="footer-links-row2" style="margin-bottom: 0.75rem; font-weight: 500; font-size: 0.8rem;">
        <a href="${basePath}destek.html" class="${getLinkClass('destek')}" style="color: #64748b; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Destek &amp; Talep</span><span class="lang-en">Support &amp; Feedback</span><span class="lang-ar">الدعم والطلبات</span></a> |
        <a href="${basePath}faq.html" class="${getLinkClass('faq')}" style="color: #64748b; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">SSS</span><span class="lang-en">FAQ</span><span class="lang-ar">الأسئلة الشائعة</span></a> |
        <a href="${basePath}privacy.html" class="${getLinkClass('privacy')}" style="color: #64748b; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Gizlilik Politikası</span><span class="lang-en">Privacy Policy</span><span class="lang-ar">سياسة الخصوصية</span></a> |
        <a href="${basePath}terms.html" class="${getLinkClass('terms')}" style="color: #64748b; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Kullanım Koşulları</span><span class="lang-en">Terms of Service</span><span class="lang-ar">شروط الخدمة</span></a>
      </div>
      <p class="copyright-line" style="margin: 0; font-size: 0.85rem; color: #64748b;">
        <span class="lang-tr">© 2026 MSK Labs. Tüm hakları saklıdır.</span>
        <span class="lang-en">© 2026 MSK Labs. All rights reserved.</span>
        <span class="lang-ar">© 2026 MSK Labs. جميع الحقوق محفوظة.</span>
      </p>
    `;

    footerEl.innerHTML = footerHTML;
    footerEl.style.textAlign = 'center';
    footerEl.style.padding = '1.5rem 1rem';
    footerEl.style.borderTop = '1px solid #cbd5e1';
    footerEl.style.marginTop = '2.5rem';
  }

  // 3. Safe Active Link Highlighter & Nav Sync
  function highlightActiveTopNav() {
    var navLinks = document.querySelectorAll('.top-main-nav a, .site-subnav a, .footer-links a, .footer-links-row1 a, .footer-links-row2 a');
    var params = new URLSearchParams(window.location.search);
    var typeParam = (params.get('type') || params.get('cat') || '').toLowerCase();

    navLinks.forEach(function (link) {
      link.classList.remove('active-nav-link');
      var href = link.getAttribute('href');
      if (!href) return;

      var isActive = false;
      if (pageName === 'blog.html') {
        if (typeParam === 'anilts' || typeParam === 'aniltilar' || typeParam === 'anilti') {
          if (href.indexOf('type=anilts') !== -1 || href.indexOf('cat=anilts') !== -1) isActive = true;
        } else if (typeParam === 'guncel') {
          if (href.indexOf('type=guncel') !== -1 || href.indexOf('cat=guncel') !== -1) isActive = true;
        } else {
          if (href.indexOf('type=bizce') !== -1 || href.indexOf('cat=bizce') !== -1) isActive = true;
        }
      } else if (pageName === 'index.html' || pageName === '') {
        if (href.indexOf('index.html') !== -1 && href.indexOf('#apps') === -1) isActive = true;
      } else {
        if (href.indexOf(pageName) !== -1) isActive = true;
      }

      if (isActive) {
        link.classList.add('active-nav-link');
      }
    });
  }

  window.highlightActiveTopNav = highlightActiveTopNav;

  // 4. Centralized Theme & Language Switcher Module
  function getSavedTheme() {
    var saved = null;
    try { saved = localStorage.getItem('user_theme'); } catch(e) {}
    if (!saved) {
      saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    return saved;
  }

  function initTheme() {
    var theme = getSavedTheme();
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
    updateThemeToggleBtn(theme);
  }

  window.toggleTheme = function() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var nextTheme = (current === 'dark') ? 'light' : 'dark';
    try { localStorage.setItem('user_theme', nextTheme); } catch(e) {}
    applyTheme(nextTheme);
  };

  function updateThemeToggleBtn(theme) {
    if (!theme) {
      theme = document.documentElement.getAttribute('data-theme') || getSavedTheme();
    }

    var langSwitchers = document.querySelectorAll('.lang-switcher');
    langSwitchers.forEach(function(langSwitcher) {
      var btn = langSwitcher.querySelector('#themeToggleBtn, .theme-toggle-btn');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'themeToggleBtn';
        btn.className = 'theme-toggle-btn';
        btn.setAttribute('type', 'button');
        langSwitcher.appendChild(btn);
      }
      btn.onclick = window.toggleTheme;
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Açık Mod / Light Mode' : 'Koyu Mod / Dark Mode';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Açık Mod' : 'Koyu Mod');
    });

    var standaloneBtns = document.querySelectorAll('#themeToggleBtn, .theme-toggle-btn');
    standaloneBtns.forEach(function(btn) {
      btn.onclick = window.toggleTheme;
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Açık Mod / Light Mode' : 'Koyu Mod / Dark Mode';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Açık Mod' : 'Koyu Mod');
    });
  }

  // Global Language & RTL Switcher
  window.setLang = function(lang, saveToStorage) {
    if (!lang) lang = 'tr';
    if (saveToStorage !== false) {
      try { localStorage.setItem('user_lang', lang); } catch(e) {}
    }
    
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    
    if (document.body) {
      document.body.classList.remove('lang-tr', 'lang-en', 'lang-ar');
      document.body.classList.add('lang-' + lang);
    }

    var buttons = document.querySelectorAll('.lang-switcher button');
    buttons.forEach(function(btn) {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else if (btn.getAttribute('data-lang')) {
        btn.classList.remove('active');
      }
    });

    // Update input and textarea placeholders dynamically based on active language
    var elementsWithPlaceholders = document.querySelectorAll('[data-lang-' + lang + '-placeholder]');
    elementsWithPlaceholders.forEach(function(el) {
      var ph = el.getAttribute('data-lang-' + lang + '-placeholder');
      if (ph) el.setAttribute('placeholder', ph);
    });

    // Keep theme button state synced in module
    var currentTheme = document.documentElement.getAttribute('data-theme') || getSavedTheme();
    updateThemeToggleBtn(currentTheme);

    try {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
    } catch(e) {}

    // Link URL Sync for Language Continuity
    var links = document.querySelectorAll('a.app-card, a.back-btn, .top-main-nav a, .site-footer a, a.hub-card-link, .app-carousel a, .biz-kimiz-intro-card a, a.bizce-center-logo-link');
    links.forEach(function(a) {
      var href = a.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        var hashParts = href.split('#');
        var urlPathAndQuery = hashParts[0];
        var hash = hashParts[1] ? '#' + hashParts[1] : '';
        
        var queryParts = urlPathAndQuery.split('?');
        var path = queryParts[0];
        var queryStr = queryParts[1] || '';
        
        var params = new URLSearchParams(queryStr);
        if (lang !== 'tr') {
          params.set('lang', lang);
        } else {
          params.delete('lang');
        }
        
        var newQuery = params.toString();
        a.setAttribute('href', path + (newQuery ? '?' + newQuery : '') + hash);
      }
    });
  };

  // Dynamic HTML lang and RTL attribute sync
  // Priority order:
  // 1. URL Parameter (?lang=) -> URL-based session override (does not overwrite user's saved preference)
  // 2. Explicit User Preference (localStorage 'user_lang') -> Saved when user clicks language button
  // 3. Browser / System Language (navigator.language) -> Automatically detects tr/ar/en
  // 4. Default Fallback ('tr')
  function syncLangAttributes() {
    var activeLang = null;
    var saveToStorage = true;
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var langParam = urlParams.get('lang');
      if (langParam) {
        activeLang = langParam.toLowerCase();
        saveToStorage = false;
      } else {
        activeLang = localStorage.getItem('user_lang');
      }
    } catch(e) {}

    if (!activeLang) {
      try {
        var sysLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
        if (sysLang.indexOf('tr') === 0) {
          activeLang = 'tr';
        } else if (sysLang.indexOf('ar') === 0) {
          activeLang = 'ar';
        } else if (sysLang.indexOf('en') === 0) {
          activeLang = 'en';
        } else {
          activeLang = 'tr';
        }
      } catch(e) {
        activeLang = 'tr';
      }
      saveToStorage = false;
    }

    if (['tr', 'en', 'ar'].indexOf(activeLang) === -1) {
      activeLang = 'tr';
    }

    window.setLang(activeLang, saveToStorage);
  }

  // Pre-DOM theme apply (immediate execution to avoid theme flash)
  var preTheme = getSavedTheme();
  document.documentElement.setAttribute('data-theme', preTheme);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      renderHeader();
      renderFooter();
      highlightActiveTopNav();
      syncLangAttributes();
    });
  } else {
    initTheme();
    renderHeader();
    renderFooter();
    highlightActiveTopNav();
    syncLangAttributes();
  }
})();
