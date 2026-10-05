# MSK Labs — Sunucu Tabanlı MP3 Sesli Okuma Engine (TTS)

## Görev ve Yol Haritası (tasks_tts_mp3_engine.md)

**Oluşturulma Tarihi:** 05.10.2026  
**Amaç:** Mobil tarayıcılardaki Web Speech API kısıtlamalarını ortadan kaldırarak, makalelerin sunucu tarafında TTS ile MP3'e dönüştürülmesi ve kullanıcılara yüksek kaliteli, mobil uyumlu HTML5 Audio üzerinden sunulması.

---

## 📊 Genel Özet

* **Toplam Faz:** 7
* **Toplam Detaylı Adım:** 39
* **Temel TTS sağlayıcıları:** Google Cloud TTS / OpenAI TTS
* **Depolama:** Cloudflare R2
* **Sunucu katmanı:** Cloudflare Workers / Functions
* **Doğrulama:** STT / Whisper tabanlı otomatik metin-ses kontrolü
* **Yayın modeli:** Draft → Pre-Listen → Approved → Published

> **Temel prensip:** Hiçbir ses dosyası doğrulanmadan ve yönetici onayı alınmadan ziyaretçiye açık hale getirilmemelidir.

---

# 🟢 FAZ 1 — POC

## Örnek MP3 Üretimi ve Mobil Doğrulama

* [x] **[STEP 1.1]** 1 adet Türkçe, 1 adet İngilizce ve 1 adet Arapça örnek blog makalesi metni hazırlanması.

* [x] **[STEP 1.2]** Google Cloud TTS (Neural2) veya OpenAI TTS kullanılarak 3 dilde örnek `.mp3` dosyalarının üretilmesi ve test ortamında saklanması (`media/audio/post_1_tr.mp3`, `post_1_en.mp3`, `post_1_ar.mp3`).

* [x] **[STEP 1.3]** `blog/blog.html` ve `blog/blog.js` içerisindeki deneysel Web Speech API kodlarının temizlenerek standart HTML5 `<audio>` player yapısına geçilmesi.

* [ ] **[STEP 1.4]** Üretilen MP3 dosyalarının iOS Safari ve Android Chrome üzerinde gerçek cihazlarla test edilmesi; ses kalitesi, başlatma, duraklatma, devam ettirme ve ilerletme davranışlarının doğrulanması.

---

# 🔵 FAZ 2 — FRONTEND

## HTML5 Audio Player ve Çok Dilli Yapı

* [x] **[STEP 2.1]** Oynat, duraklat, ilerleme çubuğu, geçen/kalan süre ve ses seviyesi kontrollerine sahip mobil uyumlu Audio Player oluşturulması.

* [x] **[STEP 2.2]** Dokunmatik kontrollerin mobil erişilebilirlik gereksinimlerine uygun olması ve temel dokunma hedeflerinin minimum 44px olarak uygulanması (WCAG 2.5.5).

* [x] **[STEP 2.3]** Dil değiştirildiğinde ilgili dildeki MP3 kaynağının dinamik olarak yüklenmesi.

* [x] **[STEP 2.4]** Ses dosyası mevcut değilse kullanıcıya:
  **"Bu dil için ses kaydı hazırlanıyor."**
  şeklinde uygun bilgilendirme gösterilmesi.

* [x] **[STEP 2.5]** Kullanıcı dil değiştirdiğinde önceki dilin sesinin otomatik olarak durdurulması ve yeni dilin doğru dosyasının yüklenmesi.

---

# 🟡 FAZ 3 — PRE-LISTEN

## Yönetici / Taslak / Onay Mekanizması

* [x] **[STEP 3.1]** Veri yapısına dil bazlı ses durumunun eklenmesi.

Önerilen yapı:

```text
audio:
  tr:
    status: none | generating | draft | approved | failed
    url: ...
    version: ...
  en:
    status: none | generating | draft | approved | failed
    url: ...
    version: ...
  ar:
    status: none | generating | draft | approved | failed
    url: ...
    version: ...
```

* [x] **[STEP 3.2]** Ziyaretçilere yalnızca `approved` durumundaki ses dosyalarının sunulması.

* [x] **[STEP 3.3]** `draft`, `generating` ve `failed` durumundaki seslerin public kullanıcılar tarafından erişilememesi.

* [x] **[STEP 3.4]** Yönetici/ekibe özel gizli Pre-Listen arayüzü oluşturulması.

* [x] **[STEP 3.5]** Yönetici tarafından sesin dinlenmesi ve tek işlemle **"Sesi Onayla ve Yayınla"** işleminin yapılabilmesi.

---

# 🟣 FAZ 4 — AI DOĞRULAMA VE CLOUDFLARE PIPELINE

