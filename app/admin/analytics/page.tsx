import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import AnalyticsDashboard, { type AnalyticsDashboardData } from "./AnalyticsDashboard";

function emptyData(rangeDays: number): AnalyticsDashboardData { return { dbReady: false, rangeDays, overview: { visitors: 0, sessions: 0, pageviews: 0, returning: 0, quran: 0, education: 0, donationStarts: 0 }, traffic: [], pages: [], sources: [], devices: [], events: [], surahs: [], courses: [], education: { scheduled: 0, live: 0, attendance: 0, recordings: 0, questions: 0, enrollments: 0 }, donation: { viewed: 0, selected: 0, started: 0, completed: 0, failed: 0 } }; }

function topEntries(map: Map<string, number>, limit = 7) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, value]) => ({ label, value })); }
function dayLabel(date: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date); }

async function loadAnalytics(rangeDays: number): Promise<AnalyticsDashboardData> {
  try {
    const prisma = getPrisma();
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
    const [events, courses, scheduled, live, attendance, recordings, questions, enrollments] = await Promise.all([
      prisma.analyticsEvent.findMany({ where: { occurredAt: { gte: since } }, select: { eventName: true, path: true, sessionId: true, anonymousId: true, occurredAt: true, utmSource: true, deviceType: true, metadata: true }, orderBy: { occurredAt: "asc" }, take: 100000 }),
      prisma.course.findMany({ select: { title: true, _count: { select: { enrollments: true, classes: true } }, classes: { select: { _count: { select: { recordings: true } } } } }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.class.count({ where: { status: "SCHEDULED" } }), prisma.class.count({ where: { status: "LIVE" } }), prisma.classAttendance.count(), prisma.recording.count(), prisma.classQuestion.count(), prisma.enrollment.count(),
    ]);
    const publicEvents = events.filter((event) => !event.path.startsWith("/admin") && !event.path.startsWith("/api"));
    const pageviews = publicEvents.filter((event) => event.eventName === "page_view");
    const sessions = new Map<string, number>(), visitors = new Set<string>(), pageMap = new Map<string, number>(), sourceMap = new Map<string, number>(), deviceMap = new Map<string, number>(), eventMap = new Map<string, number>(), surahMap = new Map<string, number>();
    const dayMap = new Map<string, { views: number; sessions: Set<string>; visitors: Set<string> }>();
    for (const event of publicEvents) {
      sessions.set(event.sessionId, (sessions.get(event.sessionId) ?? 0) + 1); visitors.add(event.anonymousId ?? event.sessionId); eventMap.set(event.eventName, (eventMap.get(event.eventName) ?? 0) + 1);
      if (event.eventName === "page_view") { pageMap.set(event.path, (pageMap.get(event.path) ?? 0) + 1); const day = event.occurredAt.toISOString().slice(0, 10); const daily = dayMap.get(day) ?? { views: 0, sessions: new Set<string>(), visitors: new Set<string>() }; daily.views += 1; daily.sessions.add(event.sessionId); daily.visitors.add(event.anonymousId ?? event.sessionId); dayMap.set(day, daily); sourceMap.set(event.utmSource || "Direct", (sourceMap.get(event.utmSource || "Direct") ?? 0) + 1); deviceMap.set(event.deviceType || "Unknown", (deviceMap.get(event.deviceType || "Unknown") ?? 0) + 1); }
      if (event.eventName === "surah_viewed" && event.metadata && typeof event.metadata === "object" && "surahNumber" in event.metadata) { const number = String((event.metadata as { surahNumber?: number }).surahNumber); surahMap.set(`Surah ${number}`, (surahMap.get(`Surah ${number}`) ?? 0) + 1); }
    }
    const traffic = Array.from({ length: rangeDays }, (_, index) => { const date = new Date(); date.setUTCHours(12, 0, 0, 0); date.setUTCDate(date.getUTCDate() - (rangeDays - index - 1)); const key = date.toISOString().slice(0, 10); const daily = dayMap.get(key); return { label: dayLabel(date), views: daily?.views ?? 0, sessions: daily?.sessions.size ?? 0, visitors: daily?.visitors.size ?? 0 }; });
    return { dbReady: true, rangeDays, overview: { visitors: visitors.size, sessions: sessions.size, pageviews: pageviews.length, returning: [...sessions.values()].filter((count) => count > 1).length, quran: eventMap.get("quran_opened") ?? 0, education: eventMap.get("education_viewed") ?? 0, donationStarts: eventMap.get("donation_checkout_started") ?? 0 }, traffic, pages: topEntries(pageMap), sources: topEntries(sourceMap), devices: topEntries(deviceMap), events: topEntries(eventMap), surahs: topEntries(surahMap), courses: courses.map((course) => ({ title: course.title, enrollments: course._count.enrollments, classes: course._count.classes, recordings: course.classes.reduce((sum, item) => sum + item._count.recordings, 0) })), education: { scheduled, live, attendance, recordings, questions, enrollments }, donation: { viewed: eventMap.get("donation_viewed") ?? 0, selected: eventMap.get("donation_amount_selected") ?? 0, started: eventMap.get("donation_checkout_started") ?? 0, completed: eventMap.get("donation_completed") ?? 0, failed: eventMap.get("donation_failed") ?? 0 } };
  } catch { return emptyData(rangeDays); }
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const session = await getServerSession(authOptions); if (!session) redirect("/login"); if (session.user.role !== "ADMIN") redirect("/dashboard");
  const params = await searchParams;
  const requestedRange = Number(params.range);
  const rangeDays = requestedRange === 7 || requestedRange === 90 ? requestedRange : 30;
  return <AnalyticsDashboard data={await loadAnalytics(rangeDays)} />;
}
