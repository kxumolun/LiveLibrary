import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";

function getVisitorId() {
  const key = "visitor_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created =
    (globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).replace(/[^a-zA-Z0-9-]/g, "");
  localStorage.setItem(key, created);
  return created;
}

export default function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    const now = Date.now();
    const path = `${location.pathname}${location.search}`;
    const sessionKey = `visit:last:${path}`;
    const last = Number(sessionStorage.getItem(sessionKey) || "0");
    if (now - last < 30_000) return;
    sessionStorage.setItem(sessionKey, String(now));

    const visitorId = getVisitorId();
    api.post("/analytics/visit", {
      visitorId,
      path: location.pathname,
      referrer: document.referrer || undefined,
    }).catch(() => {});
  }, [location.pathname, location.search]);

  return null;
}
