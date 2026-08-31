import assert from "node:assert/strict";
import test from "node:test";
import { consultationUrl, shouldUseConsulta } from "../lib/paid-traffic.ts";
import { analyticsMetadata, normalizeTestFlag } from "../lib/analytics-context.ts";

test("encaminha apenas marcadores seguros de tráfego Meta", () => {
  assert.equal(shouldUseConsulta({ utm_source: "meta" }), true);
  assert.equal(shouldUseConsulta({ utm_source: "Instagram" }), true);
  assert.equal(shouldUseConsulta({ fbclid: "abc123" }), true);
  assert.equal(shouldUseConsulta({ meta: "paid" }), true);
  assert.equal(shouldUseConsulta({ utm_source: "newsletter" }), false);
  assert.equal(shouldUseConsulta({}), false);
});

test("preserva a atribuição no encaminhamento", () => {
  assert.equal(
    consultationUrl({ utm_source: "meta", utm_campaign: "amor", fbclid: "abc" }),
    "/consulta?utm_source=meta&utm_campaign=amor&fbclid=abc",
  );
});

test("normaliza is_test e mantém o contexto obrigatório no evento", () => {
  assert.equal(normalizeTestFlag("true"), true);
  assert.equal(normalizeTestFlag("0"), false);
  assert.deepEqual(
    analyticsMetadata(
      { anonymous_id: "anon", session_id: "session", is_test: false, utm_source: "meta" },
      { step: 2 },
    ),
    { step: 2, anonymous_id: "anon", session_id: "session", is_test: false, utm_source: "meta" },
  );
});
