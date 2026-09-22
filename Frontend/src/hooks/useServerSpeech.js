import { useCallback, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api";

/**
 * Speaks text using the backend's Sarvam-powered /ai/speak endpoint - a
 * real, fluent Indian-accented voice (handles Hinglish naturally), instead
 * of the browser's built-in speechSynthesis, which is often robotic and
 * rarely has a genuine Indian voice installed.
 *
 * Falls back to the browser's speechSynthesis automatically if the server
 * voice can't be reached (e.g. SARVAM_API_KEY not configured yet, or the
 * backend is offline) - so JARVIS mode still speaks either way, it just
 * sounds better once the key is set.
 */
export function useServerSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const requestIdRef = useRef(0);

  const releaseObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const cancel = useCallback(() => {
    requestIdRef.current += 1; // invalidate any in-flight fetch's result
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    releaseObjectUrl();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speakWithBrowser = useCallback((text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
      setSpeaking(false);
      return;
    }
    setUsingFallback(true);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    async (text) => {
      const trimmed = (text || "").trim();
      if (!trimmed) return;

      cancel();
      setUsingFallback(false);
      const requestId = requestIdRef.current;

      try {
        const res = await fetch(`${API_BASE_URL}/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });

        if (requestId !== requestIdRef.current) return; // superseded/cancelled
        if (!res.ok) throw new Error(`speak endpoint returned ${res.status}`);

        const blob = await res.blob();
        if (requestId !== requestIdRef.current) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audio.onended = () => {
          setSpeaking(false);
          releaseObjectUrl();
        };
        audio.onerror = () => {
          if (requestId !== requestIdRef.current) return;
          setSpeaking(false);
          releaseObjectUrl();
          speakWithBrowser(trimmed); // last-resort fallback
        };

        audioRef.current = audio;
        setSpeaking(true);
        await audio.play();
      } catch {
        if (requestId !== requestIdRef.current) return;
        // Server voice unavailable (no SARVAM_API_KEY yet, offline, etc.) -
        // still speak, just with whatever voice the browser has.
        speakWithBrowser(trimmed);
      }
    },
    [cancel, speakWithBrowser]
  );

  return { speaking, usingFallback, speak, cancel };
}
