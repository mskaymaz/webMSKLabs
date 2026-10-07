/**
 * ARCH-001: Cloudflare Workers Global Environment Contract
 */
export interface Env {
  // Cloudflare D1 Database Binding
  DB: D1Database;

  // Cloudflare R2 Media Bucket Binding
  MEDIA: R2Bucket;

  // Environment Secret Bindings
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_PUBLIC_KEY?: string;

  // Environment Configuration Vars
  ENVIRONMENT?: 'development' | 'staging' | 'production';
  ALLOWED_ORIGINS?: string;
  TURNSTILE_SECRET_KEY?: string;
}
