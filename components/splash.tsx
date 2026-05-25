import { GameContext } from "@/context/game-context";
import styles from "@/styles/splash.module.css";
import { useContext } from "react";

export default function Splash({ heading = "You won!", type = "" }) {
  const { startGame, startDemo, stopDemo, isDemoing } = useContext(GameContext);

  return (
    <div className={`${styles.splash} ${type === "won" ? styles.win : ""}`}>
      <div>
        <h1>{isDemoing ? "演示中…" : heading}</h1>
        {!isDemoing && (
          <button className={styles.button} onClick={startGame}>
            Play again
          </button>
        )}
        <button
          className={styles.button}
          onClick={isDemoing ? stopDemo : startDemo}
          style={!isDemoing ? { marginLeft: "10px" } : {}}
        >
          {isDemoing ? "⏹ 停止演示" : "▶ 自动演示"}
        </button>
      </div>
    </div>
  );
}
