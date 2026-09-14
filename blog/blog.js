/**
 * MSK Labs - Bizce & Anıltılar Platform Engine
 * Dynamic post rendering, filtering, language switching, and Text-to-Speech (TTS)
 */
var currentLang = 'tr';
var currentSection = 'bizce'; // 'bizce' or 'anilts'
var currentSubFilter = 'all';
var currentPost = null;
var synth = window.speechSynthesis;
var currentUtterance = null;

var blogPostsData = [
  {
    "id": 1,
    "type": "bizce",
    "category": "Teknoloji & İnsanlık",
    "category_en": "Tech & Humanity",
    "category_ar": "التكنولوجيا والإنسانية",
    "date": "10 Eylül 2026",
    "readTime": "3 dk okuma",
    "icon": "🤖",
    "tr": {
      "title": "MAKALE 1: Yapay Zeka Çağında İnsani Değerler",
      "summary": "Teknolojinin sunduğu kolaylıklar ile insanın ahlaki sorumlulukları arasındaki dengeyi nasıl kuracağımıza dair inceleme.",
      "content": "<p>Günümüz dünyası, tarih boyunca görülmemiş bir teknolojik dönüşümün içerisinden geçiyor. Yapay zeka algoritmaları ve otomatik sistemler gündelik hayatımızın her alanını şekillendiriyor. Ancak bu hızlı gelişim beraberinde temel bir soruyu getiriyor: Teknoloji ilerlerken insani değerlerimizi nasıl koruyacağız? Geliştirdiğimiz yazılımlar sadece birer araçtır. Amaç insanın yaşam kalitesini artırmak ve faydalı işler üretmektir.</p>"
    },
    "en": {
      "title": "ARTICLE 1: Human Values in the Age of AI",
      "summary": "An essay on how to balance technological convenience with human moral responsibilities.",
      "content": "<p>Today's world is experiencing an unprecedented technological transformation. Artificial intelligence algorithms and automated systems shape every aspect of our daily lives. However, this rapid progress brings a fundamental question: As technology advances, how do we preserve our human values?</p>"
    },
    "ar": {
      "title": "المقال 1: القيم الإنسانية في عصر الذكاء الاصطناعي",
      "summary": "نص نموذجي حول كيفية إحداث التوازن بين التسهيلات التكنولوجية والمسؤوليات الأخلاقية.",
      "content": "<p>يمر عالمنا اليوم بتحول تكنولوجي غير مسبوق في التاريخ. تشكل خوارزميات الذكاء الاصطناعي والأنظمة المستقلة كل جانب من جوانب حياتنا اليومية.</p>"
    }
  },
  {
    "id": 2,
    "type": "bizce",
    "category": "Sosyal Yaşam & Gelecek",
    "category_en": "Social Life & Future",
    "category_ar": "الحياة الاجتماعية والمستقبل",
    "date": "08 Eylül 2026",
    "readTime": "4 dk okuma",
    "icon": "🧠",
    "tr": {
      "title": "MAKALE 2: Dijital Gürültü ve Zihinsel Odaklanma",
      "summary": "Sürekli bildirimlerin olduğu bir çağda zihinsel berraklığı yeniden kazanmanın yolları üzerine çalışma.",
      "content": "<p>Her gün binlerce dijital uyarıcı zihnimizi bölüyor. Odaklanma süresinin kısaldığı günümüzde, derinlemesine düşünmek ve kaliteli iş üretmek bir sanata dönüştü. Teknoloji hayatımızı kolaylaştırırken zihinsel yükümüzü de artırıyor.</p>"
    },
    "en": {
      "title": "ARTICLE 2: Digital Noise and Mental Focus",
      "summary": "A study on ways to reclaim mental clarity in an era of constant notifications.",
      "content": "<p>Every day, thousands of digital stimuli fragment our attention. In an age where attention spans are shrinking, deep thinking and producing quality work have become a fine art.</p>"
    },
    "ar": {
      "title": "المقال 2: الضوضاء الرقمية والتركيز الذهني",
      "summary": "مقال حول سبل استعادة الصفاء الذهني في عصر التنبيهات المستمرة.",
      "content": "<p>في كل يوم، تتسبب آلاف المنبهات الرقمية وتنبيهات البريد الإلكتروني في تشتيت أذهاننا.</p>"
    }
  },
  {
    "id": 3,
    "type": "bizce",
    "category": "Yazılım & Verimlilik",
    "category_en": "Software & Productivity",
    "category_ar": "البرمجيات والإنتاجية",
    "date": "05 Eylül 2026",
    "readTime": "5 dk okuma",
    "icon": "🖥️",
    "tr": {
      "title": "MAKALE 3: Sade Yaşam ve Minimalist Çalışma Düzeni",
      "summary": "Masaüstünüzdeki karmaşayı azaltarak verimliliği artırma felsefesi.",
      "content": "<p>Göz önündeki karmaşa, zihindeki karmaşayı tetikler. Bilgisayar masaüstümüzde biriken onlarca simge aslında zihinsel enerjimizi tüketir. Sadelik bir tercih değil, kaliteli bir yaşamın gerekliliğidir.</p>"
    },
    "en": {
      "title": "ARTICLE 3: Simple Living and Minimalist Workflow",
      "summary": "The philosophy of increasing productivity by reducing desktop clutter.",
      "content": "<p>Visual clutter triggers mental clutter. Dozens of icons accumulated on our computer desktops drain our mental energy.</p>"
    },
    "ar": {
      "title": "المقال 3: الحياة البسيطة وتنظيم العمل الأدنى",
      "summary": "مقال حول فلسفة زيادة الإنتاجية من خلال تقليل الفوضى.",
      "content": "<p>الفوضى البصرية تثير الفوضى الذهنية. العشرات من الأيقونات المتراكمة تستهلك طاقتنا الذهنية.</p>"
    }
  },
  {
    "id": 4,
    "type": "anilts",
    "category": "Yaşanmış Anı",
    "category_en": "Real Memoir",
    "category_ar": "ذكريات واقعية",
    "date": "11 Eylül 2026",
    "readTime": "6 dk okuma",
    "icon": "📖",
    "tr": {
      "title": "ANILTILAR 1: İsimsiz Bir Nezaket ve Unutulmayan Ders",
      "summary": "Gerçek isimler verilmeden kaleme alınmış, yoğun bir çalışma gününde yaşanan ve hayata bakışı değiştiren samimi bir tecrübe hikayesi.",
      "content": "<p>Yıllar önce yoğun bir projenin tam ortasındayken, beklenmedik bir aksaklıkla karşılaştık. Herkesin stresli olduğu o anlarda, kurumdaki sessiz bir çalışan hiç yükümlülüğü olmadığı halde yanımıza gelip tek bir soru sordu: 'Nasıl yardımcı olabilirim?'</p><p>O gün bize gösterilen o karşılıksız destek, unvanların ve hiyerarşinin ötesinde insani dayanışmanın ne kadar kıymetli olduğunu öğretti. Gerçek liderlik ve ahlak, kimsenin görmediği anlarda gösterilen karşılıksız nezakette saklıdır.</p>"
    },
    "en": {
      "title": "ANILTILAR 1: An Anonymous Act of Kindness & Unforgettable Lesson",
      "summary": "A sincere memoir story written anonymously, reflecting a life-changing experience on a hectic work day.",
      "content": "<p>Years ago, right in the middle of an intense project, we encountered an unexpected breakdown. At a moment when everyone was stressed, a quiet colleague walked up to us with a single question: 'How can I help?'</p>"
    },
    "ar": {
      "title": "ANILTILAR 1: موقف إنساني ودرس لا يُنسى",
      "summary": "قصة واقيعة مجهولة الأسماء تعكس تجربة إنسانية غيرت وجهة نظرنا في الحياة.",
      "content": "<p>قبل سنوات، وفي منتصف مشروع مكثف، واجهنا عقبة غير متوقعة. في لحظة كان فيها الجميع متوتراً، تقدم زميل هادئ بسؤال واحد: 'كيف يمكنني المساعدة؟'</p>"
    }
  },
  {
    "id": 5,
    "type": "bizce",
    "category": "Teknoloji & İnsanlık",
    "category_en": "Tech & Humanity",
    "category_ar": "التكنولوجيا والإنسانية",
    "date": "04 Eylül 2026",
    "readTime": "4 dk okuma",
    "icon": "⚡",
    "tr": {
      "title": "MAKALE 4: Geleceğin Yazılım Mimarileri",
      "summary": "Modüler ve ölçeklenebilir sistem tasarımlarında dikkat edilmesi gereken temel prensipler.",
      "content": "<p>Yazılım geliştirmede sürdürülebilirlik en önemli kriterdir.</p>"
    },
    "en": {
      "title": "ARTICLE 4: Future Software Architectures",
      "summary": "Core principles in building modular and scalable systems.",
      "content": "<p>Sustainability is key in modern software engineering.</p>"
    },
    "ar": {
      "title": "المقال 4: معماريات البرمجيات المستقبلية",
      "summary": "المبادئ الأساسية لبناء أنظمة قابلة للتوسع.",
      "content": "<p>الاستدامة هي المفتاح في هندسة البرمجيات الحديثة.</p>"
    }
  },
  {
    "id": 6,
    "type": "bizce",
    "category": "Düşünce & Fikir",
    "category_en": "Thought & Idea",
    "category_ar": "الفكر والأفكار",
    "date": "01 Eylül 2026",
    "readTime": "3 dk okuma",
    "icon": "🌱",
    "tr": {
      "title": "MAKALE 5: Sürekli Öğrenme ve Gelişim Kültürü",
      "summary": "Teknoloji dünyasında güncel kalmanın ve kişisel gelişimin sürdürülebilir yolları.",
      "content": "<p>Öğrenmek ömür boyu devam eden bir yolculuktur.</p>"
    },
    "en": {
      "title": "ARTICLE 5: Culture of Continuous Learning",
      "summary": "Sustainable approaches to personal growth in tech.",
      "content": "<p>Learning is a lifelong journey.</p>"
    },
    "ar": {
      "title": "المقال 5: ثقافة التعلم المستمر",
      "summary": "نهج مستدام للنمو الشخصي في التكنولوجيا.",
      "content": "<p>التعلم رحلة مدى الحياة.</p>"
    }
  }
];

