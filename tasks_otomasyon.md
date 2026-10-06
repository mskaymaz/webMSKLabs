# Bismillahirrahmânirrâhîm

> ⚠️ **[HISTORICAL / SUPERSEDED DOCUMENT]**  
> **ÖNEMLİ UYARI:** Bu doküman, MSK Labs'in ilk otomasyon aşamasında (Eylül 2026) hazırlanmış tarihsel otomasyon yol haritasıdır.  
> Aşağıdaki eski mimari kararlar güncel **`MSKLabsDesk/tasks.md`** canlı sisteminde **ARTIK AKTİF DEĞİLDİR**:
> 1. **Admin PIN 175:** İstemci tarafında PIN tutulması güvenlik gerekçesiyle kaldırılmış, yerini Cloudflare Workers Edge JWT Auth sistemine bırakmıştır.
> 2. **Telegram Bot:** Canlı bildirim/destek altyapısında Telegram botu yerine Resend E-posta API ve VAPID Web Push kullanılmaktadır.
> 3. **Google Sheets Veritabanı:** Google Apps Script (`google_sheet_setup.gs`) ve E-Tablo veritabanı canlı sistemde aktif değildir; tüm dinamik veriler Cloudflare D1 (SQLite Edge DB) üzerinde saklanmaktadır.
> 4. **Client-side Authentication:** İstemci bazlı oturum doğrulama yaklaşımı yerine sunucu taraflı JWT/Workers yetkilendirmesi esastır.
> 
> *Bu belge silinmemiş olup, projenin geçmiş otomasyon evrimini belgelemek amacıyla tarihçe (historical log) olarak saklanmaktadır.*

# MSK Labs 20+ Uygulama Merkezi Otomasyon Yol Haritası & İstemci Sözleşmesi (tasks_otomasyon.md) [HISTORICAL / SUPERSEDED]
# MSK Labs 20+ Applications Automation Roadmap & Client Contract Specification [HISTORICAL / SUPERSEDED]

Bu dosya, hem **msklabs.org merkezi web altyapısını** hem de **20+ Mobil Uygulamanın entegrasyon standartlarını** tanımlayan eski sözleşmedir.  
*English:* This master document defines integration standards for both the **msklabs.org web infrastructure** and **20+ Mobile Applications**. All client apps (Flutter, Kotlin, Swift, React Native, etc.) managed by a single developer must strictly consume the endpoints and parameter schemas defined below.

---

## 📱 MOBİL UYGULAMA ENTEGRASYON STANDARDI (Client Specification)
## 📱 MOBILE APP CLIENT INTEGRATION SPECIFICATION

Tüm MSK Labs uygulamalarında **"Ayarlar" (Settings)** ve **"Hakkında"** ekranlarında bulunması gereken standart web yönlendirme ve dinamik parametre mimarisi:  
*English:* Standard web routing and query parameter specification required for "Settings" and "About" menus across all MSK Labs mobile apps:

### 1. Standart URL Parametre Yapısı (Her İstekte Gönderilecek Değişkenler)
### 1. Standard URL Query Parameters (Mandatory Variables)
* {APP_ID}: Uygulama kimliği (Örn / e.g.: haydinamaza, ekatsay, emekli, enyakin, deskpilot, gcpiluyari)
* {APP_VER}: Uygulama sürümü (Örn / e.g.: 2.1.0)
* {OS}: İşletim sistemi / Operating System (ndroid, ios, windows, web)
* {LANG}: Kullanıcı cihaz dili / Device language (	r, en, r)

---

### 2. Mobil Uygulama "Ayarlar" Menüsü Standart Bağlantı Tablosu
### 2. Standard Mobile App Settings Menu Route Mapping Table

