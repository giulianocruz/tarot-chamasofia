declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BOOKS: R2Bucket;
    APP_URL?: string;
    PIX_KEY?: string;
    PIX_RECEIVER_NAME?: string;
    PIX_RECEIVER_CITY?: string;
    WHATSAPP_NUMBER?: string;
    META_PIXEL_ID?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_SESSION_SECRET?: string;
    EBOOK_DOWNLOAD_NAME?: string;
  }
}
