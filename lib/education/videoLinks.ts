export type SupportedClassType = "YOUTUBE_LIVE" | "GOOGLE_MEET";

type ClassMediaInput = {
  classType: SupportedClassType;
  youtubeVideoId: string | null;
  googleMeetUrl: string | null;
};

type ClassMediaValidationResult =
  | { ok: true; value: ClassMediaInput }
  | { ok: false; error: string };

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const YOUTU_BE_HOST = "youtu.be";
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const GOOGLE_MEET_PATH_PATTERN = /^\/([a-z]{3}-[a-z]{4}-[a-z]{3})\/?$/;

export function isValidYouTubeVideoId(videoId: string): boolean {
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId);
}

export function isYouTubeUrl(rawUrl: string): boolean {
  const url = parseUrl(rawUrl);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return host === YOUTU_BE_HOST || YOUTUBE_HOSTS.has(host);
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  const url = parseHttpsUrl(rawUrl);
  if (!url) return null;

  const host = url.hostname.toLowerCase();
  let candidate: string | null = null;

  if (host === YOUTU_BE_HOST) {
    candidate = firstPathSegment(url);
  } else if (YOUTUBE_HOSTS.has(host)) {
    const pathParts = pathSegments(url);
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else if (pathParts[0] === "live") {
      candidate = pathParts[1] ?? null;
    }
  }

  if (!candidate) return null;
  return isValidYouTubeVideoId(candidate) ? candidate : null;
}

export function normalizeYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function normalizeGoogleMeetUrl(rawUrl: string): string | null {
  const url = parseHttpsUrl(rawUrl);
  if (!url || url.hostname.toLowerCase() !== "meet.google.com") {
    return null;
  }

  const match = url.pathname.toLowerCase().match(GOOGLE_MEET_PATH_PATTERN);
  if (!match) return null;

  return `https://meet.google.com/${match[1]}`;
}

export function parseClassMediaInput(
  rawClassType: unknown,
  rawYouTubeUrl: unknown,
  rawGoogleMeetUrl: unknown
): ClassMediaValidationResult {
  const classType = String(rawClassType ?? "").trim();

  if (classType !== "YOUTUBE_LIVE" && classType !== "GOOGLE_MEET") {
    return { ok: false, error: "classType must be YOUTUBE_LIVE or GOOGLE_MEET" };
  }

  if (classType === "YOUTUBE_LIVE") {
    const youtubeVideoId = extractYouTubeVideoId(String(rawYouTubeUrl ?? "").trim());
    if (!youtubeVideoId) {
      return { ok: false, error: "A valid YouTube Live URL is required" };
    }

    return {
      ok: true,
      value: { classType, youtubeVideoId, googleMeetUrl: null },
    };
  }

  const googleMeetUrl = normalizeGoogleMeetUrl(String(rawGoogleMeetUrl ?? "").trim());
  if (!googleMeetUrl) {
    return { ok: false, error: "A valid Google Meet URL is required" };
  }

  return {
    ok: true,
    value: { classType, youtubeVideoId: null, googleMeetUrl },
  };
}

export function getStoredClassMediaError(media: {
  classType: SupportedClassType;
  youtubeVideoId: string | null;
  googleMeetUrl: string | null;
}): string | null {
  if (media.classType === "YOUTUBE_LIVE") {
    if (!media.youtubeVideoId || !isValidYouTubeVideoId(media.youtubeVideoId)) {
      return "YouTube Live classes require a valid YouTube video ID";
    }
    if (media.googleMeetUrl) {
      return "YouTube Live classes cannot also have a Google Meet URL";
    }
    return null;
  }

  if (!media.googleMeetUrl || !normalizeGoogleMeetUrl(media.googleMeetUrl)) {
    return "Google Meet classes require a valid Google Meet URL";
  }
  if (media.youtubeVideoId) {
    return "Google Meet classes cannot also have a YouTube video ID";
  }

  return null;
}

function parseHttpsUrl(rawUrl: string): URL | null {
  const url = parseUrl(rawUrl);
  return url?.protocol === "https:" ? url : null;
}

function parseUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || /<\s*iframe/i.test(trimmed)) return null;

  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function pathSegments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function firstPathSegment(url: URL): string | null {
  return pathSegments(url)[0] ?? null;
}
