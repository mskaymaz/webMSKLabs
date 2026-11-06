/**
 * DevAdmin Blog Comments Management Module (UI-002)
 * Handles Comment listing, search, approval, rejection & deletion
 */

(function () {
    'use strict';

    const state = {
        comments: [],
        search: '',
        status: '',
        limit: 10,
        offset: 0,
        total: 0
    };

    window.DevAdminComments = {
        init: function () {
            bindEvents();
        },
        load: function () {
            fetchComments();
        }
    };

    function bindEvents() {
        const searchInput = document.getElementById('comment-search-input');
        const statusSelect = document.getElementById('comment-status-select');
        const refreshBtn = document.getElementById('comment-refresh-btn');

        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', function (e) {
                clearTimeout(timeout);
                timeout = setTimeout(function () {
                    state.search = e.target.value.trim();
                    state.offset = 0;
                    fetchComments();
                }, 300);
            });
        }

        if (statusSelect) {
            statusSelect.addEventListener('change', function (e) {
                state.status = e.target.value;
                state.offset = 0;
                fetchComments();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                fetchComments();
            });
        }
    }

    async function fetchComments() {
        const listContainer = document.getElementById('comments-list-container');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="skeleton" style="height: 120px; margin-bottom: 12px;"></div><div class="skeleton" style="height: 120px;"></div>';

        const token = localStorage.getItem('devadmin_token');
        const params = new URLSearchParams({
            limit: state.limit,
            offset: state.offset,
            q: state.search,
            status: state.status
        });

        try {
            const res = await fetch('/api/admin/comments?' + params.toString(), {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) throw new Error('Yorumlar çekilemedi');

            const data = await res.json();
            state.comments = data.comments || [];
            state.total = data.pagination ? data.pagination.total : state.comments.length;

            renderCommentsList();
        } catch (error) {
            console.error('Comments Fetch Error:', error);
            listContainer.innerHTML = '<div class="alert alert-error">Yorumlar yüklenirken hata oluştu.</div>';
        }
    }

    function renderCommentsList() {
        const listContainer = document.getElementById('comments-list-container');
        const countBadge = document.getElementById('comments-count-badge');

        if (countBadge) {
            countBadge.textContent = state.total + ' Yorum';
        }

        if (state.comments.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 2.5rem; margin-bottom: 8px;">💬</div>
                    <h3>Yorum Bulunamadı</h3>
                    <p>Filtrelere uygun blog yorumu bulunmamaktadır.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="overflow-x: auto;">
                <table style="width:100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--color-border); font-size: var(--font-size-xs); color: var(--color-text-muted);">
                            <th style="padding: 12px;">ID</th>
                            <th style="padding: 12px;">YAZAR</th>
                            <th style="padding: 12px;">BLOG SLUG</th>
                            <th style="padding: 12px;">YORUM METNİ</th>
                            <th style="padding: 12px;">DURUM</th>
                            <th style="padding: 12px; text-align: right;">AKSİYON</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        state.comments.forEach(function (c) {
            const statusBadge = getCommentStatusBadge(c.status);
            const dateStr = new Date(c.created_at).toLocaleString('tr-TR');

            html += `
                <tr style="border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm);">
                    <td style="padding: 12px; font-weight: 700;">#${c.id}</td>
                    <td style="padding: 12px;">
                        <div><strong>${escapeHtml(c.author_name)}</strong></div>
                        <div style="font-size: 11px; color: var(--color-text-muted);">${escapeHtml(c.author_email)}</div>
                    </td>
                    <td style="padding: 12px; font-size: 12px; font-family: monospace;">${escapeHtml(c.post_slug)}</td>
                    <td style="padding: 12px; max-width: 250px;">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.comment_text)}</div>
                        <div style="font-size: 10px; color: var(--color-text-muted);">${dateStr}</div>
                    </td>
                    <td style="padding: 12px;">${statusBadge}</td>
                    <td style="padding: 12px; text-align: right; min-width: 180px;">
                        <button class="btn btn-primary btn-approve-comment" data-id="${c.id}" style="min-height:32px; padding:0 8px; font-size:12px;">Onayla</button>
                        <button class="btn btn-secondary btn-reject-comment" data-id="${c.id}" style="min-height:32px; padding:0 8px; font-size:12px;">Reddet</button>
                        <button class="btn btn-danger btn-delete-comment" data-id="${c.id}" style="min-height:32px; padding:0 8px; font-size:12px;">Sil</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        listContainer.innerHTML = html;

        // Attach Action Buttons
        listContainer.querySelectorAll('.btn-approve-comment').forEach(function (btn) {
            btn.addEventListener('click', function () {
                handleCommentAction(btn.getAttribute('data-id'), 'approve');
            });
        });

        listContainer.querySelectorAll('.btn-reject-comment').forEach(function (btn) {
            btn.addEventListener('click', function () {
                handleCommentAction(btn.getAttribute('data-id'), 'reject');
            });
        });

        listContainer.querySelectorAll('.btn-delete-comment').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
                    handleCommentAction(btn.getAttribute('data-id'), 'delete');
                }
            });
        });
    }

    async function handleCommentAction(commentId, action) {
        const token = localStorage.getItem('devadmin_token');

        try {
            const res = await fetch('/api/admin/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ action: action, id: commentId })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                alert(data.message || 'İşlem başarılı.');
                fetchComments();
            } else {
                alert(data.message || 'İşlem gerçekleştirilemedi.');
            }
        } catch (err) {
            alert('Sunucu iletişim hatası.');
        }
    }

    function getCommentStatusBadge(status) {
        switch (status) {
            case 'APPROVED': return '<span class="badge badge-success">ONAYLANDI</span>';
            case 'PENDING': return '<span class="badge badge-warning">BEKLİYOR</span>';
            case 'REJECTED': return '<span class="badge badge-danger">REDDEDİLDİ</span>';
            default: return '<span class="badge">' + status + '</span>';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
