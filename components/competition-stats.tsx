import { useContext } from "react";
import { GameContext } from "@/context/game-context";
import styles from "@/styles/competition-stats.module.css";

export default function CompetitionStats() {
  const { isCompetition, competitionStats } = useContext(GameContext);

  if (!isCompetition) return null;

  const avgThinkingTimeMs = competitionStats.avgThinkingTime;
  const avgThinkingTimeSec = (avgThinkingTimeMs / 1000).toFixed(2);

  return (
    <div className={styles.competitionStats}>
      <div className={styles.stat}>
        <span className={styles.label}>平均思考时间</span>
        <span className={styles.value}>{avgThinkingTimeSec}s</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>超时次数</span>
        <span className={styles.value}>{competitionStats.timeoutCount}</span>
      </div>
    </div>
  );
}