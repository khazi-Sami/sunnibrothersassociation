import type { CSSProperties } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { autoExpireClassIfNeeded } from "@/lib/education/liveClasses";
import { getStoredClassMediaError } from "@/lib/education/videoLinks";
import { getPrisma } from "@/lib/prisma";
import ClassQuestionsPanel, { type ClassQuestionItem } from "./ClassQuestionsPanel";
import LiveClassActions from "./LiveClassActions";

type PageProps = { params: Promise<{ id: string }> };

const classTypeLabel = {
  YOUTUBE_LIVE: { title: "Live Lecture", platform: "YouTube Live" },
  GOOGLE_MEET: { title: "Interactive Live Class", platform: "Google Meet" },
} as const;

export default async function StudentLiveClassPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const prisma = getPrisma();

  await autoExpireClassIfNeeded(id);

  const klass = await prisma.class.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      course: {
        select: {
          id: true,
          title: true,
          enrollments: {
            where: { studentId: session.user.id },
            select: { id: true },
          },
        },
      },
      recordings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, title: true, youtubeVideoId: true, videoUrl: true },
      },
      questions: {
        orderBy: { createdAt: "asc" },
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!klass) {
    notFound();
  }

  const isAdmin = session.user.role === "ADMIN";
  const isAssignedTeacher = klass.teacherId === session.user.id;
  const isEnrolledStudent = session.user.role === "STUDENT" && klass.course.enrollments.length > 0;
  const canAccessClass = isAdmin || isAssignedTeacher || isEnrolledStudent;

  if (!canAccessClass) {
    return <AccessDenied />;
  }

  if (isEnrolledStudent) {
    const now = new Date();
    await prisma.classAttendance.upsert({
      where: { classId_studentId: { classId: klass.id, studentId: session.user.id } },
      update: { lastSeenAt: now, leftAt: null },
      create: { classId: klass.id, studentId: session.user.id, lastSeenAt: now },
    });
  }

  const latestRecording = klass.recordings[0] ?? null;
  const teacherName = klass.teacher.name || klass.teacher.email;
  const type = classTypeLabel[klass.classType];
  const canManageQuestions = isAdmin || isAssignedTeacher;
  const mediaError = getStoredClassMediaError({
    classType: klass.classType,
    youtubeVideoId: klass.youtubeVideoId,
    googleMeetUrl: klass.googleMeetUrl,
  });
  const initialQuestions: ClassQuestionItem[] = klass.questions.map((question) => ({
    id: question.id,
    question: question.question,
    answered: question.answered,
    answeredAt: question.answeredAt?.toISOString() ?? null,
    createdAt: question.createdAt.toISOString(),
    student: question.student,
  }));

  return (
    <main style={pageStyle} className="interior-page education-detail-page">
      <section style={shellStyle} className="interior-shell education-detail-shell">
        <div style={topBarStyle}>
          <Link href="/education" style={secondaryButtonStyle}>Back to Education</Link>
          <span style={chipStyle}>{type.title}</span>
        </div>

        <section style={panelStyle} className="interior-panel education-detail-hero">
          <div style={smallLabelStyle}>{type.platform}</div>
          <h1 style={titleStyle}>{klass.title}</h1>
          <p style={metaStyle}>Teacher: {teacherName}</p>
          <p style={metaStyle}>Course: {klass.course.title}</p>
          {renderStatusSummary(klass.status, klass.scheduledAt)}
        </section>

        {canManageQuestions ? (
          <LiveClassActions
            classId={klass.id}
            status={klass.status}
            startDisabledReason={klass.status === "SCHEDULED" ? mediaError : null}
          />
        ) : null}

        {mediaError && (klass.status === "SCHEDULED" || klass.status === "LIVE") ? (
          <section style={noticeStyle}>
            <h2 style={noticeTitleStyle}>Live link needs attention.</h2>
            <p style={mutedStyle}>{mediaError}</p>
            {canManageQuestions ? <Link href="/education" style={primaryButtonStyle}>Edit Class</Link> : null}
          </section>
        ) : null}

        {klass.status === "SCHEDULED" ? (
          <section style={noticeStyle}>
            <h2 style={noticeTitleStyle}>Class has not started yet.</h2>
            <p style={mutedStyle}>Scheduled: {formatDateTime(klass.scheduledAt)}</p>
          </section>
        ) : null}

        {klass.status === "LIVE" && klass.classType === "YOUTUBE_LIVE" ? (
          <section style={panelStyle} className="interior-panel">
            <div style={liveRowStyle}>
              <LiveBadge />
              <span style={mutedStyle}>Watch live class</span>
            </div>
            {klass.youtubeVideoId ? (
              <>
                {/* Unlisted YouTube URLs can be shared outside this app. This page verifies sunnibrothers.com auth/enrollment before rendering, but it is not DRM for the underlying YouTube video. */}
                <div style={playerWrapStyle}>
                  <iframe
                    src={`https://www.youtube.com/embed/${encodeURIComponent(klass.youtubeVideoId)}?autoplay=1&rel=0`}
                    title={klass.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={iframeStyle}
                  />
                </div>
              </>
            ) : (
              <p style={errorTextStyle}>This YouTube class is missing a valid video ID.</p>
            )}
          </section>
        ) : null}

        {klass.status === "LIVE" && klass.classType === "GOOGLE_MEET" ? (
          <section style={panelStyle} className="interior-panel">
            <div style={liveRowStyle}>
              <LiveBadge />
              <span style={mutedStyle}>This class is conducted through Google Meet.</span>
            </div>
            <h2 style={sectionHeadingStyle}>Interactive Live Class</h2>
            <p style={mutedStyle}>Open the meeting in a new tab to join the class.</p>
            {klass.googleMeetUrl ? (
              <a href={klass.googleMeetUrl} target="_blank" rel="noopener noreferrer" style={primaryButtonStyle}>
                Join Google Meet
              </a>
            ) : (
              <p style={errorTextStyle}>This Google Meet class is missing a valid Meet URL.</p>
            )}
            <p style={noteStyle}>
              Attendance here records that the student opened the meeting through sunnibrothers.com. It does not prove how long the student remained inside Google Meet.
            </p>
          </section>
        ) : null}

        {klass.status === "LIVE" ? (
          <ClassQuestionsPanel
            classId={klass.id}
            initialQuestions={initialQuestions}
            canAskQuestion={isEnrolledStudent}
            canManageQuestions={canManageQuestions}
            isClassLive={klass.status === "LIVE"}
          />
        ) : null}

        {klass.status === "ENDED" ? (
          <section style={noticeStyle}>
            <h2 style={noticeTitleStyle}>Class has ended.</h2>
            {latestRecording ? (
              <Link href={`/education/recordings/${latestRecording.id}`} style={primaryButtonStyle}>Watch Recording</Link>
            ) : (
              <p style={mutedStyle}>A recording has not been added yet.</p>
            )}
          </section>
        ) : null}

        {klass.status === "CANCELLED" ? (
          <section style={noticeStyle}>
            <h2 style={noticeTitleStyle}>This class has been cancelled.</h2>
            <p style={mutedStyle}>Please check Education for other upcoming classes.</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function AccessDenied() {
  return (
    <main style={pageStyle} className="interior-page education-detail-page">
      <section style={{ ...shellStyle, maxWidth: 760 }} className="interior-shell education-detail-shell">
        <section style={panelStyle} className="interior-panel education-detail-hero">
          <div style={smallLabelStyle}>Access denied</div>
          <h1 style={titleStyle}>You are not enrolled in this class.</h1>
          <p style={mutedStyle}>Only enrolled students, the assigned teacher, and admins can open this live class.</p>
          <Link href="/education" style={primaryButtonStyle}>Back to Education</Link>
        </section>
      </section>
    </main>
  );
}

function renderStatusSummary(status: string, scheduledAt: Date) {
  if (status === "LIVE") {
    return (
      <div style={liveRowStyle}>
        <LiveBadge />
        <span style={mutedStyle}>Live now</span>
      </div>
    );
  }

  return <p style={metaStyle}>Scheduled: {formatDateTime(scheduledAt)}</p>;
}

function LiveBadge() {
  return (
    <span style={liveBadgeStyle}>
      <span style={liveDotStyle} />
      LIVE
    </span>
  );
}

function formatDateTime(value: Date): string {
  return value.toLocaleString(undefined, { month: "long", day: "numeric", weekday: "long", hour: "numeric", minute: "2-digit" });
}

const pageStyle: CSSProperties = { minHeight: "100vh", padding: "24px 16px 84px", background: "linear-gradient(180deg, #f5f7f4 0%, #eef2ef 100%)" };
const shellStyle: CSSProperties = { maxWidth: 1120, margin: "0 auto", display: "grid", gap: 18 };
const topBarStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" };
const panelStyle: CSSProperties = { borderRadius: 26, padding: "26px 24px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(20,42,31,0.08)", boxShadow: "0 22px 70px rgba(20,40,30,0.06)" };
const noticeStyle: CSSProperties = { borderRadius: 22, padding: "24px 22px", background: "rgba(255,255,255,0.86)", border: "1px solid rgba(20,42,31,0.10)", display: "grid", gap: 12 };
const smallLabelStyle: CSSProperties = { color: "#1a6045", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: "10px 0 0", fontSize: "clamp(2rem, 5vw, 3.6rem)", lineHeight: 1.02, color: "#142a1f", fontFamily: "var(--font-playfair), Georgia, serif" };
const sectionHeadingStyle: CSSProperties = { margin: "10px 0 0", fontSize: 24, color: "#173127" };
const noticeTitleStyle: CSSProperties = { margin: 0, fontSize: 24, color: "#173127" };
const metaStyle: CSSProperties = { margin: "10px 0 0", color: "#586a62", lineHeight: 1.7 };
const mutedStyle: CSSProperties = { margin: 0, color: "#66776f", lineHeight: 1.7 };
const noteStyle: CSSProperties = { margin: "8px 0 0", color: "#66776f", fontSize: 13, lineHeight: 1.7 };
const chipStyle: CSSProperties = { borderRadius: 999, padding: "8px 11px", background: "rgba(26,96,69,0.08)", color: "#1a6045", fontSize: 12, fontWeight: 800 };
const liveRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 };
const liveBadgeStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "8px 11px", background: "rgba(185,28,28,0.09)", color: "#b91c1c", fontSize: 12, fontWeight: 900 };
const liveDotStyle: CSSProperties = { width: 8, height: 8, borderRadius: 999, background: "#dc2626", display: "inline-block" };
const playerWrapStyle: CSSProperties = { position: "relative", width: "100%", aspectRatio: "16 / 9", marginTop: 18, borderRadius: 18, overflow: "hidden", background: "#0f172a" };
const iframeStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 };
const primaryButtonStyle: CSSProperties = { width: "fit-content", border: "none", cursor: "pointer", textDecoration: "none", background: "linear-gradient(180deg, #174d37, #123b2c)", color: "white", borderRadius: 999, padding: "13px 18px", fontWeight: 800, fontSize: 15, display: "inline-flex" };
const secondaryButtonStyle: CSSProperties = { width: "fit-content", border: "1px solid rgba(20,42,31,0.14)", cursor: "pointer", textDecoration: "none", background: "rgba(255,255,255,0.9)", color: "#174d37", borderRadius: 999, padding: "12px 16px", fontWeight: 800, fontSize: 14 };
const errorTextStyle: CSSProperties = { color: "#991b1b", background: "rgba(153,27,27,0.08)", borderRadius: 14, padding: "12px 14px", marginTop: 16 };
