# 📜 MSK Labs - Sistem Mimarisi, İstişare Notları ve Kararlar Dokümanı
# 📜 MSK Labs - System Architecture, Decision Log & Technical Specifications

> **Doküman Oluşturulma Tarihi / Creation Date:** 10 Eylül 2026 / September 10, 2026  
> **Amaç / Purpose:** MSK Labs web platformu ve 20+ mobil/masaüstü uygulamasının merkezi otomasyon altyapısına ilişkin alınan tüm kararların, veri akış haritalarının, Google E-Tablo entegrasyon detaylarının ve AI asistan yönergelerinin kalıcı rehberi.  
> *English:* A permanent reference guide documenting all architecture decisions, data flow schemas, Google Sheets integration specifications, and AI assistant guidelines for the MSK Labs web platform and 20+ applications.

---

## 🎯 1. Genel Mimari Stratejisi & Vizyon
## 🎯 1. Master Architectural Strategy & Vision

1 kişilik geliştirici ekibinin (MSK Labs) 20+ uygulamayı sıfır sunucu maliyeti ve minimum eforla yönetebilmesi amacıyla **3'lü Entegrasyon Modeli** kararlaştırılmıştır:  
*English:* A **3-Tier Integration Architecture** has been established to enable a single developer (MSK Labs) to manage 20+ apps with zero server costs and minimal operational overhead:

1. **Google E-Tablo (Spreadsheet - Veri Merkezi / Data Center):** Tüm dinamik verilerin (SSS, Duyurular, İndirme Sayaçları, Biletler, Yol Haritası) tek bir E-Tablo üzerinden yönetilmesi.  
   *English:* Centralized dynamic data management (FAQ, Announcements, Download Counters, Support Tickets, Feature Roadmap) via a single Google Spreadsheet.
2. **Cloudflare Pages / Serverless (Yayın Altyapısı / Edge Hosting):** Ücretsiz, sınırsız bant genişliği ve yüksek hızlı kenar sunucu (Edge) yayını.  
   *English:* High-performance static web hosting and serverless edge functions with unlimited bandwidth via Cloudflare Pages.
3. **Telegram Bot Entegrasyonu (Anlık Bildirim / Instant Notifications):** Destek formundan veya kritik hatalardan anında Telegram cebinize bilet bildirimi düşmesi.  
   *English:* Real-time push notifications sent directly to admin's Telegram client via custom Telegram Bot API upon support ticket creation or system alerts.

---

## 📊 2. Google E-Tablo Veri Tabanı Yapısı (Spreadsheet Schema)
## 📊 2. Google Sheets Database Schema

Google E-Tablo üzerinde aşağıdaki 6 sekme tanımlanmıştır. Tüm web sayfaları ve API uç noktaları bu sekmelerle senkronize çalışacak şekilde mimarilendirilmiştir:  
*English:* The following 6 sheets are defined in the Google Spreadsheet. All frontend web pages and backend API endpoints consume data from these sheets:

### 1️⃣ Sekme / Sheet 1: SSS_Listesi
* **Amacı / Purpose:** aq.html sayfasındaki akordeon soruları ve canlı aramayı besler. / Feeds live search and dynamic accordion questions on aq.html.
* **Sütunlar / Columns:** App_ID | Soru_TR | Cevap_TR | Soru_EN | Cevap_EN | Kategori | Aktif_Mi

### 2️⃣ Sekme / Sheet 2: Duyurular
* **Amacı / Purpose:** /api/announcement ve nnouncements.json üzerinden mobil uygulamalara uzaktan canlı duyuru ve zorunlu güncelleme (Force Update) iletir. / Delivers remote announcements and force update triggers to mobile apps via /api/announcement and nnouncements.json.
* **Sütunlar / Columns:** App_ID | Min_Version | Force_Update | Baslik_TR | Mesaj_TR | Buton_URL | Aktif_Mi

### 3️⃣ Sekme / Sheet 3: Destek_Biletleri
* **Amacı / Purpose:** destek.html üzerinden gönderilen tüm talepleri otomatik kaydeder ve Telegram Botuna iletir. / Stores support form submissions from destek.html and triggers instant Telegram bot alerts.
* **Sütunlar / Columns:** Tarih | Bilet_No | App_ID | App_Ver | Kategori | Eposta | Mesaj | Durum

### 4️⃣ Sekme / Sheet 4: Sayaclar_ve_Analiz
* **Amacı / Purpose:** ist.html (Gizli İstatistik Paneli - PIN: 175) sayfasında gösterilecek canlı metrikleri tutar. / Maintains live visitor, download, and AdSense metrics rendered on ist.html (PIN: 175).
* **Sütunlar / Columns:** Tarih | Tekil_Ziyaretci | Sayfa_Goruntuleme | HaydiNamaza_Indirme | RekatSay_Indirme | Emekli_Indirme | AdSense_Goruntuleme

### 5️⃣ Sekme / Sheet 5: Capraz_Promosyon
* **Amacı / Purpose:** promo.html sayfasında hangi uygulamanın altında hangi 3 uygulamanın tavsiye edileceğini belirleyen matristir. / Matrix defining which 3 apps to recommend under a given source app on promo.html.
* **Sütunlar / Columns:** Kaynak_App_ID | Onerilen_App_1 | Onerilen_App_2 | Onerilen_App_3

### 6️⃣ Sekme / Sheet 6: Yol_Haritasi_Oylama
* **Amacı / Purpose:** oadmap.html üzerindeki topluluk özellik isteklerini ve +1 oy sayaçlarını tutar. / Tracks feature request proposals and +1 vote counters on oadmap.html.
* **Sütunlar / Columns:** Feature_ID | App_ID | Baslik | Aciklama | Oy_Sayisi

---

## 🛠️ 3. Tamamlanan 12 Otomasyon Modülü ve URL Haritası
## 🛠️ 3. Completed 12 Automation Modules & URL Map