function updateHeaderAndTabs() {
  var mainTitle = document.getElementById('headerMainTitle');
  var btnBizce = document.getElementById('tabBizce');
  var btnAnilts = document.getElementById('tabAnilts');

  if (currentSection === 'anilts') {
    if (btnBizce) btnBizce.className = 'section-tab-btn';
    if (btnAnilts) btnAnilts.className = 'section-tab-btn active-anilts';

    if (mainTitle) {
      if (currentLang === 'ar') mainTitle.innerText = '📖 أنيلتيلار';
      else if (currentLang === 'en') mainTitle.innerText = '📖 ANILTILAR';
      else mainTitle.innerText = '📖 ANILTILAR';
    }
  } else {
    if (btnBizce) btnBizce.className = 'section-tab-btn active-bizce';
    if (btnAnilts) btnAnilts.className = 'section-tab-btn';

    if (mainTitle) {
      if (currentLang === 'ar') mainTitle.innerText = '✍️ بيزجه';
      else if (currentLang === 'en') mainTitle.innerText = '✍️ BİZCE';
      else mainTitle.innerText = '✍️ BİZCE';
    }
  }

  if (btnBizce) {
    if (currentLang === 'ar') btnBizce.innerText = '✍️ بيزجه';
    else if (currentLang === 'en') btnBizce.innerText = '✍️ BİZCE';
    else btnBizce.innerText = '✍️ BİZCE';
  }
  if (btnAnilts) {
    if (currentLang === 'ar') btnAnilts.innerText = '📖 أنيلتيلار';
    else if (currentLang === 'en') btnAnilts.innerText = '📖 ANILTILAR';
    else btnAnilts.innerText = '📖 ANILTILAR';
  }
}

