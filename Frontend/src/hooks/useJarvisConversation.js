import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { useServerSpeech } from "./useServerSpeech";
import { toSpeakableText } from "./useSpeechOutput";
import { parseVoiceCommand } from "../utils/voiceCommands";

const SpeechRecognitionImpl =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// How long to wait after the user stops talking before treating that as
// "they're done with this turn" and auto-sending it - this is what removes
// the need to click the mic for every single thing you say.
const SILENCE_AUTO_SEND_MS = 1100;

// Short cooldown after Sentinel finishes speaking before the mic re-opens,
// so the tail end of its own voice (echo, speakers bleeding into the mic)
// doesn't get picked up and misread as the next thing you said.
const RESUME_LISTENING_DELAY_MS = 350;

// Stuck-detection: after this many consecutive non-accepted runs/submits on
// the SAME problem, JARVIS jumps in on its own with a full line-by-line
// walkthrough - no "should I help?" question, it just helps.
const STUCK_FAIL_THRESHOLD = 2;

// If the learner has failed at least once and then goes quiet (no new run,
// no new message) for this long, JARVIS sends one short, low-pressure
// check-in rather than waiting for the full-walkthrough threshold.
const STUCK_IDLE_MS = 45000;

// Mentor-style "what if" check-in: fires once per problem, before any
// run/submit, once the learner has meaningfully started writing their own
// code and then held still on it for this long - a mentor glancing over
// at their approach rather than only reacting to failures.
const APPROACH_CHECK_IDLE_MS = 35000;

// How many characters the code has to drift from what it looked like when
// the problem was opened before it counts as "actually writing", not just
// clicking around or an incidental whitespace change.
const APPROACH_CHECK_MIN_DRIFT = 15;

const LANG_SPOKEN_LABEL = { js: "JavaScript", py: "Python", java: "Java", cpp: "C++" };

/**
 * A JARVIS-style always-on voice loop: once activated, it keeps listening,
 * auto-sends what you said after a short pause (no per-turn mic clicking),
 * mutes itself while Sentinel is talking so it doesn't hear itself, and
 * automatically starts listening again afterwards. Meant to be embedded
 * directly wherever the learner already is (e.g. Practice Arena) instead
 * of requiring a separate tab.
 */
