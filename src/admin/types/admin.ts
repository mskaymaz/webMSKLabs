export type ViewType = 'dashboard' | 'tickets' | 'comments' | 'cms' | 'settings';

export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM' | 'CLOSED';
export type TicketUrgency = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface TicketReply {
  id: number;
  message_id: string;
  sender_type: 'ADMIN' | 'USER';
  reply_text: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: TicketStatus;
  urgency: TicketUrgency;
  category?: string;
  ai_summary?: string;
  ai_draft?: string;
  created_at: string;
  updated_at?: string;
  replies?: TicketReply[];
}

export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CommentItem {
  id: number | string;
  post_slug: string;
  author_name: string;
  author_email: string;
  comment_text: string;
  status: CommentStatus;
  created_at: string;
}

export interface AdminUser {
  username: string;
  role: string;
  token?: string;
}
