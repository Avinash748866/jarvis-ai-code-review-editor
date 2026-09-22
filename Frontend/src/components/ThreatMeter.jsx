/* eslint-disable react/prop-types */
import "./ThreatMeter.css";

const SEVERITY_ORDER = ["high", "medium", "low"];
const SEVERITY_LABEL = { high: "HIGH", medium: "MED", low: "LOW" };

/**
 * Small sci-fi HUD readout summarizing the severities of the findings
 * the AI returned. Purely derived from data already fetched for the
 * teaching explanations - no extra API calls.
 */
function ThreatMeter({ findings }) {
  if (!findings) return null;

  const counts = { high: 0, medium: 0, low: 0 };
  findings.forEach((f) => {
    const severity = SEVERITY_ORDER.includes(f.severity) ? f.severity : "low";
    counts[severity] += 1;
  });

  const total = findings.length;
  const overall = counts.high > 0 ? "alert" : counts.medium > 0 ? "caution" : "clear";
  const overallLabel =
    overall === "alert" ? "ISSUES DETECTED" : overall === "caution" ? "MINOR ISSUES" : "CLEAN SCAN";

  return (
    <div className={`threat-meter threat-meter-${overall}`}>
      <div className="threat-meter-header">
        <span className="threat-meter-dot" />
        <span>SCAN RESULT: {overallLabel}</span>
      </div>
      <div className="threat-meter-bars">
        {SEVERITY_ORDER.map((severity) => {
          const count = counts[severity];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div className="threat-meter-row" key={severity}>
              <span className="threat-meter-label">{SEVERITY_LABEL[severity]}</span>
              <div className="threat-meter-track">
                <div
                  className={`threat-meter-fill threat-meter-fill-${severity}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="threat-meter-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ThreatMeter;
