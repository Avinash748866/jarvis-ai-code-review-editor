import { useCallback, useEffect, useRef, useState } from "react";

const SUPPORTED = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Strips markdown syntax so spoken text doesn't include literal
 * asterisks, hashes, backticks, etc.
 */
export function toSpeakableText(markdown) {
  if (!markdown) return "";
  return markdown
    .replace(/```[\s\S]*?```/g, " Code block omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#>*_~-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pick the best available Indian-accented voice for English speech. */
function pickIndianVoice(voices) {
  if (!voices || !voices.length) return null;
  return (
    // Exact en-IN voices first (Chrome/Edge/most OSes ship these when an
    // Indian English or Hindi language pack is installed).
    voices.find((v) => v.lang?.toLowerCase() === "en-in") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en-in")) ||
    voices.find((v) => /india/i.test(v.name)) ||
    // Hindi voices also read Hinglish naturally.
    voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ||
    null
  );
}

/**
 * Thin wrapper around window.speechSynthesis that exposes a simple
 * speak()/cancel() API plus a `speaking` boolean so the UI (and the
 * robot avatar) can react while the assistant is talking. Automatically
 * picks an Indian-English (en-IN) system voice when one is installed, so
 * Sentinel speaks with an Indian accent instead of the browser default.
 */
export function useSpeechOutput() {
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState(null);
  const [voicesChecked, setVoicesChecked] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!SUPPORTED) return;

    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        setVoice(pickIndianVoice(voices));
        setVoicesChecked(true);
      }
    }

    loadVoices();
    // Most browsers load the voice list asynchronously on first call.
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    return () => {
      if (SUPPORTED) window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (!SUPPORTED) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (!SUPPORTED || !text) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        // Even without a matched voice object, hinting en-IN nudges some
        // engines (notably Chrome's networked voices) toward an Indian
        // rendering of the text.
        utterance.lang = "en-IN";
      }
      utterance.rate = 1;
      utterance.pitch = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [voice]
  );

  return {
    supported: SUPPORTED,
    speaking,
    speak,
    cancel,
    voice,
    hasIndianVoice: !!voice,
    voicesChecked,
  };
}
