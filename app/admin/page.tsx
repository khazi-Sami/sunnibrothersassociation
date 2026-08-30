import Link from "next/link";
import { ArrowUpRight, BookOpen, CalendarClock, GraduationCap, HandHeart, Plus, Users } from "lucide-react";
import { SbaPageHeader, SbaStatCard, SbaStatusBadge } from "@/app/components/sba/SbaUi";
import { getPrisma } from "@/lib/prisma";

export default async function AdminPage() {
  const prisma = getPrisma(); const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(end.getDate()+1);
  const [students,activeTeachers,courses,upcoming,today,pending,unread,recentClasses] = await Promise.all([
    prisma.user.count({where:{role:"STUDENT"}}), prisma.teacherProfile.count({where:{status:"ACTIVE"}}), prisma.course.count(),
    prisma.class.count({where:{status:"SCHEDULED",scheduledAt:{gte:now}}}), prisma.class.count({where:{scheduledAt:{gte:start,lt:end}}}),
    prisma.financialAssistanceRequest.count({where:{status:{in:["PENDING","UNDER_REVIEW"]}}}), prisma.adminNotification.count({where:{isRead:false}}),
    prisma.class.findMany({where:{scheduledAt:{gte:now}},orderBy:{scheduledAt:"asc"},take:5,include:{course:{select:{title:true}},teacher:{select:{name:true,email:true}},_count:{select:{attendances:true}}}}),
  ]);
  return <main className="interior-page"><div className="interior-shell">
    <SbaPageHeader eyebrow="SBA operations" title="Community command centre" description="People, learning, support, and stewardship—organized around what needs attention today." actions={<><Link href="/admin/students" className="site-btn-secondary"><Plus size={15}/> Add student</Link><Link href="/education" className="site-btn-primary"><CalendarClock size={15}/> Schedule class</Link></>} />
    <section className="sba-stats"><SbaStatCard label="Students" value={students} note="Active learner accounts" tone="green"/><SbaStatCard label="Active teachers" value={activeTeachers} note="Approved to teach"/><SbaStatCard label="Courses" value={courses} note={`${upcoming} upcoming classes`}/><SbaStatCard label="Needs attention" value={pending+unread} note={`${pending} assistance · ${unread} notifications`} tone="gold"/></section>
    <section className="sba-section-grid" style={{marginTop:18}}><article className="sba-panel"><div className="sba-page-header" style={{margin:0,padding:0}}><div><span className="sba-eyebrow">Today</span><h2 style={{marginTop:6}}>Upcoming classes</h2></div><SbaStatusBadge value={`${today} today`}/></div><div style={{display:"grid",gap:8,marginTop:18}}>{recentClasses.length?recentClasses.map(item=><Link href={`/classes/${item.id}`} key={item.id} className="dashboard-card" style={{minHeight:0,padding:16}}><div><strong>{item.title}</strong><p>{item.course.title} · {item.teacher.name||item.teacher.email}</p><small>{item.scheduledAt.toLocaleString()} · {item._count.attendances} attendance records</small></div><ArrowUpRight size={16}/></Link>):<p>No upcoming classes.</p>}</div></article>
    <article className="sba-panel"><span className="sba-eyebrow">Quick actions</span><h2 style={{marginTop:6}}>Run the community</h2><div className="dashboard-grid" style={{marginTop:18}}>{[["Students","/admin/students",GraduationCap],["Teachers","/admin/teachers",Users],["Courses","/education",BookOpen],["Assistance","/admin/assistance",HandHeart]].map(([label,href,Icon])=><Link href={href as string} key={label as string} className="dashboard-card" style={{minHeight:105,padding:16}}><Icon size={20}/><strong>{label as string}</strong></Link>)}</div></article></section>
  </div></main>;
}
