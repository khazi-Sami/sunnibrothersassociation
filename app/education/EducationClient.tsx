"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "TEACHER" | "STUDENT";
type ClassStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
type ClassType = "YOUTUBE_LIVE" | "GOOGLE_MEET";
type ClassLifecycleAction = "start" | "end" | "cancel";
type CourseItem = { id: string; title: string; description: string | null; teacher: { id: string; name: string | null; email: string }; isEnrolled?: boolean };
type ClassItem = { id: string; title: string; description: string | null; scheduledAt: string; durationMinutes: number; status: ClassStatus; classType: ClassType; youtubeVideoId: string | null; googleMeetUrl: string | null; teacher: { name: string | null; email: string }; course: { id: string; title: string } };
type RecordingItem = { id: string; title: string; description: string | null; videoUrl: string; youtubeVideoId: string | null; thumbnailUrl: string | null; createdAt: string; class: { id: string; title: string; scheduledAt: string; course: { id: string; title: string } }; createdBy: { name: string | null; email: string } };

const classTypeLabels: Record<ClassType, { title: string; platform: string; description: string }> = {
  YOUTUBE_LIVE: {
    title: "Live Lecture",
    platform: "YouTube Live",
    description: "Best for large classes and lectures.",
  },
  GOOGLE_MEET: {
    title: "Interactive Class",
    platform: "Google Meet",
    description: "Best for smaller classes where students need to speak.",
  },
};