function switchSection(sec) {
  stopTTS();
  currentSection = sec;
  currentSubFilter = 'all';
  currentPost = null;

  var listView = document.getElementById('listView');
  var readerView = document.getElementById('readerView');
  if (readerView) readerView.style.display = 'none';
  if (listView) listView.style.display = 'block';

  updateHeaderAndTabs();
  renderSubCategories();
  renderPosts();
  if (typeof window.highlightActiveTopNav === 'function') window.highlightActiveTopNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSubCategories() {
  var pillsContainer = document.getElementById('subCategoryPills');
  if (!pillsContainer) return;

  if (currentSection === 'anilts') {
    var tAll = (currentLang === 'ar' ? '🌟 جميع الذكريات' : (currentLang === 'en' ? '🌟 All Memoirs' : '🌟 Tüm Anıltılar'));
    var tLife = (currentLang === 'ar' ? '🌿 دروس الحياة' : (currentLang === 'en' ? '🌿 Life Lessons' : '🌿 Hayat Dersleri'));
    var tWork = (currentLang === 'ar' ? '🤝 حياة العمل' : (currentLang === 'en' ? '🤝 Work Life' : '🤝 Çalışma Hayatı'));

    pillsContainer.innerHTML = 
      '<button class="cat-pill ' + (currentSubFilter === 'all' ? 'active' : '') + '" onclick="setSubFilter(\'all\')">' + tAll + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'life' ? 'active' : '') + '" onclick="setSubFilter(\'life\')">' + tLife + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'work' ? 'active' : '') + '" onclick="setSubFilter(\'work\')">' + tWork + '</button>';
  } else {
    var tAllBizce = (currentLang === 'ar' ? '🌟 جميع مقالات بيزجه' : (currentLang === 'en' ? '🌟 All Bizce Articles' : '🌟 Tüm Bizce Yazıları'));
    var tTech = (currentLang === 'ar' ? '💻 التكنولوجيا' : (currentLang === 'en' ? '💻 Technology' : '💻 Teknoloji'));
    var tThought = (currentLang === 'ar' ? '🧠 الفكر والأفكار' : (currentLang === 'en' ? '🧠 Thought & Ideas' : '🧠 Düşünce & Fikir'));

    pillsContainer.innerHTML = 
      '<button class="cat-pill ' + (currentSubFilter === 'all' ? 'active' : '') + '" onclick="setSubFilter(\'all\')">' + tAllBizce + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'tech' ? 'active' : '') + '" onclick="setSubFilter(\'tech\')">' + tTech + '</button>' +
      '<button class="cat-pill ' + (currentSubFilter === 'thought' ? 'active' : '') + '" onclick="setSubFilter(\'thought\')">' + tThought + '</button>';
  }
}

