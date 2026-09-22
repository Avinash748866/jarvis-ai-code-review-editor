/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import axios from "axios";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import ListenButton from "./ListenButton";
import { API_BASE_URL } from "../config/api";
import "./TeachingExplanations.css";

const CATEGORY_LABELS = {
  security: "Security Issue",
  performance: "Performance Issue",
  bug: "Bug",
  maintainability: "Maintainability",
  style: "Style",
  other: "Finding"
};

/**
 * Shows the AI's technical review findings as separate, humanized,
 * teaching-style explanations - the "senior dev walking you through it"
 * layer on top of the existing written review. Text is generated as soon
 * as a review is available; audio only ever plays when the user presses
 * "Listen to Explanation" inside ListenButton.
 */
function TeachingExplanations({ code, review, onFindings, onLoadingChange }) {
  const [mode, setMode] = useState("teaching");
  const [language, setLanguage] = useState("en");
  const [findings, setFindings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cache, setCache] = useState({});

  useEffect(() => {
    fetchExplanations("teaching", "en");
    // Re-fetch whenever the underlying review changes (new code was reviewed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review]);

  async function fetchExplanations(nextMode, nextLanguage) {
    const cacheKey = `${nextMode}-${nextLanguage}`;

    if (cache[cacheKey]) {
      setFindings(cache[cacheKey]);
      onFindings?.(cache[cacheKey]);
      setError("");
      return;
    }

    try {
      setLoading(true);
      onLoadingChange?.(true);
      setError("");

      const response = await axios.post(
        `${API_BASE_URL}/humanize`,
        { code, review, mode: nextMode, language: nextLanguage }
      );

      const result = response.data?.findings || [];
      setFindings(result);
      onFindings?.(result);
      setCache((prev) => ({ ...prev, [cacheKey]: result }));

    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Couldn't generate the teaching explanations right now."
      );
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    fetchExplanations(nextMode, language);
  }

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    fetchExplanations(mode, nextLanguage);
  }

  return (
    <div className="teaching-section">
      <div className="teaching-header">
        <h3>{"👨‍🏫 Let's understand this"}</h3>

        <div className="teaching-controls">
          <div className="mode-tabs">
            <button
              type="button"
              className={mode === "teaching" ? "mode-tab active" : "mode-tab"}
              onClick={() => handleModeChange("teaching")}
            >
              👨‍🏫 Teaching
            </button>
            <button
              type="button"
              className={mode === "quick" ? "mode-tab active" : "mode-tab"}
              onClick={() => handleModeChange("quick")}
            >
              ⚡ Quick
            </button>
            <button
              type="button"
              className={mode === "beginner" ? "mode-tab active" : "mode-tab"}
              onClick={() => handleModeChange("beginner")}
            >
              🧑‍💻 Beginner
            </button>
          </div>

          <select className="language-select" value={language} onChange={handleLanguageChange}>
            <option value="en">English</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>
      </div>

      {loading && (
        <p className="teaching-status">Turning the review into a teaching explanation...</p>
      )}

      {!loading && error && (
        <p className="teaching-status teaching-error">
          {error} The written review above is still fully available.
        </p>
      )}

      {!loading && !error && findings && findings.length === 0 && (
        <p className="teaching-status">No major findings to teach through - nice and clean code here.</p>
      )}

      {!loading && !error && findings && findings.map((finding) => (
        <div key={finding.id || finding.title} className="finding-card">
          <div className="finding-title">
            <span className={`finding-badge finding-badge-${finding.severity || "medium"}`}>
              {finding.icon || "🔵"} {CATEGORY_LABELS[finding.category] || "Finding"}
            </span>
          </div>
          <p className="finding-name">{finding.title}</p>

          {finding.technicalWhy && (
            <>
              <h4>Why is this a problem?</h4>
              <p className="finding-technical">{finding.technicalWhy}</p>
            </>
          )}

          <h4>💡 Human Explanation</h4>
          <div className="finding-humanized">
            <Markdown rehypePlugins={[rehypeHighlight]}>
              {finding.humanizedExplanation}
            </Markdown>
          </div>

          <ListenButton text={finding.humanizedExplanation} />
        </div>
      ))}
    </div>
  );
}

export default TeachingExplanations;
