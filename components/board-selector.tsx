"use client";

import { useContext } from "react";
import { GameContext } from "@/context/game-context";
import { GameMode } from "@/models/tile";
import styles from "@/styles/board-selector.module.css";

const BOARD_SIZES = [4, 5, 6];
const MODES: { label: string; value: GameMode }[] = [
  { label: "Classic", value: "classic" },
  { label: "Infinite", value: "infinite" },
];

export default function BoardSelector() {
  const { boardSize, mode, startGame } = useContext(GameContext);

  const handleSizeChange = (size: number) => {
    startGame(size, mode);
  };

  const handleModeChange = (newMode: GameMode) => {
    startGame(boardSize, newMode);
  };

  return (
    <div className={styles.selector}>
      <div className={styles.section}>
        <span className={styles.label}>Size:</span>
        {BOARD_SIZES.map((size) => (
          <button
            key={size}
            className={`${styles.option} ${boardSize === size ? styles.active : ""}`}
            onClick={() => handleSizeChange(size)}
          >
            {size}&times;{size}
          </button>
        ))}
      </div>
      <div className={styles.section}>
        <span className={styles.label}>Mode:</span>
        {MODES.map(({ label, value }) => (
          <button
            key={value}
            className={`${styles.option} ${mode === value ? styles.active : ""}`}
            onClick={() => handleModeChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}