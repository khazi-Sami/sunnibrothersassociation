/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "..", "lib", "education", "videoLinks.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

const moduleShim = { exports: {} };
vm.runInNewContext(compiled.outputText, {
  module: moduleShim,
  exports: moduleShim.exports,
  require,
  URL,
  Set,
}, { filename: sourcePath });

const {
  extractYouTubeVideoId,
  getStoredClassMediaError,
  isYouTubeUrl,
  normalizeGoogleMeetUrl,
  normalizeYouTubeWatchUrl,
  parseClassMediaInput,
} = moduleShim.exports;

const VIDEO_ID = "dQw4w9WgXcQ";
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("extracts supported YouTube watch URLs", () => {
  assert.equal(extractYouTubeVideoId(`https://youtube.com/watch?v=${VIDEO_ID}`), VIDEO_ID);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}&feature=share`), VIDEO_ID);
  assert.equal(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${VIDEO_ID}`), VIDEO_ID);
});

test("extracts supported YouTube short and live URLs", () => {
  assert.equal(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}`), VIDEO_ID);
  assert.equal(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}/`), VIDEO_ID);
  assert.equal(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}?si=abc123`), VIDEO_ID);
  assert.equal(extractYouTubeVideoId(`https://youtube.com/live/${VIDEO_ID}`), VIDEO_ID);
  assert.equal(extractYouTubeVideoId(`https://youtube.com/live/${VIDEO_ID}/`), VIDEO_ID);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/live/${VIDEO_ID}?feature=share`), VIDEO_ID);
});

test("rejects unsafe or unsupported YouTube shapes", () => {
  assert.equal(extractYouTubeVideoId(`http://youtube.com/watch?v=${VIDEO_ID}`), null);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/embed/${VIDEO_ID}`), null);
  assert.equal(extractYouTubeVideoId(`https://www.youtube.com/shorts/${VIDEO_ID}`), null);
  assert.equal(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}/extra`), null);
  assert.equal(extractYouTubeVideoId(`https://youtube.com/live/${VIDEO_ID}/extra`), null);
  assert.equal(extractYouTubeVideoId("https://youtube.com/watch?v=too-short"), null);
  assert.equal(extractYouTubeVideoId(`https://youtube.com.evil.test/watch?v=${VIDEO_ID}`), null);
  assert.equal(extractYouTubeVideoId(`<iframe src="https://youtube.com/embed/${VIDEO_ID}"></iframe>`), null);
});

test("detects YouTube hosts even when the URL is not accepted for storage", () => {
  assert.equal(isYouTubeUrl(`https://youtube.com/watch?v=${VIDEO_ID}`), true);
  assert.equal(isYouTubeUrl(`http://youtube.com/watch?v=${VIDEO_ID}`), true);
  assert.equal(isYouTubeUrl("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"), false);
  assert.equal(isYouTubeUrl("<iframe></iframe>"), false);
});

test("normalizes Google Meet URLs and rejects unrelated URLs", () => {
  assert.equal(normalizeGoogleMeetUrl("https://meet.google.com/abc-defg-hij"), "https://meet.google.com/abc-defg-hij");
  assert.equal(normalizeGoogleMeetUrl("https://meet.google.com/abc-defg-hij/"), "https://meet.google.com/abc-defg-hij");
  assert.equal(normalizeGoogleMeetUrl("https://meet.google.com/ABC-DEFG-HIJ?authuser=0"), "https://meet.google.com/abc-defg-hij");
  assert.equal(normalizeGoogleMeetUrl("http://meet.google.com/abc-defg-hij"), null);
  assert.equal(normalizeGoogleMeetUrl("https://meet.google.com/abc-defg-hij/extra"), null);
  assert.equal(normalizeGoogleMeetUrl("https://meet.google.com/abc-def-hij"), null);
  assert.equal(normalizeGoogleMeetUrl("https://meet.google.com.evil.test/abc-defg-hij"), null);
  assert.equal(normalizeGoogleMeetUrl("<iframe></iframe>"), null);
});

test("validates selected YouTube class media without auto-detecting type", () => {
  const result = parseClassMediaInput("YOUTUBE_LIVE", `https://youtube.com/watch?v=${VIDEO_ID}`, "https://meet.google.com/abc-defg-hij");
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.value), {
    classType: "YOUTUBE_LIVE",
    youtubeVideoId: VIDEO_ID,
    googleMeetUrl: null,
  });

  assert.equal(parseClassMediaInput("YOUTUBE_LIVE", "https://meet.google.com/abc-defg-hij", "").ok, false);
  assert.equal(parseClassMediaInput("YOUTUBE_LIVE", `<iframe src="https://youtube.com/embed/${VIDEO_ID}"></iframe>`, "").ok, false);
});

test("validates selected Google Meet class media without auto-detecting type", () => {
  const result = parseClassMediaInput("GOOGLE_MEET", `https://youtube.com/watch?v=${VIDEO_ID}`, "https://meet.google.com/abc-defg-hij?authuser=0");
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.value), {
    classType: "GOOGLE_MEET",
    youtubeVideoId: null,
    googleMeetUrl: "https://meet.google.com/abc-defg-hij",
  });

  assert.equal(parseClassMediaInput("GOOGLE_MEET", "", `https://youtube.com/watch?v=${VIDEO_ID}`).ok, false);
  assert.equal(parseClassMediaInput("ZOOM", "", "https://meet.google.com/abc-defg-hij").ok, false);
});

test("reports invalid stored media combinations", () => {
  assert.equal(getStoredClassMediaError({ classType: "YOUTUBE_LIVE", youtubeVideoId: VIDEO_ID, googleMeetUrl: null }), null);
  assert.match(getStoredClassMediaError({ classType: "YOUTUBE_LIVE", youtubeVideoId: null, googleMeetUrl: null }), /YouTube/);
  assert.match(getStoredClassMediaError({ classType: "YOUTUBE_LIVE", youtubeVideoId: VIDEO_ID, googleMeetUrl: "https://meet.google.com/abc-defg-hij" }), /Google Meet/);
  assert.equal(getStoredClassMediaError({ classType: "GOOGLE_MEET", youtubeVideoId: null, googleMeetUrl: "https://meet.google.com/abc-defg-hij" }), null);
  assert.match(getStoredClassMediaError({ classType: "GOOGLE_MEET", youtubeVideoId: VIDEO_ID, googleMeetUrl: "https://meet.google.com/abc-defg-hij" }), /YouTube/);
});

test("normalizes YouTube watch URLs from stored IDs", () => {
  assert.equal(normalizeYouTubeWatchUrl(VIDEO_ID), `https://www.youtube.com/watch?v=${VIDEO_ID}`);
});

let passed = 0;
for (const { name, fn } of tests) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

console.log(`\n${passed} education video-link edge tests passed`);
