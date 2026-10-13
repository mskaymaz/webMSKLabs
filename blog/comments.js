/**
 * MSK Labs — Kamusal Blog Yorum Arayüzü & Yönetim Köprüsü (INT-COM-001)
 * Vanilla JS, $0 maliyet, sıfır harici bağımlılık, XSS korumalı ve çok dilli.
 */
(function() {
  'use strict';

  var currentActivePost = null;

  var I18N = {
    tr: {
      header: 'Yorumlar & Değerlendirmeler',
      formTitle: '✍️ Düşüncelerinizi Paylaşın',
      formDesc: 'Yorumunuz incelendikten ve onaylandıktan sonra burada yayınlanacaktır. E-posta adresiniz asla kamuya gösterilmez.',
      nameLabel: 'İsim / Rumuz',
      namePlaceholder: 'Örn: Ahmet Yılmaz',
      emailLabel: 'E-Posta (Gizli tutulur)',
      emailPlaceholder: 'ornek@alanadi.com',
      commentLabel: 'Yorumunuz',
      commentPlaceholder: 'Makale hakkında görüş ve katkılarınızı paylaşabilirsiniz...',
      submitBtn: 'Yorumu Gönder 📨',
      submittingBtn: 'Gönderiliyor... ⏳',
      successMsg: 'Teşekkür ederiz! Yorumunuz incelenmek üzere alındı. Yönetici onayından sonra yayınlanacaktır.',
      emptyMsg: 'Bu makaleye henüz yorum yapılmamış. İlk düşünceyi siz paylaşın! ✨',
      loadingMsg: '⏳ Yorumlar yükleniyor...',
      errorMsg: 'Yorum gönderilirken bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.',
      rateLimitMsg: 'Çok fazla yorum gönderildi. Lütfen bir süre bekleyip tekrar deneyin.'
    },
    en: {
      header: 'Comments & Discussions',
      formTitle: '✍️ Share Your Thoughts',
      formDesc: 'Your comment will appear here once reviewed and approved. Your email address is never publicly displayed.',
      nameLabel: 'Name / Nickname',
      namePlaceholder: 'e.g. John Doe',
      emailLabel: 'Email (Kept private)',
      emailPlaceholder: 'user@example.com',
      commentLabel: 'Your Comment',
      commentPlaceholder: 'Share your thoughts and reflections on this article...',
      submitBtn: 'Submit Comment 📨',
      submittingBtn: 'Submitting... ⏳',
      successMsg: 'Thank you! Your comment has been received and will be published after review.',
      emptyMsg: 'No comments on this article yet. Be the first to share your thoughts! ✨',
      loadingMsg: '⏳ Loading comments...',
      errorMsg: 'An error occurred while submitting your comment. Please check inputs and try again.',
      rateLimitMsg: 'Too many comments submitted. Please wait a moment before trying again.'
    },
    ar: {
      header: 'التعليقات والآراء',
      formTitle: '✍️ شاركنا رأيك',
      formDesc: 'سيتم نشر تعليقك هنا بعد مراجعته والموافقة عليه. لن يتم عرض بريدك الإلكتروني أبدًا.',
      nameLabel: 'الاسم / اللقب',
      namePlaceholder: 'مثال: أحمد محمد',
      emailLabel: 'البريد الإلكتروني (سري)',
      emailPlaceholder: 'user@example.com',
      commentLabel: 'تعليقك',
      commentPlaceholder: 'شاركنا أفكارك وملاحظاتك حول المقال...',
      submitBtn: 'إرسال التعليق 📨',
      submittingBtn: 'جارٍ الإرسال... ⏳',
      successMsg: 'شكرًا لك! تم استلام تعليقك وسيتم نشره بعد موافقة الإدارة.',
      emptyMsg: 'لا توجد تعليقات على هذا المقال بعد. كن أول من يشارك برأيه! ✨',
      loadingMsg: '⏳ جاري تحميل التعليقات...',
      errorMsg: 'حدث خطأ أثناء إرسال التعليق. يرجى التحقق من المدخلات والمحاولة مرة أخرى.',
      rateLimitMsg: 'تم إرسال عدد كبير من التعليقات. يرجى الانتظار قليلاً.'
    }
  };

  function getLang() {
    var lang = localStorage.getItem('user_lang') || 'tr';
    return (I18N[lang]) ? lang : 'tr';
  }

  function getDict() {
    return I18N[getLang()];
  }

  function getPostSlug(post) {
    if (!post) return 'general';
    if (post.slug) return post.slug;
    return (post.type ? post.type : 'blog') + '-' + post.id;
  }

  function updateCommentsI18n() {
    var d = getDict();
    var elHeader = document.getElementById('lblCommentsHeaderTxt');
    if (elHeader) elHeader.innerText = d.header;

    var elFormTitle = document.getElementById('lblCommentFormTitle');
    if (elFormTitle) elFormTitle.innerText = d.formTitle;

    var elFormDesc = document.getElementById('lblCommentFormDesc');
    if (elFormDesc) elFormDesc.innerText = d.formDesc;

    var elAuthorLbl = document.getElementById('lblCommentAuthor');
    if (elAuthorLbl) elAuthorLbl.innerText = d.nameLabel;

    var elAuthorInp = document.getElementById('commentAuthor');
    if (elAuthorInp) elAuthorInp.setAttribute('placeholder', d.namePlaceholder);

    var elEmailLbl = document.getElementById('lblCommentEmail');
    if (elEmailLbl) elEmailLbl.innerText = d.emailLabel;

    var elEmailInp = document.getElementById('commentEmail');
    if (elEmailInp) elEmailInp.setAttribute('placeholder', d.emailPlaceholder);

    var elTextLbl = document.getElementById('lblCommentText');
    if (elTextLbl) elTextLbl.innerText = d.commentLabel;

    var elTextInp = document.getElementById('commentText');
    if (elTextInp) elTextInp.setAttribute('placeholder', d.commentPlaceholder);

    var elBtn = document.getElementById('btnSubmitCommentText');
    if (elBtn) elBtn.innerText = d.submitBtn;

    var elEmpty = document.getElementById('commentsEmpty');
    if (elEmpty) elEmpty.innerText = d.emptyMsg;

    var elLoading = document.getElementById('commentsLoading');
    if (elLoading) elLoading.innerText = d.loadingMsg;
  }

  function showAlert(msg, isSuccess) {
    var el = document.getElementById('commentFormAlert');
    if (!el) return;
    el.innerText = msg;
    el.style.display = 'block';
    if (isSuccess) {
      el.style.background = '#dcfce7';
      el.style.color = '#15803d';
      el.style.border = '1px solid #bbf7d0';
    } else {
      el.style.background = '#fee2e2';
      el.style.color = '#b91c1c';
      el.style.border = '1px solid #fecaca';
    }
  }

  function hideAlert() {
    var el = document.getElementById('commentFormAlert');
    if (el) el.style.display = 'none';
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      var lang = getLang();
      var locale = (lang === 'ar') ? 'ar-SA' : (lang === 'en' ? 'en-US' : 'tr-TR');
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch(e) {
      return isoStr;
    }
  }

  function renderCommentItem(item) {
    var card = document.createElement('div');
    card.className = 'comment-card-item';
    card.style.cssText = 'background: var(--bg-surface, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 10px; padding: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03);';

    var header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;';

    var authorInfo = document.createElement('div');
    authorInfo.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

    var avatar = document.createElement('span');
    avatar.style.cssText = 'width: 28px; height: 28px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;';
    var initial = (item.author_name || item.authorName || 'M').charAt(0).toUpperCase();
    avatar.textContent = initial;

    var name = document.createElement('strong');
    name.style.cssText = 'font-size: 0.88rem; color: var(--text-primary, #0f172a);';
    name.textContent = item.author_name || item.authorName || 'Okuyucu';

    authorInfo.appendChild(avatar);
    authorInfo.appendChild(name);

    var date = document.createElement('span');
    date.style.cssText = 'font-size: 0.75rem; color: var(--text-secondary, #94a3b8);';
    date.textContent = formatDate(item.created_at || item.createdAt);

    header.appendChild(authorInfo);
    header.appendChild(date);

    var body = document.createElement('div');
    body.style.cssText = 'font-size: 0.85rem; color: var(--text-secondary, #334155); line-height: 1.5; white-space: pre-wrap; word-break: break-word;';
    body.textContent = item.content || item.comment_text || '';

    card.appendChild(header);
    card.appendChild(body);

    if (item.reply_content || item.reply) {
      var replyBox = document.createElement('div');
      replyBox.style.cssText = 'margin-top: 0.75rem; padding: 0.75rem; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 6px; font-size: 0.82rem;';
      var replyTitle = document.createElement('div');
      replyTitle.style.cssText = 'font-weight: 700; color: #15803d; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.35rem;';
      replyTitle.innerHTML = '🛡️ <span>MSK Labs Ekibi</span>';
      var replyText = document.createElement('div');
      replyText.style.cssText = 'color: #166534;';
      replyText.textContent = item.reply_content || item.reply;
      replyBox.appendChild(replyTitle);
      replyBox.appendChild(replyText);
      card.appendChild(replyBox);
    }

    return card;
  }

  function getCommentsApiBase() {
    if (window.SITE_CONFIG && window.SITE_CONFIG.apiUrl) {
      return window.SITE_CONFIG.apiUrl;
    }
    return '/api';
  }

  function loadPostComments(post) {
    currentActivePost = post;
    updateCommentsI18n();
    hideAlert();

    var slug = getPostSlug(post);
    var list = document.getElementById('commentsList');
    var empty = document.getElementById('commentsEmpty');
    var loading = document.getElementById('commentsLoading');
    var badge = document.getElementById('commentsCountBadge');

    if (list) list.innerHTML = '';
    if (empty) empty.style.display = 'none';
    if (loading) loading.style.display = 'block';
    if (badge) badge.innerText = '0';

    var apiBase = getCommentsApiBase();
    var apiUrl = apiBase + '/comments?post_slug=' + encodeURIComponent(slug);

    fetch(apiUrl)
      .then(function(res) {
        if (!res.ok) {
          return fetch('/api/comments?post_slug=' + encodeURIComponent(slug));
        }
        return res;
      })
      .then(function(res) {
        if (!res.ok) throw new Error('Yorumlar yüklenemedi: ' + res.status);
        return res.json();
      })
      .then(function(json) {
        if (loading) loading.style.display = 'none';
        var items = json.data || json.comments || [];
        if (badge) badge.innerText = String(items.length);

        if (!items || items.length === 0) {
          if (empty) empty.style.display = 'block';
          return;
        }

        if (list) {
          items.forEach(function(item) {
            list.appendChild(renderCommentItem(item));
          });
        }
      })
      .catch(function(err) {
        console.warn('[COMMENTS LOAD ERROR]', err);
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'block';
      });
  }

  function handleCommentSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAlert();
    var d = getDict();

    var honeypot = document.getElementById('commentHoneypot');
    if (honeypot && honeypot.value) {
      // Honeypot bot trap
      showAlert(d.successMsg, true);
      document.getElementById('commentForm').reset();
      return;
    }

    var authorInp = document.getElementById('commentAuthor');
    var emailInp = document.getElementById('commentEmail');
    var textInp = document.getElementById('commentText');
    var submitBtn = document.getElementById('btnSubmitComment');
    var submitTxt = document.getElementById('btnSubmitCommentText');

    var author = authorInp ? authorInp.value.trim() : '';
    var email = emailInp ? emailInp.value.trim() : '';
    var text = textInp ? textInp.value.trim() : '';

    if (!author || !email || !text) {
      showAlert(d.errorMsg, false);
      return;
    }

    var postSlug = getPostSlug(currentActivePost);
    var postType = (currentActivePost && currentActivePost.type) ? currentActivePost.type : 'bizce';

    if (submitBtn) submitBtn.disabled = true;
    if (submitTxt) submitTxt.innerText = d.submittingBtn;

    var payload = {
      postSlug: postSlug,
      post_slug: postSlug,
      post_type: postType,
      authorName: author,
      author_name: author,
      authorEmail: email,
      author_email: email,
      content: text,
      comment_text: text
    };

    var apiBase = getCommentsApiBase();
    var primaryUrl = apiBase + '/comments';

    fetch(primaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      if (res.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      if (!res.ok) {
        // Fallback endpoint
        return fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(payload)
        });
      }
      return res;
    })
    .then(function(res) {
      if (!res.ok) {
        return res.json().then(function(errJson) {
          throw new Error(errJson.error || errJson.message || 'API_ERROR');
        }).catch(function() {
          throw new Error('API_ERROR');
        });
      }
      return res.json();
    })
    .then(function() {
      showAlert(d.successMsg, true);
      if (textInp) textInp.value = '';
    })
    .catch(function(err) {
      console.error('[COMMENT SUBMIT ERROR]', err);
      if (err.message === 'RATE_LIMIT') {
        showAlert(d.rateLimitMsg, false);
      } else {
        showAlert(d.errorMsg, false);
      }
    })
    .finally(function() {
      if (submitBtn) submitBtn.disabled = false;
      if (submitTxt) submitTxt.innerText = d.submitBtn;
    });
  }

  function resetCommentsUI() {
    currentActivePost = null;
    hideAlert();
    var list = document.getElementById('commentsList');
    if (list) list.innerHTML = '';
    var empty = document.getElementById('commentsEmpty');
    if (empty) empty.style.display = 'none';
    var loading = document.getElementById('commentsLoading');
    if (loading) loading.style.display = 'none';
    var badge = document.getElementById('commentsCountBadge');
    if (badge) badge.innerText = '0';
  }

  // Export to window
  window.loadPostComments = loadPostComments;
  window.handleCommentSubmit = handleCommentSubmit;
  window.resetCommentsUI = resetCommentsUI;
  window.updateCommentsI18n = updateCommentsI18n;

  window.addEventListener('languageChanged', function() {
    updateCommentsI18n();
    if (currentActivePost) {
      loadPostComments(currentActivePost);
    }
  });

})();
