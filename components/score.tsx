import { GameContext } from "@/context/game-context";
import styles from "@/styles/score.module.css";
import { useContext } from "react";

export default function Score() {
  const { score, isTournamentMode, timeoutCount, averageThinkingTime } = useContext(GameContext);

  return (
    <div className={styles.container}>
      <div className={styles.score}>
        Score
        <div>{score}</div>
      </div>
      {isTournamentMode && (
        <div className={styles.tournamentStats}>
          <div className={styles.stat}>
            Timeouts
            <div>{timeoutCount}</div>
          </div>
          <div className={styles.stat}>
            Avg Time
            <div>{averageThinkingTime.toFixed(1)}s</div>
          </div>
        </div>
      )}
    </div>
  );
}
