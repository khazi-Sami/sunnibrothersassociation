import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { autoExpireClassIfNeeded } from "@/lib/education/liveClasses";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only teachers can start classes" }, { status: 403 });
  }

  const { id } = await params;
  await autoExpireClassIfNeeded(id);

  const klass = await prisma.class.findUnique({ where: { id } });
  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (session.user.role === "TEACHER" && klass.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (klass.status === "ENDED") {
    return NextResponse.json({ error: "Cannot start an ended class" }, { status: 400 });
  }

  const updated = await prisma.class.update({
    where: { id },
    data: { status: "LIVE" },
  });

  return NextResponse.json({ class: updated });
}
