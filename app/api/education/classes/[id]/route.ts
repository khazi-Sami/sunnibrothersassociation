import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { autoExpireClassIfNeeded } from "@/lib/education/liveClasses";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await autoExpireClassIfNeeded(id);

  const klass = await prisma.class.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      course: {
        select: {
          id: true,
          title: true,
          enrollments: {
            where: { studentId: session.user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const isTeacher = session.user.role === "ADMIN" || klass.teacherId === session.user.id;
  const isEnrolled = klass.course.enrollments.length > 0;

  if (!isTeacher && !isEnrolled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    class: {
      id: klass.id,
      title: klass.title,
      description: klass.description,
      roomName: klass.roomName,
      status: klass.status,
      scheduledAt: klass.scheduledAt,
      durationMinutes: klass.durationMinutes,
      teacher: klass.teacher,
      course: { id: klass.course.id, title: klass.course.title },
      canStart: isTeacher && klass.status === "SCHEDULED",
      canEnd: isTeacher && klass.status === "LIVE",
      canJoin: isTeacher || (isEnrolled && klass.status === "LIVE"),
      role: isTeacher ? "TEACHER" : "STUDENT",
    },
  });
}
