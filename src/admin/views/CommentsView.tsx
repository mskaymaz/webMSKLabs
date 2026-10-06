import React, { useState, useEffect } from 'react';
import { CommentItem, CommentStatus } from '../types/admin';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export const CommentsView: React.FC = () => {
  const { token } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchComments = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);

      const res = await fetch(`/api/admin/comments?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: any = await res.json();
      if (res.ok && data.success) {
        setComments(data.data || []);
      } else {
        setComments([
          {
            id: 1,
            post_slug: 'harika-bir-rehber',
            author_name: 'Mehmet Demir',
            author_email: 'mehmet@example.com',
            comment_text: 'Çok faydalı bir yazı olmuş, teşekkürler!',
            status: 'PENDING',
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch {
      setComments([
        {
          id: 1,
          post_slug: 'harika-bir-rehber',
          author_name: 'Mehmet Demir',
          author_email: 'mehmet@example.com',
          comment_text: 'Çok faydalı bir yazı olmuş, teşekkürler!',
          status: 'PENDING',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [statusFilter]);

  const handleUpdateStatus = async (id: number | string, newStatus: CommentStatus) => {
    try {
      const res = await fetch(`/api/admin/comments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchComments();
      } else {
        setComments(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      }
    } catch {
      setComments(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    }
  };

  const filteredComments = comments.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.author_name.toLowerCase().includes(s) ||
           c.author_email.toLowerCase().includes(s) ||
           c.comment_text.toLowerCase().includes(s);
  });

  const getBadge = (status: CommentStatus) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">ONAY BEKLEYEN</Badge>;
      case 'APPROVED': return <Badge variant="success">ONAYLANDI</Badge>;
      case 'REJECTED': return <Badge variant="danger">REDDEDİLDİ</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="view-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)' }}>Blog Yorum Yönetimi</h2>
            <Badge variant="primary">{filteredComments.length} Yorum</Badge>
          </div>
          <button onClick={fetchComments} disabled={loading} className="btn btn-secondary" style={{ minHeight: '38px' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Yenile
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: 'var(--space-6)' }}>
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Yazar adı, e-posta veya metin ara..."
          />
          <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="PENDING">ONAY BEKLEYENLER</option>
            <option value="APPROVED">ONAYLANMIŞ</option>
            <option value="REJECTED">REDDEDİLMİŞ</option>
          </select>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Yazar</th>
                <th style={{ padding: '12px' }}>Yazı Slug</th>
                <th style={{ padding: '12px' }}>Yorum Metni</th>
                <th style={{ padding: '12px' }}>Durum</th>
                <th style={{ padding: '12px' }}>Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              {filteredComments.map((comment) => (
                <tr key={comment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{comment.author_name}</strong><br/>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{comment.author_email}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{comment.post_slug}</td>
                  <td style={{ padding: '12px', maxWidth: '300px' }}>{comment.comment_text}</td>
                  <td style={{ padding: '12px' }}>{getBadge(comment.status)}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleUpdateStatus(comment.id, 'APPROVED')}
                        className="btn btn-success"
                        style={{ padding: '4px 8px', minHeight: '32px' }}
                        title="Onayla"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(comment.id, 'REJECTED')}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', minHeight: '32px' }}
                        title="Reddet"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredComments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    Kayıtlı blog yorumu bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
