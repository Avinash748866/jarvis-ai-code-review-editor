/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import RobotAvatar from "./RobotAvatar";
import { useJarvisConversation } from "../hooks/useJarvisConversation";
import "./JarvisWidget.css";

const STATUS_LABEL = {
  idle: "STANDBY",
  listening: "LISTENING…",
  thinking: "THINKING…",
  speaking: "SPEAKING…",
};

/**
 * Floating, always-available JARVIS-style voice assistant that lives
 * directly inside whatever section it's dropped into (Practice Arena) -
 * no separate tab to switch to. Once activated it stays listening on its
 * own: speak, pause, it auto-sends; Sentinel replies aloud, then the mic
 * re-opens by itself. One click to start, one click to stop.
 */
function JarvisWidget({ context, greeting, actions }) {
  const jarvis = useJarvisConversation({ context, greeting, actions });
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [jarvis.messages, jarvis.interimTranscript]);

  useEffect(() => {
    // Opening the panel while JARVIS is already active makes it feel
    // discoverable the first time without forcing it open every render.
    if (jarvis.active) setOpen(true);
  }, [jarvis.active]);

  function handleMainClick() {
    if (!jarvis.active) {
      jarvis.activate();
      setOpen(true);
    } else {
      setOpen((o) => !o);
    }
  }

  function handleTypedSubmit(e) {
    e.preventDefault();
    if (!typed.trim()) return;
    jarvis.sendTyped(typed);
    setTyped("");
  }

  if (!jarvis.supported) {
    return (
      <div className="jarvis-dock jarvis-dock-unsupported">
        <span>🎙 Voice isn&apos;t supported in this browser.</span>
      </div>
    );
  }

  return (
    <div className={`jarvis-dock ${open ? "jarvis-dock-open" : ""} ${jarvis.active ? "jarvis-dock-active" : ""}`}>
      {open && (
        <div className="jarvis-panel">
          <div className="jarvis-panel-header">
            <div className="jarvis-panel-avatar">
              <RobotAvatar status={jarvis.status} variant="compact" />
            </div>
            <div className="jarvis-panel-heading">
              <span className="jarvis-panel-title">JARVIS Mode</span>
              <span className={`jarvis-status-line jarvis-status-${jarvis.status}`}>
                <VoiceStateIndicator status={jarvis.active ? jarvis.status : "idle"} />
                {jarvis.active ? STATUS_LABEL[jarvis.status] : "OFFLINE"}
              </span>
            </div>
            <button
              type="button"
              className="jarvis-close-btn"
              onClick={() => setOpen(false)}
              title="Minimize"
            >
              ▾
            </button>
          </div>

          <CodeSyncIndicator context={jarvis.context} syncedAt={jarvis.contextSyncedAt} />

          <div className="jarvis-transcript" ref={transcriptRef}>
            {jarvis.messages.length === 0 && (
              <p className="jarvis-hint">
                Tap the mic below and start talking - no need to click it again between turns,
                just pause for a second when you&apos;re done speaking.
                {actions?.run && (
                  <>
                    {" "}Try saying <strong>&quot;run karo&quot;</strong>, <strong>&quot;submit karo&quot;</strong>, or{" "}
                    <strong>&quot;python mein switch karo&quot;</strong> - JARVIS acts on it instantly. While you&apos;re
                    still writing your approach, it may jump in with a quick &quot;what if&quot; question of its own - and
                    if you get stuck on the same test twice, it&apos;ll jump in with a full walkthrough, all without you asking.
                  </>
                )}
              </p>
            )}
            {jarvis.messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "jarvis-msg-user"
                    : m.proactive
                    ? "jarvis-msg-ai jarvis-msg-proactive"
                    : "jarvis-msg-ai"
                }
              >
                {m.proactive && <span className="jarvis-proactive-tag">🛰 JARVIS noticed</span>}
                {m.text}
              </div>
            ))}
            {jarvis.interimTranscript && (
              <div className="jarvis-msg-user jarvis-msg-interim">{jarvis.interimTranscript}…</div>
            )}
            {jarvis.sending && <div className="jarvis-msg-ai jarvis-msg-typing">…</div>}
          </div>

          {jarvis.error && <p className="jarvis-error">{jarvis.error}</p>}

          {jarvis.usingFallbackVoice && (
            <p className="jarvis-hint jarvis-hint-fallback">
              Using your browser&apos;s default voice - set SARVAM_API_KEY in BackEnd/.env for a fluent Indian voice.
            </p>
          )}

          <form className="jarvis-typed-row" onSubmit={handleTypedSubmit}>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={jarvis.active ? "Or type instead of talking…" : "Activate JARVIS first"}
              disabled={!jarvis.active}
            />
            <button type="submit" disabled={!jarvis.active || !typed.trim()}>
              Send
            </button>
          </form>

          <div className="jarvis-panel-footer">
            <label className="jarvis-voiceout-toggle" title="Sentinel replies aloud">
              <input type="checkbox" checked={jarvis.voiceOut} onChange={jarvis.toggleVoiceOut} />
              <span>🔊 Speak replies</span>
            </label>
            <button type="button" className="jarvis-stop-btn" onClick={jarvis.deactivate}>
              ⏹ Stop JARVIS
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`jarvis-fab ${jarvis.active ? "jarvis-fab-active" : ""}`}
        onClick={handleMainClick}
        title={
          jarvis.active
            ? "Open JARVIS panel"
            : jarvis.context?.code?.trim()
            ? "Activate JARVIS - it already sees your current code"
            : "Activate JARVIS - hands-free voice help"
        }
      >
        <span className={`jarvis-fab-dot jarvis-fab-dot-${jarvis.status}`} />
        {jarvis.context?.code?.trim() && (
          <span className="jarvis-fab-sync-dot" title="JARVIS is watching your live code" />
        )}
        {jarvis.active ? (jarvis.status === "listening" ? "🎙" : jarvis.status === "speaking" ? "🔊" : "…") : "🎙"}
      </button>
    </div>
  );
}

