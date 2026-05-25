import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext } from "react";

export default function Splash({ heading = "You won!", type = "" }) {
  const { startGame, status } = useContext(GameContext);

  if (status === "idle") {
    return (
      <div className={`${styles.splash} ${styles.idle}`}>
        <div>
          <h1>Select Mode</h1>
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button className={styles.button} onClick={() => startGame("normal")}>
              Normal Mode
            </button>
            <button className={styles.button} onClick={() => startGame("competition")}>
              Competition Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
        <button className={styles.button} onClick={() => startGame()}>
          Play again
        </button>
      </div>
    </div>
  );
}
