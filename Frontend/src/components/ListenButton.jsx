/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import "./TeachingExplanations.css";

const SUPPORTED = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Plays a single humanized explanation aloud using the browser's built-in
 * text-to-speech (Web Speech API). This is deliberately client-side: it
 * needs no API key, no server round-trip, and nothing to cache - repeated
 * plays just call speechSynthesis again, instantly and at no cost.
 *
 * Playback never starts automatically - only handlePlay (triggered by the
 * user clicking "Listen to Explanation") calls speechSynthesis.speak().
 * If the browser doesn't support speech synthesis, this quietly falls
 * back to a note - the written explanation above it is always available.
 */
function ListenButton({ text }) {
  const [status, setStatus] = useState("idle"); // idle | playing | paused | error
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const utteranceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (utteranceRef.current && SUPPORTED) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!SUPPORTED) {
    return (
      <p className="tts-unsupported">
        {"🎙️ Voice playback isn't supported in this browser, but the explanation above is ready to read."}
      </p>
    );
  }

  function handlePlay() {
    // Only one explanation should play at a time.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = volume;

    utterance.onboundary = (event) => {
      if (text.length > 0 && typeof event.charIndex === "number") {
        setProgress(Math.min(100, Math.round((event.charIndex / text.length) * 100)));
      }
    };
    utterance.onend = () => {
      setStatus("idle");
      setProgress(100);
      setTimeout(() => setProgress(0), 400);
    };
    utterance.onerror = () => {
      setStatus("error");
    };

    utteranceRef.current = utterance;
    setStatus("playing");
    setProgress(0);
    window.speechSynthesis.speak(utterance);
  }

  function handlePauseResume() {
    if (status === "playing") {
      window.speechSynthesis.pause();
      setStatus("paused");
    } else if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
    }
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setStatus("idle");
    setProgress(0);
  }

  function handleVolumeChange(event) {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    if (utteranceRef.current) {
      utteranceRef.current.volume = nextVolume;
    }
  }

  return (
    <div className="listen-box">
      <div className="listen-controls">
        {status === "idle" || status === "error" ? (
          <button className="listen-btn listen-btn-play" onClick={handlePlay}>
            ▶ Listen to Explanation
          </button>
        ) : (
          <>
            <button className="listen-btn" onClick={handlePauseResume}>
              {status === "paused" ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className="listen-btn" onClick={handleStop}>
              ⏹ Stop
            </button>
          </>
        )}

        <label className="volume-control" title="Volume">
          🔊
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
          />
        </label>
      </div>

      {status !== "idle" && status !== "error" && (
        <div className="listen-progress-track">
          <div className="listen-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {status === "error" && (
        <p className="tts-unsupported">
          {"Couldn't play audio right now - the written explanation above still has you covered."}
        </p>
      )}
    </div>
  );
}

export default ListenButton;
