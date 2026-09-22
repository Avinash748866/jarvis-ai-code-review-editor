/**
 * Keeps whatever the learner is currently typing in the Practice editor
 * safe across refreshes, tab closes, or crashes - even before they've
 * clicked Run or Submit even once. Same localStorage approach as
 * practiceProgress.js/missionLog.js: per-browser, no server persistence.
 *
 * Shape: { [problemId]: { [language]: code } }
 */

const STORAGE_KEY = "sentinel-practice-drafts";

function loadAll() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(drafts) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Storage full or unavailable - the draft just won't persist this time.
  }
}

/** Returns the saved draft for this problem+language, or "" if there isn't one. */
export function getDraft(problemId, language) {
  if (!problemId || !language) return "";
  const drafts = loadAll();
  return drafts[problemId]?.[language] || "";
}

/**
 * Saves the current editor contents for this problem+language. Call this
 * on every code change (debounced by the caller) so a refresh never loses
 * unsaved work, without hammering localStorage on every keystroke.
 */
export function saveDraft(problemId, language, code) {
  if (!problemId || !language) return;
  const drafts = loadAll();
  const existing = drafts[problemId] || {};
  // Skip pointless writes: an empty draft that matches nothing already
  // saved doesn't need to touch localStorage.
  if (!code && !existing[language]) return;
  saveAll({
    ...drafts,
    [problemId]: { ...existing, [language]: code },
  });
}

export function clearDraft(problemId, language) {
  const drafts = loadAll();
  if (!drafts[problemId]) return;
  const existing = { ...drafts[problemId] };
  delete existing[language];
  if (Object.keys(existing).length === 0) {
    delete drafts[problemId];
  } else {
    drafts[problemId] = existing;
  }
  saveAll(drafts);
}