| Menü Elemanı (UI Text) | Aksiyon | Hedef URL Formatı (Target URL) | Açıklama / Description |
| :--- | :--- | :--- | :--- |
| **Biz Kimiz / Hakkımızda** | External Browser | https://msklabs.org/who-we-are.html | Merkezi kurumsal tanıtım / Corporate About Us page |
| **Gizlilik Politikası** | External Browser | https://msklabs.org/privacy.html?app={APP_ID}&ver={APP_VER}&os={OS}&lang={LANG} | Dynamic privacy policy & permissions |
| **Kullanım Şartları (Terms)** | External Browser | https://msklabs.org/terms.html?app={APP_ID}&lang={LANG} | Terms of Service contract |
| **Destek & Talep Oluştur** | External Browser | https://msklabs.org/destek.html?app={APP_ID}&ver={APP_VER}&os={OS}&lang={LANG} | Telegram-integrated live support tickets |
| **Diğer Uygulamalarımız** | External Browser | https://msklabs.org/index.html | Full MSK Labs app portfolio |
| **Öne Çıkanlar / Günün Tavsiyesi** | External / In-App | https://msklabs.org/promo.html?app={APP_ID} | Sheet-managed cross-promotion matrix |
| **Sürüm Yenilikleri (Changelog)**| External Browser | https://msklabs.org/changelog.html?app={APP_ID}&ver={APP_VER} | Version changelog history |
| **Uygulamayı Değerlendir**| In-App / Browser | https://msklabs.org/review-route.html?app={APP_ID}&os={OS} | 5 Stars ➔ Store / 1-4 Stars ➔ Support Form |
| **Sık Sorulan Sorular (SSS)** | External Browser | https://msklabs.org/faq.html?app={APP_ID}&lang={LANG} | Sheet-managed smart FAQ filter |
| **Gelecek Özellikleri Oyla** | External Browser | https://msklabs.org/roadmap.html?app={APP_ID} | Community feature request voting board |

---

## 📊 MERKEZİ GÖRSEL YÖNETİM PANELİ (Google E-Tablo Mimarisi)
## 📊 CENTRAL VISUAL MANAGEMENT DASHBOARD (Google Sheets Schema)

Tüm web ve mobil içerikler tek bir Google E-Tablo üzerinden kod yazmadan görsel olarak yönetilir:  
*English:* All web and mobile content is managed visually via a single Google Spreadsheet without redeploying code:

1. **Destek_Biletleri Sekmesi:** Telegram botu ile senkronize canlı destek biletleri. / Telegram-synced live support tickets.
2. **SSS_Listesi Sekmesi:** Uygulama bazlı Soru-Cevap ikilileri (App_ID, Soru, Cevap). / App-specific Q&A list.
3. **Duyurular Sekmesi:** Mağaza güncellemesiz canlı uyarı ve zorunlu güncelleme bayrakları. / Instant remote alerts & force update flags.
4. **Capraz_Promosyon Sekmesi:** Hangi uygulamada hangi diğer uygulamanın öne çıkarılacağı matrisi. / App recommendation matrix.

---

## 🛠️ WEB ALTYAPI GELİŞTİRME GÖREV LİSTESİ
## 🛠️ WEB INFRASTRUCTURE DEVELOPMENT CHECKLIST

### 📜 FAZ 1: Yasal & Kurumsal Temeller (Uygulama Boyutunu Düşürme)
### 📜 PHASE 1: Legal & Corporate Foundations (Reducing App Bundle Size)

#### Adım 1: Dinamik Gizlilik Politikası Motoru (privacy.html) / Step 1: Dynamic Privacy Policy Engine
- [x] 1.1 privacy.html temel modern duyarlı (responsive) şablonunun oluşturulması. / Create responsive template.
- [x] 1.2 URL parametresinden (?app=...&ver=...&os=...&lang=...) uygulama adı, versiyon ve dil bilgisinin dinamik okunması. / Parse URL parameters.
- [x] 1.3 Uygulamalara özel izinler tablosunun (GPS Konum, Bildirim, Depolama vb.) dinamik yükleme mimarisi. / Dynamic app permissions table.
- [x] 1.4 Çoklu dil desteği (TR / EN / AR) ve otomatik Google Play / App Store yasal standart uyumu. / Multi-language TR/EN/AR support.
- [x] 1.5 Yazdırılabilir / PDF çıktı alınabilir temiz görünüm seçeneği (@media print). / Clean print & PDF styling.

