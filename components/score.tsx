import { GameContext } from "@/context/game-context";
import styles from "@/styles/score.module.css";
import { useContext } from "react";

export default function Score() {
  const { score, availableModes, mode, setMode, startGame } = useContext(GameContext);

  return (
    <div className={styles.panel}>
      <div className={styles.score}>
        Score
        <div>{score}</div>
      </div>
      <div className={styles.controls}>
        {availableModes.map((option) => (
          <button
            className={`${styles.option} ${mode === option.mode ? styles.active : ""}`}
            key={option.mode}
            onClick={() => setMode(option.mode)}
            type="button"
          >
            {option.label}
          </button>
        ))}
        <button className={styles.restart} onClick={() => startGame()} type="button">
          重开
        </button>
      </div>
    </div>
  );
}
