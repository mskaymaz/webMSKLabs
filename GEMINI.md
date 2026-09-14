# Antigravity Workspace Rules - webMSKLabs

## Sayfa Düzenleme ve Test Kuralları
- **VİDEO KONTROLLÜ BROWSER / SUBAGENT KULLANILMAYACAKTIR**: Sayfalar, HTML, CSS, JS ve diğer dosyalar üzerinde düzenleme ve düzeltme yaparken KESİNLİKLE video kontrollü tarayıcı yapısı (`browser_subagent`) KULLANILMAYACAKTIR.
- Kod ve sayfa değişiklikleri doğrudan dosya düzenleme araçları (`replace_file_content`, `write_to_file`, `multi_replace_file_content`) ve standart geliştirme adımları ile yapılacaktır.
- Kullanıcı talimatı gereği hiçbir aşamada video kayıtlı tarayıcı oturumu (`browser_subagent`) başlatılmayacaktır.
