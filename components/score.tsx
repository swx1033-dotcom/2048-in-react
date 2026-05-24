import { GameContext } from "@/context/game-context";
import styles from "@/styles/score.module.css";
import { useContext } from "react";

export default function Score() {
  const { score, canUndo, undo } = useContext(GameContext);

  return (
    <div className={styles.wrapper}>
      <div className={styles.score}>
        Score
        <div>{score}</div>
      </div>
      <button
        className={styles.undo}
        disabled={!canUndo}
        onClick={undo}
        type="button"
      >
        Undo
      </button>
    </div>
  );
}
