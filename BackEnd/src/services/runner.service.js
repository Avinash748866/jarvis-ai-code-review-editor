/**
 * Local code judge for Sentinel's practice mode.
 *
 * !! This is NOT a sandbox. !!
 * Submitted code runs as a normal child process with your user's
 * permissions. It gets a time limit, an output cap and a scrubbed
 * environment (no API keys), but it can still touch your filesystem and
 * network. That's fine for practising on your own machine. Do NOT expose it
 * on a public server without isolating it first (Docker, gVisor, Judge0...).
 * For that reason the whole feature is off unless ENABLE_CODE_RUNNER=true.
 */

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const TIME_LIMIT_MS = 4000; // per test case (includes JVM start-up for Java)
const COMPILE_LIMIT_MS = 30000;
const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_CODE_CHARS = 64 * 1024;
const MAX_CONCURRENT_RUNS = 2;

const IS_WINDOWS = process.platform === "win32";

let activeRuns = 0;

class RunnerError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isEnabled() {
  return String(process.env.ENABLE_CODE_RUNNER || "").toLowerCase() === "true";
}

/** Only pass the variables a compiler / interpreter genuinely needs. No secrets. */
function safeEnv() {
  const keep = [
    "PATH", "Path", "SystemRoot", "SYSTEMROOT", "windir", "COMSPEC", "PATHEXT",
    "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE", "LANG", "LC_ALL", "JAVA_HOME",
  ];
  const env = {};
  for (const key of keep) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.PYTHONIOENCODING = "utf-8";
  env.PYTHONDONTWRITEBYTECODE = "1";
  return env;
}

/* ---------- tool discovery (cached once found) ---------- */

const toolCache = new Map();

function findTool(key, candidates, args, accept = () => true) {
  if (toolCache.has(key)) return toolCache.get(key);
  for (const cmd of candidates) {
    try {
      const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 10000, windowsHide: true, env: safeEnv() });
      const out = `${r.stdout || ""}${r.stderr || ""}`;
      if (!r.error && r.status === 0 && accept(out)) {
        toolCache.set(key, cmd);
        return cmd;
      }
    } catch {
      // try the next candidate
    }
  }
  return null; // not cached, so installing the tool later works without a restart
}

const findPython = () =>
  findTool("python", IS_WINDOWS ? ["python", "py"] : ["python3", "python"], ["--version"], (o) => /Python 3/.test(o));
const findGpp = () => findTool("g++", ["g++"], ["--version"]);
const findJavac = () => findTool("javac", ["javac"], ["-version"]);
const findJava = () => findTool("java", ["java"], ["-version"]);

/** What can this machine run? Used by the UI to explain missing languages up front. */
function availability() {
  return {
    js: { available: true },
    py: findPython()
      ? { available: true }
      : { available: false, hint: "Python 3 wasn't found. Install it and make sure `python` (or `python3`) is on your PATH." },
    cpp: findGpp()
      ? { available: true }
      : { available: false, hint: "g++ wasn't found. Install a C++ compiler (MinGW-w64 / MSYS2 on Windows, Xcode tools on macOS, build-essential on Linux)." },
    java:
      findJavac() && findJava()
        ? { available: true }
        : { available: false, hint: "A JDK wasn't found (need both `javac` and `java`). Install JDK 17 or newer." },
  };
}

/* ---------- process helper ---------- */

function execCapture(cmd, args, { cwd, input = "", timeoutMs }) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let truncated = false;
    let settled = false;
    let child;

    const done = (code, spawnError = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code,
        stdout,
        stderr,
        timedOut,
        truncated,
        spawnError,
        timeMs: Number((process.hrtime.bigint() - started) / 1000000n),
      });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      if (child) child.kill("SIGKILL");
    }, timeoutMs);

    try {
      child = spawn(cmd, args, { cwd, env: safeEnv(), windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    } catch (err) {
      stderr = err.message;
      done(-1, true);
      return;
    }

    child.stdout.on("data", (chunk) => {
      if (stdout.length < MAX_OUTPUT_BYTES) {
        stdout += chunk.toString("utf8");
      } else if (!truncated) {
        truncated = true;
        child.kill("SIGKILL");
      }
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      stderr += err.message;
      done(-1, true);
    });
    child.on("close", (code) => done(code));
    child.stdin.on("error", () => {}); // program may exit before reading all input
    child.stdin.end(input);
  });
}

/* ---------- per-language preparation ---------- */

