import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { autoExpireClassIfNeeded } from "@/lib/education/liveClasses";
import { parseClassMediaInput } from "@/lib/education/videoLinks";

export async function GET() {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Auto-expire classes that passed their duration window.
  const liveClasses = await prisma.class.findMany({
    where: { status: "LIVE" },
    select: { id: true },
  });
  await Promise.all(liveClasses.map((klass) => autoExpireClassIfNeeded(klass.id)));

  const baseWhere = {
    OR: [{ status: "SCHEDULED" as const }, { status: "LIVE" as const }],
    scheduledAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
  };

  if (session.user.role === "ADMIN") {
    const classes = await prisma.class.findMany({
      where: baseWhere,
      orderBy: { scheduledAt: "asc" },
      include: {
        teacher: { select: { name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ classes });
  }

  if (session.user.role === "TEACHER") {
    const classes = await prisma.class.findMany({
      where: { ...baseWhere, teacherId: session.user.id },
      orderBy: { scheduledAt: "asc" },
      include: {
        teacher: { select: { name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
    return NextResponse.json({ classes });
  }

  const classes = await prisma.class.findMany({
    where: {
      ...baseWhere,
      course: { enrollments: { some: { studentId: session.user.id } } },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      teacher: { select: { name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only teachers can schedule classes" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const title = String(body.title ?? "").trim();
  const courseId = String(body.courseId ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const scheduledAtRaw = String(body.scheduledAt ?? "").trim();
  const durationMinutes = Number(body.durationMinutes ?? 60);
  const media = parseClassMediaInput(body.classType, body.youtubeUrl, body.googleMeetUrl);

  if (!title || !courseId || !scheduledAtRaw || Number.isNaN(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
    return NextResponse.json({ error: "title, courseId, scheduledAt, and valid durationMinutes are required" }, { status: 400 });
  }

  if (!media.ok) {
    return NextResponse.json({ error: media.error }, { status: 400 });
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  if (scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "scheduledAt must be in the future" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (session.user.role === "TEACHER" && course.teacherId !== session.user.id) {
    return NextResponse.json({ error: "You can only schedule classes for your own course" }, { status: 403 });
  }

  const created = await prisma.class.create({
    data: {
      courseId,
      title,
      description,
      classType: media.value.classType,
      youtubeVideoId: media.value.youtubeVideoId,
      googleMeetUrl: media.value.googleMeetUrl,
      scheduledAt,
      durationMinutes,
      teacherId: session.user.role === "ADMIN" ? course.teacherId : session.user.id,
    },
  });

  return NextResponse.json({ class: created }, { status: 201 });
}
