import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { autoExpireClassIfNeeded } from "@/lib/education/liveClasses";
import LiveClassRoomClient from "./LiveClassRoomClient";

export default async function LiveClassPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const prisma = getPrisma();
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
    notFound();
  }

  const isTeacher = session.user.role === "ADMIN" || session.user.id === klass.teacherId;
  const isEnrolled = klass.course.enrollments.length > 0;

  if (!isTeacher && !isEnrolled) {
    redirect("/education");
  }

  return (
    <LiveClassRoomClient
      initialClass={{
        id: klass.id,
        title: klass.title,
        description: klass.description,
        classType: klass.classType,
        youtubeVideoId: klass.youtubeVideoId,
        googleMeetUrl: klass.googleMeetUrl,
        status: klass.status,
        scheduledAt: klass.scheduledAt.toISOString(),
        durationMinutes: klass.durationMinutes,
        teacher: klass.teacher,
        course: { id: klass.course.id, title: klass.course.title },
        canStart: isTeacher && klass.status === "SCHEDULED",
        canEnd: isTeacher && klass.status === "LIVE",
        canJoin: isTeacher || (isEnrolled && klass.status === "LIVE"),
        role: isTeacher ? "TEACHER" : "STUDENT",
      }}
    />
  );
}
