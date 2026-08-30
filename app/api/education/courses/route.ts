import { NextResponse } from "next/server";
import { getCurrentDatabaseUser, canTeach } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ courses });
  }

  if (user.role === "TEACHER") {
    const courses = await prisma.course.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ courses });
  }

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      enrollments: {
        where: { studentId: user.id },
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      teacher: course.teacher,
      isEnrolled: course.enrollments.length > 0,
    })),
  });
}

export async function POST(req: Request) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canTeach(user)) {
    return NextResponse.json({ error: "Only teachers can create courses" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const requestedTeacherId = String(body.teacherId ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  let teacherId = user.id;
  if (user.role === "ADMIN") {
    if (!requestedTeacherId) return NextResponse.json({ error: "teacherId is required for admin-created courses" }, { status: 400 });
    const teacher = await prisma.user.findFirst({ where: { id: requestedTeacherId, role: "TEACHER" }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: "Assigned user must be a teacher" }, { status: 400 });
    teacherId = teacher.id;
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      teacherId,
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
