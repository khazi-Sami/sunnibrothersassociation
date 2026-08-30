import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireRole(...roles: Array<"ADMIN" | "TEACHER" | "STUDENT">) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!roles.includes(session.user.role)) redirect("/dashboard");
  return session;
}
