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
    META_CAPI_TOKEN?: string;
    META_GRAPH_VERSION?: string;
    PAYMENT_WEBHOOK_SECRET?: string;
    PAYMENT_GATEWAY?: string;
    MERCADO_PAGO_ACCESS_TOKEN?: string;
    MERCADO_PAGO_PUBLIC_KEY?: string;
    MERCADO_PAGO_WEBHOOK_SECRET?: string;
    BREVO_API_KEY?: string;
    EMAIL_FROM?: string;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    WHATSAPP_GRAPH_VERSION?: string;
    WHATSAPP_AGENT_URL?: string;
    WHATSAPP_AGENT_SECRET?: string;
    AI_PROVIDER?: string;
    AI_API_KEY?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_SESSION_SECRET?: string;
    EBOOK_DOWNLOAD_NAME?: string;
  }
}