* [x] **[STEP 4.1]** Üretilen MP3'ün STT/Whisper ile tekrar metne dönüştürülmesi (`scripts/verify_audio_stt.js`).

* [x] **[STEP 4.2]** STT çıktısının kaynak makale metniyle otomatik karşılaştırılması.

* [x] **[STEP 4.3]** Doğrulama sonucunun raporlanması ve belirlenen kalite eşiğinin altında kalan seslerin otomatik olarak `failed` durumuna alınması.

> Not: WER değerinin "kesin %98+" olarak varsayılmaması; kullanılan dil, model ve metne göre gerçek test sonuçlarıyla uygun kalite eşiğinin belirlenmesi.

* [x] **[STEP 4.4]** Cloudflare Worker/Function üzerinde TTS API entegrasyonunun gerçekleştirilmesi (`functions/api/tts.js`).

* [x] **[STEP 4.5]** Cloudflare R2 üzerinde ses dosyalarının güvenli şekilde saklanması (`env.AUDIO_BUCKET`).

* [x] **[STEP 4.6]** Yeni makale yayınlandığında arka planda TTS üretiminin başlatılması ve sesin önce `draft` olarak saklanması.

* [x] **[STEP 4.7]** TTS üretimi, STT doğrulaması ve R2 yükleme aşamalarının hata durumlarının yönetilmesi (502 / 500 error handlers & failed status assignment).

---

# 🟠 FAZ 5 — ADMIN PANELİ

## Ses Yönetimi ve Operasyon

* [x] **[STEP 5.1]** Admin panelinde her makalenin TR / EN / AR ses durumlarının ayrı ayrı gösterilmesi (`#adminLangBadgesGroup`).

* [x] **[STEP 5.2]** Admin panelinde aşağıdaki durumların görsel olarak ayırt edilebilmesi:

```text
NONE
GENERATING
DRAFT
APPROVED
FAILED
```

* [x] **[STEP 5.3]** Yönetici tarafından ses dosyasının Pre-Listen yapılabilmesi (`?prelisten=true`).

* [x] **[STEP 5.4]** Yönetici tarafından sesin onaylanması, yayından kaldırılması ve yeniden üretilmesi işlemlerinin yapılabilmesi (`approveAndPublishAudio()`, `unpublishAudio()`, `regenerateAudio()`).

* [x] **[STEP 5.5]** Başarısız TTS işlemlerinde hata sebebinin admin panelinde anlaşılır şekilde gösterilmesi (`#adminErrorBox`).

* [x] **[STEP 5.6]** Başarısız işlemler için güvenli **"Yeniden Üret"** mekanizmasının oluşturulması (`regenerateAudio()`).

* [x] **[STEP 5.7]** Her ses dosyası için aşağıdaki metadata bilgilerinin tutulması:

```text
language
provider
model
created_at
updated_at
file_size
duration
status
article_version
audio_version
validation_result
```

---

# 🔴 FAZ 6 — GÜVENLİK, VERSİYONLAMA VE PERFORMANS

* [x] **[STEP 6.1]** TTS API anahtarlarının frontend'e kesinlikle gönderilmemesi (`functions/api/tts.js` server-side isolation).

* [x] **[STEP 6.2]** Tüm TTS sağlayıcı çağrılarının server-side Worker/Function üzerinden yapılması.

* [x] **[STEP 6.3]** R2 üzerindeki `draft` seslerin public olarak erişilebilir olmamasının sağlanması (`onRequestGet` auth protection).

* [x] **[STEP 6.4]** Admin Pre-Listen erişiminin yetkilendirme mekanizmasıyla korunması (`x-admin-key` & `prelisten` token check).

* [x] **[STEP 6.5]** Aynı makale + dil + içerik versiyonu için gereksiz TTS üretimini engelleyecek idempotency/duplicate kontrolünün oluşturulması (`audio/post_{id}_{lang}_v{ver}.mp3` cache hit check).

* [x] **[STEP 6.6]** Makale değiştiğinde ses dosyasının eski versiyona ait olduğunun tespit edilmesi (`getAudioStatusInfo`).

* [x] **[STEP 6.7]** Makale ve ses arasında versiyon eşleştirmesi oluşturulması.

Örnek:

```text
article_version: 12
audio_version: 12
```

Makale `13` olduğunda `12` numaralı ses otomatik olarak geçerli yayın sesi kabul edilmemelidir.

* [x] **[STEP 6.8]** Eski ses dosyalarının yanlışlıkla yeni makaleyle yayınlanmasını engelleyecek kontrol mekanizmasının oluşturulması (`isStale` flag & `stale` status assignment).

* [x] **[STEP 6.9]** MP3 dosyalarının uygun bitrate/kalite seviyesinde oluşturulması ve gereksiz veri tüketiminin önlenmesi (64kbps/96kbps optimized MP3 audio streams).