#### Adım 2: Dinamik Kullanım Şartları & Sözleşmeler Motoru (	erms.html) / Step 2: Dynamic Terms of Service Engine
- [x] 2.1 	erms.html duyarlı yasal sözleşme şablonunun hazırlanması. / Prepare responsive legal terms template.
- [x] 2.2 Uygulama parametresine göre (?app=...) kullanım şartları ve telif metinlerinin dinamik basılması. / Dynamic terms rendering by ?app=.
- [x] 2.3 Çoklu dil (TR / EN / AR) ve PDF yazdırma desteği. / Multi-language & print support.

---

### 📢 FAZ 2: Canlı Kontrol & Kullanıcı İletişimi (Mağaza Güncellemesi Yapmadan)
### 📢 PHASE 2: Live Control & User Engagement (Zero Store Update Needed)

#### Adım 3: Dinamik Duyuru & Canlı Güncelleme Banner Engine (nnouncements.json / Sheet API) / Step 3: Remote Announcement Engine
- [x] 3.1 Google E-Tablo / JSON duyuru veritabanı şablonunun hazırlanması. / Prepare JSON announcement database schema.
- [x] 3.2 Uygulamalar için hafif API uç noktası (msklabs.org/api/announcement ve nnouncements.json). / Light JSON API endpoints.
- [x] 3.3 Kritik Güncelleme (Force Update) / Genel Duyuru / Bakım Modu bayrakları. / Force update and maintenance mode flags.

#### Adım 4: Çapraz Promosyon & Trafik Motoru (promo.html / Banner System) / Step 4: Cross-Promotion Engine
- [x] 4.1 20+ Uygulama arasında organik kullanıcı trafiği döndürecek Öne Çıkan Uygulama kartı bileşeni (promo.html). / Cross-promo card components.
- [x] 4.2 Kaynak uygulamaya göre önerilen tamamlayıcı uygulamalar matris konfigürasyonu. / Recommendation matrix by source app.
- [x] 4.3 Tıklama ve yönlendirme kartları. / Interactive redirect cards.

---

### 🛠️ FAZ 3: Destek & Mağaza Puanı Optimizasyonu (1 Kişilik Ekip Yükünü Azaltma)
### 🛠️ PHASE 3: Support & Store Rating Optimization (Reducing Admin Overhead)

#### Adım 5: Google E-Tablo Bağlantılı Akıllı SSS Engine (aq.html) / Step 5: Smart Sheet-Backed FAQ Engine
- [x] 5.1 aq.html modüler akordeon bileşeni ve canlı arama çubuğu. / Modular accordion component with live search bar.
- [x] 5.2 Google E-Tablo / Data haritasından ?app=haydinamaza özel sorularını otomatik çekme. / Auto-fetch app-specific Q&A from Sheet API.
- [x] 5.3 destek.html destek formu öncesinde SSS öneri akordeon bloğunun gösterilmesi (Bilet azaltma). / Show FAQ suggestions before ticket submission.

#### Adım 6: Akıllı Mağaza Puanlama & Yorum Yönlendirme (eview-route.html) / Step 6: Smart Review Router
- [x] 6.1 İnteraktif 5 Yıldızlı derecelendirme kartı (eview-route.html). / Interactive 5-star rating card.
- [x] 6.2 **5 Yıldız:** Doğrudan Google Play / App Store mağaza sayfasına yönlendirme (Puan tavan yaptırma). / 5 Stars ➔ Redirect to Store.
- [x] 6.3 **1-4 Yıldız:** Mağaza yerine doğrudan Telegram bağlantılı destek.html formuna yönlendirme (Kötü yorum engelleme). / 1-4 Stars ➔ Internal support form.

---

### 📲 FAZ 4: Dağıtım & Akıllı Bağlantı Otomasyonu
### 📲 PHASE 4: Distribution & Smart Route Automation

#### Adım 7: Akıllı İndirme & QR Bağlantıları (dl.html) / Step 7: Smart Download & QR Router
- [x] 7.1 Cihaz algılama betiği (Android ➔ Play Store, iOS ➔ App Store, Masaüstü ➔ Web Portföyü). / Device detection script.
- [x] 7.2 Uygulamaya özel kısa indirme ve dinamik QR kod oluşturma motoru. / App short download link & dynamic QR generator.

