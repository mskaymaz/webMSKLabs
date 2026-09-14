# Antigravity Workspace Rules - webMSKLabs

## Sayfa Düzenleme ve Test Kuralları
- **VİDEO KONTROLLÜ BROWSER / SUBAGENT KULLANILMAYACAKTIR**: Sayfalar, HTML, CSS, JS ve diğer dosyalar üzerinde düzenleme ve düzeltme yaparken KESİNLİKLE video kontrollü tarayıcı yapısı (`browser_subagent`) KULLANILMAYACAKTIR.
- Kod ve sayfa değişiklikleri doğrudan dosya düzenleme araçları (`replace_file_content`, `write_to_file`, `multi_replace_file_content`) ve standart geliştirme adımları ile yapılacaktır.
- Kullanıcı talimatı gereği hiçbir aşamada video kayıtlı tarayıcı oturumu (`browser_subagent`) başlatılmayacaktır.

## MANDATORY STRICT EXECUTION PROTOCOL ("Bismillah" / "Eko")

**CRITICAL MANDATE FOR ALL AI AGENTS (UNBREAKABLE & NON-NEGOTIABLE):**
Whenever the user includes the keywords **"Bismillah"**, **"Eko"**, or requests scoped operations, the following rules MUST be strictly enforced without exception:

1. **STRICT SCOPE CONTROL**:
   - Execute ONLY the explicitly requested scope.
   - Do NOT scan unrelated files or directories.
   - Do NOT broaden the search, refactor unrequested areas, or modify untouched files.

2. **STRICT GIT PUSH POLICY**:
   - **NEVER EXECUTE `git push`** unless the user explicitly gives a command containing the word **"push"**.
   - Performing `git commit` is permitted ONLY when requested, but **pushing to remote is STRICTLY FORBIDDEN** without an explicit push directive from the user.

3. **MINIMAL RESPONSE FORMAT**:
   - Keep all responses minimal (a concise one-line status unless detailed information is explicitly requested).
   - **TURKISH LANGUAGE REQUIREMENT**: All status updates and responses MUST be provided in **Turkish (Türkçe)**.

4. **SURGICAL EFFICIENCY & TOKEN CONSERVATION**:
   - Perform ONLY surgical, targeted edits on the exact lines/files specified by the user.
   - NEVER touch, refactor, or re-format collateral or unrequested files.
   - Minimize context scanning and unnecessary tool usage to conserve tokens and prevent side-effect regressions.
