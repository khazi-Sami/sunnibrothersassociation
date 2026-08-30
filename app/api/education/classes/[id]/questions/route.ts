import { NextResponse } from "next/server";
import { getCurrentDatabaseUser } from "@/lib/databaseAuth";
import { autoExpireClassIfNeeded } from "@/lib/education/liveClasses";
import { getPrisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await autoExpireClassIfNeeded(id);

  const access = await getClassQuestionAccess(id, user.id, user.role, user.teacherProfile?.status);
  if (!access.klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (!access.canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const questions = await prisma.classQuestion.findMany({
    where: { classId: id },
    orderBy: { createdAt: "asc" },
    include: { student: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ questions: questions.map(serializeQuestion) });
}

export async function POST(req: Request, { params }: RouteContext) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await autoExpireClassIfNeeded(id);

  const access = await getClassQuestionAccess(id, user.id, user.role, user.teacherProfile?.status);
  if (!access.klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (!access.canAsk) {
    return NextResponse.json({ error: "Only enrolled students can ask questions in this class" }, { status: 403 });
  }

  if (access.klass.status !== "LIVE") {
    return NextResponse.json({ error: "Questions can only be asked while the class is live" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const question = String(body?.question ?? "").trim();

  if (question.length < 3 || question.length > 800) {
    return NextResponse.json({ error: "Question must be between 3 and 800 characters" }, { status: 400 });
  }

  const created = await prisma.classQuestion.create({
    data: { classId: id, studentId: user.id, question },
    include: { student: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ question: serializeQuestion(created) }, { status: 201 });
}

async function getClassQuestionAccess(classId: string, userId: string, role: string, teacherStatus?: string | null) {
  const prisma = getPrisma();
  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      teacherId: true,
      status: true,
      course: {
        select: {
          enrollments: {
            where: { studentId: userId },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!klass) {
    return { klass: null, canRead: false, canAsk: false };
  }

  const isTeacher = role === "ADMIN" || (role === "TEACHER" && teacherStatus === "ACTIVE" && klass.teacherId === userId);
  const isEnrolledStudent = role === "STUDENT" && klass.course.enrollments.length > 0;

  return {
    klass,
    canRead: isTeacher || isEnrolledStudent,
    canAsk: isEnrolledStudent,
  };
}

function serializeQuestion(question: {
  id: string;
  question: string;
  answered: boolean;
  answeredAt: Date | null;
  createdAt: Date;
  student: { id: string; name: string | null; email: string };
}) {
  return {
    id: question.id,
    question: question.question,
    answered: question.answered,
    answeredAt: question.answeredAt?.toISOString() ?? null,
    createdAt: question.createdAt.toISOString(),
    student: question.student,
  };
}
