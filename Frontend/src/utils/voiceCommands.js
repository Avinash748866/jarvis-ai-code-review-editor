/**
 * Lightweight, local (no-AI-round-trip) command detection for JARVIS's
 * live-coach mode in Practice Arena. Recognized commands are handled
 * instantly - JARVIS acts and gives a one-line spoken confirmation -
 * instead of going through the LLM, so "run karo" / "submit karo" /
 * "python mein switch karo" feel immediate, like talking to a real pair
 * programmer sitting next to the keyboard.
 *
 * Anything that doesn't match one of these patterns falls through to the
 * normal AI conversation untouched.
 */

const LANGUAGE_WORD_MAP = {
  python: "py",
  py: "py",
  javascript: "js",
  js: "js",
  java: "java",
  "c++": "cpp",
  cpp: "cpp",
  "cplus plus": "cpp",
  "c plus plus": "cpp",
};

const LANGUAGE_WORD_PATTERN = "(python|javascript|java|c\\+\\+|cpp|c plus plus|cplus plus|js)";

// "python mein switch (karo/kar do/kardo)?", "switch to python", "python language mein jao",
// "language ko python kar do", "python kar do" (loose, only fires with an explicit switch/change verb nearby).
const SWITCH_PATTERNS = [
  new RegExp(`${LANGUAGE_WORD_PATTERN}\\s*mein\\s*switch`, "i"),
  new RegExp(`switch\\s*(?:to|karke)?\\s*${LANGUAGE_WORD_PATTERN}`, "i"),
  new RegExp(`${LANGUAGE_WORD_PATTERN}\\s*(?:mein|pe|par)\\s*(?:jao|jaao|change)`, "i"),
  new RegExp(`language\\s*(?:ko\\s*)?${LANGUAGE_WORD_PATTERN}\\s*(?:kar|switch)`, "i"),
  new RegExp(`${LANGUAGE_WORD_PATTERN}\\s*(?:kar\\s*do|karo|kardo)$`, "i"),
];

const RUN_PATTERN = /\b(run\s*kar\s*do|run\s*karo|run\s*kardo|run\s*kar\s*de|code\s*chalao|chalao\s*(code|isse|ise)?|run\s*it|just\s*run|run\s*this|run\s*the\s*code)\b/i;

const SUBMIT_PATTERN = /\b(submit\s*kar\s*do|submit\s*karo|submit\s*kardo|submit\s*kar\s*de|submit\s*it|submit\s*this|final\s*submit|submit\s*the\s*code)\b/i;

/**
 * @param {string} text  raw transcript (voice or typed)
 * @returns {null | {type: 'run'} | {type: 'submit'} | {type: 'language', lang: string, label: string}}
 */
export function parseVoiceCommand(text) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return null;

  for (const pattern of SWITCH_PATTERNS) {
    const match = t.match(pattern);
    if (match) {
      const word = match.slice(1).find(Boolean);
      const lang = word && LANGUAGE_WORD_MAP[word.trim()];
      if (lang) {
        return { type: "language", lang, label: word.trim() };
      }
    }
  }

  if (SUBMIT_PATTERN.test(t)) return { type: "submit" };
  if (RUN_PATTERN.test(t)) return { type: "run" };

  return null;
}

export { LANGUAGE_WORD_MAP };
