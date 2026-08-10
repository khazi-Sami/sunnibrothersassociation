"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ClassStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
type ClassType = "YOUTUBE_LIVE" | "GOOGLE_MEET";

type ClassPayload = {
  id: string;
  title: string;
  description: string | null;
  classType: ClassType;
  youtubeVideoId: string | null;
  googleMeetUrl: string | null;
  status: ClassStatus;
  scheduledAt: string;
  durationMinutes: number;
  teacher: { id: string; name: string | null; email: string };
  course: { id: string; title: string };
  canStart: boolean;
  canEnd: boolean;
  canJoin: boolean;
  role: "TEACHER" | "STUDENT";
};

const classTypeLabels: Record<ClassType, string> = {
  YOUTUBE_LIVE: "YouTube Live",
  GOOGLE_MEET: "Google Meet",
};

export default function LiveClassRoomClient({ initialClass }: { initialClass: ClassPayload }) {
  const [klass, setKlass] = useState(initialClass);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = klass.role === "TEACHER";
  const youtubeEmbedUrl = useMemo(() => {
    if (klass.classType !== "YOUTUBE_LIVE" || !klass.youtubeVideoId) return null;
    return `https://www.youtube.com/embed/${encodeURIComponent(klass.youtubeVideoId)}?autoplay=1&rel=0`;
  }, [klass.classType, klass.youtubeVideoId]);

  const refreshClass = useCallback(async () => {
    const refresh = await fetch(`/api/education/classes/${klass.id}`, { cache: "no-store" });
    const refreshData = await refresh.json().catch(() => ({}));
    if (!refresh.ok || !refreshData?.class) {
      throw new Error(refreshData?.error ?? "Unable to refresh class status");
    }
    setKlass(refreshData.class);
  }, [klass.id]);

  useEffect(() => {
    const shouldPoll = !isTeacher && klass.status !== "ENDED" && klass.status !== "CANCELLED";
    if (!shouldPoll) return;

    const interval = window.setInterval(() => {
      setRefreshing(true);
      refreshClass()
        .catch(() => undefined)
        .finally(() => setRefreshing(false));
    }, 10000);

    return () => window.clearInterval(interval);
  }, [isTeacher, klass.status, refreshClass]);

  async function callLifecycle(action: "start" | "end") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/education/classes/${klass.id}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to ${action} class`);
      }
      await refreshClass();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "26px 16px 70px", display: "grid", gap: 16 }}>
      <section style={{ border: "1px solid #d8dee8", borderRadius: 18, padding: 20, background: "#fff" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>{klass.title}</h1>
        <p style={{ color: "#475569", marginTop: 8 }}>{klass.description || "No class description"}</p>
        <p style={{ color: "#64748b", marginTop: 10 }}>
          Course: {klass.course.title} - Status: {klass.status} - Type: {classTypeLabels[klass.classType]} - Starts:{" "}
          {new Date(klass.scheduledAt).toLocaleString()}
        </p>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Teacher: {klass.teacher.name || klass.teacher.email} - Duration: {klass.durationMinutes} minutes
        </p>
        {!isTeacher && refreshing ? <p style={{ color: "#64748b", marginTop: 8 }}>Checking class status...</p> : null}

        {error ? <p style={{ marginTop: 12, color: "#b91c1c" }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {klass.canStart ? (
            <button onClick={() => callLifecycle("start")} disabled={busy} style={buttonStyle}>
              {busy ? "Starting..." : "Start Class"}
            </button>
          ) : null}
          {klass.canEnd ? (
            <button onClick={() => callLifecycle("end")} disabled={busy} style={{ ...buttonStyle, background: "#991b1b" }}>
              {busy ? "Ending..." : "End Class"}
            </button>
          ) : null}
        </div>
      </section>

      {klass.status === "LIVE" ? (
        renderLiveSurface(klass, youtubeEmbedUrl)
      ) : (
        <section style={{ border: "1px dashed #cbd5e1", borderRadius: 16, padding: 22, color: "#475569", background: "#f8fafc" }}>
          {getWaitingMessage(klass, isTeacher)}
        </section>
      )}
    </main>
  );
}

function renderLiveSurface(klass: ClassPayload, youtubeEmbedUrl: string | null) {
  if (klass.classType === "YOUTUBE_LIVE") {
    if (!youtubeEmbedUrl) {
      return <MissingMediaMessage message="This YouTube Live class is missing a valid YouTube video ID." />;
    }

    return (
      <section style={{ borderRadius: 18, overflow: "hidden", background: "#0f172a", minHeight: 620 }}>
        <iframe
          src={youtubeEmbedUrl}
          title={klass.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ width: "100%", minHeight: 620, border: 0, display: "block" }}
        />
      </section>
    );
  }

  if (!klass.googleMeetUrl) {
    return <MissingMediaMessage message="This Google Meet class is missing a valid Meet URL." />;
  }

  return (
    <section style={{ border: "1px solid #d8dee8", borderRadius: 18, padding: 24, background: "#fff", display: "grid", gap: 12 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>Google Meet</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, margin: 0 }}>The class is live. Open the Meet room in a new tab to join.</p>
      <a href={klass.googleMeetUrl} target="_blank" rel="noreferrer" style={{ ...buttonStyle, width: "fit-content", textDecoration: "none" }}>
        Open Google Meet
      </a>
    </section>
  );
}

function getWaitingMessage(klass: ClassPayload, isTeacher: boolean): string {
  if (klass.status === "ENDED") return "This class has ended.";
  if (klass.status === "CANCELLED") return "This class has been cancelled.";
  if (isTeacher) return `Start the class to make the ${classTypeLabels[klass.classType]} session available.`;
  return "This class is not live yet. You can join once the teacher starts it.";
}

function MissingMediaMessage({ message }: { message: string }) {
  return (
    <section style={{ border: "1px solid #fecaca", borderRadius: 18, background: "#fff5f5", color: "#7f1d1d", padding: 16 }}>
      {message}
    </section>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  background: "#0f766e",
  color: "white",
  fontWeight: 700,
  padding: "10px 16px",
  cursor: "pointer",
};
