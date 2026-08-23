# Sunni Brothers Association: architecture and operation

This document describes the current application as implemented in the repository. It is the human-maintained companion to the local Graft graph. Graft provides linked, code-derived context for agents; this document explains the product boundaries, runtime flow, data model, and operational checklist for people.

## System shape

The project is a single Next.js App Router application:

```text
Browser
  │
  ├── Server-rendered pages and client components (app/**)
  └── JSON requests to Route Handlers (app/api/**)
          │
          ├── NextAuth credentials session (lib/auth.ts)
          ├── Prisma Client + pg adapter (lib/prisma.ts)
          │       └── PostgreSQL (prisma/schema.prisma)
          └── External services: YouTube/Google Meet links and Razorpay
```

There is no separate backend service. Page rendering, API handlers, authorization, and database access ship from the Next.js process. `scripts/dev-start.js` starts `next dev --webpack` on macOS/Linux; its legacy Windows synchronization branch is only used when `LEGACY_WINDOWS_SYNC=1`.

## Repository map

| Area | Responsibility |
| --- | --- |
| `app/page.tsx` and route folders | Public pages and authenticated education views |
| `app/components/` | Shared UI such as the navigation bar |
| `app/api/` | HTTP API route handlers for auth, education, and payments |
| `app/providers.tsx` | Client-side session/provider boundary |
| `lib/auth.ts` | Credentials authorization and JWT/session role claims |
| `lib/prisma.ts` | One Prisma Client backed by a pooled PostgreSQL connection |
| `lib/education/` | URL validation and live-class lifecycle helpers |
| `prisma/schema.prisma` | PostgreSQL schema, relations, enums, and indexes |
| `prisma/migrations/` | Versioned database changes |
| `prisma/seed.js` | Local demo users, course, enrollment, and scheduled class |
| `tests/` | Focused Node tests for education video-link parsing |
| `graft/` | Local generated context cache; ignored by Git and rebuilt per developer |

## Request and authentication flow

1. A user visits a page or submits a client-side request.
2. NextAuth's credentials provider in `lib/auth.ts` loads the user by email through Prisma and checks the bcrypt password hash.
3. A JWT session is created. The user id and one of `ADMIN`, `TEACHER`, or `STUDENT` are copied into the token and then into `session.user`.
4. Protected route handlers call `getServerSession(authOptions)`. They return `401` when there is no session and apply role/enrollment checks before reading or mutating data.
5. The response is returned as JSON to the client component, which updates its local state and renders the result.

`DATABASE_URL` is required when Prisma is first used. `NEXTAUTH_SECRET` signs the session token and `NEXTAUTH_URL` must match the running public origin in deployed environments.

## Education domain

The core relationships are `User → Course → Enrollment`, with `Class` attached to a course and teacher. A class can have `Recording`, `ClassAttendance`, and `ClassQuestion` records. `ClassStatus` moves through `SCHEDULED`, `LIVE`, `ENDED`, or `CANCELLED`; `ClassType` is `YOUTUBE_LIVE` or `GOOGLE_MEET`.

The education dashboard (`app/education/EducationClient.tsx`) loads courses, classes, and recordings in parallel. Teachers/admins can create courses, schedule and manage classes, and upload recordings. Students can browse enrolled material. Live-class pages enforce enrollment or teacher/admin ownership, record attendance, and expose questions only while a class is live. `lib/education/liveClasses.ts` handles automatic expiry; `lib/education/videoLinks.ts` validates and normalizes supported YouTube and Google Meet URLs.

Important API groups:

- `/api/education/courses` — list/create courses.
- `/api/education/enrollments` — enrollments for students and course access.
- `/api/education/classes` and `/api/education/classes/[id]` — schedule, update, and inspect classes.
- `/api/education/classes/[id]/start`, `/end`, `/cancel` — lifecycle transitions.
- `/api/education/classes/[id]/questions` — read/ask questions with role and enrollment checks.
- `/api/education/recordings` and `/api/education/upload` — recorded lesson metadata and uploads.

## Other product areas

- Quran pages use client-side data loading and presentation helpers in `app/quran/`.
- Zakat pages calculate and present zakat guidance in `app/zakat/`.
- Donation pages load Razorpay on the client; server routes create and verify orders using `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- About, activities, career, and public landing pages are primarily presentation routes.

## Local setup

Requirements: Node.js 20+, npm, and PostgreSQL.

```bash
cd ~/Desktop/sunnibrothersassociation
npm ci

# create .env with DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npx prisma migrate deploy
npx prisma generate
node prisma/seed.js                 # optional demo data
npm run dev                         # opens on the first available port
```

The seed credentials are `teacher@sba.local` and `student@sba.local`, both with password `Pass@123`; use them only in a local database.

Useful checks:

```bash
npm run test:education
npm run lint
npm run build
```

## Graft integration

Graft is integrated as repository tooling, not as a production dependency. `AGENTS.md` contains the agent instructions and `opencode.json` registers the repository MCP entry. The generated `graft/` directory is a local cache and must not be committed.

Install/use it with:

```bash
npx @nanonets/graft init --agents agents --no-global
npx @nanonets/graft build
npx @nanonets/graft map
npx @nanonets/graft ask "where is authentication handled?" --source
```

`graft build` is deterministic and does not need an API key. Optional deep summaries use the provider settings documented by Graft and should be treated as code sent to that provider. The `--no-global` flag keeps this repository integration from changing Codex settings for every repository on the machine.

After substantial code changes, rebuild the graph. Teammates clone the repository and run the same two commands; they generate their own local graph rather than sharing generated cache files.

## Deployment and operational boundaries

The app needs a reachable PostgreSQL database and all required environment variables at runtime. Database migrations should run before a new application version receives traffic. Uploaded recordings require a storage strategy appropriate for the deployment; the current API accepts file uploads but does not define a cloud storage adapter. Live classes embed provider URLs; the application does not host video or create meeting-provider sessions.

Do not commit `.env*`, database credentials, Razorpay secrets, or generated `graft/` output. Keep authorization checks in route handlers even when a page also hides controls, because client UI is not a security boundary.
