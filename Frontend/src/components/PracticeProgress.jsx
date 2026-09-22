/* eslint-disable react/prop-types */
import "./PracticeProgress.css";

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const LANG_LABEL = { js: "JavaScript", cpp: "C++", java: "Java", py: "Python" };

/**
 * Slide-in drawer showing which Practice problems have been solved -
 * when they were first (and most recently) accepted, in which language,
 * and how many times. Selecting an entry re-opens that problem with the
 * exact accepted solution loaded into the editor, so "how I solved it"
 * is always one click away.
 */
function PracticeProgress({ open, entries, onSelect, onClear, onClose }) {
  const sorted = [...entries].sort((a, b) => new Date(b.lastSolvedAt) - new Date(a.lastSolvedAt));

  return (
    <div className={`practice-progress-drawer ${open ? "practice-progress-drawer-open" : ""}`}>
      <div className="practice-progress-header">
        <span>SOLVED PROBLEMS {entries.length > 0 ? `(${entries.length})` : ""}</span>
        <button type="button" className="practice-progress-close" onClick={onClose} aria-label="Close progress log">
          ✕
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="practice-progress-empty">Nothing solved yet - accepted submissions show up here.</p>
      ) : (
        <ul className="practice-progress-list">
          {sorted.map((entry) => (
            <li key={entry.problemId}>
              <button type="button" className="practice-progress-entry" onClick={() => onSelect(entry)}>
                <div className="practice-progress-entry-top">
                  <span className="practice-progress-title">{entry.title}</span>
                  <span className={`practice-difficulty practice-difficulty-${entry.difficulty?.toLowerCase()}`}>
                    {entry.difficulty}
                  </span>
                </div>
                <div className="practice-progress-entry-bottom">
                  <span className="practice-progress-lang">{LANG_LABEL[entry.language] || entry.language}</span>
                  <span className="practice-progress-time">
                    {entry.solveCount > 1 ? `Last solved ${formatTime(entry.lastSolvedAt)}` : `Solved ${formatTime(entry.solvedAt)}`}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {entries.length > 0 && (
        <button type="button" className="practice-progress-clear" onClick={onClear}>
          Clear progress
        </button>
      )}
    </div>
  );
}

export default PracticeProgress;
