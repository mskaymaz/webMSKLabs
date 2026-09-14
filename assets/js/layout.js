/**
 * MSK Labs - Layout & 2-Row Footer Component Module
 * 
 * Policy:
 * 1. Tip 1 (Static Core Pages): Preserves the original HTML headers and layout containers 100%.
 *    Injects only the 2-Row Footer into <footer class="site-footer">.
 * 2. Tip 2 (Dynamic Template Pages): Shared layout components for app showcase and blog templates.
 * 3. Active Link Highlighting: Pure CSS class toggle (.active-nav-link) on existing navigation anchors without any floating elements.
 */

(function () {
  // Path depth detection
  var pathname = window.location.pathname.replace(/\\/g, '/');
  var isSubfolder = pathname.indexOf('/blog/') !== -1 || pathname.indexOf('/apps/') !== -1;
  var basePath = isSubfolder ? '../' : './';
  var pageName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'index.html';

  // 1. Centralized Top Navigation Bar Injector & Renderer
  function renderTopNav() {
    var nav = document.querySelector('.top-main-nav');
    if (!nav) return;

    var topNavHTML = `
      <a href="${basePath}index.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
        <span class="lang-tr">Ana Sayfa</span><span class="lang-en">Home</span><span class="lang-ar">الرئيسية</span>
      </a>
      <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
      <a href="${basePath}blog/blog.html?type=bizce" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
        <span class="lang-tr">Bloglar</span><span class="lang-en">Blogs</span><span class="lang-ar">المدونات</span>
      </a>
      <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
      <a href="${basePath}index.html#apps" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
        <span class="lang-tr">Uygulamalarımız</span><span class="lang-en">Our Apps</span><span class="lang-ar">تطبيقاتنا</span>
      </a>
      <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
      <a href="${basePath}about.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
        <span class="lang-tr">Hakkımızda</span><span class="lang-en">About Us</span><span class="lang-ar">عن الشركة</span>
      </a>
      <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
      <a href="${basePath}destek.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
        <span class="lang-tr">Destek &amp; Talep</span><span class="lang-en">Support &amp; Feedback</span><span class="lang-ar">الدعم والطلبات</span>
      </a>
      <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
      <a href="${basePath}contact.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
        <span class="lang-tr">İletişim</span><span class="lang-en">Contact</span><span class="lang-ar">اتصل بنا</span>
      </a>
    `;

    nav.innerHTML = topNavHTML;
  }

  // 2. Safe 2-Row Footer Injector
  function renderFooter() {
    var footerEl = document.querySelector('footer.site-footer') || document.getElementById('site-footer');
    if (!footerEl) return;

    function getLinkClass(keyword) {
      if (keyword === 'index' && (pageName === 'index.html' || pageName === '')) return ' active-nav-link';
      if (keyword !== 'index' && pageName.indexOf(keyword) !== -1) return ' active-nav-link';
      return '';
    }

    var footerHTML = `
      <div class="footer-links-row1" style="margin-bottom: 0.4rem; font-weight: 600;">
        <a href="${basePath}index.html" class="${getLinkClass('index')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Ana Sayfa</span><span class="lang-en">Home</span><span class="lang-ar">الرئيسية</span></a> |
        <a href="${basePath}blog/blog.html?type=bizce" class="${getLinkClass('bizce')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Bizce</span><span class="lang-en">Bizce</span><span class="lang-ar">بيزجه</span></a> |
        <a href="${basePath}blog/blog.html?type=anilts" class="${getLinkClass('anilts')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Anıltılar</span><span class="lang-en">Anıltılar</span><span class="lang-ar">Anıltılar</span></a> |
        <a href="${basePath}blog/blog.html?type=guncel" class="${getLinkClass('guncel')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Güncel</span><span class="lang-en">News</span><span class="lang-ar">الأخبار</span></a> |
        <a href="${basePath}index.html#apps" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Uygulamalarımız</span><span class="lang-en">Our Apps</span><span class="lang-ar">تطبيقاتنا</span></a> |
        <a href="${basePath}about.html" class="${getLinkClass('about')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Hakkımızda</span><span class="lang-en">About Us</span><span class="lang-ar">عن الشركة</span></a> |
        <a href="${basePath}who-we-are.html" class="${getLinkClass('who-we-are')}" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Biz Kimiz</span><span class="lang-en">Who We Are</span><span class="lang-ar">من نحن</span></a> |
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

  // 4. Centralized Dark Mode Theme Manager
  function initTheme() {
    var savedTheme = localStorage.getItem('user_theme');
    if (!savedTheme) {
      savedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (document.body) document.body.classList.add('dark-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      if (document.body) document.body.classList.remove('dark-theme');
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
    var btn = document.getElementById('themeToggleBtn');
    if (!btn) {
      var langSwitcher = document.querySelector('.lang-switcher');
      if (langSwitcher) {
        btn = document.createElement('button');
        btn.id = 'themeToggleBtn';
        btn.className = 'theme-toggle-btn';
        btn.onclick = window.toggleTheme;
        btn.style.cssText = 'background: transparent; border: 1px solid var(--border-color, #cbd5e1); border-radius: 8px; padding: 2px 7px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; min-height: 32px; min-width: 32px; display: inline-flex; align-items: center; justify-content: center;';
        langSwitcher.appendChild(btn);
      }
    }
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Açık Mod / Light Mode' : 'Koyu Mod / Dark Mode';
    }
  }

  // Global Language & RTL Switcher (W4, W10)
  window.setLang = function(lang) {
    if (!lang) lang = 'tr';
    try { localStorage.setItem('user_lang', lang); } catch(e) {}
    
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
      } else {
        btn.classList.remove('active');
      }
    });

    try {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
    } catch(e) {}

    // Link URL Sync for Language Continuity (W4) - Preserves existing query params like ?type=bizce, ?type=anilts
    var links = document.querySelectorAll('a.app-card, a.back-btn, .top-main-nav a, .site-footer a');
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
  function syncLangAttributes() {
    var savedLang = 'tr';
    try { savedLang = localStorage.getItem('user_lang') || 'tr'; } catch(e) {}
    window.setLang(savedLang);
  }

  // Pre-DOM theme apply
  initTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      renderTopNav();
      renderFooter();
      highlightActiveTopNav();
      syncLangAttributes();
    });
  } else {
    initTheme();
    renderTopNav();
    renderFooter();
    highlightActiveTopNav();
    syncLangAttributes();
  }
})();
