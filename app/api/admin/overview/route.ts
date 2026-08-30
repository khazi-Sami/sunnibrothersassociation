import { NextResponse } from "next/server";
import { getCurrentDatabaseUser } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentDatabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma(); const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1);
  const [students, teachers, activeTeachers, courses, upcomingClasses, todayClasses, enrollments, notifications] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }), prisma.user.count({ where: { role: "TEACHER" } }), prisma.teacherProfile.count({ where: { status: "ACTIVE" } }), prisma.course.count(), prisma.class.count({ where: { scheduledAt: { gte: now }, status: "SCHEDULED" } }), prisma.class.count({ where: { scheduledAt: { gte: start, lt: end } } }), prisma.enrollment.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { student: { select: { name: true, email: true } }, course: { select: { title: true } } } }), prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, message: true, isRead: true, createdAt: true } }),
  ]);
  return NextResponse.json({ counts: { students, teachers, activeTeachers, courses, upcomingClasses, todayClasses }, enrollments, notifications });
}
