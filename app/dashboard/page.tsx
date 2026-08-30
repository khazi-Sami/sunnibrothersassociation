import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, GraduationCap, HeartHandshake, LayoutDashboard } from "lucide-react";
import { getPrisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");
  const prisma = getPrisma();
  const teacher = session.user.role === "TEACHER";
  const [courseCount, classCount, studentCount, nextClass, profile] = teacher ? await Promise.all([
    prisma.course.count({ where: { teacherId: session.user.id } }),
    prisma.class.count({ where: { teacherId: session.user.id } }),
    prisma.enrollment.count({ where: { course: { teacherId: session.user.id } } }),
    prisma.class.findFirst({ where: { teacherId: session.user.id, status: "SCHEDULED", scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: "asc" }, select: { id: true, title: true, scheduledAt: true, classType: true } }),
    prisma.teacherProfile.findUnique({ where: { userId: session.user.id }, select: { fullName: true } }),
  ]) : await Promise.all([
    prisma.enrollment.count({ where: { studentId: session.user.id } }),
    prisma.class.count({ where: { course: { enrollments: { some: { studentId: session.user.id } } }, status: "SCHEDULED", scheduledAt: { gte: new Date() } } }),
    Promise.resolve(0),
    prisma.class.findFirst({ where: { status: "SCHEDULED", scheduledAt: { gte: new Date() }, course: { enrollments: { some: { studentId: session.user.id } } } }, orderBy: { scheduledAt: "asc" }, select: { id: true, title: true, scheduledAt: true, classType: true } }),
    prisma.studentProfile.findUnique({ where: { userId: session.user.id }, select: { fullName: true } }),
  ]);
  const displayName = profile?.fullName || session.user.name || "there";

  return (
    <main className="interior-page dashboard-page">
      <div className="interior-shell dashboard-shell">
        <header className="dashboard-intro">
          <div className="dashboard-intro__icon"><LayoutDashboard size={21} /></div>
          <div><div className="site-section-label">{teacher ? "Teaching workspace" : "Learning workspace"}</div><h1>Hello, {displayName}.</h1><p>{teacher ? "Keep your courses and live classes moving." : "Continue your learning journey with SBA."}</p></div>
          <span className="dashboard-role">{teacher ? "Teacher" : "Student"}</span>
        </header>

        <section className="dashboard-grid" aria-label="Dashboard destinations">
          <Link href="/education" className="dashboard-card"><span><GraduationCap size={20} /></span><div><h2>{teacher ? "My courses & classes" : "My courses"}</h2><p>{courseCount} course(s) · {classCount} upcoming/managed class(es).</p></div><ArrowUpRight size={18} /></Link>
          <Link href="/quran" className="dashboard-card"><span><BookOpenText size={20} /></span><div><h2>Quran</h2><p>Return to the Surah reader.</p></div><ArrowUpRight size={18} /></Link>
          <Link href="/calendar" className="dashboard-card"><span><LayoutDashboard size={20} /></span><div><h2>Calendar</h2><p>{teacher ? "View your teaching schedule." : "View classes from your enrolled courses."}</p></div><ArrowUpRight size={18} /></Link>
          <Link href="/donation" className="dashboard-card"><span><HeartHandshake size={20} /></span><div><h2>Community support</h2><p>View causes and give with purpose.</p></div><ArrowUpRight size={18} /></Link>
          {teacher ? <Link href="/profile" className="dashboard-card"><span><LayoutDashboard size={20} /></span><div><h2>My profile</h2><p>Keep your teaching details current.</p></div><ArrowUpRight size={18} /></Link> : null}
        </section>

        <section className="interior-panel" style={{ marginTop: 22 }}><div className="site-section-label">Next step</div>{nextClass ? <><h2>{nextClass.title}</h2><p>{new Date(nextClass.scheduledAt).toLocaleString()} · {nextClass.classType === "GOOGLE_MEET" ? "Google Meet" : "YouTube Live"}</p><Link href={`/education/live/${nextClass.id}`} className="site-btn-primary">{teacher ? "View class" : "Join class"}</Link></> : <><h2>{teacher ? "Create your first class" : "Explore education"}</h2><p>{teacher ? "Schedule a YouTube or Google Meet class for one of your courses." : "Your upcoming classes will appear here."}</p><Link href="/education" className="site-btn-primary">Open education</Link></>}</section>

        <section className="interior-panel dashboard-account"><div><div className="site-section-label">{teacher ? "My students" : "My learning"}</div><h2>{teacher ? `${studentCount} enrolled student(s)` : `${courseCount} enrolled course(s)`}</h2></div><Link href="/profile" className="site-btn-primary">My profile <ArrowUpRight size={16} /></Link></section>
      </div>
    </main>
  );
}
