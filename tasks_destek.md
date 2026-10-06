# Destek & Talep Sistemi Gorev Listesi (tasks_destek.md)

Bu dosya, msklabs.org/destek.html sayfasinin ve arka plan motorunun adim adim gelistirilme surecini takip etmek icin olusturulmustur.

---

## Adim 1: Estetik & Gorsel Tasarim (CSS & Modern UI)
- [x] 1.1 global.css dosyasina destek sayfasina ozel modern tasarim degiskenleri (Glassmorphism, gradient glow, yumusak golgeler) eklenmesi.
- [x] 1.2 Kategori secim kartlari icin interaktif visual-card stilleri (Hata, Istek, Tesekkur, Fikir icin ikonlu ve efektli secim alanlari).
- [x] 1.3 Mikro animasyonlar (Gonderim yuklenme spinniri, Basari Makbuzu beliris animasyonu, taslak uyarisi).

---

## Adim 2: On Yuz Yapisi (destek.html)
- [x] 2.1 destek.html temel HTML5 sablonunun olusturulmasi (MSK Labs header, logo, dil secici ve reklam alanlari ile).
- [x] 2.2 Uygulama Bilgi Rozeti (URL'den okunan app, ver, os verilerini sik bir bilgi kartinda gosterme).
- [x] 2.3 Form alanlarinin kurulmasi (Kategori kartlari, Konu basligi, Detayli aciklama alani, Karakter sayaci, E-posta alani).
- [x] 2.4 Coklu dil destegi metinlerinin tanimlanmasi (TR / EN / AR).

---

## Adim 3: Istemci Tarafı Mantigi (JavaScript UX)
- [x] 3.1 URL sorgu parametrelerini (?app=...&ver=...&os=...) otomatik okuyan ve forma isleyen script.
- [x] 3.2 Otomatik Taslak Kaydedici (Her 3 saniyede bir localStorage uzerine kaydetme ve Taslak Yuklendi uyarisi).
- [x] 3.3 Form dogrulama (Validation) ve sunucu hatasinda metin kaybini onleyen koruma katmani.

---

## Adim 4: Kurumsal Bilet Makbuzu (Ticket Receipt UI)
- [x] 4.1 Benzersiz Bilet Numarasi uretici (#MSK-XXXXX).
- [x] 4.2 Gonderim sonrasi acilan estetik Makbuz Kartı (Bilet No, Durum Rozeti "AI Analiz Kuyrugunda", Kopyalama butonu).
- [x] 4.3 Tarayicida "Son Taleplerim" gecmis karti fonksiyonu.

---

## Adim 5: Arka Plan Motoru & AI Entegrasyonu (Backend)
- [x] 5.1 Cloudflare Worker / Serverless API endpoint taslagi (`functions/api/feedback.js` / `POST /api/v1/support`).
- [x] 5.2 Gemini Flash AI Ayristirma Prompt'u (Hata/Istek Siniflandirma + 1-10 Ciddiyet Puani + Ozetleme).
- [x] 5.3 **Güncel Veritabanı & Bildirim Mimarisi:** Bilet verileri doğrudan **Cloudflare D1** veritabanında (`messages` tablosu) saklanır. Bilet yönetim işlemleri **`MSKLabsDesk` Admin PWA** paneli üzerinden yürütülür. E-posta bildirimleri **Resend API** üzerinden, anlık yönetici bildirimleri ise **VAPID Web Push** protokolü ile iletilir.
- [x] 5.4 `[HISTORICAL / SUPERSEDED]` *Eski Telegram bot bildirimi ve Google Sheets senkronizasyon şablonu güncel canlı sistemde aktif veritabanı/bildirim katmanı değildir; yerini D1 + Resend + VAPID Web Push yapısına bırakmıştır.*