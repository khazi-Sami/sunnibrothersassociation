import { NextResponse } from "next/server";
import { getCurrentDatabaseUser, canTeach } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canTeach(user)) {
    return NextResponse.json({ error: "Only teachers can cancel classes" }, { status: 403 });
  }

  const { id } = await params;
  const klass = await prisma.class.findUnique({ where: { id } });
  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (user.role === "TEACHER" && klass.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (klass.status === "ENDED" || klass.status === "CANCELLED") {
    return NextResponse.json({ error: "Cannot cancel an ended or already cancelled class" }, { status: 400 });
  }

  const updated = await prisma.class.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ class: updated });
}
