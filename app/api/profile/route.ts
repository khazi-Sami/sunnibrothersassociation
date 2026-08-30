import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCurrentDatabaseUser } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";
import { IncomeRange } from "@prisma/client";

const interests = new Set(["Quran", "Tajweed", "Seerah", "Fiqh", "Hadith", "Islamic History", "Arabic", "Other"]);
const limits: Record<string, number> = { fullName: 120, phone: 30, city: 80, schoolOrCollege: 160, gradeOrClass: 80, guardianName: 120, guardianPhone: 30, introducedBy: 160, likesAboutSba: 1000, contributionInterest: 1000, improvementSuggestion: 1000, learningGoal: 500, qualifications: 500, teachingExperience: 500, shortBio: 1000, availability: 500 };

function clean(value: unknown, field: string) {
  const result = typeof value === "string" ? value.trim() : "";
  return result.length > (limits[field] ?? 500) ? null : result || null;
}

function safeUrl(value: unknown) {
  const raw = clean(value, "profileImage");
  if (!raw) return null;
  try { const url = new URL(raw); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, studentProfile: { include: { family: { select: { familyName: true, primaryGuardianName: true, primaryGuardianPhone: true, primaryGuardianRelationship: true, secondaryGuardianName: true, secondaryGuardianPhone: true, secondaryGuardianRelationship: true, city: true, address: true, householdSize: true, primaryOccupation: true, incomeRange: true } } } }, teacherProfile: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, profile: user.role === "STUDENT" ? user.studentProfile : user.role === "TEACHER" ? user.teacherProfile : null });
}

export async function PATCH(req: Request) {
  const user = await getCurrentDatabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "ADMIN") return NextResponse.json({ error: "Admin profile editing is not enabled yet" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const input = body as Record<string, unknown>;
  const fullName = clean(input.fullName, "fullName");
  if (!fullName) return NextResponse.json({ error: "Full name is required and must be 120 characters or fewer" }, { status: 400 });
  const prisma = getPrisma();
  const data = user.role === "STUDENT" ? {
    fullName, phone: clean(input.phone, "phone"), dateOfBirth: typeof input.dateOfBirth === "string" && input.dateOfBirth && !Number.isNaN(new Date(input.dateOfBirth).getTime()) ? new Date(input.dateOfBirth) : null,
    schoolOrCollege: clean(input.schoolOrCollege, "schoolOrCollege"), gradeOrClass: clean(input.gradeOrClass, "gradeOrClass"), guardianName: clean(input.guardianName, "guardianName"), guardianPhone: clean(input.guardianPhone, "guardianPhone"), city: clean(input.city, "city"), introducedBy: clean(input.introducedBy, "introducedBy"), likesAboutSba: clean(input.likesAboutSba, "likesAboutSba"), contributionInterest: clean(input.contributionInterest, "contributionInterest"), improvementSuggestion: clean(input.improvementSuggestion, "improvementSuggestion"), learningInterests: Array.isArray(input.learningInterests) ? input.learningInterests.filter((item: unknown): item is string => typeof item === "string" && interests.has(item)).slice(0, 8) : [], learningGoal: clean(input.learningGoal, "learningGoal"),
  } : {
    fullName, phone: clean(input.phone, "phone"), city: clean(input.city, "city"), profileImage: safeUrl(input.profileImage), qualifications: clean(input.qualifications, "qualifications"), teachingExperience: clean(input.teachingExperience, "teachingExperience"), subjects: Array.isArray(input.subjects) ? input.subjects.filter((item: unknown): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 12) : [], languages: Array.isArray(input.languages) ? input.languages.filter((item: unknown): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 12) : [], shortBio: clean(input.shortBio, "shortBio"), availability: clean(input.availability, "availability"),
  };
  const profile = user.role === "STUDENT" ? await prisma.studentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data }) : await prisma.teacherProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  if (user.role === "STUDENT" && input.family && typeof input.family === "object") {
    const family = input.family as Record<string, unknown>;
    const familyData = { familyName: clean(family.familyName, "familyName"), primaryGuardianName: clean(family.primaryGuardianName, "fullName") ?? "", primaryGuardianPhone: clean(family.primaryGuardianPhone, "phone") ?? "", primaryGuardianRelationship: clean(family.primaryGuardianRelationship, "fullName") ?? "", secondaryGuardianName: clean(family.secondaryGuardianName, "fullName"), secondaryGuardianPhone: clean(family.secondaryGuardianPhone, "phone"), secondaryGuardianRelationship: clean(family.secondaryGuardianRelationship, "fullName"), city: clean(family.city, "city") ?? "", address: clean(family.address, "city"), householdSize: typeof family.householdSize === "number" ? Math.max(1, Math.min(50, Math.trunc(family.householdSize))) : null, primaryOccupation: clean(family.primaryOccupation, "schoolOrCollege"), incomeRange: typeof family.incomeRange === "string" && ["BELOW_10000", "INR_10000_20000", "INR_20000_30000", "INR_30000_50000", "INR_50000_100000", "ABOVE_100000", "PREFER_NOT_TO_SAY"].includes(family.incomeRange) ? family.incomeRange as IncomeRange : IncomeRange.PREFER_NOT_TO_SAY };
    if (familyData.primaryGuardianName && familyData.primaryGuardianPhone && familyData.primaryGuardianRelationship && familyData.city) {
      const existingMember = await prisma.familyMember.findUnique({ where: { userId: user.id }, select: { familyId: true } });
      const familyRecord = existingMember ? await prisma.family.update({ where: { id: existingMember.familyId }, data: familyData }) : await prisma.family.create({ data: familyData });
      if (!existingMember) await prisma.familyMember.create({ data: { familyId: familyRecord.id, userId: user.id, relationship: "CHILD" } });
      await prisma.studentProfile.update({ where: { userId: user.id }, data: { familyId: familyRecord.id } });
    }
  }
  await prisma.adminNotification.create({ data: { type: `${user.role}_PROFILE_UPDATED`, actorUserId: user.id, title: `${user.role === "STUDENT" ? "Student" : "Teacher"} profile updated`, message: `${fullName} updated their profile.`, entityType: "profile", entityId: profile.id, changedFields: Object.keys(data) } });
  return NextResponse.json({ profile });
}
