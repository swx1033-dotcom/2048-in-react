import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext } from "react";

interface SplashProps {
  heading?: string;
  type?: string;
  showModeSelector?: boolean;
  onPlay?: () => void;
}

export default function Splash({ heading = "You won!", type = "", showModeSelector = true, onPlay }: SplashProps) {
  const { startGame, isTournamentMode, setTournamentMode } = useContext(GameContext);

  const handlePlay = () => {
    if (onPlay) {
      onPlay();
    } else {
      startGame();
    }
  };

  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
        {showModeSelector && (
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${!isTournamentMode ? styles.active : ""}`}
              onClick={() => setTournamentMode(false)}
            >
              Normal
            </button>
            <button
              className={`${styles.modeButton} ${isTournamentMode ? styles.active : ""}`}
              onClick={() => setTournamentMode(true)}
            >
              Tournament
            </button>
          </div>
        )}
        <button className={styles.button} onClick={handlePlay}>
          {onPlay ? "Play" : "Play again"}
        </button>
      </div>
    </div>
  );
}
