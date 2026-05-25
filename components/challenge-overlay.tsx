import { useContext } from "react";
import { ChallengeContext } from "@/context/challenge-context";
import { MoveDirection } from "@/models/challenge";
import styles from "@/styles/challenge-overlay.module.css";

const directionLabels: Record<MoveDirection, string> = {
  move_up: "↑",
  move_down: "↓",
  move_left: "←",
  move_right: "→",
};

export default function ChallengeOverlay() {
  const { challengeState, getDisabledDirections } = useContext(ChallengeContext);

  if (!challengeState.isChallengeMode) return null;

  const disabledDirections = getDisabledDirections();
  const countdownState = challengeState.pluginStates["countdown"];
  const timeRemaining = (countdownState?.timeRemaining as number) ?? null;

  return (
    <div className={styles.overlay}>
      {disabledDirections.length > 0 && (
        <div className={styles.disabledDirections}>
          {disabledDirections.map((dir) => (
            <span key={dir} className={styles.disabledDir}>
              {directionLabels[dir]}
            </span>
          ))}
        </div>
      )}
      {timeRemaining !== null && (
        <div
          className={`${styles.timer} ${timeRemaining <= 10 ? styles.timerWarning : ""}`}
        >
          {formatTime(timeRemaining)}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
