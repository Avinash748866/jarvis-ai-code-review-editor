/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import Editor from "react-simple-code-editor";
import prism from "prismjs";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import JarvisWidget from "./JarvisWidget";
import PracticeProgress from "./PracticeProgress";
import NeuralCoach from "./NeuralCoach";
import { loadProgress, recordSolve, clearProgress } from "../utils/practiceProgress";
import { getDraft, saveDraft } from "../utils/codeDrafts";
import "./Practice.css";

const LANG_LABEL = { js: "JavaScript", cpp: "C++", java: "Java", py: "Python" };
const PRISM_LANG = { js: "javascript", cpp: "cpp", java: "java", py: "python" };

/**
 * The backend already returns problems in a deliberate learning order
 * (topic -> subtopic -> easy-to-hard). This just folds consecutive items
 * sharing a topic/subtopic into groups so the sidebar can render headings,
 * without re-sorting anything itself.
 */
function groupProblems(problems) {
  const topics = [];
  for (const p of problems) {
    const topicName = p.topic || "General";
    const subName = p.subtopic || "";
    let topicGroup = topics[topics.length - 1];
    if (!topicGroup || topicGroup.topic !== topicName) {
      topicGroup = { topic: topicName, subtopics: [] };
      topics.push(topicGroup);
    }
    let subGroup = topicGroup.subtopics[topicGroup.subtopics.length - 1];
    if (!subGroup || subGroup.subtopic !== subName) {
      subGroup = { subtopic: subName, items: [] };
      topicGroup.subtopics.push(subGroup);
    }
    subGroup.items.push(p);
  }
  return topics;
}

/**
 * LeetCode-style practice mode. Fetches problems + a starter template from
 * the backend, lets the learner edit code, and runs it against the local
 * judge (visible tests on "Run", all tests incl. hidden on "Submit").
 *
 * `onContextChange` reports the active problem + last run result up to
 * App so the Live Comms tab can tell Sentinel what the learner is stuck on.
 */
