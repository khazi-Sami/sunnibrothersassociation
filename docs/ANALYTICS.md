# SBA analytics

SBA analytics is designed for aggregate product improvement, not religious profiling.

## Data flow

Public pages emit a strict event whitelist through `app/components/AnalyticsProvider.tsx` to `POST /api/analytics`. The API validates the event name and path, strips metadata to a small allowlist, and stores anonymous session/visitor identifiers without names, email addresses, user IDs, payment payloads, or reading histories.

Events are best-effort: an unavailable database must never prevent a page, donation flow, or Quran reader from working. `/admin` and `/api` paths are excluded from public pageview collection.

The role-protected `/admin/analytics` page aggregates the event table for behavioral questions and separately reads authoritative education records (`Enrollment`, `Class`, `ClassAttendance`, `Recording`, and `ClassQuestion`). It does not substitute click events for confirmed enrollments, attendance, or financial records.

## Privacy rules

- Never infer or label religion, sect, belief, prayer habits, income, ethnicity, health, or family circumstances.
- Never send Quranic text, personal financial inputs, donor identity, card data, Razorpay secrets, or full payment payloads.
- Surah analytics contain only aggregate Surah numbers after an explicit Surah selection.
- Donation events describe funnel status only. Verified donation reporting must come from an authoritative payment/donation model.
- Admin analytics is restricted to `ADMIN` sessions and never exposes visitor-level histories.

## Database deployment

The analytics table is added by `prisma/migrations/20260823170000_add_privacy_safe_analytics`. Run `npx prisma migrate deploy` only after production `DATABASE_URL` and `DIRECT_URL` are configured in the hosting environment.
