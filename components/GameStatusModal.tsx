import { GameContext } from "@/context/game-context";
import { useContext, useState } from "react";
import Fireworks from "./Fireworks";
import Flash from "./Flash";
import styles from "@/styles/gameStatusModal.module.css";

type GameStatusType = "won" | "lost";

interface GameStatusModalProps {
  status: GameStatusType;
}

export default function GameStatusModal({ status }: GameStatusModalProps) {
  const { startGame, continueGame } = useContext(GameContext);
  const [isCompetition, setIsCompetition] = useState(false);
  const isWon = status === "won";

  const handlePlayAgain = () => {
    startGame(isCompetition);
  };

  const handleContinue = () => {
    continueGame();
  };

  return (
    <div className={`${styles.modal} ${isWon ? styles.win : styles.lose}`}>
      <Flash active={isWon} />
      <Fireworks active={isWon} />
      <div className={styles.content}>
        <h1 className={styles.heading}>
          {isWon ? "You won!" : "Game Over"}
        </h1>
        {isWon && (
          <div className={styles.continueOption}>
            <p>Want to continue playing for a higher score?</p>
            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        )}
        <div className={styles.modeSelection}>
          <label className={styles.modeLabel}>
            <input
              type="checkbox"
              checked={isCompetition}
              onChange={(e) => setIsCompetition(e.target.checked)}
              className={styles.modeCheckbox}
            />
            <span>比赛模式</span>
          </label>
        </div>
        <button className={styles.button} onClick={handlePlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}
