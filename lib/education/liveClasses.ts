import type { ClassStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export function computeClassStatus(
  scheduledAt: Date,
  durationMinutes: number,
  storedStatus: ClassStatus
): ClassStatus {
  if (storedStatus === "ENDED" || storedStatus === "CANCELLED") {
    return storedStatus;
  }

  const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
  if (new Date() >= endAt) {
    return "ENDED";
  }

  return storedStatus;
}

export async function autoExpireClassIfNeeded(classId: string): Promise<void> {
  const prisma = getPrisma();

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, scheduledAt: true, durationMinutes: true, status: true },
  });

  if (!klass) return;

  const effectiveStatus = computeClassStatus(klass.scheduledAt, klass.durationMinutes, klass.status);
  if (effectiveStatus === "ENDED" && klass.status !== "ENDED") {
    await prisma.class.update({
      where: { id: classId },
      data: { status: "ENDED" },
    });
  }
}
