import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ALLOWED_EVENTS = new Set(["joined", "left"]);

/**
 * Lightweight server-side log for live-room participant events.
 * Writes structured entries to stdout so they appear in server/Vercel logs
 * without requiring an extra database table.
 *
 * POST /api/education/classes/:id/log
 * Body: { event: "joined" | "left" }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const event = String(body?.event ?? "").trim();

  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  console.log(
    JSON.stringify({
      level: "info",
      source: "live-class",
      classId: id,
      userId: session.user.id,
      userEmail: session.user.email,
      role: session.user.role,
      event,
      ts: new Date().toISOString(),
    })
  );

  return NextResponse.json({ ok: true });
}
