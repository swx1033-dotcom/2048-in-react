import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext } from "react";

export default function Splash({ heading = "You won!", type = "" }: { heading?: string; type?: string }) {
  const { startGame, startDemo, stopDemo, isDemoMode, status } = useContext(GameContext);

  const handleDemoClick = () => {
    if (isDemoMode) {
      stopDemo();
    } else {
      startDemo();
    }
  };

  return (
    <div className={`${styles.splash} ${type === "won" && styles.win}`}>
      <div>
        <h1>{heading}</h1>
        <button className={styles.button} onClick={startGame}>
          Play again
        </button>
        {status === "ongoing" && (
          <button className={styles.button} onClick={handleDemoClick}>
            {isDemoMode ? "■ 停止演示" : "▶ 自动演示"}
          </button>
        )}
      </div>
    </div>
  );
}
