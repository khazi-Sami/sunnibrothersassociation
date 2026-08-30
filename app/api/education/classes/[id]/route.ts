import { NextResponse } from "next/server";
import { getCurrentDatabaseUser, canTeach } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";
import { autoExpireClassIfNeeded } from "@/lib/education/liveClasses";
import { parseClassMediaInput } from "@/lib/education/videoLinks";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
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
            where: { studentId: user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const isTeacher = user.role === "ADMIN" || (user.role === "TEACHER" && user.teacherProfile?.status === "ACTIVE" && klass.teacherId === user.id);
  const isEnrolled = klass.course.enrollments.length > 0;

  if (!isTeacher && !isEnrolled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    class: {
      id: klass.id,
      title: klass.title,
      description: klass.description,
      classType: klass.classType,
      youtubeVideoId: klass.youtubeVideoId,
      googleMeetUrl: klass.googleMeetUrl,
      status: klass.status,
      scheduledAt: klass.scheduledAt,
      durationMinutes: klass.durationMinutes,
      teacher: klass.teacher,
      course: { id: klass.course.id, title: klass.course.title },
      canStart: isTeacher && klass.status === "SCHEDULED",
      canEnd: isTeacher && klass.status === "LIVE",
      canCancel: isTeacher && (klass.status === "SCHEDULED" || klass.status === "LIVE"),
      canEdit: isTeacher && klass.status !== "ENDED" && klass.status !== "CANCELLED",
      canJoin: isTeacher || (isEnrolled && klass.status === "LIVE"),
      role: isTeacher ? "TEACHER" : "STUDENT",
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canTeach(user)) {
    return NextResponse.json({ error: "Only teachers can update classes" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const existing = await prisma.class.findUnique({
    where: { id },
    select: { id: true, teacherId: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (user.role === "TEACHER" && existing.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.status === "ENDED" || existing.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot edit an ended or cancelled class" }, { status: 400 });
  }

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

  if (existing.status === "SCHEDULED" && scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "scheduledAt must be in the future" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (user.role === "TEACHER" && course.teacherId !== user.id) {
    return NextResponse.json({ error: "You can only move classes to your own courses" }, { status: 403 });
  }

  const updated = await prisma.class.update({
    where: { id },
    data: {
      courseId,
      teacherId: course.teacherId,
      title,
      description,
      classType: media.value.classType,
      youtubeVideoId: media.value.youtubeVideoId,
      googleMeetUrl: media.value.googleMeetUrl,
      scheduledAt,
      durationMinutes,
    },
  });

  return NextResponse.json({ class: updated });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { const user=await getCurrentDatabaseUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401}); if(user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403}); const {id}=await params; const prisma=getPrisma(); const klass=await prisma.class.findUnique({where:{id},select:{_count:{select:{attendances:true,questions:true,recordings:true}}}}); if(!klass)return NextResponse.json({error:"Class not found"},{status:404}); const history=Object.values(klass._count).reduce((sum,value)=>sum+value,0); if(history){await prisma.class.update({where:{id},data:{status:"CANCELLED"}});return NextResponse.json({ok:true,action:"cancelled",message:"Class history was preserved and the class was cancelled."});} await prisma.class.delete({where:{id}});return NextResponse.json({ok:true,action:"deleted"}); }
