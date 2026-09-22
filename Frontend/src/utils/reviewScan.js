/**
 * Cheap client-side keyword scan of the raw review markdown, used only
 * to give the robot avatar and a spoken briefing something to react to
 * immediately - before the slower, more accurate "humanize" call
 * returns structured findings.
 */
export function quickSeverityScan(reviewText) {
  const text = (reviewText || "").toLowerCase();
  const count = (pattern) => (text.match(pattern) || []).length;

  const high = count(/security|vulnerab|sql injection|xss|critical|exploit/g);
  const bugs = count(/\bbug\b|\berror\b|incorrect|null pointer|race condition/g);
  const perf = count(/performance|inefficient|\bslow\b|memory leak|o\(n/g);

  return { high, bugs, perf };
}

export function scanToSeverity({ high, bugs, perf }) {
  if (high > 0) return "high";
  if (bugs + perf > 0) return "medium";
  return "clean";
}

export function buildBriefing({ high, bugs, perf }) {
  if (high + bugs + perf === 0) {
    return "Scan complete. This one looks clean - no major issues flagged.";
  }

  const parts = ["Scan complete."];
  if (high > 0) parts.push(`${high} potential security ${high === 1 ? "concern" : "concerns"} flagged.`);
  if (bugs > 0) parts.push(`${bugs} possible ${bugs === 1 ? "bug" : "bugs"} found.`);
  if (perf > 0) parts.push(`${perf} performance ${perf === 1 ? "note" : "notes"}.`);
  parts.push("Full breakdown is ready below.");
  return parts.join(" ");
}
