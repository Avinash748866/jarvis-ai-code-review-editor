import { useEffect, useState } from 'react'
import "prismjs/themes/prism-tomorrow.css"
import Editor from "react-simple-code-editor"
import prism from "prismjs"
import Markdown from "react-markdown"
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import axios from 'axios'
import './App.css'
import TeachingExplanations from './components/TeachingExplanations'
import RobotAvatar from './components/RobotAvatar'
import ThreatMeter from './components/ThreatMeter'
import MissionLog from './components/MissionLog'
import Practice from './components/Practice'
import JarvisWidget from './components/JarvisWidget'
import { API_BASE_URL } from './config/api'
import { useSpeechOutput, toSpeakableText } from './hooks/useSpeechOutput'
import { quickSeverityScan, scanToSeverity, buildBriefing } from './utils/reviewScan'
import { loadMissionLog, saveMissionLog, makeLogEntry } from './utils/missionLog'
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";

function App() {
  const [ code, setCode ] = useState(` function sum() {
  return 1 + 1
}`)

  const [ review, setReview ] = useState(``)
  const [ reviewReady, setReviewReady ] = useState(false)
  const [ loading, setLoading ] = useState(false)
  const [language, setLanguage] = useState("cpp");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // --- Sentinel (the robot assistant) state ---
  const [severity, setSeverity] = useState(null); // 'high' | 'medium' | 'clean' | null
  const [findings, setFindings] = useState(null);
  const [teachingLoading, setTeachingLoading] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [missionLog, setMissionLog] = useState(() => loadMissionLog());

  // --- Mode tabs: Review (default), Practice (LeetCode-style) ---
  // Live Comms used to be a third tab here, but it duplicated JARVIS Mode
  // (same /converse backend, same Hinglish voice persona) with a weaker,
  // one-shot mic instead of JARVIS's always-listening loop + voice
  // commands + proactive stuck-detection. JarvisWidget below now covers
  // Review mode too, so there's one voice assistant experience everywhere
  // instead of two different ones.
  const [mode, setMode] = useState("review");

  const speech = useSpeechOutput();

  useEffect(() => {
    prism.highlightAll()
  }, [])

  async function reviewCode() {
    try {
      setLoading(true);
      setReviewReady(false);
      setSeverity(null);
      setFindings(null);
      speech.cancel();

      const response = await axios.post(
        `${API_BASE_URL}/get-review`,
        { code }
      );

      setReview(response.data);
      setReviewReady(true);

      const scan = quickSeverityScan(response.data);
      setSeverity(scanToSeverity(scan));

      const entry = makeLogEntry({ code, review: response.data, language });
      setMissionLog((prev) => {
        const next = [entry, ...prev].slice(0, 20);
        saveMissionLog(next);
        return next;
      });

      if (voiceOut) {
        speech.speak(buildBriefing(scan));
      }

    } catch (error) {

      setReview(
        error?.response?.data?.message ||
        error?.message ||
        "Error generating review"
      );
      setReviewReady(false);

    } finally {

      setLoading(false);

    }
  }
  function copyReview() {
    navigator.clipboard.writeText(review);
    alert("Review copied!");
  }

  async function submitQuestion(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    try {
      setChatLoading(true);

      setMessages(prev => [...prev, { role: "user", text: trimmed }]);

      const response = await axios.post(
        `${API_BASE_URL}/chat`,
        {
          code,
          question: trimmed
        }
      );

      const answer = response.data;
      setMessages(prev => [...prev, { role: "assistant", text: answer }]);
      setQuestion("");

      if (voiceOut) {
        speech.speak(toSpeakableText(answer));
      }

    } catch (error) {

      console.error(error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "⚠️ Couldn't reach the backend for that one. Try again in a moment." }
      ]);

    } finally {

      setChatLoading(false);

    }
  }

  async function askQuestion() {
    await submitQuestion(question);
  }

  function handleFindings(nextFindings) {
    setFindings(nextFindings);
    if (nextFindings.some((f) => f.severity === "high")) setSeverity("high");
    else if (nextFindings.length > 0) setSeverity("medium");
    else setSeverity("clean");
  }

  function loadLogEntry(entry) {
    setCode(entry.code);
    setLanguage(entry.language || "cpp");
    setReview(entry.review);
    setReviewReady(true);
    setFindings(null);
    const scan = quickSeverityScan(entry.review);
    setSeverity(scanToSeverity(scan));
    setLogOpen(false);
  }

  function clearLog() {
    setMissionLog([]);
    saveMissionLog([]);
  }

  function toggleVoiceOut() {
    const next = !voiceOut;
    setVoiceOut(next);
    if (!next) speech.cancel();
  }

  // --- Derive Sentinel's live status for the HUD + robot color ---
  let robotStatus = "idle";
  let statusLabel = "STANDBY";

  if (loading) {
    robotStatus = "analyzing";
    statusLabel = "SCANNING CODE...";
  } else if (chatLoading) {
    robotStatus = "thinking";
    statusLabel = "PROCESSING...";
  } else if (teachingLoading) {
    robotStatus = "thinking";
    statusLabel = "COMPILING BRIEFING...";
  } else if (speech.speaking) {
    robotStatus = "speaking";
    statusLabel = "REPORTING...";
  } else if (severity === "high") {
    robotStatus = "alert";
    statusLabel = "ISSUES DETECTED";
  } else if (severity === "clean" || severity === "low") {
    robotStatus = "success";
    statusLabel = "SCAN CLEAN";
  } else if (severity === "medium") {
    robotStatus = "thinking";
    statusLabel = "MINOR ISSUES";
  }

  return (
    <>
      <header className="hud-header">
        <div className="hud-brand">
          <div className="hud-robot">
            <RobotAvatar status={robotStatus} />
          </div>
          <div className="hud-brand-text">
            <h1>SENTINEL</h1>
            <p>Autonomous code review unit</p>
          </div>
        </div>

        <div className="hud-status">
          <span className={`hud-status-dot hud-status-${robotStatus}`} />
          <span className="hud-status-label">{statusLabel}</span>
        </div>

        <nav className="hud-tabs">
          <button
            type="button"
            className={`hud-tab ${mode === "review" ? "hud-tab-active" : ""}`}
            onClick={() => setMode("review")}
          >
            🛰 Review
          </button>
          <button
            type="button"
            className={`hud-tab ${mode === "practice" ? "hud-tab-active" : ""}`}
            onClick={() => setMode("practice")}
          >
            🧩 Practice
          </button>
        </nav>

        <div className="hud-actions">
          {mode === "review" && (
            <label className="hud-toggle" title="Sentinel reads its findings aloud">
              <input type="checkbox" checked={voiceOut} onChange={toggleVoiceOut} />
              <span>🔊 Voice replies</span>
            </label>
          )}
          <button type="button" className="hud-log-btn" onClick={() => setLogOpen(true)}>
            🗂 Mission Log
          </button>
        </div>
      </header>

      {mode === "practice" && <Practice />}

      {mode === "review" && <main>
        <div className="left">

          <div className="editor-header">

            <span>📄 main.{language}</span>

            <select
              value={language}
              onChange={(e) => {
                const lang = e.target.value;
                setLanguage(lang);

                if (lang === "js") {
                  setCode("function sum(a, b) {\n  return a + b;\n}");
                }

                if (lang === "py") {
                  setCode("def sum(a, b):\n    return a + b");
                }

                if (lang === "java") {
                  setCode(
                    "class Main {\n  public static void main(String[] args) {\n  }\n}"
                  );
                }

                if (lang === "cpp") {
                  setCode(
                    "#include <iostream>\nusing namespace std;\n\nint main() {\n\n}"
                  );
                }
              }}

            >
              <option value="js">JavaScript</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="py">Python</option>
            </select>

          </div>


          <div className="code">
            <Editor
              value={code}
              onValueChange={code => setCode(code)}
              highlight={(code) => {
                const prismLanguage =
                  language === "js"
                    ? "javascript"
                    : language === "py"
                      ? "python"
                      : language === "java"
                        ? "java"
                        : "cpp";

                return prism.highlight(
                  code,
                  prism.languages[prismLanguage],
                  prismLanguage
                );
              }}
              padding={10}
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 16,
                border: "none",
                borderRadius: "5px",
                height: "100%",
                width: "100%",
                backgroundColor: "#0d1117",
                color: "#e6edf3"
              }}
            />
          </div>
          <div
            onClick={!loading ? reviewCode : undefined}
            className="review">

            {loading ? "Scanning..." : "▸ Run Diagnostic"}

          </div>
        </div>
        <div className="right">

          <div className="review-content">

            {reviewReady && findings && <ThreatMeter findings={findings} />}

            {review && (
              <div className="copy-btn" onClick={copyReview}>
                📋 Copy Review
              </div>
            )}

            <Markdown rehypePlugins={[rehypeHighlight]}>
              {review}
            </Markdown>

            {reviewReady && (
              <TeachingExplanations
                code={code}
                review={review}
                onFindings={handleFindings}
                onLoadingChange={setTeachingLoading}
              />
            )}

            <h3 style={{ marginTop: "20px" }}>
              💬 Conversation
            </h3>
            <div className="chat-messages">

              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={
                    msg.role === "user"
                      ? "user-message"
                      : "ai-message"
                  }
                >
                  {
                    msg.role === "assistant"
                      ? (
                        <Markdown rehypePlugins={[rehypeHighlight]}>
                          {msg.text}
                        </Markdown>
                      )
                      : msg.text
                  }
                </div>
              ))}

            </div>

          </div>

          <div className="chat-section">

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  askQuestion();
                }
              }}
              placeholder="Ask anything about this code..."
            />

            <button onClick={askQuestion}>
              {chatLoading ? "Thinking..." : "Send"}
            </button>

          </div>

        </div>
      </main>}

      {mode === "review" && (
        <JarvisWidget
          context={{ mode: "review", language, code, review }}
          greeting="JARVIS mode on hai. Tumhara editor wala code mujhe live dikh raha hai - bas bolo, main sun raha hoon."
        />
      )}

      <MissionLog
        open={logOpen}
        entries={missionLog}
        onSelect={loadLogEntry}
        onClear={clearLog}
        onClose={() => setLogOpen(false)}
      />
      {logOpen && <div className="mission-log-backdrop" onClick={() => setLogOpen(false)} />}
    </>
  )
}



export default App
