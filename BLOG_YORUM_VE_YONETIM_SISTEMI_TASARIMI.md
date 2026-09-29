# MSK Labs - Blog Yorum & Yönetim/Bildirim Sistemi Tasarım Taslağı

> **Doküman Durumu:** İstişare & Taslak  
> **Tarih:** 29 Eylül 2026  
> **Konu:** Blog yazıları (BİZCE, GÜNCEL, ANILTILAR) için moderasyonlu yorum sistemi ve özel MSK Labs Masaüstü/Mobil Yönetim & Bildirim Uygulaması mimarisi.

---

## 1. Vizyon ve Temel İlkeler

1. **Etkileşim ve Şeffaflık:**  
   Okuyucuların makalelere yorum yapabilmesi, düşüncelerini paylaşabilmesi ve MSK Labs ekibiyle iletişim kurabilmesi hedeflenir.
2. **Onaylı (Moderasyonlu) Yayıncılık:**  
   Hiçbir yorum doğrudan web sitesinde yayınlanmaz. Her yorum öncelikle "Beklemede" (`pending`) statüsünde tutulur ve yönetim onayından geçtikten sonra yayına alınır.
3. **Özel Yönetim & Bildirim Arayüzü (Masaüstü + Mobil Entegre):**  
   Üçüncü taraf botlar veya harici uygulamalar (Telegram vb.) yerine, tüm onay, red, yanıtlama ve destek süreçlerini yönetecek **MSK Labs Özel Masaüstü & Mobil Yönetim Uygulaması** kullanılacaktır.

---

## 2. Özel Masaüstü & Mobil Yönetim Uygulaması Konsepti

### A. Anlık Bildirim (Push Notification & Toast)
* Web sitesinden yeni bir yorum veya destek/talep geldiğinde, masaüstü bilgisayarda ekranın sağ alt köşesinde veya mobil cihazda anlık bildirim düşer.
* Bildirim içeriğinde:
  * Makale Adı / Bölüm (BİZCE, GÜNCEL, ANILTILAR)
  * Gönderen Rumuz/İsim
  * Yorumun Kısa Özeti yer alır.

### B. Hızlı Aksiyon & Yanıtlama Ekranı
Uygulama içerisinden tek tıkla gerçekleştirilebilecek aksiyonlar:
1. **[ Onayla & Yayınla ]:** Yorum derhal web sitesinde ilgili makalenin altında görünür hale gelir.
2. **[ Düzenle & Onayla ]:** İmla hataları veya ufak düzenlemeler yapılarak onaylanır.
3. **[ Reddet / Sil ]:** Uygunsuz, ilgisiz veya spam yorumlar tek tıkla elenir.
4. **[ MSK Labs Ekibi Olarak Yanıtla ]:** Okuyucunun yorumunun altına resmi ekip yanıtı yazılır. Web sitesinde "MSK Labs Ekibi" rozetiyle yayınlanır.

---

## 3. Sistem Mimarisi & Veri Akışı

```mermaid
graph TD
    A[Okuyucu - Web Sitesi Yorum Formu] -->|Yorum Gönder| B[(Veritabanı / API Service)]
    B -->|Statü: Beklemede (pending)| B
    B -->|Realtime / Push Trigger| C[MSK Labs Masaüstü Uygulaması]
    B -->|Realtime / Push Trigger| D[MSK Labs Mobil Uygulaması]
    C -->|Onayla / Yanıtla| B
    D -->|Onayla / Yanıtla| B
    B -->|Statü: Onaylandı (approved)| E[Web Sitesi Makale Sayfası]
```

### Önerilen Teknolojik Bileşenler:
* **Veritabanı / Backend:** Supabase veya Firebase (Gerçek zamanlı abonelik / Realtime subscription & WebSocket desteği).
* **Masaüstü Uygulaması:** Electron veya PyQt / Custom Python Desktop Client.
* **Mobil Uygulama:** Flutter / React Native / Native Android-iOS.

---

## 4. Güvenlik, Gizlilik ve Spam Önlemleri

1. **E-posta Gizliliği:** Okuyucunun e-posta adresi web sitesinde veya üçüncü şahıslara kesinlikle gösterilmez. Yalnızca rumuz/isim görüntülenir.
2. **Akıllı Spam Filtresi (Honeypot):** Otomatik botların form doldurmasını engelleyen kullanıcıyı yormayan gizli güvenlik katmanları.
3. **Küfür / Nefret Söylemi İncellemesi:** Yönetici onayından önce temel kelime filtrelemesi.

---

## 5. İleride Detaylandırılacak & İstişare Edilecek Konular

- [ ] Yorumlara diğer okuyucuların reaksiyon (Beğen / Katılıyorum / Düşündürücü) verebilmesi.
- [ ] Masaüstü uygulamasının sadece yorumları değil, Destek & Talep formlarını da tek merkezden yönetebilmesi.
- [ ] Ekip üyeleri arasında yetkilendirme (Hangi yazının yorumunu kimin onaylayabileceği görevi).
- [ ] Bildirim sesleri, sessiz saatler ve mobil senkronizasyon tercihleri.
