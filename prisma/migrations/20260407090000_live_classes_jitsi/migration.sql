-- Ensure ClassStatus enum exists on clean databases.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassStatus') THEN
    CREATE TYPE "ClassStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');
  END IF;
END $$;

-- Normalize existing enum values from older deployments.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassStatus') THEN
    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'ClassStatus' AND e.enumlabel = 'COMPLETED'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'ClassStatus' AND e.enumlabel = 'ENDED'
      ) THEN
      ALTER TYPE "ClassStatus" RENAME VALUE 'COMPLETED' TO 'ENDED';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'ClassStatus' AND e.enumlabel = 'CANCELLED'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'ClassStatus' AND e.enumlabel = 'ENDED'
      ) THEN
      ALTER TYPE "ClassStatus" RENAME VALUE 'CANCELLED' TO 'ENDED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'ClassStatus' AND e.enumlabel = 'LIVE'
    ) THEN
      ALTER TYPE "ClassStatus" ADD VALUE 'LIVE';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'ClassStatus' AND e.enumlabel = 'ENDED'
    ) THEN
      ALTER TYPE "ClassStatus" ADD VALUE 'ENDED';
    END IF;
  END IF;
END $$;

-- Ensure baseline Class table exists for clean migration history.
CREATE TABLE IF NOT EXISTS "Class" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "status" "ClassStatus" NOT NULL DEFAULT 'SCHEDULED',
  "teacherId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Class_teacherId_idx" ON "Class"("teacherId");
CREATE INDEX IF NOT EXISTS "Class_scheduledAt_idx" ON "Class"("scheduledAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Class_teacherId_fkey'
      AND table_name = 'Class'
  ) THEN
    ALTER TABLE "Class"
      ADD CONSTRAINT "Class_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Course" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "teacherId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Course_teacherId_idx" ON "Course"("teacherId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Course_teacherId_fkey'
      AND table_name = 'Course'
  ) THEN
    ALTER TABLE "Course"
      ADD CONSTRAINT "Course_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Enrollment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Enrollment_studentId_idx" ON "Enrollment"("studentId");
CREATE INDEX IF NOT EXISTS "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_studentId_courseId_key" ON "Enrollment"("studentId", "courseId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Enrollment_studentId_fkey'
      AND table_name = 'Enrollment'
  ) THEN
    ALTER TABLE "Enrollment"
      ADD CONSTRAINT "Enrollment_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Enrollment_courseId_fkey'
      AND table_name = 'Enrollment'
  ) THEN
    ALTER TABLE "Enrollment"
      ADD CONSTRAINT "Enrollment_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "roomName" TEXT;

-- Ensure Recording table exists for clean migration history.
CREATE TABLE IF NOT EXISTS "Recording" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Recording_classId_idx" ON "Recording"("classId");
CREATE INDEX IF NOT EXISTS "Recording_createdById_idx" ON "Recording"("createdById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Recording_classId_fkey'
      AND table_name = 'Recording'
  ) THEN
    ALTER TABLE "Recording"
      ADD CONSTRAINT "Recording_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Recording_createdById_fkey'
      AND table_name = 'Recording'
  ) THEN
    ALTER TABLE "Recording"
      ADD CONSTRAINT "Recording_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill missing room names for existing classes.
UPDATE "Class"
SET "roomName" = COALESCE("roomName", 'room-' || "id")
WHERE "roomName" IS NULL;

-- Backfill courseId by creating one legacy course per teacher.
INSERT INTO "Course" ("id", "title", "description", "teacherId", "createdAt", "updatedAt")
SELECT
  'legacy-' || c."teacherId",
  'General Course',
  'Legacy auto-generated course for existing classes',
  c."teacherId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Class" c
LEFT JOIN "Course" co ON co."id" = 'legacy-' || c."teacherId"
WHERE c."teacherId" IS NOT NULL
  AND co."id" IS NULL
GROUP BY c."teacherId";

UPDATE "Class"
SET "courseId" = COALESCE("courseId", 'legacy-' || "teacherId")
WHERE "courseId" IS NULL;

ALTER TABLE "Class" ALTER COLUMN "courseId" SET NOT NULL;
ALTER TABLE "Class" ALTER COLUMN "roomName" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Class_courseId_idx" ON "Class"("courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "Class_roomName_key" ON "Class"("roomName");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Class_courseId_fkey'
      AND table_name = 'Class'
  ) THEN
    ALTER TABLE "Class"
      ADD CONSTRAINT "Class_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Keep older deployments compatible if this column existed before the migration.
ALTER TABLE "Class" DROP COLUMN IF EXISTS "meetLink";
