import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { ANALYTICS_EVENTS, isAnalyticsPathAllowed } from "@/lib/analytics";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/);
const safePath = z.string().min(1).max(240).refine((value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("://") && !value.includes("?") && !value.includes("#") && !value.includes("\\"));
const metadata = z.object({
  surahNumber: z.number().int().min(1).max(114).optional(),
  resourceType: z.string().max(80).optional(),
  status: z.string().max(80).optional(),
}).strict().optional();
const payloadSchema = z.object({
  eventName: z.enum(ANALYTICS_EVENTS),
  path: safePath,
  sessionId: identifier,
  anonymousId: identifier.optional(),
  referrer: z.string().url().max(300).optional(),
  utmSource: z.string().max(100).regex(/^[^\r\n]+$/).optional(),
  utmMedium: z.string().max(100).regex(/^[^\r\n]+$/).optional(),
  utmCampaign: z.string().max(160).regex(/^[^\r\n]+$/).optional(),
  deviceType: z.enum(["mobile", "tablet", "desktop"]).optional(),
  resourceId: z.string().max(120).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  metadata,
}).strict();

const safeRoles = new Set(["ADMIN", "TEACHER", "STUDENT"]);

async function readBoundedBody(request: Request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ ok: false }, { status: 413 });

  let parsedBody: unknown;
  try {
    const rawBody = await readBoundedBody(request);
    if (rawBody === null) return NextResponse.json({ ok: false }, { status: 413 });
    parsedBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(parsedBody);
  if (!parsed.success || !isAnalyticsPathAllowed(parsed.data.path)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = session?.user?.role && safeRoles.has(session.user.role) ? session.user.role.toLowerCase() : undefined;
    const referrer = parsed.data.referrer ? new URL(parsed.data.referrer) : null;
    const normalizedReferrer = referrer && ["http:", "https:"].includes(referrer.protocol) ? referrer.origin : undefined;
    const prisma = getPrisma();
    await prisma.analyticsEvent.create({
      data: {
        eventName: parsed.data.eventName,
        path: parsed.data.path,
        sessionId: parsed.data.sessionId,
        anonymousId: parsed.data.anonymousId,
        referrer: normalizedReferrer,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmCampaign: parsed.data.utmCampaign,
        deviceType: parsed.data.deviceType,
        role,
        resourceId: parsed.data.resourceId,
        metadata: parsed.data.metadata,
      },
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    // Analytics must never make the public product unavailable when the database is offline.
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
