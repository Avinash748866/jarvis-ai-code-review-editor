/**
 * Neural Coach gamification engine.
 *
 * Deliberately does NOT keep its own "which problems are solved" store -
 * that already exists in utils/practiceProgress.js. This file only turns
 * that existing data (+ the problem list, for topic/difficulty lookup)
 * into the numbers the Neural Coach panel and the AI coach's persona feed
 * on: XP, level, daily streak, per-topic mastery, and badges.
 *
 * The one piece of state genuinely new here is the hint-ladder escalation
 * level per problem, which gets its own tiny localStorage key.
 */

const XP_BY_DIFFICULTY = { Easy: 10, Medium: 25, Hard: 50 };

const BADGES = [
  { id: "first-blood", label: "First Blood", icon: "🩸", check: (s) => s.totalSolved >= 1 },
  { id: "on-a-roll", label: "On a Roll", icon: "🔥", check: (s) => s.streak >= 3 },
  { id: "unstoppable", label: "Unstoppable", icon: "⚡", check: (s) => s.streak >= 7 },
  { id: "hard-mode", label: "Hard Mode", icon: "💀", check: (s) => (s.difficultyCounts.Hard || 0) >= 1 },
  { id: "decathlon", label: "Decathlon", icon: "🏆", check: (s) => s.totalSolved >= 10 },
  { id: "specialist", label: "Topic Specialist", icon: "🧠", check: (s) => s.maxTopicSolved >= 5 },
];

/** XP required to go from level N to N+1 grows gently so early levels feel fast. */
export function levelFromXp(xp) {
  let level = 1;
  let remaining = xp;
  let need = 60;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = Math.round(need * 1.18);
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: need };
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Longest currently-alive run of consecutive days with at least one Accepted solve. */
function computeStreak(progress) {
  const days = new Set();
  Object.values(progress).forEach((entry) => {
    if (entry.solvedAt) days.add(dayKey(new Date(entry.solvedAt).getTime()));
    if (entry.lastSolvedAt) days.add(dayKey(new Date(entry.lastSolvedAt).getTime()));
  });

  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 86400000);
  let anchor = null;
  if (days.has(today)) anchor = Date.now();
  else if (days.has(yesterday)) anchor = Date.now() - 86400000;
  else return 0;

  let streak = 0;
  let cursor = anchor;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= 86400000;
  }
  return streak;
}

/**
 * Full mastery snapshot for the Neural Coach panel + the AI coach's
 * context: XP/level, streak, per-topic solve rate (weak = <40%), and
 * unlocked badges. `progress` is the same map Practice.jsx already loads
 * from practiceProgress.js; `problems` is the topic/difficulty catalog.
 */
export function getMastery(problems = [], progress = {}) {
  const solvedEntries = Object.entries(progress);
  const byId = new Map(problems.map((p) => [p.id, p]));

  const topicCounts = {};
  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
  let xp = 0;

  solvedEntries.forEach(([problemId, entry]) => {
    const meta = byId.get(problemId);
    const topic = meta?.topic || "General";
    const difficulty = entry.difficulty || meta?.difficulty || "Easy";
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    difficultyCounts[difficulty] = (difficultyCounts[difficulty] || 0) + 1;
    xp += XP_BY_DIFFICULTY[difficulty] || 15;
  });

  const streak = computeStreak(progress);
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(xp);

  const topicTotals = {};
  problems.forEach((p) => {
    const t = p.topic || "General";
    topicTotals[t] = (topicTotals[t] || 0) + 1;
  });

  const topics = Object.keys(topicTotals).map((topic) => {
    const total = topicTotals[topic];
    const solved = topicCounts[topic] || 0;
    return { topic, total, solved, pct: total ? Math.round((solved / total) * 100) : 0 };
  });

  const weakTopics = topics.filter((t) => t.pct < 40 && t.total > 0).map((t) => t.topic);
  const strongTopics = topics.filter((t) => t.pct >= 80 && t.total >= 2).map((t) => t.topic);
  const maxTopicSolved = Object.values(topicCounts).reduce((m, v) => Math.max(m, v), 0);

  const summary = {
    totalSolved: solvedEntries.length,
    streak,
    difficultyCounts,
    maxTopicSolved,
  };

  return {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    streak,
    totalSolved: solvedEntries.length,
    totalProblems: problems.length,
    topics,
    weakTopics,
    strongTopics,
    badges: BADGES.map((b) => ({ ...b, unlocked: b.check(summary) })),
  };
}

/* ------------------------------------------------------------------ */
/* Hint ladder - the one bit of state genuinely new to this feature.   */
/* ------------------------------------------------------------------ */

const HINT_STORAGE_KEY = "sentinel-neural-hints";

function loadHints() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HINT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveHints(hints) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HINT_STORAGE_KEY, JSON.stringify(hints));
  } catch {
    /* storage full/blocked - hint level just won't persist this session */
  }
}

export function getHintLevel(problemId) {
  if (!problemId) return 0;
  return loadHints()[problemId] || 0;
}

/** Bumps and returns the hint escalation level for one problem, capped at 4. */
export function escalateHint(problemId) {
  const hints = loadHints();
  const next = Math.min(4, (hints[problemId] || 0) + 1);
  hints[problemId] = next;
  saveHints(hints);
  return next;
}
