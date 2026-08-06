import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { createHmac } from "crypto";

/**
 * Returns a signed Jitsi JWT for authenticated users who have access to
 * the given class. Supports optional private Jitsi deployments.
 *
 * Required env vars for private mode:
 *   JITSI_APP_ID     - the app_id / room prefix registered on your Jitsi server
 *   JITSI_APP_SECRET - the shared secret used to sign the JWT (HS256)
 *
 * When these vars are absent the endpoint returns { jwt: null } and the
 * client falls back to unauthenticated public meet.jit.si access.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getPrisma();

  const klass = await prisma.class.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          enrollments: {
            where: { studentId: session.user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!klass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const isTeacher = session.user.role === "ADMIN" || klass.teacherId === session.user.id;
  const isEnrolled = klass.course.enrollments.length > 0;

  if (!isTeacher && !isEnrolled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appId = process.env.JITSI_APP_ID;
  const appSecret = process.env.JITSI_APP_SECRET;

  if (!appId || !appSecret) {
    // Public Jitsi mode – no JWT needed
    return NextResponse.json({ jwt: null });
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1-hour token

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: appId,
      sub: process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si",
      aud: appId,
      iat: now,
      nbf: now,
      exp,
      context: {
        user: {
          name: session.user.name || session.user.email,
          email: session.user.email,
          moderator: isTeacher,
        },
      },
      room: klass.roomName,
      moderator: isTeacher,
    })
  ).toString("base64url");

  const sig = createHmac("sha256", appSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return NextResponse.json({ jwt: `${header}.${payload}.${sig}` });
}
