/**
 * MSK Labs - Home Hub Dynamic Engine
 * Manages 4-box dynamic hub cards, latest post excerpts, unread recommendations, and app carousel.
 */

(function () {
  // Shared blog data fallback if blog.js is not loaded on homepage
  var hubBlogData = [
    {
      id: 4,
      type: "bizce",
      category: "Yazılım & Felsefe",
      date: "30 Eylül 2026",
      tr: {
        title: "Neden Ücretsiz? — Neden Kullanıcıyı Önceleyen Bir Yazılım Anlayışı?",
        summary: "Her şey bir ihtiyaçla başladı. MSK Labs'ın yazılım geliştirme felsefesi, reklam ve kullanıcı verisi politikası, sürdürülebilirlik mimarisi ve gelecek hedefleri üzerine kapsamlı bir değerlendirme."
      },
      en: {
        title: "Why Free? — Why a User-First Software Philosophy?",
        summary: "It all started with a need. A comprehensive evaluation of MSK Labs' software philosophy, user privacy, and sustainability model."
      },
      ar: {
        title: "لماذا مجاناً؟ — لماذا فلسفة البرمجيات التي تضع المستخدم أولاً؟",
        summary: "بدأ كل شيء بحاجة. تقييم شامل لفلسفة MSK Labs في تطوير البرمجيات وسياسة الإعلانات والخصوصية."
      }
    },
    {
      id: 1,
      type: "bizce",
      category: "Manifesto & İlk Makale",
      date: "29 Eylül 2026",
      tr: {
        title: "BİZCE Nedir? — Sessiz Kalabalığın Sesi ve Başka Bir Pencere",
        summary: "Herkesin söyleyecek bir sözü var. Bizim de var. BİZCE, insanı ve insanlığı ilgilendiren meseleleri kendi anlayışımız, değerlerimiz ve düşünce biçimimiz içerisinde yeniden ele almak için var."
      },
      en: {
        title: "What is BİZCE? — The Voice of the Silent Crowd & Another Window",
        summary: "Everyone has something to say. So do we. BİZCE exists to re-examine human affairs through our own understanding, values, and mindset."
      },
      ar: {
        title: "ما هو بَيْزَجَه (BİZCE)؟ — صوت الأغلبية الصامتة ونافذة أخرى",
        summary: "لكل شخص كلمة يريد إيصالها، ونحن كذلك. أنشئت بَيْزَجَه لإعادة تناول القضايا الإنسانية وفق قيمنا ورؤيتنا."
      }
    },
    {
      id: 2,
      type: "anilts",
      category: "Manifesto & İlk Makale",
      date: "29 Eylül 2026",
      tr: {
        title: "ANILTILAR Nedir? — Yaşanmışlıklardan İbret, Tecrübelerden Hikmet",
        summary: "Geçmişin izleri, geleceğin dersleri. ANILTILAR, anıların ve iniltilerin buluştuğu; yaşanmışlıkların tecrübeye, tecrübelerin de derslere dönüştüğü bir alandır."
      },
      en: {
        title: "What is ANILTILAR? — Lessons from Experiences, Wisdom from Memories",
        summary: "Traces of the past, lessons for the future. ANILTILAR is where memories and groans meet — transforming experiences into wisdom."
      },
      ar: {
        title: "ما هو أَنِلْتِيلَار (ANILTILAR)؟ — عبرة من التجارب وعكمة من الذكريات",
        summary: "آثار الماضي ودروس المستقبل. أَنِلْتِيلَار هي المساحة التي تلتقي فيها الذكريات والآهات لتحويل التجارب إلى حكم ودروس."
      }
    },
    {
      id: 5,
      type: "guncel",
      category: "Güncel Analiz & Toplum",
      date: "1 Ekim 2026",
      tr: {
        title: "Maçın Ertelenme Düdüğü Çalar, Herkes Kaldığı Yerden Devam Eder",
        summary: "Konyaspor ile Filistin Millî Futbol Takımı arasındaki dostluk maçı üzerinden; görünürdeki eylemler ile gerçek dayanışma, boykot bilinci ve samimi sorumluluk arasındaki fark üzerine bir GÜNCEL analizi."
      },
      en: {
        title: "When the Postponement Whistle Blows, Everyone Resumes Their Routine",
        summary: "An analysis on the friendly match between Konyaspor and the Palestine National Football Team: The distinction between superficial gestures and genuine solidarity."
      },
      ar: {
        title: "عندما تُنفخ صفارة التأجيل، يعود الجميع إلى حياتهم المعتادة",
        summary: "تحليل حول المباراة الودية بين قونية سبور والمنتخب الفلسطيني: الفرق بين المظاهر الرسمية والتضامن الفعلي الواعي."
      }
    },
    {
      id: 3,
      type: "guncel",
      category: "Manifesto & İlk Makale",
      date: "28 Eylül 2026",
      tr: {
        title: "GÜNCEL Nedir? — Görünenin Ötesine Bakmak",
        summary: "GÜNCEL, MSK Labs'ın yaşanan güncel olaylara kendi bakış açısıyla yaklaşmak ve olayları yalnızca görünen yönleriyle değil, arka planıyla birlikte değerlendirmek amacıyla oluşturduğu bir bölümdür."
      },
      en: {
        title: "What is GÜNCEL? — Looking Beyond the Surface",
        summary: "GÜNCEL is the section created by MSK Labs to approach current events from its own perspective and evaluate them beyond surface details."
      },
      ar: {
        title: "ما هو GÜNCEL؟ — النظر إلى ما وراء الظاهر",
        summary: "قسم GÜNCEL هو المساحة التي يتناول فيها MSK Labs الأحداث الجارية من منظوره الخاص لتقييمها خلفياتها وسياقاتها."
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
      id: "date-counter",
      name: { tr: "Date Counter", en: "Date Counter", ar: "Date Counter" },
      iconImg: "media/date-counter/icon.png",
      status: "active",
      url: "apps/date_counter.html"
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

  // Safe helper to extract localized title from blog post object
  function getPostTitle(post) {
    if (!post) return '';
    var lang = getLang();
    if (post[lang] && post[lang].title) return post[lang].title;
    if (post.tr && post.tr.title) return post.tr.title;
    if (typeof post.title === 'string') return post.title;
    return '';
  }

  // Render Category Dynamic Cards
  function renderBlogBox(type, latestElId, recElId) {
    var posts = (typeof blogPostsData !== 'undefined' && blogPostsData.length > 0) ? blogPostsData : hubBlogData;
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
      var latestTitleText = getPostTitle(latestPost);
      var langParam = (lang !== 'tr') ? '&lang=' + lang : '';
      var latestUrl = 'blog/blog.html?type=' + type + '&id=' + latestPost.id + langParam;
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
      var recTitleText = getPostTitle(recommendedPost);
      var recLangParam = (lang !== 'tr') ? '&lang=' + lang : '';
      var recUrl = 'blog/blog.html?type=' + type + '&id=' + recommendedPost.id + recLangParam;
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
