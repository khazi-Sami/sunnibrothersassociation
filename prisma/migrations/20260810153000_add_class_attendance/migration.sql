CREATE TABLE IF NOT EXISTS "ClassAttendance" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3),
  "leftAt" TIMESTAMP(3),
  CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassAttendance_classId_studentId_key" ON "ClassAttendance"("classId", "studentId");
CREATE INDEX IF NOT EXISTS "ClassAttendance_classId_idx" ON "ClassAttendance"("classId");
CREATE INDEX IF NOT EXISTS "ClassAttendance_studentId_idx" ON "ClassAttendance"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ClassAttendance_classId_fkey'
      AND table_name = 'ClassAttendance'
  ) THEN
    ALTER TABLE "ClassAttendance"
      ADD CONSTRAINT "ClassAttendance_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ClassAttendance_studentId_fkey'
      AND table_name = 'ClassAttendance'
  ) THEN
    ALTER TABLE "ClassAttendance"
      ADD CONSTRAINT "ClassAttendance_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
