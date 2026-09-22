/* eslint-disable react/prop-types */
import "./MissionLog.css";

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

/**
 * Slide-in drawer of past reviews, persisted client-side in
 * localStorage by the parent. Selecting an entry just restores the
 * already-fetched code/review - no new API call.
 */
function MissionLog({ open, entries, onSelect, onClear, onClose }) {
  return (
    <div className={`mission-log ${open ? "mission-log-open" : ""}`}>
      <div className="mission-log-header">
        <span>MISSION LOG</span>
        <button type="button" className="mission-log-close" onClick={onClose} aria-label="Close mission log">
          ✕
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="mission-log-empty">No reviews logged yet this session.</p>
      ) : (
        <ul className="mission-log-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button type="button" className="mission-log-entry" onClick={() => onSelect(entry)}>
                <span className="mission-log-lang">{entry.language}</span>
                <span className="mission-log-preview">{entry.preview}</span>
                <span className="mission-log-time">{formatTime(entry.timestamp)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {entries.length > 0 && (
        <button type="button" className="mission-log-clear" onClick={onClear}>
          Clear log
        </button>
      )}
    </div>
  );
}

export default MissionLog;
