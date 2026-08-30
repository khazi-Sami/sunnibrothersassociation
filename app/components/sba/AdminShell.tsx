"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, BookOpen, CalendarDays, CalendarRange, CircleDollarSign, GraduationCap, HandHeart, House, LayoutDashboard, Menu, Users, WalletCards, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["Overview", "/admin", LayoutDashboard], ["Students", "/admin/students", GraduationCap], ["Teachers", "/admin/teachers", Users],
  ["Courses & classes", "/education", BookOpen], ["Families", "/admin/families", House], ["Attendance", "/admin/attendance", CalendarRange],
  ["Assistance", "/admin/assistance", HandHeart], ["Finance", "/admin/finance", CircleDollarSign], ["Salaries & transactions", "/admin/finance", WalletCards],
  ["Analytics", "/admin/analytics", BarChart3], ["Calendar", "/calendar", CalendarDays], ["Notifications", "/admin/notifications", Bell],
] as const;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  return <div className="sba-admin-shell"><button className="sba-admin-menu" aria-label="Open admin navigation" onClick={() => setOpen(true)}><Menu size={20} /> Menu</button><div className={`sba-admin-scrim ${open ? "is-open" : ""}`} onClick={() => setOpen(false)} />
    <aside className={`sba-admin-sidebar ${open ? "is-open" : ""}`}><div className="sba-admin-brand"><span>SBA</span><div><strong>Operations</strong><small>Administration</small></div><button aria-label="Close admin navigation" onClick={() => setOpen(false)}><X size={18} /></button></div><nav aria-label="Admin modules">{links.map(([label, href, Icon], index) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href) && !(href === "/admin/finance" && index === 8); return <Link key={`${label}-${index}`} href={href} className={active ? "is-active" : ""} onClick={() => setOpen(false)}><Icon size={17} /><span>{label}</span></Link>; })}</nav><Link href="/dashboard" className="sba-admin-return">Account dashboard</Link></aside>
    <div className="sba-admin-content">{children}</div>
  </div>;
}