function setSubFilter(sub) {
  currentSubFilter = sub;
  renderSubCategories();
  renderPosts();
}

function updateReaderViewLanguage() {
  if (!currentPost) return;

  var langData = currentPost[currentLang] || currentPost['tr'];
  var category = currentPost['category_' + currentLang] || currentPost.category;

  var elCategory = document.getElementById('readCategory');
  var elTitle = document.getElementById('readTitle');
  var elDate = document.getElementById('readDate');
  var elTime = document.getElementById('readTime');
  var elContent = document.getElementById('readContent');
  var lblBack = document.getElementById('lblBack');

  if (elCategory) elCategory.innerText = category;
  if (elTitle) elTitle.innerText = langData.title;
  if (elDate) elDate.innerText = currentPost.date;

  var readTimeStr = currentPost.readTime;
  if (currentLang === 'en') {
    readTimeStr = readTimeStr.replace('dk okuma', 'min read');
  } else if (currentLang === 'ar') {
    readTimeStr = readTimeStr.replace(/(\d+)\s*dk okuma/, 'قراءة $1 دقائق');
  }
  if (elContent) {
    elContent.innerHTML = langData.content;
    applyFontSize();
  }

  // TTS UI elements
  var ttsHeader = document.querySelector('.tts-header span');
  if (ttsHeader) {
    if (currentLang === 'ar') ttsHeader.innerText = '🔊 محرك القراءة الصوتية (TTS)';
    else if (currentLang === 'en') ttsHeader.innerText = '🔊 Voice Reading Engine (TTS)';
    else ttsHeader.innerText = '🔊 Sesli Okuma Motoru (Text-to-Speech)';
  }

  var btnPlay = document.getElementById('btnPlay');
  var btnPause = document.getElementById('btnPause');
  var btnStop = document.getElementById('btnStop');

  if (btnPlay) btnPlay.innerText = (currentLang === 'ar' ? '▶️ استماع' : (currentLang === 'en' ? '▶️ Listen' : '▶️ Dinle'));
  if (btnPause) btnPause.innerText = (currentLang === 'ar' ? '⏸️ إيقاف مؤقت' : (currentLang === 'en' ? '⏸️ Pause' : '⏸️ Duraklat'));
  if (btnStop) btnStop.innerText = (currentLang === 'ar' ? '⏹️ إيقاف' : (currentLang === 'en' ? '⏹️ Stop' : '⏹️ Durdur'));

  var voiceLabels = document.querySelectorAll('.tts-selects label');
  if (voiceLabels && voiceLabels.length >= 2) {
    voiceLabels[0].innerText = (currentLang === 'ar' ? 'الصوت:' : (currentLang === 'en' ? 'Voice:' : 'Ses:'));
    voiceLabels[1].innerText = (currentLang === 'ar' ? 'السرعة:' : (currentLang === 'en' ? 'Speed:' : 'Hız:'));
  }

  var genderSel = document.getElementById('voiceGender');
  if (genderSel && genderSel.options.length >= 2) {
    genderSel.options[0].text = (currentLang === 'ar' ? '👨 رجل' : (currentLang === 'en' ? '👨 Male' : '👨 Erkek'));
    genderSel.options[1].text = (currentLang === 'ar' ? '👩 امرأة' : (currentLang === 'en' ? '👩 Female' : '👩 Kadın'));
  }
  checkAndDetectDeviceVoices();

  var speedSel = document.getElementById('voiceSpeed');
  if (speedSel && speedSel.options.length >= 3) {
    speedSel.options[0].text = '1.0x';
    speedSel.options[1].text = '1.25x';
    speedSel.options[2].text = '1.5x';
  }

  var lblFontSizer = document.getElementById('lblFontSizer');
  var btnFontReset = document.getElementById('btnFontReset');
  if (lblFontSizer) {
    lblFontSizer.innerText = (currentLang === 'ar' ? 'حجم الخط:' : (currentLang === 'en' ? 'Text Size:' : 'Yazı Boyutu:'));
  }
  if (btnFontReset) {
    btnFontReset.innerText = (currentLang === 'ar' ? 'إعادة ضبط' : (currentLang === 'en' ? 'Reset' : 'Sıfırla'));
  }
}

