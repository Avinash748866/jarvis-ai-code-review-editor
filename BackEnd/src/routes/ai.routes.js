const express = require('express');
const aiController = require("../controllers/ai.controller")
const practiceController = require("../controllers/practice.controller")

const router = express.Router();

router.post("/get-review", aiController.getReview);
router.post("/chat", aiController.chatWithCode);
router.post("/humanize", aiController.humanizeReview);
router.post("/converse", aiController.converse);
router.post("/speak", aiController.speak);

// LeetCode-style practice mode
router.get("/problems", practiceController.listProblems);
router.get("/problems/:id", practiceController.getProblem);
router.get("/runner-status", practiceController.runnerStatus);
router.post("/run", practiceController.runCode);

module.exports = router;
