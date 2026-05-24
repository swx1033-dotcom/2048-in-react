import { useContext } from "react";
import { GameContext } from "@/context/game-context";
import { boardSizes, BoardSize } from "@/constants";
import styles from "@/styles/board-size-selector.module.css";

export default function BoardSizeSelector() {
  const { startGame, boardSize, isInfiniteMode } = useContext(GameContext);

  const handleSizeChange = (size: BoardSize) => {
    startGame(size);
  };

  return (
    <div className={styles.selector}>
      <span className={styles.label}>Board Size:</span>
      <div className={styles.buttons}>
        {boardSizes.map((size) => (
          <button
            key={size}
            className={`${styles.button} ${
              !isInfiniteMode && boardSize === size ? styles.active : ""
            }`}
            onClick={() => handleSizeChange(size)}
          >
            {size}×{size}
          </button>
        ))}
        <button
          className={`${styles.button} ${
            isInfiniteMode ? styles.active : ""
          }`}
          onClick={() => handleSizeChange("infinite")}
        >
          Infinite
        </button>
      </div>
    </div>
  );
}
