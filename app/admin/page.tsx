import Link from "next/link";
import { requireRole } from "@/lib/roleAccess";
import { getPrisma } from "@/lib/prisma";

export default async function AdminPage() {
  await requireRole("ADMIN");
  const prisma = getPrisma();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const [students, teachers, activeTeachers, courses, upcomingClasses, todayClasses] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }), prisma.user.count({ where: { role: "TEACHER" } }), prisma.teacherProfile.count({ where: { status: "ACTIVE" } }), prisma.course.count(), prisma.class.count({ where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } } }), prisma.class.count({ where: { scheduledAt: { gte: start, lt: end } } }),
  ]);
  const cards = [["Students", students, "/admin/students"], ["Teachers", teachers, "/admin/teachers"], ["Families", "Manage", "/admin/families"], ["Assistance", "Review", "/admin/assistance"], ["Finance", "Open", "/admin/finance"], ["Calendar", "View", "/calendar"], ["Active teachers", activeTeachers, "/admin/teachers"], ["Courses", courses, "/education"], ["Upcoming classes", upcomingClasses, "/education"], ["Classes today", todayClasses, "/education"]] as const;
  return <main className="interior-page"><div className="interior-shell"><header className="dashboard-intro"><div><div className="site-section-label">SBA operations</div><h1>Admin dashboard</h1><p>Manage people, teaching, and learning from one place.</p></div><span className="dashboard-role">Admin</span></header><section className="dashboard-grid">{cards.map(([label, value, href]) => <Link key={label} href={href} className="dashboard-card"><div><h2>{label}</h2><strong style={{ fontSize: 34 }}>{value}</strong></div></Link>)}</section><section className="dashboard-grid" style={{ marginTop: 24 }}><Link href="/admin/students" className="dashboard-card"><div><h2>Students</h2><p>View profiles and enrollments.</p></div></Link><Link href="/admin/teachers" className="dashboard-card"><div><h2>Teachers</h2><p>Create, activate, and assign teachers.</p></div></Link><Link href="/admin/notifications" className="dashboard-card"><div><h2>Notifications</h2><p>Review recent account activity.</p></div></Link></section></div></main>;
}
