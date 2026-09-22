/**
 * Self-check for Practice mode. Run with:  npm test
 *
 * 1. Every reference solution must be ACCEPTED on every test (visible + hidden)
 *    in every language installed on this machine.
 * 2. Every starter template must compile/run and must NOT be accepted as-is
 *    (an untouched stub passing would mean the tests are too weak).
 * 3. The runner must handle hostile programs: infinite loops, crashes, compile
 *    errors, runaway output, and attempts to read secrets from the environment.
 */
process.env.GROQ_API_KEY = "test-secret-should-never-reach-user-code";

const { PROBLEMS, starterFor, fillTemplate } = require("../src/data/problems");
const { judge, availability } = require("../src/services/runner.service");
const references = require("./reference-solutions");

let failures = 0;
const ok = (msg) => console.log(`  \u2713 ${msg}`);
const bad = (msg) => {
  failures += 1;
  console.log(`  \u2717 ${msg}`);
};

async function main() {
  const avail = availability();
  const langs = Object.keys(avail).filter((l) => avail[l].available);
  const skipped = Object.keys(avail).filter((l) => !avail[l].available);
  console.log(`Languages under test: ${langs.join(", ")}${skipped.length ? `   (skipped, not installed: ${skipped.join(", ")})` : ""}\n`);

  console.log("Reference solutions must be Accepted on all tests");
  for (const problem of PROBLEMS) {
    for (const lang of langs) {
      const body = references[problem.id]?.[lang];
      if (!body) {
        bad(`${problem.id} [${lang}] has no reference solution`);
        continue;
      }
      const code = fillTemplate(problem.templates[lang], body);
      const r = await judge({ problem, language: lang, code, mode: "submit" });
      if (r.verdict === "Accepted" && r.passed === problem.tests.length) {
        const slowest = Math.max(...r.cases.map((c) => c.timeMs));
        ok(`${problem.id.padEnd(18)} ${lang.padEnd(4)} ${r.passed}/${r.total} tests, slowest ${slowest}ms`);
      } else {
        const failed = r.cases.find((c) => c.status !== "passed");
        bad(`${problem.id} [${lang}] ${r.verdict} ${r.passed}/${r.total} ${r.message || ""}` +
          (failed ? ` | case ${failed.index}: expected=${JSON.stringify(failed.expected)} actual=${JSON.stringify(failed.actual)} ${failed.stderr || ""}` : ""));
      }
    }
  }

  console.log("\nUntouched starter code must run but must not pass");
  for (const problem of PROBLEMS) {
    for (const lang of langs) {
      const r = await judge({ problem, language: lang, code: starterFor(problem, lang), mode: "run" });
      if (r.verdict === "Compilation Error" || r.verdict === "Accepted") {
        bad(`${problem.id} [${lang}] starter gave '${r.verdict}' ${r.message || ""}`);
      } else {
        ok(`${problem.id.padEnd(18)} ${lang.padEnd(4)} starter -> ${r.verdict}`);
      }
    }
  }

  console.log("\nRunner safety");
  const p = PROBLEMS.find((x) => x.id === "climbing-stairs");
  const tryCode = (language, code, mode = "run") => judge({ problem: p, language, code, mode });

  let r = await tryCode("js", "while (true) {}");
  r.verdict === "Time Limit Exceeded" ? ok("infinite loop -> Time Limit Exceeded") : bad(`infinite loop gave ${r.verdict}`);

  r = await tryCode("js", "throw new Error('boom')");
  r.verdict === "Runtime Error" && /boom/.test(r.cases[0].stderr || "") ? ok("crash -> Runtime Error with stderr") : bad(`crash gave ${r.verdict}`);

  r = await tryCode("js", "process.stdout.write('x'.repeat(1e6)); setInterval(()=>process.stdout.write('x'.repeat(1e6)), 1)");
  r.verdict === "Output Limit Exceeded" ? ok("runaway output -> Output Limit Exceeded") : bad(`runaway output gave ${r.verdict}`);

  r = await tryCode("js", "console.log(process.env.GROQ_API_KEY === undefined ? 'no-secret' : process.env.GROQ_API_KEY)");
  const leaked = r.cases.some((c) => /test-secret/.test(c.actual || ""));
  !leaked && r.cases.every((c) => c.actual === "no-secret") ? ok("API key is NOT visible to user code") : bad("user code could read GROQ_API_KEY");

  if (langs.includes("cpp")) {
    r = await tryCode("cpp", "int main() { this is not c++ }");
    r.verdict === "Compilation Error" && r.message && !r.message.includes("sentinel-run-")
      ? ok("syntax error -> Compilation Error (temp path scrubbed)") : bad(`bad C++ gave ${r.verdict}: ${r.message}`);
  }
  if (langs.includes("java")) {
    r = await tryCode("java", "class Main { public static void main(String[] a) { int x = ; } }");
    r.verdict === "Compilation Error" ? ok("Java syntax error -> Compilation Error") : bad(`bad Java gave ${r.verdict}`);
  }
  if (langs.includes("py")) {
    r = await tryCode("py", "import sys\nprint(int(sys.stdin.readline()) * 0)");
    r.verdict === "Wrong Answer" && r.cases.every((c) => c.status === "wrong-answer") ? ok("Python wrong answer detected on every sample") : bad(`Python WA gave ${r.verdict}`);
  }

  r = await judge({ problem: p, language: "ruby", code: "puts 1", mode: "run" }).catch((e) => e);
  r && r.status === 400 ? ok("unsupported language -> 400") : bad("unsupported language not rejected");

  r = await judge({ problem: p, language: "js", code: "x".repeat(70000), mode: "run" }).catch((e) => e);
  r && r.status === 413 ? ok("oversized code -> 413") : bad("oversized code not rejected");

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
