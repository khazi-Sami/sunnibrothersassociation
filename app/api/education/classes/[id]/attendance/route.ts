import { NextResponse } from "next/server";
import { getCurrentDatabaseUser, canTeach } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";

async function load(id: string) {
  const user = await getCurrentDatabaseUser();
  if (!user) return { user: null, klass: null };
  const klass = await getPrisma().class.findUnique({ where: { id }, select: { id: true, title: true, teacherId: true, scheduledAt: true, course: { select: { id: true, title: true, enrollments: { include: { student: { select: { id: true, name: true, email: true, studentProfile: { select: { fullName: true, gradeOrClass: true } } } } } } } } } });
  return { user, klass };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { user, klass } = await load(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!klass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (user.role === "STUDENT") { const own = await getPrisma().classAttendance.findUnique({ where: { classId_studentId: { classId: id, studentId: user.id } } }); return NextResponse.json({ attendance: own ? [own] : [] }); }
  if (!(user.role === "ADMIN" || (canTeach(user) && klass.teacherId === user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await getPrisma().classAttendance.findMany({ where: { classId: id }, include: { student: { select: { id: true, name: true, email: true, studentProfile: { select: { fullName: true, gradeOrClass: true } } } }, markedBy: { select: { name: true, email: true } } } });
  return NextResponse.json({ class: { id: klass.id, title: klass.title, scheduledAt: klass.scheduledAt, course: klass.course }, students: klass.course.enrollments.map((e) => ({ student: e.student, attendance: rows.find((row) => row.studentId === e.studentId) ?? null })) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { user, klass } = await load(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!klass || !(user.role === "ADMIN" || (canTeach(user) && klass.teacherId === user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null); if (!Array.isArray(body?.updates)) return NextResponse.json({ error: "updates must be an array" }, { status: 400 });
  const allowed = new Set(klass.course.enrollments.map((e) => e.studentId)); const prisma = getPrisma();
  try { const result = await prisma.$transaction(body.updates.map((item: { studentId?: string; status?: string; notes?: string }) => { if (!item.studentId || !allowed.has(item.studentId) || !ATTENDANCE_STATUSES.includes(item.status as typeof ATTENDANCE_STATUSES[number]) || (item.notes && item.notes.length > 500)) throw new Error("Invalid attendance update"); return prisma.classAttendance.upsert({ where: { classId_studentId: { classId: id, studentId: item.studentId } }, create: { classId: id, studentId: item.studentId, status: item.status as typeof ATTENDANCE_STATUSES[number], notes: item.notes?.trim() || null, markedById: user.id, markedAt: item.status === "UNMARKED" ? null : new Date() }, update: { status: item.status as typeof ATTENDANCE_STATUSES[number], notes: item.notes?.trim() || null, markedById: user.id, markedAt: item.status === "UNMARKED" ? null : new Date() } }); })); return NextResponse.json({ attendance: result }); } catch { return NextResponse.json({ error: "Invalid attendance update" }, { status: 400 }); }
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const {user,klass}=await load(id);if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!klass||user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const studentId=new URL(req.url).searchParams.get("studentId");if(!studentId)return NextResponse.json({error:"studentId is required"},{status:400});try{await getPrisma().classAttendance.delete({where:{classId_studentId:{classId:id,studentId}}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Attendance entry not found"},{status:404});}}
