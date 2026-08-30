"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { SbaConfirmDialog, SbaEmptyState } from "@/app/components/sba/SbaUi";

type Row = { student: { id: string; name: string | null; email: string; studentProfile: { fullName: string | null; gradeOrClass: string | null } | null }; attendance: { status: string; notes: string | null; joinedAt: Date; lastSeenAt: Date | null } | null };
const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

export default function AttendanceEditor({ classId, initialRows, canReset = false }: { classId: string; initialRows: Row[]; canReset?: boolean }) {
  const [rows, setRows] = useState(initialRows.map((row) => ({ ...row, status: row.attendance?.status || "UNMARKED", notes: row.attendance?.notes || "" })));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetStudent, setResetStudent] = useState<Row["student"] | null>(null);

  function setStatus(id: string, status: string) { setRows((old) => old.map((row) => row.student.id === id ? { ...row, status } : row)); }
  async function save() { setSaving(true); setMessage("Saving…"); const res = await fetch(`/api/education/classes/${classId}/attendance`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates: rows.map((row) => ({ studentId: row.student.id, status: row.status, notes: row.notes })) }) }); setSaving(false); setMessage(res.ok ? "Attendance saved." : "Unable to save attendance."); }
  async function reset() { if (!resetStudent) return; setSaving(true); const res = await fetch(`/api/education/classes/${classId}/attendance?studentId=${encodeURIComponent(resetStudent.id)}`, { method: "DELETE" }); if (res.ok) setRows((old) => old.map((row) => row.student.id === resetStudent.id ? { ...row, attendance: null, status: "UNMARKED", notes: "" } : row)); setMessage(res.ok ? "Attendance entry reset." : "Unable to reset attendance entry."); setSaving(false); setResetStudent(null); }

  if (!rows.length) return <SbaEmptyState title="No students enrolled" description="Enroll students in this course before marking attendance." />;
  return <section style={{ display: "grid", gap: 12 }}>
    <div className="sba-toolbar"><div><strong>{rows.filter((row) => row.status !== "UNMARKED").length}/{rows.length} marked</strong><p style={{ marginTop: 3, color: "#687a72" }}>Mark the roster, then save once.</p></div><button type="button" className="site-btn-secondary" onClick={() => setRows((old) => old.map((row) => ({ ...row, status: "PRESENT" })))}>Mark all present</button></div>
    {rows.map((row) => <article key={row.student.id} className="interior-panel"><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h2>{row.student.studentProfile?.fullName || row.student.name || row.student.email}</h2><p>{row.student.studentProfile?.gradeOrClass || "Grade not added"}{row.attendance?.joinedAt ? ` · Joined ${new Date(row.attendance.joinedAt).toLocaleTimeString()}` : " · No join evidence"}</p></div>{canReset && row.attendance ? <button type="button" className="sba-icon-button" aria-label={`Reset attendance for ${row.student.name || row.student.email}`} onClick={() => setResetStudent(row.student)}><RotateCcw size={16} /></button> : null}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{statuses.map((status) => <button type="button" key={status} className="site-btn-secondary" aria-pressed={row.status === status} style={{ background: row.status === status ? "#dbe9df" : undefined }} onClick={() => setStatus(row.student.id, status)}>{status}</button>)}</div><label style={{ display: "grid", gap: 6, marginTop: 12 }}><span>Optional note</span><input maxLength={500} value={row.notes} onChange={(event) => setRows((old) => old.map((item) => item.student.id === row.student.id ? { ...item, notes: event.target.value } : item))} /></label></article>)}
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><button type="button" className="site-btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save attendance"}</button>{message && <span role="status">{message}</span>}</div>
    <SbaConfirmDialog open={!!resetStudent} title={`Reset ${resetStudent?.name || resetStudent?.email || "student"}'s attendance?`} description="This removes the saved attendance status and note. The student remains enrolled and returns to Unmarked." confirmLabel="Reset entry" busy={saving} onCancel={() => setResetStudent(null)} onConfirm={reset} />
  </section>;
}
