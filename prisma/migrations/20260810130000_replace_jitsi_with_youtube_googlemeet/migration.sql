-- Add the class delivery type used by YouTube Live and Google Meet classes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassType') THEN
    CREATE TYPE "ClassType" AS ENUM ('YOUTUBE_LIVE', 'GOOGLE_MEET');
  END IF;
END $$;

-- Reintroduce CANCELLED as a valid terminal status after the legacy Jitsi migration
-- normalized older cancelled values into ENDED.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassStatus')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'ClassStatus' AND e.enumlabel = 'CANCELLED'
    ) THEN
    ALTER TYPE "ClassStatus" ADD VALUE 'CANCELLED';
  END IF;
END $$;

ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "classType" "ClassType" NOT NULL DEFAULT 'YOUTUBE_LIVE';
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "youtubeVideoId" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "googleMeetUrl" TEXT;

DROP INDEX IF EXISTS "Class_roomName_key";
ALTER TABLE "Class" DROP COLUMN IF EXISTS "roomName";

ALTER TABLE "Recording" ADD COLUMN IF NOT EXISTS "youtubeVideoId" TEXT;
