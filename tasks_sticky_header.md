# 📋 MSK Labs - Sabit Üst Kemer (Sticky Header) & Responsive Mobil Menü Görev Listesi
# 📋 MSK Labs - Responsive Sticky Header & Mobile Drawer Checklist

> **Doküman Tarihi / Date:** 2 Ekim 2026 / October 2, 2026  
> **Durum / Status:** 🚀 Aktif Planlama & Adım Adım Uygulama / Active Planning & Step-by-Step Execution  

---

## 🏛️ MİMARİ KARAR VE HİZALAMA ÖZETİ / ARCHITECTURAL DECISION SUMMARY

### 1. Eski Yapı (Arşiv ve Referans Amaçlı Tutulmaktadır)
- **Eski Standart Sayfalar (`index.html`, `destek.html` vb.):** Sayfa üstünde dikey büyük logo, sağ üstte dil seçimi (TR/EN/AR), altında `top-main-nav` hızlı linkleri. Sayfa kaydırıldığında ekrandan kaybolan statik yapı.
- **Eski Blog Sayfası (`blog/blog.html`):** Sadece bloğa özel 3 kolonlu tam genişlikli üst çubuk (`.bizce-header`: Sol: Kategori başlığı, Orta: Küçük logo, Sağ: Dil seçici + Gece modu).

---

### 2. Yeni Bütünleşik Yapı (Responsive Sticky Header Architecture)
Sitedeki **tüm sayfalar** (Ana Sayfa, Blog, Uygulamalar, Destek vb.) tek bir merkezi layout yapısında birleştirilecektir.

#### A. Masaüstü Modu (Desktop View - 769px ve üzeri)
- **Ekran Sabitleme:** Sayfa aşağı kaydırılsa dahi ekranın en üstünde sabit kalır (`position: sticky; top: 0; z-index: 1000;`).
- **Genişlik & Hiza Sınırı:** Sol ve sağ elemanlar reklam alanlarına taşmaz; ortadaki ana panelin (`.portfolio-container` - 900px) sol ve sağ beyaz sınırlarıyla dikeyde milimetrik hizada kalır (`max-width: 900px`, `margin: 0 auto`, `padding: 0.5rem 0`).
  - **Sol Marj Hizası:** Sayfa adı (Örn: `🏠 ANA SAYFA`, `✍️ BİZCE`), tam olarak aşağıdaki beyaz orta panelin sol sınırında başlar.
  - **Sağ Marj Hizası:** En sağdaki gece/gündüz tema değiştirme ikonu (`🌙`/`☀️`), tam olarak aşağıdaki beyaz orta panelin sağ sınırında biter.
- **Katman 1 (Üst Kemer Barı - ~84px):**
  - **Sol Sınır:** Kullanıcının o an bulunduğu sayfa adı.
  - **Orta (Mutlak Bağımsız Hizalama):** MSK Labs logosu, sol sayfa isminin uzunluğundan veya sağ buton sayısından %100 bağımsız olarak, 900px orta panelin tam dikey merkezine kilitlenmiştir (`position: absolute; left: 50%; transform: translateX(-50%)`). Logo dikey yüksekliği **80px** seviyesindedir.
  - **Sağ Sınır:** Dil değiştirme butonları (`TR`, `EN`, `AR`) ve Tema butonu (`🌙`/`☀️`).
- **Katman 2 (Alt Kemer Şeridi - ~32px):**
  - Hızlı Navigasyon Linkleri (`Ana Sayfa | Bizce | Anıltılar | Güncel | Uygulamalarımız | Hakkımızda | Destek & Talep | İletişim`).

