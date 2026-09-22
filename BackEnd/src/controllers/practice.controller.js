const { PROBLEMS, getProblem, toSummary, toDetail } = require("../data/problems");
const runner = require("../services/runner.service");

module.exports.listProblems = (req, res) => {
  res.json({ problems: PROBLEMS.map(toSummary) });
};

module.exports.getProblem = (req, res) => {
  const problem = getProblem(req.params.id);
  if (!problem) {
    return res.status(404).json({ message: `No problem called '${req.params.id}'.` });
  }
  res.json(toDetail(problem));
};

module.exports.runnerStatus = (req, res) => {
  const enabled = runner.isEnabled();
  res.json({
    enabled,
    timeLimitMs: runner.TIME_LIMIT_MS,
    languages: enabled ? runner.availability() : {},
    message: enabled
      ? ""
      : "The code runner is switched off. Set ENABLE_CODE_RUNNER=true in BackEnd/.env and restart the backend (local use only, see SETUP.md).",
  });
};

module.exports.runCode = async (req, res) => {
  if (!runner.isEnabled()) {
    return res.status(503).json({
      message:
        "The code runner is switched off. Set ENABLE_CODE_RUNNER=true in BackEnd/.env and restart the backend (local use only, see SETUP.md).",
    });
  }

  const { problemId, language, code, mode } = req.body || {};
  const problem = getProblem(problemId);
  if (!problem) {
    return res.status(404).json({ message: `No problem called '${problemId}'.` });
  }

  try {
    const result = await runner.judge({
      problem,
      language,
      code,
      mode: mode === "submit" ? "submit" : "run",
    });
    res.json(result);
  } catch (error) {
    if (error instanceof runner.RunnerError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "The runner hit an unexpected error." });
  }
};