export default function EducationClient({ role }: { role: Role }) {
  const canManageClasses = role === "TEACHER" || role === "ADMIN";
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classDate, setClassDate] = useState("");
  const [classTime, setClassTime] = useState("");
  const [classType, setClassType] = useState<ClassType>("YOUTUBE_LIVE");
  const [youtubeLiveUrl, setYoutubeLiveUrl] = useState("");
  const [googleMeetUrl, setGoogleMeetUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [scheduling, setScheduling] = useState(false);
  const [classActionBusy, setClassActionBusy] = useState<string | null>(null);
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
        throw new Error("Failed to load education data. Please check your connection and try again.");
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault();
    setScheduling(true);
    setError(null);
    try {
      const scheduledAt = buildScheduledAtIso(classDate, classTime);
      if (!scheduledAt) {
        throw new Error("Please enter a valid date and time");
      }

      const res = await fetch(editingClassId ? `/api/education/classes/${editingClassId}` : "/api/education/classes", {
        method: editingClassId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          courseId: selectedCourseId,
          description,
          classType,
          youtubeUrl: classType === "YOUTUBE_LIVE" ? youtubeLiveUrl : "",
          googleMeetUrl: classType === "GOOGLE_MEET" ? googleMeetUrl : "",
          scheduledAt,
          durationMinutes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Unable to save class");
      resetClassForm();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save class");
    } finally {
      setScheduling(false);
    }
  }

  async function handleClassAction(klass: ClassItem, action: ClassLifecycleAction) {
    if (action === "cancel" && !window.confirm("Cancel this class? Students will no longer see it as joinable.")) {
      return;
    }

    setClassActionBusy(`${klass.id}:${action}`);
    setError(null);
    try {
      const res = await fetch(`/api/education/classes/${klass.id}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Unable to ${action} class`);
      if (editingClassId === klass.id) {
        resetClassForm();
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Unable to ${action} class`);
    } finally {
      setClassActionBusy(null);
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
      if (!finalVideoUrl) throw new Error("Please upload a file or provide a YouTube recording link");
      const res = await fetch("/api/education/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId, title: recordingTitle, description: recordingDescription, videoUrl: finalVideoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Unable to add recording");
      setSelectedClassId("");
      setRecordingTitle("");
      setRecordingDescription("");
      setVideoUrl("");
      setRecordingFile(null);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add recording");
    } finally {
      setUploadingRecording(false);
    }
  }

  function resetClassForm() {
    setEditingClassId(null);
    setTitle("");
    setDescription("");
    setClassDate("");
    setClassTime("");
    setClassType("YOUTUBE_LIVE");
    setYoutubeLiveUrl("");
    setGoogleMeetUrl("");
    setDurationMinutes(60);
  }

  function beginEditClass(klass: ClassItem) {
    const parts = toLocalDateTimeParts(klass.scheduledAt);
    setEditingClassId(klass.id);
    setSelectedCourseId(klass.course.id);
    setTitle(klass.title);
    setDescription(klass.description ?? "");
    setClassDate(parts.date);
    setClassTime(parts.time);
    setClassType(klass.classType);
    setYoutubeLiveUrl(klass.youtubeVideoId ? `https://www.youtube.com/watch?v=${klass.youtubeVideoId}` : "");
    setGoogleMeetUrl(klass.googleMeetUrl ?? "");
    setDurationMinutes(klass.durationMinutes);
    document.getElementById("create-live-class")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            <p style={bodyStyle}>Teachers can publish YouTube Live lectures or Google Meet interactive classes while students get a clean view of upcoming sessions and lesson content.</p>
            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={chipStyle}>Logged in as: {role}</span>
              <span style={chipStyle}>YouTube Live + Google Meet</span>
            </div>
            {error ? <div style={{ ...errorStyle, marginTop: 18 }}>{error}</div> : null}
          </div>
          <div style={imageCardStyle}>
            <Image src="/open-quran.jpg" alt="Open Quran for study" fill style={{ objectFit: "cover" }} />
          </div>
        </div>

        {canManageClasses && (
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

            <form id="create-live-class" onSubmit={handleSaveClass} style={panelStyle}>
              <div style={smallLabelStyle}>Teacher Dashboard</div>
              <h2 style={sectionTitleStyle}>{editingClassId ? "Edit live class." : "Create live class."}</h2>
              <div style={formGridStyle}>
                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Course</span>
                  <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} required style={inputStyle}>
                    <option value="">{courses.length === 0 ? "Create a course first" : "Select course"}</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </label>

                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Quran Tafseer" style={inputStyle} />
                </label>

                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Description</span>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Class description" style={inputStyle} />
                </label>

                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                  <label style={fieldStyle}>
                    <span style={fieldLabelStyle}>Date</span>
                    <input type="date" value={classDate} min={toDateInputValue(new Date())} onChange={(e) => setClassDate(e.target.value)} required style={inputStyle} />
                  </label>
                  <label style={fieldStyle}>
                    <span style={fieldLabelStyle}>Time</span>
                    <input type="time" value={classTime} onChange={(e) => setClassTime(e.target.value)} required style={inputStyle} />
                  </label>
                  <label style={fieldStyle}>
                    <span style={fieldLabelStyle}>Duration</span>
                    <input type="number" min={15} max={480} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} required style={inputStyle} />
                  </label>
                </div>

                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>Class Type</span>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    {(["YOUTUBE_LIVE", "GOOGLE_MEET"] as ClassType[]).map((type) => (
                      <button key={type} type="button" onClick={() => setClassType(type)} style={classTypeOptionStyle(classType === type)}>
                        <span style={{ display: "block", fontSize: 16, fontWeight: 900, color: "#173127" }}>{classTypeLabels[type].title}</span>
                        <span style={{ display: "block", marginTop: 4, color: "#1a6045", fontWeight: 800 }}>{classTypeLabels[type].platform}</span>
                        <span style={{ display: "block", marginTop: 8, color: "#586a62", lineHeight: 1.5 }}>{classTypeLabels[type].description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {classType === "YOUTUBE_LIVE" ? (
                  <label style={fieldStyle}>
                    <span style={fieldLabelStyle}>YouTube Live URL</span>
                    <input value={youtubeLiveUrl} onChange={(e) => setYoutubeLiveUrl(e.target.value)} required placeholder="https://youtube.com/live/VIDEO_ID" style={inputStyle} />
                    <span style={helpTextStyle}>Create your live stream on YouTube and paste the YouTube Live URL here.</span>
                    <span style={helpTextStyle}>OBS is optional. You can use OBS with YouTube if you need advanced camera, screen, presentation or branding controls.</span>
                  </label>
                ) : (
                  <label style={fieldStyle}>
                    <span style={fieldLabelStyle}>Google Meet URL</span>
                    <input value={googleMeetUrl} onChange={(e) => setGoogleMeetUrl(e.target.value)} required placeholder="https://meet.google.com/abc-defg-hij" style={inputStyle} />
                    <span style={helpTextStyle}>Create a meeting in Google Meet and paste the meeting URL here.</span>
                  </label>
                )}

                <div style={actionRowStyle}>
                  <button type="submit" disabled={scheduling} style={primaryButton}>{scheduling ? "Saving..." : editingClassId ? "Save Changes" : "Publish Class"}</button>
                  {editingClassId ? <button type="button" onClick={resetClassForm} style={secondaryButton}>Cancel Edit</button> : null}
                </div>
              </div>
            </form>

            <form onSubmit={handleUploadRecording} style={panelStyle}>
              <div style={smallLabelStyle}>Recordings</div>
              <h2 style={sectionTitleStyle}>Upload a lesson.</h2>
              <div style={formGridStyle}>
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} required style={inputStyle}>
                  <option value="">{teacherClasses.length === 0 ? "Schedule a class first" : "Select class"}</option>
                  {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <input value={recordingTitle} onChange={(e) => setRecordingTitle(e.target.value)} required placeholder="Recording title" style={inputStyle} />
                <textarea rows={2} value={recordingDescription} onChange={(e) => setRecordingDescription(e.target.value)} placeholder="Description" style={inputStyle} />
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="YouTube recording URL" style={inputStyle} />
                <input type="file" accept="video/*" onChange={(e) => setRecordingFile(e.target.files?.[0] ?? null)} style={inputStyle} />
                <button type="submit" disabled={uploadingRecording} style={primaryButton}>{uploadingRecording ? "Saving..." : "Save Recording"}</button>
              </div>
            </form>
          </div>
        )}

        <section style={panelStyle}>
          <div style={smallLabelStyle}>Courses</div>
          <h2 style={sectionTitleStyle}>{role === "STUDENT" ? "My courses and catalog." : "Course catalog."}</h2>
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
          <div style={smallLabelStyle}>Upcoming Classes</div>
          <h2 style={sectionTitleStyle}>Live class schedule.</h2>
          {loading ? <p style={mutedStyle}>Loading classes...</p> : classes.length === 0 ? <p style={mutedStyle}>No upcoming classes yet.</p> : (
            <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
              {classes.map((klass) => {
                const mediaError = getClassMediaError(klass);

                return (
                <div key={klass.id} style={contentCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "start" }}>
                    <div style={{ minWidth: 240, flex: "1 1 360px" }}>
                      <h3 style={{ fontSize: 28, lineHeight: 1.02, color: "#173127", fontFamily: "var(--font-playfair), Georgia, serif" }}>{klass.title}</h3>
                      <p style={{ marginTop: 10, color: "#586a62", lineHeight: 1.7 }}>{klass.description || "No description"}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                        <span style={softChipStyle}>{formatClassDateTime(klass.scheduledAt)}</span>
                        <span style={softChipStyle}>{classTypeLabels[klass.classType].title}</span>
                        <span style={softChipStyle}>{classTypeLabels[klass.classType].platform}</span>
                        <span style={softChipStyle}>Status: {formatStatus(klass.status)}</span>
                        {mediaError ? <span style={warningChipStyle}>Missing live link</span> : null}
                      </div>
                      <p style={{ marginTop: 10, color: "#7a8a83", fontSize: 14 }}>
                        {klass.durationMinutes} minutes - Course: {klass.course.title} - Teacher: {klass.teacher.name || klass.teacher.email}
                      </p>
                    </div>
                    <div style={actionRowStyle}>
                      <Link href={`/education/live/${klass.id}`} style={primaryButton}>
                        {canManageClasses ? getManagerOpenLabel(klass.classType) : getStudentClassActionLabel(klass)}
                      </Link>
                      {canManageClasses ? (
                        <>
                          <button type="button" onClick={() => beginEditClass(klass)} disabled={klass.status === "ENDED" || klass.status === "CANCELLED"} style={secondaryButton}>Edit</button>
                          {klass.status === "SCHEDULED" ? (
                            <button type="button" onClick={() => handleClassAction(klass, "start")} disabled={classActionBusy === `${klass.id}:start` || Boolean(mediaError)} title={mediaError ?? undefined} style={secondaryButton}>
                              {classActionBusy === `${klass.id}:start` ? "Starting..." : mediaError ? "Add Link First" : "Start Class"}
                            </button>
                          ) : null}
                          {klass.status === "LIVE" ? (
                            <button type="button" onClick={() => handleClassAction(klass, "end")} disabled={classActionBusy === `${klass.id}:end`} style={secondaryButton}>
                              {classActionBusy === `${klass.id}:end` ? "Ending..." : "End Class"}
                            </button>
                          ) : null}
                          {(klass.status === "SCHEDULED" || klass.status === "LIVE") ? (
                            <button type="button" onClick={() => handleClassAction(klass, "cancel")} disabled={classActionBusy === `${klass.id}:cancel`} style={dangerButton}>
                              {classActionBusy === `${klass.id}:cancel` ? "Cancelling..." : "Cancel"}
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                );
              })}
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
                    {rec.youtubeVideoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${encodeURIComponent(rec.youtubeVideoId)}`}
                        title={rec.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
                      />
                    ) : rec.videoUrl.match(/\.(mp4|webm|ogg)$/i) || rec.videoUrl.startsWith("/uploads/") ? (
                      <video src={rec.videoUrl} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#7a8a83" }}>External recording link</div>
                    )}
                  </div>
                  <h3 style={{ marginTop: 14, fontSize: 24, lineHeight: 1.04, color: "#173127", fontFamily: "var(--font-playfair), Georgia, serif" }}>{rec.title}</h3>
                  <p style={{ marginTop: 8, color: "#586a62", lineHeight: 1.7 }}>{rec.description || "No description"}</p>
                  <p style={{ marginTop: 10, color: "#7a8a83", fontSize: 14 }}>Class: {rec.class.title}</p>
                  <Link href={`/education/recordings/${rec.id}`} style={{ ...primaryButton, marginTop: 14, display: "inline-flex" }}>Open Recording</Link>
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

function buildScheduledAtIso(dateValue: string, timeValue: string): string | null {
  if (!dateValue || !timeValue) return null;
  const scheduledAt = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt.toISOString();
}

function toLocalDateTimeParts(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: toDateInputValue(date),
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  };
}

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatClassDateTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" });
}

function formatStatus(status: ClassStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getManagerOpenLabel(classType: ClassType): string {
  return classType === "GOOGLE_MEET" ? "Open Meeting" : "Open Class";
}

function getStudentClassActionLabel(klass: ClassItem): string {
  if (klass.status === "LIVE") {
    return klass.classType === "GOOGLE_MEET" ? "Join Meeting" : "Watch Now";
  }
  if (klass.status === "ENDED") return "View Summary";
  if (klass.status === "CANCELLED") return "View Status";
  return "View Details";
}

function getClassMediaError(klass: Pick<ClassItem, "classType" | "youtubeVideoId" | "googleMeetUrl">): string | null {
  if (klass.classType === "YOUTUBE_LIVE" && !klass.youtubeVideoId) {
    return "YouTube Live classes need a YouTube URL before they can start.";
  }
  if (klass.classType === "GOOGLE_MEET" && !klass.googleMeetUrl) {
    return "Google Meet classes need a Meet URL before they can start.";
  }
  return null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function classTypeOptionStyle(active: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    borderRadius: 18,
    border: active ? "1px solid rgba(26,96,69,0.55)" : "1px solid rgba(20,42,31,0.10)",
    background: active ? "rgba(26,96,69,0.09)" : "rgba(255,255,255,0.88)",
    padding: "16px 16px",
    cursor: "pointer",
    boxShadow: active ? "0 12px 30px rgba(20,40,30,0.10)" : "none",
  };
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
const fieldStyle: React.CSSProperties = { display: "grid", gap: 6 };
const fieldLabelStyle: React.CSSProperties = { fontSize: 13, color: "#475569", fontWeight: 700 };
const inputStyle: React.CSSProperties = { padding: "14px 16px", borderRadius: 18, border: "1px solid rgba(20,42,31,0.10)", background: "rgba(255,255,255,0.94)", fontSize: 16, width: "100%" };
const helpTextStyle: React.CSSProperties = { color: "#66776f", fontSize: 13, lineHeight: 1.6 };
const chipStyle: React.CSSProperties = { borderRadius: 999, padding: "7px 10px", background: "rgba(26,96,69,0.08)", color: "#1a6045", fontSize: 12, fontWeight: 800 };
const softChipStyle: React.CSSProperties = { borderRadius: 999, padding: "7px 10px", background: "rgba(26,96,69,0.08)", color: "#1a6045", fontSize: 12, fontWeight: 800 };
const warningChipStyle: React.CSSProperties = { borderRadius: 999, padding: "7px 10px", background: "#fffbeb", color: "#92400e", fontSize: 12, fontWeight: 800 };
const actionRowStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" };
const primaryButton: React.CSSProperties = { width: "fit-content", border: "none", cursor: "pointer", textDecoration: "none", background: "linear-gradient(180deg, #174d37, #123b2c)", color: "white", borderRadius: 999, padding: "14px 20px", fontWeight: 800, fontSize: 15 };
const secondaryButton: React.CSSProperties = { width: "fit-content", border: "1px solid rgba(20,42,31,0.14)", cursor: "pointer", textDecoration: "none", background: "rgba(255,255,255,0.9)", color: "#174d37", borderRadius: 999, padding: "12px 16px", fontWeight: 800, fontSize: 14 };
const dangerButton: React.CSSProperties = { width: "fit-content", border: "1px solid rgba(153,27,27,0.18)", cursor: "pointer", textDecoration: "none", background: "rgba(153,27,27,0.08)", color: "#991b1b", borderRadius: 999, padding: "12px 16px", fontWeight: 800, fontSize: 14 };
const mutedStyle: React.CSSProperties = { marginTop: 18, color: "#66776f", lineHeight: 1.7 };
const contentCardStyle: React.CSSProperties = { borderRadius: 26, padding: "22px 20px", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(20,42,31,0.08)" };
const errorStyle: React.CSSProperties = { color: "#b42318", background: "rgba(244,67,54,0.08)", border: "1px solid rgba(244,67,54,0.16)", borderRadius: 16, padding: "12px 14px" };
