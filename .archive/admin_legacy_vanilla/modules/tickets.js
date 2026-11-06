/**
 * DevAdmin Support Tickets Management Module (UI-002)
 * Handles Ticket listing, search, filtering, detail modal, status updates & admin replies
 */

(function () {
    'use strict';

    const state = {
        tickets: [],
        currentTicket: null,
        search: '',
        status: '',
        urgency: '',
        limit: 10,
        offset: 0,
        total: 0
    };

    window.DevAdminTickets = {
        init: function () {
            bindEvents();
        },
        load: function () {
            fetchTickets();
        }
    };

    function bindEvents() {
        const searchInput = document.getElementById('ticket-search-input');
        const statusSelect = document.getElementById('ticket-status-select');
        const urgencySelect = document.getElementById('ticket-urgency-select');
        const refreshBtn = document.getElementById('ticket-refresh-btn');
        const replyForm = document.getElementById('ticket-reply-form');
        const statusUpdateBtn = document.getElementById('ticket-status-update-btn');

        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', function (e) {
                clearTimeout(timeout);
                timeout = setTimeout(function () {
                    state.search = e.target.value.trim();
                    state.offset = 0;
                    fetchTickets();
                }, 300);
            });
        }

        if (statusSelect) {
            statusSelect.addEventListener('change', function (e) {
                state.status = e.target.value;
                state.offset = 0;
                fetchTickets();
            });
        }

        if (urgencySelect) {
            urgencySelect.addEventListener('change', function (e) {
                state.urgency = e.target.value;
                state.offset = 0;
                fetchTickets();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                fetchTickets();
            });
        }

        if (replyForm) {
            replyForm.addEventListener('submit', handleReplySubmit);
        }

        if (statusUpdateBtn) {
            statusUpdateBtn.addEventListener('click', handleStatusUpdate);
        }

        const modalCloseBtn = document.getElementById('ticket-modal-close-btn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeTicketModal);
        }
    }

    async function fetchTickets() {
        const listContainer = document.getElementById('tickets-list-container');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="skeleton" style="height: 120px; margin-bottom: 12px;"></div><div class="skeleton" style="height: 120px;"></div>';

        const token = localStorage.getItem('devadmin_token');
        const params = new URLSearchParams({
            limit: state.limit,
            offset: state.offset,
            q: state.search,
            status: state.status,
            urgency: state.urgency
        });

        try {
            const res = await fetch('/api/admin/messages?' + params.toString(), {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) {
                throw new Error('Biletler çekilemedi');
            }

            const data = await res.json();
            state.tickets = data.tickets || [];
            state.total = data.pagination ? data.pagination.total : state.tickets.length;

            renderTicketsList();
        } catch (error) {
            console.error('Tickets Fetch Error:', error);
            listContainer.innerHTML = '<div class="alert alert-error">Biletler yüklenirken hata oluştu. Lütfen tekrar deneyin.</div>';
        }
    }

    function renderTicketsList() {
        const listContainer = document.getElementById('tickets-list-container');
        const countBadge = document.getElementById('tickets-count-badge');

        if (countBadge) {
            countBadge.textContent = state.total + ' Bilet';
        }

        if (state.tickets.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 2.5rem; margin-bottom: 8px;">🎫</div>
                    <h3>Bilet Bulunamadı</h3>
                    <p>Kriterlere uygun destek bileti bulunmamaktadır.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="overflow-x: auto;">
                <table style="width:100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--color-border); font-size: var(--font-size-xs); color: var(--color-text-muted);">
                            <th style="padding: 12px;">BİLET NO</th>
                            <th style="padding: 12px;">KULLANICI</th>
                            <th style="padding: 12px;">KONU</th>
                            <th style="padding: 12px;">DURUM</th>
                            <th style="padding: 12px;">ACİLİYET</th>
                            <th style="padding: 12px;">TARİH</th>
                            <th style="padding: 12px; text-align: right;">İŞLEM</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        state.tickets.forEach(function (t) {
            const statusBadge = getStatusBadge(t.status);
            const urgencyBadge = getUrgencyBadge(t.urgency);
            const dateStr = new Date(t.created_at).toLocaleString('tr-TR');

            html += `
                <tr style="border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm);">
                    <td style="padding: 12px; font-weight: 700; color: var(--color-primary);">${t.id}</td>
                    <td style="padding: 12px;">
                        <div><strong>${escapeHtml(t.name)}</strong></div>
                        <div style="font-size: 11px; color: var(--color-text-muted);">${escapeHtml(t.email)}</div>
                    </td>
                    <td style="padding: 12px; font-weight: 500;">${escapeHtml(t.subject)}</td>
                    <td style="padding: 12px;">${statusBadge}</td>
                    <td style="padding: 12px;">${urgencyBadge}</td>
                    <td style="padding: 12px; font-size: 11px; color: var(--color-text-muted);">${dateStr}</td>
                    <td style="padding: 12px; text-align: right;">
                        <button class="btn btn-secondary btn-view-ticket" data-id="${t.id}" style="min-height:36px; padding:0 12px;">İncele</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        listContainer.innerHTML = html;

        // Attach İncele button handlers
        const viewBtns = listContainer.querySelectorAll('.btn-view-ticket');
        viewBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.getAttribute('data-id');
                openTicketDetail(id);
            });
        });
    }

    async function openTicketDetail(id) {
        const modal = document.getElementById('ticket-detail-modal');
        const modalBody = document.getElementById('ticket-modal-body');
        if (!modal || !modalBody) return;

        modal.style.display = 'flex';
        modalBody.innerHTML = '<div class="skeleton" style="height: 200px;"></div>';

        const token = localStorage.getItem('devadmin_token');

        try {
            const res = await fetch('/api/admin/messages?id=' + encodeURIComponent(id), {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!res.ok) throw new Error('Detay çekilemedi');

            const data = await res.json();
            state.currentTicket = data.ticket;

            renderTicketModalContent(data);
        } catch (error) {
            modalBody.innerHTML = '<div class="alert alert-error">Bilet detayları yüklenirken hata oluştu.</div>';
        }
    }

    function renderTicketModalContent(data) {
        const modalBody = document.getElementById('ticket-modal-body');
        const t = data.ticket;
        const replies = data.replies || [];
        const events = data.events || [];

        let repliesHtml = '';
        if (replies.length > 0) {
            repliesHtml = '<div style="margin-top: 16px; font-weight:700;">Önceki Yanıtlar:</div>';
            replies.forEach(function (r) {
                repliesHtml += `
                    <div style="background: var(--color-bg); padding: 12px; border-radius: 8px; margin-top: 8px; border-left: 4px solid var(--color-primary);">
                        <div style="font-size: 11px; color: var(--color-text-muted); margin-bottom: 4px;">Yanıtlayan: ${r.sender_type} - ${new Date(r.created_at).toLocaleString('tr-TR')}</div>
                        <div>${escapeHtml(r.reply_text)}</div>
                    </div>
                `;
            });
        }

        modalBody.innerHTML = `
            <div style="margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="font-size: var(--font-size-lg); color: var(--color-primary);">${t.id} - ${escapeHtml(t.subject)}</h2>
                    <div>${getStatusBadge(t.status)}</div>
                </div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">
                    Gönderen: <strong>${escapeHtml(t.name)}</strong> (${escapeHtml(t.email)}) | Kategori: ${t.category || 'GENEL'}
                </div>
            </div>

            <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--color-text-muted); margin-bottom: 4px;">MESAJ İÇERİĞİ:</div>
                <div style="white-space: pre-wrap;">${escapeHtml(t.message)}</div>
            </div>

            ${repliesHtml}

            <div style="margin-top: 20px; border-top: 1px solid var(--color-border); padding-top: 16px;">
                <label style="font-size: 12px; font-weight: 700; display:block; margin-bottom: 6px;">Durum Güncelle:</label>
                <div style="display:flex; gap: 8px; margin-bottom: 16px;">
                    <select id="modal-status-select" class="form-select" style="min-height:38px;">
                        <option value="NEW" ${t.status === 'NEW' ? 'selected' : ''}>YENİ (NEW)</option>
                        <option value="IN_PROGRESS" ${t.status === 'IN_PROGRESS' ? 'selected' : ''}>İŞLENİYOR (IN_PROGRESS)</option>
                        <option value="RESOLVED" ${t.status === 'RESOLVED' ? 'selected' : ''}>ÇÖZÜLDÜ (RESOLVED)</option>
                        <option value="SPAM" ${t.status === 'SPAM' ? 'selected' : ''}>SPAM</option>
                        <option value="CLOSED" ${t.status === 'CLOSED' ? 'selected' : ''}>KAPALI (CLOSED)</option>
                    </select>
                    <button id="ticket-status-update-btn" class="btn btn-secondary" style="min-height:38px;">Güncelle</button>
                </div>

                <form id="ticket-reply-form">
                    <label style="font-size: 12px; font-weight: 700; display:block; margin-bottom: 6px;">Yanıt Gönder:</label>
                    <textarea id="modal-reply-text" class="form-input" style="min-height: 80px; padding: 8px; margin-bottom: 8px;" placeholder="Yönetici yanıtını buraya yazın..." required></textarea>
                    <button type="submit" class="btn btn-primary" style="min-height:40px;">Yanıtı Kaydet & Gönder</button>
                </form>
            </div>
        `;

        // Re-bind modal inner buttons
        document.getElementById('ticket-status-update-btn').addEventListener('click', handleStatusUpdate);
        document.getElementById('ticket-reply-form').addEventListener('submit', handleReplySubmit);
    }

    async function handleStatusUpdate() {
        const select = document.getElementById('modal-status-select');
        if (!select || !state.currentTicket) return;

        const newStatus = select.value;
        const token = localStorage.getItem('devadmin_token');

        try {
            const res = await fetch('/api/admin/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    action: 'update_status',
                    id: state.currentTicket.id,
                    status: newStatus
                })
            });

            if (res.ok) {
                alert('Bilet durumu güncellendi.');
                fetchTickets();
                openTicketDetail(state.currentTicket.id);
            }
        } catch (err) {
            alert('Durum güncelleme hatası.');
        }
    }

    async function handleReplySubmit(e) {
        e.preventDefault();
        const replyText = document.getElementById('modal-reply-text').value.trim();
        if (!replyText || !state.currentTicket) return;

        const token = localStorage.getItem('devadmin_token');

        try {
            const res = await fetch('/api/admin/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    action: 'reply',
                    id: state.currentTicket.id,
                    reply_text: replyText,
                    status: 'RESOLVED'
                })
            });

            if (res.ok) {
                alert('Yanıt kaydedildi ve gönderildi.');
                fetchTickets();
                openTicketDetail(state.currentTicket.id);
            }
        } catch (err) {
            alert('Yanıt gönderilirken hata oluştu.');
        }
    }

    function closeTicketModal() {
        const modal = document.getElementById('ticket-detail-modal');
        if (modal) modal.style.display = 'none';
        state.currentTicket = null;
    }

    function getStatusBadge(status) {
        switch (status) {
            case 'NEW': return '<span class="badge badge-danger">YENİ</span>';
            case 'IN_PROGRESS': return '<span class="badge badge-warning">İŞLENİYOR</span>';
            case 'RESOLVED': return '<span class="badge badge-success">ÇÖZÜLDÜ</span>';
            case 'SPAM': return '<span class="badge badge-danger">SPAM</span>';
            case 'CLOSED': return '<span class="badge badge-neutral">KAPALI</span>';
            default: return '<span class="badge">' + status + '</span>';
        }
    }

    function getUrgencyBadge(urgency) {
        switch (urgency) {
            case 'CRITICAL': return '<span class="badge badge-danger">KRİTİK</span>';
            case 'HIGH': return '<span class="badge badge-warning">YÜKSEK</span>';
            case 'NORMAL': return '<span class="badge badge-primary">NORMAL</span>';
            case 'LOW': return '<span class="badge badge-neutral">DÜŞÜK</span>';
            default: return '<span class="badge">' + urgency + '</span>';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
