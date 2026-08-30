import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpenText,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  HeartHandshake,
  MonitorSmartphone,
  MousePointerClick,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export type AnalyticsDashboardData = {
  dbReady: boolean;
  rangeDays: number;
  overview: { visitors: number; sessions: number; pageviews: number; returning: number; quran: number; education: number; donationStarts: number };
  traffic: { label: string; views: number; sessions: number; visitors: number }[];
  pages: { label: string; value: number }[];
  sources: { label: string; value: number }[];
  devices: { label: string; value: number }[];
  events: { label: string; value: number }[];
  surahs: { label: string; value: number }[];
  courses: { title: string; enrollments: number; classes: number; recordings: number }[];
  education: { scheduled: number; live: number; attendance: number; recordings: number; questions: number; enrollments: number };
  donation: { viewed: number; selected: number; started: number; completed: number; failed: number };
};

const metricIcons = [Users, Clock3, BarChart3, BookOpenText, GraduationCap, HeartHandshake];

function formatMetric(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function linePoints(values: number[], max: number) {
  if (!values.length) return "";
  const width = 920;
  const height = 250;
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (value / Math.max(max, 1)) * (height - 18) - 9;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function HorizontalBars({ items, empty = "No activity in this period." }: { items: { label: string; value: number }[]; empty?: string }) {
  if (!items.length) return <div className="admin-analytics-empty"><Activity size={17} /><span>{empty}</span></div>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return <div className="admin-analytics-bars">{items.map((item, index) => <div className="admin-analytics-bar-row" key={item.label}><div className="admin-analytics-bar-copy"><span><i>{String(index + 1).padStart(2, "0")}</i>{item.label}</span><strong>{formatMetric(item.value)}</strong></div><div className="admin-analytics-bar-track"><span style={{ width: `${Math.max(5, (item.value / max) * 100)}%` }} /></div></div>)}</div>;
}

function PanelHeader({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <div className="admin-analytics-panel-head"><div><span>{eyebrow}</span><h2>{title}</h2></div>{note ? <small>{note}</small> : null}</div>;
}

export default function AnalyticsDashboard({ data }: { data: AnalyticsDashboardData }) {
  const metrics = [
    { label: "Anonymous visitors", value: data.overview.visitors, detail: `${data.overview.returning} returning sessions` },
    { label: "Sessions", value: data.overview.sessions, detail: `${data.rangeDays}-day reporting window` },
    { label: "Public pageviews", value: data.overview.pageviews, detail: "Internal routes excluded" },
    { label: "Quran engagement", value: data.overview.quran, detail: "Aggregate reader opens" },
    { label: "Education engagement", value: data.overview.education, detail: "Learning area opens" },
    { label: "Checkout starts", value: data.overview.donationStarts, detail: "Behavioral signal only" },
  ];
  const trafficMax = Math.max(...data.traffic.flatMap((item) => [item.views, item.sessions, item.visitors]), 1);
  const viewsPoints = linePoints(data.traffic.map((item) => item.views), trafficMax);
  const sessionsPoints = linePoints(data.traffic.map((item) => item.sessions), trafficMax);
  const visitorsPoints = linePoints(data.traffic.map((item) => item.visitors), trafficMax);
  const donationMax = Math.max(data.donation.viewed, data.donation.selected, data.donation.started, data.donation.completed, data.donation.failed, 1);
  const donationSteps = [
    { label: "Page viewed", value: data.donation.viewed },
    { label: "Cause selected", value: data.donation.selected },
    { label: "Checkout started", value: data.donation.started },
    { label: "Completion event", value: data.donation.completed },
  ];

  return <main className="admin-analytics-page"><div className="admin-analytics-shell">
    <section className="admin-analytics-intro">
      <div><Link href="/admin" className="admin-analytics-back"><ArrowLeft size={15} /> Back to admin</Link><div className="admin-analytics-kicker"><Sparkles size={14} /> Clear signals, respectful measurement</div><h1>Community analytics</h1><p>See how people discover Quran, education, and community support—without exposing identities or profiling faith.</p></div>
      <div className="admin-analytics-intro-actions"><span className="admin-analytics-status"><i className={data.dbReady ? "is-live" : ""} />{data.dbReady ? "Data connected" : "Awaiting database"}</span><span className="admin-analytics-privacy"><ShieldCheck size={16} /> Privacy-first</span></div>
    </section>

    <section className="admin-analytics-toolbar" aria-label="Reporting period"><div><CalendarRange size={17} /><span>Reporting period</span></div><nav>{[7, 30, 90].map((days) => <Link key={days} href={`/admin/analytics?range=${days}`} aria-current={data.rangeDays === days ? "page" : undefined}>{days === 7 ? "Last 7 days" : days === 30 ? "Last 30 days" : "Last 90 days"}</Link>)}</nav><small>Updated from first-party SBA events</small></section>

    {!data.dbReady ? <div className="admin-analytics-notice" role="status"><ShieldCheck size={19} /><div><strong>Analytics storage is not connected.</strong><span>The dashboard is ready. Configure the production PostgreSQL connection and apply the analytics migration to begin collecting aggregate events.</span></div></div> : null}

    <section className="admin-analytics-metrics" aria-label="Analytics overview">{metrics.map((metric, index) => { const Icon = metricIcons[index]; return <article key={metric.label}><div className="admin-analytics-metric-top"><span><Icon size={17} /></span><small>0{index + 1}</small></div><strong>{formatMetric(metric.value)}</strong><h2>{metric.label}</h2><p>{metric.detail}</p></article>; })}</section>

    <section className="admin-analytics-primary-grid">
      <article className="admin-analytics-panel admin-analytics-panel--traffic"><PanelHeader eyebrow="Traffic" title="Engagement over time" note={`${data.rangeDays}-day view`} />
        <div className="admin-analytics-legend"><span className="is-views">Pageviews</span><span className="is-sessions">Sessions</span><span className="is-visitors">Visitors</span></div>
        {data.traffic.some((item) => item.views || item.sessions || item.visitors) ? <div className="admin-analytics-line-chart"><svg role="img" aria-label="Pageviews, sessions, and visitors over time" viewBox="0 0 920 270" preserveAspectRatio="none"><g className="admin-analytics-gridlines"><line x1="0" y1="30" x2="920" y2="30" /><line x1="0" y1="92" x2="920" y2="92" /><line x1="0" y1="154" x2="920" y2="154" /><line x1="0" y1="216" x2="920" y2="216" /></g><polyline className="is-views" points={viewsPoints} /><polyline className="is-sessions" points={sessionsPoints} /><polyline className="is-visitors" points={visitorsPoints} /></svg><div className="admin-analytics-axis">{data.traffic.map((item, index) => <span key={`${item.label}-${index}`}>{index % Math.max(1, Math.ceil(data.traffic.length / 7)) === 0 ? item.label : ""}</span>)}</div></div> : <div className="admin-analytics-chart-empty"><BarChart3 size={25} /><strong>Traffic will appear here</strong><span>Daily trends begin after the first stored pageviews.</span></div>}
      </article>
      <aside className="admin-analytics-panel admin-analytics-panel--pulse"><PanelHeader eyebrow="Right now" title="Operations pulse" /><div className="admin-analytics-pulse-list"><div><span><Radio size={16} />Live classes</span><strong>{data.education.live}</strong></div><div><span><CalendarRange size={16} />Scheduled classes</span><strong>{data.education.scheduled}</strong></div><div><span><Users size={16} />Attendance records</span><strong>{formatMetric(data.education.attendance)}</strong></div><div><span><MousePointerClick size={16} />Questions received</span><strong>{formatMetric(data.education.questions)}</strong></div></div><Link href="/education">Open education workspace <ArrowUpRight size={15} /></Link></aside>
    </section>

    <section className="admin-analytics-grid">
      <article className="admin-analytics-panel"><PanelHeader eyebrow="Acquisition" title="Traffic sources" /><HorizontalBars items={data.sources} /></article>
      <article className="admin-analytics-panel"><PanelHeader eyebrow="Content" title="Most visited areas" /><HorizontalBars items={data.pages} /></article>
      <article className="admin-analytics-panel admin-analytics-panel--device"><PanelHeader eyebrow="Experience" title="Device mix" /><div className="admin-analytics-device-layout"><div className="admin-analytics-device-orbit"><MonitorSmartphone size={25} /><strong>{data.overview.sessions}</strong><span>sessions</span></div><HorizontalBars items={data.devices} /></div></article>
      <article className="admin-analytics-panel"><PanelHeader eyebrow="Quran" title="Aggregate Surah opens" note="No reader histories" /><HorizontalBars items={data.surahs} empty="Surah selections will appear as aggregate totals." /></article>
    </section>

    <section className="admin-analytics-panel admin-analytics-panel--education"><PanelHeader eyebrow="Authoritative education data" title="Learning operations" note="Prisma records—not click estimates" /><div className="admin-analytics-education-stats"><div><strong>{formatMetric(data.education.enrollments)}</strong><span>Enrollments</span></div><div><strong>{data.education.scheduled}</strong><span>Scheduled</span></div><div><strong>{data.education.live}</strong><span>Live now</span></div><div><strong>{formatMetric(data.education.attendance)}</strong><span>Attendance</span></div><div><strong>{formatMetric(data.education.recordings)}</strong><span>Recordings</span></div><div><strong>{formatMetric(data.education.questions)}</strong><span>Questions</span></div></div><div className="admin-analytics-course-table"><div className="admin-analytics-course-table-head"><span>Course</span><span>Enrollments</span><span>Classes</span><span>Recordings</span></div>{data.courses.length ? data.courses.map((course) => <div key={course.title}><strong>{course.title}</strong><span>{course.enrollments}</span><span>{course.classes}</span><span>{course.recordings}</span></div>) : <div className="admin-analytics-course-empty"><GraduationCap size={18} /><span>Course performance appears when education records exist.</span></div>}</div></section>

    <section className="admin-analytics-secondary-grid">
      <article className="admin-analytics-panel"><PanelHeader eyebrow="Donation journey" title="Checkout funnel" note="Events—not revenue" /><div className="admin-analytics-funnel">{donationSteps.map((step, index) => <div key={step.label}><span>{index + 1}</span><div><strong>{step.label}</strong><i style={{ width: `${Math.max(4, (step.value / donationMax) * 100)}%` }} /></div><b>{formatMetric(step.value)}</b></div>)}</div>{data.donation.failed > 0 ? <p className="admin-analytics-failed"><CircleDollarSign size={15} /> {data.donation.failed} failed checkout events</p> : null}<div className="admin-analytics-trust-note"><ShieldCheck size={17} /><span>Verified payment records remain the accounting source of truth.</span></div></article>
      <article className="admin-analytics-panel"><PanelHeader eyebrow="Product signals" title="Meaningful actions" /><HorizontalBars items={data.events} /><div className="admin-analytics-trust-note"><HeartHandshake size={17} /><span>Aggregate behavior only. No names, emails, payment details, Zakat values, or religious profiles.</span></div></article>
    </section>

    <footer className="admin-analytics-footer"><div><span className="admin-analytics-brand-mark">SBA</span><p>Analytics designed for service, learning, and responsible stewardship.</p></div><Link href="/">View public website <ArrowUpRight size={14} /></Link></footer>
  </div></main>;
}
