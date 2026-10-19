/**
 * MSK Labs - Central Apps Data Engine (Single Source of Truth for 20+ Applications)
 * Used by dynamic app showcase templates (app.html / apps/...)
 *
 * app_id standardı: alt_çizgi (app_catalog.json ile uyumlu)
 * Web alias'lar backward compat için korunuyor.
 */

window.MSK_APPS_DATA = {
  "haydinamaza": {
    id: "haydinamaza",
    icon: '<img src="media/haydinamaza/icon.png" alt="HaydiNamaza">',
    logoImg: "media/haydinamaza/icon.png",
    icon_url: "media/haydinamaza/icon.png",
    name: { tr: "HaydiNamaza", en: "HaydiNamaza", ar: "حي على الصلاة" },
    tagline: {
      tr: "Namaz Vakitleri, Ezan Alarmları & Kıble Bulucu",
      en: "Prayer Times, Azan Alerts & Qibla Compass",
      ar: "مواقيت الصلاة، تنبيهات الأذان البوصلة القبلة"
    },
    version: "2.1.0",
    platform: "Android / iOS",
    rating: "4.9 ⭐",
    description: {
      tr: "Haydi Namaza, günlük namaz vakitlerini Diyanet uyumlu hassas hesaplamalarla sunan, internet gerektirmeyen, %100 ücretsiz ve reklamsız bir mobil ibadet asistanıdır.",
      en: "Haydi Namaza provides accurate prayer times offline with no ads, completely free for all users worldwide.",
      ar: "تطبيق حي على الصلاة يوفر مواقيت الصلاة الدقيقة بدون إعلانات وبدون الحاجة للإنترنت."
    },
    features: [
      { tr: "Diyanet Uyumlu Vakitler", en: "Diyanet Compatible Times", ar: "مواقيت معتمدة" },
      { tr: "İnternetsiz Çalışma Hürriyeti", en: "100% Offline Functionality", ar: "يعمل بدون إنترنت" },
      { tr: "Gelişmiş Kıble Pusulası & Harita", en: "Advanced Qibla Compass & Map", ar: "بوصلة القبلة وخريطة" },
      { tr: "Reklamsız ve %100 Ücretsiz", en: "Ad-free & Completely Free", ar: "بدون إعلانات ومجاني 100%" }
    ],
    feature_cards: [
      { id: "card_1", icon: "🕋", title_tr: "Namaz Vakitleri & Canlı Sayaç / Widgetler", title_en: "Prayer Times & Live Countdown / Widgets", title_ar: "أوقات الصلاة والعداد التنازلي / أدوات الواجهة", description_tr: "İmsak, Güneş, Öğle, İkindi, Akşam ve Yatsı vakitleri, canlı geri sayım sayacı, farklı boyutlarda widget seçenekleri ve Diyanet İşleri Başkanlığı uyumlu vakit hesaplama desteği.", description_en: "Track Imsak, Sunrise, Dhuhr, Asr, Maghrib, and Isha prayer times with live countdown timer, multiple size widget options, and Diyanet-compatible calculations.", description_ar: "متابعة أوقات الإمساك، الشروق، الظهر، العصر، المغرب، والعشاء مع عداد تنازلي مباشر، أدوات واجهة (Widget) بأحجام متعددة، وحسابات متوافقة مع رئاسة الشؤون الدينية." },
      { id: "card_2", icon: "➕", title_tr: "İhtiyacınıza Göre Nafile Vakitler Ekleyin", title_en: "Add Custom & Nafilah Times", title_ar: "إضافة أوقات الصلاة النوافل والمخصصة", description_tr: "Yalnızca 6 temel vakitle sınırlı kalmayın; nafile veya özel takip etmek istediğiniz vakitleri listeye ekleyebilir, düzenleyebilir ve dilediğiniz zaman silebilirsiniz.", description_en: "Not limited to 6 basic prayer times; easily add, customize, track, and delete nafilah (voluntary) or custom prayer times according to your needs.", description_ar: "لا تقتصر على 6 أوقات أساسية؛ يمكنك إضافة أوقات صلاة نافلة أو مخصصة لمتابعتها، تعديلها، وحذفها بسهولة في أي وقت." },
      { id: "card_3", icon: "⚠️", title_tr: "Kerahat Vakitleri & Akıllı Görsel Uyarı", title_en: "Kerahat Times & Smart Visual Alert", title_ar: "أوقات الكراهة والتنبيه البصري الذكي", description_tr: "Kerahat vakitlerinde ana ekrandaki sayaç kartında canlı görsel uyarı belirir; kerahat süreleri tercih ettiğiniz fıkhi yapıya göre dakika bazında ayarlanabilir.", description_en: "Live visual alert appears on the countdown card during Kerahat times; durations can be customized in minutes according to your preferred Fiqh rules.", description_ar: "تنبيه بصري مباشر على بطاقة العداد أثناء أوقات الكراهة؛ مع إمكانية تعديل دقيقة بالدقائق وفق المذهب الفقهي المفضل لديك." },
      { id: "card_4", icon: "🧭", title_tr: "Güvenilir ve Kolay Kıble Yönü Tespiti", title_en: "Reliable & Easy Qibla Direction", title_ar: "تحديد اتجاه القبلة الموثوق والسهل", description_tr: "Cihaz pusula sensörleri ve konum özelliklerini kullanarak ekrandaki pratik yön göstergeleri ile Kıble istikametini karmaşa olmadan kolayca tespit edin.", description_en: "Easily determine the Qibla direction without complex technical jargon using your device's compass sensors, location services, and clear visual indicators.", description_ar: "تحديد اتجاه القبلة بسهولة وأمان دون تعقيدات تقنية من خلال مستشعرات البوصلة والموقع والمؤشرات البصرية الواضحة." },
      { id: "card_5", icon: "📖", title_tr: "Günlük Dinî İçerikler & Sesli Okuma (TTS)", title_en: "Daily Religious Content & Audio (TTS)", title_ar: "المحتوى الديني اليومي والقراءة الصوتية", description_tr: "Doğrulanmış Ayet, Hadis, Esma-i Hüsna ve Allah'ın Sıfatları; Türkçe canlı sesli okuma (TTS), bas-durdur kontrolleri ve akıcı panel geçişleri.", description_en: "Verified Ayah, Hadith, Asma-ul-Husna, and Attributes; live Turkish Text-to-Speech (TTS) reading with tap-to-stop controls and smooth page swiping.", description_ar: "آيات، أحاديث، الأسماء الحسنى، وصفات الله الموثوقة؛ قراءة صوتية باللغة التركية (TTS) مع إمكانية الإيقاف الفوري والتمرير السلس." },
      { id: "card_6", icon: "🔇", title_tr: "Namazda Sessiz Kal Otomasyonu", title_en: "Auto Prayer Silence Mode", title_ar: "أتمتة وضع الصمت أثناء الصلاة", description_tr: "Namaz vakti girdiğinde telefonunuzu otomatik olarak sessiz/titreşim moduna alır ve belirlenen süre sonunda ses seviyesini eski haline geri döndürür.", description_en: "Automatically switches your phone to silent/vibrate mode when prayer time starts, and restores original volume settings after the set duration.", description_ar: "تحويل الهاتف تلقائياً إلى وضع الصمت أو الاهتزاز عند دخول وقت الصلاة، وإعادة ضبط مستوى الصوت السابق بعد انتهاء المدة المحددة." },
      { id: "card_7", icon: "⚙️", title_tr: "Özelleştirilebilir Bildirimler & Sesli Hatırlatma", title_en: "Custom Notifications & Voice Reminders", title_ar: "إشعارات مخصصة والتذكير الصوتي", description_tr: "Ana ve nafile vakitler için birleşik ses/titreşim toggle ayarları; ezan öncesi belirlediğiniz sürede kişisel metninizi Türkçe sesli okuyan akıllı hatırlatıcı.", description_en: "Unified audio/vibration toggles for main and nafilah times; smart pre-prayer reminder reading your custom text aloud prior to prayer time.", description_ar: "مفاتيح موحدة للصوت والاهتزاز للأوقات الأساسية والنوافل؛ تذكير ذكي يقرأ نصك المخصص بصوت عالٍ قبل دخول الوقت بمدة محددة." },
      { id: "card_8", icon: "📍", title_tr: "Konum Yönetimi & Favori Şehirler", title_en: "Location Management & Favorites", title_ar: "إدارة المواقع والمدن المفضلة", description_tr: "Türkiye ve dünya üzerindeki şehir ve ilçeler arasından arama yapma, konum seçimi ve sık ziyaret edilen yerleri favorilere ekleyerek hızlı erişim.", description_en: "Search and select cities/districts across Turkey and worldwide, save favorite locations, and switch quickly between your saved places.", description_ar: "البحث واختيار المدن والأقضية في تركيا وحول العالم، إضافة المواقع المفضلة، والتنقل السريع بين الأماكن المحفوظة." },
      { id: "card_9", icon: "⚡", title_tr: "%100 Çevrimdışı Kullanım (7 Günlük Önbellek) & Gizlilik", title_en: "100% Offline (7-Day Cache) & Privacy", title_ar: "100% عمل بدون إنترنت (تخزين 7 أيام) والخصوصية", description_tr: "İnternet sağlandığında 7 günlük vakit verilerini otomatik çevrimdışına alır; hesap gerektirmez, kişisel verileri cihazda saklar ve pil dostudur.", description_en: "Automatically caches 7-day prayer data for offline use when connected; no account required, stores settings on-device, and uses minimal battery.", description_ar: "التخزين التلقائي لأوقات الصلاة لمدة 7 أيام عند الاتصال بالإنترنت للاستخدام بدون إنترنت؛ لا يتطلب حساباً، يحفظ البيانات محلياً، وموفر للبطارية." }
    ],
    storeUrl: "https://play.google.com/store/apps/details?id=org.msklabs.haydinamaza",
    downloadPage: "dl.html?app=haydinamaza",
    supportPage: "destek.html?app=haydinamaza"
  },
  "deskpilot": {
    id: "deskpilot",
    icon: '<img src="media/deskpilot/icon.png" alt="DeskPilot">',
    logoImg: "media/deskpilot/icon.png",
    name: { tr: "DeskPilot", en: "DeskPilot", ar: "DeskPilot" },
    tagline: {
      tr: "Masaüstü Otomasyon ve Verimlilik Asistanı",
      en: "Desktop Automation & Productivity Assistant",
      ar: "مساعد الأتمتة المكتبي والكفاءة"
    },
    version: "1.4.2",
    platform: "Windows / macOS",
    rating: "4.8 ⭐",
    description: {
      tr: "DeskPilot, rutin masaüstü görevlerinizi otomatikleştiren, klavye kısayolları ve akıllı makrolarla verimliliğinizi 10 katına çıkaran hafif bir masaüstü yazılımıdır.",
      en: "DeskPilot automates desktop routines and boosts productivity with custom macros and lightweight design.",
      ar: "تطبيق DeskPilot للأتمتة المكتبية وتسهيل المهام اليومية بسرعة وكفاءة عالية."
    },
    features: [
      { tr: "Akıllı Makro Motoru", en: "Smart Macro Engine", ar: "محرك الماكرو الذكي" },
      { tr: "Tek Tıkla Görev Dizileri", en: "One-Click Task Sequences", ar: "سلسلة المهام بضغطة واحدة" },
      { tr: "Sistem Kaynağını Tüketmeyen Yapı", en: "Lightweight CPU & RAM Footprint", ar: "خفيف جداً على النظام" }
    ],
    storeUrl: "dl.html?app=deskpilot",
    downloadPage: "dl.html?app=deskpilot",
    supportPage: "destek.html?app=deskpilot"
  },
  "en_yakin": {
    id: "en_yakin",
    icon: '<img src="img/EnYakinLogo.svg" alt="En Yakın">',
    logoImg: "img/EnYakinLogo.svg",
    name: { tr: "En Yakın Camii & Mescid", en: "Nearest Mosque Finder", ar: "أقرب مسجد" },
    tagline: {
      tr: "Çevrenizdeki Tüm Camii ve Mescitleri Anında Bulun",
      en: "Locate Nearby Mosques & Prayer Places Instantly",
      ar: "العثور على أقرب المساجد والمصليات فوراً"
    },
    version: "1.2.0",
    platform: "Android / Web",
    rating: "4.9 ⭐",
    description: {
      tr: "Bulunduğunuz konuma en yakın cami ve mescitleri harita üzerinde yol tarifiyle birlikte listeleyen pratik navigasyon uygulaması.",
      en: "Find nearby mosques with real-time navigation and distance sorting.",
      ar: "تطبيق الخرائط والملاحة للعثور على أقرب المساجد والتوجيه إليها."
    },
    features: [
      { tr: "Canlı GPS Navigasyonu", en: "Live GPS Navigation", ar: "ملاحة GPS مباشرة" },
      { tr: "Cuma Namazı Yer Bulucu", en: "Friday Prayer Finder", ar: "محدد صلاة الجمعة" }
    ],
    storeUrl: "dl.html?app=enyakin",
    downloadPage: "dl.html?app=enyakin",
    supportPage: "destek.html?app=enyakin"
  },
  "date_counter": {
    id: "date_counter",
    icon: '<img src="media/date-counter/icon.png" alt="Date Counter">',
    logoImg: "media/date-counter/icon.png",
    name: { tr: "Date Counter (Tarih & Hedef Sayacı)", en: "Date Counter (Date & Goal Tracker)", ar: "Date Counter (عداد التاريخ والأهداف)" },
    tagline: {
      tr: "Masaüstü & Görev Çubuğu Zaman & Hedef Yönetim Sayacı",
      en: "Desktop & Taskbar Time & Goal Tracker",
      ar: "عداد إدارة الوقت والأهداف لسطح المكتب وشريط المهام"
    },
    version: "1.1.0",
    platform: "Windows Masaüstü",
    rating: "5.0 ⭐",
    description: {
      tr: "Emeklilik, sınav, proje teslimi, askerlik dönüşü ve özel günlerinizi masaüstünüzde ve görev çubuğunuzda anlık takip eden gelişmiş zaman sayacı.",
      en: "Sleek desktop and taskbar docking countdown timer for retirement, exams, project deadlines, and milestone dates.",
      ar: "عداد ومؤقت أنيق لسطح المكتب وشريط المهام لمتابعة التقاعد والامتحانات والتواريخ الهامة."
    },
    features: [
      { tr: "Görev Çubuğu Entegrasyonu (Taskbar Docking)", en: "Taskbar Docking & Widget", ar: "تكامل شريط المهام ودجت" },
      { tr: "3 Farklı Hesaplama Modu & 3 Dil", en: "3 Target Modes & 3 Languages", ar: "3 أنماط أهداف و 3 لغات" }
    ],
    storeUrl: "apps/date_counter.html",
    downloadPage: "apps/date_counter.html",
    supportPage: "destek.html?app=date-counter"
  },
  "gc_pil_uyari": {
    id: "gc_pil_uyari",
    icon: "🔋",
    logoImg: "",
    name: { tr: "GÇ Pil Uyarı", en: "GC Battery Alert", ar: "تنبيه البطارية" },
    tagline: {
      tr: "Akıllı Pil Sağlığı ve Şarj Uyarı Motoru",
      en: "Smart Battery Health & Charge Alert Engine",
      ar: "منبه صحة البطارية الشحن"
    },
    version: "1.1.0",
    platform: "Android",
    rating: "4.8 ⭐",
    description: {
      tr: "Bataryanızın ömrünü uzatmak için dolum seviyesi %80'e ulaştığında veya aşırı ısınmada sesli uyarı veren batarya koruyucu.",
      en: "Protect battery lifespan with customizable charge limit alerts and thermal safety sounds.",
      ar: "حماية البطارية من التلف والتنبيه الصوتي عند التخصيص."
    },
    features: [
      { tr: "%80 Şarj Koruma Alarmı", en: "80% Charge Limit Alarm", ar: "منبه شحن 80%" },
      { tr: "Sıcaklık ve Sağlık Analizi", en: "Temperature & Health Diagnostics", ar: "تشخيص الحرارة والصحة" }
    ],
    storeUrl: "dl.html?app=gcpiluyari",
    downloadPage: "dl.html?app=gcpiluyari",
    supportPage: "destek.html?app=gcpiluyari"
  },
  "rekatsay": {
    id: "rekatsay",
    icon: '<img src="media/rekatsay/icon.png" alt="RekatSay">',
    logoImg: "media/rekatsay/icon.png",
    name: { tr: "RekatSay", en: "Rakaat Counter", ar: "عداد الركعات" },
    tagline: {
      tr: "Sensör Tabanlı Otomatik Rekat Sayacı",
      en: "Sensor-Based Automatic Rakaat Counter",
      ar: "عداد الركعات التلقائي بالحساسات"
    },
    version: "1.3.1",
    platform: "Android",
    rating: "4.9 ⭐",
    description: {
      tr: "Namaz kılarken secde sensörlerini kullanarak kıldığınız rekatı ve secdeyi karıştırmadan otomatik sayan akıllı ibadet aracı.",
      en: "Automatically counts rakaat and sujud during prayer using phone proximity sensors.",
      ar: "تطبيق حساب عدد الركعات والسجدات تلقائياً عبر مستشعر التقارب."
    },
    features: [
      { tr: "Proximity Sensör Otomasyonu", en: "Proximity Sensor Automation", ar: "حساس التقارب الذكي" },
      { tr: "Secde Karıştırmaya Son", en: "Eliminates Sujud Confusion", ar: "منع السهو في الركعات" }
    ],
    storeUrl: "dl.html?app=rekatsay",
    downloadPage: "dl.html?app=rekatsay",
    supportPage: "destek.html?app=rekatsay"
  }
};

// Geriye dönük uyumluluk (Legacy Slug Alias'ları)
window.MSK_APPS_DATA["haydi_namaza"] = window.MSK_APPS_DATA["haydinamaza"];
window.MSK_APPS_DATA["date-counter"] = window.MSK_APPS_DATA["date_counter"];
window.MSK_APPS_DATA["enyakin"] = window.MSK_APPS_DATA["en_yakin"];
window.MSK_APPS_DATA["gcpiluyari"] = window.MSK_APPS_DATA["gc_pil_uyari"];
