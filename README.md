# Sunni Brothers Association - Education Platform

This is a Next.js + Prisma application with role-based education features:

- Course creation and enrollment
- Live classes through YouTube Live embeds or Google Meet links
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
```

Notes:

- `DATABASE_URL` is required at runtime.
- `DIRECT_URL` is used for Prisma migration/CLI workflows.
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` must be correct in production for stable sessions.
- Live classes do not require meeting-provider credentials or an in-app video server.

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

## Architecture and Graft context

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the application architecture, request flows, data model, local setup, and operational notes.

This repository is wired for [Graft](https://github.com/NanoNets/Graft), a local regenerable code-context graph for coding agents. The generated `graft/` directory is intentionally ignored; after cloning, run:

```bash
npx @nanonets/graft build
```

The repository-level agent wiring is in `AGENTS.md` and the MCP registration is in `opencode.json`. Use `npx @nanonets/graft map` or `npx @nanonets/graft ask "<question>" --source` to explore the codebase.

## Live Class Notes

Teachers choose one class type when scheduling:

- `YOUTUBE_LIVE`: paste a supported YouTube URL such as `https://www.youtube.com/watch?v=VIDEO_ID`, `https://youtu.be/VIDEO_ID`, or `https://www.youtube.com/live/VIDEO_ID`.
- `GOOGLE_MEET`: paste a valid Meet URL such as `https://meet.google.com/abc-defg-hij`.

Students can join only when the class status is `LIVE` and they are enrolled in the course.
