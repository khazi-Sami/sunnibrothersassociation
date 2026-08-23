import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, BarChart3, BookOpenText, GraduationCap, HeartHandshake, LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  return (
    <main className="interior-page dashboard-page">
      <div className="interior-shell dashboard-shell">
        <header className="dashboard-intro">
          <div className="dashboard-intro__icon"><LayoutDashboard size={21} /></div>
          <div><div className="site-section-label">Your account</div><h1>Welcome back{session.user.name ? `, ${session.user.name}` : ""}.</h1><p>Continue learning, reading, and serving from one familiar place.</p></div>
          <span className="dashboard-role">{session.user.role.charAt(0) + session.user.role.slice(1).toLowerCase()}</span>
        </header>

        <section className="dashboard-grid" aria-label="Dashboard destinations">
          <Link href="/education" className="dashboard-card"><span><GraduationCap size={20} /></span><div><h2>Education</h2><p>Open your courses, classes, and recordings.</p></div><ArrowUpRight size={18} /></Link>
          <Link href="/quran" className="dashboard-card"><span><BookOpenText size={20} /></span><div><h2>Quran</h2><p>Return to the Surah reader.</p></div><ArrowUpRight size={18} /></Link>
          <Link href="/donation" className="dashboard-card"><span><HeartHandshake size={20} /></span><div><h2>Community support</h2><p>View causes and give with purpose.</p></div><ArrowUpRight size={18} /></Link>
          {session.user.role === "ADMIN" ? <Link href="/admin/analytics" className="dashboard-card"><span><BarChart3 size={20} /></span><div><h2>Analytics</h2><p>Review aggregate community engagement.</p></div><ArrowUpRight size={18} /></Link> : null}
        </section>

        <section className="interior-panel dashboard-account"><div><div className="site-section-label">Signed in as</div><h2>{session.user.email}</h2></div><Link href="/education" className="site-btn-primary">Open education <ArrowUpRight size={16} /></Link></section>
      </div>
    </main>
  );
}
