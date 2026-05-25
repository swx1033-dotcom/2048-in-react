import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext, useState } from "react";

export default function Splash({ heading = "You won!", type = "" }: { heading?: string; type?: string }) {
  const { startGame } = useContext(GameContext);
  const [isCompetition, setIsCompetition] = useState(false);

  const handleStartGame = () => {
    startGame(isCompetition);
  };

  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
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
        <button className={styles.button} onClick={handleStartGame}>
          Play again
        </button>
      </div>
    </div>
  );
}