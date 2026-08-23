"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { isAnalyticsPathAllowed, type AnalyticsEventName } from "@/lib/analytics";

type TrackOptions = { resourceId?: string; metadata?: Record<string, string | number | boolean> };
type AnalyticsContextValue = { track: (eventName: AnalyticsEventName, options?: TrackOptions) => void };
const AnalyticsContext = createContext<AnalyticsContextValue>({ track: () => undefined });
const ephemeralIdentifiers = new Map<string, string>();

function getIdentifier(key: string, storage: Storage, prefix: string) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const value = `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
    storage.setItem(key, value);
    return value;
  } catch {
    const existing = ephemeralIdentifiers.get(key);
    if (existing) return existing;
    const value = `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
    ephemeralIdentifiers.set(key, value);
    return value;
  }
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);
  const contextValue = useMemo<AnalyticsContextValue>(() => ({
    track(eventName, options = {}) {
      if (typeof window === "undefined" || !isAnalyticsPathAllowed(pathname)) return;
      const sessionId = getIdentifier("sba_analytics_session", window.sessionStorage, "sba_s");
      const anonymousId = getIdentifier("sba_analytics_visitor", window.localStorage, "sba_v");
      const params = new URLSearchParams(window.location.search);
      const deviceType = window.matchMedia("(max-width: 767px)").matches ? "mobile" : window.matchMedia("(max-width: 1100px)").matches ? "tablet" : "desktop";
      const payload = {
        eventName,
        path: pathname,
        sessionId,
        anonymousId,
        referrer: document.referrer ? new URL(document.referrer).origin : undefined,
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
        deviceType,
        resourceId: options.resourceId,
        metadata: options.metadata,
      };
      void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
    },
  }), [pathname]);

  const track = contextValue.track;
  useEffect(() => {
    if (!pathname || lastPage.current === pathname) return;
    lastPage.current = pathname;
    track("page_view");
    if (pathname === "/quran") track("quran_opened");
    if (pathname === "/education") track("education_viewed");
    if (pathname === "/donation") track("donation_viewed");
    if (pathname === "/zakat") track("zakat_viewed");
  }, [pathname, track]);

  return <AnalyticsContext.Provider value={contextValue}>{children}</AnalyticsContext.Provider>;
}