function setLang(lang) {
  currentLang = lang || 'tr';
  try {
    localStorage.setItem('user_lang', currentLang);
  } catch(e) {}

  document.body.className = 'lang-' + currentLang;
  if (currentLang === 'ar') {
    document.body.setAttribute('dir', 'rtl');
  } else {
    document.body.removeAttribute('dir');
  }

  var btns = document.querySelectorAll('.lang-switcher button');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].getAttribute('data-lang') === currentLang) {
      btns[i].classList.add('active');
    } else {
      btns[i].classList.remove('active');
    }
  }

  updateHeaderAndTabs();

  var readerView = document.getElementById('readerView');
  var isReading = (currentPost !== null && readerView && readerView.style.display !== 'none');

  if (isReading) {
    updateReaderViewLanguage();
    if (synth && synth.speaking) {
      playTTS();
    }
  } else {
    renderSubCategories();
    renderPosts();
  }
}

function renderPosts() {
  var grid = document.getElementById('postsGrid');
  var listSection = document.getElementById('postsListSection');
  var listContainer = document.getElementById('postsListContainer');
  var listTitle = document.getElementById('listSectionTitle');

  if (!grid) return;
  grid.innerHTML = '';
  if (listContainer) listContainer.innerHTML = '';

  var pageInd = document.getElementById('pageIndicator');
  if (pageInd) {
    if (currentLang === 'ar') pageInd.innerText = 'صفحة 1 / 1';
    else if (currentLang === 'en') pageInd.innerText = 'Page 1 / 1';
    else pageInd.innerText = 'Sayfa 1 / 1';
  }

  var pagButtons = document.querySelectorAll('.pagination-bar button');
  if (pagButtons && pagButtons.length >= 3) {
    pagButtons[0].innerText = (currentLang === 'ar' ? '« السابق' : (currentLang === 'en' ? '« Previous' : '« Önceki'));
    pagButtons[2].innerText = (currentLang === 'ar' ? 'التالي »' : (currentLang === 'en' ? 'Next »' : 'Sonraki »'));
  }

  // KESİN AYRIŞTIRMA: Sadece geçerli section ('bizce' veya 'anilts') filtrelenir!
  var filtered = blogPostsData.filter(function(p) {
    return p.type === currentSection;
  });

  var featuredPosts = filtered.slice(0, 4);
  var remainingPosts = filtered.slice(4);

  // 1. İLK 4 ÖNE ÇIKAN KART
  for (var i = 0; i < featuredPosts.length; i++) {
    var post = featuredPosts[i];
    var langData = post[currentLang] || post['tr'];
    var category = post['category_' + currentLang] || post.category;
    var isAnilts = (post.type === 'anilts');

    var card = document.createElement('div');
    card.className = 'post-card';
    card.setAttribute('data-id', post.id);
    card.onclick = (function(pId) {
      return function() { openPost(pId); };
    })(post.id);

    var btnText = (currentLang === 'ar' ? 'اقرأ المزيد ←' : (currentLang === 'en' ? 'Read Story →' : 'Devamını Oku →'));
    var ttsText = (currentLang === 'ar' ? 'استماع' : (currentLang === 'en' ? 'Listen' : 'Sesli Dinle'));

    var imgClass = 'card-img-placeholder' + (isAnilts ? ' card-img-anilts' : '');
    var tagClass = 'post-tag' + (isAnilts ? ' post-tag-anilts' : '');
    var readMoreClass = 'read-more-btn' + (isAnilts ? ' read-more-anilts' : '');

    var readTimeStr = post.readTime;
    if (currentLang === 'en') {
      readTimeStr = readTimeStr.replace('dk okuma', 'min read');
    } else if (currentLang === 'ar') {
      readTimeStr = readTimeStr.replace(/(\d+)\s*dk okuma/, 'قراءة $1 دقائق');
    }

    card.innerHTML = '<div class="' + imgClass + '">' + (post.icon || '📝') + '</div>' +
      '<div class="card-body">' +
        '<div>' +
          '<div class="post-meta">' +
            '<span class="' + tagClass + '">' + category + '</span>' +
            '<span>' + readTimeStr + '</span>' +
          '</div>' +
          '<h2 class="post-title">' + langData.title + '</h2>' +
          '<p class="post-excerpt">' + langData.summary + '</p>' +
        '</div>' +
        '<div class="card-actions">' +
          '<span class="' + readMoreClass + '">' + btnText + '</span>' +
          '<span class="card-tts-badge">🔊 ' + ttsText + '</span>' +
        '</div>' +
      '</div>';
    grid.appendChild(card);
  }

  // 2. 4'TEN SONRAKİ YAZILAR İÇİN KOMPAKT LİSTE
  if (remainingPosts.length > 0 && listSection && listContainer) {
    listSection.style.display = 'block';
    if (listTitle) {
      listTitle.innerText = (currentLang === 'ar' ? '📋 مقالات أخرى' : (currentLang === 'en' ? '📋 Other Articles' : '📋 Diğer Tüm Yazılar'));
    }

    for (var j = 0; j < remainingPosts.length; j++) {
      var rPost = remainingPosts[j];
      var rLangData = rPost[currentLang] || rPost['tr'];
      var rCategory = rPost['category_' + currentLang] || rPost.category;
      var rIsAnilts = (rPost.type === 'anilts');

      var listItem = document.createElement('div');
      listItem.className = 'post-list-item';
      listItem.setAttribute('data-id', rPost.id);
      listItem.onclick = (function(pId) {
        return function() { openPost(pId); };
      })(rPost.id);

      var iconClass = 'list-item-icon' + (rIsAnilts ? ' anilts-icon' : '');
      var rTagClass = 'post-tag' + (rIsAnilts ? ' post-tag-anilts' : '');

      var rReadTimeStr = rPost.readTime;
      if (currentLang === 'en') {
        rReadTimeStr = rReadTimeStr.replace('dk okuma', 'min read');
      } else if (currentLang === 'ar') {
        rReadTimeStr = rReadTimeStr.replace(/(\d+)\s*dk okuma/, 'قراءة $1 دقائق');
      }

      listItem.innerHTML = '<div class="' + iconClass + '">' + (rPost.icon || '📝') + '</div>' +
        '<div class="list-item-content">' +
          '<h4 class="list-item-title">' + rLangData.title + '</h4>' +
          '<div class="list-item-meta">' +
            '<span class="' + rTagClass + '">' + rCategory + '</span>' +
            '<span>📅 ' + rPost.date + '</span>' +
            '<span>⏱️ ' + rReadTimeStr + '</span>' +
          '</div>' +
        '</div>';

      listContainer.appendChild(listItem);
    }
  } else if (listSection) {
    listSection.style.display = 'none';
  }
}

