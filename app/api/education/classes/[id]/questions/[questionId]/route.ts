import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, questionId } = await params;
  const klass = await prisma.class.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });

  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const canManage = session.user.role === "ADMIN" || klass.teacherId === session.user.id;
  if (!canManage) {
    return NextResponse.json({ error: "Only the teacher can update questions" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.answered !== "boolean") {
    return NextResponse.json({ error: "answered must be true or false" }, { status: 400 });
  }

  const existing = await prisma.classQuestion.findFirst({
    where: { id: questionId, classId: id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const updated = await prisma.classQuestion.update({
    where: { id: questionId },
    data: {
      answered: body.answered,
      answeredAt: body.answered ? new Date() : null,
    },
    include: { student: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    question: {
      id: updated.id,
      question: updated.question,
      answered: updated.answered,
      answeredAt: updated.answeredAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      student: updated.student,
    },
  });
}
