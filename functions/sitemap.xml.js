/**
 * Cloudflare Pages Function: /sitemap.xml
 * Dinamik ve Canlı XML Site Haritası Üreticisi
 */

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  let posts = [];
  let pages = [];

  // 1. D1 Veritabanından Yazıları ve Sayfaları Çek
  if (env.DB) {
    try {
      const { results: postResults } = await env.DB.prepare(`
        SELECT p.slug, p.published_at, p.updated_at, c.slug as channel_slug 
        FROM blog_posts p
        LEFT JOIN blog_channels c ON p.channel_id = c.id
        WHERE p.status = 'published' AND (c.is_active = 1 OR c.is_active IS NULL)
        ORDER BY p.published_at DESC
      `).all();
      posts = postResults || [];

      const { results: pageResults } = await env.DB.prepare(`
        SELECT slug, updated_at 
        FROM site_pages 
        WHERE status = 'published'
        ORDER BY display_order ASC
      `).all();
      pages = pageResults || [];
    } catch (err) {
      console.warn('[Dynamic Sitemap] D1 fetch failed:', err.message);
    }
  }

  // 2. D1 yoksa veya boşsa API fallback
  if (posts.length === 0) {
    try {
      const apiUrl = (env.API_URL || url.origin) + '/api/v1/sitemap.xml';
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const xmlContent = await apiRes.text();
        return new Response(xmlContent, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=14400',
          },
        });
      }
    } catch (_) {}
  }

  // 3. XML Şablonunu Oluştur
  const now = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  // Ana Sayfa
  xml += `  <url>\n    <loc>https://msklabs.org/</loc>\n    <lastmod>${now}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;

  // Sabit Sayfalar
  const STATIC_PAGES = [
    { loc: 'https://msklabs.org/apps.html', priority: '0.9' },
    { loc: 'https://msklabs.org/bizkimiz.html', priority: '0.8' },
    { loc: 'https://msklabs.org/about.html', priority: '0.8' },
    { loc: 'https://msklabs.org/contact.html', priority: '0.7' },
    { loc: 'https://msklabs.org/blog/bizce', priority: '0.9' },
    { loc: 'https://msklabs.org/blog/aniltilar', priority: '0.8' },
    { loc: 'https://msklabs.org/blog/guncel', priority: '0.8' },
  ];

  for (const page of STATIC_PAGES) {
    xml += `  <url>\n    <loc>${page.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <priority>${page.priority}</priority>\n  </url>\n`;
  }

  // Dinamik Kurumsal Sayfalar (site_pages)
  for (const pg of pages) {
    if (pg.slug && pg.slug !== 'index') {
      const lastmod = pg.updated_at ? pg.updated_at.split('T')[0] : now;
      xml += `  <url>\n    <loc>https://msklabs.org/${pg.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`;
    }
  }

  // Dinamik Blog Makaleleri (Temiz Slug Standardı)
  for (const p of posts) {
    if (p.slug) {
      const channelSlug = p.channel_slug || 'bizce';
      const postUrl = `https://msklabs.org/blog/${channelSlug}/${p.slug}`;
      const lastmod = p.updated_at ? p.updated_at.split('T')[0] : (p.published_at ? p.published_at.split(' ')[0] : now);

      xml += `  <url>\n`;
      xml += `    <loc>${postUrl}</loc>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="tr" href="${postUrl}"/>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="en" href="${postUrl}?lang=en"/>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="ar" href="${postUrl}?lang=ar"/>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=14400',
    },
  });
}
