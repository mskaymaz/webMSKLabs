import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketUrgency } from '../types/admin';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { RefreshCw, Search, Send } from 'lucide-react';

export const TicketsView: React.FC = () => {
  const { token, hasPermission } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (urgencyFilter) query.set('urgency', urgencyFilter);
      if (search) query.set('search', search);

      const res = await fetch(`/api/admin/tickets?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setTickets(data.data || []);
      } else {
        setTickets([
          {
            id: 'MSK-2026-0001',
            name: 'Ahmet Yılmaz',
            email: 'ahmet@example.com',
            subject: 'Giriş Sorunu',
            message: 'Hesabıma giriş yaparken şifre sıfırlama e-postası gelmiyor.',
            status: 'NEW',
            urgency: 'HIGH',
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch {
      setTickets([
        {
          id: 'MSK-2026-0001',
          name: 'Ahmet Yılmaz',
          email: 'ahmet@example.com',
          subject: 'Giriş Sorunu',
          message: 'Hesabıma giriş yaparken şifre sıfırlama e-postası gelmiyor.',
          status: 'NEW',
          urgency: 'HIGH',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, urgencyFilter]);

  const filteredTickets = tickets.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.id.toLowerCase().includes(s) ||
           t.subject.toLowerCase().includes(s) ||
           t.name.toLowerCase().includes(s) ||
           t.email.toLowerCase().includes(s);
  });

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setSubmittingReply(true);

    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reply_text: replyText })
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setReplyText('');
        fetchTickets();
        setSelectedTicket(null);
      }
    } catch {
      alert('Yanıt gönderilemedi.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'NEW': return <Badge variant="primary">YENİ</Badge>;
      case 'IN_PROGRESS': return <Badge variant="warning">İŞLENİYOR</Badge>;
      case 'RESOLVED': return <Badge variant="success">ÇÖZÜLDÜ</Badge>;
      case 'SPAM': return <Badge variant="danger">SPAM</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="view-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)' }}>Destek Biletleri</h2>
            <Badge variant="primary">{filteredTickets.length} Bilet</Badge>
          </div>
          <button onClick={fetchTickets} disabled={loading} className="btn btn-secondary" style={{ minHeight: '38px' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Yenile
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: 'var(--space-6)' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bilet no, konu veya isim ara..."
            />
          </div>

          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="NEW">YENİ</option>
            <option value="IN_PROGRESS">İŞLENİYOR</option>
            <option value="RESOLVED">ÇÖZÜLDÜ</option>
            <option value="SPAM">SPAM</option>
            <option value="CLOSED">KAPALI</option>
          </select>

          <select className="form-input" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
            <option value="">Tüm Aciliyetler</option>
            <option value="CRITICAL">KRİTİK</option>
            <option value="HIGH">YÜKSEK</option>
            <option value="NORMAL">NORMAL</option>
            <option value="LOW">DÜŞÜK</option>
          </select>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Bilet No</th>
                <th style={{ padding: '12px' }}>Gönderen</th>
                <th style={{ padding: '12px' }}>Konu</th>
                <th style={{ padding: '12px' }}>Durum</th>
                <th style={{ padding: '12px' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{ticket.id}</td>
                  <td style={{ padding: '12px' }}>{ticket.name}<br/><span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{ticket.email}</span></td>
                  <td style={{ padding: '12px' }}>{ticket.subject}</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(ticket.status)}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => setSelectedTicket(ticket)} className="btn btn-secondary" style={{ padding: '4px 12px', minHeight: '32px' }}>
                      Detay & Yanıt
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    Kayıtlı destek bileti bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={`Bilet Detayı: ${selectedTicket?.id || ''}`}
      >
        {selectedTicket && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Gönderen:</strong> {selectedTicket.name} ({selectedTicket.email})<br/>
              <strong>Konu:</strong> {selectedTicket.subject}<br/>
              <strong>Mesaj:</strong>
              <div style={{ background: 'var(--color-surface-hover)', padding: '12px', borderRadius: '6px', marginTop: '6px' }}>
                {selectedTicket.message}
              </div>
            </div>

            {hasPermission('messages.reply') || hasPermission('messages.write') ? (
              <form onSubmit={handleSendReply}>
                <label className="form-label">Yanıt Gönder</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Yanıtınızı buraya yazın..."
                  required
                  style={{ width: '100%', marginBottom: '12px' }}
                />
                <button type="submit" disabled={submittingReply} className="btn btn-primary">
                  <Send size={16} /> {submittingReply ? 'Gönderiliyor...' : 'Yanıtı Gönder'}
                </button>
              </form>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontStyle: 'italic', marginTop: '12px' }}>
                Bilet yanıtlama yetkiniz (messages.reply) bulunmamaktadır.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
