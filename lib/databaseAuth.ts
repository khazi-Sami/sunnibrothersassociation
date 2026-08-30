import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function getCurrentDatabaseUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, teacherProfile: { select: { status: true } } },
  });
}

export function canTeach(user: Awaited<ReturnType<typeof getCurrentDatabaseUser>>) {
  return Boolean(user && (user.role === "ADMIN" || (user.role === "TEACHER" && user.teacherProfile?.status === "ACTIVE")));
}
