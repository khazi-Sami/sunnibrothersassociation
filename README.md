# Sunni Brothers Association - Education Platform

This is a Next.js + Prisma application with role-based education features:

- Course creation and enrollment
- Live classes with Jitsi
- Recorded lessons upload and playback

## Prerequisites

- Node.js 20+
- A PostgreSQL database
- npm (or pnpm/yarn)

## Environment Variables

Create a `.env` file in the project root and set:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

NEXTAUTH_SECRET="replace-with-strong-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional: defaults to meet.jit.si when omitted
# WARNING: meet.jit.si now requires the teacher to log in via Google/GitHub
# inside Jitsi to become a moderator. Use JaaS or self-hosted to avoid this.
NEXT_PUBLIC_JITSI_DOMAIN="meet.jit.si"

# ── JaaS (Jitsi as a Service) – recommended free option ──────────────────────
# 1. Sign up free at https://jaas.8x8.vc
# 2. Create an app and copy the App ID and generate an RS256 or HS256 key pair
# 3. Fill in the values below
NEXT_PUBLIC_JITSI_DOMAIN="8x8.vc"
NEXT_PUBLIC_JITSI_APP_ID=""      # your JaaS app id (also used for room prefix)
JITSI_APP_ID=""                  # same as above – used server-side for JWT signing
JITSI_APP_SECRET=""              # your JaaS API key secret
```

Notes:

- `DATABASE_URL` is required at runtime.
- `DIRECT_URL` is used for Prisma migration/CLI workflows.
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` must be correct in production for stable sessions.

## Setup

```bash
npm install
npx prisma migrate deploy
npx prisma generate
```

Optional local seed:

```bash
node prisma/seed.js
```

## Run

```bash
npm run dev
```

Open http://localhost:3000

## Live Class Troubleshooting

If Jitsi live classes do not load:

1. Confirm session is valid and user is authenticated.
2. Confirm class status is `LIVE`.
3. Confirm browser can access `https://<NEXT_PUBLIC_JITSI_DOMAIN>/external_api.js`.
4. Check camera/microphone permissions.
5. Check firewall/CSP/ad-blockers are not blocking Jitsi resources.

If students cannot join classes:

1. Confirm student is enrolled in the course.
2. Confirm class status has transitioned to `LIVE`.
3. Confirm `/api/education/classes/:id` returns `canJoin: true` for the student.
