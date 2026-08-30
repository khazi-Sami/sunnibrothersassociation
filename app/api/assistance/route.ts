import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDatabaseUser } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

const requestSchema = z.object({ assistanceType: z.enum(["SCHOOL_FEES", "BOOKS", "EDUCATION", "EMERGENCY", "OTHER"]), summary: z.string().trim().min(3).max(2000), requestedAmount: z.number().int().positive().max(100000000).optional() });
const reviewSchema = z.object({ id: z.string().min(1), status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "PARTIALLY_APPROVED", "DECLINED", "CLOSED"]), approvedAmount: z.number().int().nonnegative().max(100000000).nullable().optional(), adminNotes: z.string().trim().max(2000).nullable().optional() });

export async function GET() {
  const user = await getCurrentDatabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "ADMIN") return NextResponse.json({ requests: await getPrisma().financialAssistanceRequest.findMany({ orderBy: { createdAt: "desc" }, include: { student: { select: { id: true, name: true, email: true } }, family: true } }) });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ requests: await getPrisma().financialAssistanceRequest.findMany({ where: { studentId: user.id }, orderBy: { createdAt: "desc" } }) });
}

export async function POST(req: Request) {
  const user = await getCurrentDatabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Only students can submit assistance requests" }, { status: 403 });
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid assistance request" }, { status: 400 });
  const request = await getPrisma().financialAssistanceRequest.create({ data: { ...parsed.data, studentId: user.id, familyId: (await getPrisma().studentProfile.findUnique({ where: { userId: user.id }, select: { familyId: true } }))?.familyId ?? null } });
  await getPrisma().adminNotification.create({ data: { type: "ASSISTANCE_REQUESTED", actorUserId: user.id, title: "Financial assistance requested", message: "A student submitted a financial assistance request.", entityType: "assistance", entityId: request.id } });
  return NextResponse.json({ request }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getCurrentDatabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  try { const request = await getPrisma().financialAssistanceRequest.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status, approvedAmount: parsed.data.approvedAmount, adminNotes: parsed.data.adminNotes, reviewedById: user.id, reviewedAt: new Date() } }); return NextResponse.json({ request }); } catch { return NextResponse.json({ error: "Request not found" }, { status: 404 }); }
}

export async function DELETE(req:Request){const user=await getCurrentDatabaseUser();if(user?.role!=="ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});const id=new URL(req.url).searchParams.get("id");if(!id)return NextResponse.json({error:"id is required"},{status:400});const prisma=getPrisma();const item=await prisma.financialAssistanceRequest.findUnique({where:{id},select:{status:true,approvedAmount:true}});if(!item)return NextResponse.json({error:"Request not found"},{status:404});if(item.approvedAmount||!["PENDING","CLOSED","DECLINED"].includes(item.status))return NextResponse.json({error:"Reviewed or approved assistance is retained as support history."},{status:409});await prisma.financialAssistanceRequest.delete({where:{id}});return NextResponse.json({ok:true});}
