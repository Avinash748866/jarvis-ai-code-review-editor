// Wrapper around Sarvam AI's Bulbul text-to-speech (https://api.sarvam.ai) -
// an Indian speech model built specifically for natural, fluent Indian
// voices, including Hinglish code-switching ("Aapka answer sahi hai, but
// edge case miss ho gaya" style) that generic browser/OS voices either
// mispronounce or can't do at all. This is what makes JARVIS mode actually
// sound like a fluent Indian speaker instead of a robotic default voice.
//
// Docs: POST https://api.sarvam.ai/text-to-speech
// Auth:  header api-subscription-key: <key>
// Response: { audios: [base64Chunk, ...] } - join the chunks, then
// base64-decode into raw audio bytes.

const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
// "anushka" (the name I originally defaulted to) is a bulbul:v2-only
// speaker - Sarvam rejects it outright when paired with bulbul:v3 below,
// which is why speech synthesis was silently 500ing regardless of the API
// key. "priya" is a valid bulbul:v3 voice.
const SPEAKER = process.env.SARVAM_TTS_SPEAKER || "priya";
const LANGUAGE_CODE = process.env.SARVAM_TTS_LANGUAGE || "en-IN";

// bulbul:v3's real-time (non-streaming) endpoint hard-caps input at 2500
// characters - clip rather than error, since a slightly-shortened spoken
// reply is much better UX than JARVIS mode going silent on a long answer.
const MAX_CHARS = 2500;

function assertSarvamConfigured() {
  if (!process.env.SARVAM_API_KEY) {
    throw new Error(
      "SARVAM_API_KEY is not set. Get a free key from https://dashboard.sarvam.ai, add it to BackEnd/.env, then restart the backend."
    );
  }
}

/**
 * Synthesizes fluent Indian-accented speech for `text` and returns raw
 * MP3 bytes ready to stream straight to the browser.
 */
async function synthesizeSpeech(text) {
  assertSarvamConfigured();

  const trimmed = (text || "").trim();
  if (!trimmed) {
    throw new Error("No text to speak.");
  }
  const clipped = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let response;
  try {
    response = await fetch(SARVAM_TTS_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: clipped,
        target_language_code: LANGUAGE_CODE,
        speaker: SPEAKER,
        model: "bulbul:v3",
        pace: 1.0,
        output_audio_codec: "mp3",
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Sarvam TTS didn't respond within 20s - try again in a moment.");
    }
    throw new Error(`Could not reach Sarvam TTS: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const badKey = response.status === 401 || response.status === 403;
    throw new Error(
      badKey
        ? `Sarvam TTS rejected the API key (${response.status}) - check SARVAM_API_KEY in BackEnd/.env.`
        : `Sarvam TTS request failed (${response.status}): ${body.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const audioBase64 = (data.audios || []).join("");
  if (!audioBase64) {
    throw new Error("Sarvam TTS returned no audio.");
  }
  return Buffer.from(audioBase64, "base64");
}

module.exports = { synthesizeSpeech };
