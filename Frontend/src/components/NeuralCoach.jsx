/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { escalateHint, getHintLevel, getMastery } from "../utils/neuralCoach";
import "./NeuralCoach.css";

const HINT_LABEL = {
  0: "⚡ Request Hint",
  1: "⚡ Escalate (nudge given)",
  2: "⚡ Escalate (approach given)",
  3: "⚡ Escalate (walkthrough given)",
  4: "Max hint level reached",
};

/**
 * Futuristic, gamified sidebar for Practice Arena: turns the learner's
 * existing solve history (practiceProgress.js) into XP/level/streak/
 * topic-mastery, and offers a 4-step AI "hint ladder" that escalates from
 * a bare conceptual nudge to a near-solution - so help always starts
 * small instead of spoiling the problem on the first ask.
 *
 * No extra "solved" storage of its own - it's a pure view over data that
 * already exists, plus one small localStorage key for hint levels.
 */
function NeuralCoach({ problems, progress, problem, language, code, lastRun }) {
  const mastery = useMemo(() => getMastery(problems, progress), [problems, progress]);
  const prevBadgesRef = useRef(new Set());
  const [flashBadge, setFlashBadge] = useState(null);

  const [hintLevel, setHintLevel] = useState(0);
  const [hintText, setHintText] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState("");

  useEffect(() => {
    const prev = prevBadgesRef.current;
    const justUnlocked = mastery.badges.find((b) => b.unlocked && !prev.has(b.id));
    prevBadgesRef.current = new Set(mastery.badges.filter((b) => b.unlocked).map((b) => b.id));
    if (justUnlocked) {
      setFlashBadge(justUnlocked);
      const t = setTimeout(() => setFlashBadge(null), 4200);
      return () => clearTimeout(t);
    }
  }, [mastery.badges]);

  // Hint ladder resets per-problem.
  useEffect(() => {
    setHintLevel(problem ? getHintLevel(problem.id) : 0);
    setHintText("");
    setHintError("");
  }, [problem?.id]);

  async function requestHint() {
    if (!problem || hintLoading || hintLevel >= 4) return;
    const nextLevel = escalateHint(problem.id);
    setHintLevel(nextLevel);
    setHintLoading(true);
    setHintError("");
    setHintText("");
    try {
      const res = await axios.post(`${API_BASE_URL}/converse`, {
        messages: [{ role: "user", text: `[[internal: Neural Coach hint uplink, level ${nextLevel}]]` }],
        context: {
          mode: "practice",
          language,
          code,
          problem: { title: problem.title, difficulty: problem.difficulty, statement: problem.statement },
          lastRun,
          intent: "hint_request",
          hintLevel: nextLevel,
          mastery: {
            level: mastery.level,
            streak: mastery.streak,
            weakTopics: mastery.weakTopics,
            strongTopics: mastery.strongTopics,
          },
        },
      });
      setHintText(res.data.reply);
    } catch (error) {
      setHintError(error?.response?.data?.message || "Uplink failed - the hint signal didn't come through.");
    } finally {
      setHintLoading(false);
    }
  }

  const xpPct = mastery.xpForNextLevel ? Math.round((mastery.xpIntoLevel / mastery.xpForNextLevel) * 100) : 0;

  const topTopics = useMemo(() => {
    const weak = mastery.topics.filter((t) => mastery.weakTopics.includes(t.topic));
    const rest = mastery.topics.filter((t) => !mastery.weakTopics.includes(t.topic));
    return [...weak, ...rest].slice(0, 6);
  }, [mastery]);

  return (
    <aside className="neural-coach">
      <div className="neural-coach-scanline" aria-hidden="true" />

      <div className="neural-coach-header">
        <span className="neural-coach-title">◈ NEURAL COACH</span>
        <span className="neural-coach-level" title={`${mastery.xpIntoLevel} / ${mastery.xpForNextLevel} XP to next level`}>
          LV {mastery.level}
        </span>
      </div>

      <button type="button" className="neural-coach-share-btn" onClick={() => downloadStatCard(mastery)}>
        📤 Share my stat card
      </button>

      <div className="neural-coach-xp-track" title={`${mastery.xp} total XP`}>
        <div className="neural-coach-xp-fill" style={{ width: `${xpPct}%` }} />
      </div>
      <div className="neural-coach-xp-caption">
        {mastery.xpIntoLevel} / {mastery.xpForNextLevel} XP · {mastery.totalSolved}/{mastery.totalProblems || "?"} solved
      </div>

      <div className="neural-coach-streak">
        <span className={`neural-coach-flame ${mastery.streak > 0 ? "neural-coach-flame-lit" : ""}`}>🔥</span>
        <span>{mastery.streak > 0 ? `${mastery.streak}-day streak` : "No streak yet - solve one today"}</span>
      </div>

      {topTopics.length > 0 && (
        <div className="neural-coach-topics">
          <h4>Topic Mastery</h4>
          {topTopics.map((t) => (
            <div className="neural-coach-topic-row" key={t.topic}>
              <span className="neural-coach-topic-label">{t.topic}</span>
              <div className="neural-coach-topic-track">
                <div
                  className={`neural-coach-topic-fill ${t.pct < 40 ? "neural-coach-topic-fill-weak" : ""}`}
                  style={{ width: `${t.pct}%` }}
                />
              </div>
              <span className="neural-coach-topic-count">{t.solved}/{t.total}</span>
            </div>
          ))}
        </div>
      )}

      <div className="neural-coach-badges">
        <h4>Badges</h4>
        <div className="neural-coach-badge-row">
          {mastery.badges.map((b) => (
            <span
              key={b.id}
              className={`neural-coach-badge ${b.unlocked ? "neural-coach-badge-unlocked" : "neural-coach-badge-locked"}`}
              title={`${b.label}${b.unlocked ? "" : " (locked)"}`}
            >
              {b.icon}
            </span>
          ))}
        </div>
      </div>

      <div className="neural-coach-hints">
        <h4>Hint Uplink {problem ? `· ${problem.title}` : ""}</h4>
        {!problem && <p className="neural-coach-hint-empty">Select a problem to open a hint channel.</p>}
        {problem && (
          <>
            <div className="neural-coach-hint-ladder">
              {[1, 2, 3, 4].map((lvl) => (
                <span key={lvl} className={`neural-coach-hint-pip ${lvl <= hintLevel ? "neural-coach-hint-pip-lit" : ""}`} />
              ))}
            </div>
            <button
              type="button"
              className="neural-coach-hint-btn"
              onClick={requestHint}
              disabled={hintLoading || hintLevel >= 4}
            >
              {hintLoading ? "Uplinking…" : HINT_LABEL[hintLevel]}
            </button>
            {hintError && <p className="neural-coach-hint-error">{hintError}</p>}
            {hintText && <div className="neural-coach-hint-text">{hintText}</div>}
          </>
        )}
      </div>

      {flashBadge && (
        <div className="neural-coach-toast">
          <span className="neural-coach-toast-icon">{flashBadge.icon}</span>
          <div>
            <div className="neural-coach-toast-title">Badge Unlocked</div>
            <div className="neural-coach-toast-label">{flashBadge.label}</div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default NeuralCoach;

/**
 * Draws a shareable, Spotify-Wrapped-style "stat card" PNG on a throwaway
 * canvas and triggers a download - no server round-trip, no extra
 * dependency, just the Canvas 2D API. Meant to be posted on Discord/
 * Twitter/Instagram stories - the whole point is it looks good out of
 * context, not just inside the app.
 */
function downloadStatCard(mastery) {
  const W = 720;
  const H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createRadialGradient(W / 2, 140, 40, W / 2, H / 2, 700);
  bg.addColorStop(0, "#0d1320");
  bg.addColorStop(1, "#05070c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Scanlines for the sci-fi texture
  ctx.strokeStyle = "rgba(45, 212, 191, 0.05)";
  for (let y = 0; y < H; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Border frame
  ctx.strokeStyle = "#1b2433";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  ctx.textAlign = "center";
  ctx.fillStyle = "#2dd4bf";
  ctx.font = "700 22px 'Rajdhani', 'Arial', sans-serif";
  ctx.shadowColor = "#2dd4bf";
  ctx.shadowBlur = 14;
  ctx.fillText("◈ SENTINEL // NEURAL COACH", W / 2, 90);
  ctx.shadowBlur = 0;

  // Big level number
  ctx.fillStyle = "#ffb000";
  ctx.font = "800 140px 'Rajdhani', 'Arial', sans-serif";
  ctx.shadowColor = "#ffb000";
  ctx.shadowBlur = 26;
  ctx.fillText(`LV ${mastery.level}`, W / 2, 260);
  ctx.shadowBlur = 0;

  // XP bar
  const barX = 100, barY = 300, barW = W - 200, barH = 16;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, barX, barY, barW, barH, 8);
  ctx.fill();
  const pct = mastery.xpForNextLevel ? mastery.xpIntoLevel / mastery.xpForNextLevel : 0;
  ctx.fillStyle = "#2dd4bf";
  roundRect(ctx, barX, barY, barW * pct, barH, 8);
  ctx.fill();
  ctx.fillStyle = "#7c8aa0";
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillText(`${mastery.xpIntoLevel} / ${mastery.xpForNextLevel} XP`, W / 2, barY + 44);

  // Stat row: streak + solved
  ctx.font = "700 44px 'Rajdhani', 'Arial', sans-serif";
  ctx.fillStyle = "#ff9f1a";
  ctx.fillText(`🔥 ${mastery.streak}-day streak`, W / 2, 430);

  ctx.fillStyle = "#3adb7a";
  ctx.fillText(`✅ ${mastery.totalSolved}/${mastery.totalProblems || "?"} solved`, W / 2, 490);

  // Badges row
  ctx.font = "48px sans-serif";
  const unlocked = mastery.badges.filter((b) => b.unlocked);
  const badgeY = 590;
  const spacing = 80;
  const startX = W / 2 - ((unlocked.length - 1) * spacing) / 2;
  unlocked.forEach((b, i) => {
    ctx.fillText(b.icon, startX + i * spacing, badgeY);
  });
  if (unlocked.length === 0) {
    ctx.font = "18px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#7c8aa0";
    ctx.fillText("No badges unlocked yet - solve your first problem!", W / 2, badgeY);
  }

  // Weak/strong topics
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#7c8aa0";
  if (mastery.strongTopics.length) {
    ctx.fillText(`Mastered: ${mastery.strongTopics.join(", ")}`, W / 2, 700);
  }

  ctx.fillStyle = "#3a4560";
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.fillText("generated by Sentinel Practice Arena", W / 2, H - 50);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentinel-stat-card-lv${mastery.level}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, Math.max(w, 0) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
