import { useContext } from "react";
import { GameContext } from "@/context/game-context";
import styles from "@/styles/circular-timer.module.css";

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CircularTimer() {
  const { countdown, countdownDuration, isCompetition } = useContext(GameContext);

  if (!isCompetition) return null;

  const progress = countdown / countdownDuration;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const seconds = Math.ceil(countdown / 1000);

  return (
    <div className={styles.circularTimer}>
      <svg
        className={styles.circularTimerSvg}
        width="80"
        height="80"
        viewBox="0 0 80 80"
      >
        <circle
          className={styles.circularTimerBg}
          cx="40"
          cy="40"
          r={RADIUS}
        />
        <circle
          className={styles.circularTimerProgress}
          cx="40"
          cy="40"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className={styles.circularTimerText}>{seconds}</span>
    </div>
  );
}