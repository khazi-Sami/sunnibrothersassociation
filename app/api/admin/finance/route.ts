import { NextResponse } from "next/server";
import { getCurrentDatabaseUser } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentDatabaseUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma(); const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const [income, expenses, pendingAssistance, salaryDue, salaryPaid] = await Promise.all([
    prisma.financeTransaction.aggregate({ _sum: { amount: true }, where: { type: "INCOME", transactionDate: { gte: start } } }),
    prisma.financeTransaction.aggregate({ _sum: { amount: true }, where: { type: "EXPENSE", transactionDate: { gte: start } } }),
    prisma.financialAssistanceRequest.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.teacherSalaryPayment.aggregate({ _sum: { finalAmount: true }, where: { status: { in: ["PENDING", "ON_HOLD", "PARTIALLY_PAID"] } } }),
    prisma.teacherSalaryPayment.aggregate({ _sum: { finalAmount: true }, where: { status: "PAID", paidAt: { gte: start } } }),
  ]);
  return NextResponse.json({ income: income._sum.amount ?? 0, expenses: expenses._sum.amount ?? 0, pendingAssistance, salaryDue: salaryDue._sum.finalAmount ?? 0, salaryPaid: salaryPaid._sum.finalAmount ?? 0 });
}
