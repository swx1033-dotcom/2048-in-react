"use client";

import { GameContext } from "@/context/game-context";
import { useContext } from "react";
import styles from "@/styles/score.module.css";

export default function CompetitionStats() {
  const { mode, status, timeoutCount, totalThinkTime, moveCount } = useContext(GameContext) as any;

  if (mode !== "competition" || status === "idle") {
    return null;
  }

  const avgThinkTime = moveCount > 0 ? (totalThinkTime / moveCount / 1000).toFixed(1) : "0.0";

  return (
    <div className={styles.stats}>
      <div className={styles.statItem}>
        <div>Avg Think Time</div>
        <div>{avgThinkTime}s</div>
      </div>
      <div className={styles.statItem}>
        <div>Timeouts</div>
        <div>{timeoutCount}</div>
      </div>
    </div>
  );
}