/**
 * Small animated indicator next to the status text so the voice loop's
 * current state (listening / thinking / speaking) is obvious at a glance
 * while talking, instead of only readable from text - makes it much
 * easier to follow a hands-free conversation.
 */
function VoiceStateIndicator({ status }) {
  if (status === "listening") {
    return (
      <span className="jarvis-voicebars" aria-hidden="true">
        <span /><span /><span /><span />
      </span>
    );
  }
  if (status === "thinking") {
    return (
      <span className="jarvis-thinking-dots" aria-hidden="true">
        <span /><span /><span />
      </span>
    );
  }
  if (status === "speaking") {
    return (
      <span className="jarvis-voicebars jarvis-voicebars-speaking" aria-hidden="true">
        <span /><span /><span /><span />
      </span>
    );
  }
  return <span className="jarvis-status-dot" />;
}

/**
 * Proof-of-life for "JARVIS can see your current code" - shows exactly
 * what it's working with right now (problem, language, line count) and
 * how many seconds ago it last changed, refreshed live as you type. This
 * is what tells the learner they don't need to paste their code in by
 * hand - JARVIS already has it.
 */
function CodeSyncIndicator({ context, syncedAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const code = context?.code || "";
  if (!code.trim()) {
    return (
      <div className="jarvis-sync jarvis-sync-empty">
        <span className="jarvis-sync-dot" />
        Editor abhi khaali hai - kuch likhna shuru karo, JARVIS turant dekh lega.
      </div>
    );
  }

  const secondsAgo = Math.max(0, Math.round((now - (syncedAt || now)) / 1000));
  const agoLabel = secondsAgo < 2 ? "abhi" : `${secondsAgo}s pehle`;
  const lineCount = code.split("\n").length;
  const CHAR_LIMIT = 6000; // must match BackEnd CONVERSE_LIMITS.maxCodeChars
  const truncated = code.length > CHAR_LIMIT;
  const label = context?.problem?.title
    ? `${context.problem.title} · ${lineCount} line${lineCount === 1 ? "" : "s"}`
    : `${lineCount} line${lineCount === 1 ? "" : "s"}`;

  return (
    <details className="jarvis-sync">
      <summary>
        <span className="jarvis-sync-dot jarvis-sync-dot-live" />
        👁 Live code synced — {label} · updated {agoLabel}
      </summary>
      <pre className="jarvis-sync-preview">{code}</pre>
      {truncated && (
        <p className="jarvis-sync-warning">
          ⚠️ Code {CHAR_LIMIT} characters se lamba hai - sirf shuru ka hissa JARVIS tak bheja jaata
          hai. Bahut lambi file par help chahiye toh us specific part ko point out karke poochho.
        </p>
      )}
    </details>
  );
}

export default JarvisWidget;
