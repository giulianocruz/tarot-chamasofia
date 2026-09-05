"use client";
import { useEffect, useState } from "react";

function storedId(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) { value = crypto.randomUUID(); storage.setItem(key, value); }
  return value;
}

export default function EnTracker() {
  const [cancelled,setCancelled]=useState(false);
  useEffect(() => {
    const anonymous_id = storedId(localStorage, "cs_anon");
    const session_id = storedId(sessionStorage, "cs_session");
    const params = new URLSearchParams(location.search);
    const previous = (()=>{try{return JSON.parse(localStorage.getItem("cs_intl_attribution")||"{}") as Record<string,string|null>}catch{return {}}})();
    const attribution = { utm_source:params.get("utm_source")||previous.utm_source||null, utm_medium:params.get("utm_medium")||previous.utm_medium||null, utm_campaign:params.get("utm_campaign")||previous.utm_campaign||null, fbclid:params.get("fbclid")||previous.fbclid||null };
    localStorage.setItem("cs_intl_attribution",JSON.stringify(attribution));
    if(params.get("checkout")==="cancelled") setCancelled(true);
    void fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "landing_view", anonymous_id, session_id,
        metadata: { locale: "en-US", currency: "USD", market: "international", path: "/en",
          ...attribution } }),
    });
  }, []);
  return cancelled ? <div className="en-return-banner"><div><strong>No charge was made.</strong><span>Your reading is still saved on this device.</span></div><a href="/en/consult">RESUME MY READING →</a></div> : null;
}
