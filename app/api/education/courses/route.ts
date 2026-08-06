import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ courses });
  }

  if (session.user.role === "TEACHER") {
    const courses = await prisma.course.findMany({
      where: { teacherId: session.user.id },
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
        where: { studentId: session.user.id },
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
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only teachers can create courses" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      teacherId: session.user.id,
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
