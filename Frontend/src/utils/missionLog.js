const STORAGE_KEY = "sentinel-mission-log";
const MAX_ENTRIES = 20;

export function loadMissionLog() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMissionLog(entries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable - the log just won't persist this time.
  }
}

export function makeLogEntry({ code, review, language }) {
  const preview = (code || "").trim().replace(/\s+/g, " ").slice(0, 60) || "(empty snippet)";
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    language,
    code,
    review,
    preview,
  };
}
