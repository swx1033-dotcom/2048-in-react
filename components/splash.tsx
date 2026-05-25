import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext, useState } from "react";

type GameMode = "normal" | "tournament";

type Props = {
  heading?: string;
  type?: string;
};

export default function Splash({ heading = "You lost!", type = "" }: Props) {
  const { startGame, setGameMode } = useContext(GameContext);
  const [selectedMode, setSelectedMode] = useState<GameMode>("normal");

  if (type === "idle") {
    return (
      <div className={styles.splash}>
        <div>
          <h1>2048</h1>
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${selectedMode === "normal" ? styles.modeActive : ""}`}
              onClick={() => setSelectedMode("normal")}
            >
              Normal
            </button>
            <button
              className={`${styles.modeButton} ${selectedMode === "tournament" ? styles.modeActive : ""}`}
              onClick={() => setSelectedMode("tournament")}
            >
              Tournament
            </button>
          </div>
          <button
            className={styles.button}
            onClick={() => {
              setGameMode(selectedMode);
              startGame();
            }}
          >
            Play
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
        <button className={styles.button} onClick={startGame}>
          Play again
        </button>
      </div>
    </div>
  );
}