Tüm modüller ssets/css/global.css?v=25 ile %100 uyumlu, destek.html temiz beyaz kart formatında (#ffffff), koyu okunaklı metinlerle (%80 Slate Black #1e293b) kodlanmıştır:  
*English:* All modules inherit ssets/css/global.css?v=25, utilizing #ffffff white card containers and high-contrast #1e293b (80% Slate Black) typography:

| # | Modül Adı (TR) | Module Name (EN) | Dosya (File) | Query Parameters / Description |
|---|---|---|---|---|
| 1 | **Gizlilik Politikası** | Privacy Policy | privacy.html | ?app=haydinamaza&ver=2.1.0&os=android&lang=tr |
| 2 | **Kullanım Şartları** | Terms of Service | 	erms.html | ?app=haydinamaza&ver=2.1.0&os=android&lang=tr |
| 3 | **Canlı Duyuru API** | Live Announcement API | unctions/api/announcement.js / nnouncements.json | ?app=haydinamaza&ver=2.1.0 (Remote Force Update) |
| 4 | **Çapraz Promosyon Motoru** | Cross-Promotion Engine | promo.html | ?app=haydinamaza (App recommendations matrix) |
| 5 | **Modüler Akıllı SSS** | Modular FAQ | aq.html | ?app=haydinamaza (Live Search + Accordion) |
| 6 | **Akıllı Mağaza Puanlama** | Smart Review Router | eview-route.html | ?app=haydinamaza (5 Stars ➔ Store, 1-4 Stars ➔ Support Form) |
| 7 | **Akıllı İndirme & QR Kod** | Smart Download & QR | dl.html | ?app=haydinamaza (Device detection: Android ➔ Play Store, iOS ➔ App Store) |
| 8 | **Sürüm Günlüğü** | Release Changelog | changelog.html | ?app=haydinamaza (Version release history) |
| 9 | **Topluluk Yol Haritası** | Feature Roadmap | oadmap.html | Community feature request voting board |
| 10 | **Canlı Sistem Durumu** | System Status | status.html | 🟢 Service operational / Maintenance indicators |
| 11 | **Gizli İstatistik Paneli** | Admin Stats Dashboard | ist.html | **Access PIN: 175** (Visitor, Download & AdSense stats) |
| 12 | **Tüm Sayfalar Dizini** | Site Directory | pages.html | Central index map of all repository pages |

---

## 🔐 4. Alınan Özel Güvenlik, Tasarım ve Kodlama Kuralları

### 7️⃣ Mobil Uygulama & Web Reklam Stratejisi Kuralı / Mobile App & Web Monetization Policy Rule
* **Türkçe:** Tüm MSK Labs mobil uygulamaları (Haydi Namaza, RekatSay, Emekli Sayaç, DeskPilot vb.) **%100 ÜCRETSİZ ve REKLAMSIZDIR.** Mobil uygulamaların içine hiçbir şartta reklam konulmaz. Reklamlar sadece web platformu (msklabs.org) üzerindeki reklam alanlarında yayınlanır.
* **English:** All MSK Labs mobile applications are strictly **100% FREE and AD-FREE**. No in-app advertisements shall ever be placed inside mobile apps. Ad units are strictly restricted to the official web portal (msklabs.org).

## 🔐 4. Core Security, Design & AI Assistance Guidelines

İleride geliştirme yapacak tüm AI asistanları ve yazılımcılar aşağıdaki kurallara **%100 uymakla yükümlüdür**:  
*English:* All future AI assistants and developers MUST strictly adhere to the following enforcement rules:

1. **Yönetici PIN Kodu / Admin Access PIN:**  
   ist.html paneli için PIN kodu masaüstü RAR şifresi olan 571 ile karışmaması için **175** olarak kararlaştırılmıştır.  
   *English:* The admin dashboard PIN for ist.html is strictly **175** (differentiated from local archive passwords).
2. **Sıfır İzinsiz Görsel/Stil Değişiklik Kuralı / Strict UI/CSS Immutability Rule:**  
   Geliştiricinin (Kullanıcı) açık talebi veya onayı olmadan hiçbir renk, font, kart arka planı, kenar çizgisi veya CSS kuralı değiştirilemez! Tüm kartlar #ffffff beyaz zemin ve #1e293b (%80 Siyah) okunaklı metin kuralına sadık kalmalıdır.  
   *English:* NEVER modify visual designs, CSS variables, background colors, fonts, or layout alignments without explicit user permission. All containers MUST remain #ffffff white cards with #1e293b (80% Slate Black) high-contrast text.
3. **Sıfır Otomatik Push Kuralı / No Unprompted Git Push Rule:**  
   Kullanıcı açıkça "commit ve push yapalım" emri vermediği sürece yapılan hiçbir değişiklik git push ile uzak sunucuya gönderilemez. Değişiklikler sadece yerel git commit olarak saklanır.  
   *English:* NEVER execute git push without explicit user instruction. All local edits must remain as local git commit until user approves deployment.
4. **Google E-Tablo CORS & JSON Çıktı Standardı / Google Sheets CORS & JSON Protocol:**  
   Google Apps Script tarafında doGet ve doPost fonksiyonları yanıt verirken yanıt tipi ContentService.MimeType.JSON olmalı ve tarayıcı engelini aşmak için JSON string formatında döndürülmelidir.  
   *English:* Google Apps Script doGet/doPost endpoints MUST return ContentService.MimeType.JSON with open CORS handling to allow seamless frontend fetch calls.
5. **Telegram Bot Fallback ve Taslak Koruma Protocol / Telegram Fallback & Draft Preservation Protocol:**  
   destek.html formunda Telegram veya ağ bağlantısı başarısız olsa dahi bilet E-Tabloya yazılmalı, bilet numarası yerel cihazda (localStorage) saklanmalı ve kullanıcıya hata hissettirilmeden bilet makbuzu gösterilmelidir.  
   *English:* If Telegram notification API fails during ticket submission, the ticket payload MUST be persisted locally in localStorage and sent to Google Sheets, ensuring zero ticket loss.
6. **Önbellek Yenileme (Cache-Busting ?v=XX) Standardı / CSS Cache-Busting Rule:**  
   CSS ve script dosyalarında yapılan güncellemelerin kullanıcının tarayıcısına anında yansıması için HTML dosyalarında href="assets/css/global.css?v=XX" sürüm parametresi artırılmalıdır.  
   *English:* Whenever global.css is modified, bump the query parameter ?v=XX across all HTML files to force immediate browser cache eviction.
7. **Token Ekonomisi & Bağlam Optimizasyonu Kuralı / Token Economy & Context Optimization Policy:**  
   AI asistan yanıtları gereksiz uzunluktan arındırılmalı, öz ve nokta atışı olmalıdır. Dosya incelemelerinde tüm dosyayı çekmek yerine `grep_search` veya belirli satır aralıkları (`view_file`) tercih edilmeli; gereksiz araç çağrılarından ve büyük dökümlerden kaçınılarak token tasarrufu sağlanmalıdır.  
   *English:* AI responses MUST remain concise, direct, and token-efficient. Avoid dumping massive file contents or executing redundant tool loops; use targeted searches (`grep_search`) and precise line slices (`view_file`) to preserve model context.

---

## 📌 5. Canlıya Alma Sonrası Yapılacak Adımlar (Deployment Checklists)
## 📌 5. Post-Deployment Setup Checklist

Push yapıldıktan sonra Google ve Telegram tarafında yapılması gereken 2 küçük işlem:  
*English:* Two remaining operational setup tasks to execute after deployment:

1. **Google Apps Script Web App Deployment:**  
   Google E-Tablonuzdaki Apps Script kodunu "Web App" olarak yayınlayıp oluşturulan URL'yi destek.html, aq.html ve ist.html içindeki GOOGLE_SHEET_API_URL değişkenine yazmak.  
   *English:* Deploy Google Apps Script as a public Web App and paste the execution URL into GOOGLE_SHEET_API_URL variable in destek.html, aq.html, and ist.html.
2. **Telegram Bot Token Tanımlama / Telegram Bot Credential Configuration:**  
   Telegram @BotFather üzerinden alınan Bot Token ve Chat ID bilgisinin Apps Script ayarlarında saklanması.  
   *English:* Store Telegram @BotFather API Token and target Chat ID inside Apps Script Script Properties.

---

## 🌐 6. Canlı Yayınlanan Tüm Sayfalara Erişim Haritası (Live URL Map)
## 🌐 6. Live Application & Web Module Directory

Aşağıdaki bağlantılar Cloudflare Pages üzerinde canlı yayında olan tüm dinamik ve statik modüllerin URL haritasıdır:  
*English:* Complete directory of production URL endpoints hosted on Cloudflare Pages:

### 📜 Kurumsal & Yasal Sayfalar / Corporate & Legal Pages
* **Ana Sayfa Portföyü / Main Portfolio:** https://msklabs.org/index.html
* **Hakkımızda / About Us:** https://msklabs.org/about.html
* **Biz Kimiz / Who We Are:** https://msklabs.org/who-we-are.html
* **İletişim / Contact:** https://msklabs.org/contact.html
* **Dinamik Gizlilik Politikası / Dynamic Privacy Policy:** https://msklabs.org/privacy.html?app=haydinamaza
* **Dinamik Kullanım Şartları & EULA / Dynamic Terms of Service:** https://msklabs.org/terms.html?app=haydinamaza

### 🛠️ Mobil Otomasyon Servisleri / Mobile Automation Services
* **Modüler Akıllı SSS (Live Search FAQ):** https://msklabs.org/faq.html?app=haydinamaza
* **Çapraz Promosyon Motoru / Cross-Promotion Engine:** https://msklabs.org/promo.html?app=haydinamaza
* **Akıllı Mağaza Puanlama Yönlendiricisi / Smart Store Review Router:** https://msklabs.org/review-route.html?app=haydinamaza
* **Akıllı İndirme & QR Kodu Yönlendiricisi / Smart Download & QR Router:** https://msklabs.org/dl.html?app=haydinamaza
* **Sürüm Günlüğü & Yenilikler / Release Changelog:** https://msklabs.org/changelog.html?app=haydinamaza
* **Topluluk Yol Haritası & Oylama / Feature Roadmap Voting:** https://msklabs.org/roadmap.html
* **Canlı Sistem Durumu / System Status Monitor:** https://msklabs.org/status.html

### 🔐 Destek & Yönetim Paneli / Support & Administration
* **Canlı Destek & Bilet Formu / Live Support Ticket Form:** https://msklabs.org/destek.html
* **Gizli İstatistik Paneli (PIN: 175) / Admin Stats Dashboard:** https://msklabs.org/ist.html
* **Tüm Sayfalar Dizini / Site Directory Map:** https://msklabs.org/pages.html
* **Canlı Duyuru API (Static JSON) / Announcement Data (JSON):** https://msklabs.org/announcements.json
* **Remote Announcement API (Worker Endpoint):** https://msklabs.org/api/announcement?app=haydinamaza

---

## 🏛️ 8. "BİZCE" FİKİR PLATFORMU VE TEMİZ KLASÖR MİMARİSİ
## 🏛️ 8. "BIZCE" THOUGHT PLATFORM & CLEAN REPOSITORY ARCHITECTURE

### 📌 8.1 Vizyon ve Yayın Çizgisi / Vision & Editorial Focus
* **Türkçe:** MSK Labs portföyü (20-30 uygulama) genel teknoloji, masaüstü otomasyonu (DeskPilot), verimlilik ve günlük araçlardan oluşur (İslami uygulamalar %10-15 civarındadır). Bizce blog platformu; **teknoloji, insanlık, bilim, sosyal yaşam, evrensel değerler ve gelecek** temalarını kaleme alır. Yazarın kendi inanç dünyasından (İslam) süzülen etik ilkeler, tüm insanlığa hitap eden evrensel ve medeni bir dille sunulur.
* **English:** The MSK Labs application portfolio (20-30 apps) primarily consists of general technology, desktop automation (DeskPilot), productivity, and utility tools. The Bizce blog platform focuses on **technology, humanity, science, social dynamics, ethics, and future innovations**. Ethical values from the author's Muslim background are articulated in a universal, inclusive, and civilized tone.

### 📁 8.2 Klasör Düzeni & Çift Dosya Engelleme İlkesi / Directory Structure & Single Source Rules
* **/** (Ana Dizin): Sadece Tip 1 Kurumsal Çekirdek Sayfaları tutar (`index.html`, `about.html`, `contact.html`, `who-we-are.html`, `destek.html`, `status.html`, `pages.html`, `ist.html`, `app.html`). Ana dizinde hiçbir uygulama veya blog yönlendirme dosyası tutulmaz; kök dizin 100% temiz ve yalındır.
* **/apps/** (Uygulama Sayfaları): Tüm aktif uygulama detay sayfalarının TEK YETKİLİ adresidir (`apps/haydinamaza.html`, `apps/rekatsay.html`, `apps/emekli.html`, `apps/enyakin.html`, `apps/deskpilot.html`, `apps/gcpiluyari.html`). Geliştirici ve AI asistanı TÜM uygulama güncellemelerini YALNIZCA `/apps/` klasöründeki bu dosyalar üzerinde gerçekleştirir.
* **/blog/** (Yayın Platformu): `blog.html` (Bizce & Anıltılar platformu), `blog.js` (Yayın motoru ve TTS) dosyalarını barındırır.
* **/assets/**: Ortak JS (`assets/js/`), CSS (`assets/css/`), Data (`assets/js/apps-data.js`), Görseller (`img/`, `media/`).

### 🔊 8.3 Sesli Okuma Motoru (TTS - Text to Speech) Spesifikasyonu
* **Varsayılan Ses:** Erkek (Bay) sesi varsayılan olarak başlar. Kullanıcı dilerse Kadın (Bayan) sesine geçebilir (👨 Erkek / 👩 Kadın).
* **Anadili Diksiyon:** TR, EN ve AR dillerinde o dilin doğal ve fasih sentezleyicisi kullanılır.
* **Okuma Hızı:** 1.0x, 1.25x, 1.5x hız kontrolleri.

### 🔗 8.4 Blogger (Blogspot) Trafik Hunisi & SEO Stratejisi
* Blogger'a yazının tamamı konulmaz (İkiz içerik cezasını engellemek için).
* Sadece ilk 2-3 vurucu paragraf yer alır; altına 👉 [Yazının Tamamını Okumak ve Sesli Dinlemek İçin MSK Labs Bizce'ye Tıklayın →] butonu eklenerek 100% organik trafik msklabs.org/blog/blog.html adresine çekilir.

---

## 🏛️ 9. MODÜLER SAYFA VE ŞABLON MİMARİSİ KARARI
## 🏛️ 9. MODULAR PAGE & TEMPLATE ARCHITECTURE DECISION

### 📌 9.1 Tek Kişilik Geliştirici + AI İşbirliği İlkesi / Solo Developer + AI Operational Policy
* **Türkçe:** MSK Labs bünyesinde tek bir kurucu/geliştirici ve AI asistanı bulunmaktadır. 500+ sayfa ölçeğine ulaşıldığında menü veya kod güncellemelerinin tek tek HTML dosyalarına yapılması sürdürülemez. Tüm sayfa yapıları modüler hale getirilecek, tek bir merkezi JavaScript bileşeninden (`assets/js/layout.js`) beslenecektir.
* **English:** MSK Labs operates with a single founder/developer partnered with an AI assistant. Maintaining 500+ static HTML files individually for header/footer updates is strictly prohibited. The repository adopts a component-driven architecture powered by a single central layout injector (`assets/js/layout.js`).

### 📐 9.2 Sayfa Sınıflandırması / Page Classification Taxonomy
1. **Tip 1: Kurumsal Çekirdek Sayfalar (Static Core Pages):**
   - **Kapsam / Scope:** `index.html`, `about.html`, `destek.html`, `contact.html`, `who-we-are.html`, `faq.html`, `privacy.html`, `terms.html`.
   - **Yapı / Architecture:** Sabit gövde içeriği tutarlar. Header (Logo, Dil Değiştirici, Üst Menü) ve 2 Satırlı Footer bağlantıları `layout.js` tarafından otomatik olarak enjekte edilir.
2. **Tip 2: Dinamik İçerik & Şablon Sayfaları (Dynamic Content & Template Pages):**
   - **Sub-category 2A - Uygulama Şablonu (App Showcase & Doc Template):** `haydinamaza`, `deskpilot`, `enyakin`, `emekli`, `gcpiluyari`, `rekatsay` ve tüm yeni uygulamalar. Tüm içerik `assets/js/apps-data.js` veri dosyasından beslenir.
   - **Sub-category 2B - Yayın & Makale Şablonu (Publishing & Memoir Template):** Bizce ve Anıltılar makaleleri. `blog/blog.html` ve `blog/blog.js` modüler altyapısı üzerinden dinamik olarak sunulur.

### ⚡ 9.3 Otomatik Yetenekler / Automated Features & Quality Guards
- **Otomatik Aktif Menü Vurgulama (Active Link Highlighting):** `layout.js`, aktif URL yoluna göre menüdeki ilgili linke `.active` stilini otomatik olarak uygular.
- **Dinamik Sosyal Medya & SEO Etiketleri (Social OpenGraph Meta):** Dinamik uygulama sayfalarında title, description ve `og:image` verileri WhatsApp ve X paylaşım kartları için otomatik oluşturulur.
- **SEO & FOUC Guard:** `<header id="site-header">` ve `<footer id="site-footer">` semantik etiketleri muhafaza edilerek arama motoru taranabilirliği ve miktar kaybı olmadan görünüm sağlanır.

---

## 🌙 10. KOYU TEMA (DARK MODE) MİMARİSİ VE STİL İLKELERİ
## 🌙 10. DARK THEME ARCHITECTURE & COLOR SYSTEM SPECIFICATIONS

### 📌 10.1 Açık Tema %10-15 Zemin Doygunluk İlkesi / Light Mode 15% Surface Tint Rule
* **Türkçe:** Açık Tema (Default Light Mode) modunda hiçbir kart, banner, bildirim kutusu veya konteyner %10-15 doygunluğu geçen koyu zemin rengi kullanamaz. Tüm zemin renkleri açık gri/mavi tonlarında (`#f8fafc`, `#f1f5f9`) ve ince gri çerçeveli (`#cbd5e1`) tutulacak, metinler her zaman yüksek kontrastlı okunaklı tonlarda (`#0f172a`, `#334155`) olacaktır.
* **English:** In default Light Mode, no container, card, or banner shall use solid dark backgrounds exceeding 10-15% surface tint. All container surfaces must use soft light tones (`#f8fafc`, `#f1f5f9`) with subtle borders (`#cbd5e1`), ensuring high-contrast readable typography (`#0f172a`, `#334155`).

### 🎨 10.2 CSS Değişkenleri (CSS Custom Property Tokens) Mimarisi
* **Türkçe:** Tüm renk tanımlamaları `global.css` içerisindeki `:root` (Açık Tema) ve `[data-theme="dark"]` / `body.dark-theme` (Koyu Tema) CSS değişkenlerinden çekilir:
  - `--bg-page`: Sayfa arka plan rengi (`#f8fafc` ➔ `#0f172a`)
  - `--bg-card`: Kart ve kutu zemin rengi (`#ffffff` ➔ `#1e293b`)
  - `--bg-surface`: İç yüzey zemin rengi (`#f1f5f9` ➔ `#334155`)
  - `--border-color`: Çerçeve çizgisi (`#cbd5e1` ➔ `#475569`)
  - `--text-main`: Ana metin rengi (`#0f172a` ➔ `#f8fafc`)
  - `--text-muted`: İkincil açıklama metin rengi (`#475569` ➔ `#cbd5e1`)
* **English:** All visual color definitions inherit from centralized CSS Custom Properties defined on `:root` (Light Theme) and `[data-theme="dark"]` / `body.dark-theme` (Dark Theme) in `global.css`.

### 🔄 10.3 Tek Merkezden Otomatik Tema Yönetimi (`assets/js/layout.js`)
* **Türkçe:** Kullanıcının tema tercihi (`light` veya `dark`) `localStorage.getItem('user_theme')` anahtarında saklanır ve `layout.js` tarafından sayfa yüklenirken `document.documentElement` etiketine `data-theme` özniteliği enjekte edilir. Gelecekte eklenecek 500+ sayfa tek bir satır ekstra kod yazılmadan otomatik olarak Koyu/Açık Tema moduna uyum sağlar.
* **English:** Theme preference (`light` or `dark`) is persisted in `localStorage.getItem('user_theme')`. `assets/js/layout.js` injects the `data-theme` attribute on `document.documentElement` upon DOM load, ensuring all current and future 500+ pages instantly toggle between Light and Dark modes without individual file maintenance.

---

## 📱 11. BÜTÜNLEŞİK MOBİL VE ERİŞİLEBİLİRLİK (WCAG) STANDARTLARI
## 📱 11. UNIFIED MOBILE USABILITY & ACCESSIBILITY (WCAG) SPECIFICATIONS

### 📌 11.1 %100 Dark Mode ve CSS Değişken Bağlılığı / 100% Dark Mode & Token Binding Rule
* **Türkçe:** Hiçbir CSS dosyasında (`blog.css`, `global.css`) `body` veya temel bileşenler için sabit (hardcoded) arka plan rengi (Örn: `#f8fafc`, `#ffffff`) kullanılamaz. Tüm zemin ve metin renkleri istisnasız CSS değişkenlerine (`var(--bg-page)`, `var(--bg-card)`, `var(--text-main)`) bağlanmak zorundadır.
* **English:** Hardcoded surface background colors (e.g., `#f8fafc`, `#ffffff`) on `body` or core containers in any stylesheet are strictly prohibited. All surface and text colors must bind directly to CSS Custom Properties (`var(--bg-page)`, `var(--bg-card)`, `var(--text-main)`).

### 📱 11.2 Mobil Dokunma Alanı (WCAG 2.5.5 Touch Target) Standardı
* **Türkçe:** Sitedeki tüm butonlar, dil seçiciler, tab sekmeleri ve aksiyon öğeleri mobilde minimum **44x44px** (küçük ikincil butonlar için min **36x36px**) dokunma alanına sahip olmak zorundadır.
* **English:** All interactive mobile buttons, language switchers, tabs, and action links must satisfy WCAG 2.5.5 touch target size of minimum **44x44px** (min **36x36px** for secondary micro-buttons).

### ↔️ 11.3 Sıfır Mobil Taşma (Zero Horizontal Scroll / Fluid Layout) Standardı
* **Türkçe:** Mobil ekranlarda (320px iPhone SE ve 360px Android cihazlar dahil) hiçbir bileşen yatay kaydırma çubuğu oluşturamaz. Grid kolon genişlikleri `minmax(280px, 1fr)` seviyesine ayarlanacak, medya breakpoint'leri `600px` ve `768px` snap-point'leri ile standartlaştırılacaktır.
* **English:** No element shall trigger horizontal viewport scrolling on mobile screens (including 320px and 360px devices). Grid column minimum widths must be set to `minmax(280px, 1fr)`, with standardized breakpoints at `600px` and `768px`.

---

## 🔒 12. BÜTÜNLEŞİK SİSTEM MİMARİSİ, GÜVENLİK VE VERİ STANDARTLARI
## 🔒 12. UNIFIED SYSTEM ARCHITECTURE, SECURITY & DATA SPECIFICATIONS

### 🛡️ 12.1 İstemci Gizliliği ve Sıfır Şifre / Secrets & Client Security Rule (P0)
* **Türkçe:** İstemci tarafına teslim edilen hiçbir JavaScript dosyası (`config.js`, `analytics.js` vb.) gizli yönetici PIN'i, API anahtarı veya yetkilendirme parolası içeremez. Yönetici paneli ve istatistik doğrulama kararları sunucu tarafında (Cloudflare Workers / API uç noktası) yürütülecektir.
* **English:** No client-side JavaScript file delivered to the browser shall contain hardcoded admin PINs, API secrets, or authentication credentials. Authorization decisions must execute server-side (e.g., Cloudflare Workers).

### 🗄️ 12.2 Tek Yetkili Veri Kaynağı / Single Source of Truth Metadata Rule (P1)
* **Türkçe:** Tüm uygulama isimleri, ikonları, sürümleri ve izin bildirimleri `assets/js/apps-data.js` üzerinde tek bir yetkili kaynak olarak tutulacak; `privacy.html`, `terms.html`, `index.html` ve detay sayfaları bu merkezi veriyi okuyacaktır. Dosyalar arasında mükerrer veya çelişen veri tutulması kesinlikle yasaktır.
* **English:** All application names, icons, platform statuses, and privacy permissions shall originate from a single authoritative metadata database (`assets/js/apps-data.js`). Duplicating hardcoded metadata across static HTML files is strictly prohibited.

### 📄 12.3 Hukuki Metin ve Ürün Söylemi Hizalaması / Legal Policy Alignment Rule (P1)
* **Türkçe:** Ana sayfadaki "Ücretsiz ve Reklamsız" söylemi ile `privacy.html` / `terms.html` içindeki AdMob/AdSense çerez bildirimleri 100% uyumlu hale getirilecek; ürünün gerçek durumuyla hukuki metinleri çelişmeyecektir.
* **English:** Homepage "Free & Ad-free" portfolio messaging must be harmonized with Privacy Policy and Terms of Service cookie/advertising disclosures.

---

## 📐 13. SAYFA SPESİFİKASYONLARI (PAGE SPECIFICATIONS)
## 📐 13. PAGE TYPE SPECIFICATIONS — AI AGENT REFERENCE GUIDE

> **Purpose (EN):** This section is the authoritative reference for all current and future pages in the MSK Labs web platform. Any new page added to the repository MUST conform to the specifications defined here. In case of conflict between a page's implementation and this document, this document takes precedence. Changes to the platform-wide standard must be made here first, then applied across all affected files.
>
> **Amaç (TR):** Bu bölüm, MSK Labs web platformuna eklenen veya eklenecek tüm sayfaların yetkili referans kaynağıdır. Depoya eklenen her yeni sayfa burada tanımlanan spesifikasyonlara uymak zorundadır. Bir sayfanın uygulaması ile bu belge arasında çelişki olursa, bu belge geçerlidir. Platform genelinde bir standart değiştirilecekse önce burada değiştirilmeli, ardından tüm ilgili dosyalara yayılmalıdır.

---

### 📌 13.0 Evrensel Sayfa Gereksinimleri (Universal Page Requirements)

**EN:** Every page in this repository — without exception — must satisfy the following baseline requirements:
**TR:** Depodaki her sayfa, istisna olmaksızın aşağıdaki temel gereksinimleri karşılamak zorundadır:

| Requirement | Value / Rule |
|---|---|
| `<html lang="">` | Dynamically set to `tr` / `en` / `ar` via `setLang()` in `layout.js` |
| `<html dir="">` | `ltr` for TR & EN, `rtl` for AR — set automatically by `setLang()` |
| `<body class="">` | Must carry `lang-tr`, `lang-en`, or `lang-ar` class; managed by `setLang()` |
| Theme attribute | `data-theme="light"` or `data-theme="dark"` on `<html>` — managed by `layout.js` |
| Global CSS | `<link rel="stylesheet" href="[../]assets/css/global.css?v=XX">` (bump `vXX` on every CSS change) |
| Analytics | `<script src="[../]assets/js/analytics.js">` |
| Config | `<script src="[../]assets/js/config.js">` |
| Layout module | `<script src="[../]assets/js/layout.js">` (injects header nav + 2-row footer automatically) |
| Favicon | `<link rel="icon" href="[../]img/MSKLabs_favicon.png">` |
| Flash prevention | Inline dark-mode pre-check script in `<head>` before any CSS |
| Language persistence | `localStorage.getItem('user_lang')` read on load; URL `?lang=xx` overrides stored preference |

**TR — Kısa Özet:** Her sayfada: global CSS (önbellek sürümü artırılmış `?v=XX`), analytics.js, config.js, layout.js scripti zorunludur. Tema ve dil `layout.js` tarafından otomatik yönetilir. Favicon her sayfada tanımlanmalıdır.

---

### 📌 13.1 Çok Dilli Yapı Standardı (Multilingual Content Standard)

**EN:** All user-visible text in HTML files must be wrapped in language-class spans. Never hard-code a single-language string in a visible element unless that element's content is rendered purely by JavaScript with its own language-switching logic.

**TR:** HTML dosyalarındaki tüm kullanıcıya görünür metin, dil sınıfı span'ları içine alınmalıdır. JavaScript tarafından ayrıca yönetilmediği sürece tek dil string'i asla doğrudan yazılamaz.

```html
<!-- CORRECT / DOĞRU -->
<span class="lang-tr">Türkçe metin</span>
<span class="lang-en">English text</span>
<span class="lang-ar">النص العربي</span>

<!-- Input / Textarea placeholders — CORRECT / DOĞRU -->
<input
  data-lang-tr-placeholder="Türkçe açıklama"
  data-lang-en-placeholder="English description"
  data-lang-ar-placeholder="وصف عربي"
  placeholder="Türkçe açıklama">
```

**CSS visibility rule:** `body.lang-tr .lang-en, body.lang-tr .lang-ar { display: none; }` — defined once in `global.css`. Do not re-define per-page.

**TR — Kural:** `placeholder` değerleri `data-lang-*-placeholder` nitelikleri ile tanımlanır; `layout.js` içindeki `setLang()` fonksiyonu bu nitelikleri okuyarak `placeholder` değerini dinamik olarak günceller.

---

### 📌 13.2 Sayfa Yerleşim Şablonu (Universal Layout Template)

**EN:** All pages use the following standard three-column layout wrapper. The left and right aside columns are desktop-only ad slots; the center column is the main content area.

**TR:** Tüm sayfalar aşağıdaki standart üç sütunlu yerleşim sarmalayıcısını kullanır. Sol ve sağ `aside` kolonları masaüstü reklam alanlarıdır; ortadaki kolon ana içerik alanıdır.

```html
<header class="site-header">          <!-- layout.js tarafından doldurulur -->
  <div class="site-header-inner">
    <a href="index.html" class="bizce-center-logo-link">
      <img src="img/MSKLabsLogo.svg" class="site-header-logo">
    </a>
    <div class="lang-switcher">
      <button onclick="setLang('tr')" data-lang="tr" class="active">TR</button>
      <button onclick="setLang('en')" data-lang="en">EN</button>
      <button onclick="setLang('ar')" data-lang="ar" class="lang-btn-arabic">
        <img src="img/ElArabiye.svg" class="arabic-btn-icon">
      </button>
      <button id="themeToggleBtn" onclick="toggleTheme()" class="theme-toggle-btn">🌙</button>
    </div>
  </div>
</header>

<nav class="top-main-nav"></nav>       <!-- layout.js tarafından enjekte edilir -->

<div class="layout-wrapper">
  <aside class="desktop-ad desktop-ad-left">
    <div class="ad-placeholder">Masaüstü Sol Reklam<br>(120x300)</div>
  </aside>

  <div class="portfolio-container">
    <!-- SAYFA İÇERİĞİ BURAYA -->
  </div>

  <aside class="desktop-ad desktop-ad-right">
    <div class="ad-placeholder">Masaüstü Sağ Reklam<br>(120x300)</div>
  </aside>
</div>

<footer class="site-footer"></footer>  <!-- layout.js tarafından doldurulur -->
<script src="assets/js/layout.js"></script>
```

---

### 📌 13.3 Sayfa Türleri ve Spesifikasyonları (Page Type Specifications)

---

#### 🅐 TİP A — Kurumsal Çekirdek Sayfalar (Corporate Core Pages)

**EN:** Static informational pages forming the institutional backbone of the site. Content is hardcoded in HTML with multilingual spans. No dynamic data loading required. These pages use the full universal layout template (header + 3-column wrapper + footer).

**TR:** Sitenin kurumsal omurgasını oluşturan statik bilgi sayfaları. İçerik HTML'de çok dilli span'larla sabit olarak kodlanmıştır. Dinamik veri yükleme gerekmez. Tam evrensel yerleşim şablonunu kullanırlar.

**Files / Dosyalar:** `index.html`, `about.html`, `contact.html`, `who-we-are.html`

| Özellik / Feature | Değer / Value |
|---|---|
| Header | Standard `site-header` with logo + lang-switcher + theme toggle |
| Navigation | `top-main-nav` — injected by `layout.js` |
| Layout | `layout-wrapper` → left-ad + `portfolio-container` + right-ad |
| Page title | `<h1 class="page-title">` with `lang-tr/en/ar` spans |
| Footer | 2-row footer injected by `layout.js` |
| Lang switcher | ✅ TR / EN / AR |
| Theme toggle | ✅ Light / Dark |
| RTL support | ✅ AR → `dir="rtl"` auto via `setLang()` |
| Dynamic data | ❌ None |
| Query params | ❌ None |

---

#### 🅑 TİP B — Hukuki ve Politika Sayfaları (Legal & Policy Pages)

**EN:** Dynamically configured legal pages. The `?app=`, `?ver=`, `?os=`, `?lang=` URL parameters determine which app's policy content is displayed. Content exists as large `<div class="lang-tr/en/ar">` blocks (not individual span wraps) due to the length of legal text. Both pages share identical template structure.

**TR:** Dinamik olarak yapılandırılan hukuki sayfalar. URL parametreleri (`?app=`, `?ver=`, `?os=`, `?lang=`) hangi uygulamanın politika içeriğinin gösterileceğini belirler. Hukuki metnin uzunluğu nedeniyle içerik bireysel span'lar yerine büyük `<div class="lang-tr/en/ar">` blokları olarak yapılandırılmıştır.

**Files / Dosyalar:** `privacy.html`, `terms.html`

| Özellik / Feature | Değer / Value |
|---|---|
| Header | Standard |
| Navigation | Injected by `layout.js` |
| Layout | Standard 3-column |
| Dynamic header card | App name, icon, version, OS badge — populated from URL params via JS |
| Print / PDF button | `🖨️ PDF / Yazdır` — `window.print()` |
| Lang content blocks | Full-page `<div class="lang-tr/en/ar">` sections (not span-level) |
| Query params | `?app=haydinamaza&ver=2.1.0&os=android&lang=tr` |
| Lang switcher | ✅ TR / EN / AR |
| Theme toggle | ✅ Light / Dark |
| Dynamic data | ✅ App metadata from URL params |

---

#### 🅒 TİP C — Otomasyon Servis Sayfaları (Automation Service Pages)

**EN:** Server-rendered dynamic pages that receive app context from URL query parameters and render tailored content. Each has a specific automation role. All share the universal layout template.

**TR:** URL sorgu parametrelerinden uygulama bağlamı alan ve özelleştirilmiş içerik sunan dinamik servis sayfaları. Her birinin belirli bir otomasyon rolü vardır. Hepsi evrensel yerleşim şablonunu paylaşır.

**Files / Dosyalar:** `faq.html`, `destek.html`, `changelog.html`, `roadmap.html`, `status.html`, `promo.html`, `review-route.html`, `dl.html`

| Sayfa / Page | Rol / Role | Temel Parametre / Key Param |
|---|---|---|
| `faq.html` | Live-search accordion FAQ | `?app=` |
| `destek.html` | Support ticket form + Telegram bot | `?app=&ver=&os=` |
| `changelog.html` | App version release history | `?app=` |
| `roadmap.html` | Community feature voting board | — |
| `status.html` | System & service health monitor | — |
| `promo.html` | Cross-app promotion engine | `?app=` |
| `review-route.html` | Store review rating router | `?app=` |
| `dl.html` | Smart download + QR code router | `?app=` |

**Shared rules for all Type C pages / Tip C sayfaları için ortak kurallar:**

| Özellik / Feature | Değer / Value |
|---|---|
| Layout | Standard 3-column `layout-wrapper` |
| Header badge/card | Dynamic app name + icon from URL params (where applicable) |
| Lang switcher | ✅ TR / EN / AR (all text elements must use `lang-*` spans) |
| Theme toggle | ✅ Light / Dark |
| Form inputs | Placeholders via `data-lang-*-placeholder` attributes |
| `setLang()` | Must update all form placeholders, dynamic titles, search boxes |
| Query param `?lang=` | Overrides stored `localStorage` language preference on load |
| `languageChanged` event | Pages must listen to `window.addEventListener('languageChanged', ...)` for cross-module sync |

**destek.html specific / destek.html özel kurallar:**
- App badge shows app name + version + OS (from URL params; falls back to multilingual "MSK Labs General / Genel" spans)
- All 3 form inputs (`subjectInput`, `messageInput`, `emailInput`) carry `data-lang-*-placeholder` attributes
- `setLang()` in page script updates all 3 placeholders on every language switch
- Ticket draft auto-saved to `localStorage`; ticket number generated client-side on submit

**faq.html specific / faq.html özel kurallar:**
- `faqSearchInput` carries `data-lang-*-placeholder` for live search
- FAQ questions/answers rendered dynamically from `FAQ_DATABASE[lang][appId]` JS object
- `loadFaqsForLang(lang)` called on every `setLang()` invocation
- App name heading uses `lang-tr/en/ar` spans (or JS-injected spans when `?app=` param present)

---

#### 🅓 TİP D — Uygulama Detay Sayfaları (App Product Pages)

**EN:** Per-application showcase pages located under `/apps/`. Each page presents a single application's icon, title, platform & development-status badges, description, feature grid, download section, and version-request panel. All app detail pages share the same structural template.

**TR:** `/apps/` altındaki her uygulama için ayrı vitrin sayfaları. Her sayfa bir uygulamanın ikonu, başlığı, platform ve geliştirme durumu rozetleri, açıklaması, özellik ızgarası, indirme bölümü ve sürüm talep panelini sunar. Tüm uygulama detay sayfaları aynı yapısal şablonu paylaşır.

**Files / Dosyalar:** `apps/haydinamaza.html`, `apps/rekatsay.html`, `apps/emekli.html`, `apps/enyakin.html`, `apps/deskpilot.html`, `apps/gcpiluyari.html`

| Özellik / Feature | Değer / Value |
|---|---|
| Header | Standard `site-header` (with `../` relative paths) |
| Navigation | `top-main-nav` injected by `../assets/js/layout.js` |
| Layout | Standard 3-column with `../` relative asset paths |
| App icon | `<div class="app-big-icon"><img src="../media/{app}/icon.png"></div>` |
| App title | `<h1>{AppName}</h1>` — proper nouns, no translation |
| Platform badge | `<span class="badge badge-platform">` with `lang-tr/en/ar` spans |
| Status badge | `<span class="badge badge-status">` with `lang-tr/en/ar` spans |
| Download button | `<a href="#download-section" class="hero-download-btn">` with `lang-*` spans |
| Right panel | Global language status + EN/AR version request buttons |
| Translation box | `<div class="translation-request-box lang-en lang-ar">` — visible only in EN/AR |
| Description | `<div class="app-description">` with `lang-*` spans |
| Features section | `<div class="features-grid">` with `lang-*` spans per feature box |
| Download section | `id="download-section"` — store links or status-btn if not released |
| Lang switcher | ✅ TR / EN / AR |
| Theme toggle | ✅ Light / Dark |
| RTL support | ✅ Auto via `setLang()` in `layout.js` |

**Badge text translations / Rozet çeviri standardı:**

| Badge Type | TR | EN | AR |
|---|---|---|---|
| Mobile platform | 📱 Mobil Çözüm | 📱 Mobile Solution | 📱 حل المحمول |
| Desktop platform | 💻 Masaüstü Sistem | 💻 Desktop App | 💻 تطبيق سطح المكتب |
| In development | 🛠️ Geliştirme Devam Ediyor | 🛠️ Development In Progress | 🛠️ التطوير قيد التقدم |
| Published / Live | ✅ Yayında | ✅ Live | ✅ منشور |
| Beta | 🧪 Beta Aşaması | 🧪 Beta Stage | 🧪 مرحلة التجريب |

---

#### 🅔 TİP E — Blog ve Yayın Sayfaları (Blog & Publishing Pages)

**EN:** The Bizce & Anıltılar publishing platform. A single-page application where `blog.html` is the shell and `blog.js` handles all content rendering, filtering, TTS, and pagination. New articles are added to the `ARTICLES` array inside `blog.js` — no new HTML files needed.

**TR:** Bizce ve Anıltılar yayın platformu. `blog.html` kabuk sayfadır; `blog.js` tüm içerik render'ını, filtrelemeyi, TTS'i ve sayfalamayı yönetir. Yeni makaleler `blog.js` içindeki `ARTICLES` dizisine eklenir — yeni HTML dosyası oluşturulmaz.

**Files / Dosyalar:** `blog/blog.html`, `blog/blog.js`

| Özellik / Feature | Değer / Value |
|---|---|
| URL pattern | `blog/blog.html?type=bizce` or `?type=anilts` |
| Content rendering | All articles rendered by `blog.js` from `ARTICLES[]` array |
| Language | Articles have `lang` field; `blog.js` filters by `lang === activeLang` OR `lang === 'all'` |
| TTS | Built-in Text-to-Speech; default voice: Male (👨); switchable to Female (👩) |
| TTS speeds | 1.0x, 1.25x, 1.5x |
| Layout | `layout-wrapper` with left-ad + content + right-ad |
| Lang switcher | ✅ TR / EN / AR |
| Theme toggle | ✅ Light / Dark |
| New article rule | Add object to `ARTICLES[]` in `blog.js` — do NOT create new HTML files |

**Article object schema / Makale nesne şeması:**
```js
{
  id: 'unique-slug',
  type: 'bizce',           // 'bizce' | 'anilts'
  lang: 'tr',              // 'tr' | 'en' | 'ar' | 'all'
  date: '2026-09-16',
  title: 'Başlık',
  summary: 'Kısa özet...',
  content: 'Tam metin HTML...',
  image: '../media/blog/image.webp'  // optional
}
```

---

#### 🅕 TİP F — Yönetim ve Dizin Sayfaları (Admin & Directory Pages)

**EN:** Internal pages for site management and navigation. Not linked from main navigation. Access is PIN-protected (ist.html) or open-index (pages.html).

**TR:** Site yönetimi ve navigasyonu için dahili sayfalar. Ana navigasyondan bağlantı verilmez. Erişim PIN korumalıdır (ist.html) veya açık indeksdir (pages.html).

**Files / Dosyalar:** `ist.html` (PIN: 175), `pages.html`

| Özellik / Feature | Değer / Value |
|---|---|
| Layout | Standard 3-column |
| Access | `ist.html` → PIN: **175**; `pages.html` → open |
| ist.html content | Visitor stats, download counters, AdSense metrics |
| pages.html content | Central directory of all site pages with multilingual category titles |
| Lang switcher | ✅ TR / EN / AR |
| Theme toggle | ✅ Light / Dark |

---

### 📌 13.4 Yeni Sayfa Ekleme Kontrol Listesi (New Page Checklist)

**EN:** When adding any new page to the repository, verify ALL of the following before committing:
**TR:** Depoya yeni bir sayfa eklenirken commit öncesinde aşağıdakilerin TAMAMI kontrol edilmelidir:

- [ ] **EN:** Flash-prevention inline script in `<head>` (reads `user_theme` from localStorage)
  **TR:** `<head>` içinde tema flaşını önleyen inline script mevcut
- [ ] **EN:** Global CSS linked with current `?v=XX` version param
  **TR:** Global CSS doğru `?v=XX` sürümüyle bağlı
- [ ] **EN:** `config.js`, `analytics.js`, `layout.js` scripts included (in this order, before `</body>`)
  **TR:** `config.js`, `analytics.js`, `layout.js` scriptleri `</body>` öncesinde sırayla dahil edilmiş
- [ ] **EN:** `<header class="site-header">` and `<footer class="site-footer">` present (layout.js targets these)
  **TR:** `<header class="site-header">` ve `<footer class="site-footer">` etiketleri mevcut
- [ ] **EN:** `<nav class="top-main-nav">` empty element present (layout.js injects links)
  **TR:** Boş `<nav class="top-main-nav">` elementi mevcut
- [ ] **EN:** `<body class="lang-tr">` initial class set (layout.js updates on load)
  **TR:** `<body class="lang-tr">` başlangıç sınıfı ayarlı
- [ ] **EN:** Lang-switcher buttons (`TR`, `EN`, AR icon) inside header `<div class="lang-switcher">`
  **TR:** Dil değiştirici butonlar header içinde `<div class="lang-switcher">` içinde
- [ ] **EN:** `<html lang="tr">` initial attribute set
  **TR:** `<html lang="tr">` başlangıç özelliği ayarlı
- [ ] **EN:** ALL visible text wrapped in `lang-tr` / `lang-en` / `lang-ar` spans
  **TR:** Tüm görünür metin `lang-tr/en/ar` span'larına sarılmış
- [ ] **EN:** All `<input>` and `<textarea>` elements carry `data-lang-*-placeholder` attributes
  **TR:** Tüm `<input>` ve `<textarea>` elementleri `data-lang-*-placeholder` niteliklerini taşıyor
- [ ] **EN:** If page has a local `setLang()`, it dispatches `window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }))`
  **TR:** Sayfada yerel `setLang()` varsa `languageChanged` custom event dispatch ediyor
- [ ] **EN:** 3-column `layout-wrapper` with left + right ad aside slots present
  **TR:** Sol ve sağ reklam alanları olan `layout-wrapper` mevcut
- [ ] **EN:** Favicon link tags present (`icon`, `shortcut icon`, `apple-touch-icon`)
  **TR:** Favicon bağlantı etiketleri mevcut
- [ ] **EN:** `<h1>` page title uses `lang-*` spans (one `<h1>` per page — SEO rule)
  **TR:** `<h1>` sayfa başlığı `lang-*` span'larını kullanıyor (sayfada tek `<h1>` — SEO kuralı)
- [ ] **EN:** `<meta name="description">` and `<title>` tag set appropriately
  **TR:** `<meta name="description">` ve `<title>` etiketi uygun biçimde ayarlı
- [ ] **EN:** For `/apps/` pages, all badge text uses `lang-*` spans per the badge translation table (§13.3D)
  **TR:** `/apps/` sayfalarında tüm rozet metinleri §13.3D'deki çeviri tablosuna göre `lang-*` span'lara sarılmış

---

### 📌 13.5 Bileşen Değişiklik Protokolü (Component Change Protocol)

**EN:** When a platform-wide component needs to be changed (navigation, footer, language logic, theme logic, form placeholder mechanism), follow this strict sequence:
**TR:** Platform genelinde bir bileşen değiştirilmesi gerektiğinde (navigasyon, footer, dil mantığı, tema mantığı, form placeholder mekanizması) aşağıdaki sıra izlenir:

1. **Update this document first / Önce bu belgeyi güncelle** — record the new standard in §13
2. **Update `assets/js/layout.js`** — for nav/footer/theme/lang changes
3. **Update `assets/css/global.css`** — for CSS token/variable changes; bump `?v=XX`
4. **Propagate to all affected static HTML files** — for inline elements not covered by layout.js
5. **Commit with clear message** — reference section number from this document

**TR:** Sıra: (1) Bu belge → (2) `layout.js` → (3) `global.css` → (4) etkilenen HTML dosyaları → (5) commit.

---

> **Son Güncelleme / Last Updated:** 16 Eylül 2026 / September 16, 2026  
> Bu bölüm yaşayan bir belgedir. Platform standartları değiştikçe buradaki spesifikasyonlar güncellenir.  
> *This section is a living document. Specifications are updated as platform standards evolve.*