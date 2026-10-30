# 📋 MSK Labs - Modüler Mimarî Görev Listesi & Yol Haritası
# 📋 MSK Labs - Modular Architecture Roadmap & Task Checklist

> **Doküman Tarihi / Date:** 11 Eylül 2026 / September 11, 2026  
> **Durum / Status:** 🚀 Aktif Uygulama / Active Execution  

---

## 🏛️ MIMARI KARAR ÖZETİ / ARCHITECTURAL DECISION SUMMARY

### 🇹🇷 Türkçe: Tek Kişilik Geliştirici + AI İşbirliği Modeli & Veri Mimarısı
MSK Labs tek geliştirici ve AI yardımcısı ile yönetilmektedir. 500+ sayfalık gelecekteki ölçeklenmede her sayfada ayrı ayrı HTML düzenlemesi yapmak sürdürülemez.

**Portal Mimarisi (webMSKLabs vs Admin):**
- **Public Web Portalı (`webMSKLabs`):** Kamusal ziyaretçilere hizmet veren hafif, performanslı **Vanilla HTML5 / CSS3 / JavaScript** yapısını korur. Sayfalar React'e dönüştürülmez.
- **İstemci Metadata & Fallback (`assets/js/apps-data.js`):** Public tarafta statik uygulama metadata'sı ve yedekleme (fallback) amacıyla kullanılır. Tüm sistemin veritabanından bağımsız "tek mutlak gerçek kaynağı" değildir.
- **Dinamik & Yönetilebilir Veri Kaynağı:** Tüm dinamik verilerin (blog yayınları, yorumlar, destek talepleri, TTS ses metadata'sı) nihai ve yetkili kaynağı Cloudflare Edge Workers API ve Cloudflare D1 veritabanıdır (`MSKLabsDesk` Admin mimarisi).

Web sitemizdeki tüm sayfalar 2 ana kategoriye ayrılmıştır:
1. **Tip 1 - Kurumsal Çekirdek Sayfalar (Static Core Pages):** `index.html`, `about.html`, `destek.html`, `contact.html`, `who-we-are.html`, `faq.html`, `privacy.html`, `terms.html`. Sabit içeriklidir, ancak Header (Logo, Dil Butonları, Üst Menü) ve 2 Satırlı Footer bağlantıları `assets/js/layout.js` bileşeni tarafından dinamik olarak yüklenir.
2. **Tip 2 - Dinamik İçerik & Şablon Sayfaları (Dynamic Content & Template Pages):**
   - **2A: Uygulama Şablonu (App Showcase & Doc Template):** Uygulama tanıtım ve kullanım sayfaları (`haydinamaza`, `deskpilot` vb.). Statik verileri `assets/js/apps-data.js` ve Cloudflare D1 Edge API entegrasyonundan çeker.
   - **2B: Yayın & Makale Şablonu (Blog & Memoir Template):** Bizce ve Anıltılar yayınları (`blog/blog.html` + `blog/blog.js`).

### 🇬🇧 English: Solo Developer + AI Operational Policy & Data Architecture
MSK Labs is developed and maintained by a single founder working alongside an AI coding assistant. Manual, file-by-file edits across 500+ future pages are strictly prohibited.

**Portal Architecture (webMSKLabs vs Admin):**
- **Public Web Portal (`webMSKLabs`):** Retains lightweight, high-performance **Vanilla HTML5 / CSS3 / JavaScript** for public visitors. Public pages are NOT migrated to React.
- **Client Metadata & Fallback (`assets/js/apps-data.js`):** Used for public client-side static application metadata and fallback. It is not the sole database-independent single source of truth for the entire backend system.
- **Authoritative Data Source:** The authoritative source for dynamic content (blog posts, comments, support tickets, TTS audio assets) is the Cloudflare Edge Workers API and Cloudflare D1 database (`MSKLabsDesk` Admin architecture).

The system adopts a two-tier architecture:
1. **Type 1 - Static Core Pages:** Main institutional pages. Header (Logo, Language Switcher, Nav) and 2-Row Footer are injected dynamically via `assets/js/layout.js`.
2. **Type 2 - Dynamic Content & Template Pages:**
   - **2A: App Showcase & Doc Template:** App overview pages (`haydinamaza`, `deskpilot`, etc.) consuming static data from `assets/js/apps-data.js` and Cloudflare D1 Edge APIs.
   - **2B: Publishing & Memoir Template:** Blog articles and memoirs managed via `blog/blog.html` + `blog/blog.js`.

---

## 📋 UYGULAMA ADIMLARI VE GÖREV LİSTESİ / TASK CHECKLIST

### Faz 1: Merkezi Layout Bileşeninin (`assets/js/layout.js`) Oluşturulması
- [x] `assets/js/layout.js` dosyasını oluştur.
- [x] Üst Header html yapısını (`MSKLabsLogo.svg`, 55px logo, 900px max-width alignment, %20 küçültülmüş dil butonları, `gap: 10px`) merkezi değişkene tanımla.
- [x] Üst Alt Navigasyon menüsünü ("Anıltılar"dan sonra "Uygulamalarımız" linki eklenmiş olarak) tanımla.
- [x] 2 Satırlı Alt Footer yapısını (1. Satır: Aktif/Ana Sayfalar, 2. Satır: Destek/Yasal Sayfalar) tanımla.
- [x] Otomatik Aktif Sayfa Vurgulama (`active link highlighting`) algoritmasını ekle.
- [x] Dinamik Sosyal Medya (OpenGraph `og:title`, `og:image`) güncelleyici fonksiyon altyapısını hazırla.

### Faz 2: Tip 1 (Kurumsal Çekirdek) Sayfaların Modülerleştirilmesi
- [x] `index.html` dosyasına `<header id="site-header"></header>`, `<footer id="site-footer"></footer>` ve `layout.js` entegre et, içteki tekrar eden kodları temizle.
- [x] `about.html` dosyasına entegre et.
- [x] `destek.html` dosyasına entegre et.
- [x] `contact.html` dosyasına entegre et.
- [x] `who-we-are.html` dosyasına entegre et.
- [x] `faq.html` dosyasına entegre et.
- [x] `privacy.html` dosyasına entegre et.
- [x] `terms.html` dosyasına entegre et.

### Faz 3: Tip 2A (Uygulama Veri Motoru & Şablonu) Yapısının Kurulması
- [x] `assets/js/apps-data.js` dosyasını oluştur (Haydi Namaza, DeskPilot, En Yakın Camii, Emekli Sayaç, GÇP İl Uyarı, RekatSay verilerini ekle).
- [x] `app.html` genel dinamik uygulama şablonunu oluştur.
- [x] Sitedeki uygulama sayfalarını modüler `layout.js` ve dinamik `apps-data.js` altyapısına bağla.

### Faz 4: Test, Doğrulama ve Yerel Git Commit
- [x] Tarayıcıda `index.html`, `haydinamaza.html`, `destek.html`, `blog/blog.html` sayfalarını test et, konsolda 0 hata olduğunu doğrula.
- [x] Aktif sayfa vurgulamasının ve "Uygulamalarımız" linkinin çalıştığını doğrula.
- [x] Bizce ve Anıltılar makale okuma modunda (Reader View) dil değişiminin sayfadan atmadan tüm başlık, içerik, TTS ve navigasyon verilerini canlı dönüştürmesini sağla.
- [x] `git add .` ve `git commit` komutları ile yerel depoya kaydet (**Git push yapılmayacak**).

### Faz 5: Koyu Tema (Dark Mode) Mimarisi ve CSS Değişkenleri Entegrasyonu
- [x] `assets/css/global.css` içerisinde `:root` ve `[data-theme="dark"]` CSS değişkenlerini tanımla.
- [x] `assets/js/layout.js` bileşeninde `initTheme()` ve `toggleTheme()` fonksiyonlarını oluştur, tema butonunu header dil seçicisi yanına ekle.
- [x] `localStorage.getItem('user_theme')` entegrasyonu ile sayfa geçişlerinde tema tercihini koru.
- [x] Tarayıcıda Açık/Koyu tema geçişlerini ve kontrast oranlarını test et.

### Faz 6: Klasör Düzeni ve Tek Yetkili Dosya Mimarisi (Single Source of Truth)
- [x] Uygulama detay sayfalarının TEK YETKİLİ adresi olarak `/apps/` klasörünü belirle (`apps/haydinamaza.html`, `apps/rekatsay.html`, `apps/emekli.html`, `apps/deskpilot.html`, `apps/enyakin.html`, `apps/gcpiluyari.html`).
- [x] Ana dizinde (root) yer alan atıl uygulama ve blog dosyalarını (`haydinamaza.html`, `rekatsay.html`, `emekli.html`, `deskpilot.html`, `enyakin.html`, `gcpiluyari.html`, `bizce.html`) tamamen sil, kök dizini 100% temiz tut.
- [x] `index.html` ve `pages.html` içindeki tüm uygulama bağlantılarını doğrudan `/apps/` klasöründeki yetkili dosyalara yönlendir.
- [x] Dokümantasyonu (`ISTISARE_VE_KARARLAR.md` ve `tasks_architecture.md`) güncelle ve kararı açıkça ilan et.

### Faz 7: Sabit Üst Kemer (Sticky Header) & Responsive Mobil Menü Entegrasyonu
- [ ] Detaylı görev listesi ve adım adım takip dokümanı `tasks_sticky_header.md` dosyasında oluşturuldu.
- [ ] Masaüstü (Desktop): Container hiza sınırlarına sadık 2 katmanlı sabit üst kemer entegrasyonu.
- [ ] Mobil (Mobile): Sadece ~50px ultra ince sabit bar + Hamburger (`☰`) dropdown liste menü entegrasyonu.

