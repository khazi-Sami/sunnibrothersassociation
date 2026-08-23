"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

export type ClassQuestionItem = {
  id: string;
  question: string;
  answered: boolean;
  answeredAt: string | null;
  createdAt: string;
  student: { id: string; name: string | null; email: string };
};

type Props = {
  classId: string;
  initialQuestions: ClassQuestionItem[];
  canAskQuestion: boolean;
  canManageQuestions: boolean;
  isClassLive: boolean;
};

export default function ClassQuestionsPanel({
  classId,
  initialQuestions,
  canAskQuestion,
  canManageQuestions,
  isClassLive,
}: Props) {
  const [questions, setQuestions] = useState<ClassQuestionItem[]>(initialQuestions);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

  const pendingCount = useMemo(() => questions.filter((question) => !question.answered).length, [questions]);

  useEffect(() => {
    let active = true;

    async function refreshQuestions() {
      try {
        const res = await fetch(`/api/education/classes/${classId}/questions`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (active && res.ok) {
          setQuestions(data.questions ?? []);
        }
      } catch {
        // Keep the current list if a background refresh fails.
      }
    }

    if (isClassLive) {
      const interval = window.setInterval(refreshQuestions, 10000);
      return () => {
        active = false;
        window.clearInterval(interval);
      };
    }

    return () => {
      active = false;
    };
  }, [classId, isClassLive]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = draft.trim();
    if (!question) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/education/classes/${classId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Unable to ask question");
      setQuestions((current) => [...current, data.question]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to ask question");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateAnswered(questionId: string, answered: boolean) {
    setBusyQuestionId(questionId);
    setError(null);
    try {
      const res = await fetch(`/api/education/classes/${classId}/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answered }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Unable to update question");
      setQuestions((current) => current.map((question) => (question.id === questionId ? data.question : question)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update question");
    } finally {
      setBusyQuestionId(null);
    }
  }

  return (
    <section style={panelStyle} className="interior-panel education-interactive-panel">
      <div style={headerRowStyle}>
        <div>
          <div style={smallLabelStyle}>Class Q&A</div>
          <h2 style={headingStyle}>Questions</h2>
        </div>
        <span style={countStyle}>{pendingCount} pending</span>
      </div>

      {canAskQuestion ? (
        <form onSubmit={handleSubmit} style={formStyle}>
          <label htmlFor="class-question" style={labelStyle}>Your question</label>
          <textarea
            id="class-question"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!isClassLive || submitting}
            maxLength={800}
            rows={4}
            style={textareaStyle}
          />
          <div style={formActionsStyle}>
            <span style={hintStyle}>{draft.trim().length}/800</span>
            <button type="submit" disabled={!isClassLive || !draft.trim() || submitting} style={primaryButtonStyle}>
              {submitting ? "Sending..." : "Ask Question"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p style={errorTextStyle}>{error}</p> : null}

      <div style={listStyle}>
        {questions.length === 0 ? (
          <p style={emptyStyle}>No questions yet.</p>
        ) : (
          questions.map((question) => (
            <article key={question.id} style={questionStyle}>
              <div style={questionHeaderStyle}>
                <span style={studentStyle}>{question.student.name || question.student.email}</span>
                <span style={question.answered ? answeredStyle : pendingStyle}>
                  {question.answered ? "Answered" : "Pending"}
                </span>
              </div>
              <p style={questionTextStyle}>{question.question}</p>
              <div style={questionFooterStyle}>
                <span>{formatDateTime(question.createdAt)}</span>
                {canManageQuestions ? (
                  <button
                    type="button"
                    onClick={() => updateAnswered(question.id, !question.answered)}
                    disabled={busyQuestionId === question.id}
                    style={secondaryButtonStyle}
                  >
                    {question.answered ? "Mark Pending" : "Mark Answered"}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const panelStyle: CSSProperties = { borderRadius: 26, padding: "24px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(20,42,31,0.08)", boxShadow: "0 22px 70px rgba(20,40,30,0.06)", display: "grid", gap: 18 };
const headerRowStyle: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" };
const smallLabelStyle: CSSProperties = { color: "#1a6045", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const headingStyle: CSSProperties = { margin: "8px 0 0", fontSize: 24, color: "#173127" };
const countStyle: CSSProperties = { borderRadius: 999, padding: "8px 11px", background: "rgba(26,96,69,0.08)", color: "#1a6045", fontSize: 12, fontWeight: 800 };
const formStyle: CSSProperties = { display: "grid", gap: 10 };
const labelStyle: CSSProperties = { fontWeight: 800, color: "#173127", fontSize: 14 };
const textareaStyle: CSSProperties = { width: "100%", resize: "vertical", minHeight: 96, border: "1px solid rgba(20,42,31,0.14)", borderRadius: 16, padding: "12px 14px", color: "#173127", background: "white", lineHeight: 1.6, font: "inherit", outlineColor: "#1a6045" };
const formActionsStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" };
const hintStyle: CSSProperties = { color: "#66776f", fontSize: 13 };
const listStyle: CSSProperties = { display: "grid", gap: 12 };
const questionStyle: CSSProperties = { border: "1px solid rgba(20,42,31,0.10)", borderRadius: 18, padding: "16px", background: "#fbfcfb", display: "grid", gap: 10 };
const questionHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" };
const studentStyle: CSSProperties = { fontWeight: 800, color: "#173127" };
const pendingStyle: CSSProperties = { borderRadius: 999, padding: "6px 9px", background: "rgba(180,83,9,0.10)", color: "#92400e", fontSize: 12, fontWeight: 800 };
const answeredStyle: CSSProperties = { borderRadius: 999, padding: "6px 9px", background: "rgba(22,101,52,0.10)", color: "#166534", fontSize: 12, fontWeight: 800 };
const questionTextStyle: CSSProperties = { margin: 0, color: "#33443c", lineHeight: 1.7, whiteSpace: "pre-wrap" };
const questionFooterStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", color: "#66776f", fontSize: 13 };
const emptyStyle: CSSProperties = { margin: 0, color: "#66776f", lineHeight: 1.7 };
const primaryButtonStyle: CSSProperties = { width: "fit-content", border: "none", cursor: "pointer", textDecoration: "none", background: "linear-gradient(180deg, #174d37, #123b2c)", color: "white", borderRadius: 999, padding: "12px 16px", fontWeight: 800, fontSize: 14, display: "inline-flex", opacity: 1 };
const secondaryButtonStyle: CSSProperties = { width: "fit-content", border: "1px solid rgba(20,42,31,0.14)", cursor: "pointer", background: "rgba(255,255,255,0.9)", color: "#174d37", borderRadius: 999, padding: "9px 12px", fontWeight: 800, fontSize: 13 };
const errorTextStyle: CSSProperties = { color: "#991b1b", background: "rgba(153,27,27,0.08)", borderRadius: 14, padding: "12px 14px", margin: 0 };