#### B. Mobil Mod (Mobile View - 768px ve altı)
- **Sabitleme Koruması (Scroll Pinning):** Mobil ve masaüstü cihazlarda sayfa kaydırılırken üst kemerin yukarı kayması ve logonun üst kısmının kırpılması `position: fixed; top: 0; left: 0; right: 0;` mimarisi ile tamamen ortadan kaldırılmıştır. Kemer 1 piksel dahi oynamadan 100% kilitli kalır. Content alanı `.layout-wrapper` üst marjı (`margin-top: 96px`) ile kusursuz çakışmasız akar.
- **Logo Yüksekliği & Rahatlatılmış Alan:** Net, ferah ve rahatlatılmış dikey yükseklikte **65px** logo (76px min-height dikey alan).
- **Sağ Taraf Düzeni (2 Satırlı):**
  - **Üst Satır:** Dil Butonları (`TR`, `EN`, `AR`) ve Tema Butonu (`🌙`/`☀️`).
  - **Alt Satır:** Dil/Tema butonlarının hemen altında sağa hizalı Hamburger Menü Butonu (`☰`).
- **Sayfa Adı & Masaüstü Linkler:** Mobilde alan kazanmak ve kalabalığı önlemek için tamamen gizlenir (`display: none !important`).
- **Açılır Menü (Floating Overlay Layer):** `☰` butonuna basıldığında açılan menü **sayfa içeriğini aşağı itelemez**. `position: absolute; top: 100%; z-index: 1050;` ile sayfanın üzerinde süzülen üst katman (overlay floating layer) olarak açılır.

---

## 📋 ADIM ADIM UYGULAMA GÖREV LİSTESİ / TASK CHECKLIST

### Adım 1: CSS Değişkenleri & Temel Stil Altyapısı (`assets/css/global.css`)
- [x] **[STEP-1.1]** `.site-header-sticky` ve katman CSS kurallarını `global.css` içerisine tanımla.
- [x] **[STEP-1.2]** Masaüstü container hizalama (`max-width` hiza koruması) ve cam efekti (`backdrop-filter: blur(10px)`) kurallarını yaz.
- [x] **[STEP-1.3]** Mobil (768px altı) medya sorguları (media query), hamburger buton stili ve `.mobile-dropdown-menu` CSS animasyonlarını ekle.

### Adım 2: Merkezi Layout Motoru Entegrasyonu (`assets/js/layout.js`)
- [x] **[STEP-2.1]** `layout.js` içerisinde dinamik `renderHeader()` fonksiyonunu oluştur.
- [x] **[STEP-2.2]** Bulunan sayfaya göre sol taraftaki dinamik sayfa başlığını tespit eden algoritmayı ekle (`getPageTitle()`).
- [x] **[STEP-2.3]** Mobil hamburger menü tıklama (`toggleMobileMenu()`) ve sayfa dışına basınca kapanma mantığını kodla.
- [x] **[STEP-2.4]** Gece/Gündüz modu (`toggleTheme()`) butonunu header sağ grubuna entegre et.

### Adım 3: Blog Sayfası Uyumlaştırılması (`blog/blog.html` & `blog/blog.js`)
- [x] **[STEP-3.1]** `blog/blog.html` şablonu, Ana Sayfa (`index.html`) ve `destek.html` ile %100 birebir aynı mimariye kavuşturuldu (`<main class="portfolio-container main-content-area">`).
- [x] **[STEP-3.2]** `layout.js` bileşen motoru `blog.js` öncesinde çalıştırılarak üst kemer ve alt footerin tüm sayfalarda 0 farkla tek tip sabitlenmesi sağlandı. Eski `blog.css` ezmeleri tamamen temizlendi.

### Adım 4: Kurumsal Çekirdek Sayfaların Test & Doğrulaması
- [x] **[STEP-4.1]** `index.html`, `bizkimiz.html`, `apps.html`, `destek.html`, `about.html`, `contact.html` vb. sayfalarda yeni üst kemeri test et.
- [x] **[STEP-4.2]** Masaüstü görünümünde sayfa adı, ortalı logo ve dil/tema butonlarının container sınırlarında tam hizalandığını doğrula.
- [x] **[STEP-4.3]** Mobil görünümde hamburger menünün sorunsuz açılıp kapandığını ve ekran kaydırmada taşma yapmadığını doğrula.

### Adım 5: Son Kontrol ve Yerel Commit
- [x] **[STEP-5.1]** Tüm sayfalarda konsol hatası (0 JS Error) olmadığını kontrol et.
- [x] **[STEP-5.2]** Yapılan değişiklikleri `git add .` ve `git commit` ile kaydet.
