"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        userInfo?: { displayName?: string };
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      }
    ) => {
      dispose: () => void;
    };
  }
}

type Props = {
  roomName: string;
  displayName: string;
  isTeacher: boolean;
};

let jitsiScriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  if (jitsiScriptPromise) {
    return jitsiScriptPromise;
  }

  jitsiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Jitsi Meet script"));
    document.body.appendChild(script);
  });

  return jitsiScriptPromise;
}

export default function JitsiMeetFrame({ roomName, displayName, isTeacher }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let api: { dispose: () => void } | null = null;

    async function mount() {
      if (!containerRef.current) return;
      await loadJitsiScript();

      if (!window.JitsiMeetExternalAPI || !containerRef.current) return;

      api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: !isTeacher,
          startWithVideoMuted: !isTeacher,
          disableModeratorIndicator: !isTeacher,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      });
    }

    mount().catch(() => undefined);

    return () => {
      api?.dispose();
    };
  }, [roomName, displayName, isTeacher]);

  return <div ref={containerRef} style={{ width: "100%", minHeight: 620, borderRadius: 18, overflow: "hidden", background: "#0f172a" }} />;
}
