import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext } from "react";

type SplashProps = {
  heading?: string;
  type?: string;
};

export function ModeSwitch() {
  const { mode, setMode } = useContext(GameContext);

  return (
    <div className={styles.modeControl}>
      <div className={styles.modeLabel}>Mode</div>
      <div className={styles.modeSwitch}>
        <button
          className={`${styles.modeButton} ${mode === "normal" ? styles.active : ""}`}
          onClick={() => setMode("normal")}
          type="button"
        >
          Normal mode
        </button>
        <button
          className={`${styles.modeButton} ${mode === "tournament" ? styles.active : ""}`}
          onClick={() => setMode("tournament")}
          type="button"
        >
          Tournament mode
        </button>
      </div>
    </div>
  );
}

export default function Splash({ heading = "You won!", type = "" }: SplashProps) {
  const { startGame } = useContext(GameContext);

  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
        <ModeSwitch />
        <button className={styles.button} onClick={startGame} type="button">
          Play again
        </button>
      </div>
    </div>
  );
}
