"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role = "ADMIN" | "TEACHER" | "STUDENT";
type CourseItem = { id: string; title: string; description: string | null; teacher: { id: string; name: string | null; email: string }; isEnrolled?: boolean };
type ClassItem = { id: string; title: string; description: string | null; scheduledAt: string; durationMinutes: number; status: "SCHEDULED" | "LIVE" | "ENDED"; roomName: string; teacher: { name: string | null; email: string }; course: { id: string; title: string } };
type RecordingItem = { id: string; title: string; description: string | null; videoUrl: string; thumbnailUrl: string | null; createdAt: string; class: { id: string; title: string; scheduledAt: string; course: { id: string; title: string } }; createdBy: { name: string | null; email: string } };

export default function EducationClient({ role }: { role: Role }) {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [scheduling, setScheduling] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [recordingTitle, setRecordingTitle] = useState("");
  const [recordingDescription, setRecordingDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [uploadingRecording, setUploadingRecording] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [coursesRes, classesRes, recordingsRes] = await Promise.all([
        fetch("/api/education/courses", { cache: "no-store" }),
        fetch("/api/education/classes", { cache: "no-store" }),
        fetch("/api/education/recordings", { cache: "no-store" }),
      ]);

      // Parse each independently so one failure doesn't block the others.
      const coursesJson = coursesRes.ok
        ? ((await coursesRes.json().catch(() => ({}))) as { courses: CourseItem[] })
        : { courses: [] as CourseItem[] };
      const classesJson = classesRes.ok
        ? ((await classesRes.json().catch(() => ({}))) as { classes: ClassItem[] })
        : { classes: [] as ClassItem[] };
      const recordingsJson = recordingsRes.ok
        ? ((await recordingsRes.json().catch(() => ({}))) as { recordings: RecordingItem[] })
        : { recordings: [] as RecordingItem[] };

      if (!coursesRes.ok && !classesRes.ok && !recordingsRes.ok) {
        throw new Error("Failed to load education data — please check your connection and try again");
      }

      setCourses(coursesJson.courses ?? []);
      setClasses(classesJson.classes ?? []);
      setRecordings(recordingsJson.recordings ?? []);
      if ((coursesJson.courses?.length ?? 0) > 0) {
        setSelectedCourseId((prev) => prev || coursesJson.courses[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load education data");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadData(true).catch(() => undefined);
    }, 20000);

    return () => window.clearInterval(interval);
  }, [loadData]);

  const teacherClasses = useMemo(() => classes, [classes]);

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCourse(true);
    setError(null);
    try {
      const res = await fetch("/api/education/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: courseTitle, description: courseDescription }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Unable to create course");
      setCourseTitle("");
      setCourseDescription("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create course");
    } finally {
      setCreatingCourse(false);
    }
  }

  async function handleEnroll(courseId: string) {
    setError(null);
    try {
      const res = await fetch("/api/education/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) throw new Error(data?.error ?? "Unable to enroll");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to enroll");
    }
  }

  async function handleScheduleClass(e: React.FormEvent) {
    e.preventDefault();
    setScheduling(true);
    setError(null);
    try {
      const res = await fetch("/api/education/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          courseId: selectedCourseId,
          description,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Unable to schedule class");
      setTitle(""); setDescription(""); setScheduledAt(""); setDurationMinutes(60);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to schedule class");
    } finally {
      setScheduling(false);
    }
  }

  async function handleUploadRecording(e: React.FormEvent) {
    e.preventDefault();
    setUploadingRecording(true);
    setError(null);
    try {
      let finalVideoUrl = videoUrl.trim();
      if (recordingFile) {
        const fd = new FormData();
        fd.append("file", recordingFile);
        const uploadRes = await fetch("/api/education/upload", { method: "POST", body: fd });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(uploadData?.error ?? "File upload failed");
        finalVideoUrl = uploadData.url;
      }
      if (!finalVideoUrl) throw new Error("Please upload a file or provide a Google Drive/video link");
      const res = await fetch("/api/education/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId, title: recordingTitle, description: recordingDescription, videoUrl: finalVideoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Unable to add recording");
      setSelectedClassId(""); setRecordingTitle(""); setRecordingDescription(""); setVideoUrl(""); setRecordingFile(null);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add recording");
    } finally {
      setUploadingRecording(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <div style={centerHeroStyle}>
          <div style={eyebrowStyle}>Education</div>
          <h1 style={titleStyle}>
            Live classes.
            <br />
            <span style={{ color: "#1a6045" }}>Recorded lessons.</span>
          </h1>
          <p style={subtitleStyle}>A more premium education hub for teachers and students, without losing functionality.</p>
        </div>

        <div className="edu-hero-grid" style={heroGridStyle}>
          <div style={textPanelStyle}>
            <div style={smallLabelStyle}>Role-Aware Portal</div>
            <h2 style={sectionTitleStyle}>Teaching, scheduling, and recordings in one calmer workflow.</h2>
            <p style={bodyStyle}>Teachers can schedule classes and upload recordings while students get a cleaner view of upcoming sessions and lesson content.</p>
            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={chipStyle}>Logged in as: {role}</span>
              <span style={chipStyle}>Jitsi Live Classes</span>
            </div>
            {error ? <div style={{ ...errorStyle, marginTop: 18 }}>{error}</div> : null}
          </div>
          <div style={imageCardStyle}>
            <Image src="/open-quran.jpg" alt="Open Quran for study" fill style={{ objectFit: "cover" }} />
          </div>
        </div>

        {(role === "TEACHER" || role === "ADMIN") && (
          <div className="edu-form-grid" style={{ display: "grid", gap: 20 }}>
            <form onSubmit={handleCreateCourse} style={panelStyle}>
              <div style={smallLabelStyle}>Courses</div>
              <h2 style={sectionTitleStyle}>Create course.</h2>
              <div style={formGridStyle}>
                <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required placeholder="Course title" style={inputStyle} />
                <textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} rows={3} placeholder="Course description" style={inputStyle} />
                <button type="submit" disabled={creatingCourse} style={primaryButton}>{creatingCourse ? "Creating..." : "Create Course"}</button>
              </div>
            </form>

            <form onSubmit={handleScheduleClass} style={panelStyle}>
              <div style={smallLabelStyle}>Teacher Dashboard</div>
              <h2 style={sectionTitleStyle}>Schedule a class.</h2>
              <div style={formGridStyle}>
                <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} required style={inputStyle}>
                  <option value="">{courses.length === 0 ? "— Create a course first (above) —" : "Select course"}</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Class title" style={inputStyle} />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Class description" style={inputStyle} />
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Date &amp; Time (future only)</span>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Duration (minutes)</span>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      required
                      style={inputStyle}
                    />
                  </label>
                </div>
                <button type="submit" disabled={scheduling} style={primaryButton}>{scheduling ? "Scheduling..." : "Schedule Class"}</button>
              </div>
            </form>

            <form onSubmit={handleUploadRecording} style={panelStyle}>
              <div style={smallLabelStyle}>Recordings</div>
              <h2 style={sectionTitleStyle}>Upload a lesson.</h2>
              <div style={formGridStyle}>
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} required style={inputStyle}>
                  <option value="">{teacherClasses.length === 0 ? "— Schedule a class first (above) —" : "Select class"}</option>
                  {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <input value={recordingTitle} onChange={(e) => setRecordingTitle(e.target.value)} required placeholder="Recording title" style={inputStyle} />
                <textarea rows={2} value={recordingDescription} onChange={(e) => setRecordingDescription(e.target.value)} placeholder="Description" style={inputStyle} />
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Google Drive / external video URL" style={inputStyle} />
                <input type="file" accept="video/*" onChange={(e) => setRecordingFile(e.target.files?.[0] ?? null)} style={inputStyle} />
                <button type="submit" disabled={uploadingRecording} style={primaryButton}>{uploadingRecording ? "Saving..." : "Save Recording"}</button>
              </div>
            </form>
          </div>
        )}

        <section style={panelStyle}>
          <div style={smallLabelStyle}>Courses</div>
          <h2 style={sectionTitleStyle}>Course catalog.</h2>
          {loading ? <p style={mutedStyle}>Loading courses...</p> : courses.length === 0 ? <p style={mutedStyle}>No courses available yet.</p> : (
            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              {courses.map((course) => (
                <div key={course.id} style={contentCardStyle}>
                  <h3 style={{ fontSize: 24, lineHeight: 1.04, color: "#173127", fontFamily: "var(--font-playfair), Georgia, serif" }}>{course.title}</h3>
                  <p style={{ marginTop: 8, color: "#586a62", lineHeight: 1.7 }}>{course.description || "No description"}</p>
                  <p style={{ marginTop: 8, color: "#7a8a83", fontSize: 14 }}>Teacher: {course.teacher.name || course.teacher.email}</p>
                  {role === "STUDENT" ? (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={course.isEnrolled}
                      style={{
                        ...primaryButton,
                        marginTop: 12,
                        opacity: course.isEnrolled ? 0.7 : 1,
                        cursor: course.isEnrolled ? "not-allowed" : "pointer",
                      }}
                    >
                      {course.isEnrolled ? "Enrolled" : "Enroll"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <div style={smallLabelStyle}>Live Classes</div>
          <h2 style={sectionTitleStyle}>Upcoming sessions.</h2>
          {loading ? <p style={mutedStyle}>Loading classes...</p> : classes.length === 0 ? <p style={mutedStyle}>No upcoming classes yet.</p> : (
            <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
              {classes.map((klass) => (
                <div key={klass.id} style={contentCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "start" }}>
                    <div>
                      <h3 style={{ fontSize: 28, lineHeight: 1.02, color: "#173127", fontFamily: "var(--font-playfair), Georgia, serif" }}>{klass.title}</h3>
                      <p style={{ marginTop: 10, color: "#586a62", lineHeight: 1.7 }}>{klass.description || "No description"}</p>
                      <p style={{ marginTop: 10, color: "#7a8a83", fontSize: 14 }}>
                        {new Date(klass.scheduledAt).toLocaleString()} • {klass.durationMinutes} mins • Course: {klass.course.title} • Teacher: {klass.teacher.name || klass.teacher.email}
                      </p>
                    </div>
                    <Link href={`/classes/${klass.id}`} style={primaryButton}>
                      {role === "TEACHER" || role === "ADMIN"
                        ? klass.status === "LIVE" ? "Open Live Room" : "Manage Class"
                        : klass.status === "LIVE" ? "Join Live Class" : "View Details"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <div style={smallLabelStyle}>Recorded Sessions</div>
          <h2 style={sectionTitleStyle}>Lesson library.</h2>
          {loading ? <p style={mutedStyle}>Loading recordings...</p> : recordings.length === 0 ? <p style={mutedStyle}>No recordings uploaded yet.</p> : (
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 20 }}>
              {recordings.map((rec) => (
                <article key={rec.id} style={contentCardStyle}>
                  <div style={{ aspectRatio: "16 / 9", overflow: "hidden", borderRadius: 18, background: "#eef2ef" }}>
                    {rec.videoUrl.match(/\.(mp4|webm|ogg)$/i) || rec.videoUrl.startsWith("/uploads/") ? (
                      <video src={rec.videoUrl} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#7a8a83" }}>External recording link</div>
                    )}
                  </div>
                  <h3 style={{ marginTop: 14, fontSize: 24, lineHeight: 1.04, color: "#173127", fontFamily: "var(--font-playfair), Georgia, serif" }}>{rec.title}</h3>
                  <p style={{ marginTop: 8, color: "#586a62", lineHeight: 1.7 }}>{rec.description || "No description"}</p>
                  <p style={{ marginTop: 10, color: "#7a8a83", fontSize: 14 }}>Class: {rec.class.title}</p>
                  <a href={rec.videoUrl} target="_blank" rel="noreferrer" style={{ ...primaryButton, marginTop: 14, display: "inline-flex" }}>Open Recording</a>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <style>{`
        @media (min-width: 980px) {
          .edu-hero-grid {
            grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1.05fr) !important;
          }
          .edu-form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </main>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", padding: "24px 16px 84px", background: "linear-gradient(180deg, #f5f7f4 0%, #eef2ef 100%)" };
const shellStyle: React.CSSProperties = { maxWidth: 1280, margin: "0 auto", display: "grid", gap: 28 };
const centerHeroStyle: React.CSSProperties = { textAlign: "center", padding: "38px 0 6px" };
const eyebrowStyle: React.CSSProperties = { display: "inline-flex", padding: "8px 14px", borderRadius: 999, background: "rgba(26,96,69,0.08)", color: "#1a6045", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const titleStyle: React.CSSProperties = { margin: "18px auto 0", maxWidth: 980, fontSize: "clamp(2.8rem, 7vw, 5.2rem)", lineHeight: 0.96, letterSpacing: "-0.05em", color: "#142a1f", fontFamily: "var(--font-playfair), Georgia, serif" };
const subtitleStyle: React.CSSProperties = { margin: "20px auto 0", maxWidth: 800, fontSize: 18, lineHeight: 1.75, color: "#53665d" };
const heroGridStyle: React.CSSProperties = { display: "grid", gap: 22, alignItems: "center" };
const imageCardStyle: React.CSSProperties = { position: "relative", minHeight: 460, borderRadius: 36, overflow: "hidden", background: "#dfe7e1", boxShadow: "0 26px 80px rgba(20,40,30,0.12)" };
const textPanelStyle: React.CSSProperties = { borderRadius: 34, padding: "42px 34px", background: "rgba(255,255,255,0.84)", border: "1px solid rgba(20,42,31,0.08)", boxShadow: "0 18px 50px rgba(20,40,30,0.06)" };
const smallLabelStyle: React.CSSProperties = { color: "#1a6045", fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" };
const sectionTitleStyle: React.CSSProperties = { marginTop: 14, fontSize: "clamp(2rem, 4vw, 3.4rem)", lineHeight: 1.02, color: "#142a1f", fontFamily: "var(--font-playfair), Georgia, serif" };
const bodyStyle: React.CSSProperties = { marginTop: 18, color: "#556860", fontSize: 17, lineHeight: 1.8 };
const panelStyle: React.CSSProperties = { borderRadius: 36, padding: "34px 30px", background: "rgba(255,255,255,0.84)", border: "1px solid rgba(20,42,31,0.08)", boxShadow: "0 22px 70px rgba(20,40,30,0.06)" };
const formGridStyle: React.CSSProperties = { display: "grid", gap: 14, marginTop: 22 };
const inputStyle: React.CSSProperties = { padding: "14px 16px", borderRadius: 18, border: "1px solid rgba(20,42,31,0.10)", background: "rgba(255,255,255,0.94)", fontSize: 16, width: "100%" };
const chipStyle: React.CSSProperties = { borderRadius: 999, padding: "7px 10px", background: "rgba(26,96,69,0.08)", color: "#1a6045", fontSize: 12, fontWeight: 800 };
const primaryButton: React.CSSProperties = { width: "fit-content", border: "none", cursor: "pointer", textDecoration: "none", background: "linear-gradient(180deg, #174d37, #123b2c)", color: "white", borderRadius: 999, padding: "14px 20px", fontWeight: 800, fontSize: 15 };
const mutedStyle: React.CSSProperties = { marginTop: 18, color: "#66776f", lineHeight: 1.7 };
const contentCardStyle: React.CSSProperties = { borderRadius: 26, padding: "22px 20px", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(20,42,31,0.08)" };
const errorStyle: React.CSSProperties = { color: "#b42318", background: "rgba(244,67,54,0.08)", border: "1px solid rgba(244,67,54,0.16)", borderRadius: 16, padding: "12px 14px" };
