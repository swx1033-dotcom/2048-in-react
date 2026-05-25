import { GameContext } from "@/context/game-context";
import { ChallengeContext } from "@/context/challenge-context";
import styles from "@/styles/score.module.css";
import { useContext } from "react";

export default function Score() {
  const { score } = useContext(GameContext);
  const { challengeState } = useContext(ChallengeContext);

  const countdownState = challengeState.pluginStates["countdown"];
  const timeRemaining = (countdownState?.timeRemaining as number) ?? null;

  return (
    <div className={styles.score}>
      Score
      <div>{score}</div>
      {challengeState.isChallengeMode && timeRemaining !== null && (
        <div className={`${styles.timer} ${timeRemaining <= 10 ? styles.timerWarning : ""}`}>
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