function Practice({ onContextChange }) {
  const [problems, setProblems] = useState([]);
  const [problemsError, setProblemsError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [runnerStatus, setRunnerStatus] = useState(null);

  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState("");

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState("");

  // Which problems have been solved (Accepted on "Submit"), persisted in
  // localStorage - see utils/practiceProgress.js.
  const [progress, setProgress] = useState(() => loadProgress());
  const [progressOpen, setProgressOpen] = useState(false);
  // When opening a solved entry from the drawer, remember the exact
  // accepted code so the detail-loading effect below can drop it into the
  // editor instead of the plain starter template.
  const pendingReviewRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/problems`)
      .then((res) => setProblems(res.data.problems || []))
      .catch(() => setProblemsError("Couldn't load the problem set."));

    axios
      .get(`${API_BASE_URL}/runner-status`)
      .then((res) => setRunnerStatus(res.data))
      .catch(() => setRunnerStatus({ enabled: false, languages: {}, message: "Couldn't reach the runner status endpoint." }));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setResult(null);
    setRunError("");

    axios
      .get(`${API_BASE_URL}/problems/${selectedId}`)
      .then((res) => {
        setDetail(res.data);
        const pending = pendingReviewRef.current;
        if (pending && pending.problemId === selectedId && pending.language === language) {
          setCode(pending.code);
          pendingReviewRef.current = null;
        } else {
          // Restore whatever was last typed for this problem+language
          // before falling back to the blank starter template, so a
          // refresh never wipes out code that was never Run/Submitted.
          const draft = getDraft(selectedId, language);
          setCode(draft || res.data.starter?.[language] || "");
        }
      })
      .catch(() => setRunError("Couldn't load that problem."))
      .finally(() => setDetailLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    prism.highlightAll();
  }, [detail]);

  // Auto-save the editor's contents locally (debounced) so refreshing the
  // page - or the tab crashing - never wipes out code that hasn't been
  // Run or Submitted yet.
  useEffect(() => {
    if (!selectedId || !language) return;
    const t = setTimeout(() => saveDraft(selectedId, language, code), 400);
    return () => clearTimeout(t);
  }, [selectedId, language, code]);

  useEffect(() => {
    if (!detail) return;
    onContextChange?.({
      problem: { title: detail.title, difficulty: detail.difficulty, statement: detail.statement },
      language,
      code,
      lastRun: result
        ? {
            mode: result.mode,
            verdict: result.verdict,
            passed: result.passed,
            total: result.total,
            detail: summarizeFailure(result),
          }
        : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, language, code, result]);

  function changeLanguage(lang) {
    setLanguage(lang);
    if (detail?.starter?.[lang] !== undefined) {
      const draft = getDraft(selectedId, lang);
      setCode(draft || detail.starter[lang]);
      setResult(null);
    }
  }

  async function run(mode) {
    if (!selectedId) return;
    setRunError("");
    setResult(null);
    if (mode === "submit") setSubmitting(true);
    else setRunning(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/run`, {
        problemId: selectedId,
        language,
        code,
        mode,
      });
      setResult(res.data);

      if (mode === "submit" && res.data.verdict === "Accepted" && detail) {
        setProgress((prev) =>
          recordSolve(prev, {
            problemId: selectedId,
            title: detail.title,
            difficulty: detail.difficulty,
            language,
            code,
          })
        );
      }
    } catch (error) {
      setRunError(
        error?.response?.data?.message || error?.message || "The runner hit an unexpected error."
      );
    } finally {
      setRunning(false);
      setSubmitting(false);
    }
  }

  const langAvailable = runnerStatus?.enabled ? runnerStatus.languages?.[language]?.available : false;

  function openSolvedEntry(entry) {
    setProgressOpen(false);
    setLanguage(entry.language);
    if (entry.problemId === selectedId) {
      // Already viewing this problem - the detail-loading effect won't
      // re-fire (selectedId is unchanged), so just drop the code in directly.
      setCode(entry.code);
      setResult(null);
    } else {
      pendingReviewRef.current = { problemId: entry.problemId, language: entry.language, code: entry.code };
      setSelectedId(entry.problemId);
    }
  }

  function handleClearProgress() {
    setProgress(clearProgress());
  }

  return (
    <div className="practice">
      <aside className="practice-sidebar">
        <div className="practice-sidebar-header">
          <h2 className="practice-sidebar-title">Problems</h2>
          <button type="button" className="practice-progress-toggle" onClick={() => setProgressOpen(true)}>
            ✅ {Object.keys(progress).length}/{problems.length || "?"}
          </button>
        </div>
        {problemsError && <p className="practice-error">{problemsError}</p>}
        <p className="practice-sidebar-caption">
          Grouped by topic and pattern - work top to bottom for the smoothest learning curve.
        </p>
        {groupProblems(problems).map((topicGroup) => (
          <div className="practice-topic-group" key={topicGroup.topic}>
            <h3 className="practice-topic-heading">{topicGroup.topic}</h3>
            {topicGroup.subtopics.map((sub) => (
              <div className="practice-subtopic-group" key={sub.subtopic || "_"}>
                {sub.subtopic && <h4 className="practice-subtopic-heading">{sub.subtopic}</h4>}
                <ul className="practice-problem-list">
                  {sub.items.map((p) => {
                    const solved = progress[p.id];
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`practice-problem-item ${selectedId === p.id ? "practice-problem-item-active" : ""} ${solved ? "practice-problem-item-solved" : ""}`}
                          onClick={() => setSelectedId(p.id)}
                          title={solved ? `Solved ${new Date(solved.solvedAt).toLocaleString()}` : undefined}
                        >
                          <span className="practice-problem-title">
                            {solved ? "✅ " : ""}
                            {p.title}
                          </span>
                          <span className={`practice-difficulty practice-difficulty-${p.difficulty?.toLowerCase()}`}>
                            {p.difficulty}
                          </span>
                          <span className="practice-tags">{(p.tags || []).join(" · ")}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </aside>

      <section className="practice-main">
        {!selectedId && (
          <div className="practice-placeholder">
            <p>Pick a problem from the left to start.</p>
          </div>
        )}

        {selectedId && detailLoading && <div className="practice-placeholder">Loading problem…</div>}

        {selectedId && !detailLoading && detail && (
          <>
            <div className="practice-statement-panel">
              <div className="practice-statement-header">
                <h2>{detail.title}</h2>
                <span className={`practice-difficulty practice-difficulty-${detail.difficulty?.toLowerCase()}`}>
                  {detail.difficulty}
                </span>
              </div>

              <Markdown rehypePlugins={[rehypeHighlight]}>{detail.statement}</Markdown>

              <div className="practice-io-format">
                <div>
                  <h4>Input</h4>
                  <Markdown>{detail.inputFormat}</Markdown>
                </div>
                <div>
                  <h4>Output</h4>
                  <Markdown>{detail.outputFormat}</Markdown>
                </div>
              </div>

              {detail.constraints?.length > 0 && (
                <div className="practice-constraints">
                  <h4>Constraints</h4>
                  <ul>
                    {detail.constraints.map((c, i) => (
                      <li key={i}>
                        <Markdown>{c}</Markdown>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.examples?.length > 0 && (
                <div className="practice-examples">
                  <h4>Examples</h4>
                  {detail.examples.map((ex, i) => (
                    <div className="practice-example" key={i}>
                      <div className="practice-example-io">
                        <div>
                          <span className="practice-example-label">Input</span>
                          <pre>{ex.input}</pre>
                        </div>
                        <div>
                          <span className="practice-example-label">Output</span>
                          <pre>{ex.output}</pre>
                        </div>
                      </div>
                      {ex.explanation && <p className="practice-example-explanation">{ex.explanation}</p>}
                    </div>
                  ))}
                </div>
              )}

              {detail.hiddenTestCount > 0 && (
                <p className="practice-hidden-note">
                  + {detail.hiddenTestCount} hidden test{detail.hiddenTestCount === 1 ? "" : "s"}, run only on Submit.
                </p>
              )}
            </div>

            <div className="practice-editor-panel">
              <div className="practice-editor-header">
                <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
                  {Object.keys(LANG_LABEL).map((lang) => (
                    <option key={lang} value={lang}>
                      {LANG_LABEL[lang]}
                    </option>
                  ))}
                </select>

                {runnerStatus && !runnerStatus.enabled && (
                  <span className="practice-runner-hint">Runner offline — {runnerStatus.message}</span>
                )}
                {runnerStatus?.enabled && !langAvailable && (
                  <span className="practice-runner-hint">
                    {runnerStatus.languages?.[language]?.hint || `${LANG_LABEL[language]} isn't installed on this machine.`}
                  </span>
                )}
              </div>

              <div className="practice-code">
                <Editor
                  value={code}
                  onValueChange={setCode}
                  highlight={(c) => prism.highlight(c, prism.languages[PRISM_LANG[language]] || prism.languages.clike, PRISM_LANG[language])}
                  padding={10}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 15,
                    minHeight: "100%",
                    backgroundColor: "#0d1117",
                    color: "#e6edf3",
                  }}
                />
              </div>

              <div className="practice-run-actions">
                <button
                  type="button"
                  className="practice-run-btn"
                  disabled={running || submitting || !runnerStatus?.enabled}
                  onClick={() => run("run")}
                >
                  {running ? "Running…" : "▸ Run"}
                </button>
                <button
                  type="button"
                  className="practice-submit-btn"
                  disabled={running || submitting || !runnerStatus?.enabled}
                  onClick={() => run("submit")}
                >
                  {submitting ? "Submitting…" : "✓ Submit"}
                </button>
              </div>

              {runError && <p className="practice-error">{runError}</p>}

              {result && <ResultPanel result={result} />}
            </div>
          </>
        )}
      </section>

      <NeuralCoach
        problems={problems}
        progress={progress}
        problem={detail ? { id: detail.id, title: detail.title, difficulty: detail.difficulty, statement: detail.statement } : null}
        language={language}
        code={code}
        lastRun={
          result
            ? { mode: result.mode, verdict: result.verdict, passed: result.passed, total: result.total, detail: summarizeFailure(result) }
            : null
        }
      />

      <JarvisWidget
        context={{
          mode: "practice",
          problem: detail ? { title: detail.title, difficulty: detail.difficulty, statement: detail.statement } : null,
          language,
          code,
          lastRun: result
            ? {
                mode: result.mode,
                verdict: result.verdict,
                passed: result.passed,
                total: result.total,
                detail: summarizeFailure(result),
              }
            : null,
        }}
        actions={{
          run: () => {
            if (runnerStatus?.enabled && !running && !submitting) run("run");
          },
          submit: () => {
            if (runnerStatus?.enabled && !running && !submitting) run("submit");
          },
          setLanguage: changeLanguage,
          languages: detail?.starter ? Object.keys(detail.starter) : Object.keys(LANG_LABEL),
        }}
        greeting="JARVIS mode on hai. Tumhara editor wala code mujhe live dikh raha hai, isliye paste karne ki zarurat nahi - bas bolo, main sun raha hoon."
      />

      <PracticeProgress
        open={progressOpen}
        entries={Object.values(progress)}
        onSelect={openSolvedEntry}
        onClear={handleClearProgress}
        onClose={() => setProgressOpen(false)}
      />
    </div>
  );
}

function summarizeFailure(result) {
  if (result.verdict === "Accepted") return "";
  const failing = result.cases.find((c) => c.status !== "passed");
  if (!failing) return result.verdict;
  return `${result.verdict} on test ${failing.index}${failing.stderr ? `: ${failing.stderr}` : ""}`;
}

function ResultPanel({ result }) {
  const accepted = result.verdict === "Accepted";
  return (
    <div className={`practice-result ${accepted ? "practice-result-pass" : "practice-result-fail"}`}>
      <div className="practice-result-verdict">
        {accepted ? "✅" : "❌"} {result.verdict} — {result.passed}/{result.total} test{result.total === 1 ? "" : "s"} passed
      </div>

      {result.message && <p className="practice-result-message">{result.message}</p>}

      {result.cases.map((c) => (
        <div key={c.index} className={`practice-case practice-case-${c.status}`}>
          <div className="practice-case-header">
            <span>
              Test {c.index} {c.visible ? "" : "(hidden)"}
            </span>
            <span className="practice-case-status">{c.status}</span>
          </div>
          {c.visible && c.input !== undefined && (
            <div className="practice-case-io">
              <div>
                <span className="practice-example-label">Input</span>
                <pre>{c.input}</pre>
              </div>
              <div>
                <span className="practice-example-label">Expected</span>
                <pre>{c.expected}</pre>
              </div>
              <div>
                <span className="practice-example-label">Got</span>
                <pre>{c.actual}</pre>
              </div>
            </div>
          )}
          {c.stderr && <pre className="practice-case-stderr">{c.stderr}</pre>}
        </div>
      ))}
    </div>
  );
}

export default Practice;
