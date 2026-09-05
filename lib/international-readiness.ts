import { env } from "cloudflare:workers";

export type InternationalReadiness = {
  stripe: boolean;
  webhook: boolean;
  email: boolean;
  astrology: boolean;
  ready: boolean;
};

export function internationalReadiness(): InternationalReadiness {
  const values = env as unknown as Record<string, unknown>;
  const stripe = Boolean(values.STRIPE_SECRET_KEY);
  const webhook = Boolean(values.STRIPE_WEBHOOK_SECRET);
  const email = Boolean(values.BREVO_API_KEY && values.EMAIL_FROM);
  const astrology = Boolean(values.ASTROLOGY_API_KEY);
  return { stripe, webhook, email, astrology, ready: stripe && webhook && email && astrology };
}
