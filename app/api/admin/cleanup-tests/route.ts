import { env } from "cloudflare:workers";
import { ensureSchema, getD1 } from "@/lib/database";

/** Temporary owner-only maintenance endpoint; removed after the cleanup run. */
export async function POST(request: Request) {
  if (!env.EBOOK_UPLOAD_SECRET || request.headers.get("x-upload-token") !== env.EBOOK_UPLOAD_SECRET)
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  await ensureSchema();
  const db = getD1();
  const tests = await db.prepare("SELECT id FROM orders WHERE customer_email='teste@example.invalid' OR customer_name='Cliente Teste Producao' OR question='Teste para saber se funciona'").all<{id:number}>();
  const ids = tests.results.map((row) => row.id);
  if (ids.length) {
    const marks = ids.map(() => "?").join(",");
    await db.prepare(`DELETE FROM analytics_events WHERE order_id IN (${marks})`).bind(...ids).run();
    await db.prepare(`DELETE FROM orders WHERE id IN (${marks})`).bind(...ids).run();
  }
  return Response.json({ ok: true, removedOrders: ids.length });
}
