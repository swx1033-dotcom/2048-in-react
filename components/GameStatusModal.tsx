import { useContext, useEffect, useState } from "react";
import { GameContext } from "@/context/game-context";
import { GameStatus } from "@/reducers/game-reducer";
import Fireworks from "./Fireworks";
import Flash from "./Flash";
import styles from "@/styles/gameStatusModal.module.css";

type GameStatusModalProps = {
  status: Exclude<GameStatus, "ongoing">;
};

export default function GameStatusModal({ status }: GameStatusModalProps) {
  const { continueGame, isCompetition, startGame } = useContext(GameContext);
  const [competitionMode, setCompetitionMode] = useState(isCompetition);
  const isWon = status === "won";

  useEffect(() => {
    setCompetitionMode(isCompetition);
  }, [isCompetition, status]);

  const handlePlayAgain = () => {
    startGame(competitionMode);
  };

  const handleContinue = () => {
    continueGame();
  };

  return (
    <div
      className={`${styles.modal} ${isWon ? styles.win : styles.lose}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-status-heading"
    >
      <Flash active={isWon} />
      <Fireworks active={isWon} />
      <div className={styles.content}>
        <h1 id="game-status-heading" className={styles.heading}>
          {isWon ? "恭喜通关！" : "Game Over"}
        </h1>
        <p className={styles.message}>
          {isWon
            ? "你已经合成 2048，可选择停在这里，或继续挑战更高分数。"
            : "棋盘已满且没有可合并的数字，点击重试开始新一局。"}
        </p>
        {isWon && (
          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleContinue}
            >
              继续挑战
            </button>
          </div>
        )}
        <div className={styles.modeSelection}>
          <label className={styles.modeLabel}>
            <input
              type="checkbox"
              checked={competitionMode}
              onChange={(e) => setCompetitionMode(e.target.checked)}
              className={styles.modeCheckbox}
            />
            <span>比赛模式</span>
          </label>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} onClick={handlePlayAgain}>
            {isWon ? "重新开始" : "重试"}
          </button>
        </div>
      </div>
    </div>
  );
}