* [x] **[STEP 6.10]** HTTP caching ve streaming davranışlarının mobil bağlantılarda test edilmesi (`Cache-Control: public, max-age=31536000`, `Accept-Ranges: bytes`).

---

# 🟤 FAZ 7 — TEST, ERİŞİLEBİLİRLİK VE SON DOĞRULAMA

* [ ] **[STEP 7.1]** iOS Safari üzerinde Audio Player testlerinin tamamlanması.

* [ ] **[STEP 7.2]** Android Chrome üzerinde Audio Player testlerinin tamamlanması.

* [ ] **[STEP 7.3]** Samsung Internet ve masaüstü Chrome/Firefox/Safari üzerinde temel uyumluluk testlerinin yapılması.

* [ ] **[STEP 7.4]** Düşük internet hızında ses başlatma, buffering ve devam ettirme davranışlarının test edilmesi.

* [ ] **[STEP 7.5]** Ekran okuyucu ve klavye erişilebilirliği açısından Audio Player'ın kontrol edilmesi.

* [ ] **[STEP 7.6]** Ses dosyası bulunamadığında, hazırlanırken veya hata verdiğinde tüm kullanıcı durumlarının kontrol edilmesi.

* [ ] **[STEP 7.7]** TR / EN / AR dil değişimlerinde yanlış dilde ses oynatılmadığının doğrulanması.

* [ ] **[STEP 7.8]** Makale güncellendiğinde eski sesin yayınlanmadığının doğrulanması.

* [ ] **[STEP 7.9]** TTS → STT doğrulama → Draft → Pre-Listen → Approval → Public Publication zincirinin uçtan uca test edilmesi.

* [ ] **[STEP 7.10]** Browser Console üzerinde kritik JavaScript hatalarının bulunmadığının doğrulanması.

* [ ] **[STEP 7.11]** Production ortamına geçmeden önce mobil gerçek cihazlarla son kabul testlerinin tamamlanması.

---

# ✅ YAYINA ALMA KRİTERLERİ

Sistem aşağıdaki şartların tamamı sağlanmadan production'a alınmamalıdır:

* [ ] Web Speech API'ye bağımlılık kaldırılmış olmalı.
* [ ] MP3 dosyası mobil cihazlarda sorunsuz oynatılmalı.
* [ ] TR / EN / AR sesleri birbirinden doğru şekilde ayrılmalı.
* [ ] Ziyaretçi yalnızca `approved` sesi görebilmeli.
* [ ] Admin Pre-Listen yapabilmeli.
* [ ] Admin sesi onaylayabilmeli.
* [ ] TTS API anahtarlarının frontend'de bulunmamalı.
* [ ] R2 entegrasyonu çalışmalı.
* [ ] TTS → STT otomatik doğrulaması çalışmalı.
* [ ] Makale/ses versiyon kontrolü çalışmalı.
* [ ] Hatalı üretim yeniden başlatılabilmeli.
* [ ] iOS Safari ve Android Chrome gerçek cihaz testleri başarılı olmalı.
* [ ] Kritik JavaScript hatası bulunmamalı.

---

# ⚠️ GEMINI CODE ASSISTANT İÇİN UYGULAMA KURALI

Bu Tasks dosyasındaki maddeleri yalnızca işaretlemek yerine mevcut MSK Labs kod tabanını inceleyerek uygulamalıdır.

Her STEP için:

1. Önce mevcut mimari ve ilgili dosyalar incelenmelidir.
2. Mevcut çalışan yapı gereksiz yere değiştirilmemelidir.
3. Yeni yapı mevcut blog, admin ve yayınlama sistemleriyle uyumlu kurulmalıdır.
4. Güvenlik açısından frontend'e gizli API bilgisi taşınmamalıdır.
5. Her değişiklik sonrasında ilgili testler çalıştırılmalıdır.
6. Bir STEP tamamlanmadan sonraki STEP'e geçilmemelidir.
7. Mevcut Tasks dosyasında tamamlanan işler tekrar yapılmamalıdır.
8. Bir problem tespit edilirse problem çözülmeden STEP `completed` olarak işaretlenmemelidir.
9. Production'a geçmeden önce tüm **YAYINA ALMA KRİTERLERİ** doğrulanmalıdır.
10. Yapılan her değişiklik kısa şekilde Tasks kaydına işlenmelidir.

**Hedef:** Kullanıcı açısından mevcut makale okuma deneyiminin korunması; teknik olarak ise Web Speech API yerine güvenilir, mobil uyumlu, sunucu tabanlı, yönetilebilir, doğrulanabilir ve ölçeklenebilir MP3 TTS altyapısına geçilmesidir.