export function useJarvisConversation({ context, greeting, actions } = {}) {
  const [active, setActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [voiceOut, setVoiceOut] = useState(true);
  // Timestamp of the last time the live code/problem context actually
  // changed - lets the UI prove to the person that JARVIS is watching
  // their editor in real time, instead of them having to take it on faith
  // (and pasting code manually because they don't trust it's "seeing" it).
  const [contextSyncedAt, setContextSyncedAt] = useState(() => Date.now());

  const speech = useServerSpeech();

  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const sendingRef = useRef(false);
  const speakingRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const finalBufferRef = useRef("");
  const contextRef = useRef(context);
  const lastCodeRef = useRef(context?.code || "");
  const messagesRef = useRef(messages);
  const resumeTimerRef = useRef(null);

  // actions = { run, submit, setLanguage, languages } from Practice, so
  // voice commands like "run karo" / "python mein switch karo" can act
  // directly on the editor instead of only talking about it.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  // ---- stuck-detection bookkeeping ----
  const currentProblemRef = useRef(null);
  const lastRunSnapshotRef = useRef(null);
  const consecutiveFailRef = useRef(0);
  const walkthroughFiredForFailCountRef = useRef(0);
  const nudgeFiredForFailCountRef = useRef(0);
  const idleTimerRef = useRef(null);

  // ---- proactive approach-check bookkeeping (before any run happens) ----
  const codeBaselineRef = useRef(""); // what the editor looked like when this problem was opened
  const approachCheckFiredRef = useRef(false);
  const approachCheckTimerRef = useRef(null);
  // Set right before a voice-triggered run/submit, so the NEXT lastRun
  // update (once the judge finishes) gets announced aloud automatically -
  // the learner never has to ask "what happened?" after saying "run karo".
  const pendingVoiceAnnounceRef = useRef(false);

  useEffect(() => {
    contextRef.current = context;
    // Only bump the "synced" timestamp when the code/problem actually
    // changed content-wise, not on every incidental re-render (Practice
    // creates a brand-new context object on every render).
    const nextCode = context?.code || "";
    if (nextCode !== lastCodeRef.current) {
      lastCodeRef.current = nextCode;
      setContextSyncedAt(Date.now());
    }

    const problemKey = context?.problem?.title || null;
    if (problemKey !== currentProblemRef.current) {
      currentProblemRef.current = problemKey;
      consecutiveFailRef.current = 0;
      walkthroughFiredForFailCountRef.current = 0;
      nudgeFiredForFailCountRef.current = 0;
      lastRunSnapshotRef.current = null;
      clearTimeout(idleTimerRef.current);
      // Fresh problem = fresh baseline for "has the learner actually
      // started writing their own approach yet", and the approach-check
      // is allowed to fire again for this new problem.
      codeBaselineRef.current = nextCode;
      approachCheckFiredRef.current = false;
      clearTimeout(approachCheckTimerRef.current);
    }

    // Proactive approach-check: only relevant before any run has happened
    // on this problem, and only once the code has actually drifted from
    // the starter template by a meaningful amount (they're really writing,
    // not just clicking into the editor).
    if (
      !approachCheckFiredRef.current &&
      lastRunSnapshotRef.current === null &&
      Math.abs(nextCode.length - codeBaselineRef.current.length) >= APPROACH_CHECK_MIN_DRIFT
    ) {
      clearTimeout(approachCheckTimerRef.current);
      approachCheckTimerRef.current = setTimeout(() => maybeFireApproachCheck(), APPROACH_CHECK_IDLE_MS);
    }

    const run = context?.lastRun || null;
    const runKey = run ? `${run.mode}:${run.verdict}:${run.passed}:${run.total}:${run.detail}` : null;
    if (run && runKey !== lastRunSnapshotRef.current) {
      lastRunSnapshotRef.current = runKey;
      // Once they've actually run/submitted, the "before you run this" window
      // is over - no point asking an approach question after the fact.
      clearTimeout(approachCheckTimerRef.current);

      if (pendingVoiceAnnounceRef.current) {
        pendingVoiceAnnounceRef.current = false;
        announceRunResult(run);
      }

      if (run.verdict === "Accepted") {
        consecutiveFailRef.current = 0;
        clearTimeout(idleTimerRef.current);
      } else {
        consecutiveFailRef.current += 1;
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => maybeFireNudge(), STUCK_IDLE_MS);
        maybeFireWalkthrough();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  /** Quick, local, no-AI-round-trip callout of a run/submit the learner triggered by voice. */
  function announceRunResult(run) {
    const verb = run.mode === "submit" ? "Submit" : "Run";
    const text =
      run.verdict === "Accepted"
        ? `${verb} ho gaya - saare ${run.total} test pass! Badhiya chal raha hai.`
        : `${verb} ho gaya - ${run.passed} out of ${run.total} test pass hue.${run.detail ? " " + run.detail : ""}`;
    setMessages((prev) => [...prev, { role: "assistant", text, proactive: true }]);
    if (voiceOut) speech.speak(toSpeakableText(text));
  }

  function maybeFireWalkthrough() {
    if (
      activeRef.current &&
      consecutiveFailRef.current >= STUCK_FAIL_THRESHOLD &&
      walkthroughFiredForFailCountRef.current !== consecutiveFailRef.current
    ) {
      walkthroughFiredForFailCountRef.current = consecutiveFailRef.current;
      triggerProactive("stuck_walkthrough");
    }
  }

  function maybeFireNudge() {
    if (
      activeRef.current &&
      consecutiveFailRef.current > 0 &&
      consecutiveFailRef.current < STUCK_FAIL_THRESHOLD &&
      nudgeFiredForFailCountRef.current !== consecutiveFailRef.current
    ) {
      nudgeFiredForFailCountRef.current = consecutiveFailRef.current;
      triggerProactive("stuck_nudge");
    }
  }

  /**
   * Fires at most once per problem, before any run/submit: the learner has
   * been sitting with a meaningfully-edited solution for a while, so JARVIS
   * jumps in on its own with one "what if" question about their approach -
   * a mentor thinking out loud, not waiting for them to fail first.
   */
  function maybeFireApproachCheck() {
    if (
      activeRef.current &&
      !approachCheckFiredRef.current &&
      lastRunSnapshotRef.current === null
    ) {
      approachCheckFiredRef.current = true;
      triggerProactive("approach_check");
    }
  }

  /**
   * JARVIS speaking up on its own - not a reply to anything the learner
   * said this turn. The trigger text is never shown in the transcript
   * (it's just an internal cue for the model); only the real reply is.
   */
  async function triggerProactive(intent) {
    if (!activeRef.current || sendingRef.current || speakingRef.current) return;

    stopRecognition({ keepActive: true });
    sendingRef.current = true;
    setSending(true);

    const triggerText =
      intent === "stuck_walkthrough"
        ? "[[internal: the learner looks stuck after repeated failed attempts - jump in unprompted with a walkthrough]]"
        : intent === "approach_check"
        ? "[[internal: the learner has been writing their own approach for a while without running it yet - jump in unprompted with one 'what if' question about their approach]]"
        : "[[internal: the learner has gone quiet after a failed attempt - a short, gentle check-in]]";

    try {
      const res = await axios.post(`${API_BASE_URL}/converse`, {
        messages: [...messagesRef.current, { role: "user", text: triggerText }].map((m) => ({ role: m.role, text: m.text })),
        context: { ...contextRef.current, intent },
      });
      setMessages((prev) => [...prev, { role: "assistant", text: res.data.reply, proactive: true }]);
      if (voiceOut) speech.speak(toSpeakableText(res.data.reply));
    } catch (error) {
      // Silent to the learner - they never asked for it, so no error bubble
      // in the UI - but still logged so this is debuggable from devtools
      // instead of just quietly never showing up.
      console.warn(`[JARVIS] proactive "${intent}" call failed:`, error);
    } finally {
      sendingRef.current = false;
      setSending(false);
      if (!voiceOut && activeRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          if (activeRef.current) startRecognition();
        }, RESUME_LISTENING_DELAY_MS);
      }
    }
  }

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    speakingRef.current = speech.speaking;
    // The moment Sentinel stops talking, pick listening back up - that's
    // the "you don't have to press anything, just talk" bit.
    if (!speech.speaking && activeRef.current && !sendingRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        if (activeRef.current) startRecognition();
      }, RESUME_LISTENING_DELAY_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.speaking]);

  const sendTurn = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;

      stopRecognition({ keepActive: true });
      setInterimTranscript("");
      finalBufferRef.current = "";
      setError("");

      const history = [...messagesRef.current, { role: "user", text: trimmed }];
      setMessages(history);
      sendingRef.current = true;
      setSending(true);

      try {
        const res = await axios.post(`${API_BASE_URL}/converse`, {
          messages: history.map((m) => ({ role: m.role, text: m.text })),
          context: contextRef.current,
        });
        const reply = res.data.reply;
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        if (voiceOut) {
          speech.speak(toSpeakableText(reply));
        }
      } catch (err) {
        const msg =
          err?.response?.data?.details ||
          err?.response?.data?.message ||
          err?.message ||
          "Sentinel couldn't respond just now.";
        setError(msg);
        setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ ${msg}` }]);
        if (voiceOut) speech.speak("Sorry, I could not respond just now.");
      } finally {
        sendingRef.current = false;
        setSending(false);
        // If voice replies are off, nothing will trigger the
        // speech.speaking effect to resume listening - do it directly.
        if (!voiceOut && activeRef.current) {
          clearTimeout(resumeTimerRef.current);
          resumeTimerRef.current = setTimeout(() => {
            if (activeRef.current) startRecognition();
          }, RESUME_LISTENING_DELAY_MS);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceOut]
  );

  /**
   * Instantly execute a recognized command (run / submit / switch language)
   * without a round-trip to the AI - "run karo" should feel as immediate as
   * clicking the Run button, not like asking a question and waiting.
   */
  const handleLocalCommand = useCallback(
    (command, rawText) => {
      stopRecognition({ keepActive: true });
      setInterimTranscript("");
      finalBufferRef.current = "";
      setError("");
      setMessages((prev) => [...prev, { role: "user", text: rawText }]);

      let confirmText = "";
      if (command.type === "run") {
        confirmText = "Theek hai, run kar raha hoon...";
        pendingVoiceAnnounceRef.current = true;
        actionsRef.current?.run?.();
      } else if (command.type === "submit") {
        confirmText = "Theek hai, submit kar raha hoon...";
        pendingVoiceAnnounceRef.current = true;
        actionsRef.current?.submit?.();
      } else if (command.type === "language") {
        const label = LANG_SPOKEN_LABEL[command.lang] || command.lang;
        const available = actionsRef.current?.languages;
        if (Array.isArray(available) && !available.includes(command.lang)) {
          confirmText = `${label} is problem ke starter code mein available nahi hai.`;
        } else {
          actionsRef.current?.setLanguage?.(command.lang);
          confirmText = `Theek hai, ${label} mein switch kar diya.`;
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", text: confirmText }]);
      if (voiceOut) {
        speech.speak(toSpeakableText(confirmText));
      } else if (activeRef.current) {
        clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          if (activeRef.current) startRecognition();
        }, RESUME_LISTENING_DELAY_MS);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceOut]
  );

  /** Every turn (voice or typed) passes through here: command first, AI chat otherwise. */
  const handleTurn = useCallback(
    (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;
      const command = parseVoiceCommand(trimmed);
      if (command) {
        handleLocalCommand(command, trimmed);
      } else {
        sendTurn(trimmed);
      }
    },
    [sendTurn, handleLocalCommand]
  );

  const scheduleAutoSend = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const text = finalBufferRef.current.trim();
      if (text) handleTurn(text);
    }, SILENCE_AUTO_SEND_MS);
  }, [handleTurn]);

  function startRecognition() {
    if (!SpeechRecognitionImpl) {
      setError("Voice input isn't supported in this browser - use Live Comms typing instead.");
      return;
    }
    if (speakingRef.current || sendingRef.current) return; // don't listen to ourselves
    if (recognitionRef.current) return; // already running

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setMicOn(true);

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalBufferRef.current = `${finalBufferRef.current} ${chunk}`.trim();
        } else {
          interim += chunk;
        }
      }
      setInterimTranscript(interim);
      scheduleAutoSend();
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(event.error === "not-allowed" ? "Mic access was blocked." : "Voice input hiccup - listening again.");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setMicOn(false);
      // Browsers auto-stop continuous recognition after a while even
      // without an error - if the session is still meant to be active,
      // just restart it so the user never has to click anything.
      if (activeRef.current && !speakingRef.current && !sendingRef.current) {
        recognitionRef.current = null;
        try {
          startRecognition();
        } catch {
          /* restart races with unmount - safe to ignore */
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }

  function stopRecognition({ keepActive = false } = {}) {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      r.onstart = null;
      r.onend = null; // don't let the manual stop trigger an auto-restart
      r.onresult = null;
      r.onerror = null;
      r.stop();
      recognitionRef.current = null;
    }
    setMicOn(false);
    if (!keepActive) setInterimTranscript("");
  }

  const activate = useCallback(() => {
    if (!SpeechRecognitionImpl) {
      setError("Voice input isn't supported in this browser - use Live Comms typing instead.");
      return;
    }
    setError("");
    activeRef.current = true;
    setActive(true);
    if (greeting && messagesRef.current.length === 0) {
      setMessages([{ role: "assistant", text: greeting }]);
      if (voiceOut) {
        // The speech.speaking effect below picks up listening again once
        // this finishes playing.
        speech.speak(toSpeakableText(greeting));
      } else {
        startRecognition();
      }
    } else {
      startRecognition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, voiceOut]);

  const deactivate = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    clearTimeout(resumeTimerRef.current);
    clearTimeout(idleTimerRef.current);
    clearTimeout(approachCheckTimerRef.current);
    stopRecognition();
    speech.cancel();
    setInterimTranscript("");
    finalBufferRef.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    if (activeRef.current) deactivate();
    else activate();
  }, [activate, deactivate]);

  // Send a typed message too, for when speaking isn't convenient -
  // goes through the exact same turn logic (including voice commands) as
  // a spoken one, so typing "run karo" works exactly like saying it.
  const sendTyped = useCallback(
    (text) => handleTurn(text),
    [handleTurn]
  );

  const toggleVoiceOut = useCallback(() => {
    setVoiceOut((v) => {
      if (v) speech.cancel();
      return !v;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimeout(silenceTimerRef.current);
      clearTimeout(resumeTimerRef.current);
      clearTimeout(idleTimerRef.current);
      clearTimeout(approachCheckTimerRef.current);
      stopRecognition();
    };
  }, []);

  const listening = micOn && active && !sending && !speech.speaking;

  let status = "idle";
  if (listening) status = "listening";
  else if (sending) status = "thinking";
  else if (speech.speaking) status = "speaking";

  return {
    supported: !!SpeechRecognitionImpl,
    active,
    status,
    listening,
    sending,
    speaking: speech.speaking,
    usingFallbackVoice: speech.usingFallback,
    messages,
    interimTranscript,
    error,
    voiceOut,
    toggleVoiceOut,
    activate,
    deactivate,
    toggle,
    sendTyped,
    context,
    contextSyncedAt,
  };
}
