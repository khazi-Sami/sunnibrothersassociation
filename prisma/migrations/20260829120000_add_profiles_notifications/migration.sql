CREATE TYPE "TeacherStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

CREATE TABLE "StudentProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "schoolOrCollege" TEXT,
  "gradeOrClass" TEXT,
  "guardianName" TEXT,
  "guardianPhone" TEXT,
  "city" TEXT,
  "introducedBy" TEXT,
  "likesAboutSba" TEXT,
  "contributionInterest" TEXT,
  "improvementSuggestion" TEXT,
  "learningInterests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "learningGoal" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TeacherProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "city" TEXT,
  "profileImage" TEXT,
  "qualifications" TEXT,
  "teachingExperience" TEXT,
  "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "shortBio" TEXT,
  "availability" TEXT,
  "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AdminNotification" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "actorUserId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminNotification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");
CREATE INDEX "AdminNotification_isRead_createdAt_idx" ON "AdminNotification"("isRead", "createdAt");
