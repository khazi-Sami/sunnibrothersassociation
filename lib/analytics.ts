export const ANALYTICS_EVENTS = [
  "page_view",
  "navigation_clicked",
  "primary_cta_clicked",
  "external_link_clicked",
  "quran_opened",
  "surah_viewed",
  "surah_search_used",
  "quran_navigation_used",
  "education_viewed",
  "course_viewed",
  "course_enrolled",
  "class_viewed",
  "class_join_clicked",
  "live_class_joined",
  "recording_viewed",
  "recording_started",
  "question_submitted",
  "donation_viewed",
  "donation_amount_selected",
  "donation_checkout_started",
  "donation_completed",
  "donation_failed",
  "zakat_viewed",
  "zakat_calculator_started",
  "zakat_calculated",
  "zakat_donation_clicked",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && ANALYTICS_EVENTS.includes(value as AnalyticsEventName);
}

export const ANALYTICS_PUBLIC_EXCLUDED_PREFIXES = [
  "/admin",
  "/api",
  "/login",
  "/signup",
  "/dashboard",
  "/courses/create",
  "/classes/schedule",
];

export function isAnalyticsPathAllowed(path: string) {
  return !ANALYTICS_PUBLIC_EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
