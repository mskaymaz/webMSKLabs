# Antigravity Workspace Rules - webMSKLabs

## 1. Açılış ve Durum Bildirimi ("Bismillah" / "Eko")
* Güne veya oturuma **Bismillah** diyerek başlanır.
* Kullanıcı **"Bismillah"** veya **"eko"** yazdığında:
  - Nerede kalındığına dair **çok kısa, öz ve token-ekonomik** bir özet sunulur.
  - Kodlamaya hazır olunduğu belirtilir.

## 2. Sayfa Düzenleme ve Test Kuralları
- **VİDEO KONTROLLÜ BROWSER / SUBAGENT KULLANILMAYACAKTIR**: Sayfalar, HTML, CSS, JS ve diğer dosyalar üzerinde düzenleme ve düzeltme yaparken KESİNLİKLE video kontrollü tarayıcı yapısı (rowser_subagent) KULLANILMAYACAKTIR.
- Kod ve sayfa değişiklikleri doğrudan dosya düzenleme araçları (eplace_file_content, write_to_file, multi_replace_file_content) ve standart geliştirme adımları ile yapılacaktır.
- Kullanıcı talimatı gereği hiçbir aşamada video kayıtlı tarayıcı oturumu (rowser_subagent) başlatılmayacaktır.

## 3. MANDATORY STRICT EXECUTION PROTOCOL ("Bismillah" / "Eko")

**CRITICAL MANDATE FOR ALL AI AGENTS (UNBREAKABLE & NON-NEGOTIABLE):**
Whenever the user includes the keywords **"Bismillah"**, **"Eko"**, or requests scoped operations, the following rules MUST be strictly enforced without exception:

1. **SESSION OPENING & STATUS REPORT**:
   - Always open with **"Bismillah"**.
   - Provide a concise, token-economic summary of current status and state readiness for coding.

2. **STRICT SCOPE CONTROL**:
   - Execute ONLY the explicitly requested scope.
   - Do NOT scan unrelated files or directories.
   - Do NOT broaden the search, refactor unrequested areas, or modify untouched files.

3. **STRICT GIT PUSH POLICY**:
   - **NEVER EXECUTE git push** unless the user explicitly gives a command containing the word **"push"**.
   - Performing git commit is permitted ONLY when requested, but **pushing to remote is STRICTLY FORBIDDEN** without an explicit push directive from the user.

4. **MINIMAL RESPONSE FORMAT**:
   - Keep all responses minimal (a concise summary unless detailed information is explicitly requested).
   - **TURKISH LANGUAGE REQUIREMENT**: All status updates and responses MUST be provided in **Turkish (Türkçe)**.

5. **SURGICAL EFFICIENCY & TOKEN CONSERVATION**:
   - Perform ONLY surgical, targeted edits on the exact lines/files specified by the user.
   - NEVER touch, refactor, or re-format collateral or unrequested files.
   - Minimize context scanning and unnecessary tool usage to conserve tokens and prevent side-effect regressions.

## 4. MANDATORY WORKFLOW: CONSULTATION BEFORE CODE EXECUTION (NON-NEGOTIABLE)

**CRITICAL PROTOCOL FOR ALL CODE ASSISTANTS:**
1. **NO CODE ON CONSULTATIVE PROMPTS**:
   - When the user asks for opinions, ideas, analysis, or solutions (e.g., *"Fikrin nedir?"*, *"Ne düşünüyorsun?"*, *"Senin çözümün nedir?"*, *"Bu doğru mu?"*), DO NOT modify files or write implementation code.
2. **CONSULTATION & ALIGNMENT FIRST**:
   - Present options, pros/cons, and architecture details.
   - Discuss and reach a mutual agreement with the user first.
3. **EXPLICIT EXECUTION DIRECTIVE REQUIRED**:
   - DO NOT start writing code or editing files until the user explicitly gives an execution command (e.g., *"Şimdi yapalım"*, *"Evet yapalım"*, *"Yap"*).
