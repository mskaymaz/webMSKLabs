# webMSKLabs — Proje Kuralları ve Çalışma Prensipleri (AGENTS.md)

## 1. Açılış ve Durum Bildirimi
* Güne veya oturuma **Bismillah** diyerek başlanır.
* Kullanıcı **"Bismillah"** veya **"eko"** yazdığında:
  - Nerede kalındığına dair **çok kısa, öz ve token-ekonomik** bir özet sunulur.
  - Kodlamaya hazır olunduğu belirtilir.

## 2. Kodlama ve Token Tasarrufu Prensipleri
* **Token Ekonomisi:** Tüm yanıtlar ve doküman güncellemeleri olabildiğince kısa, net ve ekonomik tutulur.
* **Minimalist & Cerrahi Müdahale:** Yazılan veya güncellenen kodlar son derece minimal, odaklı ve etrafa yayılmadan yazılır.
* **Satır Sınırı:** Hiçbir kod dosyası 400-450 satırı aşamaz; modüler parçalara bölünür.
* **Kapsam İzni:** Onay/talimat olmadan tüm repo genelinde arama veya izinsiz büyük değişiklik yapılmaz.

## 3. Dokümantasyon ve İlerleme Takibi
* Commit/Push öncesinde veya oturum sonunda yapılan işlemler PROGRESS.md, CHANGELOG.md veya tasks.md dosyalarına işlenir.
* **Türkçe & Tarih-Saat Formatı:** Tüm commit mesajları ve dokümantasyon notları anlaşılır **Türkçe açıklamalarla ve tam tarih-saat damgasıyla** (Örn: 01.10.2026 - 16:30) yazılır.
* Kullanıcı süreçle ilgili genel/özel bir kural ifade ettiğinde fark edilir ve AGENTS.md dosyasına eklenerek kayıt altına alınır.

## 4. Ana Dal (Main) ve Canlı Yayın Protokolü
* **Ana Dal Çalışma Standardı:** Hem panel yapısı (`MSKLabsDesk`) hem de web arayüzü (`webMSKLabs`) tamamen normal yayına geçmiş olup, tüm geliştirmeler ve güncellemeler doğrudan ana dal (`main`) üzerinde yürütülür.
* **Yedek Dal Güvencesi:** Canlıya geçiş öncesindeki durumlar (`OldMain`, `OldMaster` ve `DevAdmin`) yedek ve arşiv amaçlı olarak hem yerelde hem uzak repoda korunur; silinmez.
* **Yerel Öncelikli Doğrulama (Local-First Verification):** Değişiklikler doğrudan ana dalda geliştirilse dahi önce yerel sunucuda (`localhost`) derlenip test edilir; kullanıcıdan yerel görünüm ve işlevsellik için açık onay alınmadan uzak sunucuya (Cloudflare Pages / GitHub) push/dağıtım yapılmaz.
* **Kabul Kriteri (DoD):** Görevler ancak kod uygulandığında, arayüz-API-veritabanı entegrasyonu gerçek veriyle doğrulandığında ve derleme/regresyon testleri hatasız geçtiğinde `DoD` kriterini sağlar. Mock veri veya yüzeysel PASS yeterli kabul edilmez.

## 5. Dil ve Arayüz Kuralı
* Yönetici arayüzü tamamen Türkçe, web kamusal içerikleri çoklu dil (TR, EN, AR) desteğini korur.

## 6. Nesnel Mühendislik ve Dürüst İstişare İlkesi (Övgü ve Pohpohlama Yasağı)
* Kullanıcıya yönelik yapay övgüler, pohpohlama veya abartılı ifadeler ("harika, süper, mühendislik harikası" vb.) kesinlikle kullanılmaz.
* İstişarelerde asistanın yegane görevi; nesnel, tarafsız ve soğukkanlı bir mühendis gibi davranmak, fikirdeki açıkları, riskleri ve tutarsızlıkları sansürsüzce ortaya koymak, doğru ve en verimli teknik yolu savunmaktır.