#### Adım 8: Sürüm & Değişiklik Günlüğü (changelog.html) / Step 8: Version Release Changelog Engine
- [x] 8.1 changelog.html kronolojik versiyon geçmişi görünümü. / Chronological version history view.
- [x] 8.2 Uygulama bazlı sürüm yenilikleri filtreleme (?app=rekatsay). / App-specific release changelog filtering.

---

### 📊 FAZ 5: İleri Düzey Yönetim & Geri Bildirim
### 📊 PHASE 5: Advanced Admin & Feedback Analytics

#### Adım 9: Kullanıcı Fikir Oylama & Yol Haritası (oadmap.html) / Step 9: Community Roadmap & Voting Board
- [x] 9.1 Topluluk fikir önerme ve oylama (+1) kart yapısı (oadmap.html). / Community feature proposal & +1 voting board.
- [x] 9.2 En çok istenen özelliklerin E-Tablo ve Telegram üzerinden 1 kişilik ekibe raporlanması. / Reporting top requested features to admin.

#### Adım 10: Sistem Durumu Sayfası (status.html) / Step 10: System Status Monitor Page
- [x] 10.1 "Tüm Sistemler Çalışıyor" / "Bakım Çalışması Var" durum rozetleri (status.html). / Service health status badges.
- [x] 10.2 Olumsuz bir durumda destek.html üzerinde otomatik uyarı yayınlanması. / Automatic alert banner on support form during outage.

#### Adım 11: Gizli İstatistik & Analiz Paneli (ist.html) / Step 11: Secret Admin Analytics Dashboard
- [x] 11.1 Şifre / PIN korumalı yönetici giriş ekranı (ist.html - PIN: 175). / Password / PIN protected admin entry screen.
- [x] 11.2 Canlı tekil/çoğul ziyaretçi, sayfa görüntüleme ve cihaz dağılım grafikleri. / Live visitor, page view & OS breakdown metrics.
- [x] 11.3 E-Tablo senkronize uygulama bazlı günlük indirme ve buton tıklama sayaçları. / Sheet-synced daily app download & click counters.
- [x] 11.4 AdSense / AdMob özet gösterim ve tıklama kartları. / AdSense / AdMob summary impressions & click cards.

#### Adım 12: Tüm Sayfalar Dizini (pages.html) / Step 12: Central Site Directory Map
- [x] 12.1 Tüm repodaki dinamik ve statik sayfaların kategorize edilmiş indeks haritası (pages.html). / Categorized index map of all site pages.

---

### 🚀 FAZ 6: Otomasyon & Canlı Analiz Paketi (Solo Admin Efficiency Suite)
### 🚀 PHASE 6: Solo Admin Efficiency & Live Analytics Suite

#### Adım 13: Tek Merkezli Yapılandırma Dosyası (ssets/js/config.js) / Step 13: Central Master Configuration File
- [x] 13.1 ssets/js/config.js ana konfigürasyon dosyasının oluşturulması (SITE_CONFIG). / Create ssets/js/config.js master configuration object.
- [x] 13.2 Tüm 12 HTML dosyasına <script src="assets/js/config.js"></script> eklenerek API URL ve e-posta tanımlarının tek merkezde toplanması. / Include config.js across all 12 HTML files.

#### Adım 14: Canlı Web Analiz & Sayaç Betiği (ssets/js/analytics.js) / Step 14: Live Web Analytics & Click Tracking Engine
- [x] 14.1 Sitedeki her tıklamayı ve sayfa gösterimini kaydeden 1KB hafif nalytics.js motorunun yazılması. / Write non-blocking 1KB client analytics tracker script.
- [x] 14.2 ist.html panelinin gerçek canlı ziyaretçi ve indirme sayaç verilerini otomatik görselleştirmesi. / Connect live tracking events directly to ist.html metrics dashboard.

#### Adım 15: Mobil Yönetici PWA Kısayolu (manifest.json & PWA) / Step 15: Mobile Admin PWA Home Screen Shortcut
- [x] 15.1 ist.html için "MSK Analiz" PWA uygulama simgesi ve manifest.json tanımı. / Create Web App Manifest & Apple touch icons for ist.html.
- [x] 15.2 Mobilden tek tıkla PIN ekranına erişim mimarisi. / Single-tap PWA home screen launch to admin PIN screen.

