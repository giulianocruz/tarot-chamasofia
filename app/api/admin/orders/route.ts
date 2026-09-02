import { isAdmin } from "@/lib/admin";
import {
  addAdminAudit,
  ensureSchema,
  getCurrentPrice,
  getD1,
} from "@/lib/database";
import { completePayment } from "@/lib/payment";
import { cleanText, sameOrigin } from "@/lib/security";
import { env } from "cloudflare:workers";
import { BOOK_CATALOG } from "@/lib/book-catalog";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await isAdmin(request)))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  await ensureSchema();

  const nonTestEvent = `COALESCE(LOWER(CAST(json_extract(metadata_json,'$.is_test') AS TEXT)),'0') NOT IN ('1','true','yes','sim')`;
  const actor = `COALESCE(NULLIF(json_extract(metadata_json,'$.session_id'),''),NULLIF(anonymous_id,''),'event:'||id)`;
  const paidOrder = `(COALESCE(fbclid,'')<>'' OR LOWER(COALESCE(utm_source,'')) IN ('meta','facebook','instagram','fb','ig','an','audience_network','messenger','msg','threads','google','youtube','tiktok','bing') OR LOWER(COALESCE(utm_medium,'')) LIKE '%paid%' OR LOWER(COALESCE(utm_medium,'')) LIKE '%cpc%' OR LOWER(COALESCE(utm_medium,'')) LIKE '%ppc%' OR LOWER(COALESCE(utm_medium,'')) LIKE '%display%')`;
  const paidEvent = `(COALESCE(json_extract(metadata_json,'$.fbclid'),'')<>'' OR LOWER(COALESCE(json_extract(metadata_json,'$.utm_source'),'')) IN ('meta','facebook','instagram','fb','ig','an','audience_network','messenger','msg','threads','google','youtube','tiktok','bing') OR LOWER(COALESCE(json_extract(metadata_json,'$.utm_medium'),'')) LIKE '%paid%' OR LOWER(COALESCE(json_extract(metadata_json,'$.utm_medium'),'')) LIKE '%cpc%' OR LOWER(COALESCE(json_extract(metadata_json,'$.utm_medium'),'')) LIKE '%ppc%' OR LOWER(COALESCE(json_extract(metadata_json,'$.utm_medium'),'')) LIKE '%display%')`;

  const [ordersResult, totals, today, events, funnel, paidFunnel, paidTraffic, campaignEventRows, ebookProductRows, campaignOrderRows, pricing, bookInventory] = await Promise.all([
    getD1()
      .prepare(
        "SELECT id,order_number,public_token,customer_name,customer_email,customer_whatsapp,category,question,price,payment_status,reading_status,cards_json,created_at,paid_at,utm_source,utm_medium,utm_campaign,notification_status,notification_error,gateway_name,is_test,offer_code,product_slug,delivery_channel FROM orders ORDER BY id DESC LIMIT 100",
      )
      .all(),
    getD1()
      .prepare(
        `SELECT COUNT(*) AS total,
          SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) AS sales,
          SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN price ELSE 0 END) AS revenue,
          SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN reading_status IN ('reading_generated','delivered') AND COALESCE(offer_code,'')<>'ebook' THEN 1 ELSE 0 END) AS generated,
          SUM(CASE WHEN offer_code='ebook' AND (payment_status='paid' OR reading_status='delivered') THEN 1 ELSE 0 END) AS ebook_sales,
          SUM(CASE WHEN offer_code='ebook' AND (payment_status='paid' OR reading_status='delivered') THEN price ELSE 0 END) AS ebook_revenue,
          SUM(CASE WHEN offer_code='astro-tarot' AND (payment_status='paid' OR reading_status IN ('reading_generated','delivered')) THEN 1 ELSE 0 END) AS astro_sales,
          SUM(CASE WHEN offer_code='astro-tarot' AND (payment_status='paid' OR reading_status IN ('reading_generated','delivered')) THEN price ELSE 0 END) AS astro_revenue,
          SUM(CASE WHEN delivery_channel='email' THEN 1 ELSE 0 END) AS delivery_email,
          SUM(CASE WHEN delivery_channel='whatsapp' THEN 1 ELSE 0 END) AS delivery_whatsapp,
          SUM(CASE WHEN (payment_status='paid' OR reading_status IN ('reading_generated','delivered')) AND ${paidOrder} THEN 1 ELSE 0 END) AS paid_sales,
          SUM(CASE WHEN (payment_status='paid' OR reading_status IN ('reading_generated','delivered')) AND ${paidOrder} THEN price ELSE 0 END) AS paid_revenue
         FROM orders WHERE COALESCE(is_test,0)=0`,
      )
      .first<Record<string, number>>(),
    getD1()
      .prepare(
        "SELECT COUNT(*) AS sales FROM orders WHERE COALESCE(is_test,0)=0 AND (payment_status='paid' OR reading_status IN ('reading_generated','delivered')) AND date(paid_at)=date('now')",
      )
      .first<{ sales: number }>(),
    getD1()
      .prepare(
        `SELECT event_name,COUNT(DISTINCT ${actor}) AS count FROM analytics_events WHERE ${nonTestEvent} GROUP BY event_name`,
      )
      .all<{ event_name: string; count: number }>(),
    getD1()
      .prepare(
        `WITH journey AS (
          SELECT ${actor} AS actor,
            MAX(CASE
              WHEN event_name='pix_generated' THEN 9
              WHEN event_name='checkout_started' THEN 8
              WHEN event_name='contact_captured' THEN 7
              WHEN event_name IN ('offer_view','offer_viewed') THEN 6
              WHEN event_name='reading_preview' THEN 5
              WHEN event_name='cards_selected' THEN 4
              WHEN event_name IN ('question_completed','question_written') THEN 3
              WHEN event_name='category_selected' THEN 2
              WHEN event_name IN ('landing_view','onboarding_started','tarot_started') THEN 1
              ELSE 0
            END) AS max_stage
          FROM analytics_events WHERE ${nonTestEvent}
          GROUP BY ${actor}
        )
        SELECT COUNT(*) AS sessions, COUNT(*) AS started,
          SUM(CASE WHEN max_stage>=2 THEN 1 ELSE 0 END) AS categories,
          SUM(CASE WHEN max_stage>=3 THEN 1 ELSE 0 END) AS questions,
          SUM(CASE WHEN max_stage>=4 THEN 1 ELSE 0 END) AS cards,
          SUM(CASE WHEN max_stage>=5 THEN 1 ELSE 0 END) AS previews,
          SUM(CASE WHEN max_stage>=6 THEN 1 ELSE 0 END) AS offers,
          SUM(CASE WHEN max_stage>=7 THEN 1 ELSE 0 END) AS contacts,
          SUM(CASE WHEN max_stage>=8 THEN 1 ELSE 0 END) AS checkouts,
          SUM(CASE WHEN max_stage>=9 THEN 1 ELSE 0 END) AS pix
        FROM journey WHERE max_stage>0`,
      )
      .first<Record<string, number>>(),
    getD1()
      .prepare(
        `WITH journey AS (
          SELECT ${actor} AS actor,
            MAX(CASE
              WHEN event_name='pix_generated' THEN 9
              WHEN event_name='checkout_started' THEN 8
              WHEN event_name='contact_captured' THEN 7
              WHEN event_name IN ('offer_view','offer_viewed') THEN 6
              WHEN event_name='reading_preview' THEN 5
              WHEN event_name='cards_selected' THEN 4
              WHEN event_name IN ('question_completed','question_written') THEN 3
              WHEN event_name='category_selected' THEN 2
              WHEN event_name IN ('landing_view','onboarding_started','tarot_started') THEN 1
              ELSE 0
            END) AS max_stage
          FROM analytics_events WHERE ${nonTestEvent} AND ${paidEvent}
          GROUP BY ${actor}
        )
        SELECT COUNT(*) AS sessions, COUNT(*) AS started,
          SUM(CASE WHEN max_stage>=2 THEN 1 ELSE 0 END) AS categories,
          SUM(CASE WHEN max_stage>=3 THEN 1 ELSE 0 END) AS questions,
          SUM(CASE WHEN max_stage>=4 THEN 1 ELSE 0 END) AS cards,
          SUM(CASE WHEN max_stage>=5 THEN 1 ELSE 0 END) AS previews,
          SUM(CASE WHEN max_stage>=6 THEN 1 ELSE 0 END) AS offers,
          SUM(CASE WHEN max_stage>=7 THEN 1 ELSE 0 END) AS contacts,
          SUM(CASE WHEN max_stage>=8 THEN 1 ELSE 0 END) AS checkouts,
          SUM(CASE WHEN max_stage>=9 THEN 1 ELSE 0 END) AS pix
        FROM journey WHERE max_stage>0`,
      )
      .first<Record<string, number>>(),
    getD1()
      .prepare(
        `SELECT COUNT(DISTINCT ${actor}) AS sessions FROM analytics_events WHERE ${nonTestEvent} AND event_name IN ('landing_view','onboarding_started') AND ${paidEvent}`,
      )
      .first<{ sessions: number }>(),
    getD1()
      .prepare(
        `SELECT
          LOWER(COALESCE(NULLIF(json_extract(metadata_json,'$.utm_source'),''),CASE WHEN COALESCE(json_extract(metadata_json,'$.fbclid'),'')<>'' THEN 'meta' ELSE 'pago' END)) AS source,
          COALESCE(NULLIF(json_extract(metadata_json,'$.utm_campaign'),''),'sem campanha') AS campaign,
          COUNT(DISTINCT CASE WHEN event_name IN ('landing_view','onboarding_started') THEN ${actor} END) AS sessions,
          COUNT(DISTINCT CASE WHEN event_name IN ('offer_view','offer_viewed') THEN ${actor} END) AS offers,
          COUNT(DISTINCT CASE WHEN event_name='pix_generated' THEN ${actor} END) AS pix
         FROM analytics_events
         WHERE ${nonTestEvent} AND ${paidEvent}
         GROUP BY source,campaign ORDER BY sessions DESC LIMIT 20`,
      )
      .all<Record<string, unknown>>(),
    getD1()
      .prepare(
        `SELECT product_slug,
          SUM(CASE WHEN payment_status='paid' OR reading_status='delivered' THEN 1 ELSE 0 END) AS sales,
          SUM(CASE WHEN payment_status='paid' OR reading_status='delivered' THEN price ELSE 0 END) AS revenue
         FROM orders
         WHERE COALESCE(is_test,0)=0 AND offer_code='ebook'
         GROUP BY product_slug ORDER BY revenue DESC`,
      )
      .all<Record<string, unknown>>(),
    getD1()
      .prepare(
        `SELECT
          LOWER(COALESCE(NULLIF(utm_source,''),CASE WHEN COALESCE(fbclid,'')<>'' THEN 'meta' ELSE 'pago' END)) AS source,
          COALESCE(NULLIF(utm_campaign,''),'sem campanha') AS campaign,
          SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN 1 ELSE 0 END) AS sales,
          SUM(CASE WHEN payment_status='paid' OR reading_status IN ('reading_generated','delivered') THEN price ELSE 0 END) AS revenue
         FROM orders WHERE COALESCE(is_test,0)=0 AND ${paidOrder}
         GROUP BY source,campaign ORDER BY sales DESC LIMIT 20`,
      )
      .all<Record<string, unknown>>(),
    getCurrentPrice(),
    Promise.all(BOOK_CATALOG.map(async (book)=>({slug:book.slug,available:Boolean(await env.BOOKS.head(book.r2Key))}))),
  ]);

  const totalSales = Number(totals?.sales || 0);
  const revenue = Number(totals?.revenue || 0);
  const paidSales = Number(totals?.paid_sales || 0);
  const paidRevenue = Number(totals?.paid_revenue || 0);
  const paidSessions = Number(paidTraffic?.sessions || 0);
  const sessions = Number(funnel?.sessions || 0);
  const eventCounts = Object.fromEntries(events.results.map((item) => [item.event_name, Number(item.count)]));
  const campaignMap = new Map<string, { source:string; campaign:string; sessions:number; offers:number; pix:number; sales:number; revenue:number }>();
  for (const raw of campaignEventRows.results) {
    const source = String(raw.source || "pago");
    const campaign = String(raw.campaign || "sem campanha");
    campaignMap.set(`${source}::${campaign}`, {
      source, campaign, sessions:Number(raw.sessions || 0), offers:Number(raw.offers || 0),
      pix:Number(raw.pix || 0), sales:0, revenue:0,
    });
  }
  for (const raw of campaignOrderRows.results) {
    const source = String(raw.source || "pago");
    const campaign = String(raw.campaign || "sem campanha");
    const key = `${source}::${campaign}`;
    const row = campaignMap.get(key) || { source, campaign, sessions:0, offers:0, pix:0, sales:0, revenue:0 };
    row.sales = Number(raw.sales || 0);
    row.revenue = Number(raw.revenue || 0);
    campaignMap.set(key, row);
  }
  const campaigns = Array.from(campaignMap.values())
    .map((row) => ({ ...row, conversion: row.sessions ? row.sales / row.sessions : 0 }))
    .sort((a, b) => b.revenue - a.revenue || b.sessions - a.sessions)
    .slice(0, 20);
  const ebookProducts = ebookProductRows.results.map((row) => ({
    slug: String(row.product_slug || "sem-produto"),
    sales: Number(row.sales || 0),
    revenue: Number(row.revenue || 0),
  }));

  return Response.json(
    {
      orders: ordersResult.results,
      bookInventory,
      dashboard: {
        salesToday: Number(today?.sales || 0),
        totalSales,
        revenue,
        averageTicket: totalSales ? Math.round(revenue / totalSales) : 0,
        pending: Number(totals?.pending || 0),
        generated: Number(totals?.generated || 0),
        astro: { sales: Number(totals?.astro_sales || 0), revenue: Number(totals?.astro_revenue || 0), profiles: Number(eventCounts.astrology_profile_completed || 0) },
        ebooks: { sales: Number(totals?.ebook_sales || 0), revenue: Number(totals?.ebook_revenue || 0), libraryViews: Number(eventCounts.library_view || 0), offerViews: Number(eventCounts.ebook_offer_viewed || 0), selected: Number(eventCounts.ebook_selected || 0), checkoutStarted: Number(eventCounts.ebook_checkout_started || 0), purchases: Number(eventCounts.ebook_purchase || 0), products: ebookProducts },
        delivery: { email: Number(totals?.delivery_email || 0), whatsapp: Number(totals?.delivery_whatsapp || 0) },
        conversion: sessions ? totalSales / sessions : 0,
        pricing,
        traffic: {
          paidSessions,
          paidSales,
          paidRevenue,
          paidConversion: paidSessions ? paidSales / paidSessions : 0,
        },
        campaigns,
        funnel: {
          sessions,
          started: Number(funnel?.started || 0),
          categories: Number(funnel?.categories || 0),
          questions: Number(funnel?.questions || 0),
          cards: Number(funnel?.cards || 0),
          previews: Number(funnel?.previews || 0),
          offers: Number(funnel?.offers || 0),
          contacts: Number(funnel?.contacts || 0),
          checkouts: Number(funnel?.checkouts || 0),
          pix: Number(funnel?.pix || 0),
          paid: Number(totals?.astro_sales || 0),
        },
        paidFunnel: {
          sessions: Number(paidFunnel?.sessions || 0),
          started: Number(paidFunnel?.started || 0),
          categories: Number(paidFunnel?.categories || 0),
          questions: Number(paidFunnel?.questions || 0),
          cards: Number(paidFunnel?.cards || 0),
          previews: Number(paidFunnel?.previews || 0),
          offers: Number(paidFunnel?.offers || 0),
          contacts: Number(paidFunnel?.contacts || 0),
          checkouts: Number(paidFunnel?.checkouts || 0),
          pix: Number(paidFunnel?.pix || 0),
          paid: paidSales,
        },
        behavior: {
          depth25: Number(eventCounts.scroll_depth_25 || 0), depth50: Number(eventCounts.scroll_depth_50 || 0),
          depth75: Number(eventCounts.scroll_depth_75 || 0), depth90: Number(eventCounts.scroll_depth_90 || 0),
          faqOpened: Number(eventCounts.faq_open || 0), contactClicks: Number(eventCounts.contact_click || 0),
          exits: Number(eventCounts.page_exit || 0), step2: Number(eventCounts.category_selected || eventCounts.form_step_view || 0),
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await isAdmin(request)))
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const orderNumber = cleanText(body.orderNumber, 40);
  const action = cleanText(body.action, 30);
  await ensureSchema();
  const order = await getD1()
    .prepare("SELECT * FROM orders WHERE order_number=?")
    .bind(orderNumber)
    .first<Record<string, unknown>>();
  if (!order)
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  const now = new Date().toISOString();
  if (action === "mark_paid") {
    if (order.payment_status !== "pending")
      return Response.json({ error: "Transição inválida." }, { status: 409 });
    const completed = await completePayment(orderNumber, undefined, "manual");
    if (!completed.ok)
      return Response.json(
        { error: completed.error },
        { status: completed.status },
      );
    await addAdminAudit("mark_paid", Number(order.id));
  } else if (action === "regenerate") {
    const completed = await completePayment(
      orderNumber,
      undefined,
      "manual-regenerate",
      true,
    );
    if (!completed.ok)
      return Response.json(
        { error: completed.error },
        { status: completed.status },
      );
    await addAdminAudit("regenerate", Number(order.id));
  } else if (action === "deliver") {
    if (order.reading_status !== "reading_generated")
      return Response.json(
        { error: "Gere a leitura antes de entregar." },
        { status: 409 },
      );
    await getD1()
      .prepare(
        "UPDATE orders SET reading_status='delivered',delivered_at=? WHERE id=?",
      )
      .bind(now, order.id)
      .run();
    await completePayment(orderNumber, undefined, "manual-delivery");
    await addAdminAudit("deliver", Number(order.id));
  } else if (action === "resend") {
    if (!['reading_generated','delivered'].includes(String(order.reading_status)))
      return Response.json({ error: "A leitura ainda não foi gerada." }, { status: 409 });
    await getD1().prepare('UPDATE orders SET notification_status=NULL,notification_error=NULL WHERE id=?').bind(order.id).run();
    const completed = await completePayment(orderNumber, undefined, "manual-resend");
    if (!completed.ok) return Response.json({ error: completed.error }, { status: completed.status });
    await addAdminAudit("resend", Number(order.id));
  } else if (action === "cancel") {
    await getD1()
      .prepare(
        "UPDATE orders SET payment_status='cancelled',reading_status='cancelled' WHERE id=?",
      )
      .bind(order.id)
      .run();
    await addAdminAudit("cancel", Number(order.id));
  } else return Response.json({ error: "Ação inválida." }, { status: 400 });
  return Response.json({ ok: true });
}
