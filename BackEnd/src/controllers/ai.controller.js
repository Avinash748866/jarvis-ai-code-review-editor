const aiService = require("../services/ai.service")
const sarvamService = require("../services/sarvam.service")


module.exports.getReview = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: "'code' is required." });
    }

    const response = await aiService(code);
    res.send(response);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message
    });
  }
};
module.exports.chatWithCode = async (req, res) => {
  try {

    const { code, question } = req.body;

    if (!code || !question || !question.trim()) {
      return res.status(400).json({
        message: "Both 'code' and 'question' are required."
      });
    }

   const prompt = `
Code:
${code}

Question:
${question}

Answer in markdown format.

Use:
# Headings
## Subheadings
- Bullet points

\`\`\`
code blocks
\`\`\`

Keep answers clean and readable.

Answer only about the provided code.
`;

    const response = await aiService(prompt);

    res.send(response);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: error.message
    });

  }
};

module.exports.humanizeReview = async (req, res) => {
  try {

    const { code, review, mode, language } = req.body;

    if (!code || !review) {
      return res.status(400).json({
        message: "Both 'code' and 'review' are required to generate a humanized explanation."
      });
    }

    const result = await aiService.generateHumanizedExplanation(
      code,
      review,
      mode,
      language
    );

    res.json(result);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Could not generate the humanized explanation right now. The written review above is still fully available.",
      details: error.message
    });

  }
};

const CONVERSE_LIMITS = {
  maxMessages: 12,
  maxMessageChars: 1500,
  maxCodeChars: 6000,
  maxStatementChars: 2500,
  maxReviewChars: 2500,
  maxDetailChars: 600,
};

const cut = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");

const VALID_INTENTS = new Set(["chat", "stuck_walkthrough", "stuck_nudge", "approach_check", "hint_request"]);

/** Keeps a list of topic-name strings sane: capped length, capped count. */
const cutList = (value, maxItems, maxChars) =>
  Array.isArray(value)
    ? value.filter((v) => typeof v === "string" && v.trim()).slice(0, maxItems).map((v) => cut(v, maxChars))
    : [];

/** Validates + trims the UI's context so a bad client can't send a giant prompt. */
function sanitizeContext(raw) {
  if (!raw || typeof raw !== "object") return {};
  const ctx = {
    mode: raw.mode === "practice" ? "practice" : "review",
    language: cut(raw.language, 12),
    code: cut(raw.code, CONVERSE_LIMITS.maxCodeChars),
    review: cut(raw.review, CONVERSE_LIMITS.maxReviewChars),
    intent: VALID_INTENTS.has(raw.intent) ? raw.intent : "chat",
  };
  if (raw.problem && typeof raw.problem === "object") {
    ctx.problem = {
      title: cut(raw.problem.title, 200),
      difficulty: cut(raw.problem.difficulty, 20),
      statement: cut(raw.problem.statement, CONVERSE_LIMITS.maxStatementChars),
    };
  }
  if (raw.lastRun && typeof raw.lastRun === "object") {
    ctx.lastRun = {
      mode: raw.lastRun.mode === "submit" ? "submit" : "run",
      verdict: cut(raw.lastRun.verdict, 60),
      passed: Number.isFinite(raw.lastRun.passed) ? raw.lastRun.passed : 0,
      total: Number.isFinite(raw.lastRun.total) ? raw.lastRun.total : 0,
      detail: cut(raw.lastRun.detail, CONVERSE_LIMITS.maxDetailChars),
    };
  }
  // Neural Coach hint ladder: 1 (smallest nudge) - 4 (near-solution).
  if (Number.isFinite(raw.hintLevel)) {
    ctx.hintLevel = Math.min(4, Math.max(1, Math.round(raw.hintLevel)));
  }
  // Neural Coach mastery profile, computed client-side from local progress
  // (XP/streak/solved-topics) - lets Sentinel personalize its tone.
  if (raw.mastery && typeof raw.mastery === "object") {
    ctx.mastery = {
      level: Number.isFinite(raw.mastery.level) ? raw.mastery.level : undefined,
      streak: Number.isFinite(raw.mastery.streak) ? raw.mastery.streak : undefined,
      weakTopics: cutList(raw.mastery.weakTopics, 5, 40),
      strongTopics: cutList(raw.mastery.strongTopics, 5, 40),
    };
  }
  return ctx;
}

module.exports.converse = async (req, res) => {
  try {
    const { messages, context } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "'messages' must be a non-empty array." });
    }

    const clean = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
      .map((m) => ({ role: m.role, text: m.text.trim().slice(0, CONVERSE_LIMITS.maxMessageChars) }))
      .slice(-CONVERSE_LIMITS.maxMessages);

    if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
      return res.status(400).json({ message: "The last message must be from the user." });
    }

    const reply = await aiService.converse({ messages: clean, context: sanitizeContext(context) });
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Sentinel couldn't answer right now.",
      details: error.message
    });
  }
};

// Text -> fluent Indian-accented speech (Sarvam Bulbul), for JARVIS mode's
// hands-free voice replies. Returns raw audio bytes, not JSON, so the
// browser can play them directly as an <audio> src with no extra decoding.
module.exports.speak = async (req, res) => {
  try {
    const { text } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "'text' is required." });
    }

    const audioBuffer = await sarvamService.synthesizeSpeech(text.slice(0, 4000));

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "no-store",
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Sentinel's voice is unavailable right now.",
      details: error.message
    });
  }
};
