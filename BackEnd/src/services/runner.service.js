/**
 * Remote sandbox runner for Sentinel Practice Mode.
 * Uses Runlet for isolated code execution.
 */

const CODE_RUNNER_URL =
  process.env.CODE_RUNNER_URL || "https://runlet.codealong.live";

const TIME_LIMIT_MS = 5000;
const MAX_CODE_CHARS = 64 * 1024;
const MAX_CONCURRENT_RUNS = 3;

let activeRuns = 0;

class RunnerError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isEnabled() {
  return Boolean(CODE_RUNNER_URL);
}

function availability() {
  return {
    js: { available: true },
    py: { available: true },
    cpp: { available: true },
    java: { available: true },
  };
}

function normalize(text) {
  return String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\s+$/, "");
}

function clip(text, max) {
  const s = String(text ?? "");
  return s.length > max
    ? `${s.slice(0, max)}\n… (${s.length - max} more characters)`
    : s;
}

const VERDICT_BY_STATUS = {
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  RE: "Runtime Error",
  OLE: "Output Limit Exceeded",
  CE: "Compilation Error",
};

const LANGUAGE_MAP = {
  js: "javascript",
  py: "python",
  cpp: "cpp",
  java: "java",
};

async function executeCode(language, code, stdin) {
  const remoteLanguage = LANGUAGE_MAP[language];

  if (!remoteLanguage) {
    throw new RunnerError(
      400,
      `Unsupported language '${language}'. Use js, py, cpp or java.`
    );
  }

  let response;

  try {
    response = await fetch(`${CODE_RUNNER_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: remoteLanguage,
        code,
        stdin: stdin || "",
      }),
    });
  } catch (error) {
    throw new RunnerError(
      503,
      `Code execution service is unreachable: ${error.message}`
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new RunnerError(
      502,
      "Code execution service returned an invalid response."
    );
  }

  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : "Remote execution request failed.";

    throw new RunnerError(response.status >= 500 ? 503 : 400, detail);
  }

  return {
    status: data.status,
    stdout: data.stdout || "",
    stderr: data.stderr || "",
    timeMs:
      typeof data.time === "number"
        ? Math.round(data.time * 1000)
        : null,
    memory: data.memory ?? null,
  };
}

/**
 * @param {{
 *   problem: object,
 *   language: string,
 *   code: string,
 *   mode: 'run'|'submit'
 * }} opts
 */
async function judge({ problem, language, code, mode }) {
  if (!LANGUAGE_MAP[language]) {
    throw new RunnerError(
      400,
      `Unsupported language '${language}'. Use one of: ${Object.keys(
        LANGUAGE_MAP
      ).join(", ")}.`
    );
  }

  if (typeof code !== "string" || !code.trim()) {
    throw new RunnerError(400, "There's no code to run.");
  }

  if (code.length > MAX_CODE_CHARS) {
    throw new RunnerError(
      413,
      `Code is too long (limit ${MAX_CODE_CHARS} characters).`
    );
  }

  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    throw new RunnerError(
      429,
      "The runner is busy. Try again in a moment."
    );
  }

  const submit = mode === "submit";

  // Run = visible/sample tests
  // Submit = all tests
  const tests = submit
    ? problem.tests
    : problem.tests.filter((test) => test.visible);

  activeRuns += 1;

  try {
    const cases = [];
    let passed = 0;
    let verdict = "Accepted";

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];

      let result;

      try {
        result = await executeCode(language, code, test.input);
      } catch (error) {
        if (error instanceof RunnerError) {
          throw error;
        }

        throw new RunnerError(
          503,
          "The remote code execution service failed."
        );
      }

      let status;

      if (result.status === "TLE") {
        status = "timeout";
      } else if (result.status === "MLE") {
        status = "memory-limit";
      } else if (result.status === "OLE") {
        status = "output-limit";
      } else if (result.status === "CE") {
        status = "compile-error";
      } else if (result.status === "RE") {
        status = "runtime-error";
      } else if (result.status === "OK") {
        status =
          normalize(result.stdout) === normalize(test.expected)
            ? "passed"
            : "wrong-answer";
      } else {
        status = "runtime-error";
      }

      const entry = {
        index: i + 1,
        visible: test.visible,
        status,
        timeMs: result.timeMs,
      };

      if (status === "passed") {
        passed += 1;

        if (test.visible) {
          entry.input = test.input;
          entry.expected = test.expected;
          entry.actual = clip(normalize(result.stdout), 2000);
        }
      } else {
        if (verdict === "Accepted") {
          verdict =
            {
              "wrong-answer": "Wrong Answer",
              timeout: "Time Limit Exceeded",
              "memory-limit": "Memory Limit Exceeded",
              "runtime-error": "Runtime Error",
              "output-limit": "Output Limit Exceeded",
              "compile-error": "Compilation Error",
            }[status] || "Runtime Error";
        }

        const limit = test.visible ? 2000 : 300;

        entry.input = clip(test.input, limit);
        entry.expected = clip(test.expected, limit);
        entry.actual = clip(normalize(result.stdout), limit);

        if (result.stderr) {
          entry.stderr = clip(result.stderr.trim(), 2000);
        }

        if (status === "timeout") {
          entry.stderr = "Execution exceeded the time limit.";
        }

        if (status === "output-limit") {
          entry.stderr = "Output limit exceeded.";
        }

        if (status === "memory-limit") {
          entry.stderr = "Memory limit exceeded.";
        }
      }

      cases.push(entry);

      // Submit stops at first failed test.
      if (submit && status !== "passed") {
        break;
      }
    }

    return {
      verdict,
      passed,
      total: tests.length,
      mode,
      cases,
    };
  } finally {
    activeRuns -= 1;
  }
}

module.exports = {
  judge,
  availability,
  isEnabled,
  RunnerError,
  TIME_LIMIT_MS,
  normalize,
};