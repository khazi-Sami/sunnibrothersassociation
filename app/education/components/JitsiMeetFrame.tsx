"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        jwt?: string;
        userInfo?: { displayName?: string };
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      }
    ) => {
      addListener?: (event: string, listener: (...args: unknown[]) => void) => void;
      dispose: () => void;
    };
  }
}

type Props = {
  roomName: string;
  displayName: string;
  isTeacher: boolean;
  jwt?: string | null;
  classId?: string;
};

const scriptPromises = new Map<string, Promise<void>>();

function normalizeDomain(rawDomain: string): string {
  return rawDomain.replace(/^https?:\/\//i, "").replace(/\/$/, "").trim();
}

function loadJitsiScript(domain: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  const scriptSrc = `https://${domain}/external_api.js`;
  const existing = scriptPromises.get(scriptSrc);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Jitsi Meet script"));
    document.body.appendChild(script);
  });

  scriptPromises.set(scriptSrc, promise);
  return promise;
}

export default function JitsiMeetFrame({ roomName, displayName, isTeacher, jwt, classId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const domain = normalizeDomain(process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si");
  const isPublicMode = !jwt && domain === "meet.jit.si";

  // JaaS (8x8.vc) requires room names prefixed with the app id.
  // When NEXT_PUBLIC_JITSI_APP_ID is set and domain is 8x8.vc we apply it.
  const appId = process.env.NEXT_PUBLIC_JITSI_APP_ID;
  const effectiveRoom =
    domain === "8x8.vc" && appId ? `vpaas-magic-cookie-${appId}/${roomName}` : roomName;

  useEffect(() => {
    let api: ReturnType<NonNullable<typeof window.JitsiMeetExternalAPI>> | null = null;

    async function mount() {
      if (!containerRef.current) return;
      await loadJitsiScript(domain);

      if (!window.JitsiMeetExternalAPI || !containerRef.current) return;

      containerRef.current.innerHTML = "";

      api = new window.JitsiMeetExternalAPI(domain, {
        roomName: effectiveRoom,
        parentNode: containerRef.current,
        ...(jwt ? { jwt } : {}),
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: !isTeacher,
          startWithVideoMuted: !isTeacher,
          disableModeratorIndicator: !isTeacher,
          lobby: { autoKnock: true, enableChat: false },
          enableLobbyChat: false,
          hideLobbyButton: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      });

      api.addListener?.("conferenceFailed", () => {
        setMountError("Conference failed to load. Please check your connection and try again.");
      });

      if (classId) {
        api.addListener?.("videoConferenceJoined", () => {
          fetch(`/api/education/classes/${classId}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "joined" }),
          }).catch(() => undefined);
        });

        api.addListener?.("videoConferenceLeft", () => {
          fetch(`/api/education/classes/${classId}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "left" }),
          }).catch(() => undefined);
        });
      }
    }

    mount().catch((e) => {
      setMountError(e instanceof Error ? e.message : "Unable to load live class room");
    });

    return () => {
      api?.dispose();
    };
  }, [roomName, displayName, isTeacher, jwt, retryKey, domain, classId, effectiveRoom]);

  if (isPublicMode) {
    return (
      <>
        <section
          style={{
            border: "1px solid #fde68a",
            borderRadius: 14,
            background: "#fffbeb",
            color: "#92400e",
            padding: "14px 16px",
            marginBottom: 10,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>Public Jitsi mode — moderator login required.</strong>
          {" "}meet.jit.si now requires the teacher to click{" "}
          <strong>&quot;Log-in&quot;</strong> inside the Jitsi window and sign in with a
          Google/GitHub/Apple account to unlock the meeting.{" "}
          <br />
          To remove this restriction permanently, set up a free JaaS account at{" "}
          <strong>jaas.8x8.vc</strong> and add{" "}
          <code>NEXT_PUBLIC_JITSI_DOMAIN=8x8.vc</code>,{" "}
          <code>NEXT_PUBLIC_JITSI_APP_ID</code>, <code>JITSI_APP_ID</code> and{" "}
          <code>JITSI_APP_SECRET</code> to your <code>.env</code>.
        </section>
        <div
          ref={containerRef}
          style={{ width: "100%", minHeight: 620, borderRadius: 18, overflow: "hidden", background: "#0f172a" }}
        />
      </>
    );
  }

  if (mountError) {
    return (
      <section
        style={{
          border: "1px solid #fecaca",
          borderRadius: 18,
          background: "#fff5f5",
          color: "#7f1d1d",
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>Unable to load live room.</p>
        <p style={{ margin: 0 }}>{mountError}</p>
        <button
          type="button"
          onClick={() => {
            setMountError(null);
            setRetryKey((prev) => prev + 1);
          }}
          style={{
            border: "none",
            borderRadius: 999,
            width: "fit-content",
            background: "#7f1d1d",
            color: "#fff",
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  return <div ref={containerRef} style={{ width: "100%", minHeight: 620, borderRadius: 18, overflow: "hidden", background: "#0f172a" }} />;
}
