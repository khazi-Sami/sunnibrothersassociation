CREATE TABLE IF NOT EXISTS "ClassQuestion" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answered" BOOLEAN NOT NULL DEFAULT false,
  "answeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassQuestion_classId_idx" ON "ClassQuestion"("classId");
CREATE INDEX IF NOT EXISTS "ClassQuestion_studentId_idx" ON "ClassQuestion"("studentId");
CREATE INDEX IF NOT EXISTS "ClassQuestion_classId_answered_idx" ON "ClassQuestion"("classId", "answered");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ClassQuestion_classId_fkey'
      AND table_name = 'ClassQuestion'
  ) THEN
    ALTER TABLE "ClassQuestion"
      ADD CONSTRAINT "ClassQuestion_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ClassQuestion_studentId_fkey'
      AND table_name = 'ClassQuestion'
  ) THEN
    ALTER TABLE "ClassQuestion"
      ADD CONSTRAINT "ClassQuestion_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
