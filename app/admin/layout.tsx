import AdminShell from "@/app/components/sba/AdminShell";
import { requireRole } from "@/lib/roleAccess";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return <AdminShell>{children}</AdminShell>;
}
