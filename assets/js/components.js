/**
 * MSK Labs - Standardized Header Navigation & Footer Component Injector
 * Ensures 100% consistent top navigation bar and bottom footer on all pages.
 */
document.addEventListener("DOMContentLoaded", function () {
  // Ensure default language class on body if not present
  if (!document.body.classList.contains('lang-tr') && 
      !document.body.classList.contains('lang-en') && 
      !document.body.classList.contains('lang-ar')) {
    document.body.classList.add('lang-tr');
  }

  const currentPath = window.location.pathname;
  const isSubFolder = currentPath.includes('/apps/') || currentPath.includes('/blog/');
  const rel = isSubFolder ? '../' : '';

  // 1. Top Navigation Bar HTML
  const topNavHtml = `
  <nav class="top-main-nav" style="text-align: center; margin: 1rem 0 1.25rem 0; font-size: 0.88rem; font-weight: 600; color: #475569;">
    <a href="${rel}index.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
      <span class="lang-tr">Ana Sayfa</span><span class="lang-en">Home</span><span class="lang-ar">الرئيسية</span>
    </a>
    <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
    <a href="${rel}blog/blog.html?type=bizce" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
      <span class="lang-tr">Bizce</span><span class="lang-en">Bizce</span><span class="lang-ar">بيزجه</span>
    </a>
    <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
    <a href="${rel}blog/blog.html?type=anilts" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
      <span class="lang-tr">Anıltılar</span><span class="lang-en">Anıltılar</span><span class="lang-ar">Anıltılar</span>
    </a>
    <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
    <a href="${rel}index.html#apps" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
      <span class="lang-tr">Uygulamalarımız</span><span class="lang-en">Our Apps</span><span class="lang-ar">تطبيقاتنا</span>
    </a>
    <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
    <a href="${rel}about.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
      <span class="lang-tr">Hakkımızda</span><span class="lang-en">About Us</span><span class="lang-ar">عن الشركة</span>
    </a>
    <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
    <a href="${rel}destek.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
      <span class="lang-tr">Destek &amp; Talep</span><span class="lang-en">Support &amp; Feedback</span><span class="lang-ar">الدعم والطلبات</span>
    </a>
    <span style="color: #cbd5e1; margin: 0 0.25rem;">|</span>
    <a href="${rel}contact.html" style="color: #334155; text-decoration: none; padding: 0.25rem 0.5rem; transition: color 0.2s;">
      <span class="lang-tr">İletişim</span><span class="lang-en">Contact</span><span class="lang-ar">اتصل بنا</span>
    </a>
  </nav>`;

  // 2. Footer HTML
  const footerHtml = `
  <footer class="site-footer" style="text-align: center; padding: 1.5rem 1rem; border-top: 1px solid #cbd5e1; margin-top: 2.5rem; font-size: 0.85rem; color: #64748b;">
    <div class="footer-links" style="margin-bottom: 0.75rem; font-weight: 600;">
      <a href="${rel}index.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Ana Sayfa</span><span class="lang-en">Home</span><span class="lang-ar">الرئيسية</span></a> |
      <a href="${rel}blog/blog.html?type=bizce" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Bizce</span><span class="lang-en">Bizce</span><span class="lang-ar">بيزجه</span></a> |
      <a href="${rel}blog/blog.html?type=anilts" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Anıltılar</span><span class="lang-en">Anıltılar</span><span class="lang-ar">Anıltılar</span></a> |
      <a href="${rel}about.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Hakkımızda</span><span class="lang-en">About Us</span><span class="lang-ar">عن الشركة</span></a> |
      <a href="${rel}destek.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Destek &amp; Talep</span><span class="lang-en">Support &amp; Feedback</span><span class="lang-ar">الدعم والطلبات</span></a> |
      <a href="${rel}contact.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">İletişim</span><span class="lang-en">Contact</span><span class="lang-ar">اتصل بنا</span></a> |
      <a href="${rel}who-we-are.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Biz Kimiz</span><span class="lang-en">Who We Are</span><span class="lang-ar">من نحن</span></a> |
      <a href="${rel}faq.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">SSS</span><span class="lang-en">FAQ</span><span class="lang-ar">الأسئلة الشائعة</span></a> |
      <a href="${rel}privacy.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Gizlilik Politikası</span><span class="lang-en">Privacy Policy</span><span class="lang-ar">سياسة الخصوصية</span></a> |
      <a href="${rel}terms.html" style="color: #475569; text-decoration: none; margin: 0 0.35rem;"><span class="lang-tr">Kullanım Koşulları</span><span class="lang-en">Terms of Service</span><span class="lang-ar">شروط الخدمة</span></a>
    </div>
    <p class="copyright-line" style="margin: 0;">
      <span class="lang-tr">© 2026 MSK Labs. Tüm hakları saklıdır.</span>
      <span class="lang-en">© 2026 MSK Labs. All rights reserved.</span>
      <span class="lang-ar">© 2026 MSK Labs. جميع الحقوق محفوظة.</span>
    </p>
  </footer>`;

  // Auto-inject Top Nav if element .top-main-nav is missing
  if (!document.querySelector('.top-main-nav')) {
    const logoContainer = document.querySelector('.logo-container') || document.querySelector('.bizce-header');
    if (logoContainer) {
      logoContainer.insertAdjacentHTML('afterend', topNavHtml);
    }
  }

  // Auto-inject Footer if site-footer element is completely missing
  if (!document.querySelector('.site-footer') && !document.getElementById('site-footer')) {
    document.body.insertAdjacentHTML('beforeend', footerHtml);
  }
});