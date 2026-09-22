/**
 * Tracks which Practice-mode problems the learner has solved, client-side.
 *
 * There's no backend database for this app (no auth, no server persistence),
 * so - same as missionLog.js - progress lives in localStorage. It survives
 * refreshes and future visits in the same browser, but is per-browser, not
 * per-account.
 *
 * Shape: { [problemId]: {
 *   problemId, title, difficulty,
 *   language, code,        // the ACCEPTED solution - "how" it was solved
 *   solvedAt,              // ISO timestamp of the FIRST accepted submit
 *   lastSolvedAt,          // ISO timestamp of the MOST RECENT accepted submit
 *   solveCount,            // how many times "Submit" has returned Accepted
 * } }
 */

const STORAGE_KEY = "sentinel-practice-progress";

export function loadProgress() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or unavailable - progress just won't persist this time.
  }
}

/**
 * Call this whenever a "Submit" comes back Accepted. Returns the updated
 * progress map (also persists it) so the caller can setState directly.
 */
export function recordSolve(progress, { problemId, title, difficulty, language, code }) {
  const now = new Date().toISOString();
  const existing = progress[problemId];
  const next = {
    ...progress,
    [problemId]: {
      problemId,
      title,
      difficulty,
      language,
      code,
      solvedAt: existing?.solvedAt || now,
      lastSolvedAt: now,
      solveCount: (existing?.solveCount || 0) + 1,
    },
  };
  saveProgress(next);
  return next;
}

export function clearProgress() {
  saveProgress({});
  return {};
}
