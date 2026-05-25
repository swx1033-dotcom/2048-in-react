import { GameContext } from "@/context/game-context";
import styles from "@/styles/score.module.css";
import { useContext } from "react";
import { ModeSwitch } from "./splash";

function formatDuration(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

export default function Score() {
  const {
    score,
    mode,
    status,
    remainingTimeMs,
    turnDurationMs,
    averageThinkingTimeMs,
    timeoutCount,
  } = useContext(GameContext);
  const timerRadius = 32;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerProgress = Math.max(
    0,
    Math.min(remainingTimeMs / turnDurationMs, 1),
  );
  const timerOffset = timerCircumference * (1 - timerProgress);

  return (
    <div className={styles.panel}>
      <ModeSwitch />
      <div className={styles.stats}>
        <div className={styles.score}>
          Score
          <div data-testid="score-value">{score}</div>
        </div>
        {mode === "tournament" && status === "ongoing" && (
          <div className={`${styles.score} ${styles.timerCard}`}>
            Time left
            <div className={styles.timerValue} data-testid="remaining-time">
              <svg
                aria-hidden="true"
                className={styles.timerChart}
                viewBox="0 0 80 80"
              >
                <circle className={styles.timerTrack} cx="40" cy="40" r="32" />
                <circle
                  className={styles.timerProgress}
                  cx="40"
                  cy="40"
                  r="32"
                  strokeDasharray={timerCircumference}
                  strokeDashoffset={timerOffset}
                />
              </svg>
              <span>{formatDuration(remainingTimeMs)}</span>
            </div>
          </div>
        )}
        {mode === "tournament" && (
          <>
            <div className={styles.score}>
              Avg. time
              <div data-testid="average-thinking-time">
                {formatDuration(averageThinkingTimeMs)}
              </div>
            </div>
            <div className={styles.score}>
              Timeouts
              <div data-testid="timeout-count">{timeoutCount}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
