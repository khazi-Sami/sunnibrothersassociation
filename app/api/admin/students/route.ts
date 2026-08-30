import { NextResponse } from "next/server";
import { getCurrentDatabaseUser } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentDatabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const students = await getPrisma().user.findMany({ where: { role: "STUDENT", ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}) }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, email: true, createdAt: true, studentProfile: true, enrollments: { include: { course: { select: { id: true, title: true, classes: { select: { id: true, title: true, scheduledAt: true, status: true } } } } } } } });
  return NextResponse.json({ students });
}
