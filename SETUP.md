# Setup & Run

## What was broken

1. **The AI model was deprecated.** Both AI calls used Groq's `llama-3.3-70b-versatile`, which Groq shut down on **August 16, 2026**. Every request to `/get-review`, `/chat`, and `/humanize` was failing. Fixed by switching to `openai/gpt-oss-120b` (Groq's recommended replacement).
2. **The frontend was hardcoded to a dead deployment.** All three API calls pointed at `https://ai-code-reviewer-o95h.onrender.com`, a specific Render deployment that isn't guaranteed to be running. The URL is now read from `VITE_API_URL` (see `Frontend/.env.example`), defaulting to `http://localhost:3000/ai` for local dev.
3. **No `.env` files were included** (correctly, since they're gitignored), so the backend had no `GROQ_API_KEY` to actually call Groq with. Added `.env.example` files and a startup warning if the key is missing.
4. Added basic request validation (missing `code`/`question`) so bad requests return a clear 400 instead of an obscure 500.

## Run it locally

### 1. Backend

```bash
cd BackEnd
npm install
cp .env.example .env
# then edit .env and paste your key from https://console.groq.com/keys
npm install -g nodemon   # optional, or just use: node server.js
node server.js
```

Backend runs on `http://localhost:3000`.

### 2. Frontend

```bash
cd Frontend
npm install
cp .env.example .env   # already defaults to the local backend, no edit needed
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## What's new: Sentinel

The UI has been rebuilt around **Sentinel**, a sci-fi HUD theme with:

- **3D robot avatar** (`src/components/RobotAvatar.jsx`) - a small animated drone rendered with plain Three.js (no extra 3D framework needed). It changes color and motion based on what's happening: amber while scanning, teal while thinking/speaking, green on a clean scan, red when high-severity issues are found.
- **Voice assistant**:
  - *Voice input*: click the 🎙 mic button next to the chat box to ask a question by speaking (uses the browser's built-in `SpeechRecognition` - Chrome/Edge support this, Firefox currently doesn't, so the button just won't appear there).
  - *Voice output*: toggle "🔊 Voice replies" in the header and Sentinel will read back a short spoken briefing after each review, and read chat answers aloud (uses `speechSynthesis`, works broadly).
- **Threat meter**: a HUD panel above the review showing a breakdown of high/medium/low severity findings, derived from the same AI response already used for the teaching explanations - no extra backend calls.
- **Mission Log**: every review is saved to your browser's `localStorage`. Open "🗂 Mission Log" in the header to revisit or reload a past review instantly, with no re-fetching.
- Full sci-fi visual redesign: dark HUD palette (signal amber / teal / near-black), `Rajdhani` display type, animated status readout.

None of this needs new backend endpoints or environment variables - just `npm install` in `Frontend` again to pull in the one new dependency (`three`).

The header now has three tabs:

- **🛰 Review** - the original code-review + chat flow described above.
- **🧩 Practice** - a LeetCode-style practice mode, see below.
- **🎙 Live Comms** - a spoken/typed conversation with Sentinel in Hinglish, see below.

## What's new: Practice mode

A small LeetCode-style judge, entirely local - no third-party judging API.

- **Problems**: `BackEnd/src/data/problems.js` ships 6 problems (Two Sum, Valid Parentheses, Maximum Subarray, Binary Search, Longest Substring Without Repeating Characters, Climbing Stairs). Each has a statement, constraints, a handful of visible example tests, and several **hidden** stress tests (large/adversarial inputs) that only run on Submit - so a brute-force or subtly-wrong solution can pass "Run" but fail "Submit", same as the real thing.
- **Code runner**: `BackEnd/src/services/runner.service.js` compiles/runs the learner's code as a normal child process on the machine running the backend (JS via Node, Python via `python3`, C++ via `g++`, Java via `javac`+`java`). It enforces a time limit, an output cap, and strips secrets (like `GROQ_API_KEY`) out of the child process's environment.
  - **This is not a sandbox.** It's a local convenience for running the backend on your own machine, not something to expose on a public deployment without adding real isolation (Docker, gVisor, Judge0, etc. - noted in the file). It's gated behind an env var for exactly this reason:
    ```bash
    # BackEnd/.env
    ENABLE_CODE_RUNNER=true
    ```
    Leave it unset/`false` to disable Practice mode's Run/Submit buttons entirely (the UI will say so).
  - You need the relevant language toolchain installed for whichever languages you want to use (Node is already required for the backend itself; Python/g++/Java are optional - the UI shows a hint per-language if one isn't found on your machine).
- **New endpoints** (all under `/ai`): `GET /problems`, `GET /problems/:id`, `GET /runner-status`, `POST /run` (`{ problemId, language, code, mode: "run"|"submit" }`).
- **Automated self-check**: `cd BackEnd && npm test` runs `tests/verify.js`, which checks that a known-correct reference solution passes every test (visible + hidden) in every language, that the unmodified starter stub correctly fails, and that the runner's safety behavior (timeouts, output caps, secret scrubbing, compile errors) works as expected.

## What's new: Live Comms (Hinglish)

A voice-first conversation with Sentinel, in natural Hinglish (Roman script, not Devanagari) - separate from the typed chat in Review mode.

- Click the mic (🎙) to speak, or just type - both send to `POST /ai/converse` with the running message history plus whatever you're currently looking at (your Review-mode code/review, or the Practice problem + last Run/Submit result if you've been in Practice mode - shown as a small "Aware of: ..." pill on the Live Comms screen).
- Sentinel's replies are voice-optimized: short, plain text (no markdown/code blocks), and spoken back automatically via the browser's `speechSynthesis` (toggle with the 🔊 button next to the input).
- **Indian-accent voice**: the app automatically looks for an Indian-English (`en-IN`) or Hindi system voice and uses it if one's installed, so Sentinel speaks with an Indian accent instead of the browser's US/UK default. This depends on your OS/browser having such a voice installed - if none is found, Live Comms shows a small note under the robot saying so, and falls back to the default voice. To add one: on Windows, Settings → Time & Language → Speech → add an Indian English/Hindi voice; on macOS, System Settings → Accessibility → Spoken Content → add a voice; Chrome on most platforms also ships a few network voices (including Hindi) automatically once you're online.
- **Sees your code live**: Live Comms shows a "👁 Sentinel can see your ___" panel with your actual current code (from whichever mode you were last in - Review's editor, or the Practice problem you're solving), updating as you type - not just a one-time snapshot.
- Needs the same `GROQ_API_KEY` as the rest of the app - no extra setup.
- Voice input reuses the browser's `SpeechRecognition` API (same Chrome/Edge-only caveat as Review mode's mic button); typing always works as a fallback.

## Dev-only files

`Frontend/robot-lab.html` + `Frontend/src/robot-lab.jsx` are a debug harness for visually testing the `RobotAvatar` component in isolation (different sizes/statuses/variants via query params, e.g. `?sizes=56,104,240&status=alert`). They're not part of the production app and aren't linked from anywhere in the UI - safe to delete, or keep around for future avatar tweaks.

## Deploying

If you deploy the backend somewhere (Render, Railway, etc.):
- Set `GROQ_API_KEY` in that host's environment variables.
- In `Frontend/.env` (or your frontend host's env settings), set `VITE_API_URL` to `https://your-deployed-backend/ai`.
- **Leave `ENABLE_CODE_RUNNER` unset on any public deployment.** The runner executes learner-submitted code as a plain process with no sandboxing - fine on your own machine, not fine on a host other people can reach. Practice mode's problem browsing still works with it off; only Run/Submit are disabled.
