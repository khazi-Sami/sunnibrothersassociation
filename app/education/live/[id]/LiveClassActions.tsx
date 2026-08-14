"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ClassStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
type ClassAction = "start" | "end" | "cancel";

type Props = {
  classId: string;
  status: ClassStatus;
  startDisabledReason?: string | null;
};

export default function LiveClassActions({ classId, status, startDisabledReason }: Props) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<ClassAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: ClassAction) {
    if (action === "cancel" && !window.confirm("Cancel this class? Students will no longer see it as joinable.")) {
      return;
    }

    setBusyAction(action);
    setError(null);

    try {
      const res = await fetch(`/api/education/classes/${classId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Unable to ${action} class`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${action} class`);
    } finally {
      setBusyAction(null);
    }
  }

  if (status === "ENDED" || status === "CANCELLED") {
    return null;
  }

  const startDisabled = Boolean(startDisabledReason) || busyAction !== null;

  return (
    <section style={panelStyle}>
      <div>
        <div style={smallLabelStyle}>Teacher Controls</div>
        <h2 style={headingStyle}>Manage live class</h2>
      </div>

      {startDisabledReason ? <p style={warningStyle}>{startDisabledReason}</p> : null}
      {error ? <p style={errorStyle}>{error}</p> : null}

      <div style={actionsStyle}>
        {status === "SCHEDULED" ? (
          <button type="button" onClick={() => runAction("start")} disabled={startDisabled} style={primaryButtonStyle}>
            {busyAction === "start" ? "Starting..." : startDisabledReason ? "Add live link first" : "Start Class"}
          </button>
        ) : null}

        {status === "LIVE" ? (
          <button type="button" onClick={() => runAction("end")} disabled={busyAction !== null} style={dangerButtonStyle}>
            {busyAction === "end" ? "Ending..." : "End Class"}
          </button>
        ) : null}

        {(status === "SCHEDULED" || status === "LIVE") ? (
          <button type="button" onClick={() => runAction("cancel")} disabled={busyAction !== null} style={secondaryButtonStyle}>
            {busyAction === "cancel" ? "Cancelling..." : "Cancel Class"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

const panelStyle: CSSProperties = { borderRadius: 26, padding: "24px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(20,42,31,0.08)", boxShadow: "0 22px 70px rgba(20,40,30,0.06)", display: "grid", gap: 14 };
const smallLabelStyle: CSSProperties = { color: "#1a6045", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const headingStyle: CSSProperties = { margin: "8px 0 0", fontSize: 24, color: "#173127" };
const actionsStyle: CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" };
const primaryButtonStyle: CSSProperties = { width: "fit-content", border: "none", cursor: "pointer", textDecoration: "none", background: "linear-gradient(180deg, #174d37, #123b2c)", color: "white", borderRadius: 999, padding: "13px 18px", fontWeight: 800, fontSize: 15, display: "inline-flex", opacity: 1 };
const secondaryButtonStyle: CSSProperties = { width: "fit-content", border: "1px solid rgba(20,42,31,0.14)", cursor: "pointer", textDecoration: "none", background: "rgba(255,255,255,0.9)", color: "#174d37", borderRadius: 999, padding: "12px 16px", fontWeight: 800, fontSize: 14 };
const dangerButtonStyle: CSSProperties = { width: "fit-content", border: "1px solid rgba(153,27,27,0.18)", cursor: "pointer", textDecoration: "none", background: "rgba(153,27,27,0.08)", color: "#991b1b", borderRadius: 999, padding: "12px 16px", fontWeight: 800, fontSize: 14 };
const warningStyle: CSSProperties = { color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "12px 14px", margin: 0, lineHeight: 1.6 };
const errorStyle: CSSProperties = { color: "#991b1b", background: "rgba(153,27,27,0.08)", borderRadius: 14, padding: "12px 14px", margin: 0 };
