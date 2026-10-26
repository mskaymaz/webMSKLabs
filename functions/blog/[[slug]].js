/**
 * Cloudflare Pages Function: /blog/[[slug]]
 * Edge SSR & HTMLRewriter Pre-rendering for MSK Labs Blog
 * 
 * Googlebot, AdSense tarayıcısı ve kullanıcılar için makaleleri Edge'de
 * önceden render ederek tam SEO ve AdSense uyumlu HTML üretir.
 */

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  // 1. Slug ve Kategori Tespiti
  const pathParts = (params.slug || []).filter(Boolean);
  let channel = '';
  let postSlugOrId = '';

  const KNOWN_CHANNELS = ['bizce', 'aniltilar', 'anilts', 'guncel', 'news', 'vlog'];

  if (pathParts.length >= 2) {
    channel = pathParts[0].toLowerCase();
    postSlugOrId = pathParts[1];
  } else if (pathParts.length === 1) {
    const single = pathParts[0];
    if (KNOWN_CHANNELS.includes(single.toLowerCase())) {
      channel = single.toLowerCase();
    } else {
      postSlugOrId = single;
    }
  }

  // Query parametreleri geriye dönük uyumluluk (?id=post_5 veya ?post=...)
  if (!postSlugOrId) {
    postSlugOrId = url.searchParams.get('id') || url.searchParams.get('post') || '';
  }
  if (!channel) {
    channel = (url.searchParams.get('type') || url.searchParams.get('cat') || '').toLowerCase();
  }

  const lang = (url.searchParams.get('lang') || 'tr').toLowerCase();

  // 2. Statik blog.html şablonunu Pages ASSETS üzerinden çek
  let templateResponse;
  try {
    templateResponse = await env.ASSETS.fetch(new URL('/blog/blog.html', request.url));
  } catch (err) {
    templateResponse = await fetch(new URL('/blog/blog.html', request.url));
  }

  // 3. Eğer tekil yazı talebi yoksa, ana blog veya kategori şablonunu sun
  if (!postSlugOrId) {
    if (channel) {
      const channelTitles = {
        bizce: 'Bizce — Düşünce & Perspektif | MSK Labs',
        aniltilar: 'Anıltılar — Hatıra & Tecrübe | MSK Labs',
        anilts: 'Anıltılar — Hatıra & Tecrübe | MSK Labs',
        guncel: 'Güncel — Analiz & Gündem | MSK Labs',
      };
      const title = channelTitles[channel] || 'MSK Labs Yayın Platformu';
      return new HTMLRewriter()
        .on('title', { element(el) { el.setInnerContent(title); } })
        .transform(templateResponse);
    }
    return templateResponse;
  }

  // 4. Veritabanından (D1) Makale Verilerini Çek
  let post = null;
  if (env.DB) {
    try {
      post = await env.DB.prepare(`
        SELECT p.*, c.slug as channel_slug, c.name_tr as channel_name_tr, c.name_en as channel_name_en, c.name_ar as channel_name_ar
        FROM blog_posts p
        LEFT JOIN blog_channels c ON p.channel_id = c.id
        WHERE (p.slug = ? OR p.id = ?) AND p.status = 'published'
        LIMIT 1
      `).bind(postSlugOrId, postSlugOrId).first();
    } catch (dbErr) {
      console.warn('[Edge Blog SSR] D1 Query error:', dbErr.message);
    }
  }

  // D1 yoksa veya bulunamadıysa API fallback
  if (!post) {
    try {
      const apiUrl = (env.API_URL || url.origin) + `/api/v1/posts/${postSlugOrId}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        post = data.post || null;
      }
    } catch (apiErr) {
      console.warn('[Edge Blog SSR] API fallback error:', apiErr.message);
    }
  }

  // Yazı bulunamadıysa standart şablonu geri dön (istemci 404 gösterecektir)
  if (!post) {
    return templateResponse;
  }

  // 5. Çok Dilli İçerik Çözümlemesi
  const title = (lang === 'en' && post.title_en) ? post.title_en : (lang === 'ar' && post.title_ar) ? post.title_ar : (post.title_tr || post.title || '');
  const summary = (lang === 'en' && post.summary_en) ? post.summary_en : (lang === 'ar' && post.summary_ar) ? post.summary_ar : (post.summary_tr || post.summary || '');
  const content = (lang === 'en' && post.content_en) ? post.content_en : (lang === 'ar' && post.content_ar) ? post.content_ar : (post.content_tr || post.content || '');
  
  const postChannelSlug = post.channel_slug || channel || 'bizce';
  const postChannelName = (lang === 'en' && post.channel_name_en) ? post.channel_name_en : (lang === 'ar' && post.channel_name_ar) ? post.channel_name_ar : (post.channel_name_tr || 'BİZCE');

  const pageTitle = `${title} | Bizce & Anıltılar & Güncel | MSK Labs`;
  const cleanSummary = (summary || '').replace(/<[^>]*>?/gm, '').trim();
  const canonicalUrl = `https://msklabs.org/blog/${postChannelSlug}/${post.slug || post.id}${lang !== 'tr' ? '?lang=' + lang : ''}`;
  
  let coverImgUrl = post.cover_image || 'https://msklabs.org/img/MSKLabsLogo.svg';
  if (coverImgUrl.startsWith('../')) coverImgUrl = 'https://msklabs.org/' + coverImgUrl.replace(/^\.\.\//, '');
  else if (coverImgUrl.startsWith('/')) coverImgUrl = 'https://msklabs.org' + coverImgUrl;

  const publishedDate = post.published_at ? post.published_at.split(' ')[0] : '2026-10-01';
  const formattedDate = publishedDate.split('-').reverse().join('.'); // DD.MM.YYYY

  // 6. Schema.org Article / BlogPosting Yapılandırılmış Verisi
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "headline": title,
    "description": cleanSummary,
    "image": [coverImgUrl],
    "datePublished": post.published_at ? new Date(post.published_at).toISOString() : new Date().toISOString(),
    "dateModified": post.updated_at ? new Date(post.updated_at).toISOString() : (post.published_at ? new Date(post.published_at).toISOString() : new Date().toISOString()),
    "author": {
      "@type": "Organization",
      "name": post.author_name || "MSK Labs",
      "url": "https://msklabs.org/"
    },
    "publisher": {
      "@type": "Organization",
      "name": "MSK Labs",
      "logo": {
        "@type": "ImageObject",
        "url": "https://msklabs.org/img/MSKLabsLogo.svg"
      }
    }
  };

  // 7. Cloudflare HTMLRewriter ile Sunucu Taraflı HTML Dönüşümü
  return new HTMLRewriter()
    .on('title', {
      element(el) { el.setInnerContent(pageTitle); }
    })
    .on('meta[name="description"]', {
      element(el) { el.setAttribute('content', cleanSummary); }
    })
    .on('link[rel="canonical"]', {
      element(el) { el.setAttribute('href', canonicalUrl); }
    })
    .on('meta[property="og:title"]', {
      element(el) { el.setAttribute('content', pageTitle); }
    })
    .on('meta[property="og:description"]', {
      element(el) { el.setAttribute('content', cleanSummary); }
    })
    .on('meta[property="og:url"]', {
      element(el) { el.setAttribute('content', canonicalUrl); }
    })
    .on('meta[property="og:image"]', {
      element(el) { el.setAttribute('content', coverImgUrl); }
    })
    .on('meta[name="twitter:title"]', {
      element(el) { el.setAttribute('content', pageTitle); }
    })
    .on('meta[name="twitter:description"]', {
      element(el) { el.setAttribute('content', cleanSummary); }
    })
    .on('meta[name="twitter:image"]', {
      element(el) { el.setAttribute('content', coverImgUrl); }
    })
    .on('head', {
      element(el) {
        el.append(`\n    <script type="application/ld+json" id="articleJsonLd">${JSON.stringify(articleSchema)}</script>\n`, { html: true });
      }
    })
    .on('#readCategory', {
      element(el) { el.setInnerContent(postChannelName); }
    })
    .on('#readTitle', {
      element(el) { el.setInnerContent(title); }
    })
    .on('#readDate', {
      element(el) { el.setInnerContent(formattedDate); }
    })
    .on('#readContent', {
      element(el) {
        const normalizedContent = (content || '').replace(/\.\.\/media\//g, '/media/');
        el.setInnerContent(normalizedContent, { html: true });
      }
    })
    .on('#listView', {
      element(el) { el.setAttribute('style', 'display: none;'); }
    })
    .on('#readerView', {
      element(el) { el.setAttribute('style', 'display: block;'); }
    })
    .transform(templateResponse);
}