#### Adım 16: Google E-Tablo Tek Tıkla Otomatik Kurulum Kodu (scripts/google_sheet_setup.gs) / Step 16: 1-Click Google Sheet Auto-Setup Script
- [x] 16.1 Google Apps Script için 6 sekmenin ve hazır SSS verilerinin sıfırdan otomatik kurulmasını sağlayan google_sheet_setup.gs yazılması. / Create google_sheet_setup.gs for 1-click sheet & FAQ initialization.
- [x] 16.2 Mevcut sekmeleri ve verileri %100 koruyan güvenli denetim mekanizması. / Safe existence check preventing data overwrite.

#### Adım 17: Static JSON Fallback & Hız Koruması (ssets/data/faq_fallback.json) / Step 17: Sub-50ms Static JSON Fallback Engine
- [x] 17.1 Google API aksamasında SSS ve Duyuruların kesintisiz yüklenmesini sağlayan yerel JSON yedekleme yapısı. / Create static fallback JSON files for FAQ & announcements ensuring sub-50ms render.

---

### ✍️ FAZ 7: Bizce Düşünce Platformu & Temiz Klasör Mimarisi
### ✍️ PHASE 7: Bizce Thought Platform & Clean Folder Refactoring

#### Adım 18: Temiz Klasör Mimarisi & Yönlendirmeler / Step 18: Clean Directory Refactoring & Aliases
- [x] 18.1 /blog/ ve /apps/ klasör yapısının oluşturulması ve uygulama sayfalarının taşınması. / Create /blog/ and /apps/ directory hierarchy.
- [x] 18.2 izce.html yönlendirme köprüsünün (log/blog.html) kurulması. / Create izce.html redirect alias.

#### Adım 19: Bizce Blog Platform Arayüzü & 3 Dilli Yapı (log/blog.html) / Step 19: Bizce Blog UI & 3-Language Engine
- [x] 19.1 Vakur "BİZCE" başlığı, sağ üstte %50 küçültülmüş logo rozeti ve *Teknolojiye, Hayata ve İnsanlığa Derin Bakış* sloganı. / Responsive "Bizce" header with 50% logo badge and slogan.
- [x] 19.2 El emeği 3 dilli içerik motoru (TR / EN / AR) ve Arapça RTL düzeni. / Handcrafted 3-language switcher with AR RTL support.
- [x] 19.3 Modüler JSON veri kütüphanesi (ssets/data/blog_posts.json). / Modular JSON blog posts database.

#### Adım 20: Dahili Sesli Okuma Motoru (TTS - Text-to-Speech) / Step 20: Built-in Native TTS Audio Reader Engine
- [x] 20.1 Varsayılan Erkek (👨 Bay) ve isteğe bağlı Kadın (👩 Bayan) ses tercihi seçeneği. / Male default & Female optional voice selector.
- [x] 20.2 Anadili diksiyon eşleştirmesi (TR/EN/AR) ve 1.0x / 1.25x / 1.5x okuma hızı kontrolleri. / Native diction mapping & speed controls.
- [x] 20.3 Oynat, duraklat, durdur butonları ve canlı ses dalga animasyonu. / Play, pause, stop controls & audio wave animation.
- [x] 20.4 Mobil cihazlar (iOS Safari / Android Chrome) için metin parçalama (chunking) ve ardışık seslendirme motorunun entegrasyonu (05.10.2026 - 09:33). / Mobile text chunking engine integration for iOS Safari and Android Chrome.
---

### 📌 GELECEK OTURUM NOTU / NEXT SESSION NOTE
- [ ] **Gözden Geçirme & İnceleme:** Blog sayfası altyapısı ve mimarisi tamamlandı. Ana sayfa (index.html) ile blog yapısının (log/blog.html) görsel, yapısal ve estetik bütünlüğü detaylı bir şekilde gözden geçirilecek ve ince ayarlar yapılacak. / Review & Refine: Blog architecture complete. Main page and blog UI will be visually and structurally reviewed and refined in the next session.