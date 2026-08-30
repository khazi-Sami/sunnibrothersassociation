import { NextResponse } from "next/server";
import { getCurrentDatabaseUser, canTeach } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["STUDENT", "TEACHER", "ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const courseId = String(body.courseId ?? "").trim();
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }
  const requestedStudentId = String(body.studentId ?? "").trim();

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const studentId = user.role === "STUDENT" ? user.id : requestedStudentId;
  if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (user.role === "TEACHER" && (!canTeach(user) || course.teacherId !== user.id)) return NextResponse.json({ error: "You can only enroll students in your own course" }, { status: 403 });

  try {
    const enrollment = await prisma.enrollment.create({
      data: {
        courseId,
        studentId,
      },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Already enrolled in this course" }, { status: 409 });
  }
}
