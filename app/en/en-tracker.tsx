"use client";
import { useEffect } from "react";

function storedId(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) { value = crypto.randomUUID(); storage.setItem(key, value); }
  return value;
}

export default function EnTracker() {
  useEffect(() => {
    const anonymous_id = storedId(localStorage, "cs_anon");
    const session_id = storedId(sessionStorage, "cs_session");
    const params = new URLSearchParams(location.search);
    void fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "landing_view", anonymous_id, session_id,
        metadata: { locale: "en-US", currency: "USD", market: "international", path: "/en",
          utm_source: params.get("utm_source"), utm_medium: params.get("utm_medium"), utm_campaign: params.get("utm_campaign"), fbclid: params.get("fbclid") } }),
    });
  }, []);
  return null;
}
