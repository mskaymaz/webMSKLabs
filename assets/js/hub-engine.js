/**
 * MSK Labs - Home Hub Dynamic Engine
 * Manages 4-box dynamic hub cards, latest post excerpts, unread recommendations, and app carousel.
 */

(function () {
  // Shared blog data fallback if blog.js is not loaded on homepage
  var hubBlogData = [
    {
      id: 1,
      type: "bizce",
      category: "Teknoloji & İnsanlık",
      date: "10 Eylül 2026",
      tr: {
        title: "Yapay Zeka Çağında İnsani Değerler",
        summary: "Teknolojinin sunduğu kolaylıklar ile insanın ahlaki sorumlulukları arasındaki denge."
      },
      en: {
        title: "Human Values in the Age of AI",
        summary: "An essay on balancing technological convenience with moral responsibilities."
      },
      ar: {
        title: "القيم الإنسانية في عصر الذكاء الاصطناعي",
        summary: "نص حول إحداث التوازن بين التسهيلات التكنولوجية والمسؤوليات الأخلاقية."
      }
    },
    {
      id: 2,
      type: "bizce",
      category: "Sosyal Yaşam & Gelecek",
      date: "08 Eylül 2026",
      tr: {
        title: "Dijital Gürültü ve Zihinsel Odaklanma",
        summary: "Sürekli bildirimlerin olduğu bir çağda zihinsel berraklığı yeniden kazanmanın yolları."
      },
      en: {
        title: "Digital Noise and Mental Focus",
        summary: "Reclaiming mental clarity in an era of constant digital notifications."
      },
      ar: {
        title: "الضوضاء الرقمية والتركيز الذهني",
        summary: "سبل استعادة الصفاء الذهني في عصر التنبيهات المستمرة."
      }
    },
    {
      id: 3,
      type: "bizce",
      category: "Yazılım & Verimlilik",
      date: "05 Eylül 2026",
      tr: {
        title: "Sade Yaşam ve Minimalist Çalışma Düzeni",
        summary: "Masaüstünüzdeki karmaşayı azaltarak verimliliği artırma felsefesi."
      },
      en: {
        title: "Simple Living and Minimalist Workflow",
        summary: "Increasing productivity by reducing desktop and digital clutter."
      },
      ar: {
        title: "الحياة البسيطة وتنظيم العمل الأدنى",
        summary: "فلسفة زيادة الإنتاجية من خلال تقليل الفوضى الرقمية."
      }
    },
    {
      id: 4,
      type: "anilts",
      category: "Yaşanmış Anı",
      date: "11 Eylül 2026",
      tr: {
        title: "İsimsiz Bir Nezaket ve Unutulmayan Ders",
        summary: "Yoğun bir çalışma gününde yaşanan ve hayata bakışı değiştiren samimi bir tecrübe hikayesi."
      },
      en: {
        title: "An Anonymous Act of Kindness & Unforgettable Lesson",
        summary: "A sincere memoir story reflecting a life-changing experience on a hectic work day."
      },
      ar: {
        title: "موقف إنساني ودرس لا يُنسى",
        summary: "قصة واقعية تعكس تجربة إنسانية غيرت وجهة نظرنا في الحياة."
      }
    },
    {
      id: 5,
      type: "anilts",
      category: "İlham Verenler",
      date: "02 Eylül 2026",
      tr: {
        title: "Sessiz Emeklerin Sessiz Kahramanları",
        summary: "Görünmeyen detaylarda harcanan büyük emekler ve insan kalmanın zarafeti."
      },
      en: {
        title: "Silent Heroes of Quiet Labors",
        summary: "Great efforts hidden in unseen details and the grace of staying human."
      },
      ar: {
        title: "أبطال الجهود الصامتة",
        summary: "جهود عظيمة مخفية في التفاصيل غير المرئية ونبل البقاء إنساناً."
      }
    },
    {
      id: 6,
      type: "guncel",
      category: "Duyurular & Yenilikler",
      date: "14 Eylül 2026",
      tr: {
        title: "MSK Labs Platform Güncellemesi ve Yeni Özellikler",
        summary: "Platform genelinde yapılan performans iyileştirmeleri, çoklu dil ve modül altyapısı yayında."
      },
      en: {
        title: "MSK Labs Platform Update and New Features",
        summary: "Performance enhancements, multi-language support, and new modular infrastructure deployed live."
      },
      ar: {
        title: "تحديث منصة MSK Labs والميزات الجديدة",
        summary: "تحسينات الأداء، دعم متعدد اللغات، وإعلانات الوحدات الجديدة على منصتنا."
      }
    },
    {
      id: 7,
      type: "guncel",
      category: "Geliştirme Günlüğü",
      date: "01 Eylül 2026",
      tr: {
        title: "Mobil ve Masaüstü Yazılım Portföyümüz Büyüyor",
        summary: "Yeni nesil kullanıcı dostu mobil çözümlerimiz ve masaüstü otomasyon araçlarımız yakında."
      },
      en: {
        title: "Our Mobile and Desktop Portfolio is Expanding",
        summary: "Next-gen user friendly mobile solutions and desktop automation tools coming soon."
      },
      ar: {
        title: "محفظة برمجيات الجوال وسطح المكتب تتوسع",
        summary: "حلول الجوال الجيل الجديد وأدوات الأتمتة المكتبية قريباً."
      }
    }
  ];

  // Shared Apps Catalog for Carousel
  var hubAppsData = [
    {
      id: "haydinamaza",
      name: { tr: "HaydiNamaza", en: "HaydiNamaza", ar: "حي على الصلاة" },
      iconImg: "media/haydinamaza/icon.png",
      status: "active",
      url: "apps/haydinamaza.html"
    },
    {
      id: "rekatsay",
      name: { tr: "RekatSay", en: "RekatSay", ar: "RekatSay" },
      iconImg: "media/rekatsay/icon.png",
      status: "active",
      url: "apps/rekatsay.html"
    },
    {
      id: "emekli",
      name: { tr: "Emekli", en: "Retirement Counter", ar: "عداد التقاعد" },
      iconImg: "media/emekli/icon.png",
      status: "active",
      url: "apps/emekli.html"
    },
    {
      id: "gcpiluyari",
      name: { tr: "GÇ Pil Uyarı", en: "GC Battery Alert", ar: "تنبيه البطارية" },
      iconEmoji: "🔋",
      status: "dev",
      url: "apps/gcpiluyari.html"
    },
    {
      id: "deskpilot",
      name: { tr: "DeskPilot", en: "DeskPilot", ar: "DeskPilot" },
      iconImg: "media/deskpilot/icon.png",
      status: "dev",
      url: "apps/deskpilot.html"
    },
    {
      id: "enyakin",
      name: { tr: "En Yakın", en: "Nearest", ar: "الأقرب" },
      iconImg: "img/EnYakinLogo.svg",
      status: "dev",
      url: "apps/enyakin.html"
    },
    {
      id: "notes",
      name: { tr: "Notes", en: "Notes", ar: "ملاحظات" },
      iconEmoji: "📝",
      status: "planning",
      url: "apps.html#upcoming"
    },
    {
      id: "docuedit",
      name: { tr: "DocuEdit", en: "DocuEdit", ar: "DocuEdit" },
      iconEmoji: "📄",
      status: "planning",
      url: "apps.html#upcoming"
    },
    {
      id: "pdflayout",
      name: { tr: "PDF Layout", en: "PDF Layout", ar: "PDF Layout" },
      iconEmoji: "🖨️",
      status: "planning",
      url: "apps.html#upcoming"
    }
  ];

  // Helper: Read list of read post IDs from localStorage
  function getReadPosts() {
    try {
      var data = localStorage.getItem('msk_read_posts');
      return data ? JSON.parse(data) : [];
    } catch(e) {
      return [];
    }
  }

  // Get active language (tr, en, ar)
  function getLang() {
    return document.documentElement.getAttribute('lang') || 'tr';
  }

  // Render Category Dynamic Cards
  function renderBlogBox(type, latestElId, recElId) {
    var posts = typeof blogPostsData !== 'undefined' ? blogPostsData : hubBlogData;
    var categoryPosts = posts.filter(function(p) { return p.type === type; });
    if (!categoryPosts || categoryPosts.length === 0) return;

    var lang = getLang();
    var readIds = getReadPosts();

    var unreadPosts = categoryPosts.filter(function(p) { return readIds.indexOf(p.id) === -1; });

    var latestPost = categoryPosts[0];
    var recommendedPost = unreadPosts.length > 0 ? unreadPosts[0] : (categoryPosts[1] || categoryPosts[0]);

    // Render Latest Post
    var latestEl = document.getElementById(latestElId);
    if (latestEl && latestPost) {
      var latestTitleText = (latestPost.title && latestPost.title[lang]) || latestPost.title.tr || latestPost.title;
      var latestUrl = 'blog/' + (latestPost.url || 'blog.html?type=' + type);
      latestEl.innerHTML = `
        <div class="hub-latest-title">
          <a href="${latestUrl}" style="color: var(--text-main); text-decoration: none;">${latestTitleText}</a>
        </div>
        <div class="hub-latest-date">${latestPost.date || '2026'}</div>
      `;
    }

    // Render Recommended Post
    var recEl = document.getElementById(recElId);
    if (recEl && recommendedPost) {
      var recTitleText = (recommendedPost.title && recommendedPost.title[lang]) || recommendedPost.title.tr || recommendedPost.title;
      var recUrl = 'blog/' + (recommendedPost.url || 'blog.html?type=' + type);
      recEl.innerHTML = `
        <div class="hub-rec-title" style="font-size:0.88rem; font-weight:600;">
          <a href="${recUrl}" style="color: var(--text-main); text-decoration: none;">${recTitleText}</a>
        </div>
      `;
    }
  }

  // Render Apps Horizontal Carousel inside Card 2
  function renderAppCarousel() {
    var carouselEl = document.getElementById('appCarouselFlow');
    if (!carouselEl) return;

    var lang = getLang();
    var html = '';

    hubAppsData.forEach(function(app) {
      var name = (app.name && app.name[lang]) || app.name.tr;
      var iconMarkup = app.iconImg ? `<img src="${app.iconImg}" alt="${name}">` : app.iconEmoji;
      
      var statusBadge = '';
      if (app.status === 'active') {
        statusBadge = `<span class="app-carousel-status active"><span class="lang-tr">Yayında</span><span class="lang-en">Active</span><span class="lang-ar">مباشر</span></span>`;
      } else if (app.status === 'dev') {
        statusBadge = `<span class="app-carousel-status pending" style="background: rgba(245, 158, 11, 0.15); color: #d97706;"><span class="lang-tr">Yapımda</span><span class="lang-en">Dev</span><span class="lang-ar">تطوير</span></span>`;
      } else {
        statusBadge = `<span class="app-carousel-status pending" style="background: rgba(2, 132, 199, 0.15); color: #0284c7;"><span class="lang-tr">Planlama</span><span class="lang-en">Pipeline</span><span class="lang-ar">تخطيط</span></span>`;
      }

      html += `
        <a href="${app.url}" class="app-carousel-item" onclick="event.stopPropagation();">
          <div class="app-carousel-icon">${iconMarkup}</div>
          <span class="app-carousel-name">${name}</span>
          ${statusBadge}
        </a>
      `;
    });

    carouselEl.innerHTML = html;
  }

  // Card Click Delegation: Clicking general card areas opens target section
  function initCardClickDelegation() {
    function bindCardClick(cardId, defaultPath) {
      var el = document.getElementById(cardId);
      if (!el) return;
      el.addEventListener('click', function(e) {
        if (e.target.closest('a')) return; // Allow direct links (inner titles/carousel items) to function natively
        var targetLang = getLang();
        var separator = defaultPath.indexOf('?') !== -1 ? '&' : '?';
        var destUrl = defaultPath + (targetLang !== 'tr' ? separator + 'lang=' + targetLang : '');
        window.location.href = destUrl;
      });
    }

    bindCardClick('hubCardBizce', 'blog/blog.html?type=bizce');
    bindCardClick('hubCardApps', 'apps.html');
    bindCardClick('hubCardGuncel', 'blog/blog.html?type=guncel');
    bindCardClick('hubCardAnilts', 'blog/blog.html?type=anilts');
  }

  // Global Engine Init
  function initHubEngine() {
    renderBlogBox('bizce', 'bizceLatestContent', 'bizceRecContent');
    renderBlogBox('guncel', 'guncelLatestContent', 'guncelRecContent');
    renderBlogBox('anilts', 'aniltsLatestContent', 'aniltsRecContent');
    renderAppCarousel();
    initCardClickDelegation();
  }

  // Listen for language changes from layout.js
  window.addEventListener('languageChanged', function() {
    initHubEngine();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHubEngine);
  } else {
    initHubEngine();
  }
})();
