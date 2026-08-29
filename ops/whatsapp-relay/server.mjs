import http from "node:http";
import crypto from "node:crypto";

const port = 3000;
const wahaUrl = process.env.WAHA_URL || "http://whatsapp-agent:3000";
const session = "chama-sofia-tarot";
const allowedOrigin = "https://tarot.chamasofia.com.br";
const recoveryUrl = `${allowedOrigin}/api/recovery/run`;
const attempts = new Map();

function authorized(request) {
  const supplied = Buffer.from((request.headers.authorization || "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(process.env.RELAY_SECRET || "disabled");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

async function waha(path, body) {
  const response = await fetch(`${wahaUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": process.env.WAHA_API_KEY || "" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`WAHA ${path}: ${response.status}`);
  return response.json();
}

function safeUrl(value) {
  const url = new URL(String(value));
  if (url.origin !== allowedOrigin) throw new Error("URL não permitida");
  return url.toString();
}

async function handler(request, response) {
  const ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 60_000);
  recent.push(now); attempts.set(ip, recent);
  if (recent.length > 30) return reply(response, 429, { error: "rate_limited" });
  if (request.method === "GET" && request.url === "/health") return reply(response, 200, { ok: true });
  if (request.method !== "POST" || request.url !== "/deliver") return reply(response, 404, { error: "not_found" });
  if (!authorized(request)) return reply(response, 401, { error: "unauthorized" });
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 32_000) return reply(response, 413, { error: "too_large" });
  }
  try {
    const body = JSON.parse(raw);
    const phone = String(body.phone || "").replace(/\D/g, "");
    if (phone.length < 12 || phone.length > 15) throw new Error("Telefone inválido");
    const firstName = String(body.customerName || "Olá").trim().split(/\s+/)[0].slice(0, 40);
    const notificationType = String(body.notificationType || "");
    if (notificationType) {
      const targetUrl = safeUrl(body.url);
      const referenceId = String(body.referenceId || "sem referência").slice(0, 80);
      const messages = {
        form_recovery_1: `Olá, ${firstName}. Percebemos que você começou sua jornada e fez uma pausa. Se quiser continuar, suas informações estão disponíveis por aqui: ${targetUrl}`,
        form_recovery_2: `${firstName}, seu acesso continua disponível caso queira retomar com calma: ${targetUrl}`,
        pix_recovery_1: `Olá, ${firstName}. Percebemos que sua jornada ficou pausada. Se quiser continuar, seu acesso ainda está disponível por aqui: ${targetUrl}`,
        pix_recovery_2: `${firstName}, seu acesso continua disponível caso queira retomar com calma: ${targetUrl}`,
        operation_alert: `Alerta operacional Tarot Chama Sofia. A operação requer atenção. Consulte o painel: ${targetUrl}\nReferência: ${referenceId}`,
      };
      const text = messages[notificationType];
      if (!text) throw new Error("Tipo de notificação inválido");
      await waha("/api/sendText", { session, chatId: `${phone}@c.us`, text });
      return reply(response, 200, { ok: true, notificationType });
    }
    const readingUrl = safeUrl(body.readingUrl);
    const pdfUrl = safeUrl(body.pdfUrl);
    const ebookUrl = safeUrl(body.ebookUrl);
    const chatId = `${phone}@c.us`;
    await waha("/api/sendText", {
      session, chatId,
      text: `${firstName}, sua leitura de Tarot Chama Sofia está pronta ✨\n\nAcesse sua leitura privada:\n${readingUrl}`,
    });
    const files = [];
    for (const file of [
      { url: pdfUrl, filename: `leitura-tarot-${body.orderNumber}.pdf`, caption: "Sua leitura completa em PDF" },
      { url: ebookUrl, filename: "tarot-para-iniciantes-sofia-labs.pdf", caption: "Seu e-book bônus: Tarot para Iniciantes" },
    ]) {
      try {
        await waha("/api/sendFile", {
          session, chatId, caption: file.caption,
          file: { mimetype: "application/pdf", filename: file.filename, url: file.url },
        });
        files.push({ filename: file.filename, sent: true });
      } catch (error) {
        files.push({ filename: file.filename, sent: false, error: String(error.message || error) });
      }
    }
    return reply(response, 200, { ok: true, files });
  } catch (error) {
    return reply(response, 400, { error: String(error.message || error) });
  }
}

function reply(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

async function sweepRecoveries() {
  try {
    const response = await fetch(recoveryUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RELAY_SECRET || ""}` },
    });
    if (!response.ok) console.error(`Recovery sweep: HTTP ${response.status}`);
  } catch (error) {
    console.error(`Recovery sweep: ${String(error.message || error)}`);
  }
}

http.createServer(handler).listen(port, "0.0.0.0");
setTimeout(sweepRecoveries, 15_000).unref();
setInterval(sweepRecoveries, 5 * 60_000).unref();