const LANGUAGES = {
  js: {
    label: "JavaScript",
    filename: "main.js",
    async prepare(dir) {
      return { ok: true, cmd: process.execPath, args: ["--max-old-space-size=256", path.join(dir, "main.js")] };
    },
  },

  py: {
    label: "Python",
    filename: "main.py",
    async prepare(dir) {
      const python = findPython();
      if (!python) return unavailable("Python", availability().py.hint);
      const args = python === "py" ? ["-3", path.join(dir, "main.py")] : [path.join(dir, "main.py")];
      return { ok: true, cmd: python, args };
    },
  },

  cpp: {
    label: "C++",
    filename: "main.cpp",
    async prepare(dir) {
      const gpp = findGpp();
      if (!gpp) return unavailable("C++", availability().cpp.hint);
      const exe = path.join(dir, IS_WINDOWS ? "main.exe" : "main");
      const r = await execCapture(gpp, ["-O2", "-std=c++17", "-o", exe, "main.cpp"], {
        cwd: dir,
        timeoutMs: COMPILE_LIMIT_MS,
      });
      if (r.code !== 0) return compileError(r, dir);
      return { ok: true, cmd: exe, args: [] };
    },
  },

  java: {
    label: "Java",
    filename: "Main.java",
    async prepare(dir) {
      const javac = findJavac();
      const java = findJava();
      if (!javac || !java) return unavailable("Java", availability().java.hint);
      const r = await execCapture(javac, ["-d", dir, "Main.java"], { cwd: dir, timeoutMs: COMPILE_LIMIT_MS });
      if (r.code !== 0) return compileError(r, dir);
      return { ok: true, cmd: java, args: ["-Xss64m", "-Xmx256m", "-cp", dir, "Main"] };
    },
  },
};

function unavailable(label, hint) {
  return { ok: false, verdict: "Runner Unavailable", message: `${label} isn't available on the machine running the backend. ${hint}` };
}

function compileError(result, dir) {
  const text = scrubPaths(`${result.stderr}${result.stdout}`, dir) || "Compilation failed.";
  const timedOut = result.timedOut ? "\n(Compilation timed out.)" : "";
  return { ok: false, verdict: "Compilation Error", message: clip(text, 4000) + timedOut };
}

/* ---------- comparison + formatting ---------- */

function normalize(text) {
  return String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\s+$/, "");
}

function clip(text, max) {
  const s = String(text ?? "");
  return s.length > max ? `${s.slice(0, max)}\n… (${s.length - max} more characters)` : s;
}

/** Keep temp-dir paths out of error messages shown to the user. */
function scrubPaths(text, dir) {
  return String(text)
    .split(dir + path.sep)
    .join("")
    .split(dir)
    .join("");
}

const VERDICT_BY_STATUS = {
  "wrong-answer": "Wrong Answer",
  timeout: "Time Limit Exceeded",
  "runtime-error": "Runtime Error",
  "output-limit": "Output Limit Exceeded",
};

/* ---------- main entry ---------- */

/**
 * @param {{problem: object, language: string, code: string, mode: 'run'|'submit'}} opts
 */
async function judge({ problem, language, code, mode }) {
  const lang = LANGUAGES[language];
  if (!lang) throw new RunnerError(400, `Unsupported language '${language}'. Use one of: ${Object.keys(LANGUAGES).join(", ")}.`);
  if (typeof code !== "string" || !code.trim()) throw new RunnerError(400, "There's no code to run.");
  if (code.length > MAX_CODE_CHARS) throw new RunnerError(413, `Code is too long (limit ${MAX_CODE_CHARS} characters).`);
  if (activeRuns >= MAX_CONCURRENT_RUNS) throw new RunnerError(429, "The runner is busy with another submission. Try again in a moment.");

  const submit = mode === "submit";
  const tests = submit ? problem.tests : problem.tests.filter((t) => t.visible);

  activeRuns += 1;
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sentinel-run-"));

  try {
    await fs.promises.writeFile(path.join(dir, lang.filename), code, "utf8");

    const prepared = await lang.prepare(dir);
    if (!prepared.ok) {
      return { verdict: prepared.verdict, message: prepared.message, passed: 0, total: tests.length, mode, cases: [] };
    }

    const cases = [];
    let passed = 0;
    let verdict = "Accepted";

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const r = await execCapture(prepared.cmd, prepared.args, { cwd: dir, input: test.input, timeoutMs: TIME_LIMIT_MS });

      let status;
      if (r.timedOut) status = "timeout";
      else if (r.truncated) status = "output-limit";
      else if (r.spawnError || r.code !== 0) status = "runtime-error";
      else status = normalize(r.stdout) === normalize(test.expected) ? "passed" : "wrong-answer";

      const entry = { index: i + 1, visible: test.visible, status, timeMs: r.timeMs };

      if (status === "passed") {
        passed += 1;
        if (test.visible) {
          entry.input = test.input;
          entry.expected = test.expected;
          entry.actual = clip(normalize(r.stdout), 2000);
        }
      } else {
        if (verdict === "Accepted") verdict = VERDICT_BY_STATUS[status];
        // Show details for failures. Hidden inputs can be huge, so trim them harder.
        const limit = test.visible ? 2000 : 300;
        entry.input = clip(test.input, limit);
        entry.expected = clip(test.expected, limit);
        entry.actual = clip(normalize(r.stdout), limit);
        const stderr = scrubPaths(r.stderr, dir).trim();
        if (stderr) entry.stderr = clip(stderr, 2000);
        if (status === "timeout") entry.stderr = `Exceeded the ${TIME_LIMIT_MS / 1000}s time limit.`;
        if (status === "output-limit") entry.stderr = "Printed more than 256 KB of output.";
      }

      cases.push(entry);

      // Like LeetCode, "Submit" stops at the first failing test. "Run" shows every sample.
      if (submit && status !== "passed") break;
    }

    return { verdict, passed, total: tests.length, mode, cases };
  } finally {
    activeRuns -= 1;
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { judge, availability, isEnabled, RunnerError, TIME_LIMIT_MS, normalize };
