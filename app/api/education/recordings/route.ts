import { NextResponse } from "next/server";
import { getCurrentDatabaseUser, canTeach } from "@/lib/databaseAuth";
import { getPrisma } from "@/lib/prisma";
import { extractYouTubeVideoId, isYouTubeUrl, normalizeYouTubeWatchUrl } from "@/lib/education/videoLinks";

export async function GET() {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    user.role === "ADMIN"
      ? {}
      : user.role === "TEACHER"
        ? { class: { teacherId: user.id } }
        : { class: { course: { enrollments: { some: { studentId: user.id } } } } };

  const recordings = await prisma.recording.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      class: { select: { id: true, title: true, scheduledAt: true, course: { select: { id: true, title: true } } } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ recordings });
}

export async function POST(req: Request) {
  const prisma = getPrisma();
  const user = await getCurrentDatabaseUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canTeach(user)) {
    return NextResponse.json({ error: "Only teachers can upload recordings" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const classId = String(body.classId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const videoUrl = String(body.videoUrl ?? "").trim();
  const thumbnailUrl = String(body.thumbnailUrl ?? "").trim() || null;
  const youtubeVideoId = extractYouTubeVideoId(videoUrl);

  if (!classId || !title || !videoUrl) {
    return NextResponse.json({ error: "classId, title, and videoUrl are required" }, { status: 400 });
  }

  if (/<\s*iframe/i.test(videoUrl)) {
    return NextResponse.json({ error: "Recording videoUrl must be a URL, not iframe HTML" }, { status: 400 });
  }

  if (isYouTubeUrl(videoUrl) && !youtubeVideoId) {
    return NextResponse.json({ error: "Unsupported YouTube recording URL" }, { status: 400 });
  }

  if (!youtubeVideoId) {
    return NextResponse.json({ error: "Use a valid YouTube recording URL" }, { status: 400 });
  }

  const klass = await prisma.class.findUnique({ where: { id: classId } });
  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (user.role === "TEACHER" && klass.teacherId !== user.id) {
    return NextResponse.json({ error: "You can only add recordings to your classes" }, { status: 403 });
  }

  const recording = await prisma.recording.create({
    data: {
      classId,
      title,
      description,
      videoUrl: normalizeYouTubeWatchUrl(youtubeVideoId),
      youtubeVideoId,
      thumbnailUrl,
      createdById: user.id,
    },
  });

  return NextResponse.json({ recording }, { status: 201 });
}