function openPost(id) {
  stopTTS();
  currentPost = blogPostsData.find(function(p) { return p.id === id; });
  if (!currentPost) return;

  currentSection = currentPost.type;
  updateHeaderAndTabs();
  updateReaderViewLanguage();

  var listView = document.getElementById('listView');
  var readerView = document.getElementById('readerView');
  if (listView) listView.style.display = 'none';
  if (readerView) readerView.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showList() {
  stopTTS();
  currentPost = null;
  var readerView = document.getElementById('readerView');
  var listView = document.getElementById('listView');
  if (readerView) readerView.style.display = 'none';
  if (listView) listView.style.display = 'block';
  updateHeaderAndTabs();
  renderSubCategories();
  renderPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function playTTS() {
  if (!synth) return alert("Tarayıcınız sesli okuma özelliğini desteklemiyor.");
  if (synth.speaking && synth.paused) {
    synth.resume();
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'inline-flex';
    return;
  }

  synth.cancel();

  var readContent = document.getElementById('readContent');
  var articleText = readContent ? readContent.innerText : '';
  currentUtterance = new SpeechSynthesisUtterance(articleText);

  if (currentLang === 'tr') currentUtterance.lang = 'tr-TR';
  else if (currentLang === 'en') currentUtterance.lang = 'en-US';
  else if (currentLang === 'ar') currentUtterance.lang = 'ar-SA';

  var speedEl = document.getElementById('voiceSpeed');
  var speed = parseFloat(speedEl ? speedEl.value : '1.0');
  currentUtterance.rate = speed;

  var voices = synth.getVoices();
  var genderEl = document.getElementById('voiceGender');
  var genderPref = genderEl ? genderEl.value : 'male';
  
  var langPrefix = currentUtterance.lang.slice(0, 2).toLowerCase();
  var langVoices = voices.filter(function(v) {
    return v.lang.toLowerCase().startsWith(langPrefix);
  });

  var femaleKeywords = ['female', 'zira', 'yelda', 'seda', 'emel', 'filiz', 'dilara', 'ayşegül', 'gül', 'woman', 'lady'];
  var maleKeywords = ['male', 'david', 'tolga', 'cem', 'ahmet', 'man', 'guy'];

  var matchedVoice = null;
  var isExactGenderMatch = false;

  if (langVoices.length > 0) {
    if (genderPref === 'female') {
      matchedVoice = langVoices.find(function(v) {
        var lowerName = v.name.toLowerCase();
        return femaleKeywords.some(function(kw) { return lowerName.includes(kw); });
      });
    } else {
      matchedVoice = langVoices.find(function(v) {
        var lowerName = v.name.toLowerCase();
        return maleKeywords.some(function(kw) { return lowerName.includes(kw); });
      });
    }

    if (matchedVoice) {
      isExactGenderMatch = true;
    } else {
      matchedVoice = langVoices[0]; // Fallback to available voice
    }
  }

  if (matchedVoice) {
    currentUtterance.voice = matchedVoice;
  }

  var noticeEl = document.getElementById('ttsNotice');
  var noticeTextEl = document.getElementById('ttsNoticeText');

  // Keep pitch at natural 1.0 tone under all circumstances
  currentUtterance.pitch = 1.0;

  if (genderPref === 'female') {
    if (isExactGenderMatch) {
      if (noticeEl) noticeEl.style.display = 'none';
    } else {
      if (noticeEl) {
        noticeEl.style.display = 'block';
        var noticeMsg = (currentLang === 'ar' 
          ? 'ℹ️ لم يتم العثور على محرك صوت نسائي في جهازك؛ يتم القراءة بالمحرك الصوتي المتاح. (عند إضافة حزمة صوت نسائي في إعدادات جهازك سيعمل تلقائياً.)'
          : (currentLang === 'en'
              ? 'ℹ️ Dedicated female voice engine is not installed on your device; reading with default male voice. (Adding a female voice package in your OS settings will activate this feature.)'
              : 'ℹ️ Cihazınızda tanımlı Kadın ses paketi bulunmadığı için okuma mevcut Erkek ses motoru ile yapılmaktadır. (İşletim sistemi ayarlarınızdan Türkçe Kadın ses paketi eklediğinizde otomatik aktifleşecektir.)'));
        if (noticeTextEl) noticeTextEl.innerText = noticeMsg;
        else noticeEl.innerText = noticeMsg;
      }
    }
  } else {
    if (noticeEl) noticeEl.style.display = 'none';
  }

  currentUtterance.onstart = function() {
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'inline-flex';
  };
  currentUtterance.onend = function() {
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'none';
  };

  synth.speak(currentUtterance);
}

function hideTTSNotice() {
  var noticeEl = document.getElementById('ttsNotice');
  if (noticeEl) noticeEl.style.display = 'none';
}

function pauseTTS() {
  if (synth && synth.speaking) {
    synth.pause();
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'none';
  }
}

function stopTTS() {
  if (synth) {
    synth.cancel();
    var wave = document.getElementById('audioWave');
    if (wave) wave.style.display = 'none';
  }
}

function restartTTSIfPlaying() {
  if (synth && synth.speaking) {
    playTTS();
  }
}

function handleUrlParams() {
  var params = new URLSearchParams(window.location.search);
  var typeParam = (params.get('type') || params.get('cat') || '').toLowerCase();
  var sec = 'bizce';
  if (typeParam === 'anilts' || typeParam === 'aniltilar' || typeParam === 'anilti') {
    sec = 'anilts';
  }
  switchSection(sec);
}

document.addEventListener("DOMContentLoaded", function() {
  var storedLang = localStorage.getItem('user_lang') || 'tr';
  currentLang = storedLang;

  handleUrlParams();
  setLang(currentLang);
  applyFontSize();
});

// Intercept clicks on Bizce & Anıltılar nav links for instant list view switching without reload
document.addEventListener('click', function(e) {
  var a = e.target.closest('a');
  if (!a) return;
  var href = a.getAttribute('href');
  if (href && href.indexOf('blog.html') !== -1) {
    if (href.indexOf('type=anilts') !== -1 || href.indexOf('cat=anilts') !== -1) {
      e.preventDefault();
      try { window.history.pushState({}, '', href); } catch(err) {}
      switchSection('anilts');
    } else if (href.indexOf('type=bizce') !== -1 || href.indexOf('cat=bizce') !== -1) {
      e.preventDefault();
      try { window.history.pushState({}, '', href); } catch(err) {}
      switchSection('bizce');
    }
  }
});

window.addEventListener('popstate', function() {
  handleUrlParams();
});

/* --- Erişilebilirlik: Okuma Metni Boyutu Ölçekleme (Font Resizer) --- */
var currentFontOffset = parseInt(localStorage.getItem('msk_font_offset') || '0', 10);

function checkAndDetectDeviceVoices() {
  if (!synth) return;
  var voices = synth.getVoices();
  if (!voices || voices.length === 0) return;

  var langPrefix = (currentLang || 'tr').slice(0, 2).toLowerCase();
  var langVoices = voices.filter(function(v) {
    return v.lang.toLowerCase().startsWith(langPrefix);
  });

  var femaleKeywords = ['female', 'zira', 'yelda', 'seda', 'emel', 'filiz', 'dilara', 'ayşegül', 'gül', 'woman', 'lady'];
  var hasFemale = langVoices.some(function(v) {
    var lower = v.name.toLowerCase();
    return femaleKeywords.some(function(kw) { return lower.includes(kw); });
  });

  var genderSel = document.getElementById('voiceGender');
  if (genderSel && genderSel.options.length >= 2) {
    if (!hasFemale && langVoices.length > 0) {
      genderSel.options[1].text = (currentLang === 'ar' 
        ? '👩 امرأة (غير متوفر)' 
        : (currentLang === 'en' ? '👩 Female (Not on device)' : '👩 Kadın (Cihazınızda Yok)'));
    } else {
      genderSel.options[1].text = (currentLang === 'ar' ? '👩 امرأة' : (currentLang === 'en' ? '👩 Female' : '👩 Kadın'));
    }
  }
}

if (synth) {
  synth.onvoiceschanged = checkAndDetectDeviceVoices;
}

function applyFontSize() {
  var elContent = document.getElementById('readContent');
  if (!elContent) return;

  var basePx = 17; // base ~1.05rem
  var newPx = basePx + currentFontOffset;

  elContent.style.fontSize = newPx + 'px';
  elContent.style.lineHeight = Math.round(newPx * 1.65) + 'px';

  var subElements = elContent.querySelectorAll('p, li, span, blockquote, div');
  subElements.forEach(function(el) {
    el.style.fontSize = newPx + 'px';
    el.style.lineHeight = Math.round(newPx * 1.65) + 'px';
  });

  try {
    localStorage.setItem('msk_font_offset', currentFontOffset.toString());
  } catch(e) {}
}

function changeFontSize(delta) {
  if (currentFontOffset < 12) { // Max +12pt offset
    currentFontOffset += delta;
    applyFontSize();
  }
}

function resetFontSize() {
  currentFontOffset = 0;
  applyFontSize();
}
