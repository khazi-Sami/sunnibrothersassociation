CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'UNMARKED');
ALTER TABLE "ClassAttendance" ADD COLUMN "status" "AttendanceStatus" NOT NULL DEFAULT 'UNMARKED';
ALTER TABLE "ClassAttendance" ADD COLUMN "markedById" TEXT;
ALTER TABLE "ClassAttendance" ADD COLUMN "markedAt" TIMESTAMP(3);
ALTER TABLE "ClassAttendance" ADD COLUMN "notes" TEXT;
ALTER TABLE "ClassAttendance" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ClassAttendance" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ClassAttendance_markedById_idx" ON "ClassAttendance"("markedById");
