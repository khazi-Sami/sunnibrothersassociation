"use client";

import { useMemo, useState } from "react";
import JitsiMeetFrame from "@/app/education/components/JitsiMeetFrame";

type ClassPayload = {
  id: string;
  title: string;
  description: string | null;
  roomName: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  scheduledAt: string;
  durationMinutes: number;
  teacher: { id: string; name: string | null; email: string };
  course: { id: string; title: string };
  canStart: boolean;
  canEnd: boolean;
  canJoin: boolean;
  role: "TEACHER" | "STUDENT";
};

export default function LiveClassRoomClient({
  initialClass,
  displayName,
}: {
  initialClass: ClassPayload;
  displayName: string;
}) {
  const [klass, setKlass] = useState(initialClass);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = klass.role === "TEACHER";

  const canRenderJitsi = useMemo(() => {
    if (isTeacher) {
      return klass.status === "LIVE";
    }
    return klass.canJoin && klass.status === "LIVE";
  }, [klass, isTeacher]);

  async function callLifecycle(action: "start" | "end") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/education/classes/${klass.id}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to ${action} class`);
      }

      const refresh = await fetch(`/api/education/classes/${klass.id}`, { cache: "no-store" });
      const refreshData = await refresh.json();
      setKlass(refreshData.class);
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
          Course: {klass.course.title} • Status: {klass.status} • Starts: {new Date(klass.scheduledAt).toLocaleString()}
        </p>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          Teacher: {klass.teacher.name || klass.teacher.email} • Duration: {klass.durationMinutes} minutes
        </p>

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

      {canRenderJitsi ? (
        <JitsiMeetFrame roomName={klass.roomName} displayName={displayName} isTeacher={isTeacher} />
      ) : (
        <section style={{ border: "1px dashed #cbd5e1", borderRadius: 16, padding: 22, color: "#475569", background: "#f8fafc" }}>
          {isTeacher
            ? "Start the class to launch the Jitsi room."
            : "This class is not live yet. You can join once the teacher starts it."}
        </section>
      )}
    </main>
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
