import type { CSSProperties } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ id: string }> };

export default async function RecordingPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const prisma = getPrisma();
  const recording = await prisma.recording.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      class: {
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
        },
      },
    },
  });

  if (!recording) {
    notFound();
  }

  const isAdmin = session.user.role === "ADMIN";
  const isAssignedTeacher = recording.class.teacherId === session.user.id;
  const isEnrolledStudent = session.user.role === "STUDENT" && recording.class.course.enrollments.length > 0;

  if (!isAdmin && !isAssignedTeacher && !isEnrolledStudent) {
    return <AccessDenied />;
  }

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <Link href="/education" style={secondaryButtonStyle}>Back to Education</Link>
        <section style={panelStyle}>
          <div style={smallLabelStyle}>Recorded Session</div>
          <h1 style={titleStyle}>{recording.title}</h1>
          <p style={metaStyle}>Class: {recording.class.title}</p>
          <p style={metaStyle}>Course: {recording.class.course.title}</p>
          <p style={metaStyle}>Teacher: {recording.class.teacher.name || recording.class.teacher.email}</p>
          {recording.description ? <p style={bodyStyle}>{recording.description}</p> : null}

          <div style={mediaWrapStyle}>
            {recording.youtubeVideoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${encodeURIComponent(recording.youtubeVideoId)}?rel=0`}
                title={recording.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={iframeStyle}
              />
            ) : isVideoFile(recording.videoUrl) ? (
              <video src={recording.videoUrl} controls style={videoStyle} />
            ) : (
              <div style={externalWrapStyle}>
                <p style={bodyStyle}>This recording is hosted externally.</p>
                <a href={recording.videoUrl} target="_blank" rel="noopener noreferrer" style={primaryButtonStyle}>Open Recording</a>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function AccessDenied() {
  return (
    <main style={pageStyle}>
      <section style={{ ...shellStyle, maxWidth: 760 }}>
        <section style={panelStyle}>
          <div style={smallLabelStyle}>Access denied</div>
          <h1 style={titleStyle}>You cannot view this recording.</h1>
          <p style={bodyStyle}>Only enrolled students, the assigned teacher, and admins can open this recording.</p>
          <Link href="/education" style={primaryButtonStyle}>Back to Education</Link>
        </section>
      </section>
    </main>
  );
}

function isVideoFile(videoUrl: string): boolean {
  return videoUrl.startsWith("/uploads/") || /\.(mp4|webm|ogg)$/i.test(videoUrl);
}

const pageStyle: CSSProperties = { minHeight: "100vh", padding: "24px 16px 84px", background: "linear-gradient(180deg, #f5f7f4 0%, #eef2ef 100%)" };
const shellStyle: CSSProperties = { maxWidth: 1080, margin: "0 auto", display: "grid", gap: 18 };
const panelStyle: CSSProperties = { borderRadius: 26, padding: "26px 24px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(20,42,31,0.08)", boxShadow: "0 22px 70px rgba(20,40,30,0.06)" };
const smallLabelStyle: CSSProperties = { color: "#1a6045", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: "10px 0 0", fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.02, color: "#142a1f", fontFamily: "var(--font-playfair), Georgia, serif" };
const metaStyle: CSSProperties = { margin: "10px 0 0", color: "#586a62", lineHeight: 1.7 };
const bodyStyle: CSSProperties = { margin: "14px 0 0", color: "#556860", lineHeight: 1.8 };
const mediaWrapStyle: CSSProperties = { position: "relative", width: "100%", aspectRatio: "16 / 9", marginTop: 22, borderRadius: 18, overflow: "hidden", background: "#0f172a" };
const iframeStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 };
const videoStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
const externalWrapStyle: CSSProperties = { width: "100%", height: "100%", display: "grid", placeItems: "center", alignContent: "center", gap: 12, background: "#eef2ef", padding: 20 };
const primaryButtonStyle: CSSProperties = { width: "fit-content", border: "none", cursor: "pointer", textDecoration: "none", background: "linear-gradient(180deg, #174d37, #123b2c)", color: "white", borderRadius: 999, padding: "13px 18px", fontWeight: 800, fontSize: 15, display: "inline-flex" };
const secondaryButtonStyle: CSSProperties = { width: "fit-content", border: "1px solid rgba(20,42,31,0.14)", cursor: "pointer", textDecoration: "none", background: "rgba(255,255,255,0.9)", color: "#174d37", borderRadius: 999, padding: "12px 16px", fontWeight: 800, fontSize: 14 };
