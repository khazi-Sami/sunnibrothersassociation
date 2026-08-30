import { NextResponse } from "next/server";
import { getCurrentDatabaseUser, canTeach } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ courses });
  }

  if (user.role === "TEACHER") {
    const courses = await prisma.course.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ courses });
  }

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      enrollments: {
        where: { studentId: user.id },
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      teacher: course.teacher,
      isEnrolled: course.enrollments.length > 0,
    })),
  });
}

export async function POST(req: Request) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canTeach(user)) {
    return NextResponse.json({ error: "Only teachers can create courses" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const requestedTeacherId = String(body.teacherId ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  let teacherId = user.id;
  if (user.role === "ADMIN") {
    if (!requestedTeacherId) return NextResponse.json({ error: "teacherId is required for admin-created courses" }, { status: 400 });
    const teacher = await prisma.user.findFirst({ where: { id: requestedTeacherId, role: "TEACHER" }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: "Assigned user must be a teacher" }, { status: 400 });
    teacherId = teacher.id;
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      teacherId,
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}

export async function PATCH(req: Request) { const user=await getCurrentDatabaseUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401}); if(!canTeach(user))return NextResponse.json({error:"Forbidden"},{status:403}); const body=await req.json().catch(()=>null); const id=String(body?.id??""); const title=String(body?.title??"").trim(); const description=String(body?.description??"").trim()||null; if(!id||!title||title.length>160)return NextResponse.json({error:"Valid id and title are required"},{status:400}); const prisma=getPrisma(); const existing=await prisma.course.findUnique({where:{id},select:{teacherId:true}}); if(!existing)return NextResponse.json({error:"Course not found"},{status:404}); if(user.role==="TEACHER"&&existing.teacherId!==user.id)return NextResponse.json({error:"Forbidden"},{status:403}); let teacherId=existing.teacherId; if(user.role==="ADMIN"&&body.teacherId){const teacher=await prisma.user.findFirst({where:{id:String(body.teacherId),role:"TEACHER"},select:{id:true}});if(!teacher)return NextResponse.json({error:"Assigned user must be a teacher"},{status:400});teacherId=teacher.id;} return NextResponse.json({course:await prisma.course.update({where:{id},data:{title,description,teacherId}})}); }

export async function DELETE(req: Request) { const user=await getCurrentDatabaseUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401}); if(user.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403}); const id=new URL(req.url).searchParams.get("id"); if(!id)return NextResponse.json({error:"id is required"},{status:400}); const prisma=getPrisma(); const course=await prisma.course.findUnique({where:{id},select:{_count:{select:{classes:true,enrollments:true}}}}); if(!course)return NextResponse.json({error:"Course not found"},{status:404}); if(course._count.classes||course._count.enrollments)return NextResponse.json({error:"Course has classes or enrollments. Preserve class history instead of deleting it."},{status:409}); await prisma.course.delete({where:{id}}); return NextResponse.json({ok:true}); }
